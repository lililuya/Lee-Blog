import { SeriesForm } from "@/components/forms/series-form";
import { createContentSeriesAction } from "@/lib/actions/series-actions";

export const dynamic = "force-dynamic";

export default function NewSeriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-kicker">Series</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Create a new series</h1>
      </div>
      <SeriesForm action={createContentSeriesAction} submitLabel="Create series" />
    </div>
  );
}
