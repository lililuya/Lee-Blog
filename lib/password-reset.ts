import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { UserRole, UserStatus } from "@prisma/client";
import { AuthFlowError } from "@/lib/auth-errors";
import { hashPassword } from "@/lib/auth";
import { sendSiteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, isDatabaseConfigured } from "@/lib/utils";

const PASSWORD_RESET_TTL_HOURS = Math.max(1, Number(process.env.PASSWORD_RESET_TTL_HOURS ?? "2"));
const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000;

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildPasswordResetUrl(token: string) {
  return absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
}

function buildPasswordResetEmailText(input: {
  name: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  return [
    `Hi ${input.name},`,
    "",
    "We received a request to reset your password.",
    `Open the link below within ${PASSWORD_RESET_TTL_HOURS} hour(s) to choose a new password:`,
    input.resetUrl,
    "",
    `This link expires at ${input.expiresAt.toISOString()}.`,
    "",
    "If you did not request this change, you can ignore this email.",
  ].join("\n");
}

function buildPasswordResetEmailHtml(input: {
  name: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>Hi ${input.name},</p>
      <p>We received a request to reset your password.</p>
      <p>Open the link below within ${PASSWORD_RESET_TTL_HOURS} hour(s) to choose a new password:</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>This link expires at ${input.expiresAt.toISOString()}.</p>
      <p>If you did not request this change, you can ignore this email.</p>
    </div>
  `;
}

export async function issuePasswordResetForUser(user: {
  id: string;
  name: string;
  email: string;
}) {
  ensureDatabase();

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  const resetUrl = buildPasswordResetUrl(token);
  const mailResult = await sendSiteEmail({
    to: user.email,
    subject: "Reset your password",
    text: buildPasswordResetEmailText({
      name: user.name,
      resetUrl,
      expiresAt,
    }),
    html: buildPasswordResetEmailHtml({
      name: user.name,
      resetUrl,
      expiresAt,
    }),
  });

  if (!mailResult.delivered) {
    console.info(`[password reset link] ${user.email}: ${resetUrl}`);
  }

  return {
    emailSent: mailResult.delivered,
    transport: mailResult.transport,
    resetUrl: mailResult.delivered ? null : resetUrl,
    expiresAt,
  };
}

export async function requestPasswordReset(email: string) {
  ensureDatabase();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      requested: true,
      emailSent: false,
      resetUrl: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.status === UserStatus.DELETED || user.role !== UserRole.ADMIN) {
    return {
      requested: true,
      emailSent: false,
      resetUrl: null,
    };
  }

  const result = await issuePasswordResetForUser({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return {
    requested: true,
    emailSent: result.emailSent,
    resetUrl: result.resetUrl,
  };
}

export async function inspectPasswordResetToken(token: string) {
  ensureDatabase();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      status: "missing" as const,
      email: null,
      expiresAt: null,
    };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(normalizedToken) },
    include: {
      user: {
        select: {
          email: true,
          role: true,
        },
      },
    },
  });

  if (!record) {
    return {
      status: "invalid" as const,
      email: null,
      expiresAt: null,
    };
  }

  if (record.expiresAt < new Date()) {
    return {
      status: "expired" as const,
      email: record.user.role === UserRole.ADMIN ? record.user.email : null,
      expiresAt: record.expiresAt,
    };
  }

  if (record.user.role !== UserRole.ADMIN) {
    return {
      status: "invalid" as const,
      email: null,
      expiresAt: null,
    };
  }

  return {
    status: "valid" as const,
    email: record.user.email,
    expiresAt: record.expiresAt,
  };
}

export async function resetPasswordWithToken(token: string, password: string) {
  ensureDatabase();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new AuthFlowError({
      code: "PASSWORD_RESET_INVALID",
      message: "The password reset link is invalid.",
    });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(normalizedToken) },
    include: { user: true },
  });

  if (!resetToken) {
    throw new AuthFlowError({
      code: "PASSWORD_RESET_INVALID",
      message: "The password reset link is invalid or has already been used.",
    });
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    throw new AuthFlowError({
      code: "PASSWORD_RESET_EXPIRED",
      message: "This password reset link has expired. Please request a new one.",
      details: {
        email: resetToken.user.email,
      },
    });
  }

  if (resetToken.user.status === UserStatus.DELETED) {
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    throw new AuthFlowError({
      code: "PASSWORD_RESET_INVALID",
      message: "This account is no longer available.",
    });
  }

  if (resetToken.user.role !== UserRole.ADMIN) {
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    throw new AuthFlowError({
      code: "PASSWORD_RESET_INVALID",
      message: "This password reset link is no longer valid.",
    });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    await tx.session.deleteMany({
      where: { userId: resetToken.userId },
    });
  });

  return {
    userId: resetToken.userId,
    email: resetToken.user.email,
    name: resetToken.user.name,
  };
}
