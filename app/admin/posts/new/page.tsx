import { PostForm } from "@/components/forms/post-form";
import { requireAdmin } from "@/lib/auth";
import { createPostAction } from "@/lib/actions/content-actions";
import {
  getAdminPostCategoryOptions,
  getAdminPostLocalizationOptions,
  getAdminSeriesOptions,
} from "@/lib/queries";
import { getPaperHighlightInsertionsForUser } from "@/lib/paper-library-queries";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const admin = await requireAdmin();
  const [seriesOptions, categoryOptions, localizationOptions, paperHighlightCards] = await Promise.all([
    getAdminSeriesOptions(),
    getAdminPostCategoryOptions(),
    getAdminPostLocalizationOptions(),
    getPaperHighlightInsertionsForUser(admin.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">文章</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建文章</h1>
      </div>
      <PostForm
        action={createPostAction}
        submitLabel="创建文章"
        seriesOptions={seriesOptions}
        categoryOptions={categoryOptions}
        localizationOptions={localizationOptions}
        paperHighlightCards={paperHighlightCards}
      />
    </div>
  );
}
