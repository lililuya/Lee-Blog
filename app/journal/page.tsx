import { CalendarDays, PencilRuler } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { getRecentJournalEntries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const entries = await getRecentJournalEntries(50);

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Journal"
          title="日志模块"
          description="记录实验、工程中的一些典型问题和解决方案"
        />

        <div className="space-y-5">
          {entries.map((entry) => (
            <article key={entry.slug} className="glass-card rounded-[2rem] p-6 md:p-7">
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--ink-soft)]">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}
                </span>
                <span className="badge-soft bg-[rgba(168,123,53,0.1)] text-[var(--gold)]">
                  {entry.mood ?? "steady"}
                </span>
              </div>
              <h2 className="mt-5 font-serif text-3xl font-semibold tracking-tight">{entry.title}</h2>
              <p className="mt-3 text-base leading-8 text-[var(--ink-soft)]">{entry.summary}</p>
              <div className="mt-5 rounded-[1.5rem] bg-[rgba(20,33,43,0.03)] p-5 text-sm leading-8 text-[var(--ink-soft)]">
                <div className="mb-3 flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <PencilRuler className="h-4 w-4 text-[var(--accent)]" />
                  日志正文
                </div>
                {entry.content}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}