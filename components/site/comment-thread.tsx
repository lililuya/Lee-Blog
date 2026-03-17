import Link from "next/link";
import { CornerDownRight, MessageSquareMore } from "lucide-react";
import { createCommentAction } from "@/lib/actions/content-actions";
import type { CurrentUser } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { isUserMuted } from "@/lib/user-state";
import { formatDate } from "@/lib/utils";

type CommentItem = {
  id: string;
  parentId?: string | null;
  content: string;
  createdAt: Date | string;
  author: { name: string };
};

type ThreadedReply = CommentItem & {
  replyToAuthorName?: string | null;
};

type ThreadedComment = CommentItem & {
  replies: ThreadedReply[];
};

type CommentThreadProps = {
  postId: string;
  postSlug: string;
  comments: CommentItem[];
  currentUser: CurrentUser;
  replyEnabled?: boolean;
  statusMessage?: string;
  sectionId?: string;
};

function renderStatusMessage(statusMessage: string | undefined) {
  switch (statusMessage) {
    case "approved":
      return "Your comment passed automatic moderation and is now live.";
    case "under-review":
      return "Your comment matched moderation rules and is being held for admin review.";
    case "policy-rejected":
      return "Your comment matched strict moderation rules and was not published.";
    case "reply-approved":
      return "Your reply passed automatic moderation and is now live.";
    case "reply-under-review":
      return "Your reply was submitted and is waiting for admin review.";
    case "reply-rejected":
      return "Your reply matched strict moderation rules and was not published automatically.";
    case "reply-unavailable":
      return "That reply target is no longer available. Please refresh the page and try again.";
    case "submitted":
      return "Your comment was submitted and is waiting for moderation review.";
    case "muted":
      return "Your account is currently muted from commenting.";
    case "blocked":
      return "Your current account state does not allow new comments.";
    case "verify-email":
      return "Please verify your email address before posting comments.";
    case "rate-limited":
      return "You are commenting a little too quickly. Please wait a few minutes and try again.";
    case "duplicate":
      return "This looks like a duplicate of a recent comment you already sent.";
    case "spam-blocked":
      return "The comment matched anti-spam rules. Please remove excessive links or promotional text and try again.";
    default:
      return null;
  }
}

function buildCommentThread(comments: CommentItem[]): ThreadedComment[] {
  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
  const repliesByParent = new Map<string, CommentItem[]>();

  for (const comment of comments) {
    if (!comment.parentId) {
      continue;
    }

    const currentReplies = repliesByParent.get(comment.parentId) ?? [];
    currentReplies.push(comment);
    repliesByParent.set(comment.parentId, currentReplies);
  }

  function collectDescendantIds(parentId: string, ids: Set<string>) {
    const directReplies = repliesByParent.get(parentId) ?? [];

    for (const reply of directReplies) {
      ids.add(reply.id);
      collectDescendantIds(reply.id, ids);
    }
  }

  return comments
    .filter((comment) => !comment.parentId)
    .map((comment) => {
      const descendantIds = new Set<string>();
      collectDescendantIds(comment.id, descendantIds);

      return {
        ...comment,
        replies: comments
          .filter((reply) => descendantIds.has(reply.id))
          .map((reply) => ({
            ...reply,
            replyToAuthorName: reply.parentId
              ? (commentsById.get(reply.parentId) ?? null)?.author.name ?? null
              : null,
          })),
      };
    });
}

function CommentComposer({
  postId,
  postSlug,
  parentId,
  label,
  submitLabel,
  placeholder,
  websiteFieldId,
}: {
  postId: string;
  postSlug: string;
  parentId?: string | null;
  label: string;
  submitLabel: string;
  placeholder: string;
  websiteFieldId: string;
}) {
  return (
    <form action={createCommentAction} className="space-y-4">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="postSlug" value={postSlug} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={websiteFieldId}>Website</label>
        <input
          id={websiteFieldId}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
        <textarea
          name="content"
          required
          minLength={6}
          maxLength={1200}
          rows={parentId ? 4 : 5}
          className="field min-h-28 resize-y"
          placeholder={placeholder}
        />
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

export function CommentThread({
  postId,
  postSlug,
  comments,
  currentUser,
  replyEnabled = true,
  statusMessage,
  sectionId,
}: CommentThreadProps) {
  const flashMessage = renderStatusMessage(statusMessage);
  const muted = currentUser ? isUserMuted(currentUser.mutedUntil) : false;
  const threadedComments = buildCommentThread(comments);
  const canReply = replyEnabled && Boolean(currentUser) && !muted;

  return (
    <section
      id={sectionId}
      className="comment-thread-shell scroll-mt-28 space-y-8 rounded-[2rem] border border-black/8 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      <div className="space-y-2">
        <p className="section-kicker">Comments</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">Discussion</h2>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">
          Reader comments are scanned automatically first. Clean comments can go live immediately,
          while risky ones are held for admin review. Direct replies are shown in one flattened
          layer so the discussion stays readable even when you answer another reply.
        </p>
      </div>

      {flashMessage ? (
        <div className="rounded-[1.4rem] border border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
          {flashMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {threadedComments.length > 0 ? (
          threadedComments.map((comment) => (
            <article
              key={comment.id}
              id={`comment-${comment.id}`}
              className="comment-thread-card rounded-[1.4rem] border border-black/8 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
                <span className="font-semibold text-[var(--ink)]">{comment.author.name}</span>
                <span>{formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}</span>
              </div>
              <p className="text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>

              {comment.replies.length > 0 ? (
                <div className="comment-thread-replies mt-5 space-y-3 border-l border-black/8 pl-4 md:pl-6">
                  {comment.replies.map((reply) => (
                    <article
                      key={reply.id}
                      id={`comment-${reply.id}`}
                      className="comment-thread-reply rounded-[1.2rem] border border-black/8 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
                        <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
                          <CornerDownRight className="h-4 w-4 text-[var(--accent-strong)]" />
                          {reply.author.name}
                        </span>
                        <span>{formatDate(reply.createdAt, "yyyy-MM-dd HH:mm")}</span>
                      </div>
                      {reply.replyToAuthorName ? (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          Replying to {reply.replyToAuthorName}
                        </p>
                      ) : null}
                      <p className="text-sm leading-7 text-[var(--ink-soft)]">{reply.content}</p>
                      {canReply ? (
                        <details className="comment-thread-reply-box mt-4 rounded-[1rem] border border-dashed border-black/10 p-3">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--accent-strong)]">
                            Reply to {reply.author.name}
                          </summary>
                          <div className="mt-3">
                            <CommentComposer
                              postId={postId}
                              postSlug={postSlug}
                              parentId={reply.id}
                              label={`Reply to ${reply.author.name}`}
                              submitLabel="Submit reply"
                              placeholder="Add a thoughtful follow-up to this reply."
                              websiteFieldId={`comment-website-${reply.id}`}
                            />
                          </div>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}

              {canReply ? (
                <details className="comment-thread-reply-box mt-5 rounded-[1.2rem] border border-dashed border-black/10 p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--accent-strong)]">
                    Reply to {comment.author.name}
                  </summary>
                  <div className="mt-4">
                    <CommentComposer
                      postId={postId}
                      postSlug={postSlug}
                      parentId={comment.id}
                      label={`Reply to ${comment.author.name}`}
                      submitLabel="Submit reply"
                      placeholder="Add a thoughtful follow-up to this comment."
                      websiteFieldId={`comment-website-${comment.id}`}
                    />
                  </div>
                </details>
              ) : null}
            </article>
          ))
        ) : (
          <div className="comment-thread-empty rounded-[1.4rem] border border-dashed border-black/10 p-6 text-sm leading-7 text-[var(--ink-soft)]">
            There are no comments yet. You can be the first one to join the discussion.
          </div>
        )}
      </div>

      {currentUser ? (
        muted ? (
          <div className="rounded-[1.4rem] border border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-semibold text-[var(--ink)]">This account is muted</p>
            <p className="mt-2">
              {currentUser.mutedUntil
                ? `Muted until: ${formatDate(currentUser.mutedUntil, "yyyy-MM-dd HH:mm")}`
                : "Mute end time unavailable"}
            </p>
            {currentUser.muteReason ? <p>Reason: {currentUser.muteReason}</p> : null}
          </div>
        ) : (
          <CommentComposer
            postId={postId}
            postSlug={postSlug}
            label="Leave a comment"
            submitLabel="Submit comment"
            placeholder="Share a question, a viewpoint, or a useful follow-up."
            websiteFieldId={`comment-website-${postId}`}
          />
        )
      ) : (
        <div className="comment-thread-signin rounded-[1.4rem] border border-black/8 p-5 text-sm leading-7 text-[var(--ink-soft)]">
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
