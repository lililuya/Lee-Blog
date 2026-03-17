import { CornerDownRight } from "lucide-react";
import { createCommentAction } from "@/lib/actions/content-actions";
import type { CurrentUser } from "@/lib/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { isUserMuted } from "@/lib/user-state";
import { cn, formatDate } from "@/lib/utils";

type CommentAuthor = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isGuest?: boolean;
};

type CommentItem = {
  id: string;
  parentId?: string | null;
  content: string;
  createdAt: Date | string;
  author: CommentAuthor;
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
    case "invalid":
      return "Please fill in the required fields and keep the comment within the allowed length.";
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

function CommentAuthorBadge({ author }: { author: CommentAuthor }) {
  if (author.isAdmin) {
    return (
      <span className="rounded-full bg-[rgba(27,107,99,0.12)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)]">
        Admin
      </span>
    );
  }

  if (author.isGuest) {
    return (
      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        Guest
      </span>
    );
  }

  return null;
}

function CommentComposer({
  postId,
  postSlug,
  parentId,
  currentUser,
  submitLabel,
  placeholder,
  websiteFieldId,
  replyToName,
}: {
  postId: string;
  postSlug: string;
  parentId?: string | null;
  currentUser: CurrentUser;
  submitLabel: string;
  placeholder: string;
  websiteFieldId: string;
  replyToName?: string | null;
}) {
  const isGuest = !currentUser;

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

      {replyToName ? (
        <div className="rounded-[1rem] border border-black/8 bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          Replying to <span className="font-semibold text-[var(--ink)]">@{replyToName}</span>
        </div>
      ) : null}

      {isGuest ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Name</span>
            <input
              name="guestName"
              required
              minLength={2}
              maxLength={60}
              className="field"
              placeholder="How should your name appear?"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
            <input
              name="guestEmail"
              type="email"
              className="field"
              placeholder="Optional, kept private"
            />
          </label>
        </div>
      ) : (
        <div className="rounded-[1rem] border border-black/8 bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
          Posting as <span className="font-semibold text-[var(--ink)]">{currentUser.name}</span>
        </div>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">
          {parentId ? "Reply" : "Comment"}
        </span>
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

      {isGuest ? (
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          Your name is public. Email stays private and is only used for moderation or reply
          follow-ups when available.
        </p>
      ) : null}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

function ReplyTrigger({
  postId,
  postSlug,
  currentUser,
  targetCommentId,
  targetName,
}: {
  postId: string;
  postSlug: string;
  currentUser: CurrentUser;
  targetCommentId: string;
  targetName: string;
}) {
  return (
    <details className="comment-thread-reply-box rounded-[1rem] border border-dashed border-black/10 p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--accent-strong)]">
        Reply
      </summary>
      <div className="mt-3">
        <CommentComposer
          postId={postId}
          postSlug={postSlug}
          parentId={targetCommentId}
          currentUser={currentUser}
          submitLabel="Submit reply"
          placeholder="Add a thoughtful follow-up."
          replyToName={targetName}
          websiteFieldId={`comment-website-${targetCommentId}`}
        />
      </div>
    </details>
  );
}

function CommentCard({
  comment,
  postId,
  postSlug,
  currentUser,
  canReply,
}: {
  comment: ThreadedComment;
  postId: string;
  postSlug: string;
  currentUser: CurrentUser;
  canReply: boolean;
}) {
  return (
    <article
      id={`comment-${comment.id}`}
      className="comment-thread-card rounded-[1.4rem] border border-black/8 bg-[var(--panel-soft)] p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--ink)]">{comment.author.name}</span>
          <CommentAuthorBadge author={comment.author} />
        </div>
        <span>{formatDate(comment.createdAt, "yyyy-MM-dd HH:mm")}</span>
      </div>
      <p className="text-sm leading-7 text-[var(--ink-soft)]">{comment.content}</p>

      {comment.replies.length > 0 ? (
        <div className="comment-thread-replies mt-5 space-y-3 border-l border-black/8 pl-4 md:pl-6">
          {comment.replies.map((reply) => (
            <article
              key={reply.id}
              id={`comment-${reply.id}`}
              className="comment-thread-reply rounded-[1.2rem] border border-black/8 bg-[var(--panel-soft)] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--ink-soft)]">
                <div className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <CornerDownRight className="h-4 w-4 text-[var(--accent-strong)]" />
                  <span>{reply.author.name}</span>
                  <CommentAuthorBadge author={reply.author} />
                </div>
                <span>{formatDate(reply.createdAt, "yyyy-MM-dd HH:mm")}</span>
              </div>

              {reply.replyToAuthorName ? (
                <p className="mb-2 text-xs font-medium text-[var(--ink-soft)]">
                  @{reply.replyToAuthorName}
                </p>
              ) : null}

              <p className="text-sm leading-7 text-[var(--ink-soft)]">{reply.content}</p>

              {canReply ? (
                <div className="mt-4">
                  <ReplyTrigger
                    postId={postId}
                    postSlug={postSlug}
                    currentUser={currentUser}
                    targetCommentId={reply.id}
                    targetName={reply.author.name}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {canReply ? (
        <div className="mt-5">
          <ReplyTrigger
            postId={postId}
            postSlug={postSlug}
            currentUser={currentUser}
            targetCommentId={comment.id}
            targetName={comment.author.name}
          />
        </div>
      ) : null}
    </article>
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
  const canReply = replyEnabled && !muted;

  return (
    <section
      id={sectionId}
      className="comment-thread-shell scroll-mt-28 space-y-8 rounded-[2rem] border border-black/8 bg-[var(--panel)] p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      <div className="space-y-2">
        <p className="section-kicker">Comments</p>
        <h2 className="font-serif text-3xl font-semibold tracking-tight">Discussion</h2>
        <p className="text-sm leading-7 text-[var(--ink-soft)]">
          Guest comments are welcome. Every submission goes through anti-spam checks first, and
          replies stay in a single readable layer with clear @-mentions.
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
            <CommentCard
              key={comment.id}
              comment={comment}
              postId={postId}
              postSlug={postSlug}
              currentUser={currentUser}
              canReply={canReply}
            />
          ))
        ) : (
          <div className="comment-thread-empty rounded-[1.4rem] border border-dashed border-black/10 bg-[var(--panel-soft)] p-6 text-sm leading-7 text-[var(--ink-soft)]">
            There are no comments yet. You can be the first one to join the discussion.
          </div>
        )}
      </div>

      {currentUser && muted ? (
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
        <div
          className={cn(
            "rounded-[1.4rem] border border-black/8 p-5",
            currentUser ? "bg-[var(--panel-soft)]" : "bg-[var(--panel-soft)]",
          )}
        >
          <div className="mb-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {currentUser ? "Leave a reply as admin" : "Leave a guest comment"}
            </p>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              {currentUser
                ? "Admin replies publish immediately, but the same anti-spam checks still apply."
                : "Share a thoughtful question or viewpoint. Clean comments can go live immediately, while risky ones wait for admin review."}
            </p>
          </div>

          <CommentComposer
            postId={postId}
            postSlug={postSlug}
            currentUser={currentUser}
            submitLabel="Submit comment"
            placeholder="Share a question, a viewpoint, or a useful follow-up."
            websiteFieldId={`comment-website-${postId}`}
          />
        </div>
      )}
    </section>
  );
}
