"use client";

import { useState } from "react";
import { JsonView, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { formatDuration, formatTimestamp, type ToolCall } from "@/lib/api";

const MAX_INLINE = 10_000; // bytes before collapsing

function JsonBlock({ label, raw, defaultCollapsed }: { label: string; raw: string; defaultCollapsed?: boolean }) {
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

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-muted uppercase">{label}</span>
        {large && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent hover:underline"
          >
            {expanded ? "Collapse" : `Expand (${(raw.length / 1024).toFixed(1)} KB)`}
          </button>
        )}
      </div>
      {expanded ? (
        <div className="bg-background rounded border border-card-border p-3 overflow-auto max-h-80 text-sm">
          {parseError || !parsed ? (
            <pre className="whitespace-pre-wrap break-all text-xs font-mono">{raw}</pre>
          ) : (
            <JsonView data={parsed} style={{ ...darkStyles, container: "bg-transparent" }} />
          )}
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-accent hover:underline"
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
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Select a node to inspect
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted">#{call.index + 1}</span>
          <span className="font-medium text-sm">{call.method}</span>
          {call.is_error && (
            <span className="text-xs font-medium text-error bg-error-dim px-2 py-0.5 rounded">
              ERROR
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-foreground text-lg leading-none"
          aria-label="Close inspector"
        >
          x
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Meta */}
        <div className="flex gap-4 text-xs text-muted mb-4">
          {call.latency_ms != null && (
            <span>Latency: <span className="text-foreground">{formatDuration(call.latency_ms)}</span></span>
          )}
          <span>Sent: <span className="text-foreground">{formatTimestamp(call.request.timestamp)}</span></span>
          {call.response && (
            <span>Received: <span className="text-foreground">{formatTimestamp(call.response.timestamp)}</span></span>
          )}
        </div>

        {/* Request */}
        <JsonBlock
          label="Request"
          raw={call.request.raw_json}
          defaultCollapsed={call.request.raw_json.length > MAX_INLINE}
        />

        {/* Response */}
        {call.response ? (
          <JsonBlock
            label="Response"
            raw={call.response.raw_json}
            defaultCollapsed={call.response.raw_json.length > MAX_INLINE}
          />
        ) : (
          <div className="text-sm text-muted italic">Awaiting response...</div>
        )}
      </div>
    </div>
  );
}
