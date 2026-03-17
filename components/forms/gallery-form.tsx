"use client";

import { PostStatus } from "@prisma/client";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

type GalleryImageDraft = {
  clientId: string;
  imageUrl: string;
  thumbUrl: string;
  alt: string;
  caption: string;
  width: string;
  height: string;
  shotAt: string;
};

type GalleryFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
  uploadLimits: {
    imageMaxUploadLabel: string;
  };
  gallery?: {
    id: string;
    title: string;
    slug: string;
    summary: string;
    description: string;
    coverImageUrl: string | null;
    tags: string[];
    status: PostStatus;
    featured: boolean;
    publishedAt: Date | null;
    images: Array<{
      id: string;
      imageUrl: string;
      thumbUrl: string | null;
      alt: string;
      caption: string | null;
      width: number | null;
      height: number | null;
      shotAt: Date | null;
      sortOrder: number;
    }>;
  } | null;
};

function createEmptyImageDraft(): GalleryImageDraft {
  return {
    clientId: crypto.randomUUID(),
    imageUrl: "",
    thumbUrl: "",
    alt: "",
    caption: "",
    width: "",
    height: "",
    shotAt: "",
  };
}

function buildAltFromFileName(fileName: string) {
  const normalized = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "Gallery image";
}

function isImageDraftEmpty(image: GalleryImageDraft) {
  return (
    !image.imageUrl.trim() &&
    !image.thumbUrl.trim() &&
    !image.alt.trim() &&
    !image.caption.trim() &&
    !image.width.trim() &&
    !image.height.trim() &&
    !image.shotAt.trim()
  );
}

function isValidGalleryImageUrl(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return false;
  }

  if (/^\/[^\s]*$/.test(normalized)) {
    return true;
  }

  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

function toDateTimeLocalString(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function buildInitialImages(
  images:
    | Array<{
        id: string;
        imageUrl: string;
        thumbUrl: string | null;
        alt: string;
        caption: string | null;
        width: number | null;
        height: number | null;
        shotAt: Date | null;
        sortOrder: number;
      }>
    | undefined,
) {
  if (!images?.length) {
    return [createEmptyImageDraft()];
  }

  return images
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image) => ({
      clientId: image.id,
      imageUrl: image.imageUrl,
      thumbUrl: image.thumbUrl ?? "",
      alt: image.alt,
      caption: image.caption ?? "",
      width: image.width ? String(image.width) : "",
      height: image.height ? String(image.height) : "",
      shotAt: toDateTimeLocalString(image.shotAt),
    }));
}

export function GalleryForm({
  action,
  submitLabel,
  confirmMessage,
  uploadLimits,
  gallery,
}: GalleryFormProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImageDraft[]>(() => buildInitialImages(gallery?.images));
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const validImageCount = images.filter((image) => isValidGalleryImageUrl(image.imageUrl)).length;
  const incompleteImageCount = images.filter(
    (image) => !image.imageUrl.trim() && !isImageDraftEmpty(image),
  ).length;
  const invalidImageUrlCount = images.filter((image) => {
    const imageUrl = image.imageUrl.trim();
    return Boolean(imageUrl) && !isValidGalleryImageUrl(imageUrl);
  }).length;
  const canSubmit = validImageCount > 0 && incompleteImageCount === 0 && invalidImageUrlCount === 0;

  const serializedImages = JSON.stringify(
    images.map((image) => ({
      imageUrl: image.imageUrl,
      thumbUrl: image.thumbUrl,
      alt: image.alt,
      caption: image.caption,
      shotAt: image.shotAt,
      width: image.width.trim() ? Number(image.width) : null,
      height: image.height.trim() ? Number(image.height) : null,
    })),
  );

  function updateImage(index: number, field: keyof Omit<GalleryImageDraft, "clientId">, value: string) {
    setImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? {
              ...image,
              [field]: value,
            }
          : image,
      ),
    );
  }

  function addImage() {
    setImages((current) => [...current, createEmptyImageDraft()]);
  }

  function removeImage(index: number) {
    setImages((current) => {
      if (current.length === 1) {
        return [createEmptyImageDraft()];
      }

      return current.filter((_, imageIndex) => imageIndex !== index);
    });
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextImages = [...current];
      const [item] = nextImages.splice(index, 1);
      nextImages.splice(nextIndex, 0, item);
      return nextImages;
    });
  }

  async function uploadSelectedImages() {
    const files = Array.from(uploadInputRef.current?.files ?? []);

    if (files.length === 0) {
      setUploadPhase("error");
      setUploadProgress(0);
      setUploadMessage("Select one or more images first.");
      return;
    }

    setUploadPhase("uploading");
    setUploadProgress(0);
    setUploadMessage(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await new Promise<{
      ok: boolean;
      status: number;
      assets?: Array<{ url: string; originalName: string }>;
      error?: string | null;
      parseError?: boolean;
    }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/gallery/assets", true);
      xhr.responseType = "json";
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        setUploadProgress((progressEvent.loaded / progressEvent.total) * 100);
      };

      xhr.onerror = () => {
        resolve({
          ok: false,
          status: xhr.status,
          error: "The upload was interrupted by a network error.",
        });
      };

      xhr.onload = () => {
        const payload =
          xhr.response && typeof xhr.response === "object"
            ? (xhr.response as {
                ok?: boolean;
                assets?: Array<{ url: string; originalName: string }>;
                error?: string | null;
              })
            : null;

        if (!payload) {
          resolve({
            ok: false,
            status: xhr.status,
            parseError: true,
          });
          return;
        }

        resolve({
          ok: xhr.status >= 200 && xhr.status < 300 && Boolean(payload.ok),
          status: xhr.status,
          assets: payload.assets,
          error: payload.error ?? null,
        });
      };

      xhr.send(formData);
    });

    if (!response.ok || !response.assets?.length) {
      setUploadPhase("error");
      setUploadProgress(0);
      setUploadMessage(
        response.error ??
          (response.parseError
            ? "The server returned an unexpected upload response."
            : "The selected images could not be uploaded."),
      );
      return;
    }

    const nextDrafts = response.assets.map((asset) => ({
      clientId: crypto.randomUUID(),
      imageUrl: asset.url,
      thumbUrl: "",
      alt: buildAltFromFileName(asset.originalName),
      caption: "",
      width: "",
      height: "",
      shotAt: "",
    }));

    setImages((current) => {
      if (current.length === 1 && isImageDraftEmpty(current[0])) {
        return nextDrafts;
      }

      return [...current, ...nextDrafts];
    });

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    setUploadPhase("done");
    setUploadProgress(100);
    setUploadMessage(`${response.assets.length} image(s) uploaded and appended to the album draft.`);
  }

  return (
    <form
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {gallery ? <input type="hidden" name="galleryId" value={gallery.id} /> : null}
      <input type="hidden" name="imagesJson" value={serializedImages} />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Album title</span>
          <input
            name="title"
            defaultValue={gallery?.title}
            className="field"
            placeholder="For example: Spring field notes from Suzhou and Hangzhou"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={gallery?.slug}
            className="field"
            placeholder="Leave empty to generate from the title"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Tags</span>
          <input
            name="tags"
            defaultValue={gallery?.tags.join(", ")}
            className="field"
            placeholder="street, travel, archive"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Summary</span>
          <textarea
            name="summary"
            defaultValue={gallery?.summary}
            rows={3}
            className="field min-h-24 resize-y"
            placeholder="A short introduction for gallery cards and list pages."
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Description</span>
          <textarea
            name="description"
            defaultValue={gallery?.description}
            rows={7}
            className="field min-h-48 resize-y"
            placeholder="Describe the context, curation logic, location, mood, or story behind this album."
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Status</span>
          <select name="status" className="field" defaultValue={gallery?.status ?? PostStatus.DRAFT}>
            <option value={PostStatus.DRAFT}>Draft</option>
            <option value={PostStatus.PUBLISHED}>Published</option>
            <option value={PostStatus.ARCHIVED}>Archived</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Published At</span>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalString(gallery?.publishedAt)}
            className="field"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Cover image URL</span>
          <input
            name="coverImageUrl"
            defaultValue={gallery?.coverImageUrl ?? ""}
            className="field"
            placeholder="Leave empty to use the first image in this album"
          />
        </label>
      </div>

      <section className="space-y-4 rounded-[1.8rem] border border-black/8 bg-[rgba(255,255,255,0.48)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">Images</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Album images</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
              Add one image row per photo. The list order becomes the gallery reading order and the first
              image can act as the default cover.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary self-start md:self-auto" onClick={addImage}>
              <ImagePlus className="h-4 w-4" />
              Add row
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] p-4">
          <div className="grid gap-2 text-sm leading-7 text-[var(--ink-soft)]">
            <p>
              <span className="font-semibold text-[var(--ink)]">Required:</span> each gallery must include
              at least one image.
            </p>
            <p>
              <span className="font-semibold text-[var(--ink)]">Image rows:</span> every non-empty row must
              include an image URL, either pasted manually or added through the uploader below.
            </p>
            <p>
              <span className="font-semibold text-[var(--ink)]">Upload limits:</span> PNG, JPG/JPEG, and
              WEBP are supported, up to {uploadLimits.imageMaxUploadLabel} per image.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(27,107,99,0.14)] bg-[rgba(27,107,99,0.06)] p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">Upload images directly</span>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                PNG, JPG/JPEG, and WEBP uploads can be up to {uploadLimits.imageMaxUploadLabel} each.
                Uploaded files are stored under <code>/uploads/site</code> and appended into the draft list
                below.
              </p>
            </label>

            <button
              type="button"
              className="btn-secondary self-start md:self-auto"
              onClick={uploadSelectedImages}
              disabled={uploadPhase === "uploading"}
            >
              {uploadPhase === "uploading" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadPhase === "uploading" ? "Uploading..." : "Upload selected"}
            </button>
          </div>

          {uploadPhase !== "idle" ? (
            <div
              className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-sm leading-7 ${
                uploadPhase === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.08)] text-[var(--ink-soft)]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{uploadMessage ?? "Uploading gallery images..."}</span>
                {uploadPhase === "uploading" ? <span>{Math.round(uploadProgress)}%</span> : null}
              </div>
              {uploadPhase === "uploading" ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${Math.max(6, Math.min(100, uploadProgress))}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {!canSubmit ? (
          <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700">
            {invalidImageUrlCount > 0
              ? `${invalidImageUrlCount} image row(s) use an unsupported URL format. Use either a full URL or a root-relative path like /uploads/site/example.jpg.`
              : validImageCount === 0
              ? "At least one image is required before this gallery can be saved."
              : `${incompleteImageCount} image row(s) still need an Image URL before you can save this gallery.`}
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
            {validImageCount} image(s) ready for this gallery.
          </div>
        )}

        <div className="space-y-4">
          {images.map((image, index) => {
            const hasPreview = image.imageUrl.trim().length > 0;
            const isMissingRequiredImage = !image.imageUrl.trim() && !isImageDraftEmpty(image);
            const hasInvalidImageUrl =
              Boolean(image.imageUrl.trim()) && !isValidGalleryImageUrl(image.imageUrl);

            return (
              <article key={image.clientId} className="rounded-[1.6rem] border border-black/8 bg-white/80 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                      Image {index + 1}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                      Use root-relative URLs like <code>/uploads/site/example.jpg</code> or external image links.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2 text-sm"
                      onClick={() => moveImage(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2 text-sm"
                      onClick={() => moveImage(index, "down")}
                      disabled={index === images.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                      Down
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2 text-sm text-rose-700"
                      onClick={() => removeImage(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        Image URL <span className="text-rose-600">*</span>
                      </span>
                      <input
                        value={image.imageUrl}
                        onChange={(event) => updateImage(index, "imageUrl", event.target.value)}
                        className={`field ${
                          isMissingRequiredImage || hasInvalidImageUrl
                            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                            : ""
                        }`}
                        placeholder="https://images.example.com/photo.jpg"
                      />
                      <p
                        className={`text-xs leading-6 ${
                          isMissingRequiredImage || hasInvalidImageUrl
                            ? "text-rose-700"
                            : "text-[var(--ink-soft)]"
                        }`}
                      >
                        {isMissingRequiredImage
                          ? "This row has content but no image URL yet."
                          : hasInvalidImageUrl
                            ? "Use either a full URL or a root-relative path like /uploads/site/example.jpg."
                            : "Required for every non-empty image row. Root-relative URLs like /uploads/site/example.jpg are also supported."}
                      </p>
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Alt text</span>
                      <input
                        value={image.alt}
                        onChange={(event) => updateImage(index, "alt", event.target.value)}
                        className="field"
                        placeholder="Describe the image clearly for accessibility."
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Caption</span>
                      <textarea
                        value={image.caption}
                        onChange={(event) => updateImage(index, "caption", event.target.value)}
                        rows={3}
                        className="field min-h-24 resize-y"
                        placeholder="Optional caption or note shown under the image."
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Thumbnail URL</span>
                      <input
                        value={image.thumbUrl}
                        onChange={(event) => updateImage(index, "thumbUrl", event.target.value)}
                        className="field"
                        placeholder="Optional lighter thumbnail"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Shot at</span>
                      <input
                        value={image.shotAt}
                        onChange={(event) => updateImage(index, "shotAt", event.target.value)}
                        type="datetime-local"
                        className="field"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Width</span>
                      <input
                        value={image.width}
                        onChange={(event) => updateImage(index, "width", event.target.value)}
                        type="number"
                        min={1}
                        className="field"
                        placeholder="1600"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">Height</span>
                      <input
                        value={image.height}
                        onChange={(event) => updateImage(index, "height", event.target.value)}
                        type="number"
                        min={1}
                        className="field"
                        placeholder="1200"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <span className="text-sm font-semibold text-[var(--ink)]">Preview</span>
                    <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-[rgba(20,33,43,0.04)]">
                      {hasPreview ? (
                        <div
                          className="aspect-[4/3] bg-cover bg-center"
                          style={{ backgroundImage: `url("${image.imageUrl}")` }}
                        />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm leading-7 text-[var(--ink-soft)]">
                          Paste an image URL to preview it here.
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-6 text-[var(--ink-soft)]">
                      This preview is for curation only. Public pages will render the original image and its caption.
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={gallery?.featured}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Feature this album
          </label>
        </div>

        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          Featured albums can be highlighted on listing pages later. If no cover image is set manually,
          the first gallery image becomes the default cover automatically.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton disabled={!canSubmit}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
