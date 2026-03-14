import { Bot, Blocks, ShieldCheck, WandSparkles } from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";

const cards = [
  {
    icon: Bot,
    title: "局部 AI 对话",
    description:
      "右下角浮动图标已经预留为局部聊天窗口，可接多种 LLM Provider，后续还能继续加权限、限流和 Prompt 模板。",
  },
  {
    icon: WandSparkles,
    title: "内容辅助工具",
    description:
      "这里可以继续扩展成摘要生成、标题建议、文章润色、论文精读助手等面向站内内容的 AI 服务。",
  },
  {
    icon: ShieldCheck,
    title: "安全与权限",
    description:
      "Provider 的密钥不会存进数据库，而是通过环境变量映射管理，后台只保存元数据和启用状态。",
  },
  {
    icon: Blocks,
    title: "模块化扩展",
    description:
      "工具模块保留独立页面和信息架构，未来加入新能力时不需要推翻当前博客系统。",
  },
];

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Tools"
          title="AI工具站"
          description="此块用于接入各种AI处理工具，方便使用"
        />

        <div className="data-grid">
          {cards.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass-card rounded-[2rem] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{description}</p>
            </article>
          ))}
        </div>

        <section className="glass-card rounded-[2rem] p-6">
          <p className="section-kicker">Roadmap</p>
          <h2 className="font-serif text-3xl font-semibold tracking-tight">推荐下一步扩展功能</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
              <h3 className="font-semibold text-[var(--ink)]">每周研究简报增强</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                在现有每周简报基础上继续扩展邮件订阅、导出分享卡片和专题追踪。
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
              <h3 className="font-semibold text-[var(--ink)]">论文收藏与批注</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                为论文条目加入收藏、标签、阅读状态与个人笔记，逐步演化成研究知识库。
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
              <h3 className="font-semibold text-[var(--ink)]">全文搜索增强</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                从当前轻量搜索继续升级到标签、分类、主题联动和更完整的全文检索体验。
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
              <h3 className="font-semibold text-[var(--ink)]">AI 写作与研究助手</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                在工具模块中加入摘要、翻译、术语解释、相关工作梳理和问答式阅读辅助。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}