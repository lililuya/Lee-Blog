import "server-only";

import { randomBytes } from "node:crypto";
import { sendSiteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, isDatabaseConfigured, normalizeTaxonomyValue } from "@/lib/utils";

const EMAIL_SUBSCRIPTION_CONFIRM_TTL_HOURS = Math.max(
  1,
  Number(process.env.EMAIL_SUBSCRIPTION_CONFIRM_TTL_HOURS ?? "48"),
);
const EMAIL_SUBSCRIPTION_CONFIRM_TTL_MS =
  EMAIL_SUBSCRIPTION_CONFIRM_TTL_HOURS * 60 * 60 * 1000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function uniqueFilters(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const normalized = normalizeTaxonomyValue(trimmed);

    if (!trimmed || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

function buildSubscriptionConfirmUrl(token: string) {
  return absoluteUrl(`/subscribe/confirm?token=${encodeURIComponent(token)}`);
}

export function buildSubscriptionUnsubscribeUrl(token: string) {
  return absoluteUrl(`/unsubscribe?token=${encodeURIComponent(token)}`);
}

function describePostSubscriptionFilters(input: { categories: string[]; tags: string[] }) {
  const parts = [
    input.categories.length > 0 ? `categories: ${input.categories.join(", ")}` : null,
    input.tags.length > 0 ? `tags: ${input.tags.join(", ")}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "all new posts";
}

function describeSubscriptionCoverage(input: {
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
}) {
  const parts: string[] = [];

  if (input.postNotificationsEnabled) {
    parts.push(`new post alerts (${describePostSubscriptionFilters(input)})`);
  }

  if (input.digestNotificationsEnabled) {
    parts.push("weekly digest emails");
  }

  return parts.join(" and ");
}

function buildConfirmationEmailText(input: {
  email: string;
  name: string | null;
  confirmUrl: string;
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
  expiresAt: Date;
}) {
  return [
    `Hi ${input.name || input.email},`,
    "",
    "Please confirm your subscription to Lee Blog email updates.",
    `This request currently includes ${describeSubscriptionCoverage(input)}.`,
    "",
    `Confirm your subscription: ${input.confirmUrl}`,
    "",
    `This link expires at ${input.expiresAt.toISOString()}.`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
}

function buildConfirmationEmailHtml(input: {
  email: string;
  name: string | null;
  confirmUrl: string;
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
  expiresAt: Date;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>Hi ${escapeHtml(input.name || input.email)},</p>
      <p>Please confirm your subscription to Lee Blog email updates.</p>
      <p>This request currently includes <strong>${escapeHtml(
        describeSubscriptionCoverage(input),
      )}</strong>.</p>
      <p><a href="${input.confirmUrl}">Confirm your subscription</a></p>
      <p>This link expires at ${escapeHtml(input.expiresAt.toISOString())}.</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

function buildUpdatedPreferencesEmailText(input: {
  email: string;
  name: string | null;
  unsubscribeUrl: string;
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
}) {
  return [
    `Hi ${input.name || input.email},`,
    "",
    "Your Lee Blog email subscription preferences were updated.",
    `You are now tracking ${describeSubscriptionCoverage(input)}.`,
    "",
    `Stop these emails: ${input.unsubscribeUrl}`,
    `Update preferences again: ${absoluteUrl("/subscribe")}`,
  ].join("\n");
}

function buildUpdatedPreferencesEmailHtml(input: {
  email: string;
  name: string | null;
  unsubscribeUrl: string;
  postNotificationsEnabled: boolean;
  digestNotificationsEnabled: boolean;
  categories: string[];
  tags: string[];
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>Hi ${escapeHtml(input.name || input.email)},</p>
      <p>Your Lee Blog email subscription preferences were updated.</p>
      <p>You are now tracking <strong>${escapeHtml(describeSubscriptionCoverage(input))}</strong>.</p>
      <p><a href="${absoluteUrl("/subscribe")}">Update preferences again</a></p>
      <p><a href="${input.unsubscribeUrl}">Unsubscribe from these emails</a></p>
    </div>
  `;
}

export type EmailSubscriptionRequestResult =
  | {
      status: "pending-confirmation";
      email: string;
      emailSent: boolean;
      previewUrl: string | null;
    }
  | {
      status: "updated";
      email: string;
      emailSent: boolean;
      previewUrl: null;
    };

export async function requestEmailSubscription(input: {
  email: string;
  name?: string | null;
  postNotificationsEnabled?: boolean;
  digestNotificationsEnabled?: boolean;
  categories?: string[];
  tags?: string[];
}): Promise<EmailSubscriptionRequestResult> {
  ensureDatabase();

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const postNotificationsEnabled = input.postNotificationsEnabled ?? true;
  const digestNotificationsEnabled = input.digestNotificationsEnabled ?? false;
  const categories = postNotificationsEnabled ? uniqueFilters(input.categories ?? []) : [];
  const tags = postNotificationsEnabled ? uniqueFilters(input.tags ?? []) : [];
  const existingSubscriber = await prisma.emailSubscriber.findUnique({
    where: { email },
  });

  if (
    existingSubscriber?.isActive &&
    existingSubscriber.confirmedAt &&
    !existingSubscriber.unsubscribedAt
  ) {
    const updatedSubscriber = await prisma.emailSubscriber.update({
      where: { email },
      data: {
        name,
        categories,
        tags,
        postNotificationsEnabled,
        digestNotificationsEnabled,
        unsubscribedAt: null,
      },
    });

    try {
      const unsubscribeUrl = buildSubscriptionUnsubscribeUrl(updatedSubscriber.unsubscribeToken);
      const mailResult = await sendSiteEmail({
        to: email,
        subject: "Your Lee Blog email preferences were updated",
        text: buildUpdatedPreferencesEmailText({
          email,
          name,
          unsubscribeUrl,
          postNotificationsEnabled,
          digestNotificationsEnabled,
          categories,
          tags,
        }),
        html: buildUpdatedPreferencesEmailHtml({
          email,
          name,
          unsubscribeUrl,
          postNotificationsEnabled,
          digestNotificationsEnabled,
          categories,
          tags,
        }),
      });

      return {
        status: "updated",
        email,
        emailSent: mailResult.delivered,
        previewUrl: null,
      };
    } catch (error) {
      console.error("[email subscription:update]", error);
      return {
        status: "updated",
        email,
        emailSent: false,
        previewUrl: null,
      };
    }
  }

  const confirmationToken = randomBytes(32).toString("hex");
  const unsubscribeToken = existingSubscriber?.unsubscribeToken || randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_SUBSCRIPTION_CONFIRM_TTL_MS);
  const confirmUrl = buildSubscriptionConfirmUrl(confirmationToken);

  await prisma.emailSubscriber.upsert({
    where: { email },
    update: {
      name,
      categories,
      tags,
      postNotificationsEnabled,
      digestNotificationsEnabled,
      isActive: false,
      confirmedAt: existingSubscriber?.confirmedAt ?? null,
      unsubscribedAt: existingSubscriber?.unsubscribedAt ?? null,
      confirmationToken,
      confirmationExpiresAt: expiresAt,
      unsubscribeToken,
    },
    create: {
      email,
      name,
      categories,
      tags,
      postNotificationsEnabled,
      digestNotificationsEnabled,
      isActive: false,
      confirmationToken,
      confirmationExpiresAt: expiresAt,
      unsubscribeToken,
    },
  });

  try {
    const mailResult = await sendSiteEmail({
      to: email,
      subject: "Confirm your Lee Blog subscription",
        text: buildConfirmationEmailText({
          email,
          name,
          confirmUrl,
          postNotificationsEnabled,
          digestNotificationsEnabled,
          categories,
          tags,
          expiresAt,
        }),
        html: buildConfirmationEmailHtml({
          email,
          name,
          confirmUrl,
          postNotificationsEnabled,
          digestNotificationsEnabled,
          categories,
          tags,
          expiresAt,
      }),
    });

    return {
      status: "pending-confirmation",
      email,
      emailSent: mailResult.delivered,
      previewUrl: mailResult.delivered ? null : confirmUrl,
    };
  } catch (error) {
    console.error("[email subscription:confirm]", error);
    return {
      status: "pending-confirmation",
      email,
      emailSent: false,
      previewUrl: confirmUrl,
    };
  }
}

export async function confirmEmailSubscription(token: string) {
  ensureDatabase();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      status: "missing" as const,
      subscriber: null,
    };
  }

  const subscriber = await prisma.emailSubscriber.findUnique({
    where: { confirmationToken: normalizedToken },
  });

  if (!subscriber) {
    return {
      status: "invalid" as const,
      subscriber: null,
    };
  }

  if (
    subscriber.confirmationExpiresAt &&
    subscriber.confirmationExpiresAt.getTime() < Date.now()
  ) {
    return {
      status: "expired" as const,
      subscriber,
    };
  }

  const updatedSubscriber = await prisma.emailSubscriber.update({
    where: { id: subscriber.id },
    data: {
      isActive: true,
      confirmedAt: subscriber.confirmedAt ?? new Date(),
      unsubscribedAt: null,
      confirmationToken: null,
      confirmationExpiresAt: null,
    },
  });

  return {
    status: "confirmed" as const,
    subscriber: updatedSubscriber,
  };
}

export async function unsubscribeEmailSubscription(token: string) {
  ensureDatabase();

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      status: "missing" as const,
      subscriber: null,
    };
  }

  const subscriber = await prisma.emailSubscriber.findUnique({
    where: { unsubscribeToken: normalizedToken },
  });

  if (!subscriber) {
    return {
      status: "invalid" as const,
      subscriber: null,
    };
  }

  if (!subscriber.isActive && subscriber.unsubscribedAt) {
    return {
      status: "already-unsubscribed" as const,
      subscriber,
    };
  }

  const updatedSubscriber = await prisma.emailSubscriber.update({
    where: { id: subscriber.id },
    data: {
      isActive: false,
      unsubscribedAt: new Date(),
      confirmationToken: null,
      confirmationExpiresAt: null,
    },
  });

  return {
    status: "unsubscribed" as const,
    subscriber: updatedSubscriber,
  };
}

export async function getActiveEmailSubscribersForPost(input: {
  category: string;
  tags: string[];
}) {
  ensureDatabase();

  const normalizedCategory = normalizeTaxonomyValue(input.category);
  const normalizedTags = new Set(input.tags.map((tag) => normalizeTaxonomyValue(tag)));
  const subscribers = await prisma.emailSubscriber.findMany({
    where: {
      isActive: true,
      postNotificationsEnabled: true,
      confirmedAt: {
        not: null,
      },
      unsubscribedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      categories: true,
      tags: true,
      unsubscribeToken: true,
    },
  });

  return subscribers.filter((subscriber) => {
    const categoryFilters = subscriber.categories.map((value) => normalizeTaxonomyValue(value));
    const tagFilters = subscriber.tags.map((value) => normalizeTaxonomyValue(value));
    const hasCategoryFilters = categoryFilters.length > 0;
    const hasTagFilters = tagFilters.length > 0;

    if (!hasCategoryFilters && !hasTagFilters) {
      return true;
    }

    const categoryMatch = hasCategoryFilters && categoryFilters.includes(normalizedCategory);
    const tagMatch =
      hasTagFilters && tagFilters.some((value) => normalizedTags.has(value));

    return categoryMatch || tagMatch;
  });
}

export async function getActiveEmailSubscribersForDigest() {
  ensureDatabase();

  return prisma.emailSubscriber.findMany({
    where: {
      isActive: true,
      digestNotificationsEnabled: true,
      confirmedAt: {
        not: null,
      },
      unsubscribedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      unsubscribeToken: true,
      lastDigestNotificationDigestId: true,
    },
  });
}
