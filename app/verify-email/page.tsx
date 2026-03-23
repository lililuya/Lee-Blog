import Link from "next/link";
import { CheckCircle2, CircleAlert, MailCheck } from "lucide-react";

export const dynamic = "force-dynamic";

type VerifyEmailStatus =
  | "verified"
  | "already-verified"
  | "verified-restricted"
  | "expired"
  | "invalid";

function getStatusContent(status: VerifyEmailStatus | undefined) {
  switch (status) {
    case "verified":
      return {
        tone: "success" as const,
        title: "邮箱已验证",
        message: "你的邮箱已经完成验证，现在已自动登录。",
        icon: CheckCircle2,
      };
    case "already-verified":
      return {
        tone: "success" as const,
        title: "已完成验证",
        message: "这个验证链接已经使用过。如果账号处于可用状态，你现在已经登录。",
        icon: CheckCircle2,
      };
    case "verified-restricted":
      return {
        tone: "warning" as const,
        title: "邮箱已确认",
        message: "邮箱已经验证成功，但这个账号当前不允许登录。如需帮助，请联系站点管理员。",
        icon: MailCheck,
      };
    case "expired":
      return {
        tone: "warning" as const,
        title: "链接已过期",
        message: "这个验证链接已经过期，请重新登录后申请新的链接。",
        icon: CircleAlert,
      };
    case "invalid":
      return {
        tone: "error" as const,
        title: "链接无效",
        message: "这个验证链接无效，或者已经被使用过。",
        icon: CircleAlert,
      };
    default:
      return {
        tone: "info" as const,
        title: "验证你的邮箱",
        message: "请打开收件箱中的验证链接，以激活你的读者账号。",
        icon: MailCheck,
      };
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: VerifyEmailStatus }>;
}) {
  const params = await searchParams;
  const content = getStatusContent(params.status);
  const Icon = content.icon;

  const feedbackClassName =
    content.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : content.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : content.tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-black/8 bg-white/72 text-[var(--ink-soft)]";

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell">
        <section className="mx-auto w-full max-w-2xl space-y-6">
          <div className={`rounded-[1.6rem] border px-5 py-4 ${feedbackClassName}`}>
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em]">邮箱</p>
            </div>
            <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
              {content.title}
            </h1>
            <p className="mt-3 text-sm leading-7">{content.message}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">
              前往首页
            </Link>
            <Link href="/login" className="btn-secondary">
              前往登录
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
