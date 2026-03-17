import "server-only";

import { createHash } from "node:crypto";
import { sendSiteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { AuthFlowError } from "@/lib/auth-errors";
import { isDatabaseConfigured } from "@/lib/utils";

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_FAILURES = 8;
const AUTH_ATTEMPT_RETENTION_DAYS = 14;

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeIpAddress(ipAddress: string | null | undefined) {
  const value = ipAddress?.trim();
  return value ? value.slice(0, 200) : null;
}

function normalizeUserAgent(userAgent: string | null | undefined) {
  const value = userAgent?.trim();
  return value ? value.slice(0, 500) : null;
}

export function buildLoginSecurityContext(input: {
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const ipAddress = normalizeIpAddress(input.ipAddress);
  const userAgent = normalizeUserAgent(input.userAgent);

  return {
    ipAddress,
    userAgent,
    ipHash: ipAddress ? hashValue(ipAddress) : null,
    userAgentHash: userAgent ? hashValue(userAgent) : null,
  };
}

export async function assertLoginAllowed(input: {
  email: string;
  ipHash?: string | null;
}) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const threshold = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_MS);
  const failedAttempts = await prisma.authAttempt.count({
    where: {
      succeeded: false,
      createdAt: {
        gte: threshold,
      },
      OR: [
        { email: input.email },
        ...(input.ipHash ? [{ ipHash: input.ipHash }] : []),
      ],
    },
  });

  if (failedAttempts >= LOGIN_RATE_LIMIT_MAX_FAILURES) {
    throw new AuthFlowError({
      code: "LOGIN_RATE_LIMITED",
      message: "Too many failed login attempts. Please wait a few minutes and try again.",
      status: 429,
    });
  }
}

export async function recordLoginAttempt(input: {
  email: string;
  ipHash?: string | null;
  userAgent?: string | null;
  succeeded: boolean;
}) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const retentionThreshold = new Date(
    Date.now() - AUTH_ATTEMPT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.$transaction([
    prisma.authAttempt.create({
      data: {
        email: input.email,
        ipHash: input.ipHash ?? null,
        userAgent: input.userAgent ?? null,
        succeeded: input.succeeded,
      },
    }),
    prisma.authAttempt.deleteMany({
      where: {
        createdAt: {
          lt: retentionThreshold,
        },
      },
    }),
  ]);
}

export async function notifyUserOfNewLogin(input: {
  name: string;
  email: string;
  occurredAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const recipient = input.email.trim().toLowerCase();

  if (!recipient) {
    return;
  }

  const ipLabel = input.ipAddress?.trim() || "Unavailable";
  const userAgentLabel = input.userAgent?.trim() || "Unavailable";

  await sendSiteEmail({
    to: recipient,
    subject: "New sign-in detected on your account",
    text: [
      `Hi ${input.name},`,
      "",
      "A new sign-in was detected on your account.",
      `Time: ${input.occurredAt.toISOString()}`,
      `IP address: ${ipLabel}`,
      `Device / browser: ${userAgentLabel}`,
      "",
      "If this was not you, change your password immediately and review your active sessions.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
        <p>Hi ${input.name},</p>
        <p>A new sign-in was detected on your account.</p>
        <p><strong>Time:</strong> ${input.occurredAt.toISOString()}<br />
        <strong>IP address:</strong> ${ipLabel}<br />
        <strong>Device / browser:</strong> ${userAgentLabel}</p>
        <p>If this was not you, change your password immediately and review your active sessions.</p>
      </div>
    `,
  });
}
