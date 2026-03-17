import { PostStatus } from "@prisma/client";
import { DraftAutosave } from "@/components/forms/draft-autosave";
import { SubmitButton } from "@/components/ui/submit-button";

type PostFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
  seriesOptions?: Array<{
    id: string;
    title: string;
    featured?: boolean;
  }>;
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    status: PostStatus;
    pinned: boolean;
    featured: boolean;
    coverImageUrl: string | null;
    seriesId?: string | null;
    seriesOrder?: number | null;
    publishedAt: Date | null;
  } | null;
};

const POST_DRAFT_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "content",
  "category",
  "tags",
  "status",
  "publishedAt",
  "coverImageUrl",
  "seriesId",
  "seriesOrder",
  "pinned",
  "featured",
];

function toDateTimeLocalString(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function PostForm({
  action,
  submitLabel,
  confirmMessage,
  seriesOptions = [],
  post,
}: PostFormProps) {
  const formId = post ? `post-form-${post.id}` : "post-form-new";
  const storageKey = post ? `draft:post:${post.id}` : "draft:post:new";

  return (
    <form
      id={formId}
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}

      <DraftAutosave formId={formId} storageKey={storageKey} fields={POST_DRAFT_FIELDS} />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Title</span>
          <input
            name="title"
            defaultValue={post?.title}
            required
            className="field"
            placeholder="For example: Building a reliable research blog workflow with LLM tooling"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={post?.slug}
            className="field"
            placeholder="Leave empty to generate from the title"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Category</span>
          <input
            name="category"
            defaultValue={post?.category}
            required
            className="field"
            placeholder="AI Engineering"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Excerpt</span>
          <textarea
            name="excerpt"
            defaultValue={post?.excerpt}
            required
            minLength={12}
            rows={4}
            className="field min-h-28 resize-y"
            placeholder="Write a short summary explaining what this article is about and why it matters."
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Body (Markdown)</span>
          <textarea
            name="content"
            defaultValue={post?.content}
            required
            minLength={32}
            rows={18}
            className="field min-h-72 resize-y font-mono text-sm"
            placeholder={"# Title\n\nWrite the full article in Markdown here."}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Tags</span>
          <input
            name="tags"
            defaultValue={post?.tags.join(", ")}
            className="field"
            placeholder="agent, workflow, reliability"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Status</span>
          <select
            name="status"
            className="field"
            defaultValue={post?.status ?? PostStatus.DRAFT}
          >
            <option value={PostStatus.DRAFT}>Draft</option>
            <option value={PostStatus.PUBLISHED}>Published</option>
            <option value={PostStatus.ARCHIVED}>Archived</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Published At</span>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalString(post?.publishedAt)}
            className="field"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Series</span>
          <select name="seriesId" className="field" defaultValue={post?.seriesId ?? ""}>
            <option value="">Standalone article</option>
            {seriesOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.featured ? "Featured · " : ""}
                {series.title}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Series Order</span>
          <input
            name="seriesOrder"
            type="number"
            min={1}
            max={999}
            defaultValue={post?.seriesOrder ?? ""}
            className="field"
            placeholder="1"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Cover Image URL</span>
          <input
            name="coverImageUrl"
            defaultValue={post?.coverImageUrl ?? ""}
            className="field"
            placeholder="https://images.example.com/cover.jpg"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
            <input
              name="pinned"
              type="checkbox"
              defaultChecked={post?.pinned}
              className="h-4 w-4 accent-[var(--gold)]"
            />
            Pin on homepage
          </label>

          <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={post?.featured}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Mark as featured
          </label>
        </div>

        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          If a published post is pinned, older pinned posts are automatically unpinned. Series order is optional and only used when this article belongs to a series.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
