"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

type CommentHumanCheckProps = {
  provider: "turnstile" | "hcaptcha";
  siteKey: string;
  fieldName?: string;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: string;
    },
  ) => string;
};

type HCaptchaApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: string;
    },
  ) => string | number;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    hcaptcha?: HCaptchaApi;
  }
}

export function CommentHumanCheck({
  provider,
  siteKey,
  fieldName = "humanCheckToken",
}: CommentHumanCheckProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [token, setToken] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const scriptSrc = useMemo(
    () =>
      provider === "turnstile"
        ? "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        : "https://js.hcaptcha.com/1/api.js?render=explicit",
    [provider],
  );

  useEffect(() => {
    const apiReady =
      provider === "turnstile" ? Boolean(window.turnstile) : Boolean(window.hcaptcha);

    if ((!scriptReady && !apiReady) || renderedRef.current || !containerRef.current) {
      return;
    }

    const handleSuccess = (nextToken: string) => {
      setToken(nextToken);
    };

    const handleReset = () => {
      setToken("");
    };

    if (provider === "turnstile" && window.turnstile) {
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: handleSuccess,
        "expired-callback": handleReset,
        "error-callback": handleReset,
        theme: "auto",
      });
      renderedRef.current = true;
      return;
    }

    if (provider === "hcaptcha" && window.hcaptcha) {
      window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: handleSuccess,
        "expired-callback": handleReset,
        "error-callback": handleReset,
        theme: "auto",
      });
      renderedRef.current = true;
    }
  }, [provider, scriptReady, siteKey]);

  return (
    <div className="space-y-3">
      <Script src={scriptSrc} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div ref={containerRef} />
      <input type="hidden" name={fieldName} value={token} readOnly />
      <p className="text-xs leading-6 text-[var(--ink-soft)]">
        Complete the human verification challenge before submitting.
      </p>
    </div>
  );
}
