import { ProfileForm } from "@/components/forms/profile-form";
import { getAdminProfile } from "@/lib/queries";
import {
  siteImageMaxUploadLabel,
  siteVideoMaxUploadLabel,
  siteVideoTargetBitrateLabel,
} from "@/lib/upload-config";

export const dynamic = "force-dynamic";

type AdminProfilePageSearchParams = {
  saved?: string;
  error?: string;
};

function resolveProfileFeedback(searchParams: AdminProfilePageSearchParams) {
  if (searchParams.saved) {
    return {
      tone: "success" as const,
      message: "Homepage profile settings were saved successfully.",
    };
  }

  if (searchParams.error === "validation") {
    return {
      tone: "error" as const,
      message: "Some profile fields are still invalid. Please review the form and try again.",
    };
  }

  if (searchParams.error === "image-too-large") {
    return {
      tone: "error" as const,
      message: "The background image is larger than the current upload limit.",
    };
  }

  if (searchParams.error === "invalid-image-type") {
    return {
      tone: "error" as const,
      message: "Background images must be PNG, JPG/JPEG, or WEBP files.",
    };
  }

  if (searchParams.error === "video-too-large") {
    return {
      tone: "error" as const,
      message: "The background video is larger than the current upload limit.",
    };
  }

  if (searchParams.error === "invalid-video-type") {
    return {
      tone: "error" as const,
      message: "Animated backgrounds currently support MP4 and WEBM files only.",
    };
  }

  if (searchParams.error === "video-processing-failed") {
    return {
      tone: "error" as const,
      message: "The uploaded video could not be compressed successfully. Please try another file.",
    };
  }

  if (searchParams.error === "upload") {
    return {
      tone: "error" as const,
      message: "The background media upload failed. Please try again.",
    };
  }

  if (searchParams.error === "save") {
    return {
      tone: "error" as const,
      message: "The profile could not be saved right now. Please try again.",
    };
  }

  return null;
}

function FeedbackBanner({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
      }
    >
      {message}
    </div>
  );
}

export default async function AdminProfilePage({
  searchParams,
}: {
  searchParams: Promise<AdminProfilePageSearchParams>;
}) {
  const [profile, resolvedSearchParams] = await Promise.all([getAdminProfile(), searchParams]);
  const feedback = resolveProfileFeedback(resolvedSearchParams);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Profile</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Homepage Profile Settings
        </h1>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <ProfileForm
        action="/api/admin/profile"
        confirmMessage="Save homepage profile settings? This will update the public profile, avatar, and current background configuration."
        uploadLimits={{
          imageMaxUploadLabel: siteImageMaxUploadLabel,
          videoMaxUploadLabel: siteVideoMaxUploadLabel,
          videoTargetBitrateLabel: siteVideoTargetBitrateLabel,
        }}
        profile={profile}
      />
    </div>
  );
}
