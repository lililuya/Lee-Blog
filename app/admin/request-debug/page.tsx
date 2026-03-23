import { RequestDebugger } from "@/components/admin/request-debugger";

export const dynamic = "force-dynamic";

export default function AdminRequestDebugPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="section-kicker">调试工具</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--ink)]">
          连通性与响应调试
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          从管理后台直接发起任意 HTTP 或 HTTPS 请求，查看目标接口是否可达、是否发生跳转、返回了什么状态码，
          以及响应头和响应体的预览内容。
        </p>
      </div>

      <RequestDebugger />
    </div>
  );
}
