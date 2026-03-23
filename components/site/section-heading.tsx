import Link from "next/link";
import { ArrowRight } from "lucide-react";

type SectionHeadingProps = {
  kicker: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export function SectionHeading({
  kicker,
  title,
  description,
  href,
  linkLabel,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-black/8 pb-7 md:flex-row md:items-end md:justify-between">
      <div className="section-heading__stack max-w-3xl space-y-3">
        <p className="section-kicker">{kicker}</p>
        <h2 className="section-title section-heading__title text-[clamp(1.8rem,3.2vw,3rem)]">
          {title}
        </h2>
        <p className="section-copy section-heading__description max-w-2xl">{description}</p>
      </div>
      {href && linkLabel ? (
        <Link href={href} className="section-link-pill section-link-pill--compact self-start md:self-end">
          <span>{linkLabel}</span>
          <span className="section-link-pill__icon">
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ) : null}
    </div>
  );
}
