import { UserRole } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateChatReply } from "@/lib/chat/orchestrator";

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
        { ok: false, error: "Please sign in before using the chat widget." },
        { status: 401 },
      );
    }

    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "The chat widget is available to admin accounts only." },
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
