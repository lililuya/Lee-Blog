import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_ASSET_DIR = path.join(process.cwd(), "public", "uploads", "site");
const SITE_ASSET_URL_PREFIX = "/uploads/site/";
const MAX_SITE_IMAGE_BYTES = 8 * 1024 * 1024;
const SITE_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

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

export async function storeSiteImageUpload(file: File, prefix: string) {
  if (file.size === 0) {
    throw new Error("The uploaded image is empty.");
  }

  if (file.size > MAX_SITE_IMAGE_BYTES) {
    throw new Error("The uploaded image is too large. Please keep it under 8 MB.");
  }

  const extension = SITE_IMAGE_EXTENSIONS[file.type];

  if (!extension) {
    throw new Error("Only PNG, JPG/JPEG, and WEBP images are supported.");
  }

  await mkdir(SITE_ASSET_DIR, { recursive: true });

  const fileName = `${prefix}-${Date.now()}-${randomUUID()}${extension}`;
  const diskPath = path.join(SITE_ASSET_DIR, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await writeFile(diskPath, fileBuffer);

  return {
    diskPath,
    url: `${SITE_ASSET_URL_PREFIX}${fileName}`,
  };
}
