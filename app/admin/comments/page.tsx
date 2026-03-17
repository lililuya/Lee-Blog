import Link from "next/link";
import { deleteCommentAction, moderateCommentAction } from "@/lib/actions/content-actions";
import { getAdminComments } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const comments = await getAdminComments();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Comments</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Comment Moderation</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            New reader comments can trigger email alerts for admins, and approving or rejecting a
            comment also emails the author when mail delivery is available.
          </p>
        </div>
        <Link href="/admin/comments/rules" className="btn-secondary self-start md:self-auto">
          Manage comment rules
        </Link>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => {
          const moderationMatches = comment.moderationMatches ?? [];

          return (
            <article
              key={comment.id}
              className="rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="text-sm text-[var(--ink-soft)]">
                    <span className="font-semibold text-[var(--ink)]">{comment.author.name}</span>
                    <span className="mx-2">/</span>
                    <span>{comment.author.email}</span>
                    <span className="mx-2">/</span>
                    <span>{formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--accent-strong)]">
                    Post: {comment.post.title}
                  </div>
                  {comment.parent ? (
                    <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                        Reply Context
                      </div>
                      <p className="mt-2">
                        Reply to{" "}
                        <span className="font-semibold text-[var(--ink)]">
                          {comment.parent.author.name}
                        </span>
                      </p>
                      <p className="mt-1 break-words">{comment.parent.content}</p>
                    </div>
                  ) : null}
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>

                  {comment.moderationNotes || moderationMatches.length > 0 ? (
                    <div className="rounded-[1.2rem] border border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                        Auto Review
                      </div>
                      {comment.moderationNotes ? (
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          {comment.moderationNotes}
                        </p>
                      ) : null}
                      {moderationMatches.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {moderationMatches.map((match) => (
                            <span
                              key={`${comment.id}-${match}`}
                              className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]"
                            >
                              {match}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
                  <span className="badge-soft">{comment.status}</span>

                  {comment.status === "PENDING" ? (
                    <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
                      <form
                        action={moderateCommentAction}
                        data-confirm-message="Approve this comment? It will become visible on the site immediately."
                      >
                        <input type="hidden" name="commentId" value={comment.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <button type="submit" className="btn-secondary w-full">
                          Approve
                        </button>
                      </form>
                      <form
                        action={moderateCommentAction}
                        data-confirm-message="Reject this comment? The author will see it as rejected and it will stay hidden."
                      >
                        <input type="hidden" name="commentId" value={comment.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <button type="submit" className="btn-secondary w-full text-rose-700">
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : null}

                  <form
                    action={deleteCommentAction}
                    data-confirm-message="Delete this comment permanently? This also removes its discussion context from the site."
                    className="w-full md:w-auto"
                  >
                    <input type="hidden" name="commentId" value={comment.id} />
                    <button type="submit" className="btn-secondary w-full text-rose-700">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
