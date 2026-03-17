import { cn } from "@/lib/utils";

type AvatarBadgeProps = {
  name?: string | null;
  src?: string | null;
  className?: string;
  fallbackLabel?: string;
};

function getInitials(name?: string | null, fallbackLabel = "AI") {
  const normalized = (name ?? "").trim();

  if (!normalized) {
    return fallbackLabel.slice(0, 2).toUpperCase();
  }

  const segments = normalized
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return fallbackLabel.slice(0, 2).toUpperCase();
  }

  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return `${segments[0][0] ?? ""}${segments[1][0] ?? ""}`.toUpperCase();
}

function getBackgroundImage(src: string) {
  const safeSrc = src.replace(/"/g, '\\"');
  return `url("${safeSrc}")`;
}

export function AvatarBadge({ name, src, className, fallbackLabel = "AI" }: AvatarBadgeProps) {
  const normalizedSrc = src?.trim() ?? "";
  const initials = getInitials(name, fallbackLabel);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/8 bg-[rgba(20,33,43,0.08)] font-semibold text-[var(--ink)] shadow-[0_10px_24px_rgba(20,33,43,0.08)]",
        className,
      )}
      aria-label={name ?? fallbackLabel}
      title={name ?? undefined}
    >
      {normalizedSrc ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: getBackgroundImage(normalizedSrc) }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
