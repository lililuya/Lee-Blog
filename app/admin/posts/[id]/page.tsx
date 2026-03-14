import { notFound } from "next/navigation";
import { deletePostAction, updatePostAction } from "@/lib/actions/content-actions";
import { PostForm } from "@/components/forms/post-form";
import { getAdminPostById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getAdminPostById(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Posts</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑文章</h1>
        </div>
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除文章
          </button>
        </form>
      </div>
      <PostForm action={updatePostAction} submitLabel="保存修改" post={post} />
    </div>
  );
}