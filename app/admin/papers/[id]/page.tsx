import { notFound } from "next/navigation";
import { PaperTopicForm } from "@/components/forms/paper-topic-form";
import {
  deletePaperTopicAction,
  syncSinglePaperTopicAction,
  updatePaperTopicAction,
} from "@/lib/actions/paper-actions";
import { getAdminPaperTopicById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditPaperTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = await getAdminPaperTopicById(id);

  if (!topic) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">每日论文</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">编辑论文主题</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <form
            action={syncSinglePaperTopicAction}
            data-confirm-message="现在同步这个主题吗？新的论文可能会立刻进入论文流。"
          >
            <input type="hidden" name="topicId" value={topic.id} />
            <button type="submit" className="btn-secondary">立即同步此主题</button>
          </form>
          <form
            action={deletePaperTopicAction}
            data-confirm-message="删除这个论文主题吗？之后的同步任务将不再追踪它。"
          >
            <input type="hidden" name="topicId" value={topic.id} />
            <button type="submit" className="btn-secondary text-rose-700">删除主题</button>
          </form>
        </div>
      </div>
      <PaperTopicForm
        action={updatePaperTopicAction}
        submitLabel="保存更改"
        confirmMessage="保存对这个论文主题的修改吗？后续同步任务会使用更新后的查询和限制。"
        topic={topic}
      />
    </div>
  );
}
