"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSessionToken, requireUser, verifyPassword } from "@/lib/auth";
import { ADMIN_AUDIT_ACTIONS, buildAdminAuditLogData } from "@/lib/audit";
import { isAuthFlowError } from "@/lib/auth-errors";
import { changePasswordWithCredentials } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";
import { generateTwoFactorSecret, verifyTwoFactorToken } from "@/lib/two-factor";
import { isDatabaseConfigured } from "@/lib/utils";
import { deleteMediaAsset, storeMediaBufferUpload } from "@/lib/media-storage";
import {
  commentNotificationSettingsSchema,
  disableTwoFactorSchema,
  twoFactorTokenSchema,
} from "@/lib/validators";
import { avatarMaxUploadBytes } from "@/lib/upload-config";
const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function ensureAccountStorageAvailable() {
  if (!isDatabaseConfigured()) {
    redirect("/account?error=database");
  }
}

function ensureAccountSecurityAvailable() {
  if (!isDatabaseConfigured()) {
    redirect("/account?password=database");
  }
}

function ensureAccountTwoFactorAvailable() {
  if (!isDatabaseConfigured()) {
    redirect("/account?security=database");
  }
}

function ensureAccountNotificationSettingsAvailable() {
  if (!isDatabaseConfigured()) {
    redirect("/account?updates=database");
  }
}

function ensureAccountCommentNotificationSettingsAvailable() {
  if (!isDatabaseConfigured()) {
    redirect("/account?comments=database");
  }
}

function ensureAdminAccount(user: { role: UserRole }) {
  if (user.role !== UserRole.ADMIN) {
    redirect("/account?security=admin-only");
  }
}

function revalidateAvatarSurfaces() {
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

export async function uploadAvatarAction(formData: FormData) {
  const user = await requireUser();
  ensureAccountStorageAvailable();

  const avatar = formData.get("avatar");

  if (!(avatar instanceof File) || avatar.size === 0) {
    redirect("/account?error=no-file");
  }

  if (avatar.size > avatarMaxUploadBytes) {
    redirect("/account?error=file-too-large");
  }

  const extension = AVATAR_EXTENSIONS[avatar.type];

  if (!extension) {
    redirect("/account?error=invalid-type");
  }

  const previousUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  const uploadedAvatar = await storeMediaBufferUpload({
    buffer: Buffer.from(await avatar.arrayBuffer()),
    contentType: avatar.type,
    directory: "avatars",
    extension,
    fileNamePrefix: user.id,
  });

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: uploadedAvatar.url },
    });
  } catch (error) {
    await deleteMediaAsset(uploadedAvatar);
    throw error;
  }

  await deleteMediaAsset(previousUser?.avatarUrl);

  revalidateAvatarSurfaces();
  redirect("/account?saved=1");
}

export async function removeAvatarAction() {
  const user = await requireUser();
  ensureAccountStorageAvailable();

  const previousUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  if (!previousUser?.avatarUrl) {
    redirect("/account?removed=1");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  await deleteMediaAsset(previousUser.avatarUrl);

  revalidateAvatarSurfaces();
  redirect("/account?removed=1");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  ensureAccountSecurityAvailable();

  try {
    await changePasswordWithCredentials({
      userId: user.id,
      currentSessionToken: await getCurrentSessionToken(),
      payload: {
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
      },
    });
  } catch (error) {
    if (isAuthFlowError(error)) {
      if (error.code === "PASSWORD_CHANGE_CURRENT_INCORRECT") {
        redirect("/account?password=invalid-current");
      }

      if (error.code === "PASSWORD_CHANGE_UNCHANGED") {
        redirect("/account?password=same");
      }

      if (error.code === "PASSWORD_CHANGE_INPUT_INVALID") {
        redirect("/account?password=invalid");
      }

      redirect("/account?password=error");
    }

    throw error;
  }

  revalidatePath("/account");
  redirect("/account?password=updated");
}

export async function beginTwoFactorSetupAction() {
  const user = await requireUser();
  ensureAccountTwoFactorAvailable();
  ensureAdminAccount(user);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorTempSecret: generateTwoFactorSecret(),
    },
  });

  revalidatePath("/account");
  redirect("/account?security=setup");
}

export async function cancelTwoFactorSetupAction() {
  const user = await requireUser();
  ensureAccountTwoFactorAvailable();
  ensureAdminAccount(user);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorTempSecret: null,
    },
  });

  revalidatePath("/account");
  redirect("/account?security=setup-cancelled");
}

export async function confirmTwoFactorSetupAction(formData: FormData) {
  const user = await requireUser();
  ensureAccountTwoFactorAvailable();
  ensureAdminAccount(user);

  let parsed: ReturnType<typeof twoFactorTokenSchema.parse>;

  try {
    parsed = twoFactorTokenSchema.parse({
      code: String(formData.get("code") ?? ""),
    });
  } catch {
    redirect("/account?security=invalid-code");
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      twoFactorTempSecret: true,
      twoFactorEnabled: true,
    },
  });

  if (!account?.twoFactorTempSecret) {
    redirect("/account?security=setup-missing");
  }

  if (!verifyTwoFactorToken(account.twoFactorTempSecret, parsed.code)) {
    redirect("/account?security=invalid-code");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: account.twoFactorTempSecret,
        twoFactorTempSecret: null,
        twoFactorEnabledAt: new Date(),
      },
    }),
    prisma.twoFactorChallenge.deleteMany({
      where: {
        userId: user.id,
      },
    }),
    prisma.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_2FA_ENABLED,
        summary: `已为 ${user.email} 启用 2FA。`,
        actorId: user.id,
        targetUserId: user.id,
        metadata: {
          email: account.email,
        },
      }),
    }),
  ]);

  revalidatePath("/account");
  redirect("/account?security=enabled");
}

export async function disableTwoFactorAction(formData: FormData) {
  const user = await requireUser();
  ensureAccountTwoFactorAvailable();
  ensureAdminAccount(user);

  let parsed: ReturnType<typeof disableTwoFactorSchema.parse>;

  try {
    parsed = disableTwoFactorSchema.parse({
      currentPassword: String(formData.get("currentPassword") ?? ""),
    });
  } catch {
    redirect("/account?security=invalid-password");
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      twoFactorEnabled: true,
    },
  });

  if (!account?.twoFactorEnabled) {
    redirect("/account?security=disabled");
  }

  const passwordMatches = await verifyPassword(parsed.currentPassword, account.passwordHash);

  if (!passwordMatches) {
    redirect("/account?security=invalid-password");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null,
        twoFactorEnabledAt: null,
      },
    }),
    prisma.twoFactorChallenge.deleteMany({
      where: {
        userId: user.id,
      },
    }),
    prisma.adminAuditLog.create({
      data: buildAdminAuditLogData({
        action: ADMIN_AUDIT_ACTIONS.USER_2FA_DISABLED,
        summary: `已为 ${user.email} 关闭 2FA。`,
        actorId: user.id,
        targetUserId: user.id,
        metadata: {
          email: account.email,
        },
      }),
    }),
  ]);

  revalidatePath("/account");
  redirect("/account?security=disabled");
}

export async function updateEmailPostNotificationsAction(formData: FormData) {
  const user = await requireUser();
  ensureAccountNotificationSettingsAvailable();

  const nextValue = String(formData.get("enabled") ?? "").trim() === "true";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailPostNotifications: nextValue,
    },
  });

  revalidatePath("/account");
  redirect(`/account?updates=${nextValue ? "enabled" : "disabled"}`);
}

export async function updateCommentNotificationSettingsAction(formData: FormData) {
  const user = await requireUser();
  ensureAccountCommentNotificationSettingsAvailable();

  const parsed = commentNotificationSettingsSchema.parse({
    emailCommentNotifications: formData.get("emailCommentNotifications") === "on",
    inAppCommentNotifications: formData.get("inAppCommentNotifications") === "on",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailCommentNotifications: parsed.emailCommentNotifications,
      inAppCommentNotifications: parsed.inAppCommentNotifications,
    },
  });

  revalidatePath("/account");
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
  redirect("/account?comments=updated");
}
