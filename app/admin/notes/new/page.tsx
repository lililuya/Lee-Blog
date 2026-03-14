import { NoteForm } from "@/components/forms/note-form";
import { createNoteAction } from "@/lib/actions/content-actions";

export const dynamic = "force-dynamic";

export default function NewNotePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Notes</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Create a New Evergreen Note</h1>
      </div>
      <NoteForm action={createNoteAction} submitLabel="Create note" />
    </div>
  );
}
