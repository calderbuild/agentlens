"use client";

import { useMemo, useCallback, memo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
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
  dimmed: boolean; // for replay: nodes after current step
  index: number;
};

const ToolNode = memo(function ToolNode({ data }: NodeProps) {
  const d = data as unknown as ToolNodeData;
  const border = d.isError
    ? "border-error"
    : d.isPending
      ? "border-accent animate-pulse"
      : "border-success";
  const bg = d.isError
    ? "bg-error-dim"
    : d.isPending
      ? "bg-accent-dim"
      : "bg-success-dim";
  const opacity = d.dimmed ? "opacity-30" : "";
  const pulse = d.isError && !d.dimmed ? "node-error-pulse" : "";

  return (
    <div
      className={`rounded-lg border ${border} ${bg} ${opacity} ${pulse} px-4 py-3 min-w-[160px] node-fade-in cursor-pointer`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono text-muted">#{d.index + 1}</span>
        <span className="text-sm font-medium truncate max-w-[140px]">{d.method}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        {d.isError && <span className="text-error font-medium">ERROR</span>}
        {d.isPending && <span className="text-accent">pending...</span>}
        {!d.isPending && !d.isError && <span className="text-success">OK</span>}
        {d.latency !== "" && <span>{d.latency}</span>}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-muted !w-2 !h-2" />
    </div>
  );
});

const nodeTypes = { tool: ToolNode };

// ---- Layout helpers ----

const NODE_W = 200;
const NODE_H = 80;
const GAP_X = 60;
const GAP_Y = 30;

function buildGraph(
  calls: ToolCall[],
  replayStep: number | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];
    const dimmed = replayStep !== null && i > replayStep;
    const selected = replayStep !== null && i === replayStep;

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
      } satisfies ToolNodeData,
      selected,
    });

    if (i > 0) {
      edges.push({
        id: `e-${i - 1}-${i}`,
        source: calls[i - 1].id,
        target: c.id,
        animated: !dimmed && c.response === null,
        style: {
          stroke: dimmed ? "#333" : c.is_error ? "#ef4444" : "#3b82f6",
          strokeWidth: 2,
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
    () => buildGraph(calls, replayStep),
    [calls, replayStep]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectCall(node.id === selectedCallId ? null : node.id);
    },
    [onSelectCall, selectedCallId]
  );

  if (calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Waiting for tool calls...
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
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
    >
      <Controls showInteractive={false} />
      <Background color="#1a1a1a" gap={20} />
    </ReactFlow>
  );
}
