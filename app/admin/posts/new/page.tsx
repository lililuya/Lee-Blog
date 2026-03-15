import { PostForm } from "@/components/forms/post-form";
import { createPostAction } from "@/lib/actions/content-actions";
import { getAdminSeriesOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const seriesOptions = await getAdminSeriesOptions();

  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Posts</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Create a new article</h1>
      </div>
      <PostForm action={createPostAction} submitLabel="Create article" seriesOptions={seriesOptions} />
    </div>
  );
}
