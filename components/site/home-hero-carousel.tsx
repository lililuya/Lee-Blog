"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  meta: string[];
  href: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone: "teal" | "gold" | "ink";
};

function toneClassName(tone: HomeHeroSlide["tone"]) {
  if (tone === "gold") {
    return "home-hero-carousel__surface home-hero-carousel__surface--gold";
  }

  if (tone === "ink") {
    return "home-hero-carousel__surface home-hero-carousel__surface--ink";
  }

  return "home-hero-carousel__surface home-hero-carousel__surface--teal";
}

function tabClassName(active: boolean) {
  return active
    ? "rounded-[1.2rem] border border-[color:var(--border-strong)] bg-[var(--panel-elevated)] px-3 py-3 text-left shadow-[0_12px_28px_rgba(20,33,43,0.06)]"
    : "rounded-[1.2rem] border border-[color:var(--border)] bg-transparent px-3 py-3 text-left transition hover:bg-[var(--panel-soft)]";
}

export function HomeHeroCarousel({ slides }: { slides: HomeHeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const activeSlide = slides[activeIndex] ?? slides[0];

  function goToPrevious() {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function goToNext() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  return (
    <div className="space-y-5">
      <section
        className={`rounded-[2rem] border border-[color:var(--border)] p-5 md:p-6 ${toneClassName(
          activeSlide.tone,
        )}`}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            <span className="home-hero-carousel__eyebrow rounded-full px-3 py-1 text-[0.72rem] tracking-[0.08em] text-[var(--accent-strong)]">
              {activeSlide.eyebrow}
            </span>
            <span>
              {String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
          </div>

          <h2 className="max-w-5xl font-serif text-[clamp(1.6rem,4vw,2.75rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--ink)]">
            {activeSlide.title}
          </h2>

          <p className="max-w-4xl text-sm leading-8 text-[var(--ink-soft)]">
            {activeSlide.summary}
          </p>

          <div className="flex flex-wrap gap-2">
            {activeSlide.meta.map((item) => (
              <span
                key={`${activeSlide.id}-${item}`}
                className="home-hero-carousel__meta-pill rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={activeSlide.href} className="btn-primary">
              {activeSlide.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>

            {activeSlide.secondaryHref && activeSlide.secondaryLabel ? (
              <Link href={activeSlide.secondaryHref} className="btn-secondary">
                {activeSlide.secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {slides.length > 1 ? (
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={tabClassName(index === activeIndex)}
                onClick={() => setActiveIndex(index)}
              >
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  {slide.eyebrow}
                </div>
                <div className="mt-2 line-clamp-2 font-serif text-lg font-semibold tracking-tight text-[var(--ink)]">
                  {slide.title}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--panel-elevated)] text-[var(--ink-soft)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--ink)]"
              onClick={goToPrevious}
              aria-label="查看上一张焦点卡片"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--panel-elevated)] text-[var(--ink-soft)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--ink)]"
              onClick={goToNext}
              aria-label="查看下一张焦点卡片"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
