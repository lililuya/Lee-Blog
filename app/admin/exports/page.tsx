import Link from "next/link";
import { Download, FileArchive, FileJson } from "lucide-react";

export const dynamic = "force-dynamic";

const exportItems = [
  {
    kind: "full",
    title: "完整备份",
    description:
      "把站点资料、文章、日志、图集、论文数据、订阅者、分析数据、审计日志和 RAG 数据一起导出为面向恢复的 JSON 备份。",
  },
  {
    kind: "posts",
    title: "文章导出",
    description: "包含作者和专题元数据的长文文章导出。",
  },
  {
    kind: "comments",
    title: "评论导出",
    description: "导出全部评论、审核状态、作者信息以及关联文章元数据。",
  },
  {
    kind: "users",
    title: "用户导出",
    description: "导出账号级数据，但不包含密码哈希和两步验证密钥。",
  },
  {
    kind: "paper-library",
    title: "论文库导出",
    description: "导出所有用户保存的论文和批注内容。",
  },
];

export default function AdminExportsPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">导出</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight">
          数据导出与备份
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          下载 JSON 备份，用于迁移、离线审计或灾难恢复。敏感认证密钥不会包含在导出内容里。
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {exportItems.map((item) => (
          <article key={item.kind} className="glass-card rounded-[2rem] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                  <FileArchive className="h-4 w-4" />
                  导出
                </div>
                <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight">{item.title}</h2>
              </div>
              <FileJson className="h-5 w-5 text-[var(--ink-soft)]" />
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{item.description}</p>
            <Link href={`/api/admin/export?kind=${encodeURIComponent(item.kind)}`} className="btn-secondary mt-6">
              <Download className="h-4 w-4" />
              下载 JSON
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
