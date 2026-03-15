import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/utils";
import {
  extractClientIp,
  hashVisitorIp,
  inferVisitorRegion,
  isBotUserAgent,
} from "@/lib/visitor-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizePath(path: unknown) {
  const normalized = typeof path === "string" ? path.trim() : "";
  return normalized.startsWith("/") ? normalized.slice(0, 200) : "/";
}

function sanitizeText(value: unknown, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: "database" });
  }

  const userAgent = request.headers.get("user-agent");

  if (isBotUserAgent(userAgent)) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }

  let payload: { path?: unknown; timezone?: unknown; language?: unknown } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    payload = {};
  }

  const timezone = sanitizeText(payload.timezone, 80);
  const language = sanitizeText(payload.language, 48);
  const path = sanitizePath(payload.path);
  const ipAddress = extractClientIp(request.headers) ?? "unknown";
  const countryCode = request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country");
  const region = inferVisitorRegion({ countryCode, timezone });
  const ipHash = hashVisitorIp(ipAddress);
  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.siteVisitor.upsert({
        where: { ipHash },
        create: {
          ipHash,
          firstSeenAt: now,
          lastSeenAt: now,
          visitCount: 1,
          lastPath: path,
          countryCode: countryCode?.slice(0, 8) ?? null,
          regionKey: region.key,
          regionLabel: region.label,
          timezone,
          language,
          userAgent: userAgent?.slice(0, 400) ?? null,
        },
        update: {
          lastSeenAt: now,
          visitCount: { increment: 1 },
          lastPath: path,
          countryCode: countryCode?.slice(0, 8) ?? null,
          regionKey: region.key,
          regionLabel: region.label,
          timezone,
          language,
          userAgent: userAgent?.slice(0, 400) ?? null,
        },
      }),
      prisma.pageView.create({
        data: {
          path,
          visitorIpHash: ipHash,
          countryCode: countryCode?.slice(0, 8) ?? null,
          regionKey: region.key,
          regionLabel: region.label,
          createdAt: now,
        },
      }),
    ]);
  } catch {
    return NextResponse.json({ ok: true, skipped: "storage" });
  }

  return NextResponse.json({ ok: true });
}

