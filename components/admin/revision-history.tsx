import { RotateCcw } from "lucide-react";
import type { PostStatus } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";

type RevisionHistoryProps = {
  title: string;
  description: string;
  itemIdField: string;
  itemId: string;
  feedback?: {
    tone: "success" | "error";
    message: string;
  } | null;
  revisions: Array<{
    id: string;
    version: number;
    createdAt: Date;
    slug: string;
    status: PostStatus;
    publishedAt: Date | null;
    actor: {
      name: string;
      email: string;
    } | null;
  }>;
  restoreAction: (formData: FormData) => Promise<void>;
};

function FeedbackBanner({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      }
    >
      {message}
    </div>
  );
}

export function RevisionHistory({
  title,
  description,
  itemIdField,
  itemId,
  feedback,
  revisions,
  restoreAction,
}: RevisionHistoryProps) {
  return (
    <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
      <div className="space-y-2">
        <p className="section-kicker">History</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">{description}</p>
      </div>

      {feedback ? <div className="mt-5"><FeedbackBanner tone={feedback.tone} message={feedback.message} /></div> : null}

      {revisions.length ? (
        <div className="mt-6 grid gap-4">
          {revisions.map((revision) => (
            <article
              key={revision.id}
              className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.62)] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[rgba(27,107,99,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                      v{revision.version}
                    </span>
                    <span className="text-sm text-[var(--ink-soft)]">
                      Saved {formatDate(revision.createdAt, "yyyy-MM-dd HH:mm")}
                    </span>
                  </div>
                  <div className="text-sm leading-7 text-[var(--ink-soft)]">
                    <div>Slug: {revision.slug}</div>
                    <div>Status: {revision.status}</div>
                    <div>
                      Publish at:{" "}
                      {revision.publishedAt
                        ? formatDate(revision.publishedAt, "yyyy-MM-dd HH:mm")
                        : "Not scheduled"}
                    </div>
                    <div>
                      Saved by: {revision.actor?.name ?? "System"}
                      {revision.actor?.email ? ` (${revision.actor.email})` : ""}
                    </div>
                  </div>
                </div>

                <form
                  action={restoreAction}
                  data-confirm-message={`Restore revision v${revision.version} and overwrite the current draft with that snapshot?`}
                  className="w-full max-w-[14rem]"
                >
                  <input type="hidden" name={itemIdField} value={itemId} />
                  <input type="hidden" name="revisionId" value={revision.id} />
                  <SubmitButton className="w-full justify-center px-4">
                    <RotateCcw className="h-4 w-4" />
                    Restore v{revision.version}
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.6rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-5 py-6 text-sm leading-7 text-[var(--ink-soft)]">
          No saved revisions yet. A revision is created automatically whenever this content is saved.
        </div>
      )}
    </section>
  );
}
