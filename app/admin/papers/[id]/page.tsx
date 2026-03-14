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
          <p className="section-kicker">Daily Papers</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Edit Paper Topic</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={syncSinglePaperTopicAction}>
            <input type="hidden" name="topicId" value={topic.id} />
            <button type="submit" className="btn-secondary">Sync This Topic Now</button>
          </form>
          <form action={deletePaperTopicAction}>
            <input type="hidden" name="topicId" value={topic.id} />
            <button type="submit" className="btn-secondary text-rose-700">Delete Topic</button>
          </form>
        </div>
      </div>
      <PaperTopicForm action={updatePaperTopicAction} submitLabel="Save Changes" topic={topic} />
    </div>
  );
}