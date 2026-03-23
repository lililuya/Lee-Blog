"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CopySnippetProps = {
  label: string;
  value: string;
  mode?: "text" | "code";
  className?: string;
};

export function CopySnippet({
  label,
  value,
  mode = "text",
  className,
}: CopySnippetProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const rows = Math.max(4, Math.min(12, value.split("\n").length + 1));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>
        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <textarea
        readOnly
        value={value}
        rows={rows}
        className={cn(
          "field min-h-28 resize-y leading-6",
          mode === "code" ? "font-mono text-xs" : "text-sm",
        )}
      />
    </div>
  );
}
