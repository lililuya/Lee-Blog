import { notFound } from "next/navigation";
import { deleteJournalAction, updateJournalAction } from "@/lib/actions/content-actions";
import { JournalForm } from "@/components/forms/journal-form";
import { getAdminJournalEntryById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getAdminJournalEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Journal</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑日志</h1>
        </div>
        <form
          action={deleteJournalAction}
          data-confirm-message="Delete this journal entry? This will remove it from the journal archive."
        >
          <input type="hidden" name="entryId" value={entry.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除日志
          </button>
        </form>
      </div>
        <JournalForm
          action={updateJournalAction}
          submitLabel="保存修改"
          confirmMessage="保存这篇日志的修改吗？这会覆盖当前内容并更新发布时间设置。"
          entry={entry}
        />
    </div>
  );
}
