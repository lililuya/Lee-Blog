import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import {
  deleteCommentModerationRuleAction,
  saveCommentModerationRuleAction,
} from "@/lib/actions/comment-rule-actions";
import { getCommentModerationRules } from "@/lib/queries";

export const dynamic = "force-dynamic";

function resolveFeedback(state: string | undefined) {
  switch (state) {
    case "created":
      return {
        tone: "success" as const,
        message: "Comment moderation rule created.",
      };
    case "updated":
      return {
        tone: "success" as const,
        message: "Comment moderation rule updated.",
      };
    case "deleted":
      return {
        tone: "success" as const,
        message: "Comment moderation rule deleted.",
      };
    case "duplicate":
      return {
        tone: "error" as const,
        message: "A rule with the same normalized term and mode already exists.",
      };
    case "invalid":
      return {
        tone: "error" as const,
        message: "Please enter a valid moderation term.",
      };
    case "missing":
      return {
        tone: "error" as const,
        message: "That moderation rule no longer exists.",
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
  const submitLabel = rule ? "Save rule" : "Add rule";

  return (
    <form
      action={saveCommentModerationRuleAction}
      className="space-y-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.78)] p-5"
    >
      {rule ? <input type="hidden" name="ruleId" value={rule.id} /> : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_12rem_12rem]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Term</span>
          <input
            name="term"
            defaultValue={rule?.term ?? ""}
            required
            className="field"
            placeholder="Keyword or phrase"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Mode</span>
          <select name="mode" className="field" defaultValue={rule?.mode ?? "BLOCK"}>
            <option value="BLOCK">Block / Match</option>
            <option value="ALLOW">Allow / Exempt</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Severity</span>
          <select name="severity" className="field" defaultValue={rule?.severity ?? "REVIEW"}>
            <option value="REVIEW">Hold for review</option>
            <option value="REJECT">Auto reject</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">Notes</span>
        <textarea
          name="notes"
          defaultValue={rule?.notes ?? ""}
          rows={3}
          className="field min-h-24 resize-y"
          placeholder="Optional context for why this rule exists."
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
          Enabled
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {rule ? (
            <span className="text-xs text-[var(--ink-soft)]">
              Created by {rule.createdBy?.name ?? "admin"}
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
          Back to comment moderation
        </Link>
        <div>
          <p className="section-kicker">Comment Rules</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            Moderation dictionary
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            Built-in sensitive keywords still work by default. Use this page to add custom
            allow rules, review rules, or hard reject rules without touching code.
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
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Add custom rule</h2>
            <p className="text-sm text-[var(--ink-soft)]">
              Allowlist rules override matching block terms. Reject severity will auto-reject a
              comment instead of sending it to the review queue.
            </p>
          </div>
        </div>

        <RuleForm />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Custom Rules</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Active moderation rules
            </h2>
          </div>
          <span className="badge-soft">{rules.length} custom rules</span>
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
                    <span className="badge-soft">{rule.mode}</span>
                    <span className="badge-soft">{rule.severity}</span>
                    <span className="badge-soft">{rule.enabled ? "ENABLED" : "DISABLED"}</span>
                  </div>
                  <form action={deleteCommentModerationRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className="btn-secondary text-rose-700">
                      Delete rule
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
            No custom moderation rules yet. Built-in keyword screening is still active.
          </div>
        )}
      </section>
    </div>
  );
}
