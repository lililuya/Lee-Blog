import Link from "next/link";
import { cn } from "@/lib/utils";

type CategoryLinkPillProps = {
  category: string;
  className?: string;
};

export function CategoryLinkPill({ category, className }: CategoryLinkPillProps) {
  return (
    <Link
      href={`/categories/${encodeURIComponent(category)}`}
      className={cn(
        "badge-soft transition hover:bg-[rgba(27,107,99,0.16)] hover:text-[var(--ink)]",
        className,
      )}
    >
      {category}
    </Link>
  );
}
