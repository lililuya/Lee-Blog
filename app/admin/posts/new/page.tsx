import { PostForm } from "@/components/forms/post-form";
import { createPostAction } from "@/lib/actions/content-actions";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Posts</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建文章</h1>
      </div>
      <PostForm action={createPostAction} submitLabel="创建文章" />
    </div>
  );
}