import "server-only";

const TEXTUAL_CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "application/javascript",
  "application/graphql-response+json",
] as const;

const FORBIDDEN_REQUEST_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
]);

const MAX_PREVIEW_CHARS = 20_000;

export const REQUEST_DEBUG_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type RequestDebugMethod = (typeof REQUEST_DEBUG_METHODS)[number];

export type RequestDebugInput = {
  method: RequestDebugMethod;
  url: string;
  headersText?: string;
  body?: string;
  timeoutMs: number;
  followRedirects: boolean;
};

export type RequestDebugResult = {
  request: {
    method: RequestDebugMethod;
    url: string;
    headers: Record<string, string>;
    bodyPreview: string;
    bodyPresent: boolean;
    timeoutMs: number;
    followRedirects: boolean;
    startedAt: string;
  };
  response: {
    ok: boolean;
    status: number;
    statusText: string;
    finalUrl: string;
    redirected: boolean;
    durationMs: number;
    contentType: string | null;
    sizeBytes: number;
    truncated: boolean;
    bodyPreview: string;
    headers: Record<string, string>;
  };
};

function normalizeHeaderRecord(input: Record<string, unknown>) {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.trim();

    if (!normalizedKey) {
      continue;
    }

    if (FORBIDDEN_REQUEST_HEADERS.has(normalizedKey.toLowerCase())) {
      continue;
    }

    headers[normalizedKey] = String(value ?? "").trim();
  }

  return headers;
}

function parseHeadersText(headersText: string | undefined) {
  const normalized = headersText?.trim() ?? "";

  if (!normalized) {
    return {} as Record<string, string>;
  }

  if (normalized.startsWith("{")) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new Error("请求头 JSON 解析失败，请检查格式后再试。");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("请求头 JSON 必须是对象格式。");
    }

    return normalizeHeaderRecord(parsed as Record<string, unknown>);
  }

  const headers: Record<string, string> = {};
  const lines = normalized.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex <= 0) {
      throw new Error(`无法解析这行请求头：${trimmed}`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (FORBIDDEN_REQUEST_HEADERS.has(key.toLowerCase())) {
      continue;
    }

    headers[key] = value;
  }

  return headers;
}

function isTextualContentType(contentType: string | null) {
  if (!contentType) {
    return true;
  }

  const normalized = contentType.toLowerCase();

  if (normalized.startsWith("text/")) {
    return true;
  }

  if (normalized.includes("+json") || normalized.includes("+xml")) {
    return true;
  }

  return TEXTUAL_CONTENT_TYPES.some((type) => normalized.includes(type));
}

function buildBodyPreview(body: string | undefined) {
  const normalized = body ?? "";

  if (!normalized) {
    return {
      bodyPreview: "",
      bodyPresent: false,
    };
  }

  return {
    bodyPreview:
      normalized.length > MAX_PREVIEW_CHARS
        ? `${normalized.slice(0, MAX_PREVIEW_CHARS)}\n\n[请求体预览已截断]`
        : normalized,
    bodyPresent: true,
  };
}

function buildBinaryPreview(contentType: string | null, sizeBytes: number) {
  const label = contentType?.trim() || "未知类型";
  return `响应体为二进制内容，暂不直接展开预览。\nContent-Type: ${label}\n响应体大小：${sizeBytes} bytes`;
}

export async function runRequestDebug(input: RequestDebugInput): Promise<RequestDebugResult> {
  const headers = parseHeadersText(input.headersText);
  const requestBody = input.body ?? "";

  if ((input.method === "GET" || input.method === "HEAD") && requestBody.trim()) {
    throw new Error("GET 和 HEAD 请求不支持请求体，请清空 Body 后再试。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  try {
    const response = await fetch(input.url, {
      method: input.method,
      headers,
      body:
        requestBody && input.method !== "GET" && input.method !== "HEAD"
          ? requestBody
          : undefined,
      redirect: input.followRedirects ? "follow" : "manual",
      cache: "no-store",
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAtMs;
    const contentType = response.headers.get("content-type");
    const rawBody = new Uint8Array(await response.arrayBuffer());
    const sizeBytes = rawBody.byteLength;
    const responseHeaders = Object.fromEntries(
      Array.from(response.headers.entries()).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );

    let bodyPreview = "";
    let truncated = false;

    if (sizeBytes > 0) {
      if (isTextualContentType(contentType)) {
        const decoded = new TextDecoder().decode(rawBody);
        truncated = decoded.length > MAX_PREVIEW_CHARS;
        bodyPreview = truncated
          ? `${decoded.slice(0, MAX_PREVIEW_CHARS)}\n\n[响应体预览已截断]`
          : decoded;
      } else {
        bodyPreview = buildBinaryPreview(contentType, sizeBytes);
      }
    }

    return {
      request: {
        method: input.method,
        url: input.url,
        headers,
        ...buildBodyPreview(requestBody),
        timeoutMs: input.timeoutMs,
        followRedirects: input.followRedirects,
        startedAt,
      },
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        finalUrl: response.url,
        redirected: response.redirected,
        durationMs,
        contentType,
        sizeBytes,
        truncated,
        bodyPreview,
        headers: responseHeaders,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`请求超时，已在 ${input.timeoutMs} ms 后中止。`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
