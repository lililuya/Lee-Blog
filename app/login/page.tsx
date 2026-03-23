import Link from "next/link";
import { LockKeyhole, Settings2 } from "lucide-react";
import { AuthForm } from "@/components/forms/auth-form";
import { isDatabaseConfigured } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/admin";

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="space-y-6">
          <p className="section-kicker">登录</p>
          <h1 className="font-serif text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            登录以管理站点。
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
            这里只提供给站点管理员使用。读者可以直接浏览内容，也可以无需注册以访客身份发表评论。
          </p>

          {params.error === "registration-closed" ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
              公开注册已关闭。当前站点使用访客评论模式，不再开放读者账号。
            </div>
          ) : null}
          {params.error === "verify-email" ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-700">
              登录前请先完成邮箱验证。如有需要，可先提交一次表单，再使用下方的重新发送操作。
            </div>
          ) : null}
          {params.error === "two-factor-required" ? (
            <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
              这个账号启用了两步验证。请从标准登录表单进入，以完成身份验证器验证码步骤。
            </div>
          ) : null}
          {!isDatabaseConfigured() ? (
            <div className="rounded-[1.6rem] border border-dashed border-[rgba(168,123,53,0.4)] bg-[rgba(168,123,53,0.08)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
              当前数据库尚未配置。公开页面仍可展示演示内容，但登录与管理功能需要有效的
              `DATABASE_URL`。
            </div>
          ) : null}

          <div className="editorial-note-box p-5 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="font-semibold text-[var(--ink)]">
              登录前请先确认这两件事：
            </p>
            <p className="mt-2">
              1. 你已经执行过 `npm run db:seed`，否则管理员账号不会被创建。
            </p>
            <p>
              2. 站点登录凭据来自 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD`，不是 PostgreSQL 的数据库密码。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="editorial-panel p-5">
              <LockKeyhole className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
                安全登录
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                管理端使用数据库会话和 HttpOnly Cookie，这对自托管博客来说是比较稳妥的方案。
              </p>
            </div>
            <div className="editorial-panel editorial-panel--soft p-5">
              <Settings2 className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">
                完整控制
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                前端、后端、权限、模型提供方配置和部署流程都由你自己掌控，不依赖额外 CMS。
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <AuthForm mode="login" nextPath={nextPath} />
          <p className="text-sm text-[var(--ink-soft)]">
            忘记管理员密码了？
            <Link href="/forgot-password" className="ml-2 font-semibold text-[var(--accent-strong)]">
              去重置
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
