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
        <form action={deleteJournalAction}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除日志
          </button>
        </form>
      </div>
      <JournalForm action={updateJournalAction} submitLabel="保存修改" entry={entry} />
    </div>
  );
}