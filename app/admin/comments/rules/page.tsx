import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import {
  deleteCommentModerationRuleAction,
  saveCommentModerationRuleAction,
} from "@/lib/actions/comment-rule-actions";
import { getCommentModerationRules } from "@/lib/queries";
import {
  formatEnabledDisabledLabel,
  formatModerationRuleModeLabel,
  formatModerationRuleSeverityLabel,
} from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

function resolveFeedback(state: string | undefined) {
  switch (state) {
    case "created":
      return {
        tone: "success" as const,
        message: "评论审核规则已创建。",
      };
    case "updated":
      return {
        tone: "success" as const,
        message: "评论审核规则已更新。",
      };
    case "deleted":
      return {
        tone: "success" as const,
        message: "评论审核规则已删除。",
      };
    case "duplicate":
      return {
        tone: "error" as const,
        message: "已存在相同标准化词条和模式的规则。",
      };
    case "invalid":
      return {
        tone: "error" as const,
        message: "请输入有效的审核词条。",
      };
    case "missing":
      return {
        tone: "error" as const,
        message: "该审核规则已不存在。",
      };
    default:
      return null;
  }
}

function RuleForm({
  rule,
}: {
  rule?: {
    id: string;
    term: string;
    mode: "ALLOW" | "BLOCK";
    severity: "REVIEW" | "REJECT";
    enabled: boolean;
    notes: string | null;
    createdBy?: { name: string } | null;
  };
}) {
  const submitLabel = rule ? "保存规则" : "添加规则";

  return (
    <form
      action={saveCommentModerationRuleAction}
      data-confirm-message={
        rule
          ? "保存这条审核规则的修改吗？之后的新评论会立刻使用更新后的规则。"
          : "创建这条审核规则吗？它会立刻影响新的评论审核。"
      }
      className="space-y-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.78)] p-5"
    >
      {rule ? <input type="hidden" name="ruleId" value={rule.id} /> : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_12rem_12rem]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">词条</span>
          <input
            name="term"
            defaultValue={rule?.term ?? ""}
            required
            className="field"
            placeholder="关键词或短语"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">模式</span>
          <select name="mode" className="field" defaultValue={rule?.mode ?? "BLOCK"}>
            <option value="BLOCK">{formatModerationRuleModeLabel("BLOCK")}</option>
            <option value="ALLOW">{formatModerationRuleModeLabel("ALLOW")}</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">级别</span>
          <select name="severity" className="field" defaultValue={rule?.severity ?? "REVIEW"}>
            <option value="REVIEW">{formatModerationRuleSeverityLabel("REVIEW")}</option>
            <option value="REJECT">{formatModerationRuleSeverityLabel("REJECT")}</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">备注</span>
        <textarea
          name="notes"
          defaultValue={rule?.notes ?? ""}
          rows={3}
          className="field min-h-24 resize-y"
          placeholder="可选，记录这条规则存在的原因。"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={rule?.enabled ?? true}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          已启用
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {rule ? (
            <span className="text-xs text-[var(--ink-soft)]">
              创建人：{rule.createdBy?.name ?? "管理员"}
            </span>
          ) : null}
          <button type="submit" className="btn-primary">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

export default async function AdminCommentRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [rules, resolvedSearchParams] = await Promise.all([
    getCommentModerationRules(),
    searchParams,
  ]);
  const feedback = resolveFeedback(resolvedSearchParams.state);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/admin/comments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回评论审核
        </Link>
        <div>
          <p className="section-kicker">评论规则</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">审核词典</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            系统内置的敏感词筛查仍然会默认生效。你也可以在这里额外添加自定义放行规则、审核规则或硬拒绝规则，无需改代码。
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="space-y-4 rounded-[2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">添加自定义规则</h2>
            <p className="text-sm text-[var(--ink-soft)]">
              放行规则会覆盖命中的拦截词；如果级别设置为自动拒绝，评论会被直接拒绝，而不是进入审核队列。
            </p>
          </div>
        </div>

        <RuleForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">自定义规则</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">当前审核规则</h2>
          </div>
          <span className="badge-soft">{rules.length} 条规则</span>
        </div>

        {rules.length > 0 ? (
          <div className="space-y-4">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="space-y-4 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    <span className="badge-soft">{formatModerationRuleModeLabel(rule.mode)}</span>
                    <span className="badge-soft">{formatModerationRuleSeverityLabel(rule.severity)}</span>
                    <span className="badge-soft">{formatEnabledDisabledLabel(rule.enabled)}</span>
                  </div>
                  <form
                    action={deleteCommentModerationRuleAction}
                    data-confirm-message={`删除审核规则“${rule.term}”吗？这个操作无法在后台直接撤销。`}
                  >
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className="btn-secondary text-rose-700">
                      删除规则
                    </button>
                  </form>
                </div>

                <RuleForm
                  rule={{
                    id: rule.id,
                    term: rule.term,
                    mode: rule.mode,
                    severity: rule.severity,
                    enabled: rule.enabled,
                    notes: rule.notes,
                    createdBy: rule.createdBy,
                  }}
                />
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/55 p-6 text-sm leading-7 text-[var(--ink-soft)]">
            还没有自定义审核规则。当前仍会使用系统内置的关键词筛查。
          </div>
        )}
      </section>
    </div>
  );
}
