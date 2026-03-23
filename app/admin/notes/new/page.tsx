import { NoteForm } from "@/components/forms/note-form";
import { requireAdmin } from "@/lib/auth";
import { createNoteAction } from "@/lib/actions/content-actions";
import { getAdminSeriesOptions } from "@/lib/queries";
import { getPaperHighlightInsertionsForUser } from "@/lib/paper-library-queries";

export const dynamic = "force-dynamic";

export default async function NewNotePage() {
  const admin = await requireAdmin();
  const [seriesOptions, paperHighlightCards] = await Promise.all([
    getAdminSeriesOptions(),
    getPaperHighlightInsertionsForUser(admin.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">笔记</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建常青笔记</h1>
      </div>
      <NoteForm
        action={createNoteAction}
        submitLabel="创建笔记"
        seriesOptions={seriesOptions}
        paperHighlightCards={paperHighlightCards}
      />
    </div>
  );
}
