import { JournalStatus, PostStatus, type Prisma } from "@prisma/client";

export function getPublishingCutoff() {
  return new Date();
}

export function isLivePublishedAt(value: Date | string | null | undefined, cutoff = new Date()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= cutoff;
}

export function isPublicPostLike(input: {
  status: PostStatus | string;
  publishedAt: Date | string | null | undefined;
}) {
  return input.status === PostStatus.PUBLISHED || input.status === "PUBLISHED"
    ? isLivePublishedAt(input.publishedAt)
    : false;
}

export function isPublicJournalLike(input: {
  status: JournalStatus | string;
  publishedAt: Date | string | null | undefined;
}) {
  return input.status === JournalStatus.PUBLISHED || input.status === "PUBLISHED"
    ? isLivePublishedAt(input.publishedAt)
    : false;
}

export function publicPostWhere(cutoff = new Date()): Prisma.PostWhereInput {
  return {
    status: PostStatus.PUBLISHED,
    publishedAt: {
      lte: cutoff,
    },
  };
}

export function publicNoteWhere(cutoff = new Date()): Prisma.NoteWhereInput {
  return {
    status: PostStatus.PUBLISHED,
    publishedAt: {
      lte: cutoff,
    },
  };
}

export function publicJournalWhere(cutoff = new Date()): Prisma.JournalEntryWhereInput {
  return {
    status: JournalStatus.PUBLISHED,
    publishedAt: {
      lte: cutoff,
    },
  };
}

export function publicWeeklyDigestWhere(cutoff = new Date()): Prisma.WeeklyDigestWhereInput {
  return {
    publishedAt: {
      lte: cutoff,
    },
  };
}
