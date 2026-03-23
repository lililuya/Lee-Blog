import Link from "next/link";
import { LockKeyhole, MessageSquareMore } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="container-shell py-16">
      <div className="editorial-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <section className="space-y-6">
          <p className="section-kicker">暂停注册</p>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            本站不再提供公开读者账号。
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
            现在的博客采用更简洁的模式：读者可以自由浏览内容，也可以不注册直接以访客身份发表评论。
            只有站点管理员可以登录后台。
          </p>
        </section>

        <div className="space-y-4">
          <div className="editorial-panel p-5">
            <div className="flex items-start gap-3">
              <MessageSquareMore className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">访客评论</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  你依然可以在每篇文章下直接参与讨论，只需要填写称呼，可选填写邮箱地址。
                </p>
              </div>
            </div>
          </div>

          <div className="editorial-panel editorial-panel--soft p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
              <div>
                <h2 className="font-serif text-2xl font-semibold tracking-tight">管理员入口</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  如果你是站点维护者，请直接使用管理员登录，而不是创建新的读者账号。
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              管理员登录
            </Link>
            <Link href="/" className="btn-secondary">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
