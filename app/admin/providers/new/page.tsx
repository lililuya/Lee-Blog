import { ProviderForm } from "@/components/forms/provider-form";
import { createProviderAction } from "@/lib/actions/content-actions";

export const dynamic = "force-dynamic";

export default function NewProviderPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">提供方</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建 LLM 提供方</h1>
      </div>
      <ProviderForm action={createProviderAction} submitLabel="创建提供方" />
    </div>
  );
}
