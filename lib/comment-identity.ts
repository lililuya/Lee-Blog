import { UserRole } from "@prisma/client";

type CommentIdentitySource = {
  guestName?: string | null;
  guestEmail?: string | null;
  author?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: UserRole | string | null;
  } | null;
};

export type CommentAuthorIdentity = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  kind: "ADMIN" | "MEMBER" | "GUEST";
  isAdmin: boolean;
  isGuest: boolean;
};

export function resolveCommentAuthorIdentity(
  input: CommentIdentitySource,
): CommentAuthorIdentity {
  const authorName = input.author?.name?.trim();
  const guestName = input.guestName?.trim();
  const authorEmail = input.author?.email?.trim().toLowerCase();
  const guestEmail = input.guestEmail?.trim().toLowerCase();
  const kind =
    input.author?.role === UserRole.ADMIN || input.author?.role === "ADMIN"
      ? "ADMIN"
      : input.author
        ? "MEMBER"
        : "GUEST";

  return {
    name: authorName || guestName || "Guest Reader",
    email: authorEmail || guestEmail || null,
    avatarUrl: input.author?.avatarUrl ?? null,
    kind,
    isAdmin: kind === "ADMIN",
    isGuest: kind === "GUEST",
  };
}
