import Link from "next/link";
import { MessageSquareMore } from "lucide-react";
import { createCommentAction } from "@/lib/actions/content-actions";
import type { CurrentUser } from "@/lib/auth";
import { isUserMuted } from "@/lib/user-state";
import { formatDate } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/submit-button";

type CommentThreadProps = {
  postId: string;
  postSlug: string;
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date | string;
    author: { name: string };
  }>;
  currentUser: CurrentUser;
  statusMessage?: string;
  sectionId?: string;
};

function renderStatusMessage(statusMessage: string | undefined) {
  switch (statusMessage) {
    case "submitted":
      return "Your comment was submitted. Reader comments stay pending until an admin approves them.";
    case "muted":
      return "Your account is currently muted from commenting.";
    case "blocked":
      return "Your current account state does not allow new comments.";
    default:
      return null;
  }
}

export function CommentThread({
  postId,
  postSlug,
  comments,
  currentUser,
  statusMessage,
  sectionId,
}: CommentThreadProps) {
  const flashMessage = renderStatusMessage(statusMessage);
  const muted = currentUser ? isUserMuted(currentUser.mutedUntil) : false;

  return (
    <section
      id={sectionId}
      className="scroll-mt-28 space-y-8 rounded-[2rem] border border-black/8 bg-white/72 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      <div className="space-y-2">
        <p className="section-kicker">Comments</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">Discussion</h2>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">
          读者评论默认情况下需要经过审核。管理员的评论则会立即发布，以保持讨论的高质量
        </p>
      </div>

      {flashMessage ? (
        <div className="rounded-[1.4rem] border border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
          {flashMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">{comment.author.name}</span>
                <span>{formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}</span>
              </div>
              <p className="text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>
            </article>
          ))
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-black/10 bg-white/55 p-6 text-sm leading-7 text-[var(--ink-soft)]">
            There are no comments yet. You can be the first one to join the discussion.
          </div>
        )}
      </div>

      {currentUser ? (
        muted ? (
          <div className="rounded-[1.4rem] border border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-semibold text-[var(--ink)]">This account is muted</p>
            <p className="mt-2">
              {currentUser.mutedUntil ? `Muted until: ${formatDate(currentUser.mutedUntil, "yyyy-MM-dd HH:mm")}` : "Mute end time unavailable"}
            </p>
            {currentUser.muteReason ? <p>Reason: {currentUser.muteReason}</p> : null}
          </div>
        ) : (
          <form action={createCommentAction} className="space-y-4">
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="postSlug" value={postSlug} />
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">Leave a comment</span>
              <textarea
                name="content"
                required
                minLength={6}
                rows={5}
                className="field min-h-32 resize-y"
                placeholder="Share a question, a viewpoint, or a useful follow-up."
              />
            </label>
            <SubmitButton>Submit comment</SubmitButton>
          </form>
        )
      ) : (
        <div className="rounded-[1.4rem] border border-black/8 bg-[rgba(27,107,99,0.05)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
          Sign in to leave a comment and join the discussion.
          <Link
            href={`/login?next=/blog/${postSlug}`}
            className="ml-2 inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            <MessageSquareMore className="h-4 w-4" />
            Sign in
          </Link>
        </div>
      )}
    </section>
  );
}