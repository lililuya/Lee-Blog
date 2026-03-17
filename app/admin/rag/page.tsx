import { BarChart3, Database, RefreshCcw, ScanSearch, Sparkles } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { syncRagKnowledgeAction } from "@/lib/actions/rag-actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminRagOverview } from "@/lib/rag-admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatReservationValue(value: string | null) {
  return value?.trim() || "Not set";
}

export default async function AdminRagPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; error?: string; chunks?: string; sources?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const overview = await getAdminRagOverview(params.q);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">RAG Console</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          Retrieval knowledge management
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          Inspect what has been embedded, which content types are represented, and how semantic retrieval behaves before it reaches the chat surface.
        </p>
      </section>

      {params.status === "synced" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          RAG knowledge sync finished. {params.sources ?? "0"} sources and {params.chunks ?? "0"} chunks were refreshed.
        </div>
      ) : null}

      {params.error === "embedding" ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          Text embedding is not configured yet. Set the RAG embedding environment variables or reserve a compatible provider before syncing.
        </div>
      ) : null}

      {params.error === "sync" ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          The sync job did not complete successfully. Check the server log for the detailed error and retry after fixing the underlying issue.
        </div>
      ) : null}

      <section className="data-grid">
        <StatCard label="Chunks" value={overview.totals.chunks} hint="All stored RAG chunks across public and private sources." />
        <StatCard label="Sources" value={overview.totals.sources} hint="Unique source documents represented in the chunk table." />
        <StatCard label="Public Chunks" value={overview.totals.publicChunks} hint="Available to public retrieval and chat citations." />
        <StatCard label="Private Chunks" value={overview.totals.privateChunks} hint="Reserved for signed-in user retrieval only." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Embedding configuration</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">Text embedding status</p>
              <p className="mt-2">{overview.configured ? "Configured" : "Missing"}</p>
              <p>Model: {overview.embeddingModel ?? "Unavailable"}</p>
              <p>Source: {overview.embeddingSource ?? "Unavailable"}</p>
              <p>Last updated chunk: {overview.latestUpdatedAt ? formatDate(overview.latestUpdatedAt, "yyyy-MM-dd HH:mm") : "No chunks yet"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">Reserved slots</p>
              <p>Text model: {formatReservationValue(overview.reservations.text.model)}</p>
              <p>Text provider slug: {formatReservationValue(overview.reservations.text.providerSlug)}</p>
              <p>Multimodal model: {formatReservationValue(overview.reservations.multimodal.model)}</p>
              <p>Multimodal provider slug: {formatReservationValue(overview.reservations.multimodal.providerSlug)}</p>
            </div>
          </div>
          <form
            action={syncRagKnowledgeAction}
            data-confirm-message="Sync the RAG knowledge base now? Existing chunks will be refreshed from the latest content."
            className="mt-6"
          >
            <SubmitButton className="px-5">
              <RefreshCcw className="h-4 w-4" />
              Sync RAG knowledge
            </SubmitButton>
          </form>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Retrieval preview</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            Run a semantic lookup against the current public chunk set to inspect likely hits before they surface in chat.
          </p>
          <form className="mt-6 space-y-4">
            <label className="space-y-2 text-sm text-[var(--ink-soft)]">
              <span>Preview query</span>
              <input
                type="text"
                name="q"
                defaultValue={overview.previewQuery}
                className="field"
                placeholder="e.g. RAG evaluation checklist or paper library workflow"
              />
            </label>
            <button type="submit" className="btn-secondary px-5">
              <Sparkles className="h-4 w-4" />
              Run preview
            </button>
          </form>

          {overview.previewQuery ? (
            overview.previewResults.length > 0 ? (
              <div className="mt-6 space-y-4">
                {overview.previewResults.map((result) => (
                  <article key={result.sourceKey} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      <span>{result.kindLabel}</span>
                      <span>{result.visibility}</span>
                      <span>{result.score} score</span>
                      <span>{result.hitCount} hit chunks</span>
                    </div>
                    <a href={result.href} className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]">
                      {result.title}
                    </a>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{result.snippet}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
                No semantic hits crossed the preview threshold for this query.
              </div>
            )
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Enter a query above to inspect semantic retrieval behavior.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Source coverage</h2>
          </div>
          {overview.sourceTypeBreakdown.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.sourceTypeBreakdown.map((entry) => (
                <div key={entry.sourceType} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[var(--ink)]">{entry.sourceType}</span>
                    <span className="text-sm text-[var(--ink-soft)]">{entry.chunks} chunks</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{entry.sources} unique sources</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              No RAG chunks have been stored yet.
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Recent sources</h2>
          </div>
          {overview.recentSources.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.recentSources.map((source) => (
                <article key={source.sourceKey} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span>{source.kindLabel}</span>
                    <span>{source.visibility}</span>
                    <span>{source.chunkCount} chunks</span>
                  </div>
                  <a href={source.href} className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]">
                    {source.title}
                  </a>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {source.sourceType} · updated {formatDate(source.updatedAt, "yyyy-MM-dd HH:mm")}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Sync the knowledge base once to start inspecting source coverage.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Recent chunks</h2>
        </div>
        {overview.recentChunks.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {overview.recentChunks.map((chunk) => (
              <article key={chunk.id} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  <span>{chunk.kindLabel}</span>
                  <span>{chunk.visibility}</span>
                  <span>{formatDate(chunk.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                </div>
                <a href={chunk.href} className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]">
                  {chunk.title}
                </a>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{chunk.snippet}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
            No chunk samples available yet.
          </div>
        )}
      </section>
    </div>
  );
}
