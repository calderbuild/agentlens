"use client";

import { useState } from "react";
import { JsonView, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { formatDuration, formatTimestamp, type ToolCall } from "@/lib/api";

const MAX_INLINE = 10_000;

function JsonBlock({ label, raw, direction, defaultCollapsed }: {
  label: string;
  raw: string;
  direction: "request" | "response";
  defaultCollapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const large = raw.length > MAX_INLINE;

  let parsed: object | unknown[] | null = null;
  let parseError = false;
  try {
    const result = JSON.parse(raw);
    if (result && typeof result === "object") {
      parsed = result;
    } else {
      parseError = true;
    }
  } catch {
    parseError = true;
  }

  const accentColor = direction === "request" ? "text-accent" : "text-success";
  const borderAccent = direction === "request" ? "border-l-accent/30" : "border-l-success/30";

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={accentColor}>
          {direction === "request" ? (
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <path d="M10 6H2M5 3L2 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
        <span className={`text-[10px] font-mono font-medium uppercase tracking-wider ${accentColor}`}>{label}</span>
        {large && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-mono text-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
          >
            {expanded ? "collapse" : `expand (${(raw.length / 1024).toFixed(1)}KB)`}
          </button>
        )}
      </div>
      {expanded ? (
        <div className={`bg-background/80 rounded-lg border border-card-border border-l-2 ${borderAccent} p-3 overflow-auto max-h-72 text-sm`}>
          {parseError || !parsed ? (
            <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted">{raw}</pre>
          ) : (
            <JsonView data={parsed} style={{ ...darkStyles, container: "bg-transparent" }} />
          )}
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="text-[11px] font-mono text-muted hover:text-accent transition-colors duration-150 cursor-pointer"
        >
          Click to expand ({(raw.length / 1024).toFixed(1)} KB)
        </button>
      )}
    </div>
  );
}

interface InspectorProps {
  call: ToolCall | null;
  onClose: () => void;
}

export default function Inspector({ call, onClose }: InspectorProps) {
  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-dim">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <span className="text-xs font-mono">Select a node to inspect</span>
      </div>
    );
  }

  const isError = call.is_error;

  return (
    <div className="h-full flex flex-col overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
        isError ? "border-error/20 bg-error-dim/30" : "border-card-border bg-card/50"
      }`}>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-muted tabular-nums">#{call.index + 1}</span>
          <span className="font-medium text-sm text-foreground-bright">{call.method}</span>
          {isError && (
            <span className="text-[10px] font-mono font-semibold text-error bg-error-dim px-1.5 py-0.5 rounded">
              ERROR
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground transition-colors duration-150 p-1 rounded hover:bg-card-border/30 cursor-pointer"
          aria-label="Close inspector"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Meta stats */}
        <div className="flex gap-4 mb-5">
          {call.latency_ms != null && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted mb-0.5">Latency</div>
              <div className="text-sm font-mono font-medium text-foreground-bright">{formatDuration(call.latency_ms)}</div>
            </div>
          )}
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted mb-0.5">Sent</div>
            <div className="text-sm font-mono text-foreground">{formatTimestamp(call.request.timestamp)}</div>
          </div>
          {call.response && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted mb-0.5">Received</div>
              <div className="text-sm font-mono text-foreground">{formatTimestamp(call.response.timestamp)}</div>
            </div>
          )}
        </div>

        {/* Request */}
        <JsonBlock
          label="Request"
          raw={call.request.raw_json}
          direction="request"
          defaultCollapsed={call.request.raw_json.length > MAX_INLINE}
        />

        {/* Response */}
        {call.response ? (
          <JsonBlock
            label="Response"
            raw={call.response.raw_json}
            direction="response"
            defaultCollapsed={call.response.raw_json.length > MAX_INLINE}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Awaiting response...
          </div>
        )}
      </div>
    </div>
  );
}
