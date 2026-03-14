import Link from "next/link";
import { FileSearch, NotebookPen, Search, ScrollText } from "lucide-react";
import { searchSite } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const suggestedQueries = [
  "LLM agent",
  "RAG",
  "workflow",
  "weekly digest",
  "checklist",
  "prompt scaffolding",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const results = query ? await searchSite(query) : null;

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <section className="space-y-5">
          <p className="section-kicker">Search</p>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,4.6rem)] font-semibold tracking-tight">
            站点内关键词搜索
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
            在站点内搜索长篇文章、常青笔记、日记更新、日报和周刊摘要。
          </p>
          <form
            action="/search"
            className="flex flex-col gap-3 rounded-[2rem] border border-black/8 bg-white/82 p-5 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:flex-row"
          >
            <input
              type="search"
              name="q"
              defaultValue={query}
              className="field"
              placeholder="试试关键词: LLM agent / RAG / checklist / prompt scaffolding"
            />
            <button type="submit" className="btn-primary md:min-w-36">
              <Search className="h-4 w-4" />
              Search
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((item) => (
              <Link
                key={item}
                href={`/search?q=${encodeURIComponent(item)}`}
                className="rounded-full border border-black/8 bg-white/70 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                {item}
              </Link>
            ))}
          </div>
        </section>

        {results ? (
          <section className="space-y-8">
            <div className="glass-card rounded-[2rem] p-5 text-sm text-[var(--ink-soft)]">
              Search results for <span className="font-semibold text-[var(--ink)]">{query}</span>: {results.total} matches.
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="font-serif text-2xl font-semibold tracking-tight">Blog posts</h2>
                </div>
                {results.posts.length > 0 ? (
                  results.posts.map((post) => (
                    <article key={post.id} className="glass-card rounded-[1.8rem] p-5">
                      <div className="text-sm text-[var(--ink-soft)]">
                        {post.category} · {formatDate(post.publishedAt)}
                      </div>
                      <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{post.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{post.excerpt}</p>
                      <Link href={`/blog/${post.slug}`} className="btn-secondary mt-5">
                        Read article
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/55 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                    No matching blog posts yet.
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-[var(--gold)]" />
                  <h2 className="font-serif text-2xl font-semibold tracking-tight">Evergreen notes</h2>
                </div>
                {results.notes.length > 0 ? (
                  results.notes.map((note) => (
                    <article key={note.id} className="glass-card rounded-[1.8rem] p-5">
                      <div className="text-sm text-[var(--ink-soft)]">
                        {note.noteType ?? "Knowledge Note"} · {formatDate(note.publishedAt)}
                      </div>
                      <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{note.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{note.summary}</p>
                      <Link href={`/notes/${note.slug}`} className="btn-secondary mt-5">
                        Open note
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/55 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                    No matching notes yet.
                  </div>
                )}
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="font-serif text-2xl font-semibold tracking-tight">Journal and digests</h2>
                </div>
                {results.journalEntries.length > 0 ? (
                  results.journalEntries.map((entry) => (
                    <article key={entry.id} className="glass-card rounded-[1.8rem] p-5">
                      <div className="text-sm text-[var(--ink-soft)]">
                        Journal · {formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}
                      </div>
                      <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{entry.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{entry.summary}</p>
                      <Link href="/journal" className="btn-secondary mt-5">
                        Open journal
                      </Link>
                    </article>
                  ))
                ) : null}
                {results.weeklyDigests.length > 0 ? (
                  results.weeklyDigests.map((digest) => (
                    <article key={digest.id} className="glass-card rounded-[1.8rem] p-5">
                      <div className="text-sm text-[var(--ink-soft)]">
                        Digest · {formatDate(digest.periodStart, "yyyy-MM-dd")} - {formatDate(digest.periodEnd, "yyyy-MM-dd")}
                      </div>
                      <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{digest.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{digest.summary}</p>
                      <Link href={`/digest/${digest.slug}`} className="btn-secondary mt-5">
                        Read digest
                      </Link>
                    </article>
                  ))
                ) : null}
                {results.journalEntries.length === 0 && results.weeklyDigests.length === 0 ? (
                  <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/55 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                    No matching journal entries or digests yet.
                  </div>
                ) : null}
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="font-serif text-2xl font-semibold tracking-tight">Daily papers</h2>
                </div>
                {results.paperEntries.length > 0 ? (
                  results.paperEntries.map((entry) => (
                    <article key={entry.id} className="glass-card rounded-[1.8rem] p-5">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--ink-soft)]">
                        <span className="badge-soft">{entry.topic.name}</span>
                        <span>{formatDate(entry.digestDate, "yyyy-MM-dd")}</span>
                        {entry.primaryCategory ? <span>{entry.primaryCategory}</span> : null}
                      </div>
                      <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight">{entry.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{entry.summary}</p>
                      <Link href="/papers" className="btn-secondary mt-5">
                        Open papers
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.8rem] border border-dashed border-black/10 bg-white/55 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                    No matching paper entries yet.
                  </div>
                )}
              </section>
            </div>
          </section>
        ) : (
          <section className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
            从上面的关键词开始，网站将搜索帖子、笔记、日志、论文和每周摘要。
          </section>
        )}
      </div>
    </div>
  );
}
