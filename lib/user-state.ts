import { UserStatus } from "@prisma/client";

export function isUserMuted(mutedUntil: Date | string | null | undefined) {
  if (!mutedUntil) {
    return false;
  }

  return new Date(mutedUntil) > new Date();
}

export function formatUserStatus(status: UserStatus | string) {
  switch (status) {
    case UserStatus.ACTIVE:
    case "ACTIVE":
      return "正常";
    case UserStatus.SUSPENDED:
    case "SUSPENDED":
      return "已暂停";
    case UserStatus.DELETED:
    case "DELETED":
      return "已删除";
    default:
      return String(status);
  }
}

export function formatUserRole(role: string) {
  return role === "ADMIN" ? "管理员" : "读者";
}
