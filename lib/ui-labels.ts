import { CommentStatus, PostStatus } from "@prisma/client";

type SubscriberStatus = "active" | "pending" | "expired" | "unsubscribed";

export function formatPostStatusLabel(status: PostStatus | string | null | undefined) {
  const normalized = (status ?? "").trim().toUpperCase();

  switch (normalized) {
    case PostStatus.DRAFT:
      return "草稿";
    case PostStatus.PUBLISHED:
      return "已发布";
    case PostStatus.ARCHIVED:
      return "已归档";
    default:
      return status?.trim() || "未知状态";
  }
}

export function formatYesNoLabel(value: boolean) {
  return value ? "是" : "否";
}

export function formatEnabledDisabledLabel(value: boolean) {
  return value ? "已启用" : "已禁用";
}

export function formatCommentStatusLabel(status: CommentStatus | string | null | undefined) {
  const normalized = (status ?? "").trim().toUpperCase();

  switch (normalized) {
    case CommentStatus.PENDING:
      return "待审核";
    case CommentStatus.APPROVED:
      return "已通过";
    case CommentStatus.REJECTED:
      return "已拒绝";
    default:
      return status?.trim() || "未知状态";
  }
}

export function formatModerationRuleModeLabel(mode: string | null | undefined) {
  const normalized = (mode ?? "").trim().toUpperCase();

  switch (normalized) {
    case "ALLOW":
      return "放行豁免";
    case "BLOCK":
      return "拦截匹配";
    default:
      return mode?.trim() || "未知模式";
  }
}

export function formatModerationRuleSeverityLabel(severity: string | null | undefined) {
  const normalized = (severity ?? "").trim().toUpperCase();

  switch (normalized) {
    case "REVIEW":
      return "进入审核";
    case "REJECT":
      return "自动拒绝";
    default:
      return severity?.trim() || "未知级别";
  }
}

export function formatSessionValidityLabel(isValid: boolean) {
  return isValid ? "有效" : "已过期";
}

export function formatProviderAdapterLabel(adapter: string | null | undefined) {
  const normalized = (adapter ?? "").trim().toUpperCase();

  switch (normalized) {
    case "OPENAI_COMPATIBLE":
      return "OpenAI Compatible";
    case "ANTHROPIC":
      return "Anthropic";
    default:
      return adapter?.trim() || "未知适配器";
  }
}

export function formatSubscriberStatusLabel(status: SubscriberStatus) {
  switch (status) {
    case "active":
      return "已启用";
    case "pending":
      return "待确认";
    case "expired":
      return "已过期";
    case "unsubscribed":
      return "已退订";
    default:
      return status;
  }
}

export function formatProviderRuntimeKeyLabel(hasKey: boolean) {
  return hasKey ? "已检测到" : "缺失";
}

export function formatProviderWidgetStatusLabel(enabled: boolean, hasKey: boolean) {
  if (enabled && hasKey) {
    return "可用";
  }

  if (enabled) {
    return "缺少密钥";
  }

  return "已禁用";
}

export function formatRagVisibilityLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();

  switch (normalized) {
    case "PUBLIC":
      return "公开";
    case "PRIVATE":
      return "私有";
    default:
      return value?.trim() || "未知可见性";
  }
}

export function formatRagSyncStatusLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();

  switch (normalized) {
    case "MISSING":
      return "缺失";
    case "STALE":
      return "待更新";
    default:
      return value?.trim() || "未知状态";
  }
}

export function formatRagModeLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();

  switch (normalized) {
    case "CHAT":
      return "聊天";
    case "PREVIEW":
      return "预览";
    default:
      return value?.trim() || "未知模式";
  }
}

export function formatRagSourceTypeLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();

  switch (normalized) {
    case "POST":
      return "文章";
    case "NOTE":
      return "常青笔记";
    case "JOURNAL":
      return "研究日志";
    case "DAILY_PAPER":
      return "每日论文";
    case "DIGEST":
      return "每周摘要";
    case "PAPER_LIBRARY_ITEM":
      return "论文库";
    case "PAPER_ANNOTATION":
      return "论文批注";
    default:
      return value?.trim() || "未知来源";
  }
}

export function formatRagKindLabel(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  switch (normalized) {
    case "blog post":
      return "文章";
    case "current blog post":
      return "当前文章";
    case "note":
    case "evergreen note":
      return "常青笔记";
    case "current note":
      return "当前笔记";
    case "journal entry":
      return "研究日志";
    case "daily paper":
      return "每日论文";
    case "weekly digest":
      return "每周摘要";
    case "current weekly digest":
      return "当前每周摘要";
    case "my paper library":
      return "我的论文库";
    case "my annotation":
      return "我的批注";
    default:
      return value?.trim() || "未知类型";
  }
}
