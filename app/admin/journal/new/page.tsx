import { JournalForm } from "@/components/forms/journal-form";
import { createJournalAction } from "@/lib/actions/content-actions";

export const dynamic = "force-dynamic";

export default function NewJournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Journal</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建日志</h1>
      </div>
      <JournalForm action={createJournalAction} submitLabel="创建日志" />
    </div>
  );
}