const MEGABYTE = 1024 * 1024;

function parseMegabytes(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value?.trim() ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function formatMegabytes(value: number) {
  return `${value} MB`;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value?.trim() ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export const avatarMaxUploadMegabytes = parseMegabytes(process.env.AVATAR_MAX_UPLOAD_MB, 3);
export const siteImageMaxUploadMegabytes = parseMegabytes(process.env.SITE_IMAGE_MAX_UPLOAD_MB, 8);
export const siteVideoMaxUploadMegabytes = parseMegabytes(process.env.SITE_VIDEO_MAX_UPLOAD_MB, 20);
export const siteVideoTargetBitrateKbps = parsePositiveInteger(
  process.env.SITE_VIDEO_TARGET_BITRATE_KBPS,
  10000,
);

const configuredServerActionBodyLimitMegabytes = parseMegabytes(
  process.env.SERVER_ACTION_BODY_LIMIT_MB,
  8,
);

const profileMediaMaxUploadMegabytes =
  siteImageMaxUploadMegabytes + siteVideoMaxUploadMegabytes;

export const serverActionBodyLimitMegabytes = Math.max(
  configuredServerActionBodyLimitMegabytes,
  avatarMaxUploadMegabytes,
  profileMediaMaxUploadMegabytes,
);

export const avatarMaxUploadBytes = avatarMaxUploadMegabytes * MEGABYTE;
export const siteImageMaxUploadBytes = siteImageMaxUploadMegabytes * MEGABYTE;
export const siteVideoMaxUploadBytes = siteVideoMaxUploadMegabytes * MEGABYTE;

export const avatarMaxUploadLabel = formatMegabytes(avatarMaxUploadMegabytes);
export const siteImageMaxUploadLabel = formatMegabytes(siteImageMaxUploadMegabytes);
export const siteVideoMaxUploadLabel = formatMegabytes(siteVideoMaxUploadMegabytes);
export const siteVideoTargetBitrateLabel = `${siteVideoTargetBitrateKbps} kbps`;
export const serverActionBodyLimit: `${number}mb` = `${serverActionBodyLimitMegabytes}mb`;
