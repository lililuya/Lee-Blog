import "server-only";

type HumanCheckProvider = "turnstile" | "hcaptcha";

type HumanCheckConfig = {
  provider: HumanCheckProvider;
  siteKey: string;
  secretKey: string;
};

function getConfiguredProvider(): HumanCheckConfig | null {
  const explicitProvider = process.env.COMMENT_HUMAN_CHECK_PROVIDER?.trim().toLowerCase();

  if (explicitProvider === "turnstile") {
    const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
    const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
    return siteKey && secretKey ? { provider: "turnstile", siteKey, secretKey } : null;
  }

  if (explicitProvider === "hcaptcha") {
    const siteKey = process.env.HCAPTCHA_SITE_KEY?.trim();
    const secretKey = process.env.HCAPTCHA_SECRET_KEY?.trim();
    return siteKey && secretKey ? { provider: "hcaptcha", siteKey, secretKey } : null;
  }

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (turnstileSiteKey && turnstileSecretKey) {
    return {
      provider: "turnstile",
      siteKey: turnstileSiteKey,
      secretKey: turnstileSecretKey,
    };
  }

  const hcaptchaSiteKey = process.env.HCAPTCHA_SITE_KEY?.trim();
  const hcaptchaSecretKey = process.env.HCAPTCHA_SECRET_KEY?.trim();

  if (hcaptchaSiteKey && hcaptchaSecretKey) {
    return {
      provider: "hcaptcha",
      siteKey: hcaptchaSiteKey,
      secretKey: hcaptchaSecretKey,
    };
  }

  return null;
}

export function getPublicCommentHumanCheckConfig() {
  const config = getConfiguredProvider();

  if (!config) {
    return null;
  }

  return {
    provider: config.provider,
    siteKey: config.siteKey,
  };
}

export async function verifyCommentHumanCheck(input: {
  token: string | null | undefined;
  ipAddress?: string | null;
}) {
  const config = getConfiguredProvider();

  if (!config) {
    return {
      enabled: false,
      success: true,
    } as const;
  }

  const token = input.token?.trim();

  if (!token) {
    return {
      enabled: true,
      success: false,
      reason: "missing-token",
    } as const;
  }

  const endpoint =
    config.provider === "turnstile"
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://api.hcaptcha.com/siteverify";
  const body = new URLSearchParams({
    secret: config.secretKey,
    response: token,
  });

  if (input.ipAddress) {
    body.set("remoteip", input.ipAddress);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        enabled: true,
        success: false,
        reason: "verification-request-failed",
      } as const;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    return {
      enabled: true,
      success: Boolean(payload.success),
      reason: payload.success ? null : payload["error-codes"]?.join(",") || "verification-failed",
    } as const;
  } catch (error) {
    console.error("[comment human check]", error);
    return {
      enabled: true,
      success: false,
      reason: "verification-error",
    } as const;
  }
}
