import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-shell flex min-h-[calc(100vh-10rem)] flex-col items-start justify-center gap-5 py-16">
      <p className="section-kicker">404</p>
      <h1 className="font-serif text-5xl font-semibold tracking-tight">页面不存在</h1>
      <p className="max-w-xl text-base leading-8 text-[var(--ink-soft)]">
        你访问的内容可能已经被移动、删除，或者还没有发布。可以先回到首页或文章列表继续浏览。
      </p>
      <div className="flex gap-4">
        <Link href="/" className="btn-primary">返回首页</Link>
        <Link href="/blog" className="btn-secondary">浏览博客</Link>
      </div>
    </div>
  );
}

