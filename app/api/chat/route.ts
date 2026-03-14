import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestChatCompletion } from "@/lib/llm";

const chatSchema = z.object({
  providerSlug: z.string().min(1),
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
    const content = await requestChatCompletion(body.providerSlug, body.messages);
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Chat request failed." },
      { status: 400 },
    );
  }
}