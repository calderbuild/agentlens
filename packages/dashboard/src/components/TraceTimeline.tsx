"use client";

import { useMemo, useCallback, memo } from "react";
import {
  ReactFlow,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { formatDuration, type ToolCall } from "@/lib/api";

// ---- Custom Node ----

type ToolNodeData = {
  method: string;
  latency: string;
  isError: boolean;
  isPending: boolean;
  dimmed: boolean;
  index: number;
  isSelected: boolean;
};

const ToolNode = memo(function ToolNode({ data }: NodeProps) {
  const d = data as unknown as ToolNodeData;

  const borderColor = d.isError
    ? "border-error/60"
    : d.isPending
      ? "border-accent/40"
      : d.isSelected
        ? "border-accent/60"
        : "border-card-border-hover";

  const bgColor = d.isError
    ? "bg-error-dim/80"
    : d.isPending
      ? "bg-accent-dim/60"
      : "bg-card/90";

  const glowStyle = d.isError && !d.dimmed
    ? { boxShadow: "0 0 20px rgba(244, 63, 94, 0.15), inset 0 1px 0 rgba(244, 63, 94, 0.1)" }
    : d.isSelected && !d.dimmed
      ? { boxShadow: "0 0 20px rgba(6, 182, 212, 0.1), inset 0 1px 0 rgba(255,255,255,0.03)" }
      : { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)" };

  return (
    <div
      className={`
        rounded-xl border ${borderColor} ${bgColor}
        ${d.dimmed ? "opacity-25" : ""}
        ${d.isError && !d.dimmed ? "node-error-pulse" : ""}
        px-4 py-3 min-w-[180px] node-fade-in cursor-pointer
        backdrop-blur-sm transition-all duration-150
        hover:border-accent/40
      `}
      style={glowStyle}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-dim !w-2 !h-2 !border-0" />

      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-muted-dim tabular-nums">#{d.index + 1}</span>
        <span className="text-[13px] font-medium truncate max-w-[140px] text-foreground-bright">{d.method}</span>
      </div>

      {/* Status + latency row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {d.isError && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-error" />
              <span className="text-[11px] font-mono font-medium text-error">ERROR</span>
            </>
          )}
          {d.isPending && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-mono text-accent">pending</span>
            </>
          )}
          {!d.isPending && !d.isError && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-[11px] font-mono text-success/80">OK</span>
            </>
          )}
        </div>
        {d.latency !== "" && (
          <span className="text-[11px] font-mono text-muted tabular-nums">{d.latency}</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-muted-dim !w-2 !h-2 !border-0" />
    </div>
  );
});

const nodeTypes = { tool: ToolNode };

// ---- Layout ----

const NODE_W = 210;
const GAP_X = 50;
const GAP_Y = 40;

function buildGraph(
  calls: ToolCall[],
  replayStep: number | null,
  selectedCallId: string | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    const dimmed = replayStep !== null && i > replayStep;
    const isSelected = c.id === selectedCallId || (replayStep !== null && i === replayStep);

    nodes.push({
      id: c.id,
      type: "tool",
      position: { x: i * (NODE_W + GAP_X), y: GAP_Y },
      data: {
        method: c.method,
        latency: c.latency_ms != null ? formatDuration(c.latency_ms) : "",
        isError: c.is_error,
        isPending: c.response === null,
        dimmed,
        index: c.index,
        isSelected,
      } satisfies ToolNodeData,
      selected: isSelected,
    });

    if (i > 0) {
      const prevError = calls[i - 1].is_error;
      const currError = c.is_error;
      edges.push({
        id: `e-${i - 1}-${i}`,
        source: calls[i - 1].id,
        target: c.id,
        animated: !dimmed && c.response === null,
        style: {
          stroke: dimmed
            ? "#1e293b"
            : currError || prevError
              ? "var(--error)"
              : "var(--accent)",
          strokeWidth: dimmed ? 1 : 1.5,
          opacity: dimmed ? 0.3 : 0.6,
        },
      });
    }
  }

  return { nodes, edges };
}

// ---- Component ----

interface TraceTimelineProps {
  calls: ToolCall[];
  selectedCallId: string | null;
  onSelectCall: (id: string | null) => void;
  replayStep: number | null;
}

export default function TraceTimeline({
  calls,
  selectedCallId,
  onSelectCall,
  replayStep,
}: TraceTimelineProps) {
  const { nodes, edges } = useMemo(
    () => buildGraph(calls, replayStep, selectedCallId),
    [calls, replayStep, selectedCallId]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectCall(node.id === selectedCallId ? null : node.id);
    },
    [onSelectCall, selectedCallId]
  );

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-dim animate-pulse">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 7v5l3 3"/>
        </svg>
        <span className="text-sm font-mono">Waiting for tool calls...</span>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.4 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      minZoom={0.15}
      maxZoom={2.5}
    >
      <Controls showInteractive={false} position="bottom-left" />
      {/* Subtle dot grid instead of lines */}
      <svg>
        <defs>
          <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="var(--grid-dot)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
    </ReactFlow>
  );
}
