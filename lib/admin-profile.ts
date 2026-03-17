import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import {
  hasSiteProfileBackgroundMediaModeSupport,
  prisma,
} from "@/lib/prisma";
import {
  deleteLocalSiteAsset,
  SiteAssetUploadError,
  storeSiteImageUpload,
  storeSiteVideoUpload,
} from "@/lib/site-assets";
import { profileSchema } from "@/lib/validators";
import { isDatabaseConfigured, parseCsv } from "@/lib/utils";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function cleanupUploadedSiteAsset(diskPath: string | null | undefined) {
  if (!diskPath) {
    return;
  }

  await unlink(diskPath).catch(() => null);
}

export function buildAdminProfileRedirectPath(code?: string) {
  if (!code) {
    return "/admin/profile";
  }

  if (code === "saved") {
    return "/admin/profile?saved=1";
  }

  return `/admin/profile?error=${encodeURIComponent(code)}`;
}

export type AdminProfileSaveResult = {
  ok: boolean;
  redirectPath: string;
  errorCode?: string;
};

async function getStoredBackgroundMediaModeFallback() {
  try {
    const rows = await prisma.$queryRaw<Array<{ backgroundMediaMode: string | null }>>`
      SELECT "backgroundMediaMode"
      FROM "SiteProfile"
      WHERE "id" = 'main'
      LIMIT 1
    `;

    return rows[0]?.backgroundMediaMode ?? null;
  } catch (error) {
    console.error("[admin-profile:read-background-mode]", error);
    return null;
  }
}

async function persistBackgroundMediaModeFallback(mode: string) {
  try {
    await prisma.$executeRaw`
      UPDATE "SiteProfile"
      SET "backgroundMediaMode" = ${mode}
      WHERE "id" = 'main'
    `;
    return true;
  } catch (error) {
    console.error("[admin-profile:write-background-mode]", error);
    return false;
  }
}

export async function saveAdminProfileFromFormData(formData: FormData) {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      redirectPath: buildAdminProfileRedirectPath("save"),
      errorCode: "save",
    } satisfies AdminProfileSaveResult;
  }

  const backgroundModeSupported = hasSiteProfileBackgroundMediaModeSupport();
  const existingProfile = (await prisma.siteProfile.findUnique({
    where: { id: "main" },
  })) as
    | {
        backgroundImageUrl?: string | null;
        backgroundVideoUrl?: string | null;
        backgroundMediaMode?: string | null;
        backgroundOverlayOpacity?: number | null;
      }
    | null;
  const existingBackgroundMediaMode = backgroundModeSupported
    ? existingProfile?.backgroundMediaMode ?? null
    : await getStoredBackgroundMediaModeFallback();

  const parsed = profileSchema.safeParse({
    fullName: getString(formData, "fullName"),
    headline: getString(formData, "headline"),
    tagline: getString(formData, "tagline"),
    shortBio: getString(formData, "shortBio"),
    longBio: getString(formData, "longBio"),
    institution: getOptionalString(formData, "institution") ?? undefined,
    department: getOptionalString(formData, "department") ?? undefined,
    location: getOptionalString(formData, "location") ?? undefined,
    email: getOptionalString(formData, "email") ?? undefined,
    websiteUrl: getOptionalString(formData, "websiteUrl"),
    githubUrl: getOptionalString(formData, "githubUrl"),
    linkedinUrl: getOptionalString(formData, "linkedinUrl"),
    scholarUrl: getOptionalString(formData, "scholarUrl"),
    cvUrl: getOptionalString(formData, "cvUrl"),
    heroImageUrl: getOptionalString(formData, "heroImageUrl"),
    backgroundImageUrl: getOptionalString(formData, "backgroundImageUrl"),
    backgroundVideoUrl: getOptionalString(formData, "backgroundVideoUrl"),
    backgroundMediaMode:
      getString(formData, "backgroundMediaMode") || existingBackgroundMediaMode || "IMAGE",
    backgroundOverlayOpacity:
      getString(formData, "backgroundOverlayOpacity") ||
      String(existingProfile?.backgroundOverlayOpacity ?? 22),
    assistantAvatarUrl: getOptionalString(formData, "assistantAvatarUrl"),
    researchAreas: parseCsv(getString(formData, "researchAreas")),
    educationMarkdown: getString(formData, "educationMarkdown"),
    experienceMarkdown: getString(formData, "experienceMarkdown"),
    awardsMarkdown: getString(formData, "awardsMarkdown"),
    speakingMarkdown: getString(formData, "speakingMarkdown"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      redirectPath: buildAdminProfileRedirectPath("validation"),
      errorCode: "validation",
    } satisfies AdminProfileSaveResult;
  }

  const clearBackgroundImage = getBoolean(formData, "clearBackgroundImage");
  const clearBackgroundVideo = getBoolean(formData, "clearBackgroundVideo");
  const backgroundImageFile = formData.get("backgroundImageFile");
  const backgroundVideoFile = formData.get("backgroundVideoFile");
  let uploadedBackgroundImage: Awaited<ReturnType<typeof storeSiteImageUpload>> | null = null;
  let uploadedBackgroundVideo: Awaited<ReturnType<typeof storeSiteVideoUpload>> | null = null;

  try {
    if (!clearBackgroundImage && backgroundImageFile instanceof File && backgroundImageFile.size > 0) {
      uploadedBackgroundImage = await storeSiteImageUpload(backgroundImageFile, "background");
    }

    if (!clearBackgroundVideo && backgroundVideoFile instanceof File && backgroundVideoFile.size > 0) {
      uploadedBackgroundVideo = await storeSiteVideoUpload(backgroundVideoFile, "background-video");
    }
  } catch (error) {
    await Promise.all([
      cleanupUploadedSiteAsset(uploadedBackgroundImage?.diskPath),
      cleanupUploadedSiteAsset(uploadedBackgroundVideo?.diskPath),
    ]);

    if (error instanceof SiteAssetUploadError) {
      return {
        ok: false,
        redirectPath: buildAdminProfileRedirectPath(error.code),
        errorCode: error.code,
      } satisfies AdminProfileSaveResult;
    }

    console.error("[saveAdminProfileFromFormData:upload]", error);
    return {
      ok: false,
      redirectPath: buildAdminProfileRedirectPath("upload"),
      errorCode: "upload",
    } satisfies AdminProfileSaveResult;
  }

  const nextBackgroundImageUrl = clearBackgroundImage
    ? null
    : (uploadedBackgroundImage?.url ?? parsed.data.backgroundImageUrl) || null;
  const nextBackgroundVideoUrl = clearBackgroundVideo
    ? null
    : (uploadedBackgroundVideo?.url ?? parsed.data.backgroundVideoUrl) || null;
  const profileData = backgroundModeSupported
    ? parsed.data
    : {
        ...parsed.data,
        backgroundMediaMode: undefined,
      };

  try {
    await prisma.siteProfile.upsert({
      where: { id: "main" },
      update: {
        ...profileData,
        backgroundImageUrl: nextBackgroundImageUrl,
        backgroundVideoUrl: nextBackgroundVideoUrl,
      },
      create: {
        id: "main",
        ...profileData,
        backgroundImageUrl: nextBackgroundImageUrl,
        backgroundVideoUrl: nextBackgroundVideoUrl,
      },
    });

    if (!backgroundModeSupported) {
      const persistedFallbackMode = await persistBackgroundMediaModeFallback(parsed.data.backgroundMediaMode);

      if (!persistedFallbackMode) {
        return {
          ok: false,
          redirectPath: buildAdminProfileRedirectPath("save"),
          errorCode: "save",
        } satisfies AdminProfileSaveResult;
      }
    }
  } catch (error) {
    await Promise.all([
      cleanupUploadedSiteAsset(uploadedBackgroundImage?.diskPath),
      cleanupUploadedSiteAsset(uploadedBackgroundVideo?.diskPath),
    ]);
    console.error("[saveAdminProfileFromFormData:save]", error);
    return {
      ok: false,
      redirectPath: buildAdminProfileRedirectPath("save"),
      errorCode: "save",
    } satisfies AdminProfileSaveResult;
  }

  if (existingProfile?.backgroundImageUrl !== nextBackgroundImageUrl) {
    await deleteLocalSiteAsset(existingProfile?.backgroundImageUrl);
  }

  if (existingProfile?.backgroundVideoUrl !== nextBackgroundVideoUrl) {
    await deleteLocalSiteAsset(existingProfile?.backgroundVideoUrl);
  }

  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/admin/profile");

  return {
    ok: true,
    redirectPath: buildAdminProfileRedirectPath("saved"),
  } satisfies AdminProfileSaveResult;
}
