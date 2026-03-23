"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ImagePlus,
  LoaderCircle,
  Maximize2,
  MessageCircleMore,
  Mic,
  Minimize2,
  SendHorizontal,
  Sparkles,
  Square,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { ChatMarkdown } from "@/components/site/chat-markdown";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import type { ChatAttachment } from "@/lib/chat/message";
import { cn } from "@/lib/utils";

type ChatProvider = {
  id: string;
  name: string;
  slug: string;
  model: string;
  adapter: string;
};

type TranscriptionProvider = {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  supportsChat: boolean;
  implementationStatus: "ready" | "reserved";
};

type ChatWidgetProps = {
  providers: ChatProvider[];
  transcriptionProviders: TranscriptionProvider[];
  readerAccessEnabled: boolean;
  currentUser: {
    name: string;
    role?: string;
    avatarUrl?: string | null;
  } | null;
  assistantAvatarUrl?: string | null;
};

type WidgetMessage = {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  attachments?: ChatAttachment[];
  citations?: Array<{
    id: string;
    title: string;
    href: string;
    kindLabel: string;
    snippet: string;
    visibility: "public" | "private";
    isCurrentPage: boolean;
  }>;
};

type PromptTemplate = {
  label: string;
  prompt: string;
};

type AudioRecorderHandle = {
  stop: () => Promise<File>;
  cancel: () => Promise<void>;
};

const MAX_IMAGES_PER_MESSAGE = 2;
const MAX_IMAGE_DATA_URL_LENGTH = 1_600_000;
const MAX_IMAGE_DIMENSION = 1400;
const IMAGE_QUALITY = 0.78;
const DEFAULT_IMAGE_PROMPT = "请分析我上传的图片，并在合适时结合当前页面与站内内容给出说明。";

function getInitialAssistantMessage(
  currentUser: ChatWidgetProps["currentUser"],
  providers: ChatProvider[],
) {
  if (!currentUser) {
    return "登录后即可使用站内问答助手。登录后你可以切换模型，并直接通过文本、图片或语音转写向我提问。";
  }

  if (providers.length === 0) {
    return "当前还没有可用的聊天模型。管理员需要先启用模型提供商，并配置对应的 API Key。";
  }

  return "你可以直接提问，也可以先点下面的推荐模板开始。当前聊天会优先结合当前页面和站内知识来回答，同时支持图片输入和语音转写。";
}

function getPromptTemplates(pathname: string | null): PromptTemplate[] {
  if (/^\/digest\/[^/]+$/.test(pathname ?? "")) {
    return [
      {
        label: "总结当前周报",
        prompt: "只基于当前这篇周报，帮我整理 5 个关键点，并突出本周最重要的进展。",
      },
      {
        label: "提炼本周重点",
        prompt: "根据当前页面这份 weekly digest，提炼 3 个最关键主题，并分别说明它们为什么重要。",
      },
      {
        label: "拆成行动项",
        prompt:
          "请只围绕当前这份周报内容，整理成：1. 本周主要进展 2. 核心研究方向 3. 下周可继续推进的事项。",
      },
    ];
  }

  if (/^\/blog\/[^/]+$/.test(pathname ?? "")) {
    return [
      {
        label: "总结当前文章",
        prompt: "只基于当前这篇文章，帮我提炼 3 个核心观点和 2 个可执行建议。",
      },
      {
        label: "改写成摘要",
        prompt: "根据当前页面这篇文章，写一版适合分享给团队的简明摘要。",
      },
      {
        label: "展开成提纲",
        prompt: "请只围绕当前这篇文章内容，整理一版适合演讲或分享的结构化提纲。",
      },
    ];
  }

  if (/^\/notes\/[^/]+$/.test(pathname ?? "")) {
    return [
      {
        label: "总结当前笔记",
        prompt: "只基于当前这篇笔记，帮我总结关键结论，并指出最值得复用的部分。",
      },
      {
        label: "提炼检查清单",
        prompt: "根据当前页面这篇笔记，把内容提炼成一份可执行的检查清单。",
      },
      {
        label: "整理方法框架",
        prompt: "请只围绕当前这篇笔记，整理成一版更清晰的方法论框架。",
      },
    ];
  }

  if ((pathname ?? "").startsWith("/papers")) {
    return [
      {
        label: "总结论文主题",
        prompt: "结合站内论文内容，帮我总结最近重点关注的研究方向。",
      },
      {
        label: "识别研究趋势",
        prompt: "根据站内论文和周报内容，概括最近出现频率最高的研究趋势。",
      },
      {
        label: "生成阅读计划",
        prompt: "基于我站内保存的论文和批注，帮我制定一个下周的阅读计划。",
      },
    ];
  }

  return [
    {
      label: "总结 RAG 内容",
      prompt: "根据站内关于 RAG 的文章、笔记和周报，帮我总结一份高层次概览。",
    },
    {
      label: "比较内容模块",
      prompt: "比较我站内博客和笔记的内容风格，说明它们分别更适合承载什么类型的内容。",
    },
    {
      label: "寻找扩展选题",
      prompt: "基于站内已有内容，帮我找出 3 个最适合继续扩展成长文的选题。",
    },
  ];
}

function formatRecordingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function mergeFloat32Chunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function downsampleAudioBuffer(
  sourceBuffer: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number,
) {
  if (sourceSampleRate === targetSampleRate) {
    return sourceBuffer;
  }

  const sampleRateRatio = sourceSampleRate / targetSampleRate;
  const targetLength = Math.round(sourceBuffer.length / sampleRateRatio);
  const targetBuffer = new Float32Array(targetLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < targetBuffer.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accumulator = 0;
    let count = 0;

    for (let index = offsetBuffer; index < nextOffsetBuffer && index < sourceBuffer.length; index += 1) {
      accumulator += sourceBuffer[index];
      count += 1;
    }

    targetBuffer[offsetResult] = count > 0 ? accumulator / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return targetBuffer;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;

  for (const sample of samples) {
    const normalized = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, normalized < 0 ? normalized * 0x8000 : normalized * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

async function createAudioRecorder(): Promise<AudioRecorderHandle> {
  const mediaDevices = navigator.mediaDevices;

  if (!mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器不支持麦克风录音。");
  }

  const stream = await mediaDevices.getUserMedia({ audio: true });
  const AudioContextCtor =
    window.AudioContext ??
    ((window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
      null);

  if (!AudioContextCtor) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("当前浏览器不支持 Web Audio API。");
  }

  const audioContext = new AudioContextCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silentGain = audioContext.createGain();
  const chunks: Float32Array[] = [];
  let isCleanedUp = false;

  silentGain.gain.value = 0;

  processor.onaudioprocess = (event) => {
    const channelData = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channelData));
  };

  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  async function cleanup() {
    if (isCleanedUp) {
      return;
    }

    isCleanedUp = true;
    processor.disconnect();
    source.disconnect();
    silentGain.disconnect();
    processor.onaudioprocess = null;
    stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
  }

  return {
    async stop() {
      await cleanup();

      const merged = mergeFloat32Chunks(chunks);
      const downsampled = downsampleAudioBuffer(merged, audioContext.sampleRate, 16_000);
      const wavBuffer = encodeWav(downsampled, 16_000);
      return new File([wavBuffer], `chat-recording-${Date.now()}.wav`, {
        type: "audio/wav",
      });
    },
    async cancel() {
      await cleanup();
    },
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`读取图片 ${file.name} 失败。`));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片预览失败，请尝试另一张图片。"));
    image.src = url;
  });
}

async function createImageAttachment(file: File): Promise<ChatAttachment> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`文件 ${file.name} 不是图片。`);
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  let nextDataUrl = originalDataUrl;
  let nextMimeType = file.type;
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    if (scale < 1 || nextDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH * 0.75) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("当前浏览器无法处理图片压缩。");
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.drawImage(image, 0, 0, targetWidth, targetHeight);

      const preferredMimeType = file.type === "image/png" ? "image/png" : file.type;
      nextDataUrl = canvas.toDataURL(
        preferredMimeType,
        preferredMimeType === "image/png" ? undefined : IMAGE_QUALITY,
      );
      nextMimeType = preferredMimeType;
      width = targetWidth;
      height = targetHeight;

      if (nextDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH && preferredMimeType !== "image/jpeg") {
        nextDataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        nextMimeType = "image/jpeg";
      }
    }
  }

  if (nextDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error(`图片 ${file.name} 过大，请换一张更小的图片。`);
  }

  return {
    id: crypto.randomUUID(),
    kind: "image",
    mimeType: nextMimeType,
    dataUrl: nextDataUrl,
    name: file.name,
    width,
    height,
  };
}

export function ChatWidget({
  providers,
  transcriptionProviders,
  readerAccessEnabled,
  currentUser,
  assistantAvatarUrl,
}: ChatWidgetProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recorderRef = useRef<AudioRecorderHandle | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.slug ?? "");
  const [selectedTranscriptionProvider, setSelectedTranscriptionProvider] = useState(
    transcriptionProviders[0]?.id ?? "",
  );
  const [messages, setMessages] = useState<WidgetMessage[]>([
    {
      role: "assistant",
      content: getInitialAssistantMessage(currentUser, providers),
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isReplyPending, setIsReplyPending] = useState(false);
  const isAdminUser = currentUser?.role === "ADMIN";
  const hasUserAccess = isAdminUser || (Boolean(currentUser) && readerAccessEnabled);

  const canChat = hasUserAccess && providers.length > 0 && Boolean(selectedProvider);
  const canTranscribe =
    hasUserAccess && transcriptionProviders.length > 0 && Boolean(selectedTranscriptionProvider);
  const loginHref = pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login";
  const selectedLabel = useMemo(
    () => providers.find((provider) => provider.slug === selectedProvider)?.name ?? "未选择模型",
    [providers, selectedProvider],
  );
  const promptTemplates = useMemo(() => getPromptTemplates(pathname), [pathname]);
  const selectedTranscriptionLabel = useMemo(
    () =>
      transcriptionProviders.find((provider) => provider.id === selectedTranscriptionProvider)?.name ??
      "暂无语音服务",
    [selectedTranscriptionProvider, transcriptionProviders],
  );
  const currentUserAvatarUrl = currentUser?.avatarUrl ?? null;
  const widgetShellStyle = isFullscreen
    ? {
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
      }
    : {
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
      };
  const assistantDisplayName = "站内助手";

  useEffect(() => {
    if (!providers.length) {
      setSelectedProvider("");
      return;
    }

    if (!providers.some((provider) => provider.slug === selectedProvider)) {
      setSelectedProvider(providers[0]?.slug ?? "");
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    if (!transcriptionProviders.length) {
      setSelectedTranscriptionProvider("");
      return;
    }

    if (!transcriptionProviders.some((provider) => provider.id === selectedTranscriptionProvider)) {
      setSelectedTranscriptionProvider(transcriptionProviders[0]?.id ?? "");
    }
  }, [selectedTranscriptionProvider, transcriptionProviders]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isOpen, isReplyPending, messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, isOpen]);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();

      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }

      if (recorderRef.current) {
        void recorderRef.current.cancel();
      }
    };
  }, []);

  function handleTemplateSelect(template: PromptTemplate) {
    setInput(template.prompt);
    inputRef.current?.focus();
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function handleVoiceToggle() {
    if (!currentUser || !canTranscribe || isReplyPending || isTranscribing) {
      return;
    }

    setError("");

    if (!isRecording) {
      try {
        recorderRef.current = await createAudioRecorder();
        setRecordingSeconds(0);
        setIsRecording(true);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds((current) => current + 1);
        }, 1000);
      } catch (recordError) {
        setError(recordError instanceof Error ? recordError.message : "无法启动语音录制。");
      }

      return;
    }

    try {
      stopRecordingTimer();
      setIsRecording(false);
      setIsTranscribing(true);
      const recording = await recorderRef.current?.stop();
      recorderRef.current = null;

      if (!recording) {
        throw new Error("录音文件生成失败。");
      }

      const formData = new FormData();
      formData.append("audio", recording);
      formData.append("providerId", selectedTranscriptionProvider);

      const response = await fetch("/api/chat/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "语音转写失败。");
      }

      setInput((current) => (current.trim() ? `${current.trim()}\n${data.transcript}` : data.transcript));
      inputRef.current?.focus();
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "语音转写失败。");
    } finally {
      setIsTranscribing(false);
      setRecordingSeconds(0);
    }
  }

  async function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    if (pendingAttachments.length >= MAX_IMAGES_PER_MESSAGE) {
      setError(`单次最多上传 ${MAX_IMAGES_PER_MESSAGE} 张图片。`);
      return;
    }

    setError("");

    try {
      const remainingSlots = MAX_IMAGES_PER_MESSAGE - pendingAttachments.length;
      const nextAttachments = await Promise.all(
        files.slice(0, remainingSlots).map((file) => createImageAttachment(file)),
      );
      setPendingAttachments((current) => [...current, ...nextAttachments]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片处理失败。");
    }
  }

  function handleRemoveAttachment(attachmentId: string) {
    setPendingAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }

  function resetConversation() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    stopRecordingTimer();

    if (recorderRef.current) {
      void recorderRef.current.cancel();
      recorderRef.current = null;
    }

    setMessages([
      {
        role: "assistant",
        content: getInitialAssistantMessage(currentUser, providers),
      },
    ]);
    setInput("");
    setPendingAttachments([]);
    setError("");
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
    setIsReplyPending(false);
  }

  function handleCloseWidget() {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    stopRecordingTimer();

    if (recorderRef.current) {
      void recorderRef.current.cancel();
      recorderRef.current = null;
    }

    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
    setIsOpen(false);
    setIsFullscreen(false);
  }

  async function sendMessage(
    nextMessages: WidgetMessage[],
    draftInput: string,
    draftAttachments: ChatAttachment[],
  ) {
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          providerSlug: selectedProvider,
          pathname,
          messages: nextMessages
            .filter((message) => !message.isTyping)
            .map((message) => ({
              role: message.role,
              content: message.content,
              attachments: message.attachments ?? [],
            })),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "聊天请求失败。");
      }

      setMessages((current) => [
        ...current.slice(0, -1),
        {
          role: "assistant",
          content: data.content,
          citations: Array.isArray(data.citations) ? data.citations : [],
        },
      ]);
    } catch (requestError) {
      const isAbortError =
        requestError instanceof DOMException && requestError.name === "AbortError";

      if (!isAbortError) {
        setMessages((current) => current.slice(0, -2));
        setInput(draftInput);
        setPendingAttachments(draftAttachments);
        setError(requestError instanceof Error ? requestError.message : "聊天请求失败。");
      }
    }

    if (requestControllerRef.current === controller) {
      requestControllerRef.current = null;
    }

    setIsReplyPending(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProvider || !currentUser || isReplyPending) {
      return;
    }

    const draftInput = input.trim();
    const draftAttachments = pendingAttachments;
    const content = draftInput || (draftAttachments.length > 0 ? DEFAULT_IMAGE_PROMPT : "");

    if (!content && draftAttachments.length === 0) {
      return;
    }

    const nextUserMessage: WidgetMessage = {
      role: "user",
      content,
      attachments: draftAttachments,
    };
    const nextTypingMessage: WidgetMessage = {
      role: "assistant",
      content: "",
      isTyping: true,
    };
    const nextMessages = [...messages, nextUserMessage, nextTypingMessage];

    setMessages(nextMessages);
    setInput("");
    setPendingAttachments([]);
    setError("");
    setIsReplyPending(true);
    void sendMessage(nextMessages, draftInput, draftAttachments);
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!canChat || isReplyPending || isTranscribing) {
      return;
    }

    event.currentTarget.form?.requestSubmit();
  }

  if (!isAdminUser && !readerAccessEnabled) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[70] transition-[bottom] duration-300",
        isFullscreen
          ? "inset-0"
          : isOpen
            ? "inset-x-0 bottom-0 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-4 md:right-6"
            : "right-0 bottom-0 flex flex-col items-end gap-3 sm:right-4 md:right-6",
      )}
      style={widgetShellStyle}
    >
      {isOpen ? (
        <>
          {isFullscreen ? (
            <div className="pointer-events-auto absolute inset-0 bg-[rgba(20,33,43,0.24)] backdrop-blur-[6px]" />
          ) : null}

          <div
            className={cn(
              "pointer-events-auto theme-chat-shell relative flex flex-col overflow-hidden border backdrop-blur-2xl",
              isFullscreen
                ? "h-full w-full rounded-[1.4rem] shadow-[0_28px_80px_rgba(20,33,43,0.2)] sm:rounded-[2rem]"
                : "h-[min(88vh,48rem)] w-full rounded-[1.45rem] shadow-[0_32px_70px_rgba(20,33,43,0.14)] sm:w-[min(92vw,30rem)] sm:rounded-[1.8rem]",
            )}
          >
            <div className="theme-chat-header border-b px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                    <Sparkles className="h-4 w-4" />
                    站内问答助手
                  </div>
                  <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                    当前模型：{selectedLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="theme-icon-button rounded-full p-2 text-[var(--ink-soft)]"
                    onClick={() => setIsFullscreen((current) => !current)}
                    aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="theme-icon-button rounded-full p-2 text-[var(--ink-soft)]"
                    onClick={handleCloseWidget}
                    aria-label="关闭聊天窗口"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>

            <div className="space-y-3 border-b border-black/6 px-4 py-4 sm:px-5">
              {currentUser ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                    模型
                  </span>
                  <select
                    className="field field--compact"
                    value={selectedProvider}
                    onChange={(event) => setSelectedProvider(event.target.value)}
                    disabled={providers.length === 0}
                  >
                    {providers.length > 0 ? (
                      providers.map((provider) => (
                        <option key={provider.id} value={provider.slug}>
                          {provider.name} | {provider.model}
                        </option>
                      ))
                    ) : (
                      <option>暂无可用模型</option>
                    )}
                  </select>
                </label>
              ) : null}

              {currentUser ? (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                    语音转写
                  </span> 
                  <select
                    className="field field--compact"
                    value={selectedTranscriptionProvider}
                    onChange={(event) => setSelectedTranscriptionProvider(event.target.value)}
                    disabled={transcriptionProviders.length === 0}
                  >
                    {transcriptionProviders.length > 0 ? (
                      transcriptionProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))
                    ) : (
                      <option>暂无可用语音转写服务</option>
                    )}
                  </select>
                </label>
              ) : null}

              {!currentUser ? (
                <div className="rounded-2xl bg-[rgba(168,123,53,0.1)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                  登录后即可使用站内问答助手。
                  <Link href={loginHref} className="ml-1 font-semibold text-[var(--accent-strong)]">
                    立即登录
                  </Link>
                </div>
              ) : null}

              {currentUser && providers.length === 0 ? (
                <div className="rounded-2xl bg-[rgba(20,33,43,0.05)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                  当前还没有可用模型。请先在后台启用模型提供商，并确认对应的 API Key 已配置。
                  {currentUser.role === "ADMIN" ? (
                    <Link
                      href="/admin/providers"
                      className="ml-1 font-semibold text-[var(--accent-strong)]"
                    >
                      打开模型配置
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {currentUser && transcriptionProviders.length === 0 ? (
                <div className="rounded-2xl bg-[rgba(20,33,43,0.05)] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                  当前还没有可用的语音转写服务。请先配置 FunASR 或其他可用的 STT Provider。
                  {currentUser.role === "ADMIN" ? (
                    <Link href="/tools" className="ml-1 font-semibold text-[var(--accent-strong)]">
                      打开 API 验证工具
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                  <WandSparkles className="h-3.5 w-3.5" />
                  推荐提问模板
                </div>
                <p className="text-xs leading-6 text-[var(--ink-soft)]">
                  先点一个模板，再补充你最关心的维度，比如“只看风险”“输出行动项”“给我一版摘要”。
                </p>
                <div className="flex flex-wrap gap-2">
                  {promptTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      className="rounded-full border border-black/8 bg-white/70 px-2.5 py-1.5 text-[0.7rem] leading-5 text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleTemplateSelect(template)}
                      disabled={isReplyPending}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,249,0.9),rgba(243,247,245,0.95))] px-3 py-3 sm:px-4 md:px-5"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "flex items-start gap-2.5 sm:items-end sm:gap-3",
                    message.role === "assistant" ? "justify-start" : "justify-end",
                  )}
                >
                  {message.role === "assistant" ? (
                    <AvatarBadge
                      name={assistantDisplayName}
                      src={assistantAvatarUrl}
                      fallbackLabel="AI"
                      className="h-8 w-8 bg-white/75 text-[0.7rem] sm:h-10 sm:w-10 sm:text-xs"
                    />
                  ) : null}

                  <div
                    className={cn(
                      "max-w-[calc(100%-2.75rem)] rounded-[1.2rem] px-3.5 py-3 text-sm leading-6 shadow-[0_8px_18px_rgba(20,33,43,0.05)] sm:max-w-[88%] sm:rounded-[1.35rem] sm:px-4 sm:leading-7",
                      message.role === "assistant"
                        ? "theme-chat-bubble-assistant"
                        : "theme-chat-bubble-user",
                    )}
                  >
                    {message.attachments?.length ? (
                      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {message.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="overflow-hidden rounded-2xl border border-black/8 bg-white/60"
                          >
                            <NextImage
                              src={attachment.dataUrl}
                              alt={attachment.name ?? "已上传图片"}
                              width={attachment.width ?? 800}
                              height={attachment.height ?? 600}
                              unoptimized
                              className="h-28 w-full object-cover"
                            />
                            <div className="px-3 py-2 text-[0.72rem] leading-5 text-[var(--ink-soft)]">
                              {attachment.name ?? "图片"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {message.isTyping ? (
                      <div className="inline-flex items-center gap-3 text-[var(--ink-soft)]">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-current opacity-50" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-current opacity-70 [animation-delay:120ms]" />
                          <span className="h-2 w-2 animate-pulse rounded-full bg-current opacity-90 [animation-delay:240ms]" />
                        </div>
                        <span>正在思考...</span>
                      </div>
                    ) : message.role === "assistant" ? (
                      <ChatMarkdown content={message.content} />
                    ) : (
                      <div className="whitespace-pre-wrap text-[var(--ink)]">{message.content}</div>
                    )}

                    {message.role === "assistant" &&
                    !message.isTyping &&
                    message.citations &&
                    message.citations.length > 0 ? (
                      <div className="mt-4 space-y-2 border-t border-black/8 pt-3">
                        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                          引用来源
                        </div>
                        <div className="space-y-2">
                          {message.citations.map((citation) => (
                            <Link
                              key={citation.id}
                              href={citation.href}
                              className="block rounded-[1rem] border border-black/8 bg-[rgba(255,255,255,0.55)] px-3 py-2 transition hover:border-[var(--accent)]"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-[var(--ink-soft)]">
                                <span className="font-semibold text-[var(--accent-strong)]">
                                  {citation.kindLabel}
                                </span>
                                {citation.isCurrentPage ? <span>当前页面</span> : null}
                                {citation.visibility === "private" ? <span>私有资料</span> : null}
                              </div>
                              <div className="mt-1 text-sm font-semibold leading-6 text-[var(--ink)]">
                                {citation.title}
                              </div>
                              <div className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--ink-soft)]">
                                {citation.snippet}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {message.role === "user" ? (
                    <AvatarBadge
                      name={currentUser?.name}
                      src={currentUserAvatarUrl}
                      fallbackLabel={currentUser?.name ?? "ME"}
                      className="h-8 w-8 bg-white/75 text-[0.7rem] sm:h-10 sm:w-10 sm:text-xs"
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 border-t border-black/6 px-4 py-4 sm:px-5">
              {error ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>
              ) : null}

              {pendingAttachments.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                    待发送图片
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="relative overflow-hidden rounded-2xl border border-black/8 bg-white/75"
                      >
                        <NextImage
                          src={attachment.dataUrl}
                          alt={attachment.name ?? "待发送图片"}
                          width={attachment.width ?? 800}
                          height={attachment.height ?? 600}
                          unoptimized
                          className="h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[0.7rem] font-semibold text-white"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                        >
                          移除
                        </button>
                        <div className="px-3 py-2 text-[0.72rem] leading-5 text-[var(--ink-soft)]">
                          {attachment.name ?? "图片"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs leading-6 text-[var(--ink-soft)]">
                    图片会一并发送给当前模型，请确保所选模型支持视觉理解。
                  </p>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={handleImageSelection}
              />

              <div className="rounded-[1.45rem] border border-black/8 bg-[rgba(255,255,255,0.78)] px-3 py-3 shadow-[0_14px_32px_rgba(20,33,43,0.05)] sm:rounded-[1.6rem]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  rows={4}
                  className="min-h-[6.25rem] w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[7.5rem] sm:leading-7"
                  placeholder={
                    !currentUser
                      ? "登录后即可开始聊天。"
                      : providers.length === 0
                        ? "当前没有可用模型。"
                        : "可以直接输入问题，也可以上传图片或点麦克风录音后自动转写..."
                  }
                  disabled={!canChat || isReplyPending || isTranscribing}
                />

                <div className="mt-3 flex flex-wrap items-stretch justify-end gap-2 sm:items-center">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      !canChat ||
                      isRecording ||
                      isReplyPending ||
                      isTranscribing ||
                      pendingAttachments.length >= MAX_IMAGES_PER_MESSAGE
                    }
                    aria-label="上传图片"
                    title="上传图片"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-full border border-black/8 bg-white/80 px-3 text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60",
                      !isRecording && !isTranscribing && "w-10 px-0",
                      isRecording ? "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-400 hover:text-rose-700" : null,
                    )}
                    onClick={() => {
                      void handleVoiceToggle();
                    }}
                    disabled={!canTranscribe || isReplyPending || isTranscribing}
                    aria-label={`语音输入（${selectedTranscriptionLabel}）`}
                    title={`语音输入（${selectedTranscriptionLabel}）`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4" />
                        <span className="text-xs font-semibold">{formatRecordingTime(recordingSeconds)}</span>
                      </>
                    ) : isTranscribing ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-semibold">转写中</span>
                      </>
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    onClick={resetConversation}
                    disabled={messages.length <= 1 || isRecording || isReplyPending || isTranscribing}
                  >
                    <Trash2 className="h-4 w-4" />
                    清除历史
                  </button>

                  <button
                    type="submit"
                    className="btn-primary h-10 w-full justify-center px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-28 sm:w-auto"
                    disabled={
                      !canChat ||
                      isRecording ||
                      isReplyPending ||
                      isTranscribing ||
                      (!input.trim() && pendingAttachments.length === 0)
                    }
                  >
                    <SendHorizontal className="h-4 w-4" />
                    发送消息
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,_rgba(27,107,99,1),_rgba(16,69,63,1))] text-white shadow-[0_24px_55px_rgba(16,69,63,0.28)] transition hover:-translate-y-1 sm:h-16 sm:w-16"
          onClick={() => setIsOpen(true)}
          aria-label="打开站内问答助手"
        >
          <MessageCircleMore className="h-6 w-6 sm:h-7 sm:w-7" />
        </button>
      ) : null}
    </div>
  );
}
