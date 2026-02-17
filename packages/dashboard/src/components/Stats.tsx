"use client";

import { formatDuration, type ToolCall, type Session } from "@/lib/api";

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-lg px-4 py-3">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-lg font-semibold font-mono ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

interface StatsProps {
  session: Session;
  calls: ToolCall[];
}

export default function Stats({ session, calls }: StatsProps) {
  const totalCalls = calls.length;
  const errors = calls.filter((c) => c.is_error).length;
  const latencies = calls.map((c) => c.latency_ms).filter((l): l is number => l != null);
  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;
  const duration = (session.ended_at ?? Date.now()) - session.started_at;

  return (
    <div className="grid grid-cols-4 gap-3">
      <Stat label="Tool Calls" value={totalCalls} />
      <Stat label="Duration" value={formatDuration(duration)} />
      <Stat
        label="Errors"
        value={errors}
        accent={errors > 0 ? "text-error" : "text-success"}
      />
      <Stat label="Avg Latency" value={avgLatency > 0 ? formatDuration(avgLatency) : "--"} />
    </div>
  );
}
