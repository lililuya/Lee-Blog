import { notFound } from "next/navigation";
import { deleteNoteAction, updateNoteAction } from "@/lib/actions/content-actions";
import { NoteForm } from "@/components/forms/note-form";
import { getAdminNoteById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getAdminNoteById(id);

  if (!note) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Notes</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit Evergreen Note</h1>
        </div>
        <form action={deleteNoteAction}>
          <input type="hidden" name="noteId" value={note.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            Delete note
          </button>
        </form>
      </div>
      <NoteForm action={updateNoteAction} submitLabel="Save changes" note={note} />
    </div>
  );
}
