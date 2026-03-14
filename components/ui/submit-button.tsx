"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function SubmitButton({ children, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={cn("btn-primary disabled:cursor-not-allowed disabled:opacity-70", className)}
      disabled={pending}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      <span>{pending ? "Processing..." : children}</span>
    </button>
  );
}