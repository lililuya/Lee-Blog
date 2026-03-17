import { NextResponse } from "next/server";
import { clearLoginTwoFactorChallenge } from "@/lib/auth-service";
import { TWO_FACTOR_CHALLENGE_COOKIE_NAME } from "@/lib/two-factor";

function readChallengeToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${TWO_FACTOR_CHALLENGE_COOKIE_NAME}=`))
    ?.slice(TWO_FACTOR_CHALLENGE_COOKIE_NAME.length + 1);
}

export async function POST(request: Request) {
  await clearLoginTwoFactorChallenge(readChallengeToken(request));

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(TWO_FACTOR_CHALLENGE_COOKIE_NAME);
  return response;
}
