import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, isDatabaseConfigured } from "@/lib/utils";
import { AuthFlowError } from "@/lib/auth-errors";
import { sendSiteEmail } from "@/lib/email";

const EMAIL_VERIFICATION_TTL_HOURS = Math.max(
  1,
  Number(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? "24"),
);
const EMAIL_VERIFICATION_TTL_MS = EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000;

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildVerificationUrl(token: string) {
  return absoluteUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}

function buildVerificationEmailText(input: {
  name: string;
  verificationUrl: string;
  expiresAt: Date;
}) {
  return [
    `Hi ${input.name},`,
    "",
    "Thanks for registering for the blog.",
    `Please verify your email address by opening the link below within ${EMAIL_VERIFICATION_TTL_HOURS} hour(s):`,
    input.verificationUrl,
    "",
    `This link expires at ${input.expiresAt.toISOString()}.`,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");
}

function buildVerificationEmailHtml(input: {
  name: string;
  verificationUrl: string;
  expiresAt: Date;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>Hi ${input.name},</p>
      <p>Thanks for registering for the blog.</p>
      <p>Please verify your email address by opening the link below within ${EMAIL_VERIFICATION_TTL_HOURS} hour(s):</p>
      <p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>
      <p>This link expires at ${input.expiresAt.toISOString()}.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    </div>
  `;
}

async function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

export async function issueEmailVerificationForUser(user: {
  id: string;
  name: string;
  email: string;
}) {
  await ensureDatabase();

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  const verificationUrl = buildVerificationUrl(token);
  const mailResult = await sendSiteEmail({
    to: user.email,
    subject: "Verify your email for Lee's blog",
    text: buildVerificationEmailText({
      name: user.name,
      verificationUrl,
      expiresAt,
    }),
    html: buildVerificationEmailHtml({
      name: user.name,
      verificationUrl,
      expiresAt,
    }),
  });

  if (!mailResult.delivered) {
    console.info(`[verification link] ${user.email}: ${verificationUrl}`);
  }

  return {
    emailSent: mailResult.delivered,
    transport: mailResult.transport,
    verificationUrl: mailResult.delivered ? null : verificationUrl,
    expiresAt,
  };
}

export async function resendEmailVerification(email: string) {
  await ensureDatabase();

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      resent: true,
      emailSent: false,
      verificationUrl: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (
    !user ||
    user.status === UserStatus.DELETED ||
    !user.emailVerificationRequired ||
    Boolean(user.emailVerifiedAt)
  ) {
    return {
      resent: true,
      emailSent: false,
      verificationUrl: null,
    };
  }

  const result = await issueEmailVerificationForUser({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return {
    resent: true,
    emailSent: result.emailSent,
    verificationUrl: result.verificationUrl,
  };
}

export async function verifyEmailToken(token: string) {
  await ensureDatabase();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new AuthFlowError({
      code: "EMAIL_VERIFICATION_INVALID",
      message: "The verification link is invalid.",
    });
  }

  const tokenHash = hashVerificationToken(normalizedToken);
  const verification = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!verification) {
    throw new AuthFlowError({
      code: "EMAIL_VERIFICATION_INVALID",
      message: "The verification link is invalid or has already been used.",
    });
  }

  if (verification.expiresAt < new Date()) {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: verification.userId },
    });

    throw new AuthFlowError({
      code: "EMAIL_VERIFICATION_EXPIRED",
      message: "This verification link has expired. Please request a new one.",
      details: {
        email: verification.user.email,
      },
    });
  }

  const alreadyVerified =
    !verification.user.emailVerificationRequired || Boolean(verification.user.emailVerifiedAt);

  if (!alreadyVerified) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verification.userId },
        data: {
          emailVerifiedAt: new Date(),
          emailVerificationRequired: false,
        },
      });

      await tx.emailVerificationToken.deleteMany({
        where: { userId: verification.userId },
      });
    });
  } else {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: verification.userId },
    });
  }

  return {
    userId: verification.userId,
    email: verification.user.email,
    name: verification.user.name,
    status: verification.user.status,
    alreadyVerified,
  };
}
