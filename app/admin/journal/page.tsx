import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { getAdminJournalEntries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminJournalPage() {
  const entries = await getAdminJournalEntries();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Journal</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">日志管理</h1>
        </div>
        <Link href="/admin/journal/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          新建日志
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">标题</th>
              <th className="px-6 py-4 font-semibold">状态</th>
              <th className="px-6 py-4 font-semibold">发布时间</th>
              <th className="px-6 py-4 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-black/6">
                <td className="px-6 py-4">
                  <div className="font-semibold text-[var(--ink)]">{entry.title}</div>
                  <div className="text-xs text-[var(--ink-soft)]">/{entry.slug}</div>
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{entry.status}</td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{formatDate(entry.publishedAt, "yyyy-MM-dd HH:mm")}</td>
                <td className="px-6 py-4">
                  <Link href={`/admin/journal/${entry.id}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]">
                    <SquarePen className="h-4 w-4" />
                    编辑
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}