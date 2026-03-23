import { PostStatus } from "@prisma/client";
import { ContentQualityChecklist } from "@/components/forms/content-quality-checklist";
import { DraftAutosave } from "@/components/forms/draft-autosave";
import {
  PaperHighlightInserter,
  type PaperHighlightInsertItem,
} from "@/components/forms/paper-highlight-inserter";
import { SubmitButton } from "@/components/ui/submit-button";

type NoteFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
  seriesOptions?: Array<{
    id: string;
    title: string;
    featured?: boolean;
  }>;
  paperHighlightCards?: PaperHighlightInsertItem[];
  note?: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    noteType: string | null;
    tags: string[];
    status: PostStatus;
    featured: boolean;
    seriesId?: string | null;
    seriesOrder?: number | null;
    publishedAt: Date | null;
  } | null;
};

const NOTE_DRAFT_FIELDS = [
  "title",
  "slug",
  "summary",
  "content",
  "noteType",
  "tags",
  "status",
  "publishedAt",
  "seriesId",
  "seriesOrder",
  "featured",
];

function toDateTimeLocalString(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function NoteForm({
  action,
  submitLabel,
  confirmMessage,
  seriesOptions = [],
  paperHighlightCards = [],
  note,
}: NoteFormProps) {
  const formId = note ? `note-form-${note.id}` : "note-form-new";
  const storageKey = note ? `draft:note:${note.id}` : "draft:note:new";

  return (
    <form
      id={formId}
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}

      <DraftAutosave formId={formId} storageKey={storageKey} fields={NOTE_DRAFT_FIELDS} />

      <ContentQualityChecklist
        formId={formId}
        kind="note"
        initialData={{
          title: note?.title ?? "",
          summary: note?.summary ?? "",
          content: note?.content ?? "",
          noteType: note?.noteType ?? "",
          tags: note?.tags ?? [],
          status: note?.status ?? PostStatus.DRAFT,
          publishedAt: toDateTimeLocalString(note?.publishedAt),
        }}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标题</span>
          <input
            name="title"
            defaultValue={note?.title}
            required
            className="field"
            placeholder="例如：小型研究团队的 RAG 评估清单"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={note?.slug}
            className="field"
            placeholder="留空则根据标题自动生成"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">笔记类型</span>
          <input
            name="noteType"
            defaultValue={note?.noteType ?? "知识笔记"}
            required
            className="field"
            placeholder="例如：清单 / 方法笔记 / 阅读笔记"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">简介</span>
          <textarea
            name="summary"
            defaultValue={note?.summary}
            required
            minLength={12}
            rows={4}
            className="field min-h-28 resize-y"
            placeholder="写一段简短说明，用于列表页、搜索和相关主题浏览。"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">正文（Markdown）</span>
          <textarea
            name="content"
            defaultValue={note?.content}
            required
            minLength={24}
            rows={18}
            className="field min-h-72 resize-y font-mono text-sm"
            placeholder={"## 这篇笔记为什么存在\n\n在这里写可复用的 Markdown 笔记正文。"}
          />
        </label>

        <div className="md:col-span-2">
          <PaperHighlightInserter formId={formId} items={paperHighlightCards} />
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标签</span>
          <input
            name="tags"
            defaultValue={note?.tags.join(", ")}
            className="field"
            placeholder="例如：rag, evaluation, checklist"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">状态</span>
          <select name="status" className="field" defaultValue={note?.status ?? PostStatus.DRAFT}>
            <option value={PostStatus.DRAFT}>草稿</option>
            <option value={PostStatus.PUBLISHED}>已发布</option>
            <option value={PostStatus.ARCHIVED}>已归档</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">发布时间</span>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalString(note?.publishedAt)}
            className="field"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">所属专题</span>
          <select name="seriesId" className="field" defaultValue={note?.seriesId ?? ""}>
            <option value="">独立笔记</option>
            {seriesOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.featured ? "精选专题 · " : ""}
                {series.title}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">专题顺序</span>
          <input
            name="seriesOrder"
            type="number"
            min={1}
            max={999}
            defaultValue={note?.seriesOrder ?? ""}
            className="field"
            placeholder="1"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input
          name="featured"
          type="checkbox"
          defaultChecked={note?.featured}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        标记为精选
      </label>

      <div className="text-xs leading-6 text-[var(--ink-soft)]">
        专题顺序是可选项，只有当这篇笔记属于某个阅读专题时才会生效。
      </div>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
