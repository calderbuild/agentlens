export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:6382";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:6381";

export interface Session {
  id: string;
  server_command: string;
  started_at: number;
  ended_at: number | null;
  status: "active" | "completed" | "error";
  total_messages: number;
  error_count: number;
}

export interface Message {
  id: number;
  session_id: string;
  direction: "client_to_server" | "server_to_client";
  timestamp: number;
  raw_json: string;
  method: string | null;
  is_error: number;
  latency_ms: number | null;
}

// Paired request + response for timeline nodes
export interface ToolCall {
  id: string;
  method: string;
  request: Message;
  response: Message | null;
  latency_ms: number | null;
  is_error: boolean;
  index: number;
}

export function pairMessages(messages: Message[]): ToolCall[] {
  const calls: ToolCall[] = [];
  const responseByRpcId = new Map<string | number, Message>();

  // Index responses by their JSON-RPC id
  for (const m of messages) {
    if (m.direction === "server_to_client") {
      try {
        const parsed = JSON.parse(m.raw_json);
        if (parsed.id != null && !parsed.method) {
          responseByRpcId.set(parsed.id, m);
        }
      } catch {
        // skip unparseable
      }
    }
  }

  // Match requests to responses by JSON-RPC id
  let index = 0;
  for (const m of messages) {
    if (m.direction !== "client_to_server") continue;
    let rpcId: string | number | null = null;
    try {
      const parsed = JSON.parse(m.raw_json);
      rpcId = parsed.id ?? null;
    } catch {
      // skip
    }

    const resp = rpcId != null ? (responseByRpcId.get(rpcId) ?? null) : null;
    calls.push({
      id: `call-${index}`,
      method: m.method ?? "unknown",
      request: m,
      response: resp,
      latency_ms: resp?.latency_ms ?? null,
      is_error: resp ? resp.is_error === 1 : false,
      index,
    });
    index++;
  }

  return calls;
}

export async function fetchSessions(): Promise<Session[]> {
  const res = await fetch(`${API_BASE}/api/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function fetchSession(id: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${id}`);
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function fetchMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}
