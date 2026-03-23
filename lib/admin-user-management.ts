export const userManagementNoticeMap: Record<string, string> = {
  promoted: "用户已提升为管理员。",
  demoted: "用户已降级为普通读者。",
  muted: "用户已被禁止发表评论。",
  unmuted: "用户的评论禁言已解除。",
  suspended: "用户的登录权限已暂停。",
  restored: "用户账号已恢复为正常状态。",
  deleted: "用户已被软删除。现有关系会保留，用于审计追踪。",
  "sessions-revoked": "该用户的所有活动会话都已撤销。",
};

export const userManagementErrorMap: Record<string, string> = {
  "user-not-found": "目标用户已不存在。",
  "last-admin": "不能对最后一个仍处于启用状态的管理员账号执行此操作。",
  "self-role": "不能修改你自己的角色。",
  "self-mute": "不能对你自己的账号执行评论禁言。",
  "self-suspend": "不能暂停你自己的账号。",
  "self-delete": "不能删除你自己的账号。",
  "self-revoke": "不能在这个页面撤销当前管理员会话。",
  "deleted-user": "已删除账号不能再修改角色。",
  "user-not-active": "只有启用中的账号才能被评论禁言。",
};
