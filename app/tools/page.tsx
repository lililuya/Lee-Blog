import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Mic, ShieldCheck, Waypoints } from "lucide-react";
import {
  ApiValidationLab,
  type ValidationLabSavedProvider,
  type ValidationLabTranscriptionProvider,
} from "@/components/site/api-validation-lab";
import { SectionHeading } from "@/components/site/section-heading";
import { getCurrentUser } from "@/lib/auth";
import { getTranscriptionProviderCatalog } from "@/lib/chat/transcription";
import { getAdminProviders, isAdminUser } from "@/lib/queries";

export const dynamic = "force-dynamic";

const quickActions = [
  {
    href: "/admin/providers",
    label: "Manage Providers",
    description: "Edit model keys, adapters, and runtime mappings.",
  },
  {
    href: "/admin/comments",
    label: "Review Comments",
    description: "Approve or reject pending comments from one queue.",
  },
  {
    href: "/admin/users",
    label: "User Controls",
    description: "Check roles, verification state, and account access.",
  },
];

const featureCards = [
  {
    icon: Bot,
    title: "常见模型 API 验证",
    description:
      "直接校验 OpenAI-compatible 与 Anthropic 风格接口的请求结构、鉴权和返回体，避免聊天链路接入后才发现协议不匹配。",
  },
  {
    icon: Mic,
    title: "FunASR 排障",
    description:
      "上传真实音频后查看 websocket 时间线，能更快判断问题卡在握手、run-task、音频分块还是 finish-task。",
  },
  {
    icon: Waypoints,
    title: "可替换 STT Provider",
    description:
      "聊天语音转写已从硬编码 FunASR 改为 provider 化，当前支持 FunASR 与 OpenAI-compatible STT，并为 iFlytek / 自定义适配位预留扩展。",
  },
  {
    icon: ShieldCheck,
    title: "运行时密钥映射",
    description:
      "工具页会优先走环境变量映射校验，不把密钥写进数据库，方便你按不同 provider 独立排查配置问题。",
  },
];

function statusText(ready: boolean, reserved = false) {
  if (reserved) return "预留";
  return ready ? "已就绪" : "未配置";
}

export default async function ToolsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=%2Ftools");
  }

  if (!isAdminUser(currentUser.role)) {
    redirect("/");
  }

  const adminMode = isAdminUser(currentUser.role);
  const adminProviders = await getAdminProviders();
  const transcriptionCatalog = getTranscriptionProviderCatalog();

  const savedProviders: ValidationLabSavedProvider[] = adminProviders.map((provider) => ({
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    adapter: provider.adapter,
    baseUrl: provider.baseUrl,
    model: provider.model,
    apiKeyEnv: provider.apiKeyEnv,
    enabled: provider.enabled,
    runtimeReady: Boolean(process.env[provider.apiKeyEnv]?.trim()),
  }));

  const transcriptionProviders: ValidationLabTranscriptionProvider[] = transcriptionCatalog.map(
    (provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      configured: provider.configured,
      supportsChat: provider.supportsChat,
      implementationStatus: provider.implementationStatus,
      apiKeyEnv: provider.apiKeyEnv,
      baseUrl: provider.baseUrl,
      model: provider.model,
    }),
  );
  const readyModelCount = savedProviders.filter((provider) => provider.runtimeReady).length;
  const readyTranscriptionCount = transcriptionProviders.filter(
    (provider) => provider.configured && provider.implementationStatus === "ready",
  ).length;
  const chatReadyTranscriptionCount = transcriptionProviders.filter(
    (provider) => provider.supportsChat && provider.implementationStatus === "ready",
  ).length;

  return (
    <div className="container-shell py-16">
      <div className="space-y-10">
        <SectionHeading
          kicker="Tools"
          title="API 验证与工具链排障"
          description="这里不再只是占位页，而是一个可直接动手验证的工作台。你可以先把模型接口和语音转写链路单独跑通，再接回聊天模块，定位问题会快很多。"
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.9fr)]">
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="glass-card flex min-w-[15rem] flex-1 items-start gap-3 rounded-[1.5rem] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[rgba(27,107,99,0.26)]"
              >
                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--ink)]">{action.label}</span>
                  <span className="mt-1 block text-xs leading-6 text-[var(--ink-soft)]">
                    {action.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <section className="glass-card rounded-[1.8rem] p-5">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--ink-soft)]">
              Coverage
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.2rem] border border-black/8 bg-white/70 px-4 py-3">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  Models Ready
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                  {readyModelCount}/{savedProviders.length || 0}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-black/8 bg-white/70 px-4 py-3">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  STT Ready
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                  {readyTranscriptionCount}/{transcriptionProviders.length || 0}
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-black/8 bg-white/70 px-4 py-3">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                  Chat STT
                </div>
                <div className="mt-2 text-2xl font-semibold text-[var(--ink)]">
                  {chatReadyTranscriptionCount}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="data-grid">
          {featureCards.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass-card rounded-[2rem] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(27,107,99,0.08)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{description}</p>
            </article>
          ))}
        </div>

        <section className="glass-card rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Runtime Readiness</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">当前接入状态</h2>
            </div>
            <div className="rounded-[1.4rem] border border-black/8 bg-white/70 px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
              管理员可在本页直接做接口验证，普通用户可查看当前链路支持情况。
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
              <h3 className="text-lg font-semibold text-[var(--ink)]">聊天模型 Provider</h3>
              <div className="mt-4 space-y-3">
                {savedProviders.length > 0 ? (
                  savedProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.72)] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[var(--ink)]">{provider.name}</div>
                          <div className="text-xs leading-6 text-[var(--ink-soft)]">
                            {provider.adapter} · {provider.model}
                          </div>
                        </div>
                        <span className="rounded-full bg-[rgba(27,107,99,0.12)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--accent-strong)]">
                          {statusText(provider.runtimeReady)}
                        </span>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                        <div>Base URL: {provider.baseUrl}</div>
                        <div>API Key Env: {provider.apiKeyEnv}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-[var(--ink-soft)]">
                    {adminMode
                      ? "当前还没有已保存的聊天模型 Provider。"
                      : "登录管理员账号后可以查看已保存的聊天模型 Provider。"}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-black/8 bg-white/70 p-4">
              <h3 className="text-lg font-semibold text-[var(--ink)]">语音转写 Provider</h3>
              <div className="mt-4 space-y-3">
                {transcriptionProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="rounded-[1.2rem] border border-black/8 bg-[rgba(255,255,255,0.72)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[var(--ink)]">{provider.name}</div>
                        <div className="text-xs leading-6 text-[var(--ink-soft)]">
                          {provider.description}
                        </div>
                      </div>
                      <span className="rounded-full bg-[rgba(27,107,99,0.12)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--accent-strong)]">
                        {statusText(
                          provider.configured,
                          provider.implementationStatus === "reserved",
                        )}
                      </span>
                    </div>
                    <div className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                      {provider.apiKeyEnv ? <div>API Key Env: {provider.apiKeyEnv}</div> : null}
                      {provider.baseUrl ? <div>Base URL: {provider.baseUrl}</div> : null}
                      {provider.model ? <div>Model: {provider.model}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {adminMode ? (
          <ApiValidationLab
            savedProviders={savedProviders}
            transcriptionProviders={transcriptionProviders}
          />
        ) : (
          <section className="glass-card rounded-[2rem] p-6 md:p-8">
            <p className="section-kicker">Admin Only</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">验证工具需要管理员权限</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
              页面已经展示了当前支持的 Provider 和预留扩展位，但真正发起 API 验证请求需要管理员身份，以免暴露运行时配置和调试接口。
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
