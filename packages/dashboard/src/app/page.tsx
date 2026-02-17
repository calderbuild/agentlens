"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSessions, formatDuration, formatTimestamp, type Session } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

function StatusIndicator({ status }: { status: Session["status"] }) {
  const config: Record<string, { dot: string; text: string; label: string }> = {
    active: { dot: "bg-accent animate-pulse", text: "text-accent", label: "LIVE" },
    completed: { dot: "bg-success", text: "text-success", label: "DONE" },
    error: { dot: "bg-error", text: "text-error", label: "FAIL" },
  };
  const c = config[status] ?? config.completed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-medium tracking-wider uppercase ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function SessionCard({ session }: { session: Session }) {
  const duration = session.ended_at ? session.ended_at - session.started_at : Date.now() - session.started_at;
  const hasErrors = session.error_count > 0;

  return (
    <Link
      href={`/session/${session.id}`}
      className="group relative block bg-card/80 border border-card-border rounded-xl px-5 py-4 hover:border-card-border-hover hover:bg-card-hover/50 transition-all duration-200 cursor-pointer"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-accent/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <code className="text-sm font-mono font-medium text-accent">{session.id}</code>
            <StatusIndicator status={session.status} />
          </div>
          <p className="text-xs text-muted truncate font-mono">{session.server_command}</p>
        </div>

        <div className="flex items-center gap-5 text-xs text-muted shrink-0 pt-0.5">
          <div className="text-right">
            <div className="font-mono text-foreground">{session.total_messages}</div>
            <div className="text-[10px]">msgs</div>
          </div>
          {hasErrors && (
            <div className="text-right">
              <div className="font-mono text-error">{session.error_count}</div>
              <div className="text-[10px] text-error/60">errors</div>
            </div>
          )}
          <div className="text-right">
            <div className="font-mono text-foreground">{formatDuration(duration)}</div>
            <div className="text-[10px]">duration</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-foreground">{formatTimestamp(session.started_at)}</div>
            <div className="text-[10px]">started</div>
          </div>

          {/* Arrow */}
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-muted-dim group-hover:text-accent transition-colors">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      // API not reachable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useWebSocket((msg) => {
    if (msg.event === "session_end" || msg.event === "message") {
      load();
    }
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="skeleton h-6 w-32 mb-6" />
        <div className="flex flex-col gap-3">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5 text-muted animate-fade-in">
        <div className="relative">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-muted-dim">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1"/>
            <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3"/>
          </svg>
          <div className="absolute inset-0 blur-xl bg-accent/10 rounded-full" />
        </div>
        <p className="text-base text-foreground">No sessions recorded yet</p>
        <p className="text-sm text-muted max-w-sm text-center leading-relaxed">
          Start an MCP server through the AgentLens proxy to begin recording sessions.
        </p>
        <code className="bg-card border border-card-border rounded-lg px-5 py-3 text-sm font-mono text-accent">
          npx agentlens -- node your-server.js
        </code>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground-bright">Sessions</h1>
        <span className="text-xs font-mono text-muted">{sessions.length} recorded</span>
      </div>
      <div className="flex flex-col gap-2.5 stagger-children">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
