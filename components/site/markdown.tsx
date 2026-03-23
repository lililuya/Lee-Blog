import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownCitationCard } from "@/components/site/markdown-citation-card";
import type { MarkdownHeading } from "@/lib/markdown";
import { slugifyHeading } from "@/lib/markdown";
import { CopyCodeButton } from "@/components/ui/copy-code-button";
import { splitMarkdownCitationSegments } from "@/lib/citation-cards";

type MarkdownProps = {
  content: string;
  headings?: MarkdownHeading[];
};

function getTextContent(children: ReactNode, trim = true): string {
  const value = Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return getTextContent(child.props.children);
      }

      return "";
    })
    .join("");

  return trim ? value.trim() : value;
}

function buildHeadingComponents(headings?: MarkdownHeading[]): Pick<
  Components,
  "h1" | "h2" | "h3" | "h4" | "pre" | "table"
> {
  let renderedHeadingIndex = 0;
  const fallbackHeadingCounts = new Map<string, number>();

  function resolveHeadingId(text: string, depth: number) {
    const matchedHeading = headings?.[renderedHeadingIndex];
    renderedHeadingIndex += 1;

    if (matchedHeading && matchedHeading.depth === depth) {
      return matchedHeading.id;
    }

    const baseId = slugifyHeading(text);
    const nextCount = (fallbackHeadingCounts.get(baseId) ?? 0) + 1;
    fallbackHeadingCounts.set(baseId, nextCount);
    return nextCount === 1 ? baseId : `${baseId}-${nextCount}`;
  }

  function createHeading<TagName extends "h1" | "h2" | "h3" | "h4">(
    tagName: TagName,
    depth: number,
  ) {
    function renderHeading(
      id: string,
      label: string,
      children: ReactNode,
      props: Omit<ComponentPropsWithoutRef<"h1">, "children">,
    ) {
      const content = (
        <span className="inline-flex max-w-full items-start gap-3">
          <span>{children}</span>
          <a
            href={`#${id}`}
            aria-label={`Link to ${label || "section"}`}
            className="mt-1 inline-flex flex-none items-center justify-center rounded-full border border-black/8 bg-[var(--panel-soft)] p-1.5 text-[var(--ink-soft)] opacity-70 transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] md:opacity-0 md:group-hover:opacity-100"
          >
            <Link2 className="h-3.5 w-3.5" />
          </a>
        </span>
      );

      if (tagName === "h1") {
        return (
          <h1 id={id} className="group scroll-mt-28" {...props}>
            {content}
          </h1>
        );
      }

      if (tagName === "h2") {
        return (
          <h2 id={id} className="group scroll-mt-28" {...props}>
            {content}
          </h2>
        );
      }

      if (tagName === "h3") {
        return (
          <h3 id={id} className="group scroll-mt-28" {...props}>
            {content}
          </h3>
        );
      }

      return (
        <h4 id={id} className="group scroll-mt-28" {...props}>
          {content}
        </h4>
      );
    }

    return function Heading({
      children,
      ...props
    }: ComponentPropsWithoutRef<TagName>) {
      const text = getTextContent(children);
      const id = resolveHeadingId(text || `section-${depth}`, depth);

      return renderHeading(
        id,
        text,
        children,
        props as Omit<ComponentPropsWithoutRef<"h1">, "children">,
      );
    };
  }

  return {
    h1: createHeading("h1", 1),
    h2: createHeading("h2", 2),
    h3: createHeading("h3", 3),
    h4: createHeading("h4", 4),
    pre({ children }) {
      const childArray = Children.toArray(children);
      const codeChild = childArray[0];

      if (!isValidElement<{ children?: ReactNode; className?: string }>(codeChild)) {
        return <pre>{children}</pre>;
      }

      const className = codeChild.props.className ?? "";
      const code = getTextContent(codeChild.props.children, false).replace(/\n$/, "");
      const language = className.replace(/^language-/, "") || "code";

      return (
        <div className="article-code-block my-6 overflow-hidden rounded-[1.15rem]">
          <div className="article-code-block__header flex items-center justify-between gap-4 px-4 py-3">
            <span className="article-code-block__label text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
              {language}
            </span>
            <CopyCodeButton value={code} />
          </div>
          <pre className="article-code-block__body !m-0 !overflow-x-auto !rounded-none !bg-transparent !px-4 !py-4">
            {children}
          </pre>
        </div>
      );
    },
    table({ children, ...props }) {
      return (
        <div className="my-6 overflow-x-auto">
          <table {...props}>{children}</table>
        </div>
      );
    },
  };
}

export function Markdown({ content, headings }: MarkdownProps) {
  const components = buildHeadingComponents(headings);
  const segments = splitMarkdownCitationSegments(content);

  return (
    <div className="editorial-reading-surface">
      <div className="prose-academic max-w-none">
        {segments.map((segment, index) => {
          if (segment.type === "citation-card") {
            return <MarkdownCitationCard key={`citation-card-${index}`} card={segment.data} />;
          }

          if (!segment.content.trim()) {
            return null;
          }

          return (
            <ReactMarkdown
              key={`markdown-segment-${index}`}
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {segment.content}
            </ReactMarkdown>
          );
        })}
      </div>
    </div>
  );
}
