type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="glass-card rounded-[1.8rem] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</p>
      <p className="mt-4 font-serif text-5xl font-semibold tracking-tight">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{hint}</p>
    </article>
  );
}

