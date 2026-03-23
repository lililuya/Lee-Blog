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
      message: "首页资料设置已成功保存。",
    };
  }

  if (searchParams.error === "validation") {
    return {
      tone: "error" as const,
      message: "部分资料字段仍然无效，请检查表单后重试。",
    };
  }

  if (searchParams.error === "image-too-large") {
    return {
      tone: "error" as const,
      message: "背景图片超过了当前允许的上传大小限制。",
    };
  }

  if (searchParams.error === "invalid-image-type") {
    return {
      tone: "error" as const,
      message: "背景图片必须是 PNG、JPG/JPEG 或 WEBP 格式。",
    };
  }

  if (searchParams.error === "video-too-large") {
    return {
      tone: "error" as const,
      message: "背景视频超过了当前允许的上传大小限制。",
    };
  }

  if (searchParams.error === "invalid-video-type") {
    return {
      tone: "error" as const,
      message: "动态背景目前只支持 MP4 和 WEBM 格式。",
    };
  }

  if (searchParams.error === "video-processing-failed") {
    return {
      tone: "error" as const,
      message: "上传的视频无法成功压缩，请换一个文件再试。",
    };
  }

  if (searchParams.error === "upload") {
    return {
      tone: "error" as const,
      message: "背景媒体上传失败，请稍后再试。",
    };
  }

  if (searchParams.error === "save") {
    return {
      tone: "error" as const,
      message: "资料暂时无法保存，请稍后再试。",
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
        <p className="section-kicker">资料</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          首页资料设置
        </h1>
      </div>

      {feedback ? <FeedbackBanner tone={feedback.tone} message={feedback.message} /> : null}

      <ProfileForm
        action="/api/admin/profile"
        confirmMessage="确认保存首页资料设置吗？这会更新公开资料、助手头像和当前背景配置。"
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
