import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const LOCAL_UPLOADS_URL_PREFIX = "/uploads/";
const LOCAL_UPLOADS_LABEL = "public/uploads";

type MediaStorageKind = "local" | "object";

type ObjectStorageConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
  keyPrefix: string;
};

export type StoredMediaAsset = {
  url: string;
  storageKind: MediaStorageKind;
  localDiskPath?: string;
  objectKey?: string;
};

export type ObjectStorageRuntimeStatus = {
  configured: boolean;
  mode: MediaStorageKind;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  publicBaseUrl: string | null;
  keyPrefix: string;
  localFallbackPath: string;
};

export type ObjectStorageValidationCheck = {
  label: string;
  status: "pass" | "fail" | "skip";
  detail: string;
  durationMs?: number | null;
  httpStatus?: number | null;
};

export type ObjectStorageValidationResult = ObjectStorageRuntimeStatus & {
  kind: "object-storage";
  summary: string;
  testObjectKey: string | null;
  publicUrl: string | null;
  checks: ObjectStorageValidationCheck[];
};

type MediaBufferUploadOptions = {
  buffer: Buffer;
  contentType?: string;
  directory: string;
  extension: string;
  fileNamePrefix: string;
};

let cachedObjectStorageConfig: ObjectStorageConfig | null | undefined;
let cachedObjectStorageClient: S3Client | null = null;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStorageSegment(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function joinStoragePath(...segments: Array<string | null | undefined>) {
  return segments
    .map((segment) => normalizeStorageSegment(segment ?? ""))
    .filter(Boolean)
    .join("/");
}

function normalizeFileExtension(extension: string) {
  if (!extension) {
    throw new Error("A file extension is required for media uploads.");
  }

  return extension.startsWith(".") ? extension : `.${extension}`;
}

function encodeObjectKeyForUrl(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeObjectKeyFromUrlPath(pathname: string) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

function buildManagedFileName(prefix: string, extension: string) {
  const safePrefix = normalizeStorageSegment(prefix).replace(/\//g, "-") || "asset";
  return `${safePrefix}-${Date.now()}-${randomUUID()}${normalizeFileExtension(extension)}`;
}

function getObjectStorageConfig() {
  if (cachedObjectStorageConfig !== undefined) {
    return cachedObjectStorageConfig;
  }

  const bucket = trimToUndefined(process.env.OBJECT_STORAGE_BUCKET);
  const region = trimToUndefined(process.env.OBJECT_STORAGE_REGION);
  const accessKeyId = trimToUndefined(process.env.OBJECT_STORAGE_ACCESS_KEY_ID);
  const secretAccessKey = trimToUndefined(process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY);

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    cachedObjectStorageConfig = null;
    return cachedObjectStorageConfig;
  }

  const endpoint = trimToUndefined(process.env.OBJECT_STORAGE_ENDPOINT);

  cachedObjectStorageConfig = {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    publicBaseUrl: trimToUndefined(process.env.OBJECT_STORAGE_PUBLIC_BASE_URL)?.replace(/\/+$/g, ""),
    forcePathStyle: parseBoolean(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE, Boolean(endpoint)),
    keyPrefix: joinStoragePath(process.env.OBJECT_STORAGE_KEY_PREFIX),
  };

  return cachedObjectStorageConfig;
}

function getObjectStorageClient(config: ObjectStorageConfig) {
  if (cachedObjectStorageClient) {
    return cachedObjectStorageClient;
  }

  cachedObjectStorageClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedObjectStorageClient;
}

function buildObjectStorageBaseUrl(config: ObjectStorageConfig) {
  if (config.publicBaseUrl) {
    return config.publicBaseUrl;
  }

  if (config.endpoint) {
    return `${config.endpoint.replace(/\/+$/g, "")}/${encodeURIComponent(config.bucket)}`;
  }

  if (config.region === "us-east-1") {
    return `https://${config.bucket}.s3.amazonaws.com`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
}

function buildObjectStorageUrl(config: ObjectStorageConfig, key: string) {
  return `${buildObjectStorageBaseUrl(config)}/${encodeObjectKeyForUrl(key)}`;
}

function getLocalDiskPathFromUrl(url: string | null | undefined) {
  if (!url || !url.startsWith(LOCAL_UPLOADS_URL_PREFIX)) {
    return null;
  }

  const relativePath = url.slice(LOCAL_UPLOADS_URL_PREFIX.length);

  if (!relativePath || relativePath.includes("..")) {
    return null;
  }

  return path.join(LOCAL_UPLOADS_DIR, ...relativePath.split("/"));
}

function getObjectStorageKeyFromUrl(url: string, config: ObjectStorageConfig) {
  try {
    const objectUrl = new URL(url);
    const configuredBase = new URL(`${buildObjectStorageBaseUrl(config)}/`);

    if (objectUrl.origin !== configuredBase.origin) {
      return null;
    }

    if (!objectUrl.pathname.startsWith(configuredBase.pathname)) {
      return null;
    }

    const relativePath = objectUrl.pathname.slice(configuredBase.pathname.length);

    if (!relativePath || relativePath.includes("..")) {
      return null;
    }

    return decodeObjectKeyFromUrlPath(relativePath);
  } catch {
    return null;
  }
}

function getCacheControl(contentType: string | undefined) {
  if (!contentType) {
    return "public, max-age=31536000, immutable";
  }

  if (contentType.startsWith("video/")) {
    return "public, max-age=604800, stale-while-revalidate=86400";
  }

  return "public, max-age=31536000, immutable";
}

export function isObjectStorageConfigured() {
  return Boolean(getObjectStorageConfig());
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function buildObjectStorageSummary(configured: boolean, passed: boolean) {
  if (!configured) {
    return "Object storage is not configured. Uploads currently fall back to local storage.";
  }

  return passed
    ? "Object storage is ready for uploads, public delivery, and cleanup."
    : "Object storage is configured, but one or more validation checks failed.";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchObjectStoragePublicUrl(url: string) {
  const waitSequenceMs = [0, 800];
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const waitMs of waitSequenceMs) {
    if (waitMs > 0) {
      await delay(waitMs);
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });

      lastResponse = response;

      if (response.ok) {
        return { response, error: null };
      }
    } catch (error) {
      lastError = error;
    }
  }

  return { response: lastResponse, error: lastError };
}

export function getObjectStorageRuntimeStatus(): ObjectStorageRuntimeStatus {
  const config = getObjectStorageConfig();

  return {
    configured: Boolean(config),
    mode: config ? "object" : "local",
    bucket: config?.bucket ?? null,
    region: config?.region ?? null,
    endpoint: config?.endpoint ?? null,
    publicBaseUrl: config ? buildObjectStorageBaseUrl(config) : null,
    keyPrefix: config?.keyPrefix ?? "",
    localFallbackPath: LOCAL_UPLOADS_LABEL,
  };
}

export async function validateObjectStorageConnection(): Promise<ObjectStorageValidationResult> {
  const runtimeStatus = getObjectStorageRuntimeStatus();

  if (!runtimeStatus.configured) {
    return {
      kind: "object-storage",
      ...runtimeStatus,
      summary: buildObjectStorageSummary(false, false),
      testObjectKey: null,
      publicUrl: null,
      checks: [
        {
          label: "Configuration",
          status: "skip",
          detail:
            "Required OBJECT_STORAGE_* environment variables are incomplete, so the app is using local uploads.",
        },
      ],
    };
  }

  const config = getObjectStorageConfig();

  if (!config) {
    throw new Error("Object storage configuration was unexpectedly unavailable.");
  }

  const testObjectKey = joinStoragePath(
    config.keyPrefix,
    "_validation",
    `probe-${Date.now()}-${randomUUID()}.txt`,
  );
  const publicUrl = buildObjectStorageUrl(config, testObjectKey);
  const checks: ObjectStorageValidationCheck[] = [
    {
      label: "Configuration",
      status: "pass",
      detail: `Bucket ${config.bucket} in ${config.region} is configured and ready to test.`,
    },
  ];

  let uploadSucceeded = false;
  let deleteSucceeded = false;

  const uploadStartedAt = Date.now();

  try {
    await getObjectStorageClient(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: testObjectKey,
        Body: Buffer.from(
          `Object storage validation probe\ncreatedAt=${new Date().toISOString()}\n`,
          "utf8",
        ),
        ContentType: "text/plain; charset=utf-8",
        CacheControl: "no-store",
      }),
    );
    uploadSucceeded = true;
    checks.push({
      label: "Upload",
      status: "pass",
      detail: `Uploaded a probe object to ${testObjectKey}.`,
      durationMs: Date.now() - uploadStartedAt,
    });
  } catch (error) {
    checks.push({
      label: "Upload",
      status: "fail",
      detail: `Upload failed: ${getErrorMessage(error)}`,
      durationMs: Date.now() - uploadStartedAt,
    });
  }

  if (uploadSucceeded) {
    const readStartedAt = Date.now();
    const readResult = await fetchObjectStoragePublicUrl(publicUrl);

    if (readResult.response?.ok) {
      checks.push({
        label: "Public URL",
        status: "pass",
        detail: `GET ${publicUrl} returned HTTP ${readResult.response.status}.`,
        durationMs: Date.now() - readStartedAt,
        httpStatus: readResult.response.status,
      });
    } else {
      checks.push({
        label: "Public URL",
        status: "fail",
        detail: readResult.response
          ? `GET ${publicUrl} returned HTTP ${readResult.response.status}. Uploaded files may not render publicly.`
          : `Public URL check failed: ${getErrorMessage(readResult.error)}`,
        durationMs: Date.now() - readStartedAt,
        httpStatus: readResult.response?.status ?? null,
      });
    }

    const deleteStartedAt = Date.now();

    try {
      await getObjectStorageClient(config).send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: testObjectKey,
        }),
      );
      deleteSucceeded = true;
      checks.push({
        label: "Cleanup",
        status: "pass",
        detail: "Deleted the probe object successfully.",
        durationMs: Date.now() - deleteStartedAt,
      });
    } catch (error) {
      checks.push({
        label: "Cleanup",
        status: "fail",
        detail: `Cleanup failed: ${getErrorMessage(error)}`,
        durationMs: Date.now() - deleteStartedAt,
      });
    }
  } else {
    checks.push({
      label: "Public URL",
      status: "skip",
      detail: "Skipped because the upload test did not succeed.",
    });
    checks.push({
      label: "Cleanup",
      status: "skip",
      detail: "Skipped because no probe object was created.",
    });
  }

  const passed =
    uploadSucceeded &&
    deleteSucceeded &&
    checks.every((check) => check.status !== "fail");

  return {
    kind: "object-storage",
    ...runtimeStatus,
    summary: buildObjectStorageSummary(true, passed),
    testObjectKey: uploadSucceeded ? testObjectKey : null,
    publicUrl: uploadSucceeded ? publicUrl : null,
    checks,
  };
}

export async function storeMediaBufferUpload({
  buffer,
  contentType,
  directory,
  extension,
  fileNamePrefix,
}: MediaBufferUploadOptions): Promise<StoredMediaAsset> {
  const normalizedDirectory = normalizeStorageSegment(directory);

  if (!normalizedDirectory) {
    throw new Error("A media upload directory is required.");
  }

  const fileName = buildManagedFileName(fileNamePrefix, extension);
  const relativePath = joinStoragePath(normalizedDirectory, fileName);
  const objectStorageConfig = getObjectStorageConfig();

  if (objectStorageConfig) {
    const objectKey = joinStoragePath(objectStorageConfig.keyPrefix, relativePath);

    await getObjectStorageClient(objectStorageConfig).send(
      new PutObjectCommand({
        Bucket: objectStorageConfig.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: getCacheControl(contentType),
      }),
    );

    return {
      url: buildObjectStorageUrl(objectStorageConfig, objectKey),
      storageKind: "object",
      objectKey,
    };
  }

  const diskPath = path.join(LOCAL_UPLOADS_DIR, ...relativePath.split("/"));
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, buffer);

  return {
    url: `${LOCAL_UPLOADS_URL_PREFIX}${relativePath}`,
    storageKind: "local",
    localDiskPath: diskPath,
  };
}

export async function deleteMediaAsset(
  asset: StoredMediaAsset | string | null | undefined,
) {
  if (!asset) {
    return;
  }

  const normalizedAsset =
    typeof asset === "string"
      ? {
          url: asset,
          storageKind: undefined,
          localDiskPath: undefined,
          objectKey: undefined,
        }
      : asset;

  if (normalizedAsset.localDiskPath) {
    await unlink(normalizedAsset.localDiskPath).catch(() => null);
    return;
  }

  if (normalizedAsset.objectKey) {
    const objectStorageConfig = getObjectStorageConfig();

    if (!objectStorageConfig) {
      return;
    }

    await getObjectStorageClient(objectStorageConfig)
      .send(
        new DeleteObjectCommand({
          Bucket: objectStorageConfig.bucket,
          Key: normalizedAsset.objectKey,
        }),
      )
      .catch((error) => {
        console.error("[media-storage:delete-object]", error);
      });
    return;
  }

  const localDiskPath = getLocalDiskPathFromUrl(normalizedAsset.url);

  if (localDiskPath) {
    await unlink(localDiskPath).catch(() => null);
    return;
  }

  const objectStorageConfig = getObjectStorageConfig();

  if (!objectStorageConfig) {
    return;
  }

  const objectKey = getObjectStorageKeyFromUrl(normalizedAsset.url, objectStorageConfig);

  if (!objectKey) {
    return;
  }

  await getObjectStorageClient(objectStorageConfig)
    .send(
      new DeleteObjectCommand({
        Bucket: objectStorageConfig.bucket,
        Key: objectKey,
      }),
    )
    .catch((error) => {
      console.error("[media-storage:delete-object]", error);
    });
}
