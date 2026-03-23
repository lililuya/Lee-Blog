import { ChevronDown, CornerDownRight } from "lucide-react";
import { CommentHumanCheck } from "@/components/site/comment-human-check";
import { createCommentAction } from "@/lib/actions/content-actions";
import type { CurrentUser } from "@/lib/auth";
import { CommentFormGuard } from "@/components/site/comment-form-guard";
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
  humanCheckConfig?: {
    provider: "turnstile" | "hcaptcha";
    siteKey: string;
  } | null;
};

function renderStatusMessage(statusMessage: string | undefined) {
  switch (statusMessage) {
    case "approved":
      return "你的评论已通过自动审核，现在已经公开显示。";
    case "under-review":
      return "你的评论触发了审核规则，正在等待管理员处理。";
    case "policy-rejected":
      return "你的评论触发了严格审核规则，未被发布。";
    case "reply-approved":
      return "你的回复已通过自动审核，现在已经公开显示。";
    case "reply-under-review":
      return "你的回复已提交，正在等待管理员审核。";
    case "reply-rejected":
      return "你的回复触发了严格审核规则，未被自动发布。";
    case "reply-unavailable":
      return "要回复的目标已经不可用，请刷新页面后重试。";
    case "submitted":
      return "你的评论已提交，正在等待审核。";
    case "muted":
      return "当前账号已被禁言，暂时不能评论。";
    case "blocked":
      return "当前账号状态不允许发表评论。";
    case "verify-email":
      return "发表评论前，请先完成邮箱验证。";
    case "rate-limited":
      return "你的评论提交得有点快，请稍等几分钟再试。";
    case "duplicate":
      return "这条评论看起来和你刚刚提交的内容重复了。";
    case "spam-blocked":
      return "评论触发了反垃圾规则，请减少链接或推广性内容后重试。";
    case "submitted-too-fast":
      return "请在表单加载后稍等片刻再提交，这有助于拦截自动化垃圾评论。";
    case "human-check":
      return "提交前请先完成真人验证。";
    case "invalid":
      return "请填写必填项，并确保评论长度在允许范围内。";
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

function getAuthorInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "?";
}

function CommentAvatar({
  author,
  compact = false,
}: {
  author: CommentAuthor;
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "comment-thread-avatar",
        compact ? "comment-thread-avatar--compact" : null,
        author.isAdmin ? "comment-thread-avatar--admin" : null,
        author.isGuest ? "comment-thread-avatar--guest" : null,
      )}
    >
      {getAuthorInitials(author.name)}
    </div>
  );
}

function CommentAuthorBadge({ author }: { author: CommentAuthor }) {
  if (author.isAdmin) {
    return <span className="comment-thread-role-badge comment-thread-role-badge--admin">管理员</span>;
  }

  if (author.isGuest) {
    return <span className="comment-thread-role-badge comment-thread-role-badge--guest">访客</span>;
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
  humanCheckConfig,
  compact = false,
}: {
  postId: string;
  postSlug: string;
  parentId?: string | null;
  currentUser: CurrentUser;
  submitLabel: string;
  placeholder: string;
  websiteFieldId: string;
  replyToName?: string | null;
  humanCheckConfig?: {
    provider: "turnstile" | "hcaptcha";
    siteKey: string;
  } | null;
  compact?: boolean;
}) {
  const isGuest = !currentUser;

  return (
    <form action={createCommentAction} className={cn("space-y-5", compact ? "space-y-4" : null)}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="postSlug" value={postSlug} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <CommentFormGuard />
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
        <div className="comment-thread-note rounded-[1rem] border px-4 py-3 text-sm text-[var(--ink-soft)]">
          正在回复 <span className="font-semibold text-[var(--ink)]">@{replyToName}</span>
        </div>
      ) : null}

      {isGuest ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">昵称</span>
            <input
              name="guestName"
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              className="field"
              placeholder="你希望展示的名字"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">邮箱</span>
            <input
              name="guestEmail"
              type="email"
              autoComplete="email"
              className="field"
              placeholder="选填，仅自己和站点可见"
            />
          </label>
        </div>
      ) : (
        <div className="comment-thread-note rounded-[1rem] border px-4 py-3 text-sm text-[var(--ink-soft)]">
          当前身份：<span className="font-semibold text-[var(--ink)]">{currentUser.name}</span>
        </div>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">
          {parentId ? "回复" : "评论"}
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

      {isGuest && humanCheckConfig ? (
        <CommentHumanCheck
          provider={humanCheckConfig.provider}
          siteKey={humanCheckConfig.siteKey}
        />
      ) : null}

      {isGuest ? (
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          昵称会公开显示，邮箱不会公开，只会在审核或回复通知时使用。表单还包含一个静默时间校验，用来拦截机器人提交。
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          尽量写得具体、友善，也方便后来的读者继续跟进讨论。
        </p>
        <SubmitButton className="w-full sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function ReplyTrigger({
  postId,
  postSlug,
  currentUser,
  targetCommentId,
  targetName,
  humanCheckConfig,
}: {
  postId: string;
  postSlug: string;
  currentUser: CurrentUser;
  targetCommentId: string;
  targetName: string;
  humanCheckConfig?: {
    provider: "turnstile" | "hcaptcha";
    siteKey: string;
  } | null;
}) {
  return (
    <details className="comment-thread-reply-box overflow-hidden rounded-[1.1rem] border border-black/8">
      <summary className="comment-thread-reply-toggle flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--accent-strong)]">
        <span className="inline-flex items-center gap-2">
          <CornerDownRight className="h-4 w-4" />
          在此回复
        </span>
        <ChevronDown className="comment-thread-reply-toggle__chevron h-4 w-4" />
      </summary>
      <div className="comment-thread-reply-box__body px-4 py-4">
        <CommentComposer
          postId={postId}
          postSlug={postSlug}
          parentId={targetCommentId}
          currentUser={currentUser}
          submitLabel="提交回复"
          placeholder="补充你的想法或继续追问。"
          replyToName={targetName}
          websiteFieldId={`comment-website-${targetCommentId}`}
          humanCheckConfig={humanCheckConfig}
          compact
        />
      </div>
    </details>
  );
}

function CommentSurface({
  commentId,
  author,
  createdAt,
  content,
  replyToAuthorName,
  compact = false,
}: {
  commentId: string;
  author: CommentAuthor;
  createdAt: Date | string;
  content: string;
  replyToAuthorName?: string | null;
  compact?: boolean;
}) {
  return (
    <article
      id={`comment-${commentId}`}
      className={cn(
        compact
          ? "comment-thread-reply overflow-hidden rounded-[1.2rem] border border-black/8"
          : "comment-thread-card overflow-hidden rounded-[1.3rem] border border-black/8",
      )}
    >
      <div className={cn("comment-thread-card__header", compact ? "comment-thread-card__header--reply" : null)}>
        <div className="min-w-0 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-[var(--ink)]">{author.name}</span>
          <CommentAuthorBadge author={author} />
          <span className="text-[var(--ink-soft)]">{compact ? "回复了" : "发表了评论"}</span>
        </div>
        <a href={`#comment-${commentId}`} className="comment-thread-anchor">
          {formatDate(createdAt, "yyyy-MM-dd HH:mm")}
        </a>
      </div>

      <div className={cn("comment-thread-card__body", compact ? "comment-thread-card__body--reply" : null)}>
        {replyToAuthorName ? (
          <div className="comment-thread-target">
            <CornerDownRight className="h-3.5 w-3.5" />
            <span>
              回复给 <span className="font-semibold text-[var(--ink)]">@{replyToAuthorName}</span>
            </span>
          </div>
        ) : null}
        <p className="comment-thread-content text-sm leading-7 text-[var(--ink-soft)]">
          {content}
        </p>
      </div>
    </article>
  );
}

function CommentCard({
  comment,
  postId,
  postSlug,
  currentUser,
  canReply,
  humanCheckConfig,
}: {
  comment: ThreadedComment;
  postId: string;
  postSlug: string;
  currentUser: CurrentUser;
  canReply: boolean;
  humanCheckConfig?: {
    provider: "turnstile" | "hcaptcha";
    siteKey: string;
  } | null;
}) {
  return (
    <div className="comment-thread-item">
      <div className="comment-thread-avatar-column">
        <span className="comment-thread-avatar-rail" aria-hidden="true" />
        <CommentAvatar author={comment.author} />
      </div>
      <div className="min-w-0 space-y-4">
        <CommentSurface
          commentId={comment.id}
          author={comment.author}
          createdAt={comment.createdAt}
          content={comment.content}
        />

        {comment.replies.length > 0 ? (
          <div className="comment-thread-replies space-y-4">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="comment-thread-reply-item">
                <div className="comment-thread-avatar-column comment-thread-avatar-column--compact">
                  <span className="comment-thread-avatar-rail comment-thread-avatar-rail--compact" aria-hidden="true" />
                  <CommentAvatar author={reply.author} compact />
                </div>
                <div className="min-w-0 space-y-3">
                  <CommentSurface
                    commentId={reply.id}
                    author={reply.author}
                    createdAt={reply.createdAt}
                    content={reply.content}
                    replyToAuthorName={reply.replyToAuthorName}
                    compact
                  />

                  {canReply ? (
                    <ReplyTrigger
                      postId={postId}
                      postSlug={postSlug}
                      currentUser={currentUser}
                      targetCommentId={reply.id}
                      targetName={reply.author.name}
                      humanCheckConfig={humanCheckConfig}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {canReply ? (
          <div>
            <ReplyTrigger
              postId={postId}
              postSlug={postSlug}
              currentUser={currentUser}
              targetCommentId={comment.id}
              targetName={comment.author.name}
              humanCheckConfig={humanCheckConfig}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComposerShell({
  currentUser,
  title,
  description,
  children,
}: {
  currentUser: CurrentUser;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const author: CommentAuthor = currentUser
    ? {
        name: currentUser.name,
        isAdmin: true,
      }
    : {
        name: "访客",
        isGuest: true,
      };

  return (
    <article className="comment-thread-card comment-thread-composer overflow-hidden rounded-[1.3rem] border border-black/8">
      <div className="comment-thread-card__header">
        <div className="flex min-w-0 items-center gap-3">
          <CommentAvatar author={author} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
            <p className="text-xs leading-6 text-[var(--ink-soft)]">{description}</p>
          </div>
        </div>
      </div>
      <div className="comment-thread-composer__body p-5">
        <div className="comment-thread-editor rounded-[1.1rem] border border-black/8 bg-[var(--panel-elevated)] p-4 md:p-5">
          {children}
        </div>
      </div>
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
  humanCheckConfig = null,
}: CommentThreadProps) {
  const flashMessage = renderStatusMessage(statusMessage);
  const muted = currentUser ? isUserMuted(currentUser.mutedUntil) : false;
  const threadedComments = buildCommentThread(comments);
  const canReply = replyEnabled && !muted;
  const totalComments = comments.length;

  return (
    <section
      id={sectionId}
      className="comment-thread-shell scroll-mt-28 space-y-8 rounded-[2rem] border border-black/8 px-5 py-6 md:px-7 md:py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="section-kicker">评论</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">讨论区</h2>
          <p className="editorial-separator-copy">
            这里采用更接近 issue 时间线的排版，每条讨论都有清晰的作者头部、时间信息和单层可追踪的回复链。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge-soft">{totalComments} 条评论</span>
          <span className="badge-soft">{threadedComments.length} 个主题</span>
        </div>
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
              humanCheckConfig={humanCheckConfig}
            />
          ))
        ) : (
          <div className="comment-thread-empty rounded-[1.4rem] border border-dashed border-black/10 bg-[var(--panel-soft)] p-6 text-sm leading-7 text-[var(--ink-soft)]">
            这里还没有评论，你可以成为第一个参与讨论的人。
          </div>
        )}
      </div>

      {currentUser && muted ? (
        <div className="rounded-[1.4rem] border border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
          <p className="font-semibold text-[var(--ink)]">当前账号已被禁言</p>
          <p className="mt-2">
            {currentUser.mutedUntil
              ? `禁言至：${formatDate(currentUser.mutedUntil, "yyyy-MM-dd HH:mm")}`
              : "暂时无法获取禁言结束时间"}
          </p>
          {currentUser.muteReason ? <p>原因：{currentUser.muteReason}</p> : null}
        </div>
      ) : (
        <ComposerShell
          currentUser={currentUser}
          title={currentUser ? "以管理员身份回复" : "发表访客评论"}
          description={
            currentUser
              ? "管理员回复会直接发布，但仍然会经过同样的反垃圾校验。"
              : "欢迎留下你的问题、观点或补充。内容正常的评论会尽快显示，风险较高的评论会进入审核。"
          }
        >
          <CommentComposer
            postId={postId}
            postSlug={postSlug}
            currentUser={currentUser}
            submitLabel="提交评论"
            placeholder="写下你的问题、看法，或者有帮助的补充。"
            websiteFieldId={`comment-website-${postId}`}
            humanCheckConfig={humanCheckConfig}
          />
        </ComposerShell>
      )}
    </section>
  );
}
