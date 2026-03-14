import { NextResponse } from "next/server";
import { registerWithCredentials } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await registerWithCredentials(body);
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 },
    );
  }
}

