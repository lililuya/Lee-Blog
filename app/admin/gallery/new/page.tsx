import { GalleryForm } from "@/components/forms/gallery-form";
import { createGalleryAlbumAction } from "@/lib/actions/gallery-actions";
import { hasGalleryAlbumSupport } from "@/lib/prisma";
import { siteImageMaxUploadLabel } from "@/lib/upload-config";

export const dynamic = "force-dynamic";

export default async function NewGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }] = await Promise.all([searchParams]);
  const hasSupport = hasGalleryAlbumSupport();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="section-kicker">相册</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建相册</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          用一张或多张图片组成一个视觉主题，然后把它发布成独立的相册页面。
        </p>
      </div>

      {error === "client" || !hasSupport ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          当前运行中的 Prisma client 版本比最新相册 schema 更旧，所以这个页面暂时还不能创建相册。
          请重启一次本地 Next.js 开发服务器，然后重新打开此页再试。
        </div>
      ) : null}

      {hasSupport ? (
        <GalleryForm
          action={createGalleryAlbumAction}
          submitLabel="创建相册"
          uploadLimits={{ imageMaxUploadLabel: siteImageMaxUploadLabel }}
        />
      ) : null}
    </div>
  );
}
