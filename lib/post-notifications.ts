import "server-only";

import { sendSiteEmail } from "@/lib/email";
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

export async function notifySubscribersOfPublishedPost(input: PublishedPostNotificationInput) {
  if (!isDatabaseConfigured()) {
    return {
      attempted: false,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const subscribers = await prisma.user.findMany({
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
  });

  if (subscribers.length === 0) {
    return {
      attempted: true,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const postUrl = absoluteUrl(`/blog/${input.slug}`);
  const preview = getPreviewText(input);
  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    const text = [
      `Hi ${subscriber.name},`,
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
      "You are receiving this because your account is subscribed to new post email updates.",
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
        <p>Hi ${escapeHtml(subscriber.name)},</p>
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
        <p style="color:#5b6770;">You are receiving this because your account is subscribed to new post email updates.</p>
      </div>
    `;

    try {
      await sendSiteEmail({
        to: subscriber.email,
        subject: `New post: ${input.title}`,
        text,
        html,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[post notification:${subscriber.email}]`, error);
    }
  }

  return {
    attempted: true,
    sent,
    failed,
    skipped: 0,
  };
}
