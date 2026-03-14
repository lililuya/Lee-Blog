import { PostStatus } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";

type NoteFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
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
    publishedAt: Date | null;
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

export function NoteForm({ action, submitLabel, note }: NoteFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Title</span>
          <input name="title" defaultValue={note?.title} required className="field" placeholder="For example: RAG Evaluation Checklist for Small Research Teams" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={note?.slug} className="field" placeholder="Leave empty to generate from the title" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Note Type</span>
          <input name="noteType" defaultValue={note?.noteType ?? "Knowledge Note"} required className="field" placeholder="Checklist / Method Note / Reading Note" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Summary</span>
          <textarea name="summary" defaultValue={note?.summary} required minLength={12} rows={4} className="field min-h-28 resize-y" placeholder="Write a short summary that will appear on the notes index and in search results." />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Body (Markdown)</span>
          <textarea name="content" defaultValue={note?.content} required minLength={24} rows={18} className="field min-h-72 resize-y font-mono text-sm" placeholder="## Why this note exists

Write the reusable note body here in Markdown." />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Tags</span>
          <input name="tags" defaultValue={note?.tags.join(", ")} className="field" placeholder="rag, evaluation, checklist" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Status</span>
          <select name="status" className="field" defaultValue={note?.status ?? PostStatus.DRAFT}>
            <option value={PostStatus.DRAFT}>Draft</option>
            <option value={PostStatus.PUBLISHED}>Published</option>
            <option value={PostStatus.ARCHIVED}>Archived</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Published At</span>
          <input name="publishedAt" type="datetime-local" defaultValue={toDateTimeLocalString(note?.publishedAt)} className="field" />
        </label>
      </div>
      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input name="featured" type="checkbox" defaultChecked={note?.featured} className="h-4 w-4 accent-[var(--accent)]" />
        Mark as a featured evergreen note
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
