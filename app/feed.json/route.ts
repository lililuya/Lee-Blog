import { getFeedPayload } from "@/lib/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getFeedPayload();

  const jsonFeed = {
    version: "https://jsonfeed.org/version/1.1",
    title: feed.title,
    home_page_url: feed.homePageUrl,
    feed_url: feed.jsonFeedUrl,
    description: feed.description,
    language: feed.language,
    authors: [feed.author],
    items: feed.items.map((item) => ({
      id: item.id,
      url: item.url,
      title: item.title,
      summary: item.summary,
      content_text: item.content,
      date_published: item.date.toISOString(),
      tags: item.tags,
    })),
  };

  return Response.json(jsonFeed, {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}