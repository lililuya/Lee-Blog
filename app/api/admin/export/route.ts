import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildFilename(kind: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `blog-export-${kind}-${date}.json`;
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

  const payload =
    kind === "posts"
      ? {
          kind,
          exportedAt: new Date().toISOString(),
          posts: await prisma.post.findMany({
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
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
        }
      : kind === "comments"
        ? {
            kind,
            exportedAt: new Date().toISOString(),
            comments: await prisma.comment.findMany({
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
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
          }
        : kind === "users"
          ? {
              kind,
              exportedAt: new Date().toISOString(),
              users: await prisma.user.findMany({
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  role: true,
                  status: true,
                  emailVerifiedAt: true,
                  emailVerificationRequired: true,
                  emailPostNotifications: true,
                  mutedUntil: true,
                  muteReason: true,
                  statusReason: true,
                  lastLoginAt: true,
                  createdAt: true,
                  updatedAt: true,
                },
                orderBy: { createdAt: "desc" },
              }),
            }
          : kind === "paper-library"
            ? {
                kind,
                exportedAt: new Date().toISOString(),
                items: await prisma.paperLibraryItem.findMany({
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                    annotations: {
                      orderBy: { createdAt: "asc" },
                    },
                  },
                  orderBy: { updatedAt: "desc" },
                }),
              }
            : {
                kind: "full",
                exportedAt: new Date().toISOString(),
                series: await prisma.contentSeries.findMany({
                  orderBy: { updatedAt: "desc" },
                }),
                posts: await prisma.post.findMany({
                  include: {
                    author: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                  orderBy: { updatedAt: "desc" },
                }),
                notes: await prisma.note.findMany({
                  include: {
                    author: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                  orderBy: { updatedAt: "desc" },
                }),
                weeklyDigests: await prisma.weeklyDigest.findMany({
                  orderBy: { updatedAt: "desc" },
                }),
                comments: await prisma.comment.findMany({
                  orderBy: { createdAt: "desc" },
                }),
                users: await prisma.user.findMany({
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                    role: true,
                    status: true,
                    emailVerifiedAt: true,
                    emailVerificationRequired: true,
                    emailPostNotifications: true,
                    mutedUntil: true,
                    muteReason: true,
                    statusReason: true,
                    lastLoginAt: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                  orderBy: { createdAt: "desc" },
                }),
                paperLibraryItems: await prisma.paperLibraryItem.findMany({
                  include: {
                    annotations: true,
                  },
                  orderBy: { updatedAt: "desc" },
                }),
              };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildFilename(kind)}"`,
      "Cache-Control": "no-store",
    },
  });
}
