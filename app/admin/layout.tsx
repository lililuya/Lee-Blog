import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="container-shell grid gap-8 py-10 lg:grid-cols-[18rem_1fr] lg:py-12">
      <AdminNav />
      <div>{children}</div>
    </div>
  );
}

