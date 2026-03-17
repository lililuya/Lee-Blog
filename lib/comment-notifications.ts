import "server-only";

import { CommentStatus } from "@prisma/client";
import { sendSiteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, isDatabaseConfigured, parseCsv } from "@/lib/utils";

type CommentNotificationComment = {
  id: string;
  content: string;
  status: CommentStatus;
  moderationNotes: string | null;
  moderationMatches?: string[] | null;
  createdAt: Date;
};

type CommentNotificationPost = {
  title: string;
  slug: string;
};

type CommentNotificationAuthor = {
  name: string;
  email: string;
};

type CommentReplyContext = {
  id: string;
  content: string;
  author: CommentNotificationAuthor;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCommentExcerpt(content: string, maxLength = 220) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

async function isCommentEmailEnabledForUser(userId: string | null | undefined) {
  if (!userId || !isDatabaseConfigured()) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailCommentNotifications: true },
  });

  return user?.emailCommentNotifications ?? true;
}

async function getCommentNotificationRecipients() {
  const configured = parseCsv(process.env.COMMENT_NOTIFICATION_EMAILS ?? "").map((value) =>
    value.toLowerCase(),
  );
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

  const recipients = new Set<string>();

  for (const email of configured) {
    if (email) {
      recipients.add(email);
    }
  }

  if (adminEmail) {
    recipients.add(adminEmail);
  }

  if (recipients.size > 0 || !isDatabaseConfigured()) {
    return Array.from(recipients);
  }

  const siteProfile = await prisma.siteProfile.findUnique({
    where: { id: "main" },
    select: { email: true },
  });
  const siteEmail = siteProfile?.email?.trim().toLowerCase();

  if (siteEmail) {
    recipients.add(siteEmail);
  }

  return Array.from(recipients);
}

function buildStatusLabel(status: CommentStatus) {
  switch (status) {
    case CommentStatus.APPROVED:
      return "approved automatically";
    case CommentStatus.PENDING:
      return "awaiting moderation";
    case CommentStatus.REJECTED:
      return "rejected";
  }

  return "updated";
}

export async function notifyAdminsOfNewComment(input: {
  comment: CommentNotificationComment;
  post: CommentNotificationPost;
  author: CommentNotificationAuthor;
  replyTo?: CommentReplyContext | null;
}) {
  const recipients = await getCommentNotificationRecipients();

  if (recipients.length === 0) {
    return {
      sent: false,
      reason: "no-recipient",
    };
  }

  const postUrl = absoluteUrl(`/blog/${input.post.slug}#comments`);
  const moderationUrl = absoluteUrl("/admin/comments");
  const commentExcerpt = getCommentExcerpt(input.comment.content);
  const moderationMatches = input.comment.moderationMatches ?? [];
  const replyExcerpt = input.replyTo ? getCommentExcerpt(input.replyTo.content, 160) : null;
  const subject =
    input.comment.status === CommentStatus.PENDING
      ? input.replyTo
        ? `New reply awaiting review on "${input.post.title}"`
        : `New comment awaiting review on "${input.post.title}"`
      : input.replyTo
        ? `New approved reply on "${input.post.title}"`
        : `New approved comment on "${input.post.title}"`;

  const text = [
    input.replyTo ? "A new reply was submitted on the site." : "A new comment was submitted on the site.",
    "",
    `Post: ${input.post.title}`,
    `Author: ${input.author.name} <${input.author.email}>`,
    `Status: ${buildStatusLabel(input.comment.status)}`,
    `Submitted at: ${input.comment.createdAt.toISOString()}`,
    input.replyTo ? `Replying to: ${input.replyTo.author.name} <${input.replyTo.author.email}>` : null,
    "",
    input.replyTo && replyExcerpt ? `Original comment: ${replyExcerpt}` : null,
    input.replyTo ? "" : null,
    "Comment excerpt:",
    commentExcerpt,
    "",
    input.comment.moderationNotes ? `Auto review note: ${input.comment.moderationNotes}` : null,
    moderationMatches.length > 0
      ? `Matched terms: ${moderationMatches.join(", ")}`
      : null,
    "",
    `Open moderation queue: ${moderationUrl}`,
    `Open post: ${postUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>${escapeHtml(input.replyTo ? "A new reply was submitted on the site." : "A new comment was submitted on the site.")}</p>
      <p><strong>Post:</strong> ${escapeHtml(input.post.title)}<br />
      <strong>Author:</strong> ${escapeHtml(input.author.name)} &lt;${escapeHtml(input.author.email)}&gt;<br />
      <strong>Status:</strong> ${escapeHtml(buildStatusLabel(input.comment.status))}<br />
      <strong>Submitted at:</strong> ${escapeHtml(input.comment.createdAt.toISOString())}<br />
      ${
        input.replyTo
          ? `<strong>Replying to:</strong> ${escapeHtml(input.replyTo.author.name)} &lt;${escapeHtml(input.replyTo.author.email)}&gt;`
          : ""
      }</p>
      ${
        input.replyTo && replyExcerpt
          ? `<p><strong>Original comment:</strong><br />${escapeHtml(replyExcerpt)}</p>`
          : ""
      }
      <p><strong>Comment excerpt:</strong><br />${escapeHtml(commentExcerpt)}</p>
      ${
        input.comment.moderationNotes
          ? `<p><strong>Auto review note:</strong> ${escapeHtml(input.comment.moderationNotes)}</p>`
          : ""
      }
      ${
        moderationMatches.length > 0
          ? `<p><strong>Matched terms:</strong> ${escapeHtml(moderationMatches.join(", "))}</p>`
          : ""
      }
      <p><a href="${moderationUrl}">Open moderation queue</a><br />
      <a href="${postUrl}">Open post</a></p>
    </div>
  `;

  const result = await sendSiteEmail({
    to: recipients.join(", "),
    subject,
    text,
    html,
  });

  return {
    sent: true,
    transport: result.transport,
  };
}

export async function notifyAuthorOfCommentReply(input: {
  recipient: CommentNotificationAuthor;
  replier: CommentNotificationAuthor;
  post: CommentNotificationPost;
  parentComment: Pick<CommentReplyContext, "id" | "content">;
  reply: Pick<CommentNotificationComment, "id" | "content">;
  recipientUserId?: string | null;
}) {
  const recipient = input.recipient.email.trim().toLowerCase();
  const replierEmail = input.replier.email.trim().toLowerCase();

  if (!recipient) {
    return {
      sent: false,
      reason: "no-recipient",
    };
  }

  if (recipient === replierEmail) {
    return {
      sent: false,
      reason: "self-reply",
    };
  }

  if (!(await isCommentEmailEnabledForUser(input.recipientUserId))) {
    return {
      sent: false,
      reason: "preference-disabled",
    };
  }

  const discussionUrl = absoluteUrl(`/blog/${input.post.slug}#comment-${input.reply.id}`);
  const originalExcerpt = getCommentExcerpt(input.parentComment.content, 180);
  const replyExcerpt = getCommentExcerpt(input.reply.content, 180);
  const subject = `New reply to your comment on "${input.post.title}"`;

  const text = [
    `Hi ${input.recipient.name},`,
    "",
    `${input.replier.name} replied to your comment.`,
    "",
    `Post: ${input.post.title}`,
    "",
    "Your comment:",
    originalExcerpt,
    "",
    "Reply:",
    replyExcerpt,
    "",
    `Open the discussion: ${discussionUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>Hi ${escapeHtml(input.recipient.name)},</p>
      <p>${escapeHtml(input.replier.name)} replied to your comment.</p>
      <p><strong>Post:</strong> ${escapeHtml(input.post.title)}</p>
      <p><strong>Your comment:</strong><br />${escapeHtml(originalExcerpt)}</p>
      <p><strong>Reply:</strong><br />${escapeHtml(replyExcerpt)}</p>
      <p><a href="${discussionUrl}">Open the discussion</a></p>
    </div>
  `;

  const result = await sendSiteEmail({
    to: recipient,
    subject,
    text,
    html,
  });

  return {
    sent: true,
    transport: result.transport,
  };
}

export async function notifyAuthorOfCommentReview(input: {
  status: Extract<CommentStatus, "APPROVED" | "REJECTED">;
  comment: Pick<CommentNotificationComment, "content">;
  post: CommentNotificationPost;
  author: CommentNotificationAuthor;
  authorUserId?: string | null;
}) {
  const recipient = input.author.email.trim().toLowerCase();

  if (!recipient) {
    return {
      sent: false,
      reason: "no-recipient",
    };
  }

  if (!(await isCommentEmailEnabledForUser(input.authorUserId))) {
    return {
      sent: false,
      reason: "preference-disabled",
    };
  }

  const postUrl = absoluteUrl(`/blog/${input.post.slug}#comments`);
  const commentExcerpt = getCommentExcerpt(input.comment.content);
  const subject =
    input.status === CommentStatus.APPROVED
      ? `Your comment is now live on "${input.post.title}"`
      : `Your comment on "${input.post.title}" was not approved`;

  const text = [
    `Hi ${input.author.name},`,
    "",
    input.status === CommentStatus.APPROVED
      ? "Your comment has been approved and is now visible on the post."
      : "Your comment was reviewed but was not approved for publication.",
    "",
    `Post: ${input.post.title}`,
    "",
    "Comment excerpt:",
    commentExcerpt,
    "",
    input.status === CommentStatus.APPROVED
      ? `View the discussion: ${postUrl}`
      : "You are welcome to revise the wording and submit a new comment if appropriate.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.7;color:#14212b;">
      <p>Hi ${escapeHtml(input.author.name)},</p>
      <p>${
        input.status === CommentStatus.APPROVED
          ? "Your comment has been approved and is now visible on the post."
          : "Your comment was reviewed but was not approved for publication."
      }</p>
      <p><strong>Post:</strong> ${escapeHtml(input.post.title)}</p>
      <p><strong>Comment excerpt:</strong><br />${escapeHtml(commentExcerpt)}</p>
      <p>${
        input.status === CommentStatus.APPROVED
          ? `<a href="${postUrl}">View the discussion</a>`
          : "You are welcome to revise the wording and submit a new comment if appropriate."
      }</p>
    </div>
  `;

  const result = await sendSiteEmail({
    to: recipient,
    subject,
    text,
    html,
  });

  return {
    sent: true,
    transport: result.transport,
  };
}
