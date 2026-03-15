"use client";

import { useState } from "react";
import { Bot, LoaderCircle, Mic, ShieldAlert, Waypoints } from "lucide-react";

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

type ChatKind = "llm-openai-compatible" | "llm-anthropic";
type SpeechKind = "stt-funasr" | "stt-openai-compatible";
type ApiKeyMode = "runtime" | "manual";

type FunAsrResult = {
  kind: "stt-funasr";
  model: string;
  transcript: string;
  debugEvents: Array<{ at: string; phase: string; detail: string }>;
};

type SpeechResult = FunAsrResult | {
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

export function ApiValidationLab({
  savedProviders,
  transcriptionProviders,
}: {
  savedProviders: ValidationLabSavedProvider[];
  transcriptionProviders: ValidationLabTranscriptionProvider[];
}) {
  const saved = savedProviders[0] ?? null;
  const speechDefault =
    transcriptionProviders.find((item) => item.id === "funasr") ??
    transcriptionProviders.find((item) => item.id === "openai-compatible") ??
    null;

  const [llmPresetId, setLlmPresetId] = useState(saved?.id ?? "");
  const [llmKind, setLlmKind] = useState<ChatKind>(saved ? toChatKind(saved.adapter) : "llm-openai-compatible");
  const [llmBaseUrl, setLlmBaseUrl] = useState(saved?.baseUrl ?? "");
  const [llmModel, setLlmModel] = useState(saved?.model ?? "");
  const [llmApiKeyMode, setLlmApiKeyMode] = useState<ApiKeyMode>(saved?.runtimeReady ? "runtime" : "manual");
  const [llmApiKeyEnv, setLlmApiKeyEnv] = useState(saved?.apiKeyEnv ?? "");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmSystemPrompt, setLlmSystemPrompt] = useState("你是接口连通性验证助手，请用简洁稳定的方式回复。");
  const [llmPrompt, setLlmPrompt] = useState("请只回复一小段确认文本，说明当前接口链路可以正常工作。");
  const [llmResult, setLlmResult] = useState<LlmResult | null>(null);
  const [llmError, setLlmError] = useState("");
  const [llmLoading, setLlmLoading] = useState(false);

  const [speechKind, setSpeechKind] = useState<SpeechKind>(speechDefault ? speechKindFromId(speechDefault.id) : "stt-funasr");
  const [speechApiKeyMode, setSpeechApiKeyMode] = useState<ApiKeyMode>(speechDefault?.configured ? "runtime" : "manual");
  const [speechApiKeyEnv, setSpeechApiKeyEnv] = useState(speechDefault?.apiKeyEnv ?? "");
  const [speechApiKey, setSpeechApiKey] = useState("");
  const [speechBaseUrl, setSpeechBaseUrl] = useState(speechDefault?.id === "openai-compatible" ? speechDefault.baseUrl ?? "" : "");
  const [speechModel, setSpeechModel] = useState(speechDefault?.model ?? (speechDefault?.id === "funasr" ? "paraformer-realtime-v2" : ""));
  const [speechPrompt, setSpeechPrompt] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("");
  const [speechFile, setSpeechFile] = useState<File | null>(null);
  const [speechResult, setSpeechResult] = useState<SpeechResult | null>(null);
  const [speechError, setSpeechError] = useState("");
  const [speechLoading, setSpeechLoading] = useState(false);

  const speechMeta =
    transcriptionProviders.find((item) => item.id === speechProviderId(speechKind)) ?? null;

  function applySavedProvider(providerId: string) {
    setLlmPresetId(providerId);
    const next = savedProviders.find((item) => item.id === providerId);
    if (!next) return;
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
      if (llmApiKeyMode === "runtime") form.append("apiKeyEnv", llmApiKeyEnv);
      else form.append("apiKey", llmApiKey);
      const response = await fetch("/api/tools/validate", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "模型接口验证失败。");
      setLlmResult(payload.result ?? null);
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : "模型接口验证失败。");
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
      if (!speechFile) throw new Error("请先上传一段测试音频。");
      const form = new FormData();
      form.append("kind", speechKind);
      form.append("audio", speechFile);
      form.append("apiKeyMode", speechApiKeyMode);
      if (speechApiKeyMode === "runtime") form.append("apiKeyEnv", speechApiKeyEnv);
      else form.append("apiKey", speechApiKey);
      if (speechModel.trim()) form.append("model", speechModel.trim());
      if (speechKind === "stt-openai-compatible") {
        form.append("baseUrl", speechBaseUrl);
        if (speechPrompt.trim()) form.append("prompt", speechPrompt.trim());
        if (speechLanguage.trim()) form.append("language", speechLanguage.trim());
      }
      const response = await fetch("/api/tools/validate", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "语音接口验证失败。");
      setSpeechResult(payload.result ?? null);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "语音接口验证失败。");
    } finally {
      setSpeechLoading(false);
    }
  }

  return (
    <section className="glass-card rounded-[2rem] p-6 md:p-8">
      <p className="section-kicker">Validation Lab</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">请求验证与语音链路排障</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
        这里按真实接口契约直接发请求，先验证 base URL、模型名、鉴权方式和返回结构，再接进对话或工具链路。FunASR 会额外返回 websocket 时间线，便于定位卡点。
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.7rem] border border-black/8 bg-white/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.12)] text-[var(--accent-strong)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">模型 API 验证</h3>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">支持 OpenAI-compatible 与 Anthropic 请求格式。</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submitLlm}>
            <select className="field field--compact" value={llmPresetId} onChange={(event) => applySavedProvider(event.target.value)}>
              {savedProviders.length > 0 ? savedProviders.map((item) => (
                <option key={item.id} value={item.id}>{item.name} | {item.model}</option>
              )) : <option value="">仅手动配置</option>}
            </select>

            <div className="grid gap-4 md:grid-cols-2">
              <select className="field field--compact" value={llmKind} onChange={(event) => setLlmKind(event.target.value as ChatKind)}>
                <option value="llm-openai-compatible">OpenAI-compatible</option>
                <option value="llm-anthropic">Anthropic</option>
              </select>
              <select className="field field--compact" value={llmApiKeyMode} onChange={(event) => setLlmApiKeyMode(event.target.value as ApiKeyMode)}>
                <option value="runtime">运行时环境变量</option>
                <option value="manual">手动输入</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input className="field" value={llmBaseUrl} onChange={(event) => setLlmBaseUrl(event.target.value)} placeholder="Base URL" />
              <input className="field" value={llmModel} onChange={(event) => setLlmModel(event.target.value)} placeholder="Model" />
            </div>

            {llmApiKeyMode === "runtime" ? (
              <input className="field" value={llmApiKeyEnv} onChange={(event) => setLlmApiKeyEnv(event.target.value)} placeholder="API Key Env" />
            ) : (
              <input className="field" type="password" value={llmApiKey} onChange={(event) => setLlmApiKey(event.target.value)} placeholder="API Key" />
            )}

            <textarea className="field min-h-28 resize-y" value={llmSystemPrompt} onChange={(event) => setLlmSystemPrompt(event.target.value)} placeholder="System prompt" />
            <textarea className="field min-h-32 resize-y" value={llmPrompt} onChange={(event) => setLlmPrompt(event.target.value)} placeholder="Prompt" />

            {llmError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{llmError}</div> : null}

            <button type="submit" className="btn-primary min-w-40 disabled:cursor-not-allowed disabled:opacity-60" disabled={llmLoading}>
              {llmLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {llmLoading ? "验证中..." : "验证模型接口"}
            </button>
          </form>

          {llmResult ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">结果预览</div>
              <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{llmResult.endpoint}</div>
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                {llmResult.contentPreview || "(empty response)"}
              </div>
              <details className="mt-3 rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">查看原始响应预览</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-soft)]">{llmResult.rawResponsePreview}</pre>
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
              <h3 className="text-lg font-semibold">语音转写验证</h3>
              <p className="text-xs leading-6 text-[var(--ink-soft)]">FunASR 可输出调试时间线，OpenAI-compatible STT 可检查 `/audio/transcriptions` 合约。</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submitSpeech}>
            <div className="grid gap-4 md:grid-cols-2">
              <select className="field field--compact" value={speechKind} onChange={(event) => applySpeechKind(event.target.value as SpeechKind)}>
                <option value="stt-funasr">FunASR</option>
                <option value="stt-openai-compatible">OpenAI-compatible STT</option>
              </select>
              <select className="field field--compact" value={speechApiKeyMode} onChange={(event) => setSpeechApiKeyMode(event.target.value as ApiKeyMode)}>
                <option value="runtime">运行时环境变量</option>
                <option value="manual">手动输入</option>
              </select>
            </div>

            <div className="rounded-2xl border border-black/8 bg-[rgba(20,33,43,0.03)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
              <div className="font-semibold text-[var(--ink)]">{speechMeta?.name ?? "STT"}</div>
              <div>{speechMeta?.description ?? "选择一种 STT 协议后再上传测试音频。"}</div>
              {speechKind === "stt-funasr" ? <div>建议优先使用 16k WAV/PCM 来复现 FunASR 问题。</div> : null}
            </div>

            {speechKind === "stt-openai-compatible" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <input className="field" value={speechBaseUrl} onChange={(event) => setSpeechBaseUrl(event.target.value)} placeholder="Base URL" />
                <input className="field" value={speechModel} onChange={(event) => setSpeechModel(event.target.value)} placeholder="Model" />
              </div>
            ) : (
              <input className="field" value={speechModel} onChange={(event) => setSpeechModel(event.target.value)} placeholder="FunASR Model" />
            )}

            {speechApiKeyMode === "runtime" ? (
              <input className="field" value={speechApiKeyEnv} onChange={(event) => setSpeechApiKeyEnv(event.target.value)} placeholder="API Key Env" />
            ) : (
              <input className="field" type="password" value={speechApiKey} onChange={(event) => setSpeechApiKey(event.target.value)} placeholder="API Key" />
            )}

            {speechKind === "stt-openai-compatible" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <input className="field" value={speechPrompt} onChange={(event) => setSpeechPrompt(event.target.value)} placeholder="Prompt (optional)" />
                <input className="field" value={speechLanguage} onChange={(event) => setSpeechLanguage(event.target.value)} placeholder="Language (optional)" />
              </div>
            ) : null}

            <input
              className="field cursor-pointer file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
              type="file"
              accept="audio/*,.wav,.pcm"
              onChange={(event) => setSpeechFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs leading-6 text-[var(--ink-soft)]">{speechFile ? `已选择: ${speechFile.name}` : "上传一段短音频来验证真实转写链路。"}</p>

            {speechError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{speechError}</div> : null}

            <button type="submit" className="btn-primary min-w-40 disabled:cursor-not-allowed disabled:opacity-60" disabled={speechLoading}>
              {speechLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Waypoints className="h-4 w-4" />}
              {speechLoading ? "验证中..." : "验证语音链路"}
            </button>
          </form>

          {speechResult?.kind === "stt-funasr" ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">FunASR 调试结果</div>
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                {speechResult.transcript || "(empty transcript)"}
              </div>
              <div className="mt-4 space-y-2">
                {speechResult.debugEvents.map((item, index) => (
                  <div key={`${item.at}-${index}`} className="rounded-2xl border border-black/8 bg-[rgba(255,255,255,0.65)] px-4 py-3">
                    <div className="text-[0.72rem] font-semibold text-[var(--ink-soft)]">{item.phase} · {item.at}</div>
                    <div className="mt-1 text-sm leading-6 text-[var(--ink)]">{item.detail}</div>
                  </div>
                ))}
              </div>
              <details className="mt-3 rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">查看结构化结果</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-soft)]">{json(speechResult)}</pre>
              </details>
            </div>
          ) : null}

          {speechResult?.kind === "stt-openai-compatible" ? (
            <div className="mt-5 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.82)] p-4">
              <div className="text-sm font-semibold text-[var(--ink)]">OpenAI-compatible STT 结果</div>
              <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">{speechResult.endpoint}</div>
              <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3 text-sm leading-7 text-[var(--ink)]">
                {speechResult.transcript || "(empty transcript)"}
              </div>
              <details className="mt-3 rounded-2xl bg-[rgba(20,33,43,0.04)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">查看原始响应预览</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-soft)]">{speechResult.rawResponsePreview}</pre>
              </details>
            </div>
          ) : null}

          {!speechResult && !speechError ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-black/10 bg-[rgba(255,255,255,0.62)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
              <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                <ShieldAlert className="h-4 w-4 text-[var(--accent-strong)]" />
                预留扩展位
              </div>
              <p className="mt-2">聊天模块已经不再写死 FunASR。当前可直接验证 FunASR 和 OpenAI-compatible STT，iFlytek 与自定义 webhook 适配位也已经预留。</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
