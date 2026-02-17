"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import TraceTimeline from "@/components/TraceTimeline";
import Inspector from "@/components/Inspector";
import Stats from "@/components/Stats";
import ReplayController from "@/components/ReplayController";

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const { session, calls, loading, error, connected } = useSession(id);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [replayStep, setReplayStep] = useState<number | null>(null);

  const handleReplayStep = (step: number | null) => {
    setReplayStep(step);
    if (step !== null && calls[step]) {
      setSelectedCallId(calls[step].id);
    }
  };

  const selectedCall = calls.find((c) => c.id === selectedCallId) ?? null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-4 rounded-full" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="skeleton h-[72px]" />
          <div className="skeleton h-[72px]" />
          <div className="skeleton h-[72px]" />
          <div className="skeleton h-[72px]" />
        </div>
        <div className="skeleton h-10 mb-4" />
        <div className="skeleton h-[400px]" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 animate-fade-in">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-error/60">
          <circle cx="12" cy="12" r="9"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <p className="text-sm text-error font-mono">{error ?? "Session not found"}</p>
        <Link
          href="/"
          className="text-xs text-accent hover:text-accent-bright transition-colors font-mono cursor-pointer"
        >
          Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] gap-3 max-w-full animate-fade-in">
      {/* Breadcrumb + connection status */}
      <div className="flex items-center justify-between shrink-0">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Sessions
          </Link>
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-dim">
            <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span className="font-mono text-accent text-sm">{session.id}</span>
          <span className="text-xs text-muted truncate max-w-[300px] hidden sm:inline">
            {session.server_command}
          </span>
        </nav>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-muted-dim"}`} />
          <span className="text-[11px] font-mono text-muted">
            {connected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <Stats session={session} calls={calls} />

      {/* Replay bar */}
      <ReplayController
        calls={calls}
        step={replayStep}
        onStepChange={handleReplayStep}
      />

      {/* Main area: Timeline + Inspector side-by-side */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Timeline - takes remaining space */}
        <div className="flex-1 bg-card/60 border border-card-border rounded-xl overflow-hidden min-w-0">
          <TraceTimeline
            calls={calls}
            selectedCallId={selectedCallId}
            onSelectCall={setSelectedCallId}
            replayStep={replayStep}
          />
        </div>

        {/* Inspector - fixed width, always rendered to avoid layout shift */}
        <div className={`w-[380px] shrink-0 bg-card/60 border border-card-border rounded-xl overflow-hidden transition-opacity duration-200 ${
          selectedCall ? "opacity-100" : "opacity-100"
        }`}>
          <Inspector call={selectedCall} onClose={() => setSelectedCallId(null)} />
        </div>
      </div>
    </div>
  );
}
