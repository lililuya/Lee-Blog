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
        {errorMessage ?? "The upload could not be completed. Please try again."}
      </div>
    );
  }

  const uploadProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const statusText =
    phase === "uploading"
      ? `Uploading media: ${uploadProgress}%`
      : phase === "processing"
        ? "Upload finished. The server is transcoding and saving the background video..."
        : "Save completed. Redirecting back to the profile page...";

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
        Large videos take the longest during server-side compression, especially on the first save.
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
          ? "The network connection was interrupted during upload."
          : response.parseError
            ? "The server returned an unexpected response. Please try again."
            : "The background could not be saved. Please review the form and try again.",
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
          <span className="text-sm font-semibold text-[var(--ink)]">Full name</span>
          <input name="fullName" defaultValue={profile.fullName} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Headline</span>
          <input name="headline" defaultValue={profile.headline} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Tagline</span>
          <input name="tagline" defaultValue={profile.tagline} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Short bio</span>
          <textarea
            name="shortBio"
            defaultValue={profile.shortBio}
            required
            rows={4}
            className="field min-h-28 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Long bio</span>
          <textarea
            name="longBio"
            defaultValue={profile.longBio}
            rows={6}
            className="field min-h-40 resize-y"
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            Optional. You can keep this short for now and expand it later.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Institution</span>
          <input name="institution" defaultValue={profile.institution ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Department</span>
          <input name="department" defaultValue={profile.department ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Location</span>
          <input name="location" defaultValue={profile.location ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
          <input name="email" defaultValue={profile.email ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Website</span>
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
          <span className="text-sm font-semibold text-[var(--ink)]">CV URL</span>
          <input name="cvUrl" defaultValue={profile.cvUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Hero image path or URL</span>
          <input
            name="heroImageUrl"
            defaultValue={profile.heroImageUrl ?? ""}
            className="field"
            placeholder="/uploads/hero.png or https://example.com/hero.png"
          />
        </label>

        <section className="space-y-4 rounded-[1.6rem] border border-black/8 bg-[rgba(255,255,255,0.56)] p-5 md:col-span-2">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">Active background mode</span>
            <input type="hidden" name="backgroundMediaMode" value={selectedMode} />
            <div className="grid gap-3 sm:grid-cols-2">
              {(["IMAGE", "VIDEO"] as const).map((mode) => {
                const isActive = selectedMode === mode;
                const title = mode === "IMAGE" ? "Image mode" : "Video mode";
                const description =
                  mode === "IMAGE"
                    ? "Only the background image will render on the live site."
                    : "Only the background video will render on the live site.";

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
                        {isActive ? "ACTIVE" : "STANDBY"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{description}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-6 text-[var(--ink-soft)]">
              Background image and video can both be stored, but only the active mode will render on
              the live homepage.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Background image path or URL
              </span>
              <input
                name="backgroundImageUrl"
                defaultValue={profile.backgroundImageUrl ?? ""}
                className="field"
                placeholder="/uploads/site/background.png or https://example.com/background.jpg"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                Supported image uploads can be up to {uploadLimits.imageMaxUploadLabel}.
              </p>
              {safeBackgroundPreview ? (
                <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
                  <div
                    className="h-44 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${safeBackgroundPreview}")` }}
                  />
                  <div className="border-t border-black/6 px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                    Current stored background image: {profile.backgroundImageUrl}
                    {selectedMode === "IMAGE" ? " (active)" : " (inactive)"}
                  </div>
                </div>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Background overlay strength (0-100)
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
                Lower values keep more of the active media visible.
              </p>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Upload a new background image
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
                Clear the stored background image
              </span>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Background video path or URL
              </span>
              <input
                name="backgroundVideoUrl"
                defaultValue={profile.backgroundVideoUrl ?? ""}
                className="field"
                placeholder="/uploads/site/background.mp4 or https://example.com/background.webm"
              />
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                Uploaded videos are automatically converted to MP4 and normalized to about{" "}
                {uploadLimits.videoTargetBitrateLabel}.
              </p>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                Supported video uploads can be up to {uploadLimits.videoMaxUploadLabel}.
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
                    Current stored background video: {profile.backgroundVideoUrl}
                    {selectedMode === "VIDEO" ? " (active)" : " (inactive)"}
                  </div>
                </div>
              ) : null}
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Upload a background video (MP4/WEBM)
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
                Clear the stored background video
              </span>
            </label>
          </div>
        </section>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">
            Assistant avatar path or URL
          </span>
          <input
            name="assistantAvatarUrl"
            defaultValue={profile.assistantAvatarUrl ?? ""}
            className="field"
            placeholder="/uploads/assistant.png or https://example.com/assistant.png"
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            This avatar is reused in the site chat entry and other assistant-facing UI.
          </p>
          {safeAssistantAvatarPreview ? (
            <div className="flex items-center gap-4 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] px-4 py-4 shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
              <div
                className="h-16 w-16 rounded-full border border-black/8 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${safeAssistantAvatarPreview}")` }}
              />
              <div className="min-w-0 text-xs leading-6 text-[var(--ink-soft)]">
                <div className="font-semibold text-[var(--ink)]">Current assistant avatar</div>
                <div className="truncate">{profile.assistantAvatarUrl}</div>
              </div>
            </div>
          ) : null}
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">
            Research areas (comma separated)
          </span>
          <input
            name="researchAreas"
            defaultValue={profile.researchAreas.join(", ")}
            className="field"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Education (Markdown)</span>
          <textarea
            name="educationMarkdown"
            defaultValue={profile.educationMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Experience (Markdown)</span>
          <textarea
            name="experienceMarkdown"
            defaultValue={profile.experienceMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Awards (Markdown)</span>
          <textarea
            name="awardsMarkdown"
            defaultValue={profile.awardsMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Speaking (Markdown)</span>
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
            ? "Uploading..."
            : submitPhase === "processing"
              ? "Transcoding video..."
              : submitPhase === "redirecting"
                ? "Finishing..."
                : "Save homepage profile"}
        </span>
      </button>
    </form>
  );
}
