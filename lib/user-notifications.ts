import "server-only";

import { CommentStatus, Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

export const USER_NOTIFICATION_TYPES = {
  COMMENT_ADMIN_EVENT: "COMMENT_ADMIN_EVENT",
  COMMENT_SUBMISSION: "COMMENT_SUBMISSION",
  COMMENT_REVIEW: "COMMENT_REVIEW",
  COMMENT_REPLY: "COMMENT_REPLY",
} as const;

export type UserNotificationType =
  (typeof USER_NOTIFICATION_TYPES)[keyof typeof USER_NOTIFICATION_TYPES];

type CreateUserNotificationInput = {
  userId: string;
  type: UserNotificationType | string;
  title: string;
  body: string;
  href?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type NotificationListOptions = {
  limit?: number;
  unreadOnly?: boolean;
};

type CommentActorInput = {
  id: string;
  name: string;
};

type CommentPostInput = {
  title: string;
  slug: string;
};

type CommentReplyTargetInput = {
  id: string;
  author: CommentActorInput;
};

function normalizeHref(href: string | null | undefined) {
  const trimmed = href?.trim();

  if (!trimmed || !trimmed.startsWith("/")) {
    return null;
  }

  return trimmed;
}

function getCommentHref(postSlug: string, commentId: string | null | undefined) {
  return commentId ? `/blog/${postSlug}#comment-${commentId}` : `/blog/${postSlug}#comments`;
}

function getExcerpt(content: string, maxLength = 160) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function dedupeNotifications(inputs: CreateUserNotificationInput[]) {
  const uniqueKeys = new Set<string>();

  return inputs.filter((input) => {
    const key = [
      input.userId,
      input.type,
      input.title,
      input.body,
      normalizeHref(input.href),
      JSON.stringify(input.metadata ?? null),
    ].join("::");

    if (uniqueKeys.has(key)) {
      return false;
    }

    uniqueKeys.add(key);
    return true;
  });
}

export async function createUserNotification(input: CreateUserNotificationInput) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  return prisma.userNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      href: normalizeHref(input.href),
      metadata: input.metadata ?? Prisma.JsonNull,
    },
  });
}

export async function createNotificationsForUsers(inputs: CreateUserNotificationInput[]) {
  if (!isDatabaseConfigured()) {
    return { count: 0 };
  }

  const deduped = dedupeNotifications(inputs)
    .map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      href: normalizeHref(input.href),
      metadata: input.metadata ?? Prisma.JsonNull,
    }))
    .filter((input) => input.userId && input.title && input.body);

  if (deduped.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.userNotification.createMany({
    data: deduped,
  });

  return {
    count: result.count,
  };
}

export async function getUserNotifications(userId: string, options: NotificationListOptions = {}) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  return prisma.userNotification.findMany({
    where: {
      userId,
      ...(options.unreadOnly ? { isRead: false } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  if (!isDatabaseConfigured()) {
    return 0;
  }

  return prisma.userNotification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  if (!isDatabaseConfigured()) {
    return { count: 0 };
  }

  return prisma.userNotification.updateMany({
    where: {
      id: notificationId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllUserNotificationsRead(userId: string) {
  if (!isDatabaseConfigured()) {
    return { count: 0 };
  }

  return prisma.userNotification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function notifyAdminsInAppOfNewComment(input: {
  comment: {
    id: string;
    content: string;
    status: CommentStatus;
    moderationNotes?: string | null;
    moderationMatches?: string[] | null;
  };
  post: CommentPostInput;
  author: CommentActorInput;
  replyTo?: CommentReplyTargetInput | null;
}) {
  if (!isDatabaseConfigured()) {
    return { count: 0 };
  }

  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) {
    return { count: 0 };
  }

  const kind = input.replyTo ? "reply" : "comment";
  const title =
    input.comment.status === CommentStatus.PENDING
      ? `New ${kind} awaiting review`
      : input.comment.status === CommentStatus.APPROVED
        ? `New ${kind} published`
        : `New ${kind} blocked by auto review`;
  const moderationSummary = input.comment.moderationNotes
    ? ` Auto review: ${input.comment.moderationNotes}.`
    : input.comment.moderationMatches && input.comment.moderationMatches.length > 0
      ? ` Matched terms: ${input.comment.moderationMatches.join(", ")}.`
      : "";
  const body = input.replyTo
    ? `${input.author.name} replied to ${input.replyTo.author.name} on "${input.post.title}". ${getExcerpt(input.comment.content)}.${moderationSummary}`
    : `${input.author.name} left a comment on "${input.post.title}". ${getExcerpt(input.comment.content)}.${moderationSummary}`;

  return createNotificationsForUsers(
    admins.map((admin) => ({
      userId: admin.id,
      type: USER_NOTIFICATION_TYPES.COMMENT_ADMIN_EVENT,
      title,
      body,
      href:
        input.comment.status === CommentStatus.APPROVED
          ? getCommentHref(input.post.slug, input.comment.id)
          : "/admin/comments",
      metadata: {
        commentId: input.comment.id,
        postSlug: input.post.slug,
        status: input.comment.status,
        replyToId: input.replyTo?.id ?? null,
      },
    })),
  );
}

export async function notifyCommentAuthorOfSubmissionInApp(input: {
  userId: string;
  status: CommentStatus;
  isReply: boolean;
  commentId: string;
  post: CommentPostInput;
}) {
  const kind = input.isReply ? "reply" : "comment";
  const title =
    input.status === CommentStatus.APPROVED
      ? `Your ${kind} is live`
      : input.status === CommentStatus.PENDING
        ? `Your ${kind} is awaiting review`
        : `Your ${kind} was blocked`;
  const body =
    input.status === CommentStatus.APPROVED
      ? `Your ${kind} on "${input.post.title}" is now visible to readers.`
      : input.status === CommentStatus.PENDING
        ? `Your ${kind} on "${input.post.title}" was received and is waiting for moderation.`
        : `Your ${kind} on "${input.post.title}" was blocked by the automatic review rules.`;

  return createUserNotification({
    userId: input.userId,
    type: USER_NOTIFICATION_TYPES.COMMENT_SUBMISSION,
    title,
    body,
    href: getCommentHref(input.post.slug, input.status === CommentStatus.APPROVED ? input.commentId : null),
    metadata: {
      commentId: input.commentId,
      postSlug: input.post.slug,
      status: input.status,
      isReply: input.isReply,
    },
  });
}

export async function notifyCommentAuthorOfReviewInApp(input: {
  userId: string;
  status: Extract<CommentStatus, "APPROVED" | "REJECTED">;
  isReply: boolean;
  commentId: string;
  post: CommentPostInput;
}) {
  const kind = input.isReply ? "reply" : "comment";
  const title =
    input.status === CommentStatus.APPROVED
      ? `Your ${kind} was approved`
      : `Your ${kind} was rejected`;
  const body =
    input.status === CommentStatus.APPROVED
      ? `Your ${kind} on "${input.post.title}" passed moderation and is now visible on the site.`
      : `Your ${kind} on "${input.post.title}" was reviewed but not approved for publication.`;

  return createUserNotification({
    userId: input.userId,
    type: USER_NOTIFICATION_TYPES.COMMENT_REVIEW,
    title,
    body,
    href: getCommentHref(input.post.slug, input.status === CommentStatus.APPROVED ? input.commentId : null),
    metadata: {
      commentId: input.commentId,
      postSlug: input.post.slug,
      status: input.status,
      isReply: input.isReply,
    },
  });
}

export async function notifyUserOfApprovedReplyInApp(input: {
  recipientId: string;
  replierId: string;
  replierName: string;
  parentCommentId: string;
  replyId: string;
  post: CommentPostInput;
}) {
  if (input.recipientId === input.replierId) {
    return null;
  }

  return createUserNotification({
    userId: input.recipientId,
    type: USER_NOTIFICATION_TYPES.COMMENT_REPLY,
    title: "New reply to your comment",
    body: `${input.replierName} replied to your comment on "${input.post.title}".`,
    href: getCommentHref(input.post.slug, input.replyId),
    metadata: {
      parentCommentId: input.parentCommentId,
      replyId: input.replyId,
      postSlug: input.post.slug,
      replierId: input.replierId,
    },
  });
}
