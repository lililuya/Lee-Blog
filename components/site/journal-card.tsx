import { formatDate } from "@/lib/utils";

type JournalCardProps = {
  entry: {
    title: string;
    summary: string;
    mood: string | null | undefined;
    publishedAt: Date | string;
  };
};

export function JournalCard({ entry }: JournalCardProps) {
  return (
    <article className="outline-card rounded-[1.75rem] p-5">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
        <span>{formatDate(entry.publishedAt, "MMM d")}</span>
        <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">{entry.mood ?? "平稳"}</span>
      </div>
      <h3 className="font-serif text-2xl font-semibold tracking-tight">{entry.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{entry.summary}</p>
    </article>
  );
}

