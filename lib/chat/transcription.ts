import "server-only";

import { transcribeAudioWithFunAsr, transcribeAudioWithFunAsrDetailed } from "@/lib/chat/funasr";

export type TranscriptionProviderId =
  | "funasr"
  | "openai-compatible"
  | "xfyun"
  | "custom";

export type TranscriptionProviderSummary = {
  id: TranscriptionProviderId;
  name: string;
  description: string;
  configured: boolean;
  supportsChat: boolean;
  implementationStatus: "ready" | "reserved";
  apiKeyEnv?: string;
  baseUrl?: string | null;
  model?: string | null;
};

type OpenAiCompatibleTranscriptionInput = {
  audio: Uint8Array;
  filename?: string;
  mimeType: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt?: string;
  language?: string;
};

export type OpenAiCompatibleTranscriptionResult = {
  transcript: string;
  endpoint: string;
  model: string;
  responsePreview: string;
};

type ConfiguredTranscriptionInput = {
  providerId?: string;
  audio: Uint8Array;
  filename?: string;
  mimeType: string;
  sampleRate?: number;
};

function truncatePreview(value: string, maxLength = 1_200) {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function buildCatalog(): TranscriptionProviderSummary[] {
  const funAsrConfigured = Boolean(process.env.DASHSCOPE_API_KEY?.trim());
  const openAiConfigured = Boolean(
    process.env.TRANSCRIPTION_OPENAI_BASE_URL?.trim() &&
      process.env.TRANSCRIPTION_OPENAI_MODEL?.trim() &&
      process.env.TRANSCRIPTION_OPENAI_API_KEY?.trim(),
  );

  return [
    {
      id: "funasr",
      name: "FunASR",
      description: "DashScope websocket ASR. Best for debugging the current FunASR chain.",
      configured: funAsrConfigured,
      supportsChat: true,
      implementationStatus: "ready",
      apiKeyEnv: "DASHSCOPE_API_KEY",
      model: process.env.FUNASR_MODEL?.trim() || "paraformer-realtime-v2",
    },
    {
      id: "openai-compatible",
      name: "OpenAI-compatible STT",
      description: "Uses the /audio/transcriptions contract for OpenAI-compatible speech APIs.",
      configured: openAiConfigured,
      supportsChat: true,
      implementationStatus: "ready",
      apiKeyEnv: "TRANSCRIPTION_OPENAI_API_KEY",
      baseUrl: process.env.TRANSCRIPTION_OPENAI_BASE_URL?.trim() || null,
      model: process.env.TRANSCRIPTION_OPENAI_MODEL?.trim() || null,
    },
    {
      id: "xfyun",
      name: "iFlytek",
      description: "Reserved adapter slot for future iFlytek speech-to-text integration.",
      configured: false,
      supportsChat: false,
      implementationStatus: "reserved",
      apiKeyEnv: "XFYUN_API_KEY",
    },
    {
      id: "custom",
      name: "Custom webhook",
      description: "Reserved adapter slot for future custom speech transcription services.",
      configured: false,
      supportsChat: false,
      implementationStatus: "reserved",
    },
  ];
}

export function getTranscriptionProviderCatalog() {
  return buildCatalog();
}

export function getAvailableChatTranscriptionProviders() {
  return buildCatalog().filter(
    (provider) =>
      provider.implementationStatus === "ready" &&
      provider.supportsChat &&
      provider.configured,
  );
}

export function getDefaultChatTranscriptionProviderId() {
  const requestedDefault = process.env.CHAT_TRANSCRIPTION_PROVIDER?.trim();
  const availableProviders = getAvailableChatTranscriptionProviders();

  if (requestedDefault && availableProviders.some((provider) => provider.id === requestedDefault)) {
    return requestedDefault as TranscriptionProviderId;
  }

  return availableProviders[0]?.id ?? null;
}

export async function transcribeAudioWithOpenAiCompatibleDetailed(
  input: OpenAiCompatibleTranscriptionInput,
): Promise<OpenAiCompatibleTranscriptionResult> {
  const endpoint = `${input.baseUrl.replace(/\/$/, "")}/audio/transcriptions`;
  const formData = new FormData();
  const fileBytes = Uint8Array.from(input.audio);

  formData.append(
    "file",
    new File([fileBytes], input.filename?.trim() || `transcription-${Date.now()}.wav`, {
      type: input.mimeType,
    }),
  );
  formData.append("model", input.model);

  if (input.prompt?.trim()) {
    formData.append("prompt", input.prompt.trim());
  }

  if (input.language?.trim()) {
    formData.append("language", input.language.trim());
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: formData,
  });
  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `OpenAI-compatible transcription failed (${response.status}): ${truncatePreview(rawBody)}`,
    );
  }

  let transcript = "";

  try {
    const data = JSON.parse(rawBody) as { text?: string };
    transcript = data.text?.trim() ?? "";
  } catch {
    transcript = rawBody.trim();
  }

  return {
    transcript,
    endpoint,
    model: input.model,
    responsePreview: truncatePreview(rawBody),
  };
}

export async function transcribeAudioWithOpenAiCompatible(
  input: OpenAiCompatibleTranscriptionInput,
) {
  const result = await transcribeAudioWithOpenAiCompatibleDetailed(input);
  return result.transcript;
}

export async function transcribeAudioWithConfiguredProvider(
  input: ConfiguredTranscriptionInput,
) {
  const availableProviders = getAvailableChatTranscriptionProviders();
  const defaultProviderId = getDefaultChatTranscriptionProviderId();
  const resolvedProviderId = (input.providerId?.trim() || defaultProviderId) as
    | TranscriptionProviderId
    | null;

  if (!resolvedProviderId) {
    throw new Error(
      "No speech-to-text provider is configured. Set FunASR or OpenAI-compatible transcription env vars first.",
    );
  }

  const provider = availableProviders.find((entry) => entry.id === resolvedProviderId);

  if (!provider) {
    throw new Error(`The requested transcription provider "${resolvedProviderId}" is not available.`);
  }

  if (provider.id === "funasr") {
    const transcript = await transcribeAudioWithFunAsr({
      audio: input.audio,
      mimeType: input.mimeType,
      sampleRate: input.sampleRate ?? 16_000,
    });

    return {
      providerId: provider.id,
      providerName: provider.name,
      transcript,
    };
  }

  if (provider.id === "openai-compatible") {
    const baseUrl = process.env.TRANSCRIPTION_OPENAI_BASE_URL?.trim();
    const model = process.env.TRANSCRIPTION_OPENAI_MODEL?.trim();
    const apiKey = process.env.TRANSCRIPTION_OPENAI_API_KEY?.trim();

    if (!baseUrl || !model || !apiKey) {
      throw new Error(
        "OpenAI-compatible transcription is not fully configured. Set TRANSCRIPTION_OPENAI_BASE_URL, TRANSCRIPTION_OPENAI_MODEL, and TRANSCRIPTION_OPENAI_API_KEY.",
      );
    }

    const transcript = await transcribeAudioWithOpenAiCompatible({
      audio: input.audio,
      filename: input.filename,
      mimeType: input.mimeType,
      apiKey,
      baseUrl,
      model,
    });

    return {
      providerId: provider.id,
      providerName: provider.name,
      transcript,
    };
  }

  throw new Error(`Transcription provider "${provider.id}" is reserved but not implemented yet.`);
}

export async function debugFunAsrTranscription(input: {
  audio: Uint8Array;
  mimeType: string;
  sampleRate?: number;
  apiKey?: string;
  model?: string;
}) {
  return transcribeAudioWithFunAsrDetailed(input);
}
