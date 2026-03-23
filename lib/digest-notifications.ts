import "server-only";

import { sendSiteEmail } from "@/lib/email";
import {
  buildSubscriptionUnsubscribeUrl,
  getActiveEmailSubscribersForDigest,
} from "@/lib/email-subscriptions";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, isDatabaseConfigured } from "@/lib/utils";

type PublishedDigestNotificationInput = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  highlights: string[];
  featuredTopics: string[];
  paperCount: number;
  journalCount: number;
  postCount: number;
  periodStart: Date;
  periodEnd: Date;
};

const DIGEST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDigestRange(periodStart: Date, periodEnd: Date) {
  return `${DIGEST_DATE_FORMATTER.format(periodStart)} - ${DIGEST_DATE_FORMATTER.format(periodEnd)}`;
}

export async function notifySubscribersOfPublishedDigest(
  input: PublishedDigestNotificationInput,
) {
  if (!isDatabaseConfigured()) {
    return {
      attempted: false,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const subscribers = await getActiveEmailSubscribersForDigest();

  if (subscribers.length === 0) {
    return {
      attempted: true,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const digestUrl = absoluteUrl(`/digest/${input.slug}`);
  const periodLabel = formatDigestRange(input.periodStart, input.periodEnd);
  const highlightedLines = input.highlights.slice(0, 4);
  const topicLine =
    input.featuredTopics.length > 0
      ? `Featured topics: ${input.featuredTopics.join(", ")}`
      : "Featured topics: weekly overview";

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const notifiedSubscriberIds: string[] = [];

  for (const subscriber of subscribers) {
    if (subscriber.lastDigestNotificationDigestId === input.id) {
      skipped += 1;
      continue;
    }

    const recipientName = subscriber.name || subscriber.email;
    const unsubscribeUrl = buildSubscriptionUnsubscribeUrl(subscriber.unsubscribeToken);
    const text = [
      `Hi ${recipientName},`,
      "",
      "A new weekly digest is available on Lee Blog.",
      "",
      `Title: ${input.title}`,
      `Period: ${periodLabel}`,
      `Papers: ${input.paperCount} | Journal: ${input.journalCount} | Posts: ${input.postCount}`,
      topicLine,
      "",
      input.summary,
      "",
      ...highlightedLines.map((line, index) => `${index + 1}. ${line}`),
      "",
      `Read the digest: ${digestUrl}`,
      `Unsubscribe from public email updates: ${unsubscribeUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
        <p>Hi ${escapeHtml(recipientName)},</p>
        <p>A new weekly digest is available on Lee Blog.</p>
        <p>
          <strong>Title:</strong> ${escapeHtml(input.title)}<br />
          <strong>Period:</strong> ${escapeHtml(periodLabel)}<br />
          <strong>Papers:</strong> ${input.paperCount} |
          <strong> Journal:</strong> ${input.journalCount} |
          <strong> Posts:</strong> ${input.postCount}<br />
          <strong>${escapeHtml(topicLine)}</strong>
        </p>
        <p>${escapeHtml(input.summary)}</p>
        ${
          highlightedLines.length > 0
            ? `<ol>${highlightedLines
                .map((line) => `<li>${escapeHtml(line)}</li>`)
                .join("")}</ol>`
            : ""
        }
        <p><a href="${digestUrl}">Read the digest</a></p>
        <p style="color:#5b6770;"><a href="${unsubscribeUrl}">Unsubscribe from public email updates</a></p>
      </div>
    `;

    try {
      await sendSiteEmail({
        to: subscriber.email,
        subject: `Weekly digest: ${input.title}`,
        text,
        html,
      });
      sent += 1;
      notifiedSubscriberIds.push(subscriber.id);
    } catch (error) {
      failed += 1;
      console.error(`[digest notification:${subscriber.email}]`, error);
    }
  }

  if (notifiedSubscriberIds.length > 0) {
    await prisma.emailSubscriber.updateMany({
      where: {
        id: {
          in: notifiedSubscriberIds,
        },
      },
      data: {
        digestNotificationCount: {
          increment: 1,
        },
        lastDigestNotifiedAt: new Date(),
        lastDigestNotificationDigestId: input.id,
      },
    });
  }

  return {
    attempted: true,
    sent,
    failed,
    skipped,
  };
}
