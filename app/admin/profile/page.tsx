import { ProfileForm } from "@/components/forms/profile-form";
import { saveProfileAction } from "@/lib/actions/content-actions";
import { getAdminProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const profile = await getAdminProfile();

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Profile</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">主页信息管理</h1>
      </div>

      <ProfileForm action={saveProfileAction} profile={profile} />
    </div>
  );
}
