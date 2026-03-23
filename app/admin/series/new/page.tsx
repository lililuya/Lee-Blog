import { SeriesForm } from "@/components/forms/series-form";
import { createContentSeriesAction } from "@/lib/actions/series-actions";

export const dynamic = "force-dynamic";

export default function NewSeriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">专题</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">新建专题</h1>
      </div>
      <SeriesForm action={createContentSeriesAction} submitLabel="创建专题" />
    </div>
  );
}
