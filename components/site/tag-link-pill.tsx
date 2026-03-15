import Link from "next/link";
import { cn } from "@/lib/utils";

type TagLinkPillProps = {
  tag: string;
  className?: string;
  size?: "sm" | "md";
};

export function TagLinkPill({ tag, className, size = "sm" }: TagLinkPillProps) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className={cn(
        "rounded-full border border-black/10 text-[var(--ink-soft)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]",
        size === "sm" ? "px-3 py-1 text-xs font-medium" : "px-3 py-2 text-sm font-medium",
        className,
      )}
    >
      #{tag}
    </Link>
  );
}
