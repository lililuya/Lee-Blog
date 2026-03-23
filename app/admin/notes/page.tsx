import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { getAdminNotes } from "@/lib/queries";
import { isLivePublishedAt } from "@/lib/content-visibility";
import { formatPostStatusLabel, formatYesNoLabel } from "@/lib/ui-labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminNotesPage() {
  const notes = await getAdminNotes();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">笔记</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            常青笔记管理
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            在这里管理可复用的知识卡片、阅读笔记、清单和参考片段。
          </p>
        </div>
        <Link href="/admin/notes/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          新建笔记
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">标题</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">类型</th>
              <th className="px-6 py-4 font-semibold">精选</th>
              <th className="px-6 py-4 font-semibold">更新时间</th>
              <th className="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => {
              const isScheduled =
                note.status === "PUBLISHED" &&
                note.publishedAt &&
                !isLivePublishedAt(note.publishedAt);

              return (
                <tr key={note.id} className="border-t border-black/6">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-[var(--ink)]">{note.title}</div>
                      {isScheduled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(20,33,43,0.08)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--ink-soft)]">
                          定时发布
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)]">/{note.slug}</div>
                    {note.publishedAt ? (
                      <div className="mt-1 text-xs text-[var(--ink-soft)]">
                        发布时间：{formatDate(note.publishedAt, "yyyy-MM-dd HH:mm")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {formatPostStatusLabel(note.status)}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {note.noteType ?? "知识笔记"}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {formatYesNoLabel(note.featured)}
                  </td>
                  <td className="px-6 py-4 text-[var(--ink-soft)]">
                    {formatDate(note.updatedAt, "yyyy-MM-dd HH:mm")}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/notes/${note.id}`}
                      className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
                    >
                      <SquarePen className="h-4 w-4" />
                      编辑
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
