import { NextResponse } from "next/server";
import { loginWithCredentials } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await loginWithCredentials(body);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Login failed." },
      { status: 400 },
    );
  }
}

