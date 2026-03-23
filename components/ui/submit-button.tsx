"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({ children, className, disabled = false }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      className={cn("btn-primary disabled:cursor-not-allowed disabled:opacity-70", className)}
      disabled={isDisabled}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      <span>{pending ? "处理中..." : children}</span>
    </button>
  );
}
