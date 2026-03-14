"use client";

import { useEffect, useState, type CSSProperties } from "react";

type ReadingProgressProps = {
  targetId: string;
  label?: string;
};

export function ReadingProgress({ targetId, label = "Reading progress" }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      const target = document.getElementById(targetId);

      if (!target) {
        setProgress(0);
        return;
      }

      const rect = target.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const targetTop = scrollTop + rect.top;
      const viewportHeight = window.innerHeight;
      const totalDistance = Math.max(target.offsetHeight - viewportHeight * 0.45, 1);
      const currentDistance = scrollTop - targetTop + viewportHeight * 0.3;
      const nextProgress = Math.max(0, Math.min(1, currentDistance / totalDistance));

      setProgress(nextProgress);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateProgress);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [targetId]);

  const progressPercent = Math.round(progress * 100);
  const style = {
    "--reading-progress": `${progressPercent}%`,
  } as CSSProperties;

  return (
    <div
      className="reading-progress-shell"
      style={style}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercent}
    >
      <div className="reading-progress-label">Reading {progressPercent}%</div>
      <div className="reading-progress-track">
        <div className="reading-progress-fill" />
        <div className="reading-progress-walker" aria-hidden="true">
          <span className="reading-progress-spark" />
          <span className="reading-progress-avatar">
            <span className="reading-progress-hair" />
            <span className="reading-progress-head" />
            <span className="reading-progress-body" />
            <span className="reading-progress-bag" />
            <span className="reading-progress-leg reading-progress-leg-left" />
            <span className="reading-progress-leg reading-progress-leg-right" />
          </span>
        </div>
      </div>
    </div>
  );
}