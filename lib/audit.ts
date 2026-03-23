import "server-only";
import type { Prisma } from "@prisma/client";
import {
  formatCommentStatusLabel,
  formatModerationRuleModeLabel,
  formatModerationRuleSeverityLabel,
  formatYesNoLabel,
} from "@/lib/ui-labels";
import { formatUserRole, formatUserStatus } from "@/lib/user-state";
import { formatDate } from "@/lib/utils";

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
  POST_CATEGORY_RENAMED: "post.category.renamed",
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
      return "角色变更";
    case ADMIN_AUDIT_ACTIONS.USER_MUTED:
      return "评论禁言";
    case ADMIN_AUDIT_ACTIONS.USER_UNMUTED:
      return "解除禁言";
    case ADMIN_AUDIT_ACTIONS.USER_SUSPENDED:
      return "账号暂停";
    case ADMIN_AUDIT_ACTIONS.USER_RESTORED:
      return "账号恢复";
    case ADMIN_AUDIT_ACTIONS.USER_DELETED:
      return "软删除";
    case ADMIN_AUDIT_ACTIONS.USER_SESSIONS_REVOKED:
      return "会话撤销";
    case ADMIN_AUDIT_ACTIONS.USER_2FA_ENABLED:
      return "启用 2FA";
    case ADMIN_AUDIT_ACTIONS.USER_2FA_DISABLED:
      return "关闭 2FA";
    case ADMIN_AUDIT_ACTIONS.POST_CATEGORY_RENAMED:
      return "文章分类调整";
    case ADMIN_AUDIT_ACTIONS.SERIES_SAVED:
      return "内容系列保存";
    case ADMIN_AUDIT_ACTIONS.SERIES_DELETED:
      return "内容系列删除";
    case ADMIN_AUDIT_ACTIONS.COMMENT_MODERATED:
      return "评论审核";
    case ADMIN_AUDIT_ACTIONS.COMMENT_DELETED:
      return "评论删除";
    case ADMIN_AUDIT_ACTIONS.COMMENT_RULE_SAVED:
      return "评论规则保存";
    case ADMIN_AUDIT_ACTIONS.COMMENT_RULE_DELETED:
      return "评论规则删除";
    case ADMIN_AUDIT_ACTIONS.POST_REVISION_RESTORED:
      return "文章版本恢复";
    case ADMIN_AUDIT_ACTIONS.NOTE_REVISION_RESTORED:
      return "笔记版本恢复";
    default:
      return action;
  }
}

export function formatAdminAuditMetadataKey(key: string) {
  switch (key) {
    case "previousRole":
      return "之前角色";
    case "nextRole":
      return "之后角色";
    case "targetEmail":
      return "目标邮箱";
    case "days":
      return "禁言天数";
    case "reason":
      return "原因";
    case "mutedUntil":
      return "禁言截止";
    case "previousMutedUntil":
      return "原禁言截止";
    case "previousMuteReason":
      return "原禁言原因";
    case "previousStatus":
      return "之前状态";
    case "nextStatus":
      return "之后状态";
    case "previousReason":
      return "原状态原因";
    case "revokedSessions":
      return "撤销会话数";
    case "email":
      return "邮箱";
    case "ruleId":
      return "规则 ID";
    case "term":
      return "词条";
    case "normalizedTerm":
      return "标准化词条";
    case "mode":
      return "模式";
    case "severity":
      return "级别";
    case "enabled":
      return "已启用";
    case "previousCategory":
      return "原分类";
    case "nextCategory":
      return "新分类";
    case "normalizedPreviousCategory":
      return "标准化原分类";
    case "normalizedNextCategory":
      return "标准化新分类";
    case "updatedPostCount":
      return "更新文章数";
    case "updatedSubscriberCount":
      return "更新订阅者数";
    case "mergeIntoExistingCategory":
      return "是否合并到已有分类";
    case "seriesId":
      return "系列 ID";
    case "slug":
      return "Slug";
    case "previousSlug":
      return "原 Slug";
    case "postId":
      return "文章 ID";
    case "postTitle":
      return "文章标题";
    case "commentId":
      return "评论 ID";
    case "deletedStatus":
      return "删除前状态";
    case "moderationNotes":
      return "审核说明";
    case "moderationMatches":
      return "命中项";
    case "revisionId":
      return "版本 ID";
    case "revisionVersion":
      return "版本号";
    case "restoredSlug":
      return "恢复后 Slug";
    case "noteId":
      return "笔记 ID";
    default:
      return key;
  }
}

function formatPossibleDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return formatDate(parsed, "yyyy-MM-dd HH:mm");
}

function formatMetadataPrimitive(key: string, value: string | number | boolean) {
  if (typeof value === "boolean") {
    return formatYesNoLabel(value);
  }

  if (typeof value === "number") {
    return String(value);
  }

  switch (key) {
    case "previousRole":
    case "nextRole":
      return formatUserRole(value);
    case "previousStatus":
    case "nextStatus":
    case "deletedStatus": {
      const normalized = value.trim().toUpperCase();

      if (normalized === "PENDING" || normalized === "APPROVED" || normalized === "REJECTED") {
        return formatCommentStatusLabel(value);
      }

      return formatUserStatus(value);
    }
    case "mode":
      return formatModerationRuleModeLabel(value);
    case "severity":
      return formatModerationRuleSeverityLabel(value);
    case "enabled":
      return formatYesNoLabel(value === "true");
    default:
      return formatPossibleDate(value);
  }
}

export function formatAdminAuditMetadataValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "无";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatAdminAuditMetadataValue(key, item))
      .filter(Boolean)
      .join("、");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return formatMetadataPrimitive(key, value);
  }

  return String(value);
}
