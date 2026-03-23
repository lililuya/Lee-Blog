import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og"],
        disallow: [
          "/admin",
          "/account",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/subscribe/confirm",
          "/unsubscribe",
          "/verify-email",
          "/papers/library",
          "/api/admin",
          "/api/auth",
          "/api/chat",
          "/api/telemetry",
          "/api/tools",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

