"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type AdminConfirmBoundaryProps = {
  children: React.ReactNode;
};

type PendingConfirmation = {
  form: HTMLFormElement;
  submitter: HTMLElement | null;
  message: string;
};

export function AdminConfirmBoundary({ children }: AdminConfirmBoundaryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const pendingConfirmationRef = useRef<PendingConfirmation | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  function closeConfirmation() {
    pendingConfirmationRef.current = null;
    setActiveMessage(null);
  }

  function confirmPendingSubmission() {
    const pendingConfirmation = pendingConfirmationRef.current;
    closeConfirmation();

    if (!pendingConfirmation || !pendingConfirmation.form.isConnected) {
      return;
    }

    pendingConfirmation.form.dataset.confirmBypass = "true";

    window.requestAnimationFrame(() => {
      try {
        if (pendingConfirmation.submitter?.isConnected) {
          pendingConfirmation.form.requestSubmit(pendingConfirmation.submitter);
          return;
        }

        pendingConfirmation.form.requestSubmit();
      } finally {
        window.setTimeout(() => {
          delete pendingConfirmation.form.dataset.confirmBypass;
        }, 0);
      }
    });
  }

  useEffect(() => {
    const boundary = rootRef.current;

    if (!boundary) {
      return;
    }

    function handleSubmit(event: Event) {
      const target = event.target;
      const form =
        target instanceof HTMLFormElement
          ? target
          : target instanceof Element
            ? target.closest("form")
            : null;

      if (!form || !(rootRef.current?.contains(form) ?? false)) {
        return;
      }

      if (form.dataset.confirmBypass === "true") {
        delete form.dataset.confirmBypass;
        return;
      }

      const message = form.dataset.confirmMessage?.trim();

      if (!message) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      pendingConfirmationRef.current = {
        form,
        submitter: event instanceof SubmitEvent && event.submitter instanceof HTMLElement ? event.submitter : null,
        message,
      };
      setActiveMessage(message);
    }

    boundary.addEventListener("submit", handleSubmit, true);

    return () => {
      boundary.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  useEffect(() => {
    if (!activeMessage) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfirmation();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMessage]);

  return (
    <div ref={rootRef}>
      {children}

      {activeMessage ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center px-4 py-6 sm:px-6">
          <button
            type="button"
            aria-label="Close confirmation dialog"
            className="absolute inset-0 bg-[rgba(8,18,24,0.42)] backdrop-blur-[4px]"
            onClick={closeConfirmation}
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative z-[1] w-full max-w-lg rounded-[2rem] border border-[var(--border)] bg-[var(--card-strong)] p-6 shadow-[0_30px_80px_rgba(8,18,24,0.28)] sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(168,123,53,0.14)] text-[var(--gold)]">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
                  Confirm Action
                </p>
                <h2 id={titleId} className="font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
                  Confirm this admin update?
                </h2>
                <p id={descriptionId} className="text-sm leading-7 text-[var(--ink-soft)]">
                  {activeMessage}
                </p>
                <p className="text-xs leading-6 text-[var(--ink-soft)]">
                  This extra step helps prevent accidental updates, deletions, and moderation changes.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                className="btn-secondary w-full justify-center sm:w-auto"
                onClick={closeConfirmation}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary w-full justify-center sm:w-auto"
                onClick={confirmPendingSubmission}
              >
                Confirm and continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
