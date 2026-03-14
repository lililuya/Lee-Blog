export const userManagementNoticeMap: Record<string, string> = {
  promoted: "User promoted to admin.",
  demoted: "User downgraded to reader.",
  muted: "User has been muted from commenting.",
  unmuted: "User mute has been removed.",
  suspended: "User sign-in access has been suspended.",
  restored: "User account has been restored to active status.",
  deleted: "User has been soft-deleted. Existing relations remain for audit purposes.",
  "sessions-revoked": "All active sessions for this user have been revoked.",
};

export const userManagementErrorMap: Record<string, string> = {
  "user-not-found": "The target user no longer exists.",
  "last-admin": "You cannot operate on the last active admin account.",
  "self-role": "You cannot change your own role.",
  "self-mute": "You cannot mute your own account.",
  "self-suspend": "You cannot suspend your own account.",
  "self-delete": "You cannot delete your own account.",
  "self-revoke": "You cannot revoke the current admin session from this screen.",
  "deleted-user": "Deleted accounts cannot have their role changed.",
  "user-not-active": "Only active accounts can receive a comment mute.",
};