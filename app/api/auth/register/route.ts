import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Public registration is closed. Guests can comment without creating an account.",
      code: "PUBLIC_REGISTRATION_DISABLED",
    },
    { status: 403 },
  );
}
