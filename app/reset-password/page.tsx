import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { inspectPasswordResetToken } from "@/lib/password-reset";
import { formatDate, isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ResetPasswordPageSearchParams = {
  token?: string;
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<ResetPasswordPageSearchParams>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!isDatabaseConfigured()) {
    return (
      <div className="container-shell py-16">
        <div className="editorial-shell">
          <section className="rounded-[1.8rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-8 text-sm leading-7 text-[var(--ink-soft)]">
            当前环境尚未配置数据库，因此暂时无法使用密码重置功能。
          </section>
        </div>
      </div>
    );
  }

  const tokenState = await inspectPasswordResetToken(token);

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="space-y-6">
          <p className="section-kicker">安全</p>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            设置新密码。
          </h1>

          {tokenState.status === "valid" ? (
            <>
              <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
                为 <span className="font-semibold text-[var(--ink)]">{tokenState.email}</span>{" "}
                设置一个新的登录密码。
              </p>
              <div className="rounded-[1.6rem] border border-black/8 bg-white/75 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                这个链接会在 {formatDate(tokenState.expiresAt, "yyyy-MM-dd HH:mm")} 前有效。密码更新后，
                所有旧的重置链接和已登录会话都会被撤销。
              </div>
            </>
          ) : null}

          {tokenState.status === "missing" ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
              这个密码重置链接不完整，请重新申请新的链接后再继续。
            </div>
          ) : null}

          {tokenState.status === "invalid" ? (
            <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-700">
              这个密码重置链接无效，或者已经被使用过。
            </div>
          ) : null}

          {tokenState.status === "expired" ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
              这个密码重置链接已于 {formatDate(tokenState.expiresAt, "yyyy-MM-dd HH:mm")} 失效，请重新申请。
            </div>
          ) : null}
        </section>

        <div className="space-y-4">
          {tokenState.status === "valid" ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="editorial-form-shell">
              <p className="text-sm leading-7 text-[var(--ink-soft)]">
                请重新申请密码重置邮件，并打开收件箱里最新的一条链接。
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/forgot-password" className="btn-primary">
                  重新申请链接
                </Link>
                <Link href="/login" className="btn-secondary">
                  返回登录
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
