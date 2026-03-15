import "server-only";
import type { Prisma } from "@prisma/client";

export const ADMIN_AUDIT_ACTIONS = {
  USER_ROLE_CHANGED: "user.role.changed",
  USER_MUTED: "user.muted",
  USER_UNMUTED: "user.unmuted",
  USER_SUSPENDED: "user.suspended",
  USER_RESTORED: "user.restored",
  USER_DELETED: "user.deleted",
  USER_SESSIONS_REVOKED: "user.sessions.revoked",
  USER_2FA_ENABLED: "user.2fa.enabled",
  USER_2FA_DISABLED: "user.2fa.disabled",
  SERIES_SAVED: "series.saved",
  SERIES_DELETED: "series.deleted",
  COMMENT_MODERATED: "comment.moderated",
  COMMENT_DELETED: "comment.deleted",
  COMMENT_RULE_SAVED: "comment.rule.saved",
  COMMENT_RULE_DELETED: "comment.rule.deleted",
  POST_REVISION_RESTORED: "post.revision.restored",
  NOTE_REVISION_RESTORED: "note.revision.restored",
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

export type AdminAuditLogInput = {
  action: AdminAuditAction | string;
  summary: string;
  actorId?: string | null;
  targetUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export function buildAdminAuditLogData(
  input: AdminAuditLogInput,
): Prisma.AdminAuditLogUncheckedCreateInput {
  return {
    action: input.action,
    summary: input.summary,
    actorId: input.actorId ?? null,
    targetUserId: input.targetUserId ?? null,
    metadata: input.metadata,
  };
}

export function formatAdminAuditAction(action: string) {
  switch (action) {
    case ADMIN_AUDIT_ACTIONS.USER_ROLE_CHANGED:
      return "Role Change";
    case ADMIN_AUDIT_ACTIONS.USER_MUTED:
      return "Comment Mute";
    case ADMIN_AUDIT_ACTIONS.USER_UNMUTED:
      return "Comment Unmute";
    case ADMIN_AUDIT_ACTIONS.USER_SUSPENDED:
      return "Account Suspension";
    case ADMIN_AUDIT_ACTIONS.USER_RESTORED:
      return "Account Restore";
    case ADMIN_AUDIT_ACTIONS.USER_DELETED:
      return "Soft Delete";
    case ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED:
      return "Session Revocation";
    case ADMIN_AUDIT_ACTIONS.USER_2FA_ENABLED:
      return "2FA Enabled";
    case ADMIN_AUDIT_ACTIONS.USER_2FA_DISABLED:
      return "2FA Disabled";
    case ADMIN_AUDIT_ACTIONS.SERIES_SAVED:
      return "Series Saved";
    case ADMIN_AUDIT_ACTIONS.SERIES_DELETED:
      return "Series Deleted";
    case ADMIN_AUDIT_ACTIONS.COMMENT_MODERATED:
      return "Comment Moderation";
    case ADMIN_AUDIT_ACTIONS.COMMENT_DELETED:
      return "Comment Deletion";
    case ADMIN_AUDIT_ACTIONS.COMMENT_RULE_SAVED:
      return "Comment Rule Saved";
    case ADMIN_AUDIT_ACTIONS.COMMENT_RULE_DELETED:
      return "Comment Rule Deleted";
    case ADMIN_AUDIT_ACTIONS.POST_REVISION_RESTORED:
      return "Post Revision Restore";
    case ADMIN_AUDIT_ACTIONS.NOTE_REVISION_RESTORED:
      return "Note Revision Restore";
    default:
      return action;
  }
}
