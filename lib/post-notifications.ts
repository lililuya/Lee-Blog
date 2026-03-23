import "server-only";

import { sendSiteEmail } from "@/lib/email";
import {
  buildSubscriptionUnsubscribeUrl,
  getActiveEmailSubscribersForPost,
} from "@/lib/email-subscriptions";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, getContentStats, isDatabaseConfigured } from "@/lib/utils";

type PublishedPostNotificationInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  publishedAt: Date | string | null;
  authorName?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPreviewText(input: PublishedPostNotificationInput) {
  const stats = getContentStats(input.content || `${input.title} ${input.excerpt}`);
  const excerpt = input.excerpt.replace(/\s+/g, " ").trim();

  return {
    readMinutes: stats.estimatedMinutes,
    excerpt: excerpt.length > 240 ? `${excerpt.slice(0, 239)}...` : excerpt,
  };
}

function describeFilters(input: { categories: string[]; tags: string[] }) {
  const parts = [
    input.categories.length > 0 ? `categories: ${input.categories.join(", ")}` : null,
    input.tags.length > 0 ? `tags: ${input.tags.join(", ")}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "all new posts";
}

export async function notifySubscribersOfPublishedPost(input: PublishedPostNotificationInput) {
  if (!isDatabaseConfigured()) {
    return {
      attempted: false,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const [accountSubscribers, emailSubscribers] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        emailPostNotifications: true,
        emailVerifiedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    getActiveEmailSubscribersForPost({
      category: input.category,
      tags: input.tags,
    }),
  ]);

  if (accountSubscribers.length === 0 && emailSubscribers.length === 0) {
    return {
      attempted: true,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const postUrl = absoluteUrl(`/blog/${input.slug}`);
  const preview = getPreviewText(input);
  const mergedRecipients = new Map<
    string,
    {
      name: string;
      email: string;
      receivesAccountEmails: boolean;
      receivesPublicSubscriptionEmails: boolean;
      publicCategories: string[];
      publicTags: string[];
      unsubscribeUrl: string | null;
    }
  >();
  let sent = 0;
  let failed = 0;

  for (const subscriber of accountSubscribers) {
    mergedRecipients.set(subscriber.email.toLowerCase(), {
      name: subscriber.name,
      email: subscriber.email,
      receivesAccountEmails: true,
      receivesPublicSubscriptionEmails: false,
      publicCategories: [],
      publicTags: [],
      unsubscribeUrl: null,
    });
  }

  for (const subscriber of emailSubscribers) {
    const key = subscriber.email.toLowerCase();
    const existing = mergedRecipients.get(key);

    if (existing) {
      existing.receivesPublicSubscriptionEmails = true;
      existing.publicCategories = subscriber.categories;
      existing.publicTags = subscriber.tags;
      existing.unsubscribeUrl = buildSubscriptionUnsubscribeUrl(subscriber.unsubscribeToken);
      existing.name = existing.name || subscriber.name || subscriber.email;
      continue;
    }

    mergedRecipients.set(key, {
      name: subscriber.name || subscriber.email,
      email: subscriber.email,
      receivesAccountEmails: false,
      receivesPublicSubscriptionEmails: true,
      publicCategories: subscriber.categories,
      publicTags: subscriber.tags,
      unsubscribeUrl: buildSubscriptionUnsubscribeUrl(subscriber.unsubscribeToken),
    });
  }

  for (const recipient of mergedRecipients.values()) {
    const receivesBecause = recipient.receivesAccountEmails
      ? recipient.receivesPublicSubscriptionEmails
        ? "your account receives new-post emails and your public subscription also matches this post"
        : "your account is subscribed to new post email updates"
      : `your public subscription matches ${describeFilters({
          categories: recipient.publicCategories,
          tags: recipient.publicTags,
        })}`;
    const text = [
      `Hi ${recipient.name},`,
      "",
      "A new post has just been published on the blog.",
      "",
      `Title: ${input.title}`,
      `Category: ${input.category}`,
      `Reading time: about ${preview.readMinutes} minute(s)`,
      input.authorName ? `Author: ${input.authorName}` : null,
      input.tags.length > 0 ? `Tags: ${input.tags.join(", ")}` : null,
      "",
      preview.excerpt,
      "",
      `Read the full post: ${postUrl}`,
      "",
      `You are receiving this because ${receivesBecause}.`,
      recipient.unsubscribeUrl
        ? `Unsubscribe from public email updates: ${recipient.unsubscribeUrl}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
        <p>Hi ${escapeHtml(recipient.name)},</p>
        <p>A new post has just been published on the blog.</p>
        <p>
          <strong>Title:</strong> ${escapeHtml(input.title)}<br />
          <strong>Category:</strong> ${escapeHtml(input.category)}<br />
          <strong>Reading time:</strong> about ${preview.readMinutes} minute(s)<br />
          ${input.authorName ? `<strong>Author:</strong> ${escapeHtml(input.authorName)}<br />` : ""}
          ${input.tags.length > 0 ? `<strong>Tags:</strong> ${escapeHtml(input.tags.join(", "))}` : ""}
        </p>
        <p>${escapeHtml(preview.excerpt)}</p>
        <p><a href="${postUrl}">Read the full post</a></p>
        <p style="color:#5b6770;">You are receiving this because ${escapeHtml(receivesBecause)}.</p>
        ${
          recipient.unsubscribeUrl
            ? `<p style="color:#5b6770;"><a href="${recipient.unsubscribeUrl}">Unsubscribe from public email updates</a></p>`
            : ""
        }
      </div>
    `;

    try {
      await sendSiteEmail({
        to: recipient.email,
        subject: `New post: ${input.title}`,
        text,
        html,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[post notification:${recipient.email}]`, error);
    }
  }

  if (emailSubscribers.length > 0) {
    const notifiedEmailSubscriberIds = emailSubscribers
      .filter((subscriber) => mergedRecipients.has(subscriber.email.toLowerCase()))
      .map((subscriber) => subscriber.id);

    if (notifiedEmailSubscriberIds.length > 0) {
      await prisma.emailSubscriber.updateMany({
        where: {
          id: {
            in: notifiedEmailSubscriberIds,
          },
        },
        data: {
          notificationCount: {
            increment: 1,
          },
          lastNotifiedAt: new Date(),
        },
      });
    }
  }

  return {
    attempted: true,
    sent,
    failed,
    skipped: 0,
  };
}
