import { SubmitButton } from "@/components/ui/submit-button";

type SeriesFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
  series?: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    description: string;
    coverImageUrl: string | null;
    featured: boolean;
  } | null;
};

export function SeriesForm({ action, submitLabel, confirmMessage, series }: SeriesFormProps) {
  return (
    <form
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {series ? <input type="hidden" name="seriesId" value={series.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">专题标题</span>
          <input
            name="title"
            defaultValue={series?.title}
            required
            className="field"
            placeholder="例如：把研究型 AI 博客做成长期写作专题"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={series?.slug}
            className="field"
            placeholder="留空则根据标题自动生成"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">封面图 URL</span>
          <input
            name="coverImageUrl"
            defaultValue={series?.coverImageUrl ?? ""}
            className="field"
            placeholder="https://images.example.com/series-cover.jpg"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">摘要</span>
          <textarea
            name="summary"
            defaultValue={series?.summary}
            required
            minLength={12}
            rows={3}
            className="field min-h-24 resize-y"
            placeholder="写一段简短概述，用于卡片、链接预览和专题列表页。"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">详细说明</span>
          <textarea
            name="description"
            defaultValue={series?.description}
            required
            minLength={24}
            rows={8}
            className="field min-h-40 resize-y"
            placeholder="介绍这个专题的主线、目标读者，以及读者从头读完后能获得什么。"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input
          name="featured"
          type="checkbox"
          defaultChecked={series?.featured}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        在公开专题页中突出显示这个专题
      </label>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
