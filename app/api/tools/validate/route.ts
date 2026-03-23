import { ProviderAdapter, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  validateChatApiRequest,
  validateObjectStorageRequest,
  validateSpeechApiRequest,
} from "@/lib/tools/api-validation";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

const llmSchema = z.object({
  kind: z.enum(["llm-openai-compatible", "llm-anthropic"]),
  baseUrl: z.string().url(),
  model: z.string().trim().min(1).max(160),
  prompt: z.string().trim().min(1).max(8_000),
  systemPrompt: z.string().trim().max(8_000).optional(),
  apiKey: z.string().trim().min(1),
});

const funAsrSchema = z.object({
  kind: z.literal("stt-funasr"),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().max(160).optional(),
});

const openAiSpeechSchema = z.object({
  kind: z.literal("stt-openai-compatible"),
  baseUrl: z.string().url(),
  model: z.string().trim().min(1).max(160),
  apiKey: z.string().trim().min(1),
  prompt: z.string().trim().max(1_000).optional(),
  language: z.string().trim().max(24).optional(),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readApiKey(formData: FormData, fallbackEnvName?: string) {
  const apiKeyMode = getString(formData, "apiKeyMode");

  if (apiKeyMode === "runtime") {
    const explicitEnvName = getString(formData, "apiKeyEnv");
    const envName = explicitEnvName || fallbackEnvName;
    const runtimeApiKey = envName ? process.env[envName]?.trim() : "";

    if (!envName || !runtimeApiKey) {
      throw new Error(
        envName
          ? `Environment variable ${envName} is missing or empty.`
          : "No runtime API key environment variable was provided.",
      );
    }

    return runtimeApiKey;
  }

  const manualApiKey = getString(formData, "apiKey");

  if (!manualApiKey) {
    throw new Error("Please provide an API key or choose a runtime environment key.");
  }

  return manualApiKey;
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Only admins can use the API validation tool." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const kind = getString(formData, "kind");

    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Validation kind is required." },
        { status: 400 },
      );
    }

    if (kind === "object-storage") {
      const result = await validateObjectStorageRequest();
      return NextResponse.json({ ok: true, result });
    }

    if (kind === "llm-openai-compatible" || kind === "llm-anthropic") {
      const parsed = llmSchema.parse({
        kind,
        baseUrl: getString(formData, "baseUrl"),
        model: getString(formData, "model"),
        prompt: getString(formData, "prompt"),
        systemPrompt: getString(formData, "systemPrompt") || undefined,
        apiKey: readApiKey(formData, getString(formData, "apiKeyEnv") || undefined),
      });

      const result = await validateChatApiRequest({
        adapter:
          parsed.kind === "llm-anthropic"
            ? ProviderAdapter.ANTHROPIC
            : ProviderAdapter.OPENAI_COMPATIBLE,
        baseUrl: parsed.baseUrl,
        model: parsed.model,
        prompt: parsed.prompt,
        systemPrompt: parsed.systemPrompt,
        apiKey: parsed.apiKey,
      });

      return NextResponse.json({ ok: true, result });
    }

    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Please upload an audio file for speech validation." },
        { status: 400 },
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        { ok: false, error: "The uploaded audio file is empty." },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Please keep validation audio under 8 MB." },
        { status: 400 },
      );
    }

    if (kind === "stt-funasr") {
      const parsed = funAsrSchema.parse({
        kind,
        model: getString(formData, "model") || undefined,
        apiKey: readApiKey(formData, "DASHSCOPE_API_KEY"),
      });

      const result = await validateSpeechApiRequest({
        providerId: "funasr",
        audio: new Uint8Array(await audio.arrayBuffer()),
        filename: audio.name,
        mimeType: audio.type || "audio/wav",
        apiKey: parsed.apiKey,
        model: parsed.model,
      });

      return NextResponse.json({ ok: true, result });
    }

    if (kind === "stt-openai-compatible") {
      const parsed = openAiSpeechSchema.parse({
        kind,
        baseUrl: getString(formData, "baseUrl"),
        model: getString(formData, "model"),
        prompt: getString(formData, "prompt") || undefined,
        language: getString(formData, "language") || undefined,
        apiKey: readApiKey(formData, getString(formData, "apiKeyEnv") || undefined),
      });

      const result = await validateSpeechApiRequest({
        providerId: "openai-compatible",
        audio: new Uint8Array(await audio.arrayBuffer()),
        filename: audio.name,
        mimeType: audio.type || "audio/wav",
        apiKey: parsed.apiKey,
        baseUrl: parsed.baseUrl,
        model: parsed.model,
        prompt: parsed.prompt,
        language: parsed.language,
      });

      return NextResponse.json({ ok: true, result });
    }

    return NextResponse.json(
      { ok: false, error: `Unsupported validation kind "${kind}".` },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Validation failed.",
      },
      { status: 400 },
    );
  }
}
