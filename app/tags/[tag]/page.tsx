import { notFound } from "next/navigation";
import { Hash, Layers3, NotebookPen } from "lucide-react";
import { PostCard } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { NoteCard } from "@/components/site/note-card";
import { getTagDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TagDetailPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const detail = await getTagDetail(tag);

  if (!detail) {
    notFound();
  }

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Tag"
          title={`#${detail.tag}`}
          description="This tag page brings together published blog posts and evergreen notes that share the same topic label."
          href="/tags"
          linkLabel="All tags"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Total entries</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{detail.total}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Public items currently filed under this tag.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Blog posts</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{detail.posts.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Long-form articles connected to this topic.
            </p>
          </div>
          <div className="outline-card rounded-[1.8rem] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Notes</p>
            <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{detail.notes.length}</p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Evergreen notes and reference material on the same theme.
            </p>
          </div>
        </div>

        {detail.posts.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-[var(--accent)]" />
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Blog posts</h2>
            </div>
            <div className="data-grid">
              {detail.posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        ) : null}

        {detail.notes.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-[var(--gold)]" />
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Notes</h2>
            </div>
            <div className="data-grid">
              {detail.notes.map((note) => (
                <NoteCard key={note.slug} note={note} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="glass-card rounded-[2rem] p-6">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Why this page exists</h2>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-[var(--ink-soft)]">
            Search is useful when you already know what you want. Tag pages are better when you want to browse a topic and discover adjacent writing that shares the same vocabulary.
          </p>
        </section>
      </div>
    </div>
  );
}
