import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, MailCheck, Rss, Tags } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { subscribeToEmailUpdatesAction } from "@/lib/actions/subscription-actions";
import { buildContentMetadata } from "@/lib/content-seo";
import { getCategoryArchive, getPopularTags } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "Email subscriptions",
  description:
    "Subscribe to new posts, weekly digests, and optionally narrow post alerts to selected categories or tags.",
  path: "/subscribe",
  keywords: ["newsletter", "email subscription", "blog updates", "weekly digest", "categories", "tags"],
  section: "Subscribe",
  type: "website",
  ogEyebrow: "Subscribe",
});

type SubscribePageSearchParams = {
  status?: string | string[];
  email?: string | string[];
  preview?: string | string[];
  posts?: string | string[];
  digests?: string | string[];
  category?: string | string[];
  tag?: string | string[];
  source?: string | string[];
};

function readSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim())?.trim() ?? "";
  }

  return typeof value === "string" ? value.trim() : "";
}

function readFilterValues(value: string | string[] | undefined) {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawValue of rawValues) {
    const trimmed = rawValue.trim();
    const normalized = trimmed.toLowerCase();

    if (!trimmed || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

function readBooleanValue(value: string | string[] | undefined, defaultValue: boolean) {
  const normalized = readSingleValue(value).toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  if (["0", "false", "off", "no"].includes(normalized)) {
    return false;
  }

  if (["1", "true", "on", "yes"].includes(normalized)) {
    return true;
  }

  return defaultValue;
}

function resolveSourceMessage(source: string) {
  if (!source) {
    return "";
  }

  switch (source) {
    case "post":
      return "The filters below were preloaded from the blog post you were reading.";
    case "note":
      return "The filters below were preloaded from the note you were reading.";
    case "digest":
      return "The filters below were preloaded from the digest you were reading.";
    case "category":
      return "The filters below were preloaded from the category page you were browsing.";
    case "tag":
      return "The filters below were preloaded from the tag page you were browsing.";
    default:
      return "The filters below were preloaded from the page you were browsing.";
  }
}

function resolveStatusMessage(status: string | undefined) {
  switch (status) {
    case "requested":
      return {
        tone: "success",
        title: "Check your inbox",
        body: "A confirmation email has been prepared. Once you confirm, your selected post alerts and digest emails will be delivered automatically.",
      } as const;
    case "preview":
      return {
        tone: "warning",
        title: "Email preview mode",
        body: "SMTP is not configured yet, so the confirmation link is shown below for local testing.",
      } as const;
    case "updated":
      return {
        tone: "success",
        title: "Preferences updated",
        body: "Your email subscription preferences were updated.",
      } as const;
    case "invalid":
      return {
        tone: "error",
        title: "Please check the form",
        body: "Enter a valid email address, choose at least one delivery type, and keep the selected categories and tags within the allowed limits.",
      } as const;
    case "database":
      return {
        tone: "error",
        title: "Subscriptions unavailable",
        body: "The database connection is not configured, so subscription requests cannot be saved right now.",
      } as const;
    default:
      return null;
  }
}

function toneClassName(tone: "success" | "warning" | "error") {
  if (tone === "success") {
    return "border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)]";
  }

  if (tone === "warning") {
    return "border-[rgba(168,123,53,0.22)] bg-[rgba(168,123,53,0.08)]";
  }

  return "border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)]";
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<SubscribePageSearchParams>;
}) {
  const params = await searchParams;
  const [categories, tags] = await Promise.all([getCategoryArchive(12), getPopularTags(18)]);
  const statusMessage = resolveStatusMessage(readSingleValue(params.status) || undefined);
  const previewUrl = readSingleValue(params.preview);
  const email = readSingleValue(params.email);
  const selectedPostNotifications = readBooleanValue(params.posts, true);
  const selectedDigestNotifications = readBooleanValue(params.digests, false);
  const selectedCategories = new Set(readFilterValues(params.category));
  const selectedTags = new Set(readFilterValues(params.tag));
  const sourceMessage = resolveSourceMessage(readSingleValue(params.source));

  return (
    <div className="container-shell py-16">
      <div className="editorial-shell space-y-10">
        <section className="editorial-hero space-y-4">
          <p className="section-kicker">Subscribe</p>
          <h1 className="font-serif text-[clamp(2.5rem,5vw,4.8rem)] font-semibold tracking-tight">
            Keep the right updates in your inbox
          </h1>
          <p className="max-w-4xl text-base leading-8 text-[var(--ink-soft)]">
            Subscribe to newly published blog posts, weekly research digests, or both. Post alerts
            can still be narrowed to the categories and tags you care about most, so the page now
            works as a small subscription center instead of a single mailing-list form.
          </p>
        </section>

        {statusMessage ? (
          <section
            className={`rounded-[1.6rem] border px-5 py-4 ${toneClassName(statusMessage.tone)}`}
          >
            <p className="text-sm font-semibold text-[var(--ink)]">{statusMessage.title}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{statusMessage.body}</p>
            {previewUrl ? (
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                Confirmation link:{" "}
                <Link href={previewUrl} className="font-semibold text-[var(--accent-strong)]">
                  Open preview link
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}

        {sourceMessage ? (
          <section className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Subscription filters preloaded</p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{sourceMessage}</p>
          </section>
        ) : null}

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="space-y-8">
            <form action={subscribeToEmailUpdatesAction} className="editorial-form-shell space-y-8 md:p-8">
              <input type="hidden" name="redirectTo" value="/subscribe" />
              {readSingleValue(params.source) ? (
                <input type="hidden" name="source" value={readSingleValue(params.source)} />
              ) : null}

              <div className="space-y-3">
                <p className="section-kicker">Email setup</p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  Subscription preferences
                </h2>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  Choose one or both delivery types below. Category and tag filters only affect new
                  post alerts.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={email}
                    autoComplete="email"
                    className="field"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">Name</span>
                  <input
                    name="name"
                    autoComplete="name"
                    className="field"
                    placeholder="Optional display name"
                  />
                </label>
              </div>

              <section className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Delivery types</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">
                    Pick the email stream you want. At least one option is required.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-3 rounded-[1.6rem] border border-black/8 bg-white/60 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="postNotificationsEnabled"
                        value="1"
                        defaultChecked={selectedPostNotifications}
                        className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-[var(--ink)]">New post alerts</div>
                        <p className="text-sm leading-7 text-[var(--ink-soft)]">
                          Receive emails only when a post is first published. Category and tag
                          filters below apply here.
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className="space-y-3 rounded-[1.6rem] border border-black/8 bg-white/60 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="digestNotificationsEnabled"
                        value="1"
                        defaultChecked={selectedDigestNotifications}
                        className="mt-1 h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-[var(--ink)]">Weekly digest</div>
                        <p className="text-sm leading-7 text-[var(--ink-soft)]">
                          Receive the weekly research recap that rolls papers, notes, and published
                          writing into one email issue.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Category filters</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">
                    Use categories when you want broad topic-level post notifications.
                  </p>
                </div>

                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <label
                        key={category.category}
                        className="inline-flex items-center gap-2 rounded-full border border-black/8 px-4 py-2 text-sm text-[var(--ink-soft)]"
                      >
                        <input
                          type="checkbox"
                          name="categories"
                          value={category.category}
                          defaultChecked={selectedCategories.has(category.category)}
                          className="h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                        />
                        <span>{category.category}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    Category filters will appear here once published posts exist.
                  </p>
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">Tag filters</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">
                    Tags help you follow a specific research thread without subscribing to every post.
                  </p>
                </div>

                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {tags.map((tag) => (
                      <label
                        key={tag.tag}
                        className="inline-flex items-center gap-2 rounded-full border border-black/8 px-4 py-2 text-sm text-[var(--ink-soft)]"
                      >
                        <input
                          type="checkbox"
                          name="tags"
                          value={tag.tag}
                          defaultChecked={selectedTags.has(tag.tag)}
                          className="h-4 w-4 rounded border-black/20 text-[var(--accent-strong)]"
                        />
                        <span>#{tag.tag}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    Tag filters will appear here once the site has published tagged content.
                  </p>
                )}
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton className="px-5">Subscribe by email</SubmitButton>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  New subscriptions use email confirmation. You can receive post alerts, weekly
                  digests, or both, and unsubscribe from any email with one click.
                </p>
              </div>
            </form>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
            <section className="editorial-panel p-5">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-serif text-2xl font-semibold tracking-tight">How it works</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                <p>1. Submit your email, then choose post alerts, weekly digests, or both.</p>
                <p>2. Confirm the subscription from your inbox.</p>
                <p>3. Receive matched post alerts or each new weekly digest issue automatically.</p>
              </div>
            </section>

            <section className="editorial-panel editorial-panel--soft p-5">
              <div className="flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Good to know</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                <p>Only first-time publication events send a post alert. Later edits do not.</p>
                <p>Weekly digests are sent once per issue, even if the digest is regenerated later.</p>
                <p>
                  Category and tag filters use OR matching, so either kind of match can trigger a
                  post alert.
                </p>
              </div>
            </section>

            <section className="editorial-panel editorial-panel--soft p-5">
              <div className="flex items-center gap-2">
                <Rss className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Feeds</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                <p>If you prefer feed readers, the site also exposes both XML and JSON feeds.</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/feed.xml" className="btn-secondary">
                    RSS Feed
                  </Link>
                  <Link href="/feed.json" className="btn-secondary">
                    JSON Feed
                  </Link>
                </div>
              </div>
            </section>

            <section className="editorial-panel editorial-panel--soft p-5">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="font-serif text-2xl font-semibold tracking-tight">Browse first</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/categories" className="btn-secondary">
                  Categories
                </Link>
                <Link href="/tags" className="btn-secondary">
                  Tags
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
