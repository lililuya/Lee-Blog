import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { PasswordResetRequestForm } from "@/components/forms/password-reset-request-form";
import { isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="container-shell py-16">
      <div className="editorial-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="space-y-6">
          <p className="section-kicker">安全</p>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            重置密码。
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
            输入管理员邮箱地址。如果账号存在，系统会准备一个密码重置链接。
          </p>
          {!isDatabaseConfigured() ? (
            <div className="rounded-[1.6rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
              当前数据库尚未配置，因此这个环境里暂时无法使用密码重置功能。
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="editorial-panel p-5">
              <Mail className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">邮件投递</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                支持 SMTP 邮件发送；在邮件服务尚未完全配置好之前，仍可先使用本地预览链接。
              </p>
            </div>
            <div className="editorial-panel editorial-panel--soft p-5">
              <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">单一有效链接</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                每次新的重置请求都会替换旧链接，确保同一时间只有一个有效恢复入口。
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <PasswordResetRequestForm />
          <p className="text-sm text-[var(--ink-soft)]">
            已经想起来了？
            <Link href="/login" className="ml-2 font-semibold text-[var(--accent-strong)]">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
