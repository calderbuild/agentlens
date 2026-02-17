"use client";

import { formatDuration, type ToolCall, type Session } from "@/lib/api";

function Stat({
  label,
  value,
  icon,
  accent,
  glow,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  glow?: string;
}) {
  return (
    <div className="relative bg-card/80 border border-card-border rounded-xl px-4 py-3 overflow-hidden group hover:border-card-border-hover transition-colors duration-200">
      {glow && <div className={`absolute inset-0 ${glow} opacity-40`} />}
      <div className="relative flex items-center gap-3">
        <div className="text-muted-dim shrink-0">{icon}</div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">{label}</div>
          <div className={`text-xl font-bold font-mono tabular-nums ${accent ?? "text-foreground-bright"}`}>{value}</div>
        </div>
      </div>
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
    <div className="grid grid-cols-4 gap-3 stagger-children">
      <Stat
        label="Tool Calls"
        value={totalCalls}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        }
      />
      <Stat
        label="Duration"
        value={formatDuration(duration)}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
          </svg>
        }
      />
      <Stat
        label="Errors"
        value={errors}
        accent={errors > 0 ? "text-error" : "text-success"}
        glow={errors > 0 ? "bg-gradient-to-br from-error/5 to-transparent" : undefined}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={errors > 0 ? "var(--error)" : "currentColor"} strokeWidth="1.5">
            <path d="M12 9v4m0 4h.01"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        }
      />
      <Stat
        label="Avg Latency"
        value={avgLatency > 0 ? formatDuration(avgLatency) : "--"}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        }
      />
    </div>
  );
}
