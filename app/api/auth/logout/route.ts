import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/auth-service";

export async function POST() {
  await logoutSession();
  return NextResponse.json({ ok: true });
}

