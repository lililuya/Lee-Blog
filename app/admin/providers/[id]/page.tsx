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
          <p className="section-kicker">Providers</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit LLM Provider</h1>
        </div>
      <form
        action={deleteProviderAction}
        data-confirm-message="Delete this provider? Any tooling that depends on it may stop working until another provider is selected."
      >
          <input type="hidden" name="providerId" value={provider.id} />
          <button type="submit" className="btn-secondary text-rose-700">
            Delete Provider
          </button>
        </form>
      </div>
      <ProviderForm
        action={updateProviderAction}
        submitLabel="Save Changes"
        confirmMessage="Save changes to this provider? Chat and tool routing may start using the new configuration immediately."
        provider={provider}
      />
    </div>
  );
}
