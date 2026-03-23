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

  return normalized || "画廊图片";
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
      setUploadMessage("请先选择一张或多张图片。");
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
          error: "上传过程中发生网络错误，已中断。",
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
            ? "服务器返回了无法识别的上传响应。"
            : "所选图片无法上传。"),
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
    setUploadMessage(`已上传 ${response.assets.length} 张图片，并追加到当前相册草稿中。`);
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
          <span className="text-sm font-semibold text-[var(--ink)]">相册标题</span>
          <input
            name="title"
            defaultValue={gallery?.title}
            className="field"
            placeholder="例如：苏州与杭州的春日田野记录"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input
            name="slug"
            defaultValue={gallery?.slug}
            className="field"
            placeholder="留空则根据标题自动生成"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">标签</span>
          <input
            name="tags"
            defaultValue={gallery?.tags.join(", ")}
            className="field"
            placeholder="例如：street, travel, archive"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">摘要</span>
          <textarea
            name="summary"
            defaultValue={gallery?.summary}
            rows={3}
            className="field min-h-24 resize-y"
            placeholder="给相册卡片和列表页用的一段简短介绍。"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">详细说明</span>
          <textarea
            name="description"
            defaultValue={gallery?.description}
            rows={7}
            className="field min-h-48 resize-y"
            placeholder="介绍这个相册的背景、编排逻辑、地点、氛围或背后的故事。"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">状态</span>
          <select name="status" className="field" defaultValue={gallery?.status ?? PostStatus.DRAFT}>
            <option value={PostStatus.DRAFT}>草稿</option>
            <option value={PostStatus.PUBLISHED}>已发布</option>
            <option value={PostStatus.ARCHIVED}>已归档</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">发布时间</span>
          <input
            name="publishedAt"
            type="datetime-local"
            defaultValue={toDateTimeLocalString(gallery?.publishedAt)}
            className="field"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">封面图 URL</span>
          <input
            name="coverImageUrl"
            defaultValue={gallery?.coverImageUrl ?? ""}
            className="field"
            placeholder="留空则默认使用当前相册的第一张图片"
          />
        </label>
      </div>

      <section className="space-y-4 rounded-[1.8rem] border border-black/8 bg-[rgba(255,255,255,0.48)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">图片</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">相册图片</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
              每张照片对应一行图片记录。列表顺序会成为相册的展示顺序，第一张图也可以作为默认封面。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary self-start md:self-auto" onClick={addImage}>
              <ImagePlus className="h-4 w-4" />
              新增一行
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] p-4">
          <div className="grid gap-2 text-sm leading-7 text-[var(--ink-soft)]">
            <p>
              <span className="font-semibold text-[var(--ink)]">必填：</span>每个相册至少要包含一张图片。
            </p>
            <p>
              <span className="font-semibold text-[var(--ink)]">图片行：</span>每一行只要填写了其他内容，就必须包含图片 URL，
              可以手动粘贴，也可以通过下方上传器添加。
            </p>
            <p>
              <span className="font-semibold text-[var(--ink)]">上传限制：</span>支持 PNG、JPG/JPEG 和 WEBP，
              单张图片最大 {uploadLimits.imageMaxUploadLabel}。
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(27,107,99,0.14)] bg-[rgba(27,107,99,0.06)] p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">直接上传图片</span>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                PNG、JPG/JPEG 和 WEBP 文件单张最大 {uploadLimits.imageMaxUploadLabel}。
                上传成功后，文件会保存到当前配置的媒体存储中，并自动追加到下方草稿列表。
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
              {uploadPhase === "uploading" ? "上传中..." : "上传所选图片"}
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
                <span>{uploadMessage ?? "正在上传相册图片..."}</span>
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
              ? `${invalidImageUrlCount} 行图片使用了不支持的 URL 格式。请使用完整 URL，或像 /uploads/site/example.jpg 这样的站点根路径。`
              : validImageCount === 0
              ? "保存相册前，至少需要一张图片。"
              : `还有 ${incompleteImageCount} 行图片缺少图片 URL，暂时无法保存相册。`}
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.08)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
            当前已有 {validImageCount} 张图片可用于这个相册。
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
                      图片 {index + 1}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                      可使用已上传媒体 URL、像 <code>/uploads/site/example.jpg</code> 这样的站点根路径，
                      或任意外部图片链接。
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
                      上移
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2 text-sm"
                      onClick={() => moveImage(index, "down")}
                      disabled={index === images.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                      下移
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-4 py-2 text-sm text-rose-700"
                      onClick={() => removeImage(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        图片 URL <span className="text-rose-600">*</span>
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
                          ? "这一行已经填写了内容，但还没有图片 URL。"
                          : hasInvalidImageUrl
                            ? "请使用完整 URL，或像 /uploads/site/example.jpg 这样的站点根路径。"
                            : "每一行只要不是空白行，就必须填写图片 URL。支持已上传媒体 URL 和站点根路径。"}
                      </p>
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">替代文本</span>
                      <input
                        value={image.alt}
                        onChange={(event) => updateImage(index, "alt", event.target.value)}
                        className="field"
                        placeholder="请用清楚的文字描述图片，方便无障碍阅读。"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">图注</span>
                      <textarea
                        value={image.caption}
                        onChange={(event) => updateImage(index, "caption", event.target.value)}
                        rows={3}
                        className="field min-h-24 resize-y"
                        placeholder="可选的图注或补充说明，会显示在图片下方。"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">缩略图 URL</span>
                      <input
                        value={image.thumbUrl}
                        onChange={(event) => updateImage(index, "thumbUrl", event.target.value)}
                        className="field"
                        placeholder="可选的轻量缩略图地址"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">拍摄时间</span>
                      <input
                        value={image.shotAt}
                        onChange={(event) => updateImage(index, "shotAt", event.target.value)}
                        type="datetime-local"
                        className="field"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">宽度</span>
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
                      <span className="text-sm font-semibold text-[var(--ink)]">高度</span>
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
                    <span className="text-sm font-semibold text-[var(--ink)]">预览</span>
                    <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-[rgba(20,33,43,0.04)]">
                      {hasPreview ? (
                        <div
                          className="aspect-[4/3] bg-cover bg-center"
                          style={{ backgroundImage: `url("${image.imageUrl}")` }}
                        />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center px-6 text-center text-sm leading-7 text-[var(--ink-soft)]">
                          粘贴图片 URL 后，这里会显示预览。
                        </div>
                      )}
                    </div>
                    <p className="text-xs leading-6 text-[var(--ink-soft)]">
                      这里的预览仅用于整理内容。公开页面仍会渲染原始图片和对应图注。
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
            标记为精选相册
          </label>
        </div>

        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          精选相册后续可以在列表页中高亮展示。如果没有手动设置封面图，系统会自动把第一张图片作为默认封面。
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton disabled={!canSubmit}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
