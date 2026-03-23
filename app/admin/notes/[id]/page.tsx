import { notFound } from "next/navigation";
import { RevisionHistory } from "@/components/admin/revision-history";
import { NoteForm } from "@/components/forms/note-form";
import { requireAdmin } from "@/lib/auth";
import {
  deleteNoteAction,
  restoreNoteRevisionAction,
  updateNoteAction,
} from "@/lib/actions/content-actions";
import {
  getAdminNoteById,
  getAdminNoteRevisionHistory,
  getAdminSeriesOptions,
} from "@/lib/queries";
import { getPaperHighlightInsertionsForUser } from "@/lib/paper-library-queries";

export const dynamic = "force-dynamic";

function resolveRevisionFeedback(value: string | undefined) {
  if (value === "restored") {
    return {
      tone: "success" as const,
      message: "修订版本已恢复，系统也为恢复后的内容重新保存了一个新快照。",
    };
  }

  if (value === "missing") {
    return {
      tone: "error" as const,
      message: "未找到对应修订版本，请刷新页面后重试。",
    };
  }

  return null;
}

export default async function EditNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id } = await params;
  const adminPromise = requireAdmin();
  const [{ revision }, note, revisions, seriesOptions, admin] = await Promise.all([
    searchParams,
    getAdminNoteById(id),
    getAdminNoteRevisionHistory(id),
    getAdminSeriesOptions(),
    adminPromise,
  ]);
  const paperHighlightCards = await getPaperHighlightInsertionsForUser(admin.id);

  if (!note) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">笔记</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑常青笔记</h1>
        </div>
        <form
          action={deleteNoteAction}
          data-confirm-message="确认删除这篇笔记吗？它会从公开笔记列表中移除。"
        >
          <input type="hidden" name="noteId" value={note.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除笔记
          </button>
        </form>
      </div>

        <NoteForm
          action={updateNoteAction}
          submitLabel="保存更改"
          confirmMessage="确认保存这篇笔记的更改吗？系统会更新当前笔记，并创建一个新的修订快照。"
          note={note}
          seriesOptions={seriesOptions}
          paperHighlightCards={paperHighlightCards}
        />

      <RevisionHistory
        title="笔记修订历史"
        description="每次保存都会为这篇常青笔记创建一个检查点，所以你可以恢复到更早的状态，而不会丢失当前草稿。"
        itemIdField="noteId"
        itemId={note.id}
        feedback={resolveRevisionFeedback(revision)}
        revisions={revisions}
        restoreAction={restoreNoteRevisionAction}
      />
    </div>
  );
}
