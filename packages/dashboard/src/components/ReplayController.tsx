"use client";

import { useEffect, useCallback } from "react";
import { type ToolCall } from "@/lib/api";

interface ReplayControllerProps {
  calls: ToolCall[];
  step: number | null;
  onStepChange: (step: number | null) => void;
}

export default function ReplayController({ calls, step, onStepChange }: ReplayControllerProps) {
  const total = calls.length;
  const isActive = step !== null;
  const current = step ?? total - 1;

  const prev = useCallback(() => {
    if (total === 0) return;
    onStepChange(Math.max(0, (step ?? total) - 1));
  }, [step, total, onStepChange]);

  const next = useCallback(() => {
    if (total === 0) return;
    const s = step ?? -1;
    if (s >= total - 1) {
      onStepChange(null);
    } else {
      onStepChange(s + 1);
    }
  }, [step, total, onStepChange]);

  const jumpToError = useCallback(() => {
    if (total === 0) return;
    const start = step != null ? step + 1 : 0;
    for (let i = start; i < total; i++) {
      if (calls[i].is_error) { onStepChange(i); return; }
    }
    for (let i = 0; i < (step ?? total); i++) {
      if (calls[i].is_error) { onStepChange(i); return; }
    }
  }, [calls, step, total, onStepChange]);

  const toggleReplay = useCallback(() => {
    onStepChange(isActive ? null : 0);
  }, [isActive, onStepChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "j" || e.key === "J") { e.preventDefault(); jumpToError(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, jumpToError]);

  const hasErrors = calls.some((c) => c.is_error);

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-all duration-200 ${
      isActive
        ? "bg-accent-dim/40 border-accent/20"
        : "bg-card/60 border-card-border hover:border-card-border-hover"
    }`}>
      {/* Replay toggle */}
      <button
        onClick={toggleReplay}
        className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
          isActive
            ? "bg-accent text-background hover:bg-accent-bright"
            : "bg-card-border/60 text-foreground hover:bg-card-border"
        }`}
      >
        {isActive ? (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" rx="0.5"/><rect x="6" y="1" width="3" height="8" rx="0.5"/></svg>
            Exit
          </>
        ) : (
          <>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4V1z"/></svg>
            Replay
          </>
        )}
      </button>

      {isActive && (
        <>
          {/* Step buttons */}
          <button
            onClick={prev}
            disabled={current <= 0}
            className="text-muted hover:text-foreground disabled:opacity-20 disabled:cursor-default transition-colors duration-150 p-1 cursor-pointer"
            title="Previous step"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3L5 7l4 4"/>
            </svg>
          </button>

          {/* Scrubber */}
          <input
            type="range"
            min={0}
            max={total - 1}
            value={current}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="flex-1"
          />

          <button
            onClick={next}
            disabled={current >= total - 1}
            className="text-muted hover:text-foreground disabled:opacity-20 disabled:cursor-default transition-colors duration-150 p-1 cursor-pointer"
            title="Next step"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l4 4-4 4"/>
            </svg>
          </button>

          {/* Step counter */}
          <span className="text-[11px] text-muted font-mono tabular-nums min-w-[3.5rem] text-center">
            <span className="text-foreground-bright">{current + 1}</span>
            <span className="text-muted-dim"> / </span>
            {total}
          </span>

          {/* Divider */}
          <div className="h-4 w-px bg-card-border" />

          {/* Jump to error */}
          {hasErrors && (
            <button
              onClick={jumpToError}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-error/80 hover:text-error transition-colors duration-150 cursor-pointer"
              title="Jump to next error (J)"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-error"><path d="M5 0L10 9H0L5 0z"/></svg>
              Jump to Error
            </button>
          )}
        </>
      )}

      {!isActive && (
        <span className="text-[11px] text-muted font-mono">
          <kbd className="text-foreground/60 bg-card-border/40 px-1 py-0.5 rounded text-[10px]">Left</kbd>
          <kbd className="text-foreground/60 bg-card-border/40 px-1 py-0.5 rounded text-[10px] ml-1">Right</kbd>
          <span className="ml-1.5">step</span>
          <kbd className="text-foreground/60 bg-card-border/40 px-1 py-0.5 rounded text-[10px] ml-2">J</kbd>
          <span className="ml-1.5">jump to error</span>
        </span>
      )}
    </div>
  );
}
