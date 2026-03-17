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
          <p className="section-kicker">Gallery</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit gallery album</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            Save changes to update album metadata and replace the image order with the current form
            state.
          </p>
        </div>
        <form
          action={deleteGalleryAlbumAction}
          data-confirm-message="Delete this gallery album? The public gallery page and all image metadata will be removed."
        >
          <input type="hidden" name="galleryId" value={gallery.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            Delete gallery
          </button>
        </form>
      </div>

      {created === "1" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          Gallery album created. Continue editing the metadata and image sequence below.
        </div>
      ) : null}

      {saved === "1" ? (
        <div className="rounded-[1.6rem] border border-[rgba(27,107,99,0.18)] bg-[rgba(27,107,99,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          Gallery album saved.
        </div>
      ) : null}

      <GalleryForm
        action={updateGalleryAlbumAction}
        submitLabel="Save gallery"
        confirmMessage="Save changes to this gallery? The album metadata and image order will be updated immediately."
        uploadLimits={{ imageMaxUploadLabel: siteImageMaxUploadLabel }}
        gallery={gallery}
      />
    </div>
  );
}
