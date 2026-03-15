import { notFound } from "next/navigation";
import { RevisionHistory } from "@/components/admin/revision-history";
import { NoteForm } from "@/components/forms/note-form";
import {
  deleteNoteAction,
  restoreNoteRevisionAction,
  updateNoteAction,
} from "@/lib/actions/content-actions";
import {
  getAdminNoteById,
  getAdminNoteRevisionHistory,
  getAdminSeriesOptions,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function resolveRevisionFeedback(value: string | undefined) {
  if (value === "restored") {
    return {
      tone: "success" as const,
      message: "Revision restored. A fresh checkpoint was also saved for the restored state.",
    };
  }

  if (value === "missing") {
    return {
      tone: "error" as const,
      message: "That revision could not be found. Refresh the page and try again.",
    };
  }

  return null;
}

export default async function EditNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id } = await params;
  const [{ revision }, note, revisions, seriesOptions] = await Promise.all([
    searchParams,
    getAdminNoteById(id),
    getAdminNoteRevisionHistory(id),
    getAdminSeriesOptions(),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Notes</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit evergreen note</h1>
        </div>
        <form action={deleteNoteAction}>
          <input type="hidden" name="noteId" value={note.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            Delete note
          </button>
        </form>
      </div>

      <NoteForm action={updateNoteAction} submitLabel="Save changes" note={note} seriesOptions={seriesOptions} />

      <RevisionHistory
        title="Note revisions"
        description="Each save creates a checkpoint for this evergreen note, so you can restore an earlier state without losing the current draft."
        itemIdField="noteId"
        itemId={note.id}
        feedback={resolveRevisionFeedback(revision)}
        revisions={revisions}
        restoreAction={restoreNoteRevisionAction}
      />
    </div>
  );
}
