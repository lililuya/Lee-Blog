"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAllUserNotificationsRead, markUserNotificationRead } from "@/lib/user-notifications";
import { notificationActionSchema } from "@/lib/validators";

function revalidateNotificationSurfaces() {
  revalidatePath("/account");
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
}

export async function markUserNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const parsed = notificationActionSchema.parse({
    notificationId: String(formData.get("notificationId") ?? ""),
  });

  await markUserNotificationRead(user.id, parsed.notificationId);
  revalidateNotificationSurfaces();
  redirect("/account/notifications?status=read");
}

export async function markAllUserNotificationsReadAction() {
  const user = await requireUser();

  await markAllUserNotificationsRead(user.id);
  revalidateNotificationSurfaces();
  redirect("/account/notifications?status=all-read");
}

export async function openUserNotificationAction(formData: FormData) {
  const user = await requireUser();
  const parsed = notificationActionSchema.parse({
    notificationId: String(formData.get("notificationId") ?? ""),
  });

  const notification = await prisma.userNotification.findFirst({
    where: {
      id: parsed.notificationId,
      userId: user.id,
    },
    select: {
      href: true,
      isRead: true,
    },
  });

  if (!notification) {
    redirect("/account/notifications");
  }

  if (!notification.isRead) {
    await markUserNotificationRead(user.id, parsed.notificationId);
  }

  revalidateNotificationSurfaces();
  redirect(notification.href || "/account/notifications");
}
