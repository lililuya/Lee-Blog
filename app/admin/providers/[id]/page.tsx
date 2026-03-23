import { notFound } from "next/navigation";
import { deleteProviderAction, updateProviderAction } from "@/lib/actions/content-actions";
import { ProviderForm } from "@/components/forms/provider-form";
import { getAdminProviderById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = await getAdminProviderById(id);

  if (!provider) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">提供方</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑 LLM 提供方</h1>
        </div>
        <form
          action={deleteProviderAction}
          data-confirm-message="删除这个提供方吗？依赖它的聊天或工具链可能会停止工作，直到你切换到其他提供方。"
        >
          <input type="hidden" name="providerId" value={provider.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            删除提供方
          </button>
        </form>
      </div>
      <ProviderForm
        action={updateProviderAction}
        submitLabel="保存更改"
        confirmMessage="保存这个提供方的修改吗？聊天与工具路由可能会立刻开始使用新配置。"
        provider={provider}
      />
    </div>
  );
}
