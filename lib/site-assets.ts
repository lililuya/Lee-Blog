import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  siteImageMaxUploadBytes,
  siteImageMaxUploadLabel,
  siteVideoMaxUploadBytes,
  siteVideoMaxUploadLabel,
  siteVideoTargetBitrateKbps,
} from "@/lib/upload-config";

const SITE_ASSET_DIR = path.join(process.cwd(), "public", "uploads", "site");
const SITE_ASSET_URL_PREFIX = "/uploads/site/";
const FFMPEG_BINARY = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
const FFMPEG_TIMEOUT_MS = 2 * 60 * 1000;
const execFileAsync = promisify(execFile);

const SITE_IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const SITE_IMAGE_FILE_EXTENSIONS: Record<string, string> = {
  ".jpeg": ".jpg",
  ".jpg": ".jpg",
  ".png": ".png",
  ".webp": ".webp",
};

const SITE_VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const SITE_VIDEO_FILE_EXTENSIONS: Record<string, string> = {
  ".mp4": ".mp4",
  ".webm": ".webm",
};

export type SiteAssetUploadErrorCode =
  | "image-too-large"
  | "video-too-large"
  | "invalid-image-type"
  | "invalid-video-type"
  | "video-processing-failed";

export class SiteAssetUploadError extends Error {
  code: SiteAssetUploadErrorCode;

  constructor(code: SiteAssetUploadErrorCode, message: string) {
    super(message);
    this.name = "SiteAssetUploadError";
    this.code = code;
  }
}

function getLocalSiteAssetPath(assetUrl: string | null | undefined) {
  if (!assetUrl || !assetUrl.startsWith(SITE_ASSET_URL_PREFIX)) {
    return null;
  }

  const relativePath = assetUrl.slice(SITE_ASSET_URL_PREFIX.length);

  if (!relativePath || relativePath.includes("..")) {
    return null;
  }

  return path.join(SITE_ASSET_DIR, relativePath);
}

export async function deleteLocalSiteAsset(assetUrl: string | null | undefined) {
  const diskPath = getLocalSiteAssetPath(assetUrl);

  if (!diskPath) {
    return;
  }

  await unlink(diskPath).catch(() => null);
}

function resolveSiteAssetExtension(
  file: File,
  mimeExtensions: Record<string, string>,
  fileExtensions: Record<string, string>,
) {
  if (mimeExtensions[file.type]) {
    return mimeExtensions[file.type];
  }

  const fileExtension = path.extname(file.name ?? "").toLowerCase();
  return fileExtensions[fileExtension] ?? null;
}

function createSiteAssetFileName(prefix: string, extension: string) {
  return `${prefix}-${Date.now()}-${randomUUID()}${extension}`;
}

async function writeUploadedFileToDisk(file: File, diskPath: string) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, fileBuffer);
}

async function transcodeVideoToMp4(inputPath: string, outputPath: string) {
  const targetBitrate = `${siteVideoTargetBitrateKbps}k`;
  const bufferSize = `${siteVideoTargetBitrateKbps * 2}k`;
  const encoderProfiles = [
    ["-c:v", "h264_mf"],
    ["-c:v", "mpeg4"],
  ] as const;

  let lastError: unknown = null;

  for (const encoderArgs of encoderProfiles) {
    try {
      await unlink(outputPath).catch(() => null);
      await execFileAsync(
        FFMPEG_BINARY,
        [
          "-y",
          "-i",
          inputPath,
          "-an",
          ...encoderArgs,
          "-b:v",
          targetBitrate,
          "-maxrate",
          targetBitrate,
          "-bufsize",
          bufferSize,
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          outputPath,
        ],
        {
          timeout: FFMPEG_TIMEOUT_MS,
          windowsHide: true,
        },
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }

  console.error("[site-assets:ffmpeg]", lastError);
  throw new SiteAssetUploadError(
    "video-processing-failed",
    "The uploaded video could not be processed by ffmpeg.",
  );
}

async function storeRawSiteAssetUpload(
  file: File,
  prefix: string,
  options: {
    maxBytes: number;
    maxUploadLabel: string;
    mimeExtensions: Record<string, string>;
    fileExtensions: Record<string, string>;
    tooLargeCode: SiteAssetUploadErrorCode;
    invalidTypeCode: SiteAssetUploadErrorCode;
    invalidTypeMessage: string;
  },
) {
  if (file.size === 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > options.maxBytes) {
    throw new SiteAssetUploadError(
      options.tooLargeCode,
      `The uploaded file is too large. Please keep it under ${options.maxUploadLabel}.`,
    );
  }

  const extension = resolveSiteAssetExtension(
    file,
    options.mimeExtensions,
    options.fileExtensions,
  );

  if (!extension) {
    throw new SiteAssetUploadError(options.invalidTypeCode, options.invalidTypeMessage);
  }

  await mkdir(SITE_ASSET_DIR, { recursive: true });

  const fileName = createSiteAssetFileName(prefix, extension);
  const diskPath = path.join(SITE_ASSET_DIR, fileName);

  await writeUploadedFileToDisk(file, diskPath);

  return {
    diskPath,
    url: `${SITE_ASSET_URL_PREFIX}${fileName}`,
  };
}

export async function storeSiteImageUpload(file: File, prefix: string) {
  return storeRawSiteAssetUpload(file, prefix, {
    maxBytes: siteImageMaxUploadBytes,
    maxUploadLabel: siteImageMaxUploadLabel,
    mimeExtensions: SITE_IMAGE_MIME_EXTENSIONS,
    fileExtensions: SITE_IMAGE_FILE_EXTENSIONS,
    tooLargeCode: "image-too-large",
    invalidTypeCode: "invalid-image-type",
    invalidTypeMessage: "Only PNG, JPG/JPEG, and WEBP images are supported.",
  });
}

export async function storeSiteVideoUpload(file: File, prefix: string) {
  if (file.size === 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > siteVideoMaxUploadBytes) {
    throw new SiteAssetUploadError(
      "video-too-large",
      `The uploaded file is too large. Please keep it under ${siteVideoMaxUploadLabel}.`,
    );
  }

  const inputExtension = resolveSiteAssetExtension(
    file,
    SITE_VIDEO_MIME_EXTENSIONS,
    SITE_VIDEO_FILE_EXTENSIONS,
  );

  if (!inputExtension) {
    throw new SiteAssetUploadError(
      "invalid-video-type",
      "Only MP4 and WEBM videos are supported for animated backgrounds.",
    );
  }

  await mkdir(SITE_ASSET_DIR, { recursive: true });

  const tempInputFileName = createSiteAssetFileName(`${prefix}-source`, inputExtension);
  const outputFileName = createSiteAssetFileName(prefix, ".mp4");
  const tempInputPath = path.join(SITE_ASSET_DIR, tempInputFileName);
  const outputPath = path.join(SITE_ASSET_DIR, outputFileName);

  try {
    await writeUploadedFileToDisk(file, tempInputPath);
    await transcodeVideoToMp4(tempInputPath, outputPath);

    return {
      diskPath: outputPath,
      url: `${SITE_ASSET_URL_PREFIX}${outputFileName}`,
    };
  } catch (error) {
    await unlink(outputPath).catch(() => null);

    if (error instanceof SiteAssetUploadError) {
      throw error;
    }

    console.error("[site-assets:video-upload]", error);
    throw new SiteAssetUploadError(
      "video-processing-failed",
      "The uploaded video could not be processed.",
    );
  } finally {
    await unlink(tempInputPath).catch(() => null);
  }
}
