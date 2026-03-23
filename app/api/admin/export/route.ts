import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildFilename(kind: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `blog-export-${kind}-${date}.json`;
}

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  emailVerificationRequired: true,
  emailPostNotifications: true,
  emailCommentNotifications: true,
  inAppCommentNotifications: true,
  mutedUntil: true,
  muteReason: true,
  statusReason: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

const basicUserIdentitySelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

async function buildFullExport() {
  const [
    siteProfile,
    series,
    posts,
    postRevisions,
    notes,
    noteRevisions,
    journalEntries,
    galleryAlbums,
    galleryImages,
    weeklyDigests,
    comments,
    commentModerationRules,
    users,
    adminAuditLogs,
    userNotifications,
    emailSubscribers,
    llmProviders,
    paperTopics,
    dailyPaperEntries,
    paperLibraryItems,
    paperAnnotations,
    siteVisitors,
    pageViews,
    searchQueryLogs,
    ragKnowledgeChunks,
    ragQueryLogs,
    authAttempts,
  ] = await Promise.all([
    prisma.siteProfile.findUnique({ where: { id: "main" } }),
    prisma.contentSeries.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.post.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.postRevision.findMany({
      orderBy: [{ postId: "asc" }, { version: "desc" }],
    }),
    prisma.note.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.noteRevision.findMany({
      orderBy: [{ noteId: "asc" }, { version: "desc" }],
    }),
    prisma.journalEntry.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.galleryAlbum.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.galleryImage.findMany({
      orderBy: [{ albumId: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.weeklyDigest.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.comment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.commentModerationRule.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.userNotification.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.emailSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.llmProvider.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.paperTopic.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.dailyPaperEntry.findMany({
      orderBy: [{ digestDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.paperLibraryItem.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.paperAnnotation.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.siteVisitor.findMany({ orderBy: { lastSeenAt: "desc" } }),
    prisma.pageView.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.searchQueryLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.ragKnowledgeChunk.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.ragQueryLog.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.authAttempt.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return {
    kind: "full" as const,
    exportedAt: new Date().toISOString(),
    excludedSensitiveData: [
      "User.passwordHash",
      "User.twoFactorSecret",
      "User.twoFactorTempSecret",
      "Session",
      "TwoFactorChallenge",
      "EmailVerificationToken",
      "PasswordResetToken",
    ],
    siteProfile,
    series,
    posts,
    postRevisions,
    notes,
    noteRevisions,
    journalEntries,
    galleryAlbums,
    galleryImages,
    weeklyDigests,
    comments,
    commentModerationRules,
    users,
    adminAuditLogs,
    userNotifications,
    emailSubscribers,
    llmProviders,
    paperTopics,
    dailyPaperEntries,
    paperLibraryItems,
    paperAnnotations,
    siteVisitors,
    pageViews,
    searchQueryLogs,
    ragKnowledgeChunks,
    ragQueryLogs,
    authAttempts,
  };
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const requestedKind = (url.searchParams.get("kind") ?? "full").trim().toLowerCase();
  const kind = ["full", "posts", "comments", "users", "paper-library"].includes(requestedKind)
    ? requestedKind
    : "full";

  let payload: Awaited<ReturnType<typeof buildFullExport>> | Record<string, unknown>;

  if (kind === "posts") {
    payload = {
      kind,
      exportedAt: new Date().toISOString(),
      posts: await prisma.post.findMany({
        include: {
          author: {
            select: basicUserIdentitySelect,
          },
          series: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    };
  } else if (kind === "comments") {
    payload = {
      kind,
      exportedAt: new Date().toISOString(),
      comments: await prisma.comment.findMany({
        include: {
          author: {
            select: basicUserIdentitySelect,
          },
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    };
  } else if (kind === "users") {
    payload = {
      kind,
      exportedAt: new Date().toISOString(),
      users: await prisma.user.findMany({
        select: safeUserSelect,
        orderBy: { createdAt: "desc" },
      }),
    };
  } else if (kind === "paper-library") {
    payload = {
      kind,
      exportedAt: new Date().toISOString(),
      items: await prisma.paperLibraryItem.findMany({
        include: {
          user: {
            select: basicUserIdentitySelect,
          },
          annotations: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    };
  } else {
    payload = await buildFullExport();
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildFilename(kind)}"`,
      "Cache-Control": "no-store",
    },
  });
}
