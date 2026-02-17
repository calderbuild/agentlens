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
      onStepChange(null); // exit replay
    } else {
      onStepChange(s + 1);
    }
  }, [step, total, onStepChange]);

  const jumpToError = useCallback(() => {
    if (total === 0) return;
    const start = step != null ? step + 1 : 0;
    for (let i = start; i < total; i++) {
      if (calls[i].is_error) {
        onStepChange(i);
        return;
      }
    }
    // Wrap around
    for (let i = 0; i < (step ?? total); i++) {
      if (calls[i].is_error) {
        onStepChange(i);
        return;
      }
    }
  }, [calls, step, total, onStepChange]);

  const toggleReplay = useCallback(() => {
    onStepChange(isActive ? null : 0);
  }, [isActive, onStepChange]);

  // Keyboard shortcuts
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
    <div className="flex items-center gap-3 bg-card border border-card-border rounded-lg px-4 py-2">
      <button
        onClick={toggleReplay}
        className={`text-xs font-medium px-3 py-1 rounded ${
          isActive
            ? "bg-accent text-white"
            : "bg-card-border text-foreground hover:bg-accent/20"
        }`}
      >
        {isActive ? "Exit Replay" : "Replay"}
      </button>

      {isActive && (
        <>
          <button onClick={prev} disabled={current <= 0} className="text-muted hover:text-foreground disabled:opacity-30">
            Prev
          </button>

          {/* Scrubber */}
          <input
            type="range"
            min={0}
            max={total - 1}
            value={current}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="flex-1 accent-accent h-1"
          />

          <button onClick={next} disabled={current >= total - 1} className="text-muted hover:text-foreground disabled:opacity-30">
            Next
          </button>

          <span className="text-xs text-muted font-mono">
            {current + 1}/{total}
          </span>

          {hasErrors && (
            <button
              onClick={jumpToError}
              className="text-xs text-error hover:underline ml-2"
              title="Jump to next error (J)"
            >
              Jump to Error
            </button>
          )}
        </>
      )}

      {!isActive && (
        <span className="text-xs text-muted">
          Arrow keys to step, J to jump to error
        </span>
      )}
    </div>
  );
}
