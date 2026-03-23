import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  RefreshCcw,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { syncRagKnowledgeAction } from "@/lib/actions/rag-actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminRagOverview } from "@/lib/rag-admin";
import {
  formatRagKindLabel,
  formatRagModeLabel,
  formatRagSourceTypeLabel,
  formatRagSyncStatusLabel,
  formatRagVisibilityLabel,
} from "@/lib/ui-labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatReservationValue(value: string | null) {
  return value?.trim() || "未设置";
}

function formatEmbeddingStatus(configured: boolean) {
  return configured ? "已配置" : "缺失";
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
        <p className="section-kicker">RAG 控制台</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          检索知识管理
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          查看已经嵌入了哪些内容、哪些内容类型进入了知识库，以及语义检索在进入聊天界面之前的真实表现。
        </p>
      </section>

      {params.status === "synced" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          RAG 知识同步完成。已刷新 {params.sources ?? "0"} 个来源、{params.chunks ?? "0"} 个切片。
        </div>
      ) : null}

      {params.error === "embedding" ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          还没有配置文本向量能力。请先设置 RAG embedding 环境变量，或预留兼容的提供方后再执行同步。
        </div>
      ) : null}

      {params.error === "sync" ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          同步任务没有成功完成。请查看服务端日志中的详细错误，修复问题后再重试。
        </div>
      ) : null}

      <section className="data-grid">
        <StatCard
          label="切片"
          value={overview.totals.chunks}
          hint="公开与私有来源中所有已存储的 RAG 切片总数。"
        />
        <StatCard
          label="来源"
          value={overview.totals.sources}
          hint="当前切片表中代表的唯一来源文档数量。"
        />
        <StatCard
          label="公开切片"
          value={overview.totals.publicChunks}
          hint="可用于公开检索与聊天引用的切片。"
        />
        <StatCard
          label="私有切片"
          value={overview.totals.privateChunks}
          hint="仅对已登录用户检索开放的切片。"
        />
      </section>

      <section className="data-grid">
        <StatCard
          label="应入库来源"
          value={overview.syncHealth.totalEligibleSources}
          hint="当前理论上应被纳入知识库的全部内容条目。"
        />
        <StatCard
          label="已同步来源"
          value={overview.syncHealth.syncedSources}
          hint="最新内容变更已经反映到已存储切片中的来源。"
        />
        <StatCard
          label="缺失来源"
          value={overview.syncHealth.missingSources}
          hint="应该进入知识库，但当前没有任何切片的内容。"
        />
        <StatCard
          label="待更新来源"
          value={overview.syncHealth.staleSources}
          hint="内容修改晚于最近一次知识同步，需要重新嵌入。"
        />
      </section>

      <section className="data-grid">
        <StatCard
          label="已记录查询"
          value={overview.quality.totalQueries}
          hint={`最近 ${overview.qualityWindowDays} 天聊天与预览检索活动的记录数。`}
        />
        <StatCard
          label="零召回"
          value={overview.quality.emptyQueries}
          hint="没有返回任何来源的查询次数。"
        />
        <StatCard
          label="零召回率"
          value={`${(overview.quality.emptyRecallRate * 100).toFixed(1)}%`}
          hint="越低越好。偏高通常意味着覆盖不足或检索表述偏弱。"
        />
        <StatCard
          label="平均来源数"
          value={overview.quality.averageSourceCount.toFixed(1)}
          hint="最近聊天与预览查询中，每次平均返回的来源数量。"
        />
        <StatCard
          label="聊天查询"
          value={overview.quality.chatQueries}
          hint="来自后台聊天工作流的查询记录。"
        />
        <StatCard
          label="预览查询"
          value={overview.quality.previewQueries}
          hint="来自本页预览框的查询记录。"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">同步健康度</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            将当前来源清单与已存储切片进行比对，提前发现缺失或过期的知识，避免检索质量下降。
          </p>

          {overview.syncHealth.sourceTypeBreakdown.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.syncHealth.sourceTypeBreakdown.map((entry) => {
                const coverage =
                  entry.currentSources > 0 ? (entry.syncedSources / entry.currentSources) * 100 : 0;

                return (
                  <article
                    key={entry.sourceType}
                    className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-[var(--ink)]">
                        {formatRagSourceTypeLabel(entry.sourceType)}
                      </div>
                      <div className="text-sm text-[var(--ink-soft)]">
                        已同步 {entry.syncedSources}/{entry.currentSources}
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.max(0, Math.min(100, coverage))}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                      已入库 {entry.indexedSources} | 缺失 {entry.missingSources} | 待更新{" "}
                      {entry.staleSources}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              暂无来源清单可供分析。
            </div>
          )}

          {overview.syncHealth.orphanedSources > 0 ? (
            <div className="mt-6 rounded-[1.4rem] border border-[rgba(180,83,9,0.15)] bg-[rgba(180,83,9,0.06)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
              当前有 {overview.syncHealth.orphanedSources} 个已存储来源已经不在最新来源清单中。执行一次完整知识同步后，这些残留记录会被清理。
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[color:rgb(180,83,9)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">需要关注</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            这些来源要么还没有进入知识库，要么在最近一次成功同步之后又发生了更新。
          </p>

          {overview.syncHealth.recentAttentionSources.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.syncHealth.recentAttentionSources.map((source) => (
                <article
                  key={`${source.status}-${source.sourceKey}`}
                  className="rounded-[1.4rem] border border-[rgba(180,83,9,0.15)] bg-[rgba(180,83,9,0.06)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span>{formatRagSyncStatusLabel(source.status)}</span>
                    <span>{formatRagSourceTypeLabel(source.sourceType)}</span>
                    <span>{formatRagVisibilityLabel(source.visibility)}</span>
                    <span>{formatDate(source.sourceUpdatedAt, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                  <a
                    href={source.href}
                    className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]"
                  >
                    {source.title}
                  </a>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {source.status === "MISSING"
                      ? "这个来源目前还没有任何已存储切片。"
                      : `最近一次切片同步：${source.chunkUpdatedAt ? formatDate(source.chunkUpdatedAt, "yyyy-MM-dd HH:mm") : "不可用"} | 当前已存储 ${source.chunkCount} 个切片。`}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              当前来源清单与已存储知识切片已经完全同步。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">查询质量</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">覆盖快照</p>
              <p className="mt-2">
                平均公开来源：{overview.quality.averagePublicSourceCount.toFixed(1)}
              </p>
              <p>
                平均私有来源：{overview.quality.averagePrivateSourceCount.toFixed(1)}
              </p>
              <p>使用页面上下文的查询：{overview.quality.usedPageContextQueries}</p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">关注点</p>
              <p className="mt-2">
                零召回通常意味着切片覆盖不足、检索表述偏弱，或缺少当前页面上下文作为辅助。
              </p>
              <p>
                右侧的高频查询能帮助你判断哪些主题更值得补充笔记、论文批注或文章内容。
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">高频查询</h2>
          </div>

          {overview.topQueries.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.topQueries.map((entry) => (
                <article
                  key={`${entry.normalizedQuery}-${entry.lastSeenAt.toISOString()}`}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-[var(--ink)]">{entry.displayQuery}</div>
                    <div className="text-sm text-[var(--ink-soft)]">{entry.count} 次</div>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    平均 {entry.averageSourceCount.toFixed(1)} 个来源 | 零召回 {entry.emptyCount} 次 | 模式{" "}
                    {entry.modes.map((mode) => formatRagModeLabel(mode)).join("、")}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    最近一次：{formatDate(entry.lastSeenAt, "yyyy-MM-dd HH:mm")}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有任何查询活动被记录。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">向量配置</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">文本向量状态</p>
              <p className="mt-2">{formatEmbeddingStatus(overview.configured)}</p>
              <p>模型：{overview.embeddingModel ?? "不可用"}</p>
              <p>来源：{overview.embeddingSource ?? "不可用"}</p>
              <p>
                最近更新切片：{" "}
                {overview.latestUpdatedAt
                  ? formatDate(overview.latestUpdatedAt, "yyyy-MM-dd HH:mm")
                  : "还没有切片"}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="font-semibold text-[var(--ink)]">预留槽位</p>
              <p>文本模型：{formatReservationValue(overview.reservations.text.model)}</p>
              <p>
                文本提供方 Slug：{formatReservationValue(overview.reservations.text.providerSlug)}
              </p>
              <p>多模态模型：{formatReservationValue(overview.reservations.multimodal.model)}</p>
              <p>
                多模态提供方 Slug：{formatReservationValue(overview.reservations.multimodal.providerSlug)}
              </p>
            </div>
          </div>
          <form
            action={syncRagKnowledgeAction}
            data-confirm-message="现在同步 RAG 知识库吗？现有切片会基于最新内容重新刷新。"
            className="mt-6"
          >
            <SubmitButton className="px-5">
              <RefreshCcw className="h-4 w-4" />
              同步 RAG 知识库
            </SubmitButton>
          </form>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">检索预览</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            直接对当前公开切片执行一次语义检索，提前观察可能的命中结果，再决定是否进入聊天界面使用。
          </p>
          <form className="mt-6 space-y-4">
            <label className="space-y-2 text-sm text-[var(--ink-soft)]">
              <span>预览查询</span>
              <input
                type="text"
                name="q"
                defaultValue={overview.previewQuery}
                className="field"
                placeholder="例如：RAG 评估清单，或论文库工作流"
              />
            </label>
            <button type="submit" className="btn-secondary px-5">
              <Sparkles className="h-4 w-4" />
              运行预览
            </button>
          </form>

          {overview.previewQuery ? (
            overview.previewResults.length > 0 ? (
              <div className="mt-6 space-y-4">
                {overview.previewResults.map((result) => (
                  <article
                    key={result.sourceKey}
                    className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.72)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                      <span>{formatRagKindLabel(result.kindLabel)}</span>
                      <span>{formatRagVisibilityLabel(result.visibility)}</span>
                      <span>{result.score} 分</span>
                      <span>{result.hitCount} 个命中切片</span>
                    </div>
                    <a
                      href={result.href}
                      className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]"
                    >
                      {result.title}
                    </a>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                      {result.snippet}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
                这条查询没有达到预览阈值的语义命中。
              </div>
            )
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              在上方输入查询后，这里会显示语义检索结果。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[color:rgb(180,83,9)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">最近零召回</h2>
          </div>
          {overview.recentEmptyQueries.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.recentEmptyQueries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-[1.4rem] border border-[rgba(180,83,9,0.15)] bg-[rgba(180,83,9,0.06)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span>{formatRagModeLabel(entry.mode)}</span>
                    {entry.pathname ? <span>{entry.pathname}</span> : null}
                    <span>{formatDate(entry.createdAt, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                  <p className="mt-3 font-semibold text-[var(--ink)]">{entry.query}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    这条查询没有检索到任何来源。
                    {entry.usedPageContext ? " 当前页上下文当时是可用的。" : ""}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              当前质量窗口内没有记录到零召回。
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">最近成功召回</h2>
          </div>
          {overview.recentSuccessfulQueries.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.recentSuccessfulQueries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span>{formatRagModeLabel(entry.mode)}</span>
                    <span>{entry.sourceCount} 个来源</span>
                    {entry.topScore !== null ? <span>{entry.topScore} 最高分</span> : null}
                    <span>{formatDate(entry.createdAt, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                  <p className="mt-3 font-semibold text-[var(--ink)]">{entry.query}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    最高命中：{entry.topSourceTitle ?? "不可用"}
                    {entry.topSourceKindLabel
                      ? `（${formatRagKindLabel(entry.topSourceKindLabel)}）`
                      : ""}
                  </p>
                  {entry.topSourceTitles.length > 1 ? (
                    <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                      其他命中：{entry.topSourceTitles.slice(1).join(" | ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有成功检索样本被记录下来。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">来源覆盖</h2>
          </div>
          {overview.sourceTypeBreakdown.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.sourceTypeBreakdown.map((entry) => (
                <div
                  key={entry.sourceType}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[var(--ink)]">
                      {formatRagSourceTypeLabel(entry.sourceType)}
                    </span>
                    <span className="text-sm text-[var(--ink-soft)]">{entry.chunks} 个切片</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {entry.sources} 个唯一来源
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              还没有存储任何 RAG 切片。
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-3xl font-semibold tracking-tight">最近来源</h2>
          </div>
          {overview.recentSources.length > 0 ? (
            <div className="mt-6 space-y-4">
              {overview.recentSources.map((source) => (
                <article
                  key={source.sourceKey}
                  className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <span>{formatRagKindLabel(source.kindLabel)}</span>
                    <span>{formatRagVisibilityLabel(source.visibility)}</span>
                    <span>{source.chunkCount} 个切片</span>
                  </div>
                  <a
                    href={source.href}
                    className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]"
                  >
                    {source.title}
                  </a>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {formatRagSourceTypeLabel(source.sourceType)} 更新于{" "}
                    {formatDate(source.updatedAt, "yyyy-MM-dd HH:mm")}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              先同步一次知识库，这里才会出现来源覆盖情况。
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="font-serif text-3xl font-semibold tracking-tight">最近切片</h2>
        </div>
        {overview.recentChunks.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {overview.recentChunks.map((chunk) => (
              <article
                key={chunk.id}
                className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.62)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  <span>{formatRagKindLabel(chunk.kindLabel)}</span>
                  <span>{formatRagVisibilityLabel(chunk.visibility)}</span>
                  <span>{formatDate(chunk.updatedAt, "yyyy-MM-dd HH:mm")}</span>
                </div>
                <a
                  href={chunk.href}
                  className="mt-3 block font-semibold text-[var(--ink)] hover:text-[var(--accent-strong)]"
                >
                  {chunk.title}
                </a>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{chunk.snippet}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.45)] px-4 py-6 text-sm text-[var(--ink-soft)]">
            目前还没有切片样本可供查看。
          </div>
        )}
      </section>
    </div>
  );
}
