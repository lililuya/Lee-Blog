"use client";

import { useState } from "react";
import { Bot, Cloud, LoaderCircle, Mic, ShieldAlert, Waypoints } from "lucide-react";

export type ValidationLabSavedProvider = {
  id: string;
  name: string;
  slug: string;
  adapter: "OPENAI_COMPATIBLE" | "ANTHROPIC";
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
  enabled: boolean;
  runtimeReady: boolean;
};

export type ValidationLabTranscriptionProvider = {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  supportsChat: boolean;
  implementationStatus: "ready" | "reserved";
  apiKeyEnv?: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type ValidationLabObjectStorageStatus = {
  configured: boolean;
  mode: "local" | "object";
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  publicBaseUrl: string | null;
  keyPrefix: string;
  localFallbackPath: string;
};

type ChatKind = "llm-openai-compatible" | "llm-anthropic";
type SpeechKind = "stt-funasr" | "stt-openai-compatible";
type ApiKeyMode = "runtime" | "manual";

type FunAsrResult = {
  kind: "stt-funasr";
  model: string;
  transcript: string;
  debugEvents: Array<{ at: string; phase: string; detail: string }>;
};

type SpeechResult =
  | FunAsrResult
  | {
      kind: "stt-openai-compatible";
      endpoint: string;
      model: string;
      transcript: string;
      rawResponsePreview: string;
    };

type LlmResult = {
  kind: ChatKind;
  endpoint: string;
  model: string;
  contentPreview: string;
  rawResponsePreview: string;
};

type ObjectStorageCheck = {
  label: string;
  status: "pass" | "fail" | "skip";
  detail: string;
  durationMs?: number | null;
  httpStatus?: number | null;
};

type ObjectStorageResult = ValidationLabObjectStorageStatus & {
  kind: "object-storage";
  summary: string;
  testObjectKey: string | null;
  publicUrl: string | null;
  checks: ObjectStorageCheck[];
};

function toChatKind(adapter: ValidationLabSavedProvider["adapter"]): ChatKind {
  return adapter === "ANTHROPIC" ? "llm-anthropic" : "llm-openai-compatible";
}

function speechProviderId(kind: SpeechKind) {
  return kind === "stt-openai-compatible" ? "openai-compatible" : "funasr";
}

function speechKindFromId(id: string): SpeechKind {
  return id === "openai-compatible" ? "stt-openai-compatible" : "stt-funasr";
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatJsonPreview(raw: string) {
  const normalized = raw.trim();

  if (!normalized) {
    return raw;
  }

  try {
    return JSON.stringify(JSON.parse(normalized), null, 2);
  } catch {
    return raw;
  }
}

function statusPillClass(status: ObjectStorageCheck["status"]) {
  if (status === "pass") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "fail") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

function statusPillText(status: ObjectStorageCheck["status"]) {
  if (status === "pass") {
    return "通过";
  }

  if (status === "fail") {
    return "失败";
  }

  return "跳过";
}

function formatDuration(durationMs?: number | null) {
  if (durationMs === null || durationMs === undefined) {
    return null;
  }

  return `${durationMs} ms`;
}

export function ApiValidationLab({
  savedProviders,
  transcriptionProviders,
  objectStorageStatus,
}: {
  savedProviders: ValidationLabSavedProvider[];
  transcriptionProviders: ValidationLabTranscriptionProvider[];
  objectStorageStatus: ValidationLabObjectStorageStatus;
}) {
  const saved = savedProviders[0] ?? null;
  const speechDefault =
    transcriptionProviders.find((item) => item.id === "funasr") ??
    transcriptionProviders.find((item) => item.id === "openai-compatible") ??
    null;

  const [llmPresetId, setLlmPresetId] = useState(saved?.id ?? "");
  const [llmKind, setLlmKind] = useState<ChatKind>(
    saved ? toChatKind(saved.adapter) : "llm-openai-compatible",
  );
  const [llmBaseUrl, setLlmBaseUrl] = useState(saved?.baseUrl ?? "");
  const [llmModel, setLlmModel] = useState(saved?.model ?? "");
  const [llmApiKeyMode, setLlmApiKeyMode] = useState<ApiKeyMode>(
    saved?.runtimeReady ? "runtime" : "manual",
  );
  const [llmApiKeyEnv, setLlmApiKeyEnv] = useState(saved?.apiKeyEnv ?? "");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmSystemPrompt, setLlmSystemPrompt] = useState(
    "你是一个连通性测试助手，请用简短且稳定的方式回复。",
  );
  const [llmPrompt, setLlmPrompt] = useState(
    "请用一句简短的话确认这次 API 请求已经成功完成。",
  );
  const [llmResult, setLlmResult] = useState<LlmResult | null>(null);
  const [llmError, setLlmError] = useState("");
  const [llmLoading, setLlmLoading] = useState(false);

  const [speechKind, setSpeechKind] = useState<SpeechKind>(
    speechDefault ? speechKindFromId(speechDefault.id) : "stt-funasr",
  );
  const [speechApiKeyMode, setSpeechApiKeyMode] = useState<ApiKeyMode>(
    speechDefault?.configured ? "runtime" : "manual",
  );
  const [speechApiKeyEnv, setSpeechApiKeyEnv] = useState(speechDefault?.apiKeyEnv ?? "");
  const [speechApiKey, setSpeechApiKey] = useState("");
  const [speechBaseUrl, setSpeechBaseUrl] = useState(
    speechDefault?.id === "openai-compatible" ? speechDefault.baseUrl ?? "" : "",
  );
  const [speechModel, setSpeechModel] = useState(
    speechDefault?.model ?? (speechDefault?.id === "funasr" ? "paraformer-realtime-v2" : ""),
  );
  const [speechPrompt, setSpeechPrompt] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("");
  const [speechFile, setSpeechFile] = useState<File | null>(null);
  const [speechResult, setSpeechResult] = useState<SpeechResult | null>(null);
  const [speechError, setSpeechError] = useState("");
  const [speechLoading, setSpeechLoading] = useState(false);

  const [storageResult, setStorageResult] = useState<ObjectStorageResult | null>(null);
  const [storageError, setStorageError] = useState("");
  const [storageLoading, setStorageLoading] = useState(false);

  const speechMeta =
    transcriptionProviders.find((item) => item.id === speechProviderId(speechKind)) ?? null;

  function applySavedProvider(providerId: string) {
    setLlmPresetId(providerId);
    const next = savedProviders.find((item) => item.id === providerId);

    if (!next) {
      return;
    }

    setLlmKind(toChatKind(next.adapter));
    setLlmBaseUrl(next.baseUrl);
    setLlmModel(next.model);
    setLlmApiKeyEnv(next.apiKeyEnv);
    setLlmApiKeyMode(next.runtimeReady ? "runtime" : "manual");
  }

  function applySpeechKind(nextKind: SpeechKind) {
    setSpeechKind(nextKind);
    const next = transcriptionProviders.find((item) => item.id === speechProviderId(nextKind));
    setSpeechApiKeyEnv(next?.apiKeyEnv ?? "");
    setSpeechBaseUrl(next?.id === "openai-compatible" ? next.baseUrl ?? "" : "");
    setSpeechModel(next?.model ?? (next?.id === "funasr" ? "paraformer-realtime-v2" : ""));
  }

  async function submitLlm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLlmLoading(true);
    setLlmError("");
    setLlmResult(null);

    try {
      const form = new FormData();
      form.append("kind", llmKind);
      form.append("baseUrl", llmBaseUrl);
      form.append("model", llmModel);
      form.append("prompt", llmPrompt);
      form.append("systemPrompt", llmSystemPrompt);
      form.append("apiKeyMode", llmApiKeyMode);

      if (llmApiKeyMode === "runtime") {
        form.append("apiKeyEnv", llmApiKeyEnv);
      } else {
        form.append("apiKey", llmApiKey);
      }

      const response = await fetch("/api/tools/validate", { method: "POST", body: form });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "模型 API 校验失败。");
      }

      setLlmResult(payload.result ?? null);
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : "模型 API 校验失败。");
    } finally {
      setLlmLoading(false);
    }
  }

  async function submitSpeech(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSpeechLoading(true);
    setSpeechError("");
    setSpeechResult(null);

    try {
      if (!speechFile) {
        throw new Error("请先上传一段简短音频，再执行语音校验。");
      }

      const form = new FormData();
      form.append("kind", speechKind);
      form.append("audio", speechFile);
      form.append("apiKeyMode", speechApiKeyMode);

      if (speechApiKeyMode === "runtime") {
        form.append("apiKeyEnv", speechApiKeyEnv);
      } else {
        form.append("apiKey", speechApiKey);
      }

      if (speechModel.trim()) {
        form.append("model", speechModel.trim());
      }

      if (speechKind === "stt-openai-compatible") {
        form.append("baseUrl", speechBaseUrl);

        if (speechPrompt.trim()) {
          form.append("prompt", speechPrompt.trim());
        }

        if (speechLanguage.trim()) {
          form.append("language", speechLanguage.trim());
        }
      }

      const response = await fetch("/api/tools/validate", { method: "POST", body: form });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "语音校验失败。");
      }

      setSpeechResult(payload.result ?? null);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "语音校验失败。");
    } finally {
      setSpeechLoading(false);
    }
  }

  async function submitObjectStorageValidation() {
    setStorageLoading(true);
    setStorageError("");
    setStorageResult(null);

    try {
      const form = new FormData();
      form.append("kind", "object-storage");

      const response = await fetch("/api/tools/validate", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "对象存储校验失败。");
      }

      setStorageResult(payload.result ?? null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "对象存储校验失败。");
    } finally {
      setStorageLoading(false);
    }
  }

  return (
    <section className="glass-card rounded-[2rem] p-6 md:p-8">
      <p className="section-kicker">实验面板</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
        实时请求校验
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
        使用和站点线上一致的运行时协议，先查看响应结果和调试线索，再决定是否接入正式功能。
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-[1.7rem] border border-black/8 bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">模型 API 校验</h3>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                支持 OpenAI 兼容和 Anthropic 请求格式。
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submitLlm}>
            <select
              className="field field--compact"
              value={llmPresetId}
              onChange={(event) => applySavedProvider(event.target.value)}
            >
              {savedProviders.length > 0 ? (
                savedProviders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} | {item.model}
                  </option>
                ))
              ) : (
                <option value="">手动配置</option>
              )}
            </select>

            <div className="grid gap-4 md:grid-cols-2">
              <select
                className="field field--compact"
                value={llmKind}
                onChange={(event) => setLlmKind(event.target.value as ChatKind)}
              >
                <option value="llm-openai-compatible">OpenAI-compatible</option>
                <option value="llm-anthropic">Anthropic</option>
              </select>
              <select
                className="field field--compact"
                value={llmApiKeyMode}
                onChange={(event) => setLlmApiKeyMode(event.target.value as ApiKeyMode)}
              >
                <option value="runtime">运行时环境变量</option>
                <option value="manual">手动填写密钥</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="field"
                value={llmBaseUrl}
                onChange={(event) => setLlmBaseUrl(event.target.value)}
                placeholder="Base URL"
              />
              <input
                className="field"
                value={llmModel}
                onChange={(event) => setLlmModel(event.target.value)}
                placeholder="模型"
              />
            </div>

            {llmApiKeyMode === "runtime" ? (
              <input
                className="field"
                value={llmApiKeyEnv}
                onChange={(event) => setLlmApiKeyEnv(event.target.value)}
                placeholder="API Key 环境变量"
              />
            ) : (
              <input
                className="field"
                type="password"
                value={llmApiKey}
                onChange={(event) => setLlmApiKey(event.target.value)}
                placeholder="API Key"
              />
            )}

            <textarea
              className="field min-h-28 resize-y"
              value={llmSystemPrompt}
              onChange={(event) => setLlmSystemPrompt(event.target.value)}
              placeholder="系统提示词"
            />
            <textarea
              className="field min-h-32 resize-y"
              value={llmPrompt}
              onChange={(event) => setLlmPrompt(event.target.value)}
              placeholder="用户提示词"
            />

            {llmError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {llmError}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn-primary min-w-40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={llmLoading}
            >
              {llmLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {llmLoading ? "校验中..." : "校验模型 API"}
            </button>
          </form>

          {llmResult ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">结果预览</div>
              <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                {llmResult.endpoint}
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                {llmResult.contentPreview || "（空响应）"}
              </div>
              <details className="mt-3 rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  查看原始响应预览
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-soft)]">
                  {formatJsonPreview(llmResult.rawResponsePreview)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.7rem] border border-black/8 bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">语音校验</h3>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                用真实音频对比 FunASR 与 OpenAI 兼容 STT 的表现。
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submitSpeech}>
            <div className="grid gap-4 md:grid-cols-2">
              <select
                className="field field--compact"
                value={speechKind}
                onChange={(event) => applySpeechKind(event.target.value as SpeechKind)}
              >
                <option value="stt-funasr">FunASR</option>
                <option value="stt-openai-compatible">OpenAI-compatible STT</option>
              </select>
              <select
                className="field field--compact"
                value={speechApiKeyMode}
                onChange={(event) => setSpeechApiKeyMode(event.target.value as ApiKeyMode)}
              >
                <option value="runtime">运行时环境变量</option>
                <option value="manual">手动填写密钥</option>
              </select>
            </div>

            <div className="rounded-2xl border border-black/8 bg-[rgba(20,33,43,0.03)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
              <div className="font-semibold text-[var(--ink)]">{speechMeta?.name ?? "语音转写"}</div>
              <div>
                {speechMeta?.description ??
                  "先选择一种 STT 协议，再上传一段短音频进行校验。"}
              </div>
              {speechKind === "stt-funasr" ? (
                <div>调试 FunASR 时，建议使用 16k 的 WAV 或 PCM 音频输入。</div>
              ) : null}
            </div>

            {speechKind === "stt-openai-compatible" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field"
                  value={speechBaseUrl}
                  onChange={(event) => setSpeechBaseUrl(event.target.value)}
                  placeholder="Base URL"
                />
                <input
                  className="field"
                  value={speechModel}
                  onChange={(event) => setSpeechModel(event.target.value)}
                  placeholder="模型"
                />
              </div>
            ) : (
              <input
                className="field"
                value={speechModel}
                onChange={(event) => setSpeechModel(event.target.value)}
                placeholder="FunASR 模型"
              />
            )}

            {speechApiKeyMode === "runtime" ? (
              <input
                className="field"
                value={speechApiKeyEnv}
                onChange={(event) => setSpeechApiKeyEnv(event.target.value)}
                placeholder="API Key 环境变量"
              />
            ) : (
              <input
                className="field"
                type="password"
                value={speechApiKey}
                onChange={(event) => setSpeechApiKey(event.target.value)}
                placeholder="API Key"
              />
            )}

            {speechKind === "stt-openai-compatible" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="field"
                  value={speechPrompt}
                  onChange={(event) => setSpeechPrompt(event.target.value)}
                  placeholder="提示词（可选）"
                />
                <input
                  className="field"
                  value={speechLanguage}
                  onChange={(event) => setSpeechLanguage(event.target.value)}
                  placeholder="语言（可选）"
                />
              </div>
            ) : null}

            <input
              className="field cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
              type="file"
              accept="audio/*,.wav,.pcm"
              onChange={(event) => setSpeechFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs leading-6 text-[var(--ink-soft)]">
              {speechFile
                ? `已选择：${speechFile.name}`
                : "上传一段短音频，验证真实语音转写链路。"}
            </p>

            {speechError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {speechError}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn-primary min-w-40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={speechLoading}
            >
              {speechLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Waypoints className="h-4 w-4" />
              )}
              {speechLoading ? "校验中..." : "校验语音链路"}
            </button>
          </form>

          {speechResult?.kind === "stt-funasr" ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">FunASR 结果</div>
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                {speechResult.transcript || "（空转写结果）"}
              </div>
              <div className="mt-4 space-y-2">
                {speechResult.debugEvents.map((item, index) => (
                  <div
                    key={`${item.at}-${index}`}
                    className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.65)] px-4 py-3"
                  >
                    <div className="text-[0.72rem] font-semibold text-[var(--ink-soft)]">
                      {item.phase} | {item.at}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[var(--ink)]">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
              <details className="mt-3 rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  查看结构化结果
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-soft)]">
                  {json(speechResult)}
                </pre>
              </details>
            </div>
          ) : null}

          {speechResult?.kind === "stt-openai-compatible" ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">
                OpenAI 兼容 STT 结果
              </div>
              <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                {speechResult.endpoint}
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                {speechResult.transcript || "（空转写结果）"}
              </div>
              <details className="mt-3 rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  查看原始响应预览
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-soft)]">
                  {formatJsonPreview(speechResult.rawResponsePreview)}
                </pre>
              </details>
            </div>
          ) : null}

          {!speechResult && !speechError ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.62)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                <ShieldAlert className="h-4 w-4 text-[var(--accent-strong)]" />
                预留扩展位
              </div>
              <p className="mt-2">
                当前聊天链路已经不再把 FunASR 写死。现在可以校验 FunASR 与 OpenAI 兼容 STT，
                后续也可以继续扩展到讯飞或基于 webhook 的 STT 适配器。
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.7rem] border border-black/8 bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">对象存储校验</h3>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                检查运行时配置、上传权限、公开访问链接和清理能力。
              </p>
            </div>
          </div>

            <div className="mt-5 rounded-2xl border border-black/8 bg-[rgba(20,33,43,0.03)] px-4 py-4 text-xs leading-6 text-[var(--ink-soft)]">
              <div className="font-semibold text-[var(--ink)]">
                {objectStorageStatus.mode === "object"
                  ? "当前已启用对象存储"
                  : "当前启用本地媒体回退"}
              </div>
              <div className="mt-2">Bucket: {objectStorageStatus.bucket ?? "-"}</div>
              <div>Region: {objectStorageStatus.region ?? "-"}</div>
              <div>Endpoint: {objectStorageStatus.endpoint ?? "-"}</div>
              <div>公共地址前缀: {objectStorageStatus.publicBaseUrl ?? "-"}</div>
              <div>Key 前缀: {objectStorageStatus.keyPrefix || "无"}</div>
              <div>回退路径: {objectStorageStatus.localFallbackPath}</div>
            </div>

          <div className="mt-5">
            {storageError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {storageError}
              </div>
            ) : null}

            <button
              type="button"
              className="btn-primary min-w-40 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={submitObjectStorageValidation}
              disabled={storageLoading}
            >
              {storageLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              {storageLoading ? "校验中..." : "校验媒体存储"}
            </button>
          </div>

          {storageResult ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">{storageResult.summary}</div>
              <div className="mt-2 space-y-1 text-xs leading-6 text-[var(--ink-soft)]">
                <div>模式：{storageResult.mode === "object" ? "对象存储" : "本地回退"}</div>
                <div>Bucket: {storageResult.bucket ?? "-"}</div>
                <div>Region: {storageResult.region ?? "-"}</div>
                <div>Endpoint: {storageResult.endpoint ?? "-"}</div>
                <div>公共地址前缀: {storageResult.publicBaseUrl ?? "-"}</div>
                <div>测试 Key: {storageResult.testObjectKey ?? "-"}</div>
                <div>探测 URL: {storageResult.publicUrl ?? "-"}</div>
              </div>

              <div className="mt-4 space-y-3">
                {storageResult.checks.map((check) => (
                  <div
                    key={`${check.label}-${check.detail}`}
                    className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.68)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-[var(--ink)]">{check.label}</div>
                      <span
                        className={`rounded-full px-3 py-1 text-[0.72rem] font-semibold ${statusPillClass(
                          check.status,
                        )}`}
                      >
                        {statusPillText(check.status)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                      {check.detail}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                      {formatDuration(check.durationMs) ? (
                        <span>{formatDuration(check.durationMs)}</span>
                      ) : null}
                      {check.httpStatus ? <span>HTTP {check.httpStatus}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.62)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
              更新 `OBJECT_STORAGE_*` 环境变量后，再运行一次存储校验。校验器会通过临时探测对象测试上传、
              公开可访问性和清理流程。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
