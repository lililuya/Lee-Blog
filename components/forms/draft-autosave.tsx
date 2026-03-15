"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { History, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";

type DraftAutosaveProps = {
  formId: string;
  storageKey: string;
  fields: string[];
};

type StoredDraftPayload = {
  updatedAt: number;
  data: Record<string, string | boolean>;
};

function getFieldValue(element: Element | null) {
  if (!element) {
    return "";
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      return element.checked;
    }

    if (element.type === "radio") {
      return element.checked ? element.value : "";
    }

    return element.value;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element.value;
  }

  return "";
}

function setFieldValue(element: Element | null, value: string | boolean) {
  if (!element) {
    return;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      element.checked = value === true;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    element.value = typeof value === "string" ? value : "";
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    element.value = typeof value === "string" ? value : "";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function readDraftSnapshot(form: HTMLFormElement, fields: string[]) {
  const snapshot: Record<string, string | boolean> = {};

  for (const fieldName of fields) {
    const element = form.elements.namedItem(fieldName);

    if (element instanceof RadioNodeList) {
      const radioElements = Array.from(element).filter(
        (item): item is HTMLInputElement => item instanceof HTMLInputElement,
      );
      const checked = radioElements.find((item) => item.checked);
      snapshot[fieldName] = checked?.value ?? "";
      continue;
    }

    snapshot[fieldName] = getFieldValue(element);
  }

  return snapshot;
}

function areDraftsEqual(
  left: Record<string, string | boolean>,
  right: Record<string, string | boolean>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

function readStoredDraft(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredDraftPayload;

    if (!parsed || typeof parsed !== "object" || !parsed.data) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function formatTime(value: number | null) {
  if (!value) {
    return "Not saved yet";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function DraftAutosave({ formId, storageKey, fields }: DraftAutosaveProps) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [availableDraft, setAvailableDraft] = useState<StoredDraftPayload | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const availableDraftRef = useRef<StoredDraftPayload | null>(null);
  const stableFields = useMemo(() => [...fields], [fields]);

  useEffect(() => {
    availableDraftRef.current = availableDraft;
  }, [availableDraft]);

  const discardDraft = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures.
    }

    availableDraftRef.current = null;
    setAvailableDraft(null);
    setSavedAt(null);
  };

  const restoreDraft = () => {
    const form = document.getElementById(formId);
    const draft = availableDraftRef.current;

    if (!(form instanceof HTMLFormElement) || !draft) {
      return;
    }

    for (const fieldName of stableFields) {
      const element = form.elements.namedItem(fieldName);
      const value = draft.data[fieldName];

      if (element instanceof RadioNodeList) {
        const radioElements = Array.from(element).filter(
          (item): item is HTMLInputElement => item instanceof HTMLInputElement,
        );

        for (const radio of radioElements) {
          radio.checked = typeof value === "string" && radio.value === value;
        }

        continue;
      }

      setFieldValue(element, value ?? "");
    }

    setSavedAt(draft.updatedAt);
    availableDraftRef.current = null;
    setAvailableDraft(null);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const form = document.getElementById(formId);

      if (!(form instanceof HTMLFormElement)) {
        setSavedAt(null);
        setAvailableDraft(null);
        return;
      }

      const currentSnapshot = readDraftSnapshot(form, stableFields);
      const stored = readStoredDraft(storageKey);

      if (!stored) {
        setSavedAt(null);
        setAvailableDraft(null);
        return;
      }

      if (areDraftsEqual(stored.data, currentSnapshot)) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Ignore storage failures.
        }

        setSavedAt(null);
        setAvailableDraft(null);
        return;
      }

      setAvailableDraft(stored);
      setSavedAt(stored.updatedAt);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [formId, stableFields, storageKey]);

  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const handleChange = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        const snapshot = readDraftSnapshot(form, stableFields);

        try {
          const existing = readStoredDraft(storageKey);

          if (existing && areDraftsEqual(existing.data, snapshot)) {
            setSavedAt(existing.updatedAt);
            return;
          }

          const payload: StoredDraftPayload = {
            updatedAt: Date.now(),
            data: snapshot,
          };

          window.localStorage.setItem(storageKey, JSON.stringify(payload));
          setSavedAt(payload.updatedAt);
        } catch {
          // Ignore storage failures and let the form continue normally.
        }
      }, 900);
    };

    form.addEventListener("input", handleChange);
    form.addEventListener("change", handleChange);

    return () => {
      form.removeEventListener("input", handleChange);
      form.removeEventListener("change", handleChange);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [formId, stableFields, storageKey]);

  return (
    <div className="rounded-[1.5rem] border border-[rgba(27,107,99,0.12)] bg-[rgba(27,107,99,0.05)] px-4 py-4 text-sm text-[var(--ink-soft)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            Draft auto-save is on
          </div>
          <p className="leading-7">
            Changes in this editor are saved to your browser locally as a safety net.
          </p>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            <History className="h-3.5 w-3.5" />
            Latest local draft: {formatTime(savedAt)}
          </div>
        </div>

        {availableDraft ? (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={restoreDraft}>
              <RotateCcw className="h-4 w-4" />
              Restore draft
            </button>
            <button type="button" className="btn-ghost text-[var(--ink-soft)]" onClick={discardDraft}>
              <Trash2 className="h-4 w-4" />
              Discard
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
