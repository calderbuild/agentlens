"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSessions, formatDuration, formatTimestamp, type Session } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

function StatusBadge({ status }: { status: Session["status"] }) {
  const styles: Record<string, string> = {
    active: "bg-accent-dim text-accent",
    completed: "bg-success-dim text-success",
    error: "bg-error-dim text-error",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[status] ?? "bg-card text-muted"}`}>
      {status}
    </span>
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
      // API not reachable — proxy might not be running
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Refresh list when proxy broadcasts session events
  useWebSocket((msg) => {
    if (msg.event === "session_end" || msg.event === "message") {
      load();
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted">
        <p className="text-lg">No sessions recorded yet</p>
        <p className="text-sm max-w-md text-center">
          Start an MCP server through the AgentLens proxy to begin recording:
        </p>
        <code className="bg-card border border-card-border rounded px-4 py-2 text-sm text-foreground">
          npx agentlens -- node your-server.js
        </code>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Sessions</h1>
      <div className="flex flex-col gap-2">
        {sessions.map((s) => {
          const duration = s.ended_at ? s.ended_at - s.started_at : Date.now() - s.started_at;
          return (
            <Link
              key={s.id}
              href={`/session/${s.id}`}
              className="flex items-center gap-4 bg-card border border-card-border rounded-lg px-5 py-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm text-accent">{s.id}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-sm text-muted truncate">{s.server_command}</p>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted shrink-0">
                <span>{s.total_messages} msgs</span>
                {s.error_count > 0 && (
                  <span className="text-error">{s.error_count} errors</span>
                )}
                <span>{formatDuration(duration)}</span>
                <span>{formatTimestamp(s.started_at)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
