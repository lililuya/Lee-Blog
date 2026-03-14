import Link from "next/link";
import { ArrowUpRight, Clock3, FileText } from "lucide-react";
import { formatDate, getContentStats } from "@/lib/utils";

type NoteCardProps = {
  note: {
    title: string;
    slug: string;
    summary: string;
    content?: string;
    noteType: string | null;
    tags: string[];
    publishedAt: Date | string | null;
  };
};

export function NoteCard({ note }: NoteCardProps) {
  const stats = getContentStats(note.content ?? `${note.title} ${note.summary}`);

  return (
    <article className="glass-card group relative overflow-hidden rounded-[2rem] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)]">
      <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,_transparent,_rgba(168,123,53,0.52),_transparent)] opacity-0 transition group-hover:opacity-100" />
      <div className="mb-5 flex items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
        <span className="badge-soft bg-[rgba(168,123,53,0.12)] text-[var(--gold)]">{note.noteType ?? "Knowledge Note"}</span>
        <span>{formatDate(note.publishedAt)}</span>
      </div>
      <div className="space-y-4">
        <h3 className="font-serif text-2xl font-semibold leading-tight tracking-tight">{note.title}</h3>
        <p className="line-clamp-3 text-sm leading-7 text-[var(--ink-soft)]">{note.summary}</p>
        <div className="flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-[var(--ink-soft)]">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {stats.estimatedMinutes} min read
          </span>
          <span className="inline-flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {stats.characterCount.toLocaleString()} chars
          </span>
        </div>
        <Link href={`/notes/${note.slug}`} className="section-link-pill section-link-pill--compact">
          <span>Read note</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
