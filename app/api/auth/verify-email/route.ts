import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { createSessionForUser } from "@/lib/auth";
import { isAuthFlowError } from "@/lib/auth-errors";
import { verifyEmailToken } from "@/lib/email-verification";

function redirectWithStatus(request: Request, status: string) {
  const url = new URL("/verify-email", request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  try {
    const result = await verifyEmailToken(token);

    if (result.status === UserStatus.ACTIVE) {
      await createSessionForUser(result.userId);
      return redirectWithStatus(request, result.alreadyVerified ? "already-verified" : "verified");
    }

    return redirectWithStatus(request, "verified-restricted");
  } catch (error) {
    if (isAuthFlowError(error)) {
      if (error.code === "EMAIL_VERIFICATION_EXPIRED") {
        return redirectWithStatus(request, "expired");
      }

      return redirectWithStatus(request, "invalid");
    }

    return redirectWithStatus(request, "invalid");
  }
}
