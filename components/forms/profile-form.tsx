"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

type BackgroundMediaMode = "IMAGE" | "VIDEO";

type SubmitPhase = "idle" | "uploading" | "processing" | "redirecting" | "error";

type ProfileFormProps = {
  action: string;
  confirmMessage?: string;
  uploadLimits: {
    imageMaxUploadLabel: string;
    videoMaxUploadLabel: string;
    videoTargetBitrateLabel: string;
  };
  profile: {
    fullName: string;
    headline: string;
    tagline: string;
    shortBio: string;
    longBio: string;
    institution: string | null;
    department: string | null;
    location: string | null;
    email: string | null;
    websiteUrl: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    scholarUrl: string | null;
    cvUrl: string | null;
    heroImageUrl: string | null;
    backgroundImageUrl: string | null;
    backgroundVideoUrl: string | null;
    backgroundMediaMode: string;
    backgroundOverlayOpacity: number;
    assistantAvatarUrl: string | null;
    chatEnabledForReaders: boolean;
    researchAreas: string[];
    educationMarkdown: string;
    experienceMarkdown: string;
    awardsMarkdown: string;
    speakingMarkdown: string;
  };
};

function ProgressBanner({
  phase,
  progress,
  errorMessage,
}: {
  phase: SubmitPhase;
  progress: number;
  errorMessage: string | null;
}) {
  if (phase === "idle") {
    return null;
  }

  if (phase === "error") {
    return (
      <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {errorMessage ?? "上传未能完成，请稍后再试。"}
      </div>
    );
  }

  const uploadProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const statusText =
    phase === "uploading"
      ? `正在上传媒体：${uploadProgress}%`
      : phase === "processing"
        ? "上传完成，服务器正在转码并保存背景视频..."
        : "保存完成，正在返回资料页面...";

  return (
    <div className="rounded-[1.4rem] border border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.08)] px-4 py-4 text-sm text-[var(--accent-strong)]">
      <div className="flex items-center gap-3">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        <span>{statusText}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(20,33,43,0.08)]">
        <div
          className={`h-full rounded-full bg-[var(--accent)] transition-all duration-300 ${
            phase === "processing" || phase === "redirecting" ? "animate-pulse" : ""
          }`}
          style={{ width: phase === "uploading" ? `${Math.max(uploadProgress, 6)}%` : "100%" }}
        />
      </div>
      <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
        大视频在服务端压缩阶段会耗时更久，尤其是第一次保存时。
      </p>
    </div>
  );
}

export function ProfileForm({ action, confirmMessage, uploadLimits, profile }: ProfileFormProps) {
  const [selectedMode, setSelectedMode] = useState<BackgroundMediaMode>(
    profile.backgroundMediaMode === "VIDEO" ? "VIDEO" : "IMAGE",
  );
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeBackgroundPreview = profile.backgroundImageUrl?.replace(/"/g, '\\"') ?? null;
  const safeBackgroundVideoPreview = profile.backgroundVideoUrl?.trim() || null;
  const safeAssistantAvatarPreview = profile.assistantAvatarUrl?.replace(/"/g, '\\"') ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const hasVideoUpload = (formData.get("backgroundVideoFile") as File | null)?.size
      ? true
      : false;

    setSubmitPhase("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    const response = await new Promise<{
      ok: boolean;
      status: number;
      redirectTo?: string;
      error?: string | null;
      parseError?: boolean;
    }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", action, true);
      xhr.responseType = "json";
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const nextProgress = (progressEvent.loaded / progressEvent.total) * 100;
        setUploadProgress(nextProgress);
      };

      xhr.upload.onload = () => {
        setUploadProgress(100);
        setSubmitPhase(hasVideoUpload ? "processing" : "redirecting");
      };

      xhr.onerror = () => {
        resolve({
          ok: false,
          status: xhr.status,
          error: "network",
        });
      };

      xhr.onload = () => {
        const payload =
          xhr.response && typeof xhr.response === "object"
            ? (xhr.response as { ok?: boolean; redirectTo?: string; error?: string | null })
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
          redirectTo: payload.redirectTo,
          error: payload.error ?? null,
        });
      };

      xhr.send(formData);
    });

    if (response.redirectTo) {
      setSubmitPhase("redirecting");
      window.location.assign(response.redirectTo);
      return;
    }

    if (!response.ok) {
      setSubmitPhase("error");
      setUploadProgress(0);
      setErrorMessage(
        response.error === "network"
          ? "上传过程中网络连接中断。"
          : response.parseError
            ? "服务器返回了无法识别的响应，请重试。"
            : "背景媒体暂时无法保存，请检查表单后再试。",
      );
      return;
    }
  }

  return (
    <form
      action={action}
      data-confirm-message={confirmMessage}
      method="post"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      <ProgressBanner phase={submitPhase} progress={uploadProgress} errorMessage={errorMessage} />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">姓名</span>
          <input name="fullName" defaultValue={profile.fullName} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">主标题</span>
          <input name="headline" defaultValue={profile.headline} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">副标题</span>
          <input name="tagline" defaultValue={profile.tagline} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">简短介绍</span>
          <textarea
            name="shortBio"
            defaultValue={profile.shortBio}
            required
            rows={4}
            className="field min-h-28 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">详细介绍</span>
          <textarea
            name="longBio"
            defaultValue={profile.longBio}
            rows={6}
            className="field min-h-40 resize-y"
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            这是可选项。现在先写短一点也可以，后面再慢慢扩展。
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">机构</span>
          <input name="institution" defaultValue={profile.institution ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">部门</span>
          <input name="department" defaultValue={profile.department ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">所在地</span>
          <input name="location" defaultValue={profile.location ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
          <input name="email" defaultValue={profile.email ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">网站</span>
          <input name="websiteUrl" defaultValue={profile.websiteUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">GitHub</span>
          <input name="githubUrl" defaultValue={profile.githubUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">LinkedIn</span>
          <input name="linkedinUrl" defaultValue={profile.linkedinUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Scholar</span>
          <input name="scholarUrl" defaultValue={profile.scholarUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">简历 URL</span>
          <input name="cvUrl" defaultValue={profile.cvUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">主页主图路径或 URL</span>
          <input
            name="heroImageUrl"
            defaultValue={profile.heroImageUrl ?? ""}
            className="field"
            placeholder="/uploads/hero.png or https://example.com/hero.png"
          />
        </label>

        <section className="space-y-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.56)] p-5 md:col-span-2">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">当前启用的背景模式</span>
            <input type="hidden" name="backgroundMediaMode" value={selectedMode} />
            <div className="grid gap-3 sm:grid-cols-2">
              {(["IMAGE", "VIDEO"] as const).map((mode) => {
                const isActive = selectedMode === mode;
                const title = mode === "IMAGE" ? "图片模式" : "视频模式";
                const description =
                  mode === "IMAGE"
                    ? "公开站点只会渲染背景图片。"
                    : "公开站点只会渲染背景视频。";

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedMode(mode)}
                    className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-[var(--accent)] bg-[rgba(27,107,99,0.12)] shadow-[0_14px_32px_rgba(20,33,43,0.06)]"
                        : "border-black/8 bg-white/70 hover:border-[rgba(27,107,99,0.22)] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isActive
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[rgba(20,33,43,0.08)] text-[var(--ink-soft)]"
                        }`}
                      >
                        {isActive ? "启用中" : "待命"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{description}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-6 text-[var(--ink-soft)]">
              背景图片和背景视频都可以同时保存，但公开首页只会渲染当前启用的那一种。
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                背景图片路径或 URL
              </span>
              <input
                name="backgroundImageUrl"
                defaultValue={profile.backgroundImageUrl ?? ""}
                className="field"
                placeholder="https://cdn.example.com/background.jpg or /uploads/site/background.png"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                支持的图片上传大小上限为 {uploadLimits.imageMaxUploadLabel}。已保存图片既可以来自本地路径，
                也可以来自你配置的对象存储域名。
              </p>
              {safeBackgroundPreview ? (
                <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
                  <div
                    className="h-44 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${safeBackgroundPreview}")` }}
                  />
                  <div className="border-t border-black/6 px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                    当前已保存的背景图片：{profile.backgroundImageUrl}
                    {selectedMode === "IMAGE" ? "（启用中）" : "（未启用）"}
                  </div>
                </div>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                背景遮罩强度（0-100）
              </span>
              <input
                name="backgroundOverlayOpacity"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={profile.backgroundOverlayOpacity}
                className="field max-w-[12rem]"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                数值越低，背景媒体本身会保留得越明显。
              </p>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                上传新的背景图片
              </span>
              <input
                name="backgroundImageFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
              />
              <span className="inline-flex items-center gap-3 text-sm text-[var(--ink-soft)]">
                <input
                  name="clearBackgroundImage"
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                清除当前已保存的背景图片
              </span>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                背景视频路径或 URL
              </span>
              <input
                name="backgroundVideoUrl"
                defaultValue={profile.backgroundVideoUrl ?? ""}
                className="field"
                placeholder="https://cdn.example.com/background.mp4 or /uploads/site/background.mp4"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                上传后的视频会自动转换为 MP4，并压缩到大约{" "}
                {uploadLimits.videoTargetBitrateLabel}.
              </p>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                支持的视频上传大小上限为 {uploadLimits.videoMaxUploadLabel}。
              </p>
              {safeBackgroundVideoPreview ? (
                <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
                  <video
                    className="h-52 w-full object-cover"
                    src={safeBackgroundVideoPreview}
                    controls
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                  <div className="border-t border-black/6 px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                    当前已保存的背景视频：{profile.backgroundVideoUrl}
                    {selectedMode === "VIDEO" ? "（启用中）" : "（未启用）"}
                  </div>
                </div>
              ) : null}
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                上传背景视频（MP4/WEBM）
              </span>
              <input
                name="backgroundVideoFile"
                type="file"
                accept="video/mp4,video/webm"
                className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
              />
              <span className="inline-flex items-center gap-3 text-sm text-[var(--ink-soft)]">
                <input
                  name="clearBackgroundVideo"
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                清除当前已保存的背景视频
              </span>
            </label>
          </div>
        </section>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">
            助手头像路径或 URL
          </span>
          <input
            name="assistantAvatarUrl"
            defaultValue={profile.assistantAvatarUrl ?? ""}
            className="field"
            placeholder="/uploads/assistant.png or https://example.com/assistant.png"
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            这个头像会复用在站点聊天入口和其他助手相关界面中。
          </p>
          {safeAssistantAvatarPreview ? (
            <div className="flex items-center gap-4 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] px-4 py-4 shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
              <div
                className="h-16 w-16 rounded-full border border-black/8 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${safeAssistantAvatarPreview}")` }}
              />
              <div className="min-w-0 text-xs leading-6 text-[var(--ink-soft)]">
                <div className="font-semibold text-[var(--ink)]">当前助手头像</div>
                <div className="truncate">{profile.assistantAvatarUrl}</div>
              </div>
            </div>
          ) : null}
        </label>

        <section className="space-y-3 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.56)] p-5 md:col-span-2">
          <div className="space-y-1.5">
            <div className="text-sm font-semibold text-[var(--ink)]">站内助手权限</div>
            <p className="text-xs leading-6 text-[var(--ink-soft)]">
              开启后，已登录的普通用户也可以使用站内对话和语音转写。关闭时只有管理员可用。
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-[1.2rem] border border-[rgba(27,107,99,0.16)] bg-[rgba(27,107,99,0.08)] px-4 py-4 text-sm text-[var(--ink)]">
            <input
              name="chatEnabledForReaders"
              type="checkbox"
              defaultChecked={profile.chatEnabledForReaders}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span className="space-y-1">
              <span className="block font-semibold text-[var(--ink)]">
                向已登录用户开放站内助手
              </span>
              <span className="block text-xs leading-6 text-[var(--ink-soft)]">
                游客仍然需要先登录；管理员始终保留访问权限。
              </span>
            </span>
          </label>
        </section>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">
            研究方向（用逗号分隔）
          </span>
          <input
            name="researchAreas"
            defaultValue={profile.researchAreas.join(", ")}
            className="field"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">教育经历（Markdown）</span>
          <textarea
            name="educationMarkdown"
            defaultValue={profile.educationMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">经历（Markdown）</span>
          <textarea
            name="experienceMarkdown"
            defaultValue={profile.experienceMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">荣誉奖项（Markdown）</span>
          <textarea
            name="awardsMarkdown"
            defaultValue={profile.awardsMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">演讲与分享（Markdown）</span>
          <textarea
            name="speakingMarkdown"
            defaultValue={profile.speakingMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitPhase === "uploading" || submitPhase === "processing" || submitPhase === "redirecting"}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitPhase === "uploading" || submitPhase === "processing" || submitPhase === "redirecting" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : null}
        <span>
          {submitPhase === "uploading"
            ? "上传中..."
            : submitPhase === "processing"
              ? "视频转码中..."
              : submitPhase === "redirecting"
                ? "收尾中..."
                : "保存首页资料"}
        </span>
      </button>
    </form>
  );
}
