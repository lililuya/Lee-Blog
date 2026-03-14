import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateChatReply } from "@/lib/chat/orchestrator";

const chatSchema = z.object({
  providerSlug: z.string().min(1),
  pathname: z.string().trim().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string().min(1),
    }),
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
