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
      return "Active";
    case UserStatus.SUSPENDED:
    case "SUSPENDED":
      return "Suspended";
    case UserStatus.DELETED:
    case "DELETED":
      return "Deleted";
    default:
      return String(status);
  }
}

export function formatUserRole(role: string) {
  return role === "ADMIN" ? "Admin" : "Reader";
}