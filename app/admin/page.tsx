import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Database,
  Download,
  FileSearch,
  FolderTree,
  History,
  Layers3,
  Mail,
  MessageCircleReply,
  NotebookPen,
  PenSquare,
  ScrollText,
  ShieldAlert,
  ShieldUser,
  Sparkles,
  Waypoints,
  Wrench,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    href: "/admin/analytics",
    title: "数据分析",
    description: "查看页面访问、热门内容、归档使用情况、搜索词和评论转化等关键指标。",
    icon: BarChart3,
  },
  {
    href: "/admin/rag",
    title: "RAG 控制台",
    description: "检查知识块覆盖率、向量准备状态和语义检索预览，确保检索链路稳定可用。",
    icon: Database,
  },
  {
    href: "/admin/request-debug",
    title: "连通性与响应调试",
    description: "从服务端直接调试任意 HTTP 或 HTTPS API，请求头、请求体、跳转和响应预览都能一起查看。",
    icon: Waypoints,
  },
  {
    href: "/admin/series",
    title: "内容专题",
    description: "把文章、笔记和周报整理成主题合集与阅读顺序。",
    icon: Layers3,
  },
  {
    href: "/admin/categories",
    title: "分类",
    description: "统一文章大类命名、合并重复分类，并优化按分类订阅的体验。",
    icon: FolderTree,
  },
  {
    href: "/admin/posts",
    title: "文章管理",
    description: "创建、编辑并发布长文，同时维护首页精选内容。",
    icon: Sparkles,
  },
  {
    href: "/admin/journal",
    title: "日志管理",
    description: "集中维护更短、更高频的工作记录和项目进展。",
    icon: PenSquare,
  },
  {
    href: "/admin/notes",
    title: "笔记管理",
    description: "维护常青知识卡片、复用型清单、阅读笔记和参考片段。",
    icon: NotebookPen,
  },
  {
    href: "/admin/papers",
    title: "每日论文",
    description: "按主题同步新的 arXiv 论文，形成每日研究输入流。",
    icon: FileSearch,
  },
  {
    href: "/admin/digests",
    title: "每周周报",
    description: "把一周内的论文、日志、笔记和文章整理成面向外部的公开周报。",
    icon: ScrollText,
  },
  {
    href: "/admin/comments",
    title: "评论审核",
    description: "审核待处理评论，让站内讨论保持有用、克制和高质量。",
    icon: MessageCircleReply,
  },
  {
    href: "/admin/comments/rules",
    title: "评论规则",
    description: "无需改代码即可调整放行规则、人工审核规则和强拦截关键词。",
    icon: ShieldAlert,
  },
  {
    href: "/admin/subscriptions",
    title: "订阅",
    description: "跟踪订阅增长、兴趣分组、退订率和邮件通知覆盖情况。",
    icon: Mail,
  },
  {
    href: "/admin/users",
    title: "用户管理",
    description: "管理用户角色、评论禁言、登录停用、软删除和会话撤销。",
    icon: ShieldUser,
  },
  {
    href: "/admin/audit",
    title: "审计轨迹",
    description: "查看高权限后台操作记录，包括用户管理和评论审核事件。",
    icon: History,
  },
  {
    href: "/admin/exports",
    title: "导出",
    description: "下载 JSON 备份，用于迁移、审计和灾备。",
    icon: Download,
  },
  {
    href: "/admin/providers",
    title: "LLM 提供方",
    description: "管理站点聊天入口使用的模型提供方和运行时密钥映射。",
    icon: Wrench,
  },
];

export default async function AdminDashboardPage() {
  const stats = await getDashboardOverview();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <p className="section-kicker">后台</p>
        <h1 className="font-serif text-[clamp(2.2rem,4vw,3.8rem)] font-semibold tracking-tight text-[var(--ink)]">
          后台总览
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          这里覆盖了发布、笔记整理、论文同步、每周周报、评论审核、导出、分析和专题阅读等核心后台模块，
          可以作为你管理整个站点内容与系统状态的工作台。
        </p>
      </section>

      <section className="data-grid">
        <StatCard
          label="全部文章"
          value={stats.posts}
          hint="包含草稿、已发布文章和已归档文章。"
        />
        <StatCard
          label="已发布文章"
          value={stats.publishedPosts}
          hint="会显示在公开博客和首页精选位置中。"
        />
        <StatCard
          label="全部笔记"
          value={stats.notes}
          hint="包含草稿、已发布和已归档状态的常青笔记。"
        />
        <StatCard
          label="已发布笔记"
          value={stats.publishedNotes}
          hint="会显示在公开笔记页，并参与搜索与 feed 输出。"
        />
        <StatCard
          label="日志条目"
          value={stats.journalEntries}
          hint="用于记录持续性的研究笔记和进展更新。"
        />
        <StatCard
          label="论文主题"
          value={stats.paperTopics}
          hint="当前启用的 arXiv 跟踪主题数量。"
        />
        <StatCard
          label="专题"
          value={stats.series}
          hint="可把文章、笔记和周报连接起来的专题阅读路径。"
        />
        <StatCard
          label="今日论文"
          value={stats.todayPapers}
          hint="按 Asia/Shanghai 的日期边界，在今天同步到的论文数量。"
        />
        <StatCard
          label="每周周报"
          value={stats.weeklyDigests}
          hint="已经生成的公开周报条目数量。"
        />
        <StatCard
          label="邮件订阅者"
          value={stats.emailSubscribers}
          hint="通过订阅流程收集到的公开邮箱记录。"
        />
        <StatCard
          label="活跃订阅者"
          value={stats.activeEmailSubscribers}
          hint="当前可接收邮件通知的已确认订阅者数量。"
        />
        <StatCard label="用户" value={stats.users} hint="不包含已删除账号。" />
        <StatCard
          label="禁言用户"
          value={stats.mutedUsers}
          hint="当前被禁止发表评论的账号数量。"
        />
        <StatCard
          label="停用用户"
          value={stats.suspendedUsers}
          hint="当前被禁止登录的账号数量。"
        />
        <StatCard
          label="待审评论"
          value={stats.pendingComments}
          hint="正在等待审核的读者评论。"
        />
        <StatCard
          label="审计日志"
          value={stats.auditLogs}
          hint="用于复盘和追踪的后台高权限操作记录。"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {quickLinks.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="glass-card group rounded-[2rem] p-6 transition hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{description}</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
              打开模块
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
