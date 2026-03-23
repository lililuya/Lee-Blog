import { Compass } from "lucide-react";
import { ExternalLinksDirectory } from "@/components/site/external-links-directory";
import { SectionHeading } from "@/components/site/section-heading";
import { externalLinkCategories, externalLinkEntries } from "@/lib/tool-links";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <div className="container-shell py-16">
      <div className="editorial-shell space-y-10">
        <SectionHeading
          kicker="工具页"
          title="常用网址导航"
          description="把常用的研究、模型、开发、写作和设计网站集中收在一个地方，方便直接打开、搜索和按分类浏览。"
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <article className="editorial-panel p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
              <Compass className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)]">
              一个更干净的入口
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              这个页面现在是公开可访问的，不再只限管理员使用。它只保留站外导航功能，方便集中管理高频网址，
              不混入后台调试或运行时诊断内容。
            </p>
          </article>

          <aside className="editorial-note-box p-6 text-sm leading-7 text-[var(--ink-soft)]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
              当前收录
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--ink)]">
              {externalLinkEntries.length}
            </p>
            <p className="mt-2">
              个常用网站，分布在 {externalLinkCategories.length} 个分类里。
            </p>
            <p className="mt-3">
              后续如果还要继续加站点，只需要维护一个数据文件，不用再反复修改页面结构。
            </p>
          </aside>
        </section>

        <ExternalLinksDirectory
          categories={externalLinkCategories}
          links={externalLinkEntries}
        />
      </div>
    </div>
  );
}
