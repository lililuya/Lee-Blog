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
        title: "Email verified",
        message: "Your email has been confirmed and you are now signed in.",
        icon: CheckCircle2,
      };
    case "already-verified":
      return {
        tone: "success" as const,
        title: "Already verified",
        message: "This verification link has already been used. If the account is active, you are now signed in.",
        icon: CheckCircle2,
      };
    case "verified-restricted":
      return {
        tone: "warning" as const,
        title: "Email confirmed",
        message: "The email is verified, but the account is not currently allowed to sign in. Please contact the site admin if you need help.",
        icon: MailCheck,
      };
    case "expired":
      return {
        tone: "warning" as const,
        title: "Link expired",
        message: "This verification link has expired. Sign in again to request a fresh one.",
        icon: CircleAlert,
      };
    case "invalid":
      return {
        tone: "error" as const,
        title: "Invalid link",
        message: "This verification link is invalid or has already been consumed.",
        icon: CircleAlert,
      };
    default:
      return {
        tone: "info" as const,
        title: "Verify your email",
        message: "Open the verification link from your inbox to activate your reader account.",
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
    <div className="container-shell grid min-h-[calc(100vh-9rem)] place-items-center py-16">
      <section className="w-full max-w-2xl rounded-[2.2rem] border border-black/8 bg-white/84 p-8 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <div className={`rounded-[1.6rem] border px-5 py-4 ${feedbackClassName}`}>
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em]">Email</p>
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
            {content.title}
          </h1>
          <p className="mt-3 text-sm leading-7">{content.message}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Go to homepage
          </Link>
          <Link href="/login" className="btn-secondary">
            Go to login
          </Link>
        </div>
      </section>
    </div>
  );
}
