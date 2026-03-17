"use server";

import { PaperReadingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { syncAllPaperTopics, syncPaperTopic } from "@/lib/papers";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured, slugify } from "@/lib/utils";
import {
  paperAnnotationDeleteSchema,
  paperAnnotationSchema,
  paperLibraryLifecycleSchema,
  paperLibraryProgressSchema,
  paperLibrarySaveSchema,
  paperLibraryStatusSchema,
  paperTopicSchema,
} from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function getRedirectTarget(formData: FormData, fallback: string) {
  const redirectTo = getString(formData, "redirectTo");
  return redirectTo.startsWith("/") ? redirectTo : fallback;
}

function redirectWithFeedback(target: string, type: "notice" | "error", code: string): never {
  const url = new URL(target, "http://localhost");
  url.searchParams.set(type, code);
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function parseAuthors(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    return value
      .split("||")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [] as string[];
}

function buildStatusTimestamps(
  status: PaperReadingStatus,
  currentItem: { startedAt: Date | null; completedAt: Date | null },
) {
  const now = new Date();

  switch (status) {
    case PaperReadingStatus.TO_READ:
      return {
        status,
        startedAt: null,
        completedAt: null,
      };
    case PaperReadingStatus.READING:
      return {
        status,
        startedAt: currentItem.startedAt ?? now,
        completedAt: null,
      };
    case PaperReadingStatus.COMPLETED:
      return {
        status,
        startedAt: currentItem.startedAt ?? now,
        completedAt: currentItem.completedAt ?? now,
      };
    case PaperReadingStatus.ARCHIVED:
      return {
        status,
        startedAt: currentItem.startedAt,
        completedAt: currentItem.completedAt,
      };
    default:
      return { status };
  }
}

async function getLibraryItemForUser(libraryItemId: string, userId: string, redirectTarget: string) {
  const item = await prisma.paperLibraryItem.findFirst({
    where: {
      id: libraryItemId,
      userId,
    },
  });

  if (!item) {
    redirectWithFeedback(redirectTarget, "error", "library-item-not-found");
  }

  return item;
}

export async function createPaperTopicAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const topic = await prisma.paperTopic.create({
    data: paperTopicSchema.parse({
      name: getString(formData, "name"),
      slug: slugify(getString(formData, "slug") || getString(formData, "name")),
      description: getString(formData, "description") || undefined,
      query: getString(formData, "query"),
      maxResults: getString(formData, "maxResults"),
      enabled: getBoolean(formData, "enabled"),
    }),
  });

  revalidatePath("/papers");
  revalidatePath("/admin/papers");
  redirect(`/admin/papers/${topic.id}?saved=1`);
}

export async function updatePaperTopicAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const topicId = getString(formData, "topicId");
  const topic = await prisma.paperTopic.update({
    where: { id: topicId },
    data: paperTopicSchema.parse({
      name: getString(formData, "name"),
      slug: slugify(getString(formData, "slug") || getString(formData, "name")),
      description: getString(formData, "description") || undefined,
      query: getString(formData, "query"),
      maxResults: getString(formData, "maxResults"),
      enabled: getBoolean(formData, "enabled"),
    }),
  });

  revalidatePath("/papers");
  revalidatePath("/admin/papers");
  redirect(`/admin/papers/${topic.id}?saved=1`);
}

export async function deletePaperTopicAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const topicId = getString(formData, "topicId");
  await prisma.paperTopic.delete({ where: { id: topicId } });

  revalidatePath("/papers");
  revalidatePath("/admin/papers");
  redirect("/admin/papers?deleted=1");
}

export async function syncAllPaperTopicsAction() {
  await requireAdmin();
  ensureDatabase();

  await syncAllPaperTopics();
  revalidatePath("/papers");
  revalidatePath("/");
  revalidatePath("/admin/papers");
  redirect("/admin/papers?synced=1");
}

export async function syncSinglePaperTopicAction(formData: FormData) {
  await requireAdmin();
  ensureDatabase();

  const topicId = getString(formData, "topicId");
  await syncPaperTopic(topicId);
  revalidatePath("/papers");
  revalidatePath("/");
  revalidatePath("/admin/papers");
  redirect(`/admin/papers/${topicId}?synced=1`);
}

export async function savePaperToLibraryAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData, "/papers");
  const parsed = paperLibrarySaveSchema.parse({
    arxivId: getString(formData, "arxivId"),
    title: getString(formData, "title"),
    summary: getString(formData, "summary"),
    authors: parseAuthors(getString(formData, "authors")),
    paperUrl: getString(formData, "paperUrl"),
    pdfUrl: getString(formData, "pdfUrl") || null,
    primaryCategory: getString(formData, "primaryCategory") || undefined,
    topicName: getString(formData, "topicName") || undefined,
    digestDate: getString(formData, "digestDate") || null,
    publishedAt: getString(formData, "publishedAt") || null,
  });

  await prisma.paperLibraryItem.upsert({
    where: {
      userId_arxivId: {
        userId: user.id,
        arxivId: parsed.arxivId,
      },
    },
    update: {
      title: parsed.title,
      summary: parsed.summary,
      authors: parsed.authors,
      paperUrl: parsed.paperUrl,
      pdfUrl: parsed.pdfUrl || null,
      primaryCategory: parsed.primaryCategory ?? null,
      topicName: parsed.topicName ?? null,
      digestDate: parsed.digestDate ?? null,
      publishedAt: parsed.publishedAt ?? null,
    },
    create: {
      userId: user.id,
      arxivId: parsed.arxivId,
      title: parsed.title,
      summary: parsed.summary,
      authors: parsed.authors,
      paperUrl: parsed.paperUrl,
      pdfUrl: parsed.pdfUrl || null,
      primaryCategory: parsed.primaryCategory ?? null,
      topicName: parsed.topicName ?? null,
      digestDate: parsed.digestDate ?? null,
      publishedAt: parsed.publishedAt ?? null,
      status: PaperReadingStatus.TO_READ,
    },
  });

  revalidatePath("/papers");
  revalidatePath("/papers/library");
  redirectWithFeedback(redirectTarget, "notice", "saved");
}

export async function updatePaperLibraryStatusAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData, "/papers/library");
  const parsed = paperLibraryStatusSchema.parse({
    libraryItemId: getString(formData, "libraryItemId"),
    status: getString(formData, "status"),
  });

  const item = await getLibraryItemForUser(parsed.libraryItemId, user.id, redirectTarget);
  const timestamps = buildStatusTimestamps(parsed.status, item);

  await prisma.paperLibraryItem.update({
    where: { id: item.id },
    data: {
      ...timestamps,
      lastReadAt:
        timestamps.status === PaperReadingStatus.READING ||
        timestamps.status === PaperReadingStatus.COMPLETED
          ? new Date()
          : item.lastReadAt,
    },
  });

  revalidatePath("/papers");
  revalidatePath("/papers/library");
  redirectWithFeedback(redirectTarget, "notice", "updated");
}

export async function updatePaperLibraryProgressAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData, "/papers/library");
  const parsed = paperLibraryProgressSchema.parse({
    libraryItemId: getString(formData, "libraryItemId"),
    progressPercent: getString(formData, "progressPercent"),
  });

  const item = await getLibraryItemForUser(parsed.libraryItemId, user.id, redirectTarget);
  const nextStatus =
    parsed.progressPercent >= 100
      ? PaperReadingStatus.COMPLETED
      : parsed.progressPercent > 0
        ? item.status === PaperReadingStatus.ARCHIVED
          ? PaperReadingStatus.ARCHIVED
          : PaperReadingStatus.READING
        : item.status;
  const timestamps = buildStatusTimestamps(nextStatus, item);

  await prisma.paperLibraryItem.update({
    where: { id: item.id },
    data: {
      ...timestamps,
      progressPercent: parsed.progressPercent,
      lastReadAt: parsed.progressPercent > 0 ? new Date() : item.lastReadAt,
    },
  });

  revalidatePath("/papers");
  revalidatePath("/papers/library");
  redirectWithFeedback(redirectTarget, "notice", "progress");
}

export async function removePaperFromLibraryAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData, "/papers/library");
  const parsed = paperLibraryLifecycleSchema.parse({
    libraryItemId: getString(formData, "libraryItemId"),
  });

  const item = await getLibraryItemForUser(parsed.libraryItemId, user.id, redirectTarget);

  await prisma.paperLibraryItem.delete({ where: { id: item.id } });

  revalidatePath("/papers");
  revalidatePath("/papers/library");
  redirectWithFeedback(redirectTarget, "notice", "removed");
}

export async function addPaperAnnotationAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData, "/papers/library");
  const parsed = paperAnnotationSchema.parse({
    libraryItemId: getString(formData, "libraryItemId"),
    content: getString(formData, "content"),
    quote: getString(formData, "quote") || undefined,
  });

  const item = await getLibraryItemForUser(parsed.libraryItemId, user.id, redirectTarget);

  await prisma.paperAnnotation.create({
    data: {
      libraryItemId: item.id,
      userId: user.id,
      content: parsed.content,
      quote: parsed.quote ?? null,
    },
  });

  revalidatePath("/papers/library");
  redirectWithFeedback(redirectTarget, "notice", "annotated");
}

export async function deletePaperAnnotationAction(formData: FormData) {
  const user = await requireUser();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData, "/papers/library");
  const parsed = paperAnnotationDeleteSchema.parse({
    annotationId: getString(formData, "annotationId"),
  });

  const annotation = await prisma.paperAnnotation.findFirst({
    where: {
      id: parsed.annotationId,
      userId: user.id,
    },
  });

  if (!annotation) {
    redirectWithFeedback(redirectTarget, "error", "annotation-not-found");
  }

  await prisma.paperAnnotation.delete({ where: { id: annotation.id } });

  revalidatePath("/papers/library");
  redirectWithFeedback(redirectTarget, "notice", "annotation-deleted");
}
