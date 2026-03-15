import { NextResponse } from "next/server";
import { isAuthFlowError } from "@/lib/auth-errors";
import { loginWithCredentials } from "@/lib/auth-service";
import {
  TWO_FACTOR_CHALLENGE_COOKIE_NAME,
  TWO_FACTOR_CHALLENGE_TTL_MS,
} from "@/lib/two-factor";

function getLoginRequestContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || cfIp?.trim() || null;

  return {
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginWithCredentials(body, getLoginRequestContext(request));

    if (result.requiresTwoFactor) {
      const response = NextResponse.json({
        ok: true,
        requiresTwoFactor: true,
        user: result.user,
      });

      response.cookies.set(TWO_FACTOR_CHALLENGE_COOKIE_NAME, result.challengeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(Date.now() + TWO_FACTOR_CHALLENGE_TTL_MS),
      });

      return response;
    }

    const response = NextResponse.json({ ok: true, requiresTwoFactor: false, user: result.user });
    response.cookies.delete(TWO_FACTOR_CHALLENGE_COOKIE_NAME);
    return response;
  } catch (error) {
    if (isAuthFlowError(error)) {
      const response = NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          ...error.details,
        },
        { status: error.status },
      );

      if (error.code !== "TWO_FACTOR_INVALID") {
        response.cookies.delete(TWO_FACTOR_CHALLENGE_COOKIE_NAME);
      }

      return response;
    }

    const response = NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Login failed." },
      { status: 400 },
    );
    response.cookies.delete(TWO_FACTOR_CHALLENGE_COOKIE_NAME);
    return response;
  }
}

