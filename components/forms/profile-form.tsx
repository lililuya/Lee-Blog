import { SubmitButton } from "@/components/ui/submit-button";

type ProfileFormProps = {
  action: (formData: FormData) => Promise<void>;
  profile: {
    fullName: string;
    headline: string;
    tagline: string;
    shortBio: string;
    longBio: string;
    institution: string | null;
    department: string | null;
    location: string | null;
    email: string | null;
    websiteUrl: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    scholarUrl: string | null;
    cvUrl: string | null;
    heroImageUrl: string | null;
    backgroundImageUrl: string | null;
    assistantAvatarUrl: string | null;
    researchAreas: string[];
    educationMarkdown: string;
    experienceMarkdown: string;
    awardsMarkdown: string;
    speakingMarkdown: string;
  };
};

export function ProfileForm({ action, profile }: ProfileFormProps) {
  const safeBackgroundPreview = profile.backgroundImageUrl?.replace(/"/g, '\\"') ?? null;
  const safeAssistantAvatarPreview = profile.assistantAvatarUrl?.replace(/"/g, '\\"') ?? null;

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">姓名</span>
          <input name="fullName" defaultValue={profile.fullName} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">主标题</span>
          <input name="headline" defaultValue={profile.headline} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">副标题</span>
          <input name="tagline" defaultValue={profile.tagline} required className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">短简介</span>
          <textarea
            name="shortBio"
            defaultValue={profile.shortBio}
            required
            rows={4}
            className="field min-h-28 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">长简介</span>
          <textarea
            name="longBio"
            defaultValue={profile.longBio}
            required
            rows={6}
            className="field min-h-40 resize-y"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">机构</span>
          <input name="institution" defaultValue={profile.institution ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">部门</span>
          <input name="department" defaultValue={profile.department ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">地点</span>
          <input name="location" defaultValue={profile.location ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">邮箱</span>
          <input name="email" defaultValue={profile.email ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">网站</span>
          <input name="websiteUrl" defaultValue={profile.websiteUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">GitHub</span>
          <input name="githubUrl" defaultValue={profile.githubUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">LinkedIn</span>
          <input name="linkedinUrl" defaultValue={profile.linkedinUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Scholar</span>
          <input name="scholarUrl" defaultValue={profile.scholarUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">CV URL</span>
          <input name="cvUrl" defaultValue={profile.cvUrl ?? ""} className="field" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Hero 图片路径或 URL</span>
          <input
            name="heroImageUrl"
            defaultValue={profile.heroImageUrl ?? ""}
            className="field"
            placeholder="/uploads/hero.png 或 https://example.com/hero.png"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">
            站点背景图路径或 URL
          </span>
          <input
            name="backgroundImageUrl"
            defaultValue={profile.backgroundImageUrl ?? ""}
            className="field"
            placeholder="/uploads/site/background.png 或 https://example.com/background.jpg"
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            这张图会作用于整个站点的大背景。你也可以直接在下面上传一张新图替换它。
          </p>
          {safeBackgroundPreview ? (
            <div className="overflow-hidden rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
              <div
                className="h-44 w-full bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(248,244,235,0.24), rgba(238,243,242,0.44)), url("${safeBackgroundPreview}")`,
                }}
              />
              <div className="border-t border-black/6 px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
                当前背景图：{profile.backgroundImageUrl}
              </div>
            </div>
          ) : null}
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">上传新的站点背景图</span>
          <input
            name="backgroundImageFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="field file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(27,107,99,0.12)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
          />
          <span className="inline-flex items-center gap-3 text-sm text-[var(--ink-soft)]">
            <input
              name="clearBackgroundImage"
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
            />
            同时清空当前背景图
          </span>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">助手头像路径或 URL</span>
          <input
            name="assistantAvatarUrl"
            defaultValue={profile.assistantAvatarUrl ?? ""}
            className="field"
            placeholder="/uploads/assistant.png 或 https://example.com/assistant.png"
          />
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            这里的头像会同步用于聊天窗口中的模型头像，支持站内根路径和外部图片链接。
          </p>
          {safeAssistantAvatarPreview ? (
            <div className="flex items-center gap-4 rounded-[1.4rem] border border-black/8 bg-[rgba(255,255,255,0.76)] px-4 py-4 shadow-[0_18px_38px_rgba(20,33,43,0.05)]">
              <div
                className="h-16 w-16 rounded-full border border-black/8 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${safeAssistantAvatarPreview}")` }}
              />
              <div className="min-w-0 text-xs leading-6 text-[var(--ink-soft)]">
                <div className="font-semibold text-[var(--ink)]">当前助手头像预览</div>
                <div className="truncate">{profile.assistantAvatarUrl}</div>
              </div>
            </div>
          ) : null}
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">
            研究方向（英文逗号分隔）
          </span>
          <input
            name="researchAreas"
            defaultValue={profile.researchAreas.join(", ")}
            className="field"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">教育背景（Markdown）</span>
          <textarea
            name="educationMarkdown"
            defaultValue={profile.educationMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">经历（Markdown）</span>
          <textarea
            name="experienceMarkdown"
            defaultValue={profile.experienceMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">成果 / 荣誉（Markdown）</span>
          <textarea
            name="awardsMarkdown"
            defaultValue={profile.awardsMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">演讲 / 合作（Markdown）</span>
          <textarea
            name="speakingMarkdown"
            defaultValue={profile.speakingMarkdown}
            rows={6}
            className="field min-h-36 resize-y"
          />
        </label>
      </div>

      <SubmitButton>保存主页信息</SubmitButton>
    </form>
  );
}
