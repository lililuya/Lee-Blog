export function SetupNotice() {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-6 text-sm leading-7 text-[var(--ink-soft)]">
      当前尚未配置 `DATABASE_URL`，前台会使用演示内容渲染，但登录、后台管理、评论提交和 LLM 对话代理需要数据库后才能启用。
    </div>
  );
}

