import { NoteCard } from "@/components/site/note-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublishedNotes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NotesIndexPage() {
  const notes = await getPublishedNotes();
  const featuredCount = notes.filter((note) => note.featured).length;
  const noteTypes = new Set(notes.map((note) => note.noteType ?? "Knowledge Note"));

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Notes"
          title="Evergreen notes"
          description="This module is for durable knowledge cards: concept summaries, reading takeaways, method notes, checklists, and reference snippets that should stay useful longer than a journal entry but do not need to become a full blog post."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Published notes</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{notes.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              A growing layer between quick journal fragments and long-form essays.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Featured notes</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{featuredCount}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Use featured notes for high-value references you expect to revisit often.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Note types</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{noteTypes.size}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Organize notes as checklists, concept cards, method notes, or reading summaries.
            </p>
          </div>
        </div>

        {notes.length > 0 ? (
          <div className="data-grid">
            {notes.map((note) => (
              <NoteCard key={note.slug} note={note} />
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            No published notes are available yet. Add Markdown files under <code>content/notes</code> and run <code>npm run content:sync</code> to import them.
          </div>
        )}
      </div>
    </div>
  );
}
