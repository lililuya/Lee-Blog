import "server-only";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole, UserStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TWO_FACTOR_CHALLENGE_COOKIE_NAME } from "@/lib/two-factor";
import { isDatabaseConfigured } from "@/lib/utils";

export const SESSION_COOKIE_NAME = "scholar_blog_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  emailVerificationRequired: boolean;
  emailPostNotifications: boolean;
  mutedUntil: Date | null;
  muteReason: string | null;
} | null;

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSessionForUser(userId: string) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      sessionToken,
      expiresAt,
      userId,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { sessionToken } }).catch(() => null);
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (session.user.status !== UserStatus.ACTIVE) {
    await prisma.session.deleteMany({ where: { userId: session.user.id } }).catch(() => null);
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
    role: session.user.role,
    status: session.user.status,
    emailVerifiedAt: session.user.emailVerifiedAt,
    emailVerificationRequired: session.user.emailVerificationRequired,
    emailPostNotifications: session.user.emailPostNotifications,
    mutedUntil: session.user.mutedUntil,
    muteReason: session.user.muteReason,
  };
}

export async function destroyCurrentSession() {
  if (!isDatabaseConfigured()) {
    return;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(TWO_FACTOR_CHALLENGE_COOKIE_NAME);
}

export async function destroyAllSessionsForUser(userId: string) {
  if (!isDatabaseConfigured()) {
    return;
  }

  await prisma.session.deleteMany({ where: { userId } });
}

export async function destroyOtherSessionsForUser(userId: string, currentSessionToken: string | null) {
  if (!isDatabaseConfigured()) {
    return;
  }

  if (!currentSessionToken) {
    await prisma.session.deleteMany({ where: { userId } });
    return;
  }

  await prisma.session.deleteMany({
    where: {
      userId,
      sessionToken: { not: currentSessionToken },
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== UserRole.ADMIN) {
    redirect("/login");
  }

  return user;
}
