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
    researchAreas: string[];
    educationMarkdown: string;
    experienceMarkdown: string;
    awardsMarkdown: string;
    speakingMarkdown: string;
  };
};

export function ProfileForm({ action, profile }: ProfileFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-[2rem] border border-black/8 bg-white/80 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
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
          <textarea name="shortBio" defaultValue={profile.shortBio} required rows={4} className="field min-h-28 resize-y" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">长简介</span>
          <textarea name="longBio" defaultValue={profile.longBio} required rows={6} className="field min-h-40 resize-y" />
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
          <span className="text-sm font-semibold text-[var(--ink)]">Hero 图片 URL</span>
          <input name="heroImageUrl" defaultValue={profile.heroImageUrl ?? ""} className="field" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">研究方向（英文逗号分隔）</span>
          <input name="researchAreas" defaultValue={profile.researchAreas.join(", ")} className="field" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">教育背景（Markdown）</span>
          <textarea name="educationMarkdown" defaultValue={profile.educationMarkdown} rows={6} className="field min-h-36 resize-y" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">经历（Markdown）</span>
          <textarea name="experienceMarkdown" defaultValue={profile.experienceMarkdown} rows={6} className="field min-h-36 resize-y" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">成果 / 荣誉（Markdown）</span>
          <textarea name="awardsMarkdown" defaultValue={profile.awardsMarkdown} rows={6} className="field min-h-36 resize-y" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-[var(--ink)]">演讲 / 合作（Markdown）</span>
          <textarea name="speakingMarkdown" defaultValue={profile.speakingMarkdown} rows={6} className="field min-h-36 resize-y" />
        </label>
      </div>
      <SubmitButton>保存主页信息</SubmitButton>
    </form>
  );
}