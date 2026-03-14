import { JournalStatus } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";

type JournalFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  entry?: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    mood: string | null;
    status: JournalStatus;
    publishedAt: Date;
  } | null;
};

function toDateTimeLocalString(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function JournalForm({ action, submitLabel, entry }: JournalFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
      {entry ? <input type="hidden" name="entryId" value={entry.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标题</span>
          <input name="title" defaultValue={entry?.title} required className="field" placeholder="例如：本周写作和部署记录" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={entry?.slug} className="field" placeholder="留空自动生成" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">心情 / 标签</span>
          <input name="mood" defaultValue={entry?.mood ?? ""} className="field" placeholder="focused / curious / reflective" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">摘要</span>
          <textarea name="summary" defaultValue={entry?.summary} required minLength={12} rows={4} className="field min-h-24 resize-y" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">正文</span>
          <textarea name="content" defaultValue={entry?.content} required minLength={24} rows={14} className="field min-h-56 resize-y" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">状态</span>
          <select name="status" className="field" defaultValue={entry?.status ?? JournalStatus.PUBLISHED}>
            <option value={JournalStatus.DRAFT}>草稿</option>
            <option value={JournalStatus.PUBLISHED}>已发布</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">发布时间</span>
          <input name="publishedAt" type="datetime-local" defaultValue={toDateTimeLocalString(entry?.publishedAt)} className="field" />
        </label>
      </div>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}