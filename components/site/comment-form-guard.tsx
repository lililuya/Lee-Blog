"use client";

import { useEffect, useRef } from "react";

type CommentFormGuardProps = {
  fieldName?: string;
};

export function CommentFormGuard({
  fieldName = "formStartedAt",
}: CommentFormGuardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = String(Date.now());
    }
  }, []);

  return <input ref={inputRef} type="hidden" name={fieldName} defaultValue="" />;
}
