import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAvailableChatTranscriptionProviders,
  getDefaultChatTranscriptionProviderId,
  transcribeAudioWithConfiguredProvider,
} from "@/lib/chat/transcription";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function isFunAsrCompatibleMimeType(mimeType: string) {
  return (
    mimeType === "audio/wav" ||
    mimeType === "audio/x-wav" ||
    mimeType === "audio/wave" ||
    mimeType === "audio/pcm"
  );
}

function isGenericAudioMimeType(mimeType: string) {
  return mimeType.startsWith("audio/");
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { ok: false, error: "Please sign in before using voice transcription." },
        { status: 401 },
      );
    }

    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Voice transcription in chat is available to admin accounts only." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    const requestedProviderId = String(
      formData.get("providerId") || getDefaultChatTranscriptionProviderId() || "",
    ).trim();

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No audio file was uploaded." },
        { status: 400 },
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        { ok: false, error: "The recording is empty. Please try again." },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { ok: false, error: "The recording is too large. Please keep it under 8 MB." },
        { status: 400 },
      );
    }

    const availableProviders = getAvailableChatTranscriptionProviders();
    const selectedProvider = availableProviders.find((provider) => provider.id === requestedProviderId);

    if (!selectedProvider) {
      return NextResponse.json(
        {
          ok: false,
          error:
            availableProviders.length > 0
              ? `The transcription provider "${requestedProviderId}" is not available.`
              : "No speech-to-text provider is configured yet.",
        },
        { status: 400 },
      );
    }

    if (selectedProvider.id === "funasr" && !isFunAsrCompatibleMimeType(audio.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "FunASR currently accepts WAV or PCM recordings only.",
        },
        { status: 400 },
      );
    }

    if (selectedProvider.id !== "funasr" && !isGenericAudioMimeType(audio.type)) {
      return NextResponse.json(
        { ok: false, error: "Please upload a valid audio file." },
        { status: 400 },
      );
    }

    const result = await transcribeAudioWithConfiguredProvider({
      providerId: selectedProvider.id,
      audio: new Uint8Array(await audio.arrayBuffer()),
      filename: audio.name,
      mimeType: audio.type || "audio/wav",
      sampleRate: 16_000,
    });

    if (!result.transcript) {
      return NextResponse.json(
        { ok: false, error: "No clear speech was detected in this recording." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      transcript: result.transcript,
      providerId: result.providerId,
      providerName: result.providerName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Voice transcription failed.",
      },
      { status: 400 },
    );
  }
}
