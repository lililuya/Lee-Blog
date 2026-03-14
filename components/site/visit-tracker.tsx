"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISIT_THROTTLE_MS = 15 * 60 * 1000;

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
      return;
    }

    try {
      const storageKey = `scholar-visit:${pathname}`;
      const now = Date.now();
      const lastSentAt = Number(window.localStorage.getItem(storageKey) ?? 0);

      if (Number.isFinite(lastSentAt) && now - lastSentAt < VISIT_THROTTLE_MS) {
        return;
      }

      window.localStorage.setItem(storageKey, String(now));

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      const language = window.navigator.language ?? "";

      void fetch("/api/telemetry/visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: pathname,
          timezone,
          language,
        }),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Silently skip analytics if storage or the request is unavailable.
    }
  }, [pathname]);

  return null;
}
