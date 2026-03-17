import { NextResponse } from "next/server";
import { resendEmailVerification } from "@/lib/email-verification";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const result = await resendEmailVerification(String(body.email ?? ""));

    return NextResponse.json({
      ok: true,
      message:
        "If the account still needs verification, a fresh verification email has been prepared.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not resend the verification email.",
      },
      { status: 400 },
    );
  }
}
