"use server";

import { CommentStatus, PostStatus, UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { saveAdminProfileFromFormData } from "@/lib/admin-profile";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { evaluateCommentModeration } from "@/lib/comment-moderation";
import {
  notifyAdminsOfNewComment,
  notifyAuthorOfCommentReply,
  notifyAuthorOfCommentReview,
} from "@/lib/comment-notifications";
import { snapshotNoteRevision, snapshotPostRevision } from "@/lib/content-revisions";
import { notifySubscribersOfPublishedPost } from "@/lib/post-notifications";
import { hasCommentReplySupport, prisma } from "@/lib/prisma";
import {
  notifyAdminsInAppOfNewComment,
  notifyCommentAuthorOfReviewInApp,
  notifyCommentAuthorOfSubmissionInApp,
  notifyUserOfApprovedReplyInApp,
} from "@/lib/user-notifications";
import { isUserMuted } from "@/lib/user-state";
import { estimateReadingTime, isDatabaseConfigured, parseCsv, slugify } from "@/lib/utils";
import {
  commentDeleteSchema,
  commentDecisionSchema,
  commentSchema,
  journalSchema,
  noteSchema,
  noteRevisionRestoreSchema,
  postSchema,
  postRevisionRestoreSchema,
  providerSchema,
} from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getDateOrNull(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? new Date(value) : null;
}

function getNumberOrNull(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? Number(value) : null;
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}


async function safeRunCommentNotification(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.error(`[comment notification:${label}]`, error);
  }
}

async function safeRunPostNotification(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.error(`[post notification:${label}]`, error);
  }
}

const COMMENT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const COMMENT_RATE_LIMIT_MAX = 3;
const COMMENT_DAILY_MAX = 12;
const COMMENT_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const COMMENT_MAX_URLS = 2;
const COMMENT_SPAM_TOKENS = [
  "telegram",
  "whatsapp",
  "wechat",
  "discord.gg",
  "t.me/",
  "博彩",
  "赚钱",
  "兼职",
  "推广",
  "引流",
  "成人",
  "贷款",
];

function redirectToCommentFeedback(postSlug: string, code: string): never {
  redirect(`/blog/${postSlug}?comment=${encodeURIComponent(code)}#comments`);
}

function normalizeCommentContent(content: string) {
  return content.replace(/\s+/g, " ").trim().toLowerCase();
}

function countCommentUrls(content: string) {
  return (content.match(/https?:\/\/|www\./gi) ?? []).length;
}

function looksLikeSpamComment(content: string) {
  const normalized = normalizeCommentContent(content);
  const urlCount = countCommentUrls(content);
  const repeatedCharacterRun = /([^\s])\1{11,}/u.test(content);
  const hasSuspiciousToken = COMMENT_SPAM_TOKENS.some((token) => normalized.includes(token));
  const hasContactHandle = /(?:^|\s)@\w{3,}|\b(?:vx|vx号|qq|tg)\b/u.test(normalized);

  return (
    urlCount > COMMENT_MAX_URLS ||
    repeatedCharacterRun ||
    (hasSuspiciousToken && (urlCount > 0 || hasContactHandle))
  );
}

function getCommentFeedbackCode(isReply: boolean, status: CommentStatus) {
  if (isReply) {
    if (status === CommentStatus.APPROVED) {
      return "reply-approved";
    }

    if (status === CommentStatus.REJECTED) {
      return "reply-rejected";
    }

    return "reply-under-review";
  }

  if (status === CommentStatus.APPROVED) {
    return "approved";
  }

  if (status === CommentStatus.REJECTED) {
    return "policy-rejected";
  }

  return "under-review";
}

export async function createPostAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = postSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    category: getString(formData, "category"),
    tags: parseCsv(getString(formData, "tags")),
    status: getString(formData, "status"),
    pinned: getBoolean(formData, "pinned"),
    featured: getBoolean(formData, "featured"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    seriesId: getOptionalString(formData, "seriesId"),
    seriesOrder: getNumberOrNull(formData, "seriesOrder"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const post = await prisma.$transaction(async (tx) => {
    if (parsed.pinned && parsed.status === PostStatus.PUBLISHED) {
      await tx.post.updateMany({
        where: {
          pinned: true,
          status: PostStatus.PUBLISHED,
        },
        data: {
          pinned: false,
        },
      });
    }

    const createdPost = await tx.post.create({
      data: {
        ...parsed,
        coverImageUrl: parsed.coverImageUrl || null,
        seriesId: parsed.seriesId || null,
        seriesOrder: parsed.seriesId ? parsed.seriesOrder ?? null : null,
        publishedAt:
          parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
        readTimeMinutes: estimateReadingTime(parsed.content),
        authorId: admin.id,
      },
    });

    await snapshotPostRevision(tx, {
      postId: createdPost.id,
      actorId: admin.id,
    });

    return createdPost;
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");

  if (post.status === PostStatus.PUBLISHED) {
    await safeRunPostNotification("publish-create", () =>
      notifySubscribersOfPublishedPost({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        publishedAt: post.publishedAt,
        authorName: admin.name,
      }),
    );
  }

  redirect(`/admin/posts/${post.id}?saved=1`);
}

export async function updatePostAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const postId = getString(formData, "postId");
  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      slug: true,
    },
  });
  const parsed = postSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    category: getString(formData, "category"),
    tags: parseCsv(getString(formData, "tags")),
    status: getString(formData, "status"),
    pinned: getBoolean(formData, "pinned"),
    featured: getBoolean(formData, "featured"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    seriesId: getOptionalString(formData, "seriesId"),
    seriesOrder: getNumberOrNull(formData, "seriesOrder"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const post = await prisma.$transaction(async (tx) => {
    if (parsed.pinned && parsed.status === PostStatus.PUBLISHED) {
      await tx.post.updateMany({
        where: {
          id: { not: postId },
          pinned: true,
          status: PostStatus.PUBLISHED,
        },
        data: {
          pinned: false,
        },
      });
    }

    const updatedPost = await tx.post.update({
      where: { id: postId },
      data: {
        ...parsed,
        coverImageUrl: parsed.coverImageUrl || null,
        seriesId: parsed.seriesId || null,
        seriesOrder: parsed.seriesId ? parsed.seriesOrder ?? null : null,
        publishedAt:
          parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
        readTimeMinutes: estimateReadingTime(parsed.content),
      },
    });

    await snapshotPostRevision(tx, {
      postId: updatedPost.id,
      actorId: admin.id,
    });

    return updatedPost;
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  if (existingPost && existingPost.slug !== post.slug) {
    revalidatePath(`/blog/${existingPost.slug}`);
  }
  revalidatePath("/admin/posts");

  if (existingPost?.status !== PostStatus.PUBLISHED && post.status === PostStatus.PUBLISHED) {
    await safeRunPostNotification("publish-update", () =>
      notifySubscribersOfPublishedPost({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        publishedAt: post.publishedAt,
      }),
    );
  }

  redirect(`/admin/posts/${post.id}?saved=1`);
}

export async function restorePostRevisionAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = postRevisionRestoreSchema.parse({
    postId: getString(formData, "postId"),
    revisionId: getString(formData, "revisionId"),
  });

  const existingPost = await prisma.post.findUnique({
    where: { id: parsed.postId },
    select: {
      id: true,
      slug: true,
    },
  });

  const restoredPost = await prisma.$transaction(async (tx) => {
    const revision = await tx.postRevision.findFirst({
      where: {
        id: parsed.revisionId,
        postId: parsed.postId,
      },
    });

    if (!revision) {
      return null;
    }

    if (revision.pinned && revision.status === PostStatus.PUBLISHED) {
      await tx.post.updateMany({
        where: {
          id: { not: parsed.postId },
          pinned: true,
          status: PostStatus.PUBLISHED,
        },
        data: {
          pinned: false,
        },
      });
    }

    const targetSeries =
      revision.seriesId
        ? await tx.contentSeries.findUnique({
            where: { id: revision.seriesId },
            select: { id: true },
          })
        : null;

    const post = await tx.post.update({
      where: { id: parsed.postId },
      data: {
        title: revision.title,
        slug: revision.slug,
        excerpt: revision.excerpt,
        content: revision.content,
        category: revision.category,
        tags: revision.tags,
        status: revision.status,
        pinned: revision.pinned,
        featured: revision.featured,
        coverImageUrl: revision.coverImageUrl,
        readTimeMinutes: revision.readTimeMinutes,
        seriesId: targetSeries?.id ?? null,
        seriesOrder: targetSeries?.id ? revision.seriesOrder ?? null : null,
        publishedAt: revision.publishedAt,
      },
    });

    await snapshotPostRevision(tx, {
      postId: post.id,
      actorId: admin.id,
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.POST_REVISION_RESTORED,
        summary: `Restored post "${post.title}" to revision v${revision.version}.`,
        actorId: admin.id,
        targetUserId: post.authorId,
        metadata: {
          postId: post.id,
          revisionId: revision.id,
          revisionVersion: revision.version,
          previousSlug: existingPost?.slug ?? null,
          restoredSlug: post.slug,
        },
      }),
    });

    return post;
  });

  if (!restoredPost) {
    redirect(`/admin/posts/${parsed.postId}?revision=missing`);
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  revalidatePath(`/blog/${existingPost?.slug ?? restoredPost.slug}`);
  revalidatePath(`/blog/${restoredPost.slug}`);
  revalidatePath(`/admin/posts/${restoredPost.id}`);
  redirect(`/admin/posts/${restoredPost.id}?revision=restored`);
}

export async function deletePostAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const postId = getString(formData, "postId");
  const post = await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/admin/posts");
  redirect("/admin/posts?deleted=1");
}

export async function createNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = noteSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    summary: getString(formData, "summary"),
    content: getString(formData, "content"),
    noteType: getString(formData, "noteType") || "Knowledge Note",
    tags: parseCsv(getString(formData, "tags")),
    status: getString(formData, "status"),
    featured: getBoolean(formData, "featured"),
    seriesId: getOptionalString(formData, "seriesId"),
    seriesOrder: getNumberOrNull(formData, "seriesOrder"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const note = await prisma.$transaction(async (tx) => {
    const createdNote = await tx.note.create({
      data: {
        ...parsed,
        seriesId: parsed.seriesId || null,
        seriesOrder: parsed.seriesId ? parsed.seriesOrder ?? null : null,
        publishedAt:
          parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
        authorId: admin.id,
      },
    });

    await snapshotNoteRevision(tx, {
      noteId: createdNote.id,
      actorId: admin.id,
    });

    return createdNote;
  });

  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  revalidatePath("/search");
  redirect(`/admin/notes/${note.id}?saved=1`);
}

export async function updateNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const noteId = getString(formData, "noteId");
  const parsed = noteSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    summary: getString(formData, "summary"),
    content: getString(formData, "content"),
    noteType: getString(formData, "noteType") || "Knowledge Note",
    tags: parseCsv(getString(formData, "tags")),
    status: getString(formData, "status"),
    featured: getBoolean(formData, "featured"),
    seriesId: getOptionalString(formData, "seriesId"),
    seriesOrder: getNumberOrNull(formData, "seriesOrder"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const existingNote = await prisma.note.findUnique({ where: { id: noteId } });
  const note = await prisma.$transaction(async (tx) => {
    const updatedNote = await tx.note.update({
      where: { id: noteId },
      data: {
        ...parsed,
        seriesId: parsed.seriesId || null,
        seriesOrder: parsed.seriesId ? parsed.seriesOrder ?? null : null,
        publishedAt:
          parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
      },
    });

    await snapshotNoteRevision(tx, {
      noteId: updatedNote.id,
      actorId: admin.id,
    });

    return updatedNote;
  });

  revalidatePath("/notes");
  revalidatePath(`/notes/${note.slug}`);
  if (existingNote && existingNote.slug !== note.slug) {
    revalidatePath(`/notes/${existingNote.slug}`);
  }
  revalidatePath("/admin/notes");
  revalidatePath("/search");
  redirect(`/admin/notes/${note.id}?saved=1`);
}

export async function restoreNoteRevisionAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = noteRevisionRestoreSchema.parse({
    noteId: getString(formData, "noteId"),
    revisionId: getString(formData, "revisionId"),
  });

  const existingNote = await prisma.note.findUnique({
    where: { id: parsed.noteId },
    select: {
      id: true,
      slug: true,
    },
  });

  const restoredNote = await prisma.$transaction(async (tx) => {
    const revision = await tx.noteRevision.findFirst({
      where: {
        id: parsed.revisionId,
        noteId: parsed.noteId,
      },
    });

    if (!revision) {
      return null;
    }

    const targetSeries =
      revision.seriesId
        ? await tx.contentSeries.findUnique({
            where: { id: revision.seriesId },
            select: { id: true },
          })
        : null;

    const note = await tx.note.update({
      where: { id: parsed.noteId },
      data: {
        title: revision.title,
        slug: revision.slug,
        summary: revision.summary,
        content: revision.content,
        noteType: revision.noteType,
        tags: revision.tags,
        status: revision.status,
        featured: revision.featured,
        seriesId: targetSeries?.id ?? null,
        seriesOrder: targetSeries?.id ? revision.seriesOrder ?? null : null,
        publishedAt: revision.publishedAt,
      },
    });

    await snapshotNoteRevision(tx, {
      noteId: note.id,
      actorId: admin.id,
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.NOTE_REVISION_RESTORED,
        summary: `Restored note "${note.title}" to revision v${revision.version}.`,
        actorId: admin.id,
        targetUserId: note.authorId,
        metadata: {
          noteId: note.id,
          revisionId: revision.id,
          revisionVersion: revision.version,
          previousSlug: existingNote?.slug ?? null,
          restoredSlug: note.slug,
        },
      }),
    });

    return note;
  });

  if (!restoredNote) {
    redirect(`/admin/notes/${parsed.noteId}?revision=missing`);
  }

  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  revalidatePath("/search");
  revalidatePath(`/notes/${existingNote?.slug ?? restoredNote.slug}`);
  revalidatePath(`/notes/${restoredNote.slug}`);
  revalidatePath(`/admin/notes/${restoredNote.id}`);
  redirect(`/admin/notes/${restoredNote.id}?revision=restored`);
}

export async function deleteNoteAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const noteId = getString(formData, "noteId");
  const note = await prisma.note.delete({ where: { id: noteId } });

  revalidatePath("/notes");
  revalidatePath(`/notes/${note.slug}`);
  revalidatePath("/admin/notes");
  revalidatePath("/search");
  redirect("/admin/notes?deleted=1");
}

export async function createJournalAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  await prisma.journalEntry.create({
    data: journalSchema.parse({
      title: getString(formData, "title"),
      slug: slugify(getString(formData, "slug") || getString(formData, "title")),
      summary: getString(formData, "summary"),
      content: getString(formData, "content"),
      mood: getOptionalString(formData, "mood") ?? undefined,
      status: getString(formData, "status"),
      publishedAt: getString(formData, "publishedAt") || new Date().toISOString(),
    }),
  });

  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/admin/journal");
  redirect("/admin/journal?saved=1");
}

export async function updateJournalAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const entryId = getString(formData, "entryId");
  const parsed = journalSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    summary: getString(formData, "summary"),
    content: getString(formData, "content"),
    mood: getOptionalString(formData, "mood") ?? undefined,
    status: getString(formData, "status"),
    publishedAt: getString(formData, "publishedAt") || new Date().toISOString(),
  });

  const entry = await prisma.journalEntry.update({
    where: { id: entryId },
    data: parsed,
  });

  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/admin/journal");
  redirect(`/admin/journal/${entry.id}?saved=1`);
}

export async function deleteJournalAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const entryId = getString(formData, "entryId");
  const entry = await prisma.journalEntry.delete({ where: { id: entryId } });

  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath(`/journal/${entry.slug}`);
  revalidatePath("/admin/journal");
  redirect("/admin/journal?deleted=1");
}

export async function saveProfileAction(formData: FormData) {
  await requireAdmin();
  const result = await saveAdminProfileFromFormData(formData);
  redirect(result.redirectPath);
}

export async function createProviderAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const provider = await prisma.llmProvider.create({
    data: providerSchema.parse({
      name: getString(formData, "name"),
      slug: slugify(getString(formData, "slug") || getString(formData, "name")),
      adapter: getString(formData, "adapter"),
      baseUrl: getString(formData, "baseUrl"),
      model: getString(formData, "model"),
      apiKeyEnv: getString(formData, "apiKeyEnv"),
      systemPrompt: getOptionalString(formData, "systemPrompt") ?? undefined,
      enabled: getBoolean(formData, "enabled"),
    }),
  });

  revalidatePath("/admin/providers");
  redirect(`/admin/providers/${provider.id}?saved=1`);
}

export async function updateProviderAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const providerId = getString(formData, "providerId");
  const provider = await prisma.llmProvider.update({
    where: { id: providerId },
    data: providerSchema.parse({
      name: getString(formData, "name"),
      slug: slugify(getString(formData, "slug") || getString(formData, "name")),
      adapter: getString(formData, "adapter"),
      baseUrl: getString(formData, "baseUrl"),
      model: getString(formData, "model"),
      apiKeyEnv: getString(formData, "apiKeyEnv"),
      systemPrompt: getOptionalString(formData, "systemPrompt") ?? undefined,
      enabled: getBoolean(formData, "enabled"),
    }),
  });

  revalidatePath("/admin/providers");
  redirect(`/admin/providers/${provider.id}?saved=1`);
}

export async function deleteProviderAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const providerId = getString(formData, "providerId");
  await prisma.llmProvider.delete({ where: { id: providerId } });

  revalidatePath("/admin/providers");
  redirect("/admin/providers?deleted=1");
}

export async function moderateCommentAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();
  const repliesSupported = hasCommentReplySupport();

  const parsed = commentDecisionSchema.parse({
    commentId: getString(formData, "commentId"),
    status: getString(formData, "status"),
  });

  const comment = repliesSupported
    ? await prisma.comment.findUnique({
        where: { id: parsed.commentId },
        include: {
          author: true,
          post: true,
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    : await prisma.comment.findUnique({
        where: { id: parsed.commentId },
        include: {
          author: true,
          post: true,
        },
      });

  if (!comment) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: parsed.commentId },
      data: { status: parsed.status },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.COMMENT_MODERATED,
        summary: `Set comment by ${comment.author.email} on "${comment.post.title}" to ${parsed.status}.`,
        actorId: admin.id,
        targetUserId: comment.authorId,
        metadata: {
          commentId: comment.id,
          postId: comment.postId,
          postTitle: comment.post.title,
          previousStatus: comment.status,
          nextStatus: parsed.status,
        },
      }),
    });
  });

  const reviewStatus =
    parsed.status === CommentStatus.APPROVED
      ? CommentStatus.APPROVED
      : parsed.status === CommentStatus.REJECTED
        ? CommentStatus.REJECTED
        : null;

  if (comment.status !== parsed.status && reviewStatus) {
    await safeRunCommentNotification("review-result", () =>
      notifyAuthorOfCommentReview({
        status: reviewStatus,
        comment: {
          content: comment.content,
        },
        post: {
          title: comment.post.title,
          slug: comment.post.slug,
        },
        author: {
          name: comment.author.name,
          email: comment.author.email,
        },
        authorUserId: comment.authorId,
      }),
    );

    await safeRunCommentNotification("review-result-in-app", () =>
      notifyCommentAuthorOfReviewInApp({
        userId: comment.authorId,
        status: reviewStatus,
        isReply: Boolean(comment.parentId),
        commentId: comment.id,
        post: {
          title: comment.post.title,
          slug: comment.post.slug,
        },
      }),
    );
  }

  const parentCommentForNotification = repliesSupported
    ? (
        comment as typeof comment & {
          parent: {
            id: string;
            content: string;
            author: {
              id: string;
              name: string;
              email: string;
            };
          } | null;
        }
      ).parent
    : null;

  if (
    comment.status !== parsed.status &&
    parsed.status === CommentStatus.APPROVED &&
    parentCommentForNotification
  ) {
    await safeRunCommentNotification("reply-approved-review", () =>
      notifyAuthorOfCommentReply({
        recipient: {
          name: parentCommentForNotification.author.name,
          email: parentCommentForNotification.author.email,
        },
        recipientUserId: parentCommentForNotification.author.id,
        replier: {
          name: comment.author.name,
          email: comment.author.email,
        },
        post: {
          title: comment.post.title,
          slug: comment.post.slug,
        },
        parentComment: {
          id: parentCommentForNotification.id,
          content: parentCommentForNotification.content,
        },
        reply: {
          id: comment.id,
          content: comment.content,
        },
      }),
    );

    await safeRunCommentNotification("reply-approved-review-in-app", () =>
      notifyUserOfApprovedReplyInApp({
        recipientId: parentCommentForNotification.author.id,
        replierId: comment.authorId,
        replierName: comment.author.name,
        parentCommentId: parentCommentForNotification.id,
        replyId: comment.id,
        post: {
          title: comment.post.title,
          slug: comment.post.slug,
        },
      }),
    );
  }

  revalidatePath("/admin/comments");
  revalidatePath("/admin/audit");
  revalidatePath("/blog");
  revalidatePath(`/blog/${comment.post.slug}`);
}

export async function deleteCommentAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const parsed = commentDeleteSchema.parse({
    commentId: getString(formData, "commentId"),
  });

  const comment = await prisma.comment.findUnique({
    where: { id: parsed.commentId },
    include: {
      author: true,
      post: true,
    },
  });

  if (!comment) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.delete({
      where: { id: parsed.commentId },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.COMMENT_DELETED,
        summary: `Deleted comment by ${comment.author.email} on "${comment.post.title}".`,
        actorId: admin.id,
        targetUserId: comment.authorId,
        metadata: {
          commentId: comment.id,
          postId: comment.postId,
          postTitle: comment.post.title,
          deletedStatus: comment.status,
          moderationNotes: comment.moderationNotes,
          moderationMatches: comment.moderationMatches ?? [],
        },
      }),
    });
  });

  revalidatePath("/admin/comments");
  revalidatePath("/admin/audit");
  revalidatePath("/blog");
  revalidatePath(`/blog/${comment.post.slug}`);
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();
  const repliesSupported = hasCommentReplySupport();

  const postId = getString(formData, "postId");
  const postSlug = getString(formData, "postSlug");
  const honeypotValue = getString(formData, "website");
  const parsed = commentSchema.parse({
    postId,
    parentId: getOptionalString(formData, "parentId"),
    content: getString(formData, "content"),
  });

  if (user.status !== UserStatus.ACTIVE) {
    redirectToCommentFeedback(postSlug, "blocked");
  }

  if (user.emailVerificationRequired && !user.emailVerifiedAt) {
    redirectToCommentFeedback(postSlug, "verify-email");
  }

  if (isUserMuted(user.mutedUntil)) {
    redirectToCommentFeedback(postSlug, "muted");
  }

  const post = await prisma.post.findUnique({
    where: { id: parsed.postId },
    select: {
      title: true,
      slug: true,
      status: true,
    },
  });

  if (!post || post.slug !== postSlug || post.status !== PostStatus.PUBLISHED) {
    redirect("/blog");
  }

  if (parsed.parentId && !repliesSupported) {
    redirectToCommentFeedback(postSlug, "reply-unavailable");
  }

  const parentComment = parsed.parentId && repliesSupported
    ? await prisma.comment.findUnique({
        where: { id: parsed.parentId },
        select: {
          id: true,
          content: true,
          status: true,
          postId: true,
          parentId: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    : null;

  if (
    parsed.parentId &&
    (!parentComment ||
      parentComment.postId !== parsed.postId ||
      parentComment.status !== CommentStatus.APPROVED)
  ) {
    redirectToCommentFeedback(postSlug, "reply-unavailable");
  }

  let nextStatus: CommentStatus = CommentStatus.APPROVED;
  let moderationNotes: string | null = null;
  let moderationMatches: string[] = [];

  if (user.role !== UserRole.ADMIN) {
    if (honeypotValue) {
      redirectToCommentFeedback(postSlug, "spam-blocked");
    }

    const now = Date.now();
    const recentComments = await prisma.comment.findMany({
      where: {
        authorId: user.id,
        createdAt: {
          gte: new Date(now - COMMENT_DUPLICATE_WINDOW_MS),
        },
      },
      select: {
        content: true,
        createdAt: true,
        postId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const recentWindowCount = recentComments.filter(
      (comment) => comment.createdAt.getTime() >= now - COMMENT_RATE_LIMIT_WINDOW_MS,
    ).length;

    if (recentWindowCount >= COMMENT_RATE_LIMIT_MAX || recentComments.length >= COMMENT_DAILY_MAX) {
      redirectToCommentFeedback(postSlug, "rate-limited");
    }

    const normalizedContent = normalizeCommentContent(parsed.content);
    const duplicateComment = recentComments.some(
      (comment) =>
        comment.postId === parsed.postId &&
        normalizeCommentContent(comment.content) === normalizedContent,
    );

    if (duplicateComment) {
      redirectToCommentFeedback(postSlug, "duplicate");
    }

    if (looksLikeSpamComment(parsed.content)) {
      redirectToCommentFeedback(postSlug, "spam-blocked");
    }

    const moderationResult = await evaluateCommentModeration(parsed.content);
    nextStatus = moderationResult.status;
    moderationNotes = moderationResult.notes;
    moderationMatches = moderationResult.matches;
  }

  const finalStatus = user.role === UserRole.ADMIN ? CommentStatus.APPROVED : nextStatus;

  const createdComment = await prisma.comment.create({
    data: {
      postId: parsed.postId,
      ...(repliesSupported ? { parentId: parsed.parentId ?? null } : {}),
      content: parsed.content,
      authorId: user.id,
      status: finalStatus,
      moderationNotes,
      moderationMatches,
    },
  });

  if (user.role !== UserRole.ADMIN) {
    await safeRunCommentNotification("new-comment", () =>
      notifyAdminsOfNewComment({
        comment: {
          id: createdComment.id,
          content: createdComment.content,
          status: createdComment.status,
          moderationNotes: createdComment.moderationNotes,
          moderationMatches: createdComment.moderationMatches,
          createdAt: createdComment.createdAt,
        },
        post: {
          title: post.title,
          slug: postSlug,
        },
        author: {
          name: user.name,
          email: user.email,
        },
        replyTo: parentComment
          ? {
              id: parentComment.id,
              content: parentComment.content,
              author: {
                name: parentComment.author.name,
                email: parentComment.author.email,
              },
            }
          : null,
      }),
    );

    await safeRunCommentNotification("new-comment-in-app", () =>
      notifyAdminsInAppOfNewComment({
        comment: {
          id: createdComment.id,
          content: createdComment.content,
          status: createdComment.status,
          moderationNotes: createdComment.moderationNotes,
          moderationMatches: createdComment.moderationMatches,
        },
        post: {
          title: post.title,
          slug: postSlug,
        },
        author: {
          id: user.id,
          name: user.name,
        },
        replyTo: parentComment
          ? {
              id: parentComment.id,
              author: {
                id: parentComment.author.id,
                name: parentComment.author.name,
              },
            }
          : null,
      }),
    );

    await safeRunCommentNotification("comment-submission-in-app", () =>
      notifyCommentAuthorOfSubmissionInApp({
        userId: user.id,
        status: finalStatus,
        isReply: Boolean(parentComment),
        commentId: createdComment.id,
        post: {
          title: post.title,
          slug: postSlug,
        },
      }),
    );
  }

  if (finalStatus === CommentStatus.APPROVED && parentComment) {
    await safeRunCommentNotification("reply-approved-immediate", () =>
      notifyAuthorOfCommentReply({
        recipient: {
          name: parentComment.author.name,
          email: parentComment.author.email,
        },
        recipientUserId: parentComment.author.id,
        replier: {
          name: user.name,
          email: user.email,
        },
        post: {
          title: post.title,
          slug: postSlug,
        },
        parentComment: {
          id: parentComment.id,
          content: parentComment.content,
        },
        reply: {
          id: createdComment.id,
          content: createdComment.content,
        },
      }),
    );

    await safeRunCommentNotification("reply-approved-immediate-in-app", () =>
      notifyUserOfApprovedReplyInApp({
        recipientId: parentComment.author.id,
        replierId: user.id,
        replierName: user.name,
        parentCommentId: parentComment.id,
        replyId: createdComment.id,
        post: {
          title: post.title,
          slug: postSlug,
        },
      }),
    );
  }

  revalidatePath(`/blog/${postSlug}`);
  revalidatePath("/admin/comments");
  redirectToCommentFeedback(postSlug, getCommentFeedbackCode(Boolean(parentComment), finalStatus));
}
