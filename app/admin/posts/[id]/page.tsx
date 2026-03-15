import { notFound } from "next/navigation";
import { RevisionHistory } from "@/components/admin/revision-history";
import { PostForm } from "@/components/forms/post-form";
import {
  deletePostAction,
  restorePostRevisionAction,
  updatePostAction,
} from "@/lib/actions/content-actions";
import {
  getAdminPostById,
  getAdminPostRevisionHistory,
  getAdminSeriesOptions,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function resolveRevisionFeedback(value: string | undefined) {
  if (value === "restored") {
    return {
      tone: "success" as const,
      message: "Revision restored. A fresh checkpoint was also saved for the restored state.",
    };
  }

  if (value === "missing") {
    return {
      tone: "error" as const,
      message: "That revision could not be found. Refresh the page and try again.",
    };
  }

  return null;
}

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id } = await params;
  const [{ revision }, post, revisions, seriesOptions] = await Promise.all([
    searchParams,
    getAdminPostById(id),
    getAdminPostRevisionHistory(id),
    getAdminSeriesOptions(),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Posts</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit article</h1>
        </div>
        <form action={deletePostAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            Delete article
          </button>
        </form>
      </div>

      <PostForm action={updatePostAction} submitLabel="Save changes" post={post} seriesOptions={seriesOptions} />

      <RevisionHistory
        title="Post revisions"
        description="Every save creates a checkpoint, so you can roll this article back to an earlier version without losing the current state."
        itemIdField="postId"
        itemId={post.id}
        feedback={resolveRevisionFeedback(revision)}
        revisions={revisions}
        restoreAction={restorePostRevisionAction}
      />
    </div>
  );
}
