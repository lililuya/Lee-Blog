import { SubmitButton } from "@/components/ui/submit-button";

type PaperTopicFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
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

export function PaperTopicForm({ action, submitLabel, topic }: PaperTopicFormProps) {
  return (
    <form
      action={action}
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {topic ? <input type="hidden" name="topicId" value={topic.id} /> : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Topic Name</span>
          <input name="name" defaultValue={topic?.name} required className="field" placeholder="For example: LLM Agents" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Slug</span>
          <input name="slug" defaultValue={topic?.slug} className="field" placeholder="Leave blank to auto-generate" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Description</span>
          <textarea
            name="description"
            defaultValue={topic?.description ?? ""}
            rows={4}
            className="field min-h-24 resize-y"
            placeholder="Explain what this topic tracks and why it matters to your research workflow."
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">arXiv Query</span>
          <textarea
            name="query"
            defaultValue={topic?.query}
            required
            rows={5}
            className="field min-h-28 resize-y font-mono text-sm"
            placeholder='For example: all:"large language model" AND cat:cs.CL'
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            Use raw arXiv API query syntax here. Common patterns include <code>all:&quot;retrieval augmented generation&quot;</code>, <code>cat:cs.AI</code>, and <code>ti:&quot;agent&quot;</code>.
          </p>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Daily Result Limit</span>
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
        Include this topic in daily sync runs
      </label>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}