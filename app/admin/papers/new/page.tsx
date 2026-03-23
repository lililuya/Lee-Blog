import { PaperTopicForm } from "@/components/forms/paper-topic-form";
import { createPaperTopicAction } from "@/lib/actions/paper-actions";

export const dynamic = "force-dynamic";

export default function NewPaperTopicPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">每日论文</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建论文主题</h1>
      </div>
      <PaperTopicForm action={createPaperTopicAction} submitLabel="创建主题" />
    </div>
  );
}
