import { SubmitButton } from "@/components/ui/submit-button";

type PaperTopicFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  confirmMessage?: string;
  topic?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    query: string;
    maxResults: number;
    enabled: boolean;
  } | null;
};

export function PaperTopicForm({ action, submitLabel, confirmMessage, topic }: PaperTopicFormProps) {
  return (
    <form
      action={action}
      data-confirm-message={confirmMessage}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {topic ? <input type="hidden" name="topicId" value={topic.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">主题名称</span>
          <input name="name" defaultValue={topic?.name} required className="field" placeholder="例如：LLM Agents" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={topic?.slug} className="field" placeholder="留空则自动生成" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">说明</span>
          <textarea
            name="description"
            defaultValue={topic?.description ?? ""}
            rows={4}
            className="field min-h-24 resize-y"
            placeholder="说明这个主题追踪的内容，以及它为什么对你的研究流程重要。"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">arXiv 查询</span>
          <textarea
            name="query"
            defaultValue={topic?.query}
            required
            rows={5}
            className="field min-h-28 resize-y font-mono text-sm"
            placeholder='例如：all:"large language model" AND cat:cs.CL'
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            这里直接填写 arXiv API 的原始查询语法。常见写法包括{" "}
            <code>all:&quot;retrieval augmented generation&quot;</code>、<code>cat:cs.AI</code> 和{" "}
            <code>ti:&quot;agent&quot;</code>。
          </p>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">每日结果上限</span>
          <input
            name="maxResults"
            type="number"
            min={1}
            max={20}
            defaultValue={topic?.maxResults ?? 5}
            required
            className="field"
          />
        </label>
      </div>
      <label className="inline-flex items-center gap-3 rounded-full border border-black/8 bg-[rgba(27,107,99,0.05)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={topic?.enabled ?? true}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        在每日同步任务中包含这个主题
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
