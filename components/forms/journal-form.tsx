import { JournalStatus } from "@prisma/client";
import { DraftAutosave } from "@/components/forms/draft-autosave";
import { SubmitButton } from "@/components/ui/submit-button";

type JournalFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
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

const JOURNAL_DRAFT_FIELDS = [
  "title",
  "slug",
  "mood",
  "summary",
  "content",
  "status",
  "publishedAt",
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

export function JournalForm({ action, submitLabel, confirmMessage, entry }: JournalFormProps) {
  const formId = entry ? `journal-form-${entry.id}` : "journal-form-new";
  const storageKey = entry ? `draft:journal:${entry.id}` : "draft:journal:new";

  return (
    <form
      id={formId}
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {entry ? <input type="hidden" name="entryId" value={entry.id} /> : null}

      <DraftAutosave formId={formId} storageKey={storageKey} fields={JOURNAL_DRAFT_FIELDS} />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Title</span>
          <input
            name="title"
            defaultValue={entry?.title}
            required
            className="field"
            placeholder="For example: This week's writing and deployment log"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={entry?.slug}
            className="field"
            placeholder="Leave empty to generate automatically"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Mood / label</span>
          <input
            name="mood"
            defaultValue={entry?.mood ?? ""}
            className="field"
            placeholder="focused / curious / reflective"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Summary</span>
          <textarea
            name="summary"
            defaultValue={entry?.summary}
            required
            minLength={12}
            rows={4}
            className="field min-h-24 resize-y"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Body</span>
          <textarea
            name="content"
            defaultValue={entry?.content}
            required
            minLength={24}
            rows={14}
            className="field min-h-56 resize-y"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Status</span>
          <select name="status" className="field" defaultValue={entry?.status ?? JournalStatus.PUBLISHED}>
            <option value={JournalStatus.DRAFT}>Draft</option>
            <option value={JournalStatus.PUBLISHED}>Published</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Published At</span>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalString(entry?.publishedAt)}
            className="field"
          />
        </label>
      </div>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
