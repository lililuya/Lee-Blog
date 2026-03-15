import { NextResponse } from "next/server";
import { isAuthFlowError } from "@/lib/auth-errors";
import { resetPasswordWithCredentials } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await resetPasswordWithCredentials(body);

    return NextResponse.json({
      ok: true,
      message: "Password updated. You can now sign in with your new password.",
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
        error: error instanceof Error ? error.message : "Could not reset the password.",
      },
      { status: 400 },
    );
  }
}
