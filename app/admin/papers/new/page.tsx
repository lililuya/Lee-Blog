import { PaperTopicForm } from "@/components/forms/paper-topic-form";
import { createPaperTopicAction } from "@/lib/actions/paper-actions";

export const dynamic = "force-dynamic";

export default function NewPaperTopicPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Daily Papers</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Create Paper Topic</h1>
      </div>
      <PaperTopicForm action={createPaperTopicAction} submitLabel="Create Topic" />
    </div>
  );
}