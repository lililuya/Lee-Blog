import Link from "next/link";
import { ArrowLeft, BellRing, Trash2 } from "lucide-react";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  beginTwoFactorSetupAction,
  cancelTwoFactorSetupAction,
  changePasswordAction,
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
  removeAvatarAction,
  updateCommentNotificationSettingsAction,
  updateEmailPostNotificationsAction,
  uploadAvatarAction,
} from "@/lib/actions/account-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTwoFactorOtpauthUri, formatTwoFactorSecret } from "@/lib/two-factor";
import { avatarMaxUploadLabel } from "@/lib/upload-config";
import { getUnreadNotificationCount, getUserNotifications } from "@/lib/user-notifications";

export const dynamic = "force-dynamic";

type AccountPageSearchParams = {
  saved?: string;
  removed?: string;
  error?: string;
  password?: string;
  updates?: string;
  comments?: string;
  security?: string;
};

function resolveAvatarFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.saved) {
    return {
      tone: "success" as const,
      message: "Avatar updated. The new image should appear anywhere your profile badge is shown.",
    };
  }

  if (searchParams.removed) {
    return {
      tone: "success" as const,
      message: "Avatar removed. The site will fall back to your initials.",
    };
  }

  if (searchParams.error === "no-file") {
    return {
      tone: "error" as const,
      message: "Choose an image file before submitting.",
    };
  }

  if (searchParams.error === "file-too-large") {
    return {
      tone: "error" as const,
      message: `Avatar files must be ${avatarMaxUploadLabel} or smaller.`,
    };
  }

  if (searchParams.error === "invalid-type") {
    return {
      tone: "error" as const,
      message: "Only PNG, JPG/JPEG, and WEBP images are supported.",
    };
  }

  if (searchParams.error === "database") {
    return {
      tone: "error" as const,
      message: "The database is currently unavailable, so avatar changes could not be saved.",
    };
  }

  return null;
}

function resolvePasswordFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.password === "updated") {
    return {
      tone: "success" as const,
      message: "Password updated. Other active sessions were signed out.",
    };
  }

  if (searchParams.password === "invalid-current") {
    return {
      tone: "error" as const,
      message: "The current password you entered is incorrect.",
    };
  }

  if (searchParams.password === "same") {
    return {
      tone: "error" as const,
      message: "Choose a new password that is different from the current one.",
    };
  }

  if (searchParams.password === "invalid") {
    return {
      tone: "error" as const,
      message: "Please complete all password fields and make sure the new passwords match.",
    };
  }

  if (searchParams.password === "database") {
    return {
      tone: "error" as const,
      message: "The database is currently unavailable, so the password could not be updated.",
    };
  }

  if (searchParams.password === "error") {
    return {
      tone: "error" as const,
      message: "The password could not be updated right now. Please try again.",
    };
  }

  return null;
}

function resolveUpdatesFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.updates === "enabled") {
    return {
      tone: "success" as const,
      message: "New post email updates are enabled for this account.",
    };
  }

  if (searchParams.updates === "disabled") {
    return {
      tone: "success" as const,
      message: "New post email updates are paused for this account.",
    };
  }

  if (searchParams.updates === "database") {
    return {
      tone: "error" as const,
      message: "The database is currently unavailable, so the email preference could not be saved.",
    };
  }

  return null;
}

function resolveCommentNotificationFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.comments === "updated") {
    return {
      tone: "success" as const,
      message: "Comment notification preferences were updated.",
    };
  }

  if (searchParams.comments === "database") {
    return {
      tone: "error" as const,
      message: "The database is currently unavailable, so comment notification preferences could not be saved.",
    };
  }

  return null;
}

function resolveSecurityFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.security === "setup") {
    return {
      tone: "success" as const,
      message: "Authenticator setup started. Add the key below in your authenticator app, then enter the 6-digit code to finish enabling 2FA.",
    };
  }

  if (searchParams.security === "setup-cancelled") {
    return {
      tone: "success" as const,
      message: "Pending 2FA setup was cancelled.",
    };
  }

  if (searchParams.security === "enabled") {
    return {
      tone: "success" as const,
      message: "Two-factor authentication is now enabled for admin sign-in.",
    };
  }

  if (searchParams.security === "disabled") {
    return {
      tone: "success" as const,
      message: "Two-factor authentication has been turned off for this account.",
    };
  }

  if (searchParams.security === "invalid-code") {
    return {
      tone: "error" as const,
      message: "That authenticator code was not valid. Please try the latest 6-digit code.",
    };
  }

  if (searchParams.security === "invalid-password") {
    return {
      tone: "error" as const,
      message: "The current password you entered was incorrect.",
    };
  }

  if (searchParams.security === "setup-missing") {
    return {
      tone: "error" as const,
      message: "No pending 2FA setup was found. Start a new setup to continue.",
    };
  }

  if (searchParams.security === "database") {
    return {
      tone: "error" as const,
      message: "The database is currently unavailable, so 2FA settings could not be updated.",
    };
  }

  if (searchParams.security === "admin-only") {
    return {
      tone: "error" as const,
      message: "Two-factor authentication management is currently reserved for admin accounts.",
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

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<AccountPageSearchParams>;
}) {
  const [currentUser, resolvedSearchParams] = await Promise.all([requireUser(), searchParams]);
  const [securityProfile, recentNotifications, unreadNotificationCount] = await Promise.all([
    currentUser.role === "ADMIN"
      ? prisma.user.findUnique({
          where: { id: currentUser.id },
          select: {
            twoFactorEnabled: true,
            twoFactorEnabledAt: true,
            twoFactorTempSecret: true,
          },
        })
      : Promise.resolve(null),
    getUserNotifications(currentUser.id, { limit: 4 }),
    getUnreadNotificationCount(currentUser.id),
  ]);
  const avatarFeedback = resolveAvatarFeedback(resolvedSearchParams);
  const passwordFeedback = resolvePasswordFeedback(resolvedSearchParams);
  const updatesFeedback = resolveUpdatesFeedback(resolvedSearchParams);
  const commentNotificationFeedback = resolveCommentNotificationFeedback(resolvedSearchParams);
  const securityFeedback = resolveSecurityFeedback(resolvedSearchParams);
  const twoFactorIssuer = process.env.APP_NAME?.trim() || "Lee's daily blog";
  const twoFactorOtpauthUri =
    currentUser.role === "ADMIN" && securityProfile?.twoFactorTempSecret
      ? buildTwoFactorOtpauthUri({
          issuer: twoFactorIssuer,
          email: currentUser.email,
          secret: securityProfile.twoFactorTempSecret,
        })
      : null;

  return (
    <div className="container-shell py-12 md:py-16">
      <div className="mb-8">
        <Link href="/" className="btn-ghost inline-flex items-center gap-2 px-0 text-[var(--accent-strong)]">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section className="glass-card flex flex-col items-center rounded-[2.2rem] p-8 text-center">
          <AvatarBadge
            name={currentUser.name}
            src={currentUser.avatarUrl}
            className="h-28 w-28 border-white/50 bg-white/70 text-2xl"
            fallbackLabel={currentUser.name}
          />
          <p className="section-kicker mt-6">Profile</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Account settings</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            Manage the public avatar shown around the site and keep your password up to date.
          </p>

          <dl className="mt-6 w-full space-y-3 rounded-[1.6rem] border border-black/8 bg-white/72 px-5 py-4 text-left text-sm text-[var(--ink-soft)]">
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Name
              </dt>
              <dd className="mt-1 text-base font-semibold text-[var(--ink)]">{currentUser.name}</dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Email
              </dt>
              <dd className="mt-1 break-all text-base text-[var(--ink)]">{currentUser.email}</dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Role
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">{currentUser.role}</dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Email status
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.emailVerifiedAt ? "Verified" : "Pending verification"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                New post emails
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.emailPostNotifications ? "Subscribed" : "Paused"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Comment emails
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.emailCommentNotifications ? "Enabled" : "Muted"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                In-app inbox
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.inAppCommentNotifications ? "Enabled" : "Muted"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                Inbox
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : "All caught up"}
              </dd>
            </div>
          </dl>

          <Link
            href="/account/notifications"
            className="section-link-pill section-link-pill--compact section-link-pill--soft mt-6"
          >
            <span className="section-link-pill__icon">
              <BellRing className="h-4 w-4" />
            </span>
            Open inbox
          </Link>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2.2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="section-kicker">Avatar</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">Upload your avatar</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  Use a square image when possible. PNG, JPG/JPEG, and WEBP are supported up to {avatarMaxUploadLabel}.
                </p>
              </div>

              {avatarFeedback ? <FeedbackBanner tone={avatarFeedback.tone} message={avatarFeedback.message} /> : null}

              <form action={uploadAvatarAction} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">Choose an image</span>
                  <input
                    name="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
                    required
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <SubmitButton className="px-5">Save avatar</SubmitButton>
                </div>
              </form>

              {currentUser.avatarUrl ? (
                <form action={removeAvatarAction} className="border-t border-black/8 pt-5">
                  <button type="submit" className="btn-secondary">
                    <Trash2 className="h-4 w-4" />
                    Remove current avatar
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2.2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="section-kicker">Email updates</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">New post notifications</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  Subscribe to email alerts when a newly published blog post goes live. The site uses your verified account email and follows the configured SMTP delivery settings.
                </p>
              </div>

              {updatesFeedback ? (
                <FeedbackBanner tone={updatesFeedback.tone} message={updatesFeedback.message} />
              ) : null}

              <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      Current setting: {currentUser.emailPostNotifications ? "Subscribed" : "Paused"}
                    </p>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">
                      You will only receive one email when a post is newly published, not for every later edit.
                    </p>
                  </div>

                  <form action={updateEmailPostNotificationsAction}>
                    <input
                      type="hidden"
                      name="enabled"
                      value={currentUser.emailPostNotifications ? "false" : "true"}
                    />
                    <SubmitButton className="px-5">
                      {currentUser.emailPostNotifications ? "Pause email updates" : "Enable email updates"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2.2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
            <div className="max-w-3xl space-y-6">
              <div>
                <p className="section-kicker">Comment alerts</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">Comment notification preferences</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  Control whether the site emails you about replies and moderation decisions, and whether those updates appear in your in-app inbox.
                </p>
              </div>

              {commentNotificationFeedback ? (
                <FeedbackBanner
                  tone={commentNotificationFeedback.tone}
                  message={commentNotificationFeedback.message}
                />
              ) : null}

              <form action={updateCommentNotificationSettingsAction} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="emailCommentNotifications"
                        defaultChecked={currentUser.emailCommentNotifications}
                        className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">Email me about comment updates</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          Receive email when your comment is approved or rejected, or when someone replies to your comment.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="inAppCommentNotifications"
                        defaultChecked={currentUser.inAppCommentNotifications}
                        className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">Show comment updates in inbox</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          Keep replies, moderation decisions, and submission status updates in your account notification center.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.5)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
                  Admin-only moderation inbox and system-level security flows stay enabled even if you mute user-facing comment alerts here.
                </div>

                <SubmitButton className="px-5">Save comment preferences</SubmitButton>
              </form>
            </div>
          </section>

          <section className="rounded-[2.2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">Inbox</p>
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">Recent notifications</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    Keep an eye on comment reviews, replies, and other account events without relying on email alone.
                  </p>
                </div>

                <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    Unread
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{unreadNotificationCount}</p>
                </div>
              </div>

              {recentNotifications.length > 0 ? (
                <div className="space-y-3">
                  {recentNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={
                        notification.isRead
                          ? "rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.58)] px-5 py-4"
                          : "rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4"
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-2xl">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-base font-semibold text-[var(--ink)]">{notification.title}</p>
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
                          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{notification.body}</p>
                        </div>

                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          {notification.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.52)] px-5 py-8 text-center">
                  <p className="text-base font-semibold text-[var(--ink)]">No notifications yet.</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    When someone replies or a comment is reviewed, the update will appear here.
                  </p>
                </div>
              )}

              <Link href="/account/notifications" className="section-link-pill section-link-pill--compact">
                <span className="section-link-pill__icon">
                  <BellRing className="h-4 w-4" />
                </span>
                Open notification center
              </Link>
            </div>
          </section>

          {currentUser.role === "ADMIN" ? (
            <section className="rounded-[2.2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
              <div className="max-w-3xl space-y-6">
                <div>
                  <p className="section-kicker">Admin security</p>
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">Two-factor authentication</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    Protect admin sign-in with a time-based authenticator code. After it is enabled, password-only login is no longer enough for this account.
                  </p>
                </div>

                {securityFeedback ? (
                  <FeedbackBanner tone={securityFeedback.tone} message={securityFeedback.message} />
                ) : null}

                <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Current setting:{" "}
                    {securityProfile?.twoFactorEnabled
                      ? "Enabled"
                      : securityProfile?.twoFactorTempSecret
                        ? "Setup pending"
                        : "Disabled"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {securityProfile?.twoFactorEnabled
                      ? `Enabled at ${securityProfile.twoFactorEnabledAt?.toLocaleString() ?? "an earlier time"}.`
                      : securityProfile?.twoFactorTempSecret
                        ? "Finish the setup with the latest authenticator code to activate 2FA."
                        : "Use an authenticator app such as Microsoft Authenticator, Google Authenticator, 1Password, or Authy."}
                  </p>
                </div>

                {securityProfile?.twoFactorEnabled ? (
                  <form action={disableTwoFactorAction} className="grid gap-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5 md:max-w-xl">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Current password</span>
                      <input
                        name="currentPassword"
                        type="password"
                        minLength={8}
                        autoComplete="current-password"
                        className="field"
                        placeholder="Enter your current password"
                        required
                      />
                    </label>
                    <div className="pt-2">
                      <SubmitButton className="px-5">Disable 2FA</SubmitButton>
                    </div>
                  </form>
                ) : securityProfile?.twoFactorTempSecret ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5">
                      <p className="text-sm font-semibold text-[var(--ink)]">Setup details</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                        Add this secret key in your authenticator app. If your app supports direct URI import, you can also paste the full otpauth URI shown below.
                      </p>

                      <label className="mt-4 block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          Manual entry key
                        </span>
                        <input
                          readOnly
                          value={formatTwoFactorSecret(securityProfile.twoFactorTempSecret)}
                          className="field font-mono text-sm"
                        />
                      </label>

                      {twoFactorOtpauthUri ? (
                        <label className="mt-4 block space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                            Otpauth URI
                          </span>
                          <textarea
                            readOnly
                            value={twoFactorOtpauthUri}
                            rows={4}
                            className="field min-h-28 resize-y font-mono text-xs"
                          />
                        </label>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <form action={confirmTwoFactorSetupAction} className="grid gap-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.6)] p-5">
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-[var(--ink)]">Authenticator code</span>
                          <input
                            name="code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            minLength={6}
                            maxLength={12}
                            className="field"
                            placeholder="123456"
                            required
                          />
                        </label>
                        <div className="pt-2">
                          <SubmitButton className="px-5">Confirm and enable 2FA</SubmitButton>
                        </div>
                      </form>

                      <form action={cancelTwoFactorSetupAction}>
                        <button type="submit" className="btn-secondary w-full justify-center">
                          Cancel setup
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <form action={beginTwoFactorSetupAction}>
                    <SubmitButton className="px-5">Start 2FA setup</SubmitButton>
                  </form>
                )}
              </div>
            </section>
          ) : null}

          <section className="rounded-[2.2rem] border border-black/8 bg-white/82 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)] md:p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="section-kicker">Security</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">Change password</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  Choose a strong password with at least 8 characters. Other active sessions will be signed out after the update.
                </p>
              </div>

              {passwordFeedback ? (
                <FeedbackBanner tone={passwordFeedback.tone} message={passwordFeedback.message} />
              ) : null}

              <form action={changePasswordAction} className="grid gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">Current password</span>
                  <input
                    name="currentPassword"
                    type="password"
                    minLength={8}
                    autoComplete="current-password"
                    className="field"
                    placeholder="Current password"
                    required
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">New password</span>
                    <input
                      name="newPassword"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      className="field"
                      placeholder="At least 8 characters"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">Confirm new password</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      className="field"
                      placeholder="Repeat the new password"
                      required
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <SubmitButton className="px-5">Update password</SubmitButton>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
