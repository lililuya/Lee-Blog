import { moderateCommentAction } from "@/lib/actions/content-actions";
import { getAdminComments } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const comments = await getAdminComments();

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Comments</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Comment Moderation</h1>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="text-sm text-[var(--ink-soft)]">
                  <span className="font-semibold text-[var(--ink)]">{comment.author.name}</span>
                  <span className="mx-2">·</span>
                  <span>{comment.author.email}</span>
                  <span className="mx-2">·</span>
                  <span>{formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}</span>
                </div>
                <div className="text-sm font-semibold text-[var(--accent-strong)]">Post: {comment.post.title}</div>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <span className="badge-soft">{comment.status}</span>
                <div className="flex flex-wrap gap-2">
                  <form action={moderateCommentAction}>
                    <input type="hidden" name="commentId" value={comment.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button type="submit" className="btn-secondary">Approve</button>
                  </form>
                  <form action={moderateCommentAction}>
                    <input type="hidden" name="commentId" value={comment.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button type="submit" className="btn-secondary text-rose-700">Reject</button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}