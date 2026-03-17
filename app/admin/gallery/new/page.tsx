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
        <p className="section-kicker">Gallery</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">New gallery album</h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          Assemble a visual series with one or more images, then publish it as a standalone gallery
          page.
        </p>
      </div>

      {error === "client" || !hasSupport ? (
        <div className="rounded-[1.6rem] border border-[rgba(180,83,9,0.2)] bg-[rgba(180,83,9,0.08)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          The running Prisma client is older than the latest Gallery schema update, so this page cannot
          create albums yet. Restart your local Next.js dev server once, then reopen this page and try
          again.
        </div>
      ) : null}

      {hasSupport ? (
        <GalleryForm
          action={createGalleryAlbumAction}
          submitLabel="Create gallery"
          uploadLimits={{ imageMaxUploadLabel: siteImageMaxUploadLabel }}
        />
      ) : null}
    </div>
  );
}
