import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Images, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { TagLinkPill } from "@/components/site/tag-link-pill";
import {
  buildCollectionPageJsonLd,
  buildContentMetadata,
  buildItemListJsonLd,
} from "@/lib/content-seo";
import { getPublishedGalleryAlbums } from "@/lib/gallery-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildContentMetadata({
  title: "视觉图集",
  description:
    "用于展示田野记录、旅行影像、界面收集和图像叙事的视觉图集。",
  path: "/gallery",
  keywords: ["图集", "视觉图集", "影像叙事", "图片归档"],
  section: "图集",
  type: "website",
  ogEyebrow: "图集",
});

export default async function GalleryIndexPage() {
  const albums = await getPublishedGalleryAlbums();
  const featuredAlbums = albums.filter((album) => album.featured).length;
  const totalImages = albums.reduce((total, album) => total + album._count.images, 0);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Lee 博客图集",
    description:
      "公开展示的视觉图集合集，适合放田野记录、旅行影像和图像叙事内容。",
    path: "/gallery",
    itemCount: albums.length,
    keywords: ["图集", "视觉图集", "影像叙事", "图片归档"],
  });
  const itemListJsonLd = buildItemListJsonLd({
    name: "图集列表",
    path: "/gallery",
    items: albums.map((album) => ({
      name: album.title,
      path: `/gallery/${album.slug}`,
    })),
  });

  return (
    <div className="container-shell py-16">
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={itemListJsonLd} />

      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="图集"
          title="视觉图集"
          description="这里适合放田野记录、旅行影像、视觉归档、界面观察和其他更适合按顺序阅读的图像内容。"
          href="/archive"
          linkLabel="浏览归档"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--ink-soft)]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>{albums.length} 个已发布图集</span>
            <span>{featuredAlbums} 个精选</span>
            <span>{totalImages} 张图片</span>
          </div>
          <Link
            href="/search?q=gallery"
            className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
          >
            搜索图集
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {albums.length > 0 ? (
          <div className="editorial-list">
            {albums.map((album, index) => {
              const coverUrl = album.coverImageUrl || album.images[0]?.imageUrl || null;
              const title = album.title || "未命名图集";
              const summary = album.summary || "这组图集暂时还没有摘要说明。";

              return (
                <article key={album.slug} className="editorial-list-item group">
                  <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)_10rem] lg:items-start">
                    <Link
                      href={`/gallery/${album.slug}`}
                      className="editorial-thumb block min-h-[11rem] transition group-hover:border-[rgba(27,107,99,0.22)]"
                    >
                      {coverUrl ? (
                        <div
                          className="h-full min-h-[11rem] bg-cover bg-center transition duration-500 group-hover:scale-[1.02]"
                          style={{ backgroundImage: `url("${coverUrl}")` }}
                        />
                      ) : (
                        <div className="flex h-full min-h-[11rem] items-center justify-center px-6 text-sm font-semibold text-[var(--ink-soft)]">
                          暂无图集封面
                        </div>
                      )}
                    </Link>

                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span className="badge-soft">
                          <Images className="h-3.5 w-3.5" />
                          {album._count.images} 张图片
                        </span>
                        {album.featured ? (
                          <span className="rounded-full bg-[rgba(168,123,53,0.14)] px-3 py-1 text-[0.72rem] text-[var(--gold)]">
                            <span className="inline-flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" />
                              精选
                            </span>
                          </span>
                        ) : null}
                        <span>{formatDate(album.publishedAt, "yyyy-MM-dd")}</span>
                      </div>

                      <div className="space-y-3">
                        <h2
                          className={`font-serif font-semibold tracking-tight text-[var(--ink)] ${
                            index === 0
                              ? "text-[clamp(2.2rem,3.8vw,3.6rem)] leading-[0.98]"
                              : "text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.02]"
                          }`}
                        >
                          <Link
                            href={`/gallery/${album.slug}`}
                            className="transition hover:text-[var(--accent-strong)]"
                          >
                            {title}
                          </Link>
                        </h2>
                        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                          {summary}
                        </p>
                      </div>

                      {album.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {album.tags.slice(0, 6).map((tag) => (
                            <TagLinkPill key={`${album.slug}-${tag}`} tag={tag} />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end lg:text-right">
                      <div className="text-sm leading-7 text-[var(--ink-soft)]">
                        一组适合按顺序阅读的图像内容，附带独立详情页。
                      </div>
                      <Link
                        href={`/gallery/${album.slug}`}
                        className="section-link-pill section-link-pill--compact"
                      >
                        打开图集
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="editorial-panel p-8 text-sm leading-8 text-[var(--ink-soft)]">
            目前还没有已发布图集。你可以先在后台创建内容，这里就会开始形成公开图像归档。
          </div>
        )}
      </div>
    </div>
  );
}
