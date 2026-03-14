"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

type AuthFormProps = {
  mode: "login" | "register";
  nextPath?: string;
};

export function AuthForm({ mode, nextPath = "/admin" }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    startTransition(async () => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }

      router.push(mode === "login" ? nextPath : "/");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[2rem] border border-black/8 bg-white/84 p-6 shadow-[0_24px_60px_rgba(20,33,43,0.06)]"
    >
      {mode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--ink)]">Display name</span>
          <input name="name" required minLength={2} className="field" placeholder="Your name" />
        </label>
      ) : null}
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">Email</span>
        <input name="email" type="email" required className="field" placeholder="you@example.com" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--ink)]">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="field"
          placeholder="At least 8 characters"
        />
      </label>
      {error ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      <button
        type="submit"
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}