import { getFeedPayload, escapeXml } from "@/lib/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getFeedPayload();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(feed.homePageUrl)}</link>
    <description>${escapeXml(feed.description)}</description>
    <language>${feed.language}</language>
    <atom:link href="${escapeXml(feed.feedUrl)}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />
    ${feed.items
      .map(
        (item) => `
    <item>
      <guid>${escapeXml(item.id)}</guid>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${escapeXml(item.summary)}</description>
      <pubDate>${item.date.toUTCString()}</pubDate>
      ${item.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("")}
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}