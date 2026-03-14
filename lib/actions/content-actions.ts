"use server";

import { CommentStatus, PostStatus, UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isUserMuted } from "@/lib/user-state";
import { estimateReadingTime, isDatabaseConfigured, parseCsv, slugify } from "@/lib/utils";
import {
  commentDecisionSchema,
  commentSchema,
  journalSchema,
  noteSchema,
  postSchema,
  profileSchema,
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

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
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
    featured: getBoolean(formData, "featured"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const post = await prisma.post.create({
    data: {
      ...parsed,
      coverImageUrl: parsed.coverImageUrl || null,
      publishedAt: parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
      readTimeMinutes: estimateReadingTime(parsed.content),
      authorId: admin.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}?saved=1`);
}

export async function updatePostAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const postId = getString(formData, "postId");
  const parsed = postSchema.parse({
    title: getString(formData, "title"),
    slug: slugify(getString(formData, "slug") || getString(formData, "title")),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    category: getString(formData, "category"),
    tags: parseCsv(getString(formData, "tags")),
    status: getString(formData, "status"),
    featured: getBoolean(formData, "featured"),
    coverImageUrl: getOptionalString(formData, "coverImageUrl"),
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      ...parsed,
      coverImageUrl: parsed.coverImageUrl || null,
      publishedAt: parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
      readTimeMinutes: estimateReadingTime(parsed.content),
    },
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/admin/posts");
  redirect(`/admin/posts/${post.id}?saved=1`);
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
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const note = await prisma.note.create({
    data: {
      ...parsed,
      publishedAt: parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
      authorId: admin.id,
    },
  });

  revalidatePath("/notes");
  revalidatePath("/admin/notes");
  revalidatePath("/search");
  redirect(`/admin/notes/${note.id}?saved=1`);
}

export async function updateNoteAction(formData: FormData) {
  await requireAdmin();
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
    publishedAt: getDateOrNull(formData, "publishedAt"),
  });

  const existingNote = await prisma.note.findUnique({ where: { id: noteId } });
  const note = await prisma.note.update({
    where: { id: noteId },
    data: {
      ...parsed,
      publishedAt: parsed.status === PostStatus.PUBLISHED ? parsed.publishedAt ?? new Date() : null,
    },
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
  ensureDatabase();

  const parsed = profileSchema.parse({
    fullName: getString(formData, "fullName"),
    headline: getString(formData, "headline"),
    tagline: getString(formData, "tagline"),
    shortBio: getString(formData, "shortBio"),
    longBio: getString(formData, "longBio"),
    institution: getOptionalString(formData, "institution") ?? undefined,
    department: getOptionalString(formData, "department") ?? undefined,
    location: getOptionalString(formData, "location") ?? undefined,
    email: getOptionalString(formData, "email") ?? undefined,
    websiteUrl: getOptionalString(formData, "websiteUrl"),
    githubUrl: getOptionalString(formData, "githubUrl"),
    linkedinUrl: getOptionalString(formData, "linkedinUrl"),
    scholarUrl: getOptionalString(formData, "scholarUrl"),
    cvUrl: getOptionalString(formData, "cvUrl"),
    heroImageUrl: getOptionalString(formData, "heroImageUrl"),
    researchAreas: parseCsv(getString(formData, "researchAreas")),
    educationMarkdown: getString(formData, "educationMarkdown"),
    experienceMarkdown: getString(formData, "experienceMarkdown"),
    awardsMarkdown: getString(formData, "awardsMarkdown"),
    speakingMarkdown: getString(formData, "speakingMarkdown"),
  });

  await prisma.siteProfile.upsert({
    where: { id: "main" },
    update: parsed,
    create: { id: "main", ...parsed },
  });

  revalidatePath("/");
  revalidatePath("/admin/profile");
  redirect("/admin/profile?saved=1");
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

  const parsed = commentDecisionSchema.parse({
    commentId: getString(formData, "commentId"),
    status: getString(formData, "status"),
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

  revalidatePath("/admin/comments");
  revalidatePath("/admin/audit");
  revalidatePath("/blog");
  revalidatePath(`/blog/${comment.post.slug}`);
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const postId = getString(formData, "postId");
  const postSlug = getString(formData, "postSlug");
  const parsed = commentSchema.parse({
    postId,
    content: getString(formData, "content"),
  });

  if (user.status !== UserStatus.ACTIVE) {
    redirect(`/blog/${postSlug}?comment=blocked`);
  }

  if (isUserMuted(user.mutedUntil)) {
    redirect(`/blog/${postSlug}?comment=muted`);
  }

  await prisma.comment.create({
    data: {
      postId: parsed.postId,
      content: parsed.content,
      authorId: user.id,
      status: user.role === UserRole.ADMIN ? CommentStatus.APPROVED : CommentStatus.PENDING,
    },
  });

  revalidatePath(`/blog/${postSlug}`);
  revalidatePath("/admin/comments");
  redirect(`/blog/${postSlug}?comment=submitted`);
}
