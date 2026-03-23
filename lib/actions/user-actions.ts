"use server";

import { UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { formatUserRole } from "@/lib/user-state";
import { isDatabaseConfigured } from "@/lib/utils";
import {
  userLifecycleSchema,
  userMuteSchema,
  userRoleSchema,
  userStatusSchema,
} from "@/lib/validators";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
}

function getRedirectTarget(formData: FormData, fallback = "/admin/users") {
  const redirectTo = getString(formData, "redirectTo");
  return redirectTo.startsWith("/admin") ? redirectTo : fallback;
}

function redirectWithFeedback(target: string, type: "notice" | "error", code: string): never {
  const url = new URL(target, "http://localhost");
  url.searchParams.set(type, code);
  redirect(`${url.pathname}${url.search}`);
}

async function getTargetUser(userId: string, redirectTarget: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    redirectWithFeedback(redirectTarget, "error", "user-not-found");
  }

  return user;
}

async function ensureOtherActiveAdminExists(targetUserId: string, redirectTarget: string) {
  const remainingActiveAdmins = await prisma.user.count({
    where: {
      id: { not: targetUserId },
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  if (remainingActiveAdmins === 0) {
    redirectWithFeedback(redirectTarget, "error", "last-admin");
  }
}

function revalidateAdminSurfaces(userId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");

  if (userId) {
    revalidatePath(`/admin/users/${userId}`);
  }
}

export async function changeUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userRoleSchema.parse({
    userId: getString(formData, "userId"),
    role: getString(formData, "role"),
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  if (targetUser.id === admin.id) {
    redirectWithFeedback(redirectTarget, "error", "self-role");
  }

  if (targetUser.status === UserStatus.DELETED) {
    redirectWithFeedback(redirectTarget, "error", "deleted-user");
  }

  if (targetUser.role === UserRole.ADMIN && parsed.role !== UserRole.ADMIN) {
    await ensureOtherActiveAdminExists(targetUser.id, redirectTarget);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: { role: parsed.role },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_ROLE_CHANGED,
        summary: `已将 ${targetUser.email} 的角色从 ${formatUserRole(targetUser.role)} 调整为 ${formatUserRole(parsed.role)}。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          previousRole: targetUser.role,
          nextRole: parsed.role,
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(
    redirectTarget,
    "notice",
    parsed.role === UserRole.ADMIN ? "promoted" : "demoted",
  );
}

export async function muteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userMuteSchema.parse({
    userId: getString(formData, "userId"),
    days: getString(formData, "days"),
    reason: getString(formData, "reason") || undefined,
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  if (targetUser.id === admin.id) {
    redirectWithFeedback(redirectTarget, "error", "self-mute");
  }

  if (targetUser.status !== UserStatus.ACTIVE) {
    redirectWithFeedback(redirectTarget, "error", "user-not-active");
  }

  const mutedUntil = new Date();
  mutedUntil.setDate(mutedUntil.getDate() + parsed.days);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        mutedUntil,
        muteReason: parsed.reason ?? null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_MUTED,
        summary: `已将 ${targetUser.email} 的评论权限禁言 ${parsed.days} 天。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          days: parsed.days,
          reason: parsed.reason ?? null,
          mutedUntil: mutedUntil.toISOString(),
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(redirectTarget, "notice", "muted");
}

export async function unmuteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userLifecycleSchema.parse({
    userId: getString(formData, "userId"),
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.userId },
      data: {
        mutedUntil: null,
        muteReason: null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_UNMUTED,
        summary: `已解除 ${targetUser.email} 的评论禁言。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          previousMutedUntil: targetUser.mutedUntil?.toISOString() ?? null,
          previousMuteReason: targetUser.muteReason,
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(redirectTarget, "notice", "unmuted");
}

export async function suspendUserAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userStatusSchema.parse({
    userId: getString(formData, "userId"),
    status: UserStatus.SUSPENDED,
    reason: getString(formData, "reason") || undefined,
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  if (targetUser.id === admin.id) {
    redirectWithFeedback(redirectTarget, "error", "self-suspend");
  }

  if (targetUser.role === UserRole.ADMIN) {
    await ensureOtherActiveAdminExists(targetUser.id, redirectTarget);
  }

  await prisma.$transaction(async (tx) => {
    const revokedSessions = await tx.session.deleteMany({ where: { userId: targetUser.id } });

    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        status: parsed.status,
        statusReason: parsed.reason ?? null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_SUSPENDED,
        summary: `已暂停 ${targetUser.email} 的登录权限。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          previousStatus: targetUser.status,
          nextStatus: parsed.status,
          reason: parsed.reason ?? null,
          revokedSessions: revokedSessions.count,
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(redirectTarget, "notice", "suspended");
}

export async function restoreUserAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userLifecycleSchema.parse({
    userId: getString(formData, "userId"),
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: parsed.userId },
      data: {
        status: UserStatus.ACTIVE,
        statusReason: null,
        deletedAt: null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_RESTORED,
        summary: `已将 ${targetUser.email} 恢复为正常状态。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          previousStatus: targetUser.status,
          previousReason: targetUser.statusReason,
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(redirectTarget, "notice", "restored");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userLifecycleSchema.parse({
    userId: getString(formData, "userId"),
    reason: getString(formData, "reason") || undefined,
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  if (targetUser.id === admin.id) {
    redirectWithFeedback(redirectTarget, "error", "self-delete");
  }

  if (targetUser.role === UserRole.ADMIN) {
    await ensureOtherActiveAdminExists(targetUser.id, redirectTarget);
  }

  await prisma.$transaction(async (tx) => {
    const revokedSessions = await tx.session.deleteMany({ where: { userId: targetUser.id } });

    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        statusReason: parsed.reason ?? "Deleted by admin",
        mutedUntil: null,
        muteReason: null,
      },
    });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_DELETED,
        summary: `已软删除 ${targetUser.email}。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          previousStatus: targetUser.status,
          reason: parsed.reason ?? "Deleted by admin",
          revokedSessions: revokedSessions.count,
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(redirectTarget, "notice", "deleted");
}

export async function revokeUserSessionsAction(formData: FormData) {
  const admin = await requireAdmin();
  ensureDatabase();

  const redirectTarget = getRedirectTarget(formData);
  const parsed = userLifecycleSchema.parse({
    userId: getString(formData, "userId"),
    reason: getString(formData, "reason") || undefined,
  });

  const targetUser = await getTargetUser(parsed.userId, redirectTarget);

  if (targetUser.id === admin.id) {
    redirectWithFeedback(redirectTarget, "error", "self-revoke");
  }

  await prisma.$transaction(async (tx) => {
    const revokedSessions = await tx.session.deleteMany({ where: { userId: targetUser.id } });

    await tx.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED,
        summary: `已撤销 ${targetUser.email} 的全部会话。`,
        actorId: admin.id,
        targetUserId: targetUser.id,
        metadata: {
          reason: parsed.reason ?? null,
          revokedSessions: revokedSessions.count,
          targetEmail: targetUser.email,
        },
      }),
    });
  });

  revalidateAdminSurfaces(targetUser.id);
  redirectWithFeedback(redirectTarget, "notice", "sessions-revoked");
}
