import { notFound } from "next/navigation";
import { RevisionHistory } from "@/components/admin/revision-history";
import { PostForm } from "@/components/forms/post-form";
import { requireAdmin } from "@/lib/auth";
import {
  deletePostAction,
  restorePostRevisionAction,
  updatePostAction,
} from "@/lib/actions/content-actions";
import {
  getAdminPostById,
  getAdminPostCategoryOptions,
  getAdminPostLocalizationOptions,
  getAdminPostRevisionHistory,
  getAdminSeriesOptions,
} from "@/lib/queries";
import { getPaperHighlightInsertionsForUser } from "@/lib/paper-library-queries";

export const dynamic = "force-dynamic";

function resolveRevisionFeedback(value: string | undefined) {
  if (value === "restored") {
    return {
      tone: "success" as const,
      message: "修订版本已恢复，系统也为恢复后的内容重新保存了一个新快照。",
    };
  }

  if (value === "missing") {
    return {
      tone: "error" as const,
      message: "未找到对应修订版本，请刷新页面后重试。",
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
  const adminPromise = requireAdmin();
  const [{ revision }, post, revisions, seriesOptions, categoryOptions, localizationOptions, admin] = await Promise.all([
    searchParams,
    getAdminPostById(id),
    getAdminPostRevisionHistory(id),
    getAdminSeriesOptions(),
    getAdminPostCategoryOptions(),
    getAdminPostLocalizationOptions(id),
    adminPromise,
  ]);
  const paperHighlightCards = await getPaperHighlightInsertionsForUser(admin.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">文章</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑文章</h1>
        </div>
        <form
          action={deletePostAction}
          data-confirm-message="确认删除这篇文章吗？它会从公开博客中移除。"
        >
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除文章
          </button>
        </form>
      </div>

        <PostForm
          action={updatePostAction}
          submitLabel="保存更改"
          confirmMessage="确认保存这篇文章的更改吗？系统会更新后台记录，并创建一个新的修订快照。"
          post={post}
          seriesOptions={seriesOptions}
          categoryOptions={categoryOptions}
          localizationOptions={localizationOptions}
          paperHighlightCards={paperHighlightCards}
        />

      <RevisionHistory
        title="文章修订历史"
        description="每次保存都会创建一个检查点，所以你可以把文章恢复到更早的版本，同时不会丢失当前状态。"
        itemIdField="postId"
        itemId={post.id}
        feedback={resolveRevisionFeedback(revision)}
        revisions={revisions}
        restoreAction={restorePostRevisionAction}
      />
    </div>
  );
}
