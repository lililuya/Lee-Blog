import { UserRole } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateChatReply } from "@/lib/chat/orchestrator";
import { getSiteProfile } from "@/lib/queries";

export const runtime = "nodejs";

const attachmentSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.literal("image"),
  mimeType: z.string().startsWith("image/"),
  dataUrl: z.string().startsWith("data:image/").max(1_600_000),
  name: z.string().max(160).optional(),
  width: z.number().int().positive().max(4_096).optional(),
  height: z.number().int().positive().max(4_096).optional(),
});

const chatSchema = z.object({
  providerSlug: z.string().min(1),
  pathname: z.string().trim().optional(),
  messages: z.array(
    z
      .object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().max(12_000),
        attachments: z.array(attachmentSchema).max(2).optional(),
      })
      .refine(
        (message) => message.content.trim().length > 0 || (message.attachments?.length ?? 0) > 0,
        "Each chat message must include text or an image attachment.",
      ),
  ),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { ok: false, error: "请先登录后再使用站内助手。" },
        { status: 401 },
      );
    }

    const siteProfile = await getSiteProfile();
    const chatEnabledForReaders = Boolean(siteProfile.chatEnabledForReaders);

    if (currentUser.role !== UserRole.ADMIN && !chatEnabledForReaders) {
      return NextResponse.json(
        { ok: false, error: "当前站内对话尚未向普通用户开放。" },
        { status: 403 },
      );
    }

    const body = chatSchema.parse(await request.json());
    const reply = await generateChatReply({
      providerSlug: body.providerSlug,
      messages: body.messages,
      pathname: body.pathname?.startsWith("/") ? body.pathname : undefined,
      currentUser,
    });
    return NextResponse.json({ ok: true, ...reply });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Chat request failed." },
      { status: 400 },
    );
  }
}
