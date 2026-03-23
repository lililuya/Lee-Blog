import { PostStatus } from "@prisma/client";
import { ContentQualityChecklist } from "@/components/forms/content-quality-checklist";
import { DraftAutosave } from "@/components/forms/draft-autosave";
import {
  PaperHighlightInserter,
  type PaperHighlightInsertItem,
} from "@/components/forms/paper-highlight-inserter";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  COMMON_CONTENT_LANGUAGE_OPTIONS,
  DEFAULT_CONTENT_LANGUAGE,
  formatContentLanguageLabel,
} from "@/lib/content-language";

type PostFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
  seriesOptions?: Array<{
    id: string;
    title: string;
    featured?: boolean;
  }>;
  categoryOptions?: string[];
  localizationOptions?: Array<{
    id: string;
    title: string;
    slug: string;
    language: string;
    status: PostStatus;
    publishedAt: Date | null;
  }>;
  paperHighlightCards?: PaperHighlightInsertItem[];
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    language: string;
    tags: string[];
    status: PostStatus;
    pinned: boolean;
    featured: boolean;
    coverImageUrl: string | null;
    seriesId?: string | null;
    seriesOrder?: number | null;
    translationOfId?: string | null;
    publishedAt: Date | null;
  } | null;
};

const POST_DRAFT_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "content",
  "category",
  "language",
  "tags",
  "status",
  "publishedAt",
  "coverImageUrl",
  "seriesId",
  "seriesOrder",
  "translationOfId",
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
  categoryOptions = [],
  localizationOptions = [],
  paperHighlightCards = [],
  post,
}: PostFormProps) {
  const formId = post ? `post-form-${post.id}` : "post-form-new";
  const storageKey = post ? `draft:post:${post.id}` : "draft:post:new";
  const categoryDatalistId = `${formId}-category-options`;

  return (
    <form
      id={formId}
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}

      <DraftAutosave formId={formId} storageKey={storageKey} fields={POST_DRAFT_FIELDS} />

      <ContentQualityChecklist
        formId={formId}
        kind="post"
        initialData={{
          title: post?.title ?? "",
          summary: post?.excerpt ?? "",
          content: post?.content ?? "",
          category: post?.category ?? "",
          tags: post?.tags ?? [],
          status: post?.status ?? PostStatus.DRAFT,
          publishedAt: toDateTimeLocalString(post?.publishedAt),
          coverImageUrl: post?.coverImageUrl ?? "",
        }}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标题</span>
          <input
            name="title"
            defaultValue={post?.title}
            required
            className="field"
            placeholder="例如：用 LLM 工具搭建稳定的研究博客工作流"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={post?.slug}
            className="field"
            placeholder="留空则根据标题自动生成"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">分类</span>
          <input
            name="category"
            list={categoryOptions.length > 0 ? categoryDatalistId : undefined}
            defaultValue={post?.category}
            required
            className="field"
            placeholder="例如：AI 工程"
          />
          {categoryOptions.length > 0 ? (
            <datalist id={categoryDatalistId}>
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          ) : null}
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            尽量复用已有分类；如果这篇文章开启了新的主题线，也可以直接输入新分类。
          </p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">摘要</span>
          <textarea
            name="excerpt"
            defaultValue={post?.excerpt}
            required
            minLength={12}
            rows={4}
            className="field min-h-28 resize-y"
            placeholder="写一段简短摘要，说明这篇文章讲什么，以及它为什么重要。"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">正文（Markdown）</span>
          <textarea
            name="content"
            defaultValue={post?.content}
            required
            minLength={32}
            rows={18}
            className="field min-h-72 resize-y font-mono text-sm"
            placeholder={"# 标题\n\n在这里继续撰写完整文章的 Markdown 正文。"}
          />
        </label>

        <div className="md:col-span-2">
          <PaperHighlightInserter formId={formId} items={paperHighlightCards} />
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标签</span>
          <input
            name="tags"
            defaultValue={post?.tags.join(", ")}
            className="field"
            placeholder="例如：agent, workflow, reliability"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">语言</span>
          <input
            name="language"
            list="post-language-options"
            defaultValue={post?.language ?? DEFAULT_CONTENT_LANGUAGE}
            className="field"
            placeholder="例如：zh-CN"
          />
          <datalist id="post-language-options">
            {COMMON_CONTENT_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">翻译对应原文</span>
          <select
            name="translationOfId"
            className="field"
            defaultValue={post?.translationOfId ?? ""}
          >
            <option value="">原创或独立文章</option>
            {localizationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} ({formatContentLanguageLabel(option.language)})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">状态</span>
          <select
            name="status"
            className="field"
            defaultValue={post?.status ?? PostStatus.DRAFT}
          >
            <option value={PostStatus.DRAFT}>草稿</option>
            <option value={PostStatus.PUBLISHED}>已发布</option>
            <option value={PostStatus.ARCHIVED}>已归档</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">发布时间</span>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalString(post?.publishedAt)}
            className="field"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">所属专题</span>
          <select name="seriesId" className="field" defaultValue={post?.seriesId ?? ""}>
            <option value="">独立文章</option>
            {seriesOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.featured ? "精选专题 · " : ""}
                {series.title}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">专题顺序</span>
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
          <span className="text-sm font-semibold text-[var(--ink)]">封面图 URL</span>
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
            固定到首页
          </label>

          <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={post?.featured}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            标记为精选
          </label>
        </div>

        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          如果一篇已发布文章被固定到首页，之前的旧置顶文章会自动取消置顶。专题顺序是可选项，
          只有当这篇文章属于某个专题时才会生效。如果这是一篇译文，请在“翻译对应原文”里选择原始文章，
          这样读者就能在公开页面上切换语言版本。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
