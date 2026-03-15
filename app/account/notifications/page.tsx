import Link from "next/link";
import { ArrowLeft, BellRing, CheckCheck } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  markAllUserNotificationsReadAction,
  markUserNotificationReadAction,
  openUserNotificationAction,
} from "@/lib/actions/notification-actions";
import { requireUser } from "@/lib/auth";
import { getUnreadNotificationCount, getUserNotifications } from "@/lib/user-notifications";

export const dynamic = "force-dynamic";

type NotificationsPageSearchParams = {
  status?: string;
};

function resolveNotificationsFeedback(searchParams: NotificationsPageSearchParams) {
  if (searchParams.status === "read") {
    return {
      tone: "success" as const,
      message: "Notification marked as read.",
    };
  }

  if (searchParams.status === "all-read") {
    return {
      tone: "success" as const,
      message: "All notifications are marked as read.",
    };
  }

  return null;
}

function FeedbackBanner({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      }
    >
      {message}
    </div>
  );
}

export default async function AccountNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<NotificationsPageSearchParams>;
}) {
  const [currentUser, resolvedSearchParams] = await Promise.all([requireUser(), searchParams]);
  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(currentUser.id, { limit: 50 }),
    getUnreadNotificationCount(currentUser.id),
  ]);
  const feedback = resolveNotificationsFeedback(resolvedSearchParams);

  return (
    <div className="container-shell py-12 md:py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/account"
          className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account
        </Link>

        {unreadCount > 0 ? (
          <form action={markAllUserNotificationsReadAction}>
            <button type="submit" className="btn-secondary">
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      <section className="rounded-[2.4rem] border border-black/8 bg-white/84 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="section-kicker">Inbox</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Notifications</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Comment moderation, replies, and publishing events that need your attention are collected here.
            </p>
          </div>

          <div className="flex min-w-[12rem] items-center gap-4 rounded-[1.8rem] border border-black/8 bg-[rgba(255,255,255,0.64)] px-5 py-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Unread
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{unreadCount}</p>
            </div>
          </div>
        </div>

        {feedback ? <div className="mt-6"><FeedbackBanner tone={feedback.tone} message={feedback.message} /></div> : null}

        {notifications.length === 0 ? (
          <div className="mt-8 rounded-[1.8rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.52)] px-6 py-10 text-center">
            <p className="text-lg font-semibold text-[var(--ink)]">Your inbox is empty.</p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
              New comment reviews, replies, and related account events will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={
                  notification.isRead
                    ? "rounded-[1.8rem] border border-black/8 bg-[rgba(255,255,255,0.62)] p-5"
                    : "rounded-[1.8rem] border border-[rgba(27,107,99,0.2)] bg-[rgba(27,107,99,0.08)] p-5 shadow-[0_18px_34px_rgba(16,69,63,0.08)]"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-[var(--ink)]">{notification.title}</h2>
                      <span
                        className={
                          notification.isRead
                            ? "badge-soft bg-black/5 text-[var(--ink-soft)]"
                            : "badge-soft"
                        }
                      >
                        {notification.isRead ? "Read" : "Unread"}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">{notification.body}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                      {notification.createdAt.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {notification.href ? (
                      <form action={openUserNotificationAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <SubmitButton className="px-5">Open</SubmitButton>
                      </form>
                    ) : null}

                    {!notification.isRead ? (
                      <form action={markUserNotificationReadAction}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button type="submit" className="btn-secondary">
                          Mark read
                        </button>
                      </form>
                    ) : notification.href ? (
                      <Link href={notification.href} className="section-link-pill section-link-pill--compact">
                        Open target
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
