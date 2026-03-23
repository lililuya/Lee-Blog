import { notFound } from "next/navigation";
import { GalleryForm } from "@/components/forms/gallery-form";
import {
  deleteGalleryAlbumAction,
  updateGalleryAlbumAction,
} from "@/lib/actions/gallery-actions";
import { getAdminGalleryAlbumById } from "@/lib/gallery-queries";
import { siteImageMaxUploadLabel } from "@/lib/upload-config";

export const dynamic = "force-dynamic";

export default async function EditGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string }>;
}) {
  const { id } = await params;
  const [{ saved, created }, gallery] = await Promise.all([searchParams, getAdminGalleryAlbumById(id)]);

  if (!gallery) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">相册</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑相册</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            保存后会更新相册元信息，并用当前表单中的图片顺序覆盖原有顺序。
          </p>
        </div>
        <form
          action={deleteGalleryAlbumAction}
          data-confirm-message="确认删除这个相册吗？公开相册页和所有图片元数据都会被移除。"
        >
          <input type="hidden" name="galleryId" value={gallery.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除相册
          </button>
        </form>
      </div>

      {created === "1" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          相册已创建。你可以继续在下方完善元信息和图片顺序。
        </div>
      ) : null}

      {saved === "1" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          相册已保存。
        </div>
      ) : null}

      <GalleryForm
        action={updateGalleryAlbumAction}
        submitLabel="保存相册"
        confirmMessage="确认保存这个相册吗？相册元信息和图片顺序会立即更新。"
        uploadLimits={{ imageMaxUploadLabel: siteImageMaxUploadLabel }}
        gallery={gallery}
      />
    </div>
  );
}
