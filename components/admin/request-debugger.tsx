"use client";

import { useState } from "react";
import {
  Braces,
  LoaderCircle,
  Plus,
  Rows3,
  ShieldAlert,
  Trash2,
  Waypoints,
} from "lucide-react";

const METHOD_OPTIONS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const TIMEOUT_OPTIONS = [3000, 5000, 10000, 15000, 30000, 60000] as const;
const INITIAL_HEADERS_TEXT = "Accept: application/json";

const HEADER_TEMPLATES = [
  { label: "JSON", key: "Accept", value: "application/json" },
  { label: "Content-Type", key: "Content-Type", value: "application/json" },
  { label: "Authorization", key: "Authorization", value: "Bearer " },
  { label: "User-Agent", key: "User-Agent", value: "ScholarBlogDebug/1.0" },
] as const;

type RequestMethod = (typeof METHOD_OPTIONS)[number];
type HeaderEditorMode = "table" | "raw";

type RequestHeaderRow = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

type RequestDebugFormState = {
  method: RequestMethod;
  url: string;
  headersText: string;
  body: string;
  timeoutMs: number;
  followRedirects: boolean;
};

type RequestDebugResult = {
  request: {
    method: RequestMethod;
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

type RequestDebugApiResponse =
  | {
      ok: true;
      result: RequestDebugResult;
    }
  | {
      ok: false;
      error: string;
    };

function createRowId() {
  return `header-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHeaderRow(
  partial: Partial<Pick<RequestHeaderRow, "enabled" | "key" | "value">> = {},
): RequestHeaderRow {
  return {
    id: createRowId(),
    enabled: partial.enabled ?? true,
    key: partial.key ?? "",
    value: partial.value ?? "",
  };
}

function parseHeadersTextToRows(headersText: string) {
  const normalized = headersText.trim();

  if (!normalized) {
    return [createHeaderRow()];
  }

  if (normalized.startsWith("{")) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new Error("原始请求头 JSON 解析失败，请先修正格式。");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("原始请求头 JSON 必须是对象格式。");
    }

    const entries = Object.entries(parsed as Record<string, unknown>).map(([key, value]) =>
      createHeaderRow({
        key,
        value: String(value ?? ""),
      }),
    );

    return entries.length > 0 ? entries : [createHeaderRow()];
  }

  const rows = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex <= 0) {
        throw new Error(`这一行不是有效的 Header: Value 格式：${line}`);
      }

      return createHeaderRow({
        key: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      });
    });

  return rows.length > 0 ? rows : [createHeaderRow()];
}

function rowsToHeadersText(rows: RequestHeaderRow[]) {
  return rows
    .filter((row) => row.enabled && row.key.trim())
    .map((row) => `${row.key.trim()}: ${row.value.trim()}`)
    .join("\n");
}

function enabledHeaderCount(rows: RequestHeaderRow[]) {
  return rows.filter((row) => row.enabled && row.key.trim()).length;
}

function safeCountHeadersText(headersText: string) {
  try {
    return parseHeadersTextToRows(headersText).filter((row) => row.key.trim()).length;
  } catch {
    return 0;
  }
}

function createInitialForm(): RequestDebugFormState {
  return {
    method: "GET",
    url: "",
    headersText: INITIAL_HEADERS_TEXT,
    body: "",
    timeoutMs: 15000,
    followRedirects: true,
  };
}

function createInitialHeaderRows() {
  return parseHeadersTextToRows(INITIAL_HEADERS_TEXT);
}

function formatJsonPreview(raw: string) {
  const normalized = raw.trim();

  if (!normalized) {
    return "";
  }

  try {
    return JSON.stringify(JSON.parse(normalized), null, 2);
  } catch {
    return raw;
  }
}

function formatHeadersPreview(headers: Record<string, string>) {
  if (Object.keys(headers).length === 0) {
    return "（空）";
  }

  return JSON.stringify(headers, null, 2);
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function statusBadgeClass(status: number) {
  if (status >= 200 && status < 300) {
    return "bg-[rgba(27,107,99,0.14)] text-[var(--accent-strong)]";
  }

  if (status >= 300 && status < 400) {
    return "bg-[rgba(168,123,53,0.14)] text-[var(--gold)]";
  }

  return "bg-[rgba(148,80,80,0.14)] text-[var(--ink)]";
}

function resultPanelClass() {
  return "rounded-[1.6rem] border border-[color:var(--border)] bg-[var(--panel-soft)] p-5 shadow-[0_18px_40px_rgba(20,33,43,0.05)]";
}

function headerModeButtonClass(active: boolean) {
  return active
    ? "inline-flex items-center gap-2 rounded-full bg-[rgba(27,107,99,0.12)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]"
    : "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--ink)]";
}

export function RequestDebugger() {
  const [form, setForm] = useState<RequestDebugFormState>(createInitialForm);
  const [headerEditorMode, setHeaderEditorMode] = useState<HeaderEditorMode>("table");
  const [headerRows, setHeaderRows] = useState<RequestHeaderRow[]>(createInitialHeaderRows);
  const [headerEditorError, setHeaderEditorError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RequestDebugResult | null>(null);

  const isBodyDisabled = form.method === "GET" || form.method === "HEAD";
  const effectiveHeadersText =
    headerEditorMode === "table" ? rowsToHeadersText(headerRows) : form.headersText;
  const activeHeaderCount =
    headerEditorMode === "table"
      ? enabledHeaderCount(headerRows)
      : safeCountHeadersText(form.headersText);

  function updateField<Key extends keyof RequestDebugFormState>(
    key: Key,
    value: RequestDebugFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function replaceHeaderRow(
    id: string,
    patch: Partial<Pick<RequestHeaderRow, "enabled" | "key" | "value">>,
  ) {
    setHeaderRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setHeaderEditorError("");
  }

  function addHeaderRow(
    partial: Partial<Pick<RequestHeaderRow, "enabled" | "key" | "value">> = {},
  ) {
    setHeaderRows((current) => [...current, createHeaderRow(partial)]);
    setHeaderEditorError("");
    setHeaderEditorMode("table");
  }

  function removeHeaderRow(id: string) {
    setHeaderRows((current) => {
      const nextRows = current.filter((row) => row.id !== id);
      return nextRows.length > 0 ? nextRows : [createHeaderRow()];
    });
    setHeaderEditorError("");
  }

  function applyHeaderTemplate(template: (typeof HEADER_TEMPLATES)[number]) {
    setHeaderRows((current) => {
      const blankIndex = current.findIndex((row) => !row.key.trim() && !row.value.trim());

      if (blankIndex >= 0) {
        return current.map((row, index) =>
          index === blankIndex
            ? {
                ...row,
                enabled: true,
                key: template.key,
                value: template.value,
              }
            : row,
        );
      }

      return [...current, createHeaderRow({ key: template.key, value: template.value })];
    });

    setHeaderEditorMode("table");
    setHeaderEditorError("");
  }

  function switchHeaderMode(nextMode: HeaderEditorMode) {
    if (nextMode === headerEditorMode) {
      return;
    }

    if (nextMode === "raw") {
      updateField("headersText", rowsToHeadersText(headerRows));
      setHeaderEditorMode("raw");
      setHeaderEditorError("");
      return;
    }

    try {
      const parsedRows = parseHeadersTextToRows(form.headersText);
      setHeaderRows(parsedRows);
      setHeaderEditorMode("table");
      setHeaderEditorError("");
    } catch (modeError) {
      setHeaderEditorError(
        modeError instanceof Error
          ? `${modeError.message} 你可以先继续使用原始文本模式。`
          : "原始请求头暂时无法转换为表格模式。",
      );
    }
  }

  function resetAll() {
    setForm(createInitialForm());
    setHeaderEditorMode("table");
    setHeaderRows(createInitialHeaderRows());
    setHeaderEditorError("");
    setLoading(false);
    setError("");
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/request-debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: form.method,
          url: form.url,
          headersText: effectiveHeadersText,
          body: isBodyDisabled ? "" : form.body,
          timeoutMs: form.timeoutMs,
          followRedirects: form.followRedirects,
        }),
      });

      const payload = (await response.json()) as RequestDebugApiResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "请求调试失败。" : payload.error);
      }

      setResult(payload.result);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "请求调试失败，请稍后重试。",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[2rem] p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]">
            <Waypoints className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
              发起服务端调试请求
            </h2>
            <p className="text-sm leading-7 text-[var(--ink-soft)]">
              请求会从当前站点服务端发出，不受浏览器 CORS 限制，适合排查第三方 API、Webhook、
              内网服务或反向代理链路是否可达。
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <ShieldAlert className="h-4 w-4 text-[var(--accent-strong)]" />
            使用提醒
          </div>
          <p className="mt-2">
            可以填写请求头和请求体，但请谨慎使用生产环境密钥、Cookie 和私有地址。页面只展示预览内容，
            过长的请求体或响应体会自动截断。
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">请求方法</span>
              <select
                className="field field--compact w-full"
                value={form.method}
                onChange={(event) => updateField("method", event.target.value as RequestMethod)}
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--ink)]">请求地址</span>
              <input
                className="field w-full"
                value={form.url}
                onChange={(event) => updateField("url", event.target.value)}
                placeholder="https://api.example.com/v1/health"
                spellCheck={false}
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">请求头</div>
                  <p className="text-xs leading-6 text-[var(--ink-soft)]">
                    默认使用表格模式，体验更接近 APIFox；需要时也可以切回原始文本。
                  </p>
                </div>

                <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[var(--panel-elevated)] p-1">
                  <button
                    type="button"
                    className={headerModeButtonClass(headerEditorMode === "table")}
                    onClick={() => switchHeaderMode("table")}
                  >
                    <Rows3 className="h-4 w-4" />
                    表格模式
                  </button>
                  <button
                    type="button"
                    className={headerModeButtonClass(headerEditorMode === "raw")}
                    onClick={() => switchHeaderMode("raw")}
                  >
                    <Braces className="h-4 w-4" />
                    原始文本
                  </button>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-[var(--panel-soft)] p-4">
                {headerEditorMode === "table" ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs leading-6 text-[var(--ink-soft)]">
                        已启用 <span className="font-semibold text-[var(--ink)]">{activeHeaderCount}</span>{" "}
                        条请求头。未勾选的行不会被发送。
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {HEADER_TEMPLATES.map((template) => (
                          <button
                            key={`${template.key}-${template.label}`}
                            type="button"
                            className="rounded-full border border-[color:var(--border)] bg-[var(--panel-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--panel-hover)]"
                            onClick={() => applyHeaderTemplate(template)}
                          >
                            + {template.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[1.3rem] border border-[color:var(--border)]">
                      <div className="grid grid-cols-[4.5rem_minmax(0,0.9fr)_minmax(0,1.1fr)_3rem] gap-3 bg-[var(--panel-elevated)] px-3 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        <span>启用</span>
                        <span>Header</span>
                        <span>Value</span>
                        <span className="text-center">删</span>
                      </div>

                      <div className="divide-y divide-[color:var(--border)]">
                        {headerRows.map((row) => (
                          <div
                            key={row.id}
                            className="grid grid-cols-[4.5rem_minmax(0,0.9fr)_minmax(0,1.1fr)_3rem] gap-3 bg-[var(--panel-soft)] px-3 py-3"
                          >
                            <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                              <input
                                className="h-4 w-4 accent-[var(--accent)]"
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(event) =>
                                  replaceHeaderRow(row.id, { enabled: event.target.checked })
                                }
                              />
                              <span>{row.enabled ? "开" : "关"}</span>
                            </label>

                            <input
                              className="field h-11 w-full"
                              value={row.key}
                              onChange={(event) =>
                                replaceHeaderRow(row.id, { key: event.target.value })
                              }
                              placeholder="Authorization"
                              spellCheck={false}
                            />

                            <input
                              className="field h-11 w-full"
                              value={row.value}
                              onChange={(event) =>
                                replaceHeaderRow(row.id, { value: event.target.value })
                              }
                              placeholder="Bearer xxx"
                              spellCheck={false}
                            />

                            <button
                              type="button"
                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[var(--panel-elevated)] text-[var(--ink-soft)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--ink)]"
                              onClick={() => removeHeaderRow(row.id)}
                              title="删除这一行"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className="btn-secondary" onClick={() => addHeaderRow()}>
                        <Plus className="h-4 w-4" />
                        新增请求头
                      </button>

                      <p className="text-xs leading-6 text-[var(--ink-soft)]">
                        小提示：如果你在发送 JSON Body，通常还需要补一个
                        <span className="font-semibold text-[var(--ink)]">
                          {" "}
                          Content-Type: application/json
                        </span>
                        。
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <textarea
                      className="field min-h-48 w-full resize-y"
                      value={form.headersText}
                      onChange={(event) => {
                        updateField("headersText", event.target.value);
                        setHeaderEditorError("");
                      }}
                      placeholder={`Authorization: Bearer xxx\nContent-Type: application/json`}
                      spellCheck={false}
                    />
                    <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
                      支持两种格式：每行一个 <code>Header: Value</code>，或直接粘贴 JSON 对象。
                      切回表格模式时会自动尝试解析。
                    </p>
                  </>
                )}

                {headerEditorError ? (
                  <div className="mt-4 rounded-[1.2rem] border border-[rgba(168,123,53,0.24)] bg-[rgba(168,123,53,0.12)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                    {headerEditorError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--ink)]">超时时间</span>
                <select
                  className="field field--compact w-full"
                  value={form.timeoutMs}
                  onChange={(event) => updateField("timeoutMs", Number(event.target.value))}
                >
                  {TIMEOUT_OPTIONS.map((timeoutMs) => (
                    <option key={timeoutMs} value={timeoutMs}>
                      {timeoutMs} ms
                    </option>
                  ))}
                </select>
              </label>

              <label className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4 text-sm text-[var(--ink)]">
                <div className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                    type="checkbox"
                    checked={form.followRedirects}
                    onChange={(event) => updateField("followRedirects", event.target.checked)}
                  />
                  <div>
                    <div className="font-semibold">跟随重定向</div>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                      打开后会自动跟随 3xx 跳转，并展示最终到达的地址。
                    </p>
                  </div>
                </div>
              </label>

              <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4">
                <div className="text-sm font-semibold text-[var(--ink)]">发送预览</div>
                <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  当前会发送 <span className="font-semibold text-[var(--ink)]">{activeHeaderCount}</span>{" "}
                  条请求头。
                </div>
                <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-[1rem] border border-[color:var(--border)] bg-[var(--panel-soft)] px-3 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                  {effectiveHeadersText || "（空）"}
                </pre>
              </div>
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--ink)]">请求体</span>
            <textarea
              className="field min-h-52 w-full resize-y disabled:cursor-not-allowed disabled:opacity-70"
              value={form.body}
              onChange={(event) => updateField("body", event.target.value)}
              placeholder={`{\n  "ping": "hello"\n}`}
              spellCheck={false}
              disabled={isBodyDisabled}
            />
            <p className="text-xs leading-6 text-[var(--ink-soft)]">
              {isBodyDisabled
                ? "GET 和 HEAD 不会发送 Body。你现在填写的内容会保留，切换回其他方法后可继续使用。"
                : "直接填写原始文本即可，常见 JSON 请求也可以直接粘贴。"}
            </p>
          </label>

          {error ? (
            <div className="rounded-[1.4rem] border border-[rgba(148,80,80,0.24)] bg-[rgba(148,80,80,0.1)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="btn-primary min-w-40 justify-center disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Waypoints className="h-4 w-4" />
              )}
              {loading ? "调试中..." : "开始调试"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={resetAll}
              disabled={loading}
            >
              重置表单
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-6">
        {result ? (
          <>
            <section className="glass-card rounded-[2rem] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">调试结果</p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
                    响应概览
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${statusBadgeClass(
                    result.response.status,
                  )}`}
                >
                  HTTP {result.response.status}
                  {result.response.statusText ? ` · ${result.response.statusText}` : ""}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className={resultPanelClass()}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    请求摘要
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink)]">
                    <div>方法：{result.request.method}</div>
                    <div className="break-all">地址：{result.request.url}</div>
                    <div>开始时间：{formatTimeLabel(result.request.startedAt)}</div>
                    <div>超时：{result.request.timeoutMs} ms</div>
                    <div>重定向：{result.request.followRedirects ? "跟随" : "不跟随"}</div>
                  </div>
                </div>

                <div className={resultPanelClass()}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                    响应摘要
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--ink)]">
                    <div>耗时：{result.response.durationMs} ms</div>
                    <div>状态：{result.response.ok ? "请求成功" : "请求失败"}</div>
                    <div>响应类型：{result.response.contentType ?? "未返回 Content-Type"}</div>
                    <div>响应大小：{formatBytes(result.response.sizeBytes)}</div>
                    <div>发生跳转：{result.response.redirected ? "是" : "否"}</div>
                    <div className="break-all">最终地址：{result.response.finalUrl || "未返回"}</div>
                  </div>
                </div>
              </div>

              {result.response.truncated ? (
                <div className="mt-5 rounded-[1.4rem] border border-[rgba(168,123,53,0.24)] bg-[rgba(168,123,53,0.1)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                  响应体过长，当前只展示前 20000 个字符。
                </div>
              ) : null}
            </section>

            <section className={resultPanelClass()}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  响应体预览
                </h3>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  {result.response.contentType ?? "未知类型"}
                </span>
              </div>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4 text-sm leading-7 text-[var(--ink)]">
                {formatJsonPreview(result.response.bodyPreview) || "（无响应体）"}
              </pre>
            </section>

            <section className={resultPanelClass()}>
              <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                请求详情
              </h3>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">请求头</div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4 text-xs leading-6 text-[var(--ink-soft)]">
                    {formatHeadersPreview(result.request.headers)}
                  </pre>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">请求体</div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4 text-xs leading-6 text-[var(--ink-soft)]">
                    {formatJsonPreview(result.request.bodyPreview) ||
                      (result.request.bodyPresent ? "（空字符串）" : "（未发送请求体）")}
                  </pre>
                </div>
              </div>
            </section>

            <section className={resultPanelClass()}>
              <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                响应头
              </h3>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--panel-elevated)] px-4 py-4 text-xs leading-6 text-[var(--ink-soft)]">
                {formatHeadersPreview(result.response.headers)}
              </pre>
            </section>
          </>
        ) : (
          <section className="glass-card rounded-[2rem] p-8">
            <p className="section-kicker">等待调试</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
              还没有结果
            </h2>
            <p className="mt-4 text-sm leading-8 text-[var(--ink-soft)]">
              在左侧填入请求地址、方法和请求参数后发起调试，这里会显示服务端实际发出的请求摘要、响应头、响应体预览和跳转情况。
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
