import "server-only";

const FUNASR_WS_URL = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/";
const DEFAULT_FUNASR_MODEL = process.env.FUNASR_MODEL?.trim() || "paraformer-realtime-v2";

export type FunAsrDebugEvent = {
  at: string;
  phase: string;
  detail: string;
};

type FunAsrPayload = {
  audio: Uint8Array;
  mimeType: string;
  sampleRate?: number;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
};

type FunAsrMessage = {
  header?: {
    event?: string;
    error_code?: string;
    error_message?: string;
  };
  payload?: {
    output?: {
      sentence?: {
        text?: string;
      };
    };
  };
};

export type FunAsrTranscriptionResult = {
  transcript: string;
  model: string;
  debugEvents: FunAsrDebugEvent[];
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function getAudioFormat(mimeType: string) {
  if (mimeType.includes("wav")) {
    return "wav";
  }

  if (mimeType.includes("pcm")) {
    return "pcm";
  }

  return undefined;
}

async function readSocketMessage(data: Blob | ArrayBuffer | string) {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Blob) {
    return await data.text();
  }

  return new TextDecoder().decode(data);
}

function createDebugCollector() {
  const debugEvents: FunAsrDebugEvent[] = [];

  function pushDebug(phase: string, detail: string) {
    debugEvents.push({
      at: nowIso(),
      phase,
      detail,
    });
  }

  return { debugEvents, pushDebug };
}

async function sendAudioChunks(
  socket: WebSocket,
  audio: Uint8Array,
  onChunkSent?: (index: number, total: number, size: number) => void,
) {
  const chunkSize = 32 * 1024;
  const totalChunks = Math.max(1, Math.ceil(audio.length / chunkSize));
  let chunkIndex = 0;

  for (let offset = 0; offset < audio.length; offset += chunkSize) {
    const chunk = audio.slice(offset, offset + chunkSize);
    socket.send(chunk);
    chunkIndex += 1;
    onChunkSent?.(chunkIndex, totalChunks, chunk.length);
    await wait(12);
  }
}

export async function transcribeAudioWithFunAsrDetailed(
  input: FunAsrPayload,
): Promise<FunAsrTranscriptionResult> {
  const apiKey = input.apiKey?.trim() || process.env.DASHSCOPE_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is missing. Configure it before using FunASR.");
  }

  const model = input.model?.trim() || DEFAULT_FUNASR_MODEL;
  const taskId = crypto.randomUUID();
  const format = getAudioFormat(input.mimeType);
  const socket = new WebSocket(`${FUNASR_WS_URL}?token=${encodeURIComponent(apiKey)}`);
  const { debugEvents, pushDebug } = createDebugCollector();

  pushDebug("prepare", `Preparing FunASR task with model ${model}.`);
  pushDebug("connect", `Connecting to ${FUNASR_WS_URL}.`);

  return await new Promise<FunAsrTranscriptionResult>((resolve, reject) => {
    let settled = false;
    let latestTranscript = "";
    let hasStarted = false;
    const timeout = setTimeout(() => {
      pushDebug("timeout", "Timed out while waiting for FunASR to finish.");
      finish(new Error("FunASR transcription timed out. Please try a shorter recording."));
    }, input.timeoutMs ?? 45_000);

    function finish(error?: Error, transcript?: string) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }

      if (error) {
        reject(error);
        return;
      }

      resolve({
        transcript: (transcript ?? latestTranscript).trim(),
        model,
        debugEvents,
      });
    }

    socket.addEventListener("open", () => {
      pushDebug("open", "WebSocket connection established.");
      socket.send(
        JSON.stringify({
          header: {
            action: "run-task",
            task_id: taskId,
            streaming: "duplex",
          },
          payload: {
            task_group: "audio",
            task: "asr",
            function: "recognition",
            model,
            parameters: {
              ...(format ? { format } : {}),
              sample_rate: input.sampleRate ?? 16_000,
              punctuation_prediction_enabled: true,
              inverse_text_normalization_enabled: true,
            },
            input: {},
          },
        }),
      );
      pushDebug("request", "Sent run-task message to FunASR.");
    });

    socket.addEventListener("message", (event) => {
      void (async () => {
        try {
          const rawMessage = await readSocketMessage(event.data);
          const message = JSON.parse(rawMessage) as FunAsrMessage;
          const eventName = message.header?.event;

          pushDebug(
            "message",
            eventName
              ? `Received event ${eventName}.`
              : "Received a message without an explicit event name.",
          );

          if (message.header?.error_code) {
            pushDebug(
              "error",
              message.header.error_message ?? `FunASR returned error code ${message.header.error_code}.`,
            );
            finish(new Error(message.header.error_message ?? "FunASR returned an error."));
            return;
          }

          if (eventName === "task-started" && !hasStarted) {
            hasStarted = true;
            pushDebug("task-started", `Task started. Uploading ${input.audio.length} bytes of audio.`);
            await sendAudioChunks(socket, input.audio, (chunkIndex, totalChunks, size) => {
              pushDebug(
                "audio-chunk",
                `Sent chunk ${chunkIndex}/${totalChunks} (${size} bytes).`,
              );
            });
            socket.send(
              JSON.stringify({
                header: {
                  action: "finish-task",
                  task_id: taskId,
                  streaming: "duplex",
                },
                payload: {
                  input: {},
                },
              }),
            );
            pushDebug("request", "Sent finish-task message to FunASR.");
            return;
          }

          if (eventName === "result-generated") {
            const nextText = message.payload?.output?.sentence?.text?.trim();

            if (nextText) {
              latestTranscript = nextText;
              pushDebug("transcript", `Received transcript segment: ${nextText}`);
            } else {
              pushDebug("transcript", "Received result-generated event without text.");
            }

            return;
          }

          if (eventName === "task-finished") {
            pushDebug("task-finished", "FunASR reported task completion.");
            finish(undefined, latestTranscript);
            return;
          }

          if (eventName === "task-failed") {
            pushDebug("task-failed", message.header?.error_message ?? "Task failed.");
            finish(new Error(message.header?.error_message ?? "FunASR transcription failed."));
          }
        } catch (error) {
          pushDebug("parse-error", "Failed to parse the FunASR response payload.");
          finish(
            error instanceof Error
              ? error
              : new Error("Failed to parse the FunASR transcription response."),
          );
        }
      })();
    });

    socket.addEventListener("error", () => {
      pushDebug("socket-error", "WebSocket error event fired.");
      finish(new Error("Unable to connect to FunASR right now."));
    });

    socket.addEventListener("close", () => {
      pushDebug("close", "WebSocket connection closed.");

      if (!settled && !latestTranscript) {
        finish(new Error("FunASR closed the connection before returning a transcript."));
        return;
      }

      if (!settled) {
        finish(undefined, latestTranscript);
      }
    });
  });
}

export async function transcribeAudioWithFunAsr(input: FunAsrPayload) {
  const result = await transcribeAudioWithFunAsrDetailed(input);
  return result.transcript;
}
