import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Images,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getAdminGalleryAlbums, getGalleryOverviewStats } from "@/lib/gallery-queries";
import { formatPostStatusLabel } from "@/lib/ui-labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getCoverUrl(album: Awaited<ReturnType<typeof getAdminGalleryAlbums>>[number]) {
  return album.coverImageUrl || album.images[0]?.imageUrl || null;
}

function albumTitle(album: Awaited<ReturnType<typeof getAdminGalleryAlbums>>[number]) {
  return album.title?.trim() || "未命名相册";
}

function albumSummary(album: Awaited<ReturnType<typeof getAdminGalleryAlbums>>[number]) {
  return album.summary?.trim() || "还没有填写相册摘要，可以在编辑页里补充这组图片的主题、拍摄背景或整理说明。";
}

function infoPanelClass() {
  return "rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] p-4 text-sm leading-7 text-[var(--ink-soft)]";
}

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const [{ deleted, error }, albums, stats] = await Promise.all([
    searchParams,
    getAdminGalleryAlbums(),
    getGalleryOverviewStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">相册</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--ink)]">
            相册管理
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            在这里整理视觉相册、调整图片顺序，并把它们作为独立页面发布到站点里。列表现在改成了更宽松的单列排布，
            方便在后台快速浏览每个相册的摘要、封面、图片数和发布时间。
          </p>
        </div>

        <Link href="/admin/gallery/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          新建相册
        </Link>
      </div>

      {deleted === "1" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          相册已删除。
        </div>
      ) : null}

      {error === "client" ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          当前运行中的 Prisma Client 版本比最新 schema 更旧。请重新启动一次 Next.js 开发服务器
          （`npm run dev`），然后相册模块就会恢复正常。
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            相册数
          </p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight text-[var(--ink)]">
            {stats.totalAlbums}
          </p>
        </div>

        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            已发布
          </p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight text-[var(--ink)]">
            {stats.publishedAlbums}
          </p>
        </div>

        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            精选
          </p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight text-[var(--ink)]">
            {stats.featuredAlbums}
          </p>
        </div>

        <div className="outline-card rounded-[1.8rem] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
            图片数
          </p>
          <p className="mt-4 font-serif text-5xl font-semibold tracking-tight text-[var(--ink)]">
            {stats.totalImages}
          </p>
        </div>
      </div>

      {albums.length > 0 ? (
        <div className="space-y-5">
          {albums.map((album) => {
            const coverUrl = getCoverUrl(album);
            const title = albumTitle(album);
            const summary = albumSummary(album);
            const tags = album.tags.slice(0, 6);

            return (
              <article key={album.id} className="glass-card overflow-hidden rounded-[2rem]">
                <div className="grid gap-0 xl:grid-cols-[20rem_minmax(0,1fr)]">
                  <div className="relative min-h-[15rem] border-b border-[color:var(--border)] xl:border-r xl:border-b-0">
                    {coverUrl ? (
                      <div
                        className="h-full min-h-[15rem] bg-cover bg-center"
                        style={{ backgroundImage: `url("${coverUrl}")` }}
                      />
                    ) : (
                      <div className="flex h-full min-h-[15rem] items-center justify-center bg-[var(--panel-soft)] text-sm font-semibold text-[var(--ink-soft)]">
                        暂无封面
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(20,33,43,0.62)] via-[rgba(20,33,43,0.28)] to-transparent p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[rgba(255,248,238,0.92)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                          {formatPostStatusLabel(album.status)}
                        </span>
                        {album.featured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(27,107,99,0.92)] px-3 py-1 text-xs font-semibold text-white">
                            <Sparkles className="h-3.5 w-3.5" />
                            精选
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-7">
                    <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-start 2xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-5">
                        <div className="space-y-3">
                          <h2 className="font-serif text-[clamp(1.55rem,2.4vw,2.3rem)] font-semibold tracking-tight text-[var(--ink)]">
                            {title}
                          </h2>
                          <p className="max-w-4xl text-sm leading-8 text-[var(--ink-soft)]">
                            {summary}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className={infoPanelClass()}>
                            <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                              <Images className="h-4 w-4 text-[var(--accent)]" />
                              内容概览
                            </div>
                            <div className="mt-2">{album._count.images} 张图片</div>
                            <div>Slug：/{album.slug}</div>
                          </div>

                          <div className={infoPanelClass()}>
                            <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                              <UserRound className="h-4 w-4 text-[var(--accent)]" />
                              作者信息
                            </div>
                            <div className="mt-2">{album.author.name}</div>
                            <div className="truncate">{album.author.email}</div>
                          </div>

                          <div className={infoPanelClass()}>
                            <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                              <CalendarClock className="h-4 w-4 text-[var(--accent)]" />
                              时间状态
                            </div>
                            <div className="mt-2">
                              更新于：{formatDate(album.updatedAt, "yyyy-MM-dd HH:mm")}
                            </div>
                            <div>
                              发布于：
                              {album.publishedAt
                                ? formatDate(album.publishedAt, "yyyy-MM-dd HH:mm")
                                : "未发布"}
                            </div>
                          </div>
                        </div>

                        {tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span
                                key={`${album.id}-${tag}`}
                                className="rounded-full border border-[color:var(--border)] bg-[var(--panel-elevated)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="w-full shrink-0 2xl:w-[14rem]">
                        <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--panel-soft)] p-4">
                          <div className="text-sm font-semibold text-[var(--ink)]">快捷操作</div>
                          <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                            进入编辑页可以继续调整图片顺序、封面、摘要和发布状态。
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3 2xl:flex-col">
                            <Link href={`/admin/gallery/${album.id}`} className="btn-secondary">
                              <Images className="h-4 w-4" />
                              编辑相册
                            </Link>

                            {album.status === "PUBLISHED" ? (
                              <Link
                                href={`/gallery/${album.slug}`}
                                className="btn-secondary"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                                查看公开页
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] p-8 text-sm leading-8 text-[var(--ink-soft)]">
          还没有相册。创建一个之后，就可以开始发布这类以图片为主的内容集合了。
        </div>
      )}
    </div>
  );
}
