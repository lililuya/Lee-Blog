import { PostCard } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { getPublishedPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Blog"
          title="Long-form writing"
          description="Use this space for complete essays, project retrospectives, research notes, and carefully structured technical posts. Every article supports comments, admin management, and a richer reading experience."
          href="/categories"
          linkLabel="Browse categories"
        />
        <div className="data-grid">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
