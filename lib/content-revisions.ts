import "server-only";
import type { Prisma } from "@prisma/client";

type RevisionTx = Prisma.TransactionClient;

export async function snapshotPostRevision(
  tx: RevisionTx,
  input: {
    postId: string;
    actorId?: string | null;
  },
) {
  const [post, latestRevision] = await Promise.all([
    tx.post.findUnique({
      where: { id: input.postId },
    }),
    tx.postRevision.findFirst({
      where: { postId: input.postId },
      select: { version: true },
      orderBy: { version: "desc" },
    }),
  ]);

  if (!post) {
    return null;
  }

  return tx.postRevision.create({
    data: {
      postId: post.id,
      actorId: input.actorId ?? null,
      version: (latestRevision?.version ?? 0) + 1,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      language: post.language,
      tags: post.tags,
      status: post.status,
      pinned: post.pinned,
      featured: post.featured,
      coverImageUrl: post.coverImageUrl,
      readTimeMinutes: post.readTimeMinutes,
      seriesId: post.seriesId,
      seriesOrder: post.seriesOrder,
      translationOfId: post.translationOfId,
      publishedAt: post.publishedAt,
    },
  });
}

export async function snapshotNoteRevision(
  tx: RevisionTx,
  input: {
    noteId: string;
    actorId?: string | null;
  },
) {
  const [note, latestRevision] = await Promise.all([
    tx.note.findUnique({
      where: { id: input.noteId },
    }),
    tx.noteRevision.findFirst({
      where: { noteId: input.noteId },
      select: { version: true },
      orderBy: { version: "desc" },
    }),
  ]);

  if (!note) {
    return null;
  }

  return tx.noteRevision.create({
    data: {
      noteId: note.id,
      actorId: input.actorId ?? null,
      version: (latestRevision?.version ?? 0) + 1,
      title: note.title,
      slug: note.slug,
      summary: note.summary,
      content: note.content,
      noteType: note.noteType,
      tags: note.tags,
      status: note.status,
      featured: note.featured,
      seriesId: note.seriesId,
      seriesOrder: note.seriesOrder,
      publishedAt: note.publishedAt,
    },
  });
}
