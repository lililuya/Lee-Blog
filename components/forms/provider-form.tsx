import { ProviderAdapter } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatProviderAdapterLabel } from "@/lib/ui-labels";

type ProviderFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
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

export function ProviderForm({ action, submitLabel, confirmMessage, provider }: ProviderFormProps) {
  return (
    <form
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {provider ? <input type="hidden" name="providerId" value={provider.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">提供方名称</span>
          <input name="name" defaultValue={provider?.name} required className="field" placeholder="DeepSeek Chat" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={provider?.slug} className="field" placeholder="deepseek-chat" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">适配器</span>
          <select name="adapter" className="field" defaultValue={provider?.adapter ?? ProviderAdapter.OPENAI_COMPATIBLE}>
            <option value={ProviderAdapter.OPENAI_COMPATIBLE}>
              {formatProviderAdapterLabel(ProviderAdapter.OPENAI_COMPATIBLE)}
            </option>
            <option value={ProviderAdapter.ANTHROPIC}>
              {formatProviderAdapterLabel(ProviderAdapter.ANTHROPIC)}
            </option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">模型</span>
          <input name="model" defaultValue={provider?.model} required className="field" placeholder="deepseek-chat" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Base URL</span>
          <input name="baseUrl" defaultValue={provider?.baseUrl} required className="field" placeholder="https://api.deepseek.com/v1" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">API Key 环境变量</span>
          <input name="apiKeyEnv" defaultValue={provider?.apiKeyEnv} required className="field" placeholder="DEEPSEEK_API_KEY" />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            只有当这个环境变量存在，并且下方启用了该提供方时，聊天组件里才会显示它。修改 `.env` 后，请重启 Next.js 服务。
          </p>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">系统提示词</span>
          <textarea name="systemPrompt" defaultValue={provider?.systemPrompt ?? ""} rows={6} className="field min-h-36 resize-y" placeholder="你是一个嵌入在研究博客中的冷静、可靠且有帮助的助手。" />
        </label>
      </div>
      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input name="enabled" type="checkbox" defaultChecked={provider?.enabled ?? true} className="h-4 w-4 accent-[var(--accent)]" />
        在聊天组件中启用这个提供方
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
