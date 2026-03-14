import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { getAdminProviders } from "@/lib/queries";

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
          <p className="section-kicker">Providers</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">LLM Provider Settings</h1>
          <p className="max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
            A provider appears in the chat widget only when it is enabled here and its API key environment variable is present at runtime.
          </p>
        </div>
        <Link href="/admin/providers/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          New Provider
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Adapter</th>
              <th className="px-6 py-4 font-semibold">Model</th>
              <th className="px-6 py-4 font-semibold">API Key Env</th>
              <th className="px-6 py-4 font-semibold">Runtime Key</th>
              <th className="px-6 py-4 font-semibold">Widget Status</th>
              <th className="px-6 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => {
              const hasKey = hasConfiguredApiKey(provider.apiKeyEnv);
              const widgetStatus = provider.enabled && hasKey ? "Available" : provider.enabled ? "Missing key" : "Disabled";

              return (
                <tr key={provider.id} className="border-t border-black/6">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--ink)]">{provider.name}</div>
                    <div className="text-xs text-[var(--ink-soft)]">/{provider.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{provider.adapter}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{provider.model}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{provider.apiKeyEnv}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{hasKey ? "Detected" : "Missing"}</td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">{widgetStatus}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/providers/${provider.id}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]">
                      <SquarePen className="h-4 w-4" />
                      Edit
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