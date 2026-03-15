import "server-only";

import { format } from "date-fns";
import { CommentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";

type TrendPoint = {
  date: string;
  views: number;
};

function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildDailyTrend(points: Date[], days: number) {
  const map = new Map<string, number>();
  const today = new Date();

  for (const point of points) {
    const key = format(point, "yyyy-MM-dd");
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const trend: TrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    const key = format(current, "yyyy-MM-dd");

    trend.push({
      date: key,
      views: map.get(key) ?? 0,
    });
  }

  return trend;
}

function getSlugFromPath(path: string, prefix: string) {
  if (!path.startsWith(prefix)) {
    return null;
  }

  const slug = path.slice(prefix.length).split("/")[0]?.trim();
  return slug || null;
}

export async function recordSearchQuery(query: string, resultCount: number) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!isDatabaseConfigured() || !normalizedQuery) {
    return;
  }

  await prisma.searchQueryLog.create({
    data: {
      query: query.trim().slice(0, 300),
      normalizedQuery: normalizedQuery.slice(0, 300),
      resultCount,
    },
  });
}

export async function getAdminSiteAnalytics(windowDays = 30) {
  if (!isDatabaseConfigured()) {
    const now = new Date();
    return {
      windowDays,
      totals: {
        pageViews: 0,
        uniqueVisitors: 0,
        searches: 0,
        archiveVisits: 0,
        blogViews: 0,
        approvedComments: 0,
      },
      topPages: [] as Array<{ path: string; title: string; views: number }>,
      topPosts: [] as Array<{
        slug: string;
        title: string;
        views: number;
        approvedComments: number;
        conversionRate: number;
      }>,
      topSearchQueries: [] as Array<{ query: string; count: number; averageResults: number }>,
      archiveTrend: buildDailyTrend([now], 14).map((point) => ({ ...point, views: 0 })),
      viewsTrend: buildDailyTrend([now], 14).map((point) => ({ ...point, views: 0 })),
    };
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const [pageViews, searchLogs, approvedComments] = await Promise.all([
    prisma.pageView.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      select: {
        path: true,
        visitorIpHash: true,
        createdAt: true,
      },
    }),
    prisma.searchQueryLog.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      select: {
        query: true,
        normalizedQuery: true,
        resultCount: true,
        createdAt: true,
      },
    }),
    prisma.comment.findMany({
      where: {
        status: CommentStatus.APPROVED,
        createdAt: {
          gte: since,
        },
      },
      select: {
        postId: true,
      },
    }),
  ]);

  const topPathCounts = new Map<string, number>();
  const topPostViews = new Map<string, number>();
  const archiveViewDates: Date[] = [];
  const allViewDates = pageViews.map((view) => view.createdAt);

  for (const view of pageViews) {
    topPathCounts.set(view.path, (topPathCounts.get(view.path) ?? 0) + 1);

    if (view.path === "/archive") {
      archiveViewDates.push(view.createdAt);
    }

    const postSlug = getSlugFromPath(view.path, "/blog/");

    if (postSlug) {
      topPostViews.set(postSlug, (topPostViews.get(postSlug) ?? 0) + 1);
    }
  }

  const uniqueVisitors = new Set(
    pageViews.map((view) => view.visitorIpHash).filter((value): value is string => Boolean(value)),
  ).size;
  const archiveVisits = archiveViewDates.length;
  const blogViews = [...topPostViews.values()].reduce((sum, value) => sum + value, 0);

  const postSlugs = [...topPostViews.keys()];
  const posts = postSlugs.length
    ? await prisma.post.findMany({
        where: {
          slug: {
            in: postSlugs,
          },
        },
        select: {
          id: true,
          slug: true,
          title: true,
        },
      })
    : [];

  const commentCountsByPostId = approvedComments.reduce<Map<string, number>>((map, comment) => {
    map.set(comment.postId, (map.get(comment.postId) ?? 0) + 1);
    return map;
  }, new Map());

  const topPosts = posts
    .map((post) => {
      const views = topPostViews.get(post.slug) ?? 0;
      const commentCount = commentCountsByPostId.get(post.id) ?? 0;

      return {
        slug: post.slug,
        title: post.title,
        views,
        approvedComments: commentCount,
        conversionRate: views > 0 ? commentCount / views : 0,
      };
    })
    .sort((left, right) => {
      if (right.views !== left.views) {
        return right.views - left.views;
      }

      return right.approvedComments - left.approvedComments;
    })
    .slice(0, 8);

  const topPagePaths = [...topPathCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  const lookupSlugs = {
    post: topPagePaths.map((item) => getSlugFromPath(item.path, "/blog/")).filter(Boolean) as string[],
    note: topPagePaths.map((item) => getSlugFromPath(item.path, "/notes/")).filter(Boolean) as string[],
    digest: topPagePaths.map((item) => getSlugFromPath(item.path, "/digest/")).filter(Boolean) as string[],
    series: topPagePaths.map((item) => getSlugFromPath(item.path, "/series/")).filter(Boolean) as string[],
  };

  const [noteRecords, digestRecords, seriesRecords] = await Promise.all([
    lookupSlugs.note.length
      ? prisma.note.findMany({
          where: { slug: { in: lookupSlugs.note } },
          select: { slug: true, title: true },
        })
      : [],
    lookupSlugs.digest.length
      ? prisma.weeklyDigest.findMany({
          where: { slug: { in: lookupSlugs.digest } },
          select: { slug: true, title: true },
        })
      : [],
    lookupSlugs.series.length
      ? prisma.contentSeries.findMany({
          where: { slug: { in: lookupSlugs.series } },
          select: { slug: true, title: true },
        })
      : [],
  ]);

  const postTitleMap = new Map(posts.map((post) => [post.slug, post.title]));
  const noteTitleMap = new Map(noteRecords.map((note) => [note.slug, note.title]));
  const digestTitleMap = new Map(digestRecords.map((digest) => [digest.slug, digest.title]));
  const seriesTitleMap = new Map(seriesRecords.map((series) => [series.slug, series.title]));

  const topPages = topPagePaths.map((item) => {
    const postSlug = getSlugFromPath(item.path, "/blog/");
    const noteSlug = getSlugFromPath(item.path, "/notes/");
    const digestSlug = getSlugFromPath(item.path, "/digest/");
    const seriesSlug = getSlugFromPath(item.path, "/series/");

    const title =
      (postSlug ? postTitleMap.get(postSlug) : null) ??
      (noteSlug ? noteTitleMap.get(noteSlug) : null) ??
      (digestSlug ? digestTitleMap.get(digestSlug) : null) ??
      (seriesSlug ? seriesTitleMap.get(seriesSlug) : null) ??
      item.path;

    return {
      path: item.path,
      title,
      views: item.views,
    };
  });

  const searchMap = new Map<string, { query: string; count: number; totalResults: number }>();

  for (const log of searchLogs) {
    const current = searchMap.get(log.normalizedQuery) ?? {
      query: log.query,
      count: 0,
      totalResults: 0,
    };

    current.query = current.query.length >= log.query.length ? current.query : log.query;
    current.count += 1;
    current.totalResults += log.resultCount;
    searchMap.set(log.normalizedQuery, current);
  }

  const topSearchQueries = [...searchMap.values()]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.totalResults - left.totalResults;
    })
    .slice(0, 10)
    .map((entry) => ({
      query: entry.query,
      count: entry.count,
      averageResults: entry.count > 0 ? entry.totalResults / entry.count : 0,
    }));

  return {
    windowDays,
    totals: {
      pageViews: pageViews.length,
      uniqueVisitors,
      searches: searchLogs.length,
      archiveVisits,
      blogViews,
      approvedComments: approvedComments.length,
    },
    topPages,
    topPosts,
    topSearchQueries,
    archiveTrend: buildDailyTrend(archiveViewDates, 14),
    viewsTrend: buildDailyTrend(allViewDates, 14),
  };
}
