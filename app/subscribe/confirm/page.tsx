import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, MailCheck } from "lucide-react";
import { buildContentMetadata } from "@/lib/content-seo";
import { confirmEmailSubscription } from "@/lib/email-subscriptions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Confirm subscription",
  description: "Confirm an email subscription for Lee Blog post alerts and digest updates.",
  path: "/subscribe/confirm",
  keywords: ["subscription confirmation", "email updates"],
  section: "Subscribe",
  type: "website",
  ogEyebrow: "Subscribe",
});

export default async function ConfirmSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const result = await confirmEmailSubscription(typeof params.token === "string" ? params.token : "");

  let icon = MailCheck;
  let title = "Confirm your subscription";
  let body =
    "Open the confirmation link from your inbox to finish subscribing to new posts.";

  if (result.status === "confirmed") {
    icon = CheckCircle2;
    title = "Subscription confirmed";
    body = "Your email subscription is active now. Future matching post alerts and digest emails will be delivered automatically.";
  } else if (result.status === "expired") {
    icon = CircleAlert;
    title = "Confirmation link expired";
    body = "This confirmation link has expired. Submit the subscription form again to request a fresh one.";
  } else if (result.status === "invalid") {
    icon = CircleAlert;
    title = "Invalid confirmation link";
    body = "This confirmation link is invalid or has already been used.";
  }

  const Icon = icon;

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell">
        <section className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.1)] text-[var(--accent)]">
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-4">
              <p className="section-kicker">Subscribe</p>
              <h1 className="font-serif text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-tight">
                {title}
              </h1>
              <p className="text-base leading-8 text-[var(--ink-soft)]">{body}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/subscribe" className="btn-primary">
                  Back to subscriptions
                </Link>
                <Link href="/" className="btn-secondary">
                  Return home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
