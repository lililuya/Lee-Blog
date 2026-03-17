import { NextResponse } from "next/server";
import { isAuthFlowError } from "@/lib/auth-errors";
import { registerWithCredentials } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerWithCredentials(body);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (isAuthFlowError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          ...error.details,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 },
    );
  }
}

