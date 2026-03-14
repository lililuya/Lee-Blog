import Link from "next/link";
import { Plus, SquarePen } from "lucide-react";
import { getAdminPosts } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getAdminPosts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Posts</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Post Management</h1>
        </div>
        <Link href="/admin/posts/new" className="btn-primary self-start md:self-auto">
          <Plus className="h-4 w-4" />
          New post
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-white/80 shadow-[0_24px_60px_rgba(20,33,43,0.06)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(20,33,43,0.04)] text-[var(--ink-soft)]">
            <tr>
              <th className="px-6 py-4 font-semibold">Title</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Comments</th>
              <th className="px-6 py-4 font-semibold">Updated At</th>
              <th className="px-6 py-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-black/6">
                <td className="px-6 py-4">
                  <div className="font-semibold text-[var(--ink)]">{post.title}</div>
                  <div className="text-xs text-[var(--ink-soft)]">/{post.slug}</div>
                </td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{post.status}</td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{post.category}</td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{post._count.comments}</td>
                <td className="px-6 py-4 text-[var(--ink-soft)]">{formatDate(post.updatedAt, "yyyy-MM-dd HH:mm")}</td>
                <td className="px-6 py-4">
                  <Link href={`/admin/posts/${post.id}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-strong)]">
                    <SquarePen className="h-4 w-4" />
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}