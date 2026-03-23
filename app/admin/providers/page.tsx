import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { getAdminProviders } from "@/lib/queries";
import {
  formatProviderAdapterLabel,
  formatProviderRuntimeKeyLabel,
  formatProviderWidgetStatusLabel,
} from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

function hasConfiguredApiKey(envName: string) {
  return Boolean(process.env[envName]?.trim());
}

export default async function AdminProvidersPage() {
  const providers = await getAdminProviders();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="section-kicker">提供方</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">LLM 提供方设置</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            只有当某个提供方在这里被启用，并且运行时存在对应的 API Key 环境变量时，它才会出现在聊天组件中。
          </p>
        </div>
        <Link href="/admin/providers/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          新建提供方
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">名称</th>
              <th className="px-6 py-4 font-semibold">适配器</th>
              <th className="px-6 py-4 font-semibold">模型</th>
              <th className="px-6 py-4 font-semibold">API Key 环境变量</th>
              <th className="px-6 py-4 font-semibold">运行时密钥</th>
              <th className="px-6 py-4 font-semibold">组件状态</th>
              <th className="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => {
              const hasKey = hasConfiguredApiKey(provider.apiKeyEnv);
              const widgetStatus = formatProviderWidgetStatusLabel(provider.enabled, hasKey);

              return (
                <tr key={provider.id} className="border-t border-black/6">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--ink)]">{provider.name}</div>
                    <div className="text-xs text-[var(--ink-soft)]">/{provider.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{formatProviderAdapterLabel(provider.adapter)}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{provider.model}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{provider.apiKeyEnv}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {formatProviderRuntimeKeyLabel(hasKey)}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{widgetStatus}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/providers/${provider.id}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]">
                      <SquarePen className="h-4 w-4" />
                      编辑
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
