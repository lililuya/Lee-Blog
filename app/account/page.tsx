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
      message: "头像已更新。新的图片会显示在站内所有个人标识位置。",
    };
  }

  if (searchParams.removed) {
    return {
      tone: "success" as const,
      message: "头像已移除。站点会退回显示你的姓名首字。",
    };
  }

  if (searchParams.error === "no-file") {
    return {
      tone: "error" as const,
      message: "提交前请先选择图片文件。",
    };
  }

  if (searchParams.error === "file-too-large") {
    return {
      tone: "error" as const,
      message: `头像文件大小必须不超过 ${avatarMaxUploadLabel}。`,
    };
  }

  if (searchParams.error === "invalid-type") {
    return {
      tone: "error" as const,
      message: "仅支持 PNG、JPG/JPEG 和 WEBP 图片。",
    };
  }

  if (searchParams.error === "database") {
    return {
      tone: "error" as const,
      message: "当前数据库不可用，无法保存头像变更。",
    };
  }

  return null;
}

function resolvePasswordFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.password === "updated") {
    return {
      tone: "success" as const,
      message: "密码已更新，其他已登录会话也已被退出。",
    };
  }

  if (searchParams.password === "invalid-current") {
    return {
      tone: "error" as const,
      message: "你输入的当前密码不正确。",
    };
  }

  if (searchParams.password === "same") {
    return {
      tone: "error" as const,
      message: "请设置一个与当前密码不同的新密码。",
    };
  }

  if (searchParams.password === "invalid") {
    return {
      tone: "error" as const,
      message: "请完整填写密码字段，并确保两次新密码输入一致。",
    };
  }

  if (searchParams.password === "database") {
    return {
      tone: "error" as const,
      message: "当前数据库不可用，因此无法更新密码。",
    };
  }

  if (searchParams.password === "error") {
    return {
      tone: "error" as const,
      message: "暂时无法更新密码，请稍后再试。",
    };
  }

  return null;
}

function resolveUpdatesFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.updates === "enabled") {
    return {
      tone: "success" as const,
      message: "这个账号已开启新文章邮件提醒。",
    };
  }

  if (searchParams.updates === "disabled") {
    return {
      tone: "success" as const,
      message: "这个账号已暂停新文章邮件提醒。",
    };
  }

  if (searchParams.updates === "database") {
    return {
      tone: "error" as const,
      message: "当前数据库不可用，因此无法保存邮件偏好设置。",
    };
  }

  return null;
}

function resolveCommentNotificationFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.comments === "updated") {
    return {
      tone: "success" as const,
      message: "评论通知偏好已更新。",
    };
  }

  if (searchParams.comments === "database") {
    return {
      tone: "error" as const,
      message: "当前数据库不可用，因此无法保存评论通知偏好。",
    };
  }

  return null;
}

function resolveSecurityFeedback(searchParams: AccountPageSearchParams) {
  if (searchParams.security === "setup") {
    return {
      tone: "success" as const,
      message: "身份验证器配置已开始。请先把下方密钥加入验证器应用，再输入 6 位验证码完成启用。",
    };
  }

  if (searchParams.security === "setup-cancelled") {
    return {
      tone: "success" as const,
      message: "待完成的两步验证配置已取消。",
    };
  }

  if (searchParams.security === "enabled") {
    return {
      tone: "success" as const,
      message: "管理员登录已启用两步验证。",
    };
  }

  if (searchParams.security === "disabled") {
    return {
      tone: "success" as const,
      message: "这个账号的两步验证已关闭。",
    };
  }

  if (searchParams.security === "invalid-code") {
    return {
      tone: "error" as const,
      message: "验证码无效，请尝试验证器里最新的 6 位数字。",
    };
  }

  if (searchParams.security === "invalid-password") {
    return {
      tone: "error" as const,
      message: "你输入的当前密码不正确。",
    };
  }

  if (searchParams.security === "setup-missing") {
    return {
      tone: "error" as const,
      message: "没有找到待完成的两步验证配置，请重新开始设置。",
    };
  }

  if (searchParams.security === "database") {
    return {
      tone: "error" as const,
      message: "当前数据库不可用，因此无法更新两步验证设置。",
    };
  }

  if (searchParams.security === "admin-only") {
    return {
      tone: "error" as const,
      message: "当前只有管理员账号可以管理两步验证。",
    };
  }

  return null;
}

function formatRoleLabel(role: string) {
  if (role === "ADMIN") {
    return "管理员";
  }

  if (role === "USER") {
    return "用户";
  }

  return role;
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
          返回首页
        </Link>
      </div>

      <div className="editorial-shell grid gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section className="editorial-panel flex flex-col items-center p-8 text-center">
          <AvatarBadge
            name={currentUser.name}
            src={currentUser.avatarUrl}
            className="h-28 w-28 border-white/50 bg-white/70 text-2xl"
            fallbackLabel={currentUser.name}
          />
          <p className="section-kicker mt-6">账户</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">账户设置</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            在这里管理站内公开显示的头像，并维护你的密码和通知偏好。
          </p>

          <dl className="editorial-note-box mt-6 w-full space-y-3 px-5 py-4 text-left text-sm text-[var(--ink-soft)]">
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                名称
              </dt>
              <dd className="mt-1 text-base font-semibold text-[var(--ink)]">{currentUser.name}</dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                邮箱
              </dt>
              <dd className="mt-1 break-all text-base text-[var(--ink)]">{currentUser.email}</dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                角色
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">{formatRoleLabel(currentUser.role)}</dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                邮箱状态
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.emailVerifiedAt ? "已验证" : "待验证"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                新文章邮件
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.emailPostNotifications ? "已订阅" : "已暂停"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                评论邮件
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.emailCommentNotifications ? "已开启" : "已静音"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                站内通知
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {currentUser.inAppCommentNotifications ? "已开启" : "已静音"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                通知中心
              </dt>
              <dd className="mt-1 text-base text-[var(--ink)]">
                {unreadNotificationCount > 0 ? `${unreadNotificationCount} 条未读` : "全部处理完毕"}
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
            打开通知中心
          </Link>
        </section>

        <div className="space-y-6">
          <section className="editorial-panel p-6 md:p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="section-kicker">头像</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">上传头像</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  尽量使用正方形图片。支持 PNG、JPG/JPEG 和 WEBP，大小不超过 {avatarMaxUploadLabel}。
                </p>
              </div>

              {avatarFeedback ? <FeedbackBanner tone={avatarFeedback.tone} message={avatarFeedback.message} /> : null}

              <form action={uploadAvatarAction} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">选择图片</span>
                  <input
                    name="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
                    required
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <SubmitButton className="px-5">保存头像</SubmitButton>
                </div>
              </form>

              {currentUser.avatarUrl ? (
                <form action={removeAvatarAction} className="border-t border-black/8 pt-5">
                  <button type="submit" className="btn-secondary">
                    <Trash2 className="h-4 w-4" />
                    移除当前头像
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="editorial-panel p-6 md:p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="section-kicker">邮件更新</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">新文章提醒</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  当博客有新文章发布时，你可以通过邮件接收提醒。站点会使用你已验证的邮箱，并遵循当前 SMTP 配置。
                </p>
              </div>

              {updatesFeedback ? (
                <FeedbackBanner tone={updatesFeedback.tone} message={updatesFeedback.message} />
              ) : null}

              <div className="editorial-note-box p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      当前设置：{currentUser.emailPostNotifications ? "已订阅" : "已暂停"}
                    </p>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">
                      只有文章首次发布时会发送一封提醒邮件，后续编辑不会重复打扰你。
                    </p>
                  </div>

                  <form action={updateEmailPostNotificationsAction}>
                    <input
                      type="hidden"
                      name="enabled"
                      value={currentUser.emailPostNotifications ? "false" : "true"}
                    />
                    <SubmitButton className="px-5">
                      {currentUser.emailPostNotifications ? "暂停邮件提醒" : "开启邮件提醒"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
          </section>

          <section className="editorial-panel p-6 md:p-8">
            <div className="max-w-3xl space-y-6">
              <div>
                <p className="section-kicker">评论提醒</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">评论通知偏好</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  控制站点是否通过邮件告知你回复和审核结果，以及这些更新是否显示在站内通知中心。
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
                  <label className="editorial-note-box p-5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="emailCommentNotifications"
                        defaultChecked={currentUser.emailCommentNotifications}
                        className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">通过邮件通知我评论动态</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          当你的评论被通过、被拒绝，或有人回复你的评论时，通过邮件提醒你。
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="editorial-note-box p-5">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="inAppCommentNotifications"
                        defaultChecked={currentUser.inAppCommentNotifications}
                        className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">在通知中心显示评论动态</p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                          把回复提醒、审核结果和提交状态更新同步到你的账户通知中心。
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="editorial-note-box border-dashed px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
                  即使你在这里关闭用户侧评论提醒，管理员专用的审核通知和系统级安全流程仍会保持启用。
                </div>

                <SubmitButton className="px-5">保存评论偏好</SubmitButton>
              </form>
            </div>
          </section>

          <section className="editorial-panel p-6 md:p-8">
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">通知</p>
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">最近通知</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    不依赖邮件，也能在这里随时查看评论审核、回复提醒和其他账户动态。
                  </p>
                </div>

                <div className="editorial-note-box px-5 py-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    未读
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
                          ? "editorial-note-box px-5 py-4"
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
                              {notification.isRead ? "已读" : "未读"}
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
                <div className="editorial-note-box border-dashed px-5 py-8 text-center">
                  <p className="text-base font-semibold text-[var(--ink)]">暂时还没有通知。</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    当有人回复你，或者评论被审核时，更新会显示在这里。
                  </p>
                </div>
              )}

              <Link href="/account/notifications" className="section-link-pill section-link-pill--compact">
                <span className="section-link-pill__icon">
                  <BellRing className="h-4 w-4" />
                </span>
                打开通知中心
              </Link>
            </div>
          </section>

          {currentUser.role === "ADMIN" ? (
            <section className="editorial-panel p-6 md:p-8">
              <div className="max-w-3xl space-y-6">
                <div>
                  <p className="section-kicker">管理员安全</p>
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">两步验证</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    用基于时间的一次性验证码保护管理员登录。启用后，这个账号不能只靠密码完成登录。
                  </p>
                </div>

                {securityFeedback ? (
                  <FeedbackBanner tone={securityFeedback.tone} message={securityFeedback.message} />
                ) : null}

                <div className="editorial-note-box p-5">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    当前设置：
                    {" "}
                    {securityProfile?.twoFactorEnabled
                      ? "已启用"
                      : securityProfile?.twoFactorTempSecret
                        ? "待完成设置"
                        : "已关闭"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {securityProfile?.twoFactorEnabled
                      ? `启用时间：${securityProfile.twoFactorEnabledAt?.toLocaleString() ?? "更早之前"}。`
                      : securityProfile?.twoFactorTempSecret
                        ? "输入最新的身份验证器验证码即可完成两步验证设置。"
                        : "可使用 Microsoft Authenticator、Google Authenticator、1Password 或 Authy 等验证器应用。"}
                  </p>
                </div>

                {securityProfile?.twoFactorEnabled ? (
                  <form action={disableTwoFactorAction} className="editorial-note-box grid gap-4 p-5 md:max-w-xl">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">当前密码</span>
                      <input
                        name="currentPassword"
                        type="password"
                        minLength={8}
                        autoComplete="current-password"
                        className="field"
                        placeholder="输入当前密码"
                        required
                      />
                    </label>
                    <div className="pt-2">
                      <SubmitButton className="px-5">关闭两步验证</SubmitButton>
                    </div>
                  </form>
                ) : securityProfile?.twoFactorTempSecret ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="editorial-note-box p-5">
                      <p className="text-sm font-semibold text-[var(--ink)]">设置详情</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                        把这串密钥添加到你的验证器应用里。如果应用支持直接导入 URI，也可以粘贴下面完整的 otpauth URI。
                      </p>

                      <label className="mt-4 block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                          手动输入密钥
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
                      <form action={confirmTwoFactorSetupAction} className="editorial-note-box grid gap-4 p-5">
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-[var(--ink)]">验证码</span>
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
                          <SubmitButton className="px-5">确认并启用两步验证</SubmitButton>
                        </div>
                      </form>

                      <form action={cancelTwoFactorSetupAction}>
                        <button type="submit" className="btn-secondary w-full justify-center">
                          取消设置
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <form action={beginTwoFactorSetupAction}>
                    <SubmitButton className="px-5">开始设置两步验证</SubmitButton>
                  </form>
                )}
              </div>
            </section>
          ) : null}

          <section className="editorial-panel p-6 md:p-8">
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="section-kicker">安全</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">修改密码</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  请设置至少 8 位字符的强密码。更新之后，其他已登录会话会自动退出。
                </p>
              </div>

              {passwordFeedback ? (
                <FeedbackBanner tone={passwordFeedback.tone} message={passwordFeedback.message} />
              ) : null}

              <form action={changePasswordAction} className="grid gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">当前密码</span>
                  <input
                    name="currentPassword"
                    type="password"
                    minLength={8}
                    autoComplete="current-password"
                    className="field"
                    placeholder="当前密码"
                    required
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">新密码</span>
                    <input
                      name="newPassword"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      className="field"
                      placeholder="至少 8 位字符"
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">确认新密码</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      className="field"
                      placeholder="再次输入新密码"
                      required
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <SubmitButton className="px-5">更新密码</SubmitButton>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
