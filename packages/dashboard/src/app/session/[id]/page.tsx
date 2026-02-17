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

  // Sync selection with replay step
  const handleReplayStep = (step: number | null) => {
    setReplayStep(step);
    if (step !== null && calls[step]) {
      setSelectedCallId(calls[step].id);
    }
  };

  const selectedCall = calls.find((c) => c.id === selectedCallId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        Loading session...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">{error ?? "Session not found"}</p>
        <Link href="/" className="text-accent hover:underline text-sm">
          Back to sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] gap-4">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <Link href="/" className="text-muted hover:text-foreground text-sm">
          Sessions
        </Link>
        <span className="text-muted">/</span>
        <span className="font-mono text-accent text-sm">{session.id}</span>
        <span className="text-sm text-muted truncate">{session.server_command}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-error"}`} />
          <span className="text-xs text-muted">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>

      {/* Stats */}
      <Stats session={session} calls={calls} />

      {/* Replay Controls */}
      <ReplayController
        calls={calls}
        step={replayStep}
        onStepChange={handleReplayStep}
      />

      {/* Main area: Timeline + Inspector */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Timeline */}
        <div className="flex-1 bg-card border border-card-border rounded-lg overflow-hidden">
          <TraceTimeline
            calls={calls}
            selectedCallId={selectedCallId}
            onSelectCall={setSelectedCallId}
            replayStep={replayStep}
          />
        </div>

        {/* Inspector */}
        {selectedCall && (
          <div className="w-[400px] shrink-0 bg-card border border-card-border rounded-lg overflow-hidden">
            <Inspector call={selectedCall} onClose={() => setSelectedCallId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
