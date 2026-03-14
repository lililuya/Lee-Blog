import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSessionForUser,
  destroyCurrentSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/utils";
import { loginSchema, registerSchema } from "@/lib/validators";

function getAccountStateMessage(status: UserStatus, reason: string | null) {
  if (status === UserStatus.SUSPENDED) {
    return reason ? `This account has been suspended: ${reason}` : "This account has been suspended.";
  }

  if (status === UserStatus.DELETED) {
    return "This account has been deleted and can no longer sign in.";
  }

  return null;
}

export async function loginWithCredentials(payload: unknown) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const parsed = loginSchema.parse(payload);
  const email = parsed.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error("User not found.");
  }

  const isPasswordValid = await verifyPassword(parsed.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  const accountStateMessage = getAccountStateMessage(user.status, user.statusReason);

  if (accountStateMessage) {
    throw new Error(accountStateMessage);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSessionForUser(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function registerWithCredentials(payload: unknown) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const parsed = registerSchema.parse(payload);
  const email = parsed.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new Error("This email is already registered.");
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email,
      passwordHash: await hashPassword(parsed.password),
      role: UserRole.READER,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSessionForUser(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export async function logoutSession() {
  await destroyCurrentSession();
}