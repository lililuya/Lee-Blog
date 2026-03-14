import { ProviderAdapter } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";

type ProviderFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  provider?: {
    id: string;
    name: string;
    slug: string;
    adapter: ProviderAdapter;
    baseUrl: string;
    model: string;
    apiKeyEnv: string;
    systemPrompt: string | null;
    enabled: boolean;
  } | null;
};

export function ProviderForm({ action, submitLabel, provider }: ProviderFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
      {provider ? <input type="hidden" name="providerId" value={provider.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Provider Name</span>
          <input name="name" defaultValue={provider?.name} required className="field" placeholder="DeepSeek Chat" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={provider?.slug} className="field" placeholder="deepseek-chat" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Adapter</span>
          <select name="adapter" className="field" defaultValue={provider?.adapter ?? ProviderAdapter.OPENAI_COMPATIBLE}>
            <option value={ProviderAdapter.OPENAI_COMPATIBLE}>OpenAI Compatible</option>
            <option value={ProviderAdapter.ANTHROPIC}>Anthropic</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Model</span>
          <input name="model" defaultValue={provider?.model} required className="field" placeholder="deepseek-chat" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Base URL</span>
          <input name="baseUrl" defaultValue={provider?.baseUrl} required className="field" placeholder="https://api.deepseek.com/v1" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">API Key Environment Variable</span>
          <input name="apiKeyEnv" defaultValue={provider?.apiKeyEnv} required className="field" placeholder="DEEPSEEK_API_KEY" />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            The widget will only list this provider when this environment variable exists and the provider is enabled below. After editing `.env`, restart the Next.js server.
          </p>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">System Prompt</span>
          <textarea name="systemPrompt" defaultValue={provider?.systemPrompt ?? ""} rows={6} className="field min-h-36 resize-y" placeholder="You are a calm and useful assistant embedded in a research blog." />
        </label>
      </div>
      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input name="enabled" type="checkbox" defaultChecked={provider?.enabled} className="h-4 w-4 accent-[var(--accent)]" />
        Enable this provider in the chat widget
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}