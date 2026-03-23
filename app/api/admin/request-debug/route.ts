import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { REQUEST_DEBUG_METHODS, runRequestDebug } from "@/lib/tools/request-debug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestDebugSchema = z.object({
  method: z.enum(REQUEST_DEBUG_METHODS),
  url: z
    .string()
    .trim()
    .url("请输入有效的请求地址。")
    .refine((value) => /^https?:\/\//i.test(value), "目前只支持 HTTP 或 HTTPS 地址。"),
  headersText: z.string().max(20_000, "请求头内容不能超过 20000 个字符。").optional(),
  body: z.string().max(200_000, "请求体内容不能超过 200000 个字符。").optional(),
  timeoutMs: z
    .coerce
    .number()
    .int("超时时间必须是整数。")
    .min(1000, "超时时间不能低于 1000 ms。")
    .max(60_000, "超时时间不能超过 60000 ms。")
    .default(15_000),
  followRedirects: z.boolean().default(true),
});

function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "请求参数不合法。";
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, error: "只有管理员可以使用连通性与响应调试。" },
      { status: 403 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体必须是 JSON 格式。" },
      { status: 400 },
    );
  }

  const parsed = requestDebugSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: firstZodError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const body =
      parsed.data.method === "GET" || parsed.data.method === "HEAD"
        ? ""
        : parsed.data.body ?? "";

    const result = await runRequestDebug({
      method: parsed.data.method,
      url: parsed.data.url,
      headersText: parsed.data.headersText ?? "",
      body,
      timeoutMs: parsed.data.timeoutMs,
      followRedirects: parsed.data.followRedirects,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "请求调试失败，请稍后重试。",
      },
      { status: 400 },
    );
  }
}
