import { PostStatus } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";

type PostFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    status: PostStatus;
    featured: boolean;
    coverImageUrl: string | null;
    publishedAt: Date | null;
  } | null;
};

function toDateTimeLocalString(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function PostForm({ action, submitLabel, post }: PostFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标题</span>
          <input name="title" defaultValue={post?.title} required className="field" placeholder="例如：面向研究型博客的全栈内容系统设计" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={post?.slug} className="field" placeholder="留空时将根据标题自动生成" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">分类</span>
          <input name="category" defaultValue={post?.category} required className="field" placeholder="AI Engineering" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">摘要</span>
          <textarea name="excerpt" defaultValue={post?.excerpt} required minLength={12} rows={4} className="field min-h-28 resize-y" placeholder="用 2-3 句话说明这篇文章的核心价值。" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">正文（Markdown）</span>
          <textarea name="content" defaultValue={post?.content} required minLength={32} rows={18} className="field min-h-72 resize-y font-mono text-sm" placeholder="# 标题\n\n在这里使用 Markdown 撰写正文。" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标签（英文逗号分隔）</span>
          <input name="tags" defaultValue={post?.tags.join(", ")} className="field" placeholder="AI, Workflow, Reliability" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">状态</span>
          <select name="status" className="field" defaultValue={post?.status ?? PostStatus.DRAFT}>
            <option value={PostStatus.DRAFT}>草稿</option>
            <option value={PostStatus.PUBLISHED}>已发布</option>
            <option value={PostStatus.ARCHIVED}>已归档</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">发布时间</span>
          <input name="publishedAt" type="datetime-local" defaultValue={toDateTimeLocalString(post?.publishedAt)} className="field" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">封面图 URL</span>
          <input name="coverImageUrl" defaultValue={post?.coverImageUrl ?? ""} className="field" placeholder="https://images.example.com/cover.jpg" />
        </label>
      </div>
      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input name="featured" type="checkbox" defaultChecked={post?.featured} className="h-4 w-4 accent-[var(--accent)]" />
        设为首页精选文章
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}