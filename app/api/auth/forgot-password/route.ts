import { NextResponse } from "next/server";
import { isAuthFlowError } from "@/lib/auth-errors";
import { requestPasswordResetWithCredentials } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestPasswordResetWithCredentials(body);

    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a password reset link has been prepared.",
      ...result,
    });
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
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not start the password reset flow.",
      },
      { status: 400 },
    );
  }
}
