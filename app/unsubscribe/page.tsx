import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, MailMinus, MailOpen } from "lucide-react";
import { buildContentMetadata } from "@/lib/content-seo";
import { unsubscribeEmailSubscription } from "@/lib/email-subscriptions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Unsubscribe",
  description: "Unsubscribe an email address from Lee Blog public email updates.",
  path: "/unsubscribe",
  keywords: ["unsubscribe", "email updates"],
  section: "Subscribe",
  type: "website",
  ogEyebrow: "Unsubscribe",
});

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const result = await unsubscribeEmailSubscription(
    typeof params.token === "string" ? params.token : "",
  );

  let icon = MailOpen;
  let title = "Manage subscription";
  let body = "Open an unsubscribe link from one of the emails to stop future delivery.";

  if (result.status === "unsubscribed") {
    icon = MailMinus;
    title = "You have been unsubscribed";
    body = "This email address will no longer receive Lee Blog public post alerts or digest updates.";
  } else if (result.status === "already-unsubscribed") {
    icon = MailMinus;
    title = "Already unsubscribed";
    body = "This email address was already removed from the mailing list.";
  } else if (result.status === "invalid") {
    icon = CircleAlert;
    title = "Invalid unsubscribe link";
    body = "This unsubscribe link is invalid or no longer available.";
  }

  const Icon = icon;

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell">
        <section className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(180,83,9,0.1)] text-[color:rgb(180,83,9)]">
              <Icon className="h-6 w-6" />
            </div>
            <div className="space-y-4">
              <p className="section-kicker">Email Updates</p>
              <h1 className="font-serif text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-tight">
                {title}
              </h1>
              <p className="text-base leading-8 text-[var(--ink-soft)]">{body}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/subscribe" className="btn-primary">
                  Subscribe again
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
