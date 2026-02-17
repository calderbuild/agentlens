"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchSession,
  fetchMessages,
  pairMessages,
  type Session,
  type Message,
  type ToolCall,
} from "@/lib/api";
import { useWebSocket } from "./useWebSocket";

interface UseSessionReturn {
  session: Session | null;
  messages: Message[];
  calls: ToolCall[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export function useSession(sessionId: string): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, m] = await Promise.all([
          fetchSession(sessionId),
          fetchMessages(sessionId),
        ]);
        if (cancelled) return;
        setSession(s);
        setMessages(m);
        messagesRef.current = m;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Real-time updates via WebSocket
  const onWsMessage = useCallback(
    (msg: { event: string; data: Record<string, unknown> }) => {
      if (msg.event === "message" && msg.data.session_id === sessionId) {
        const newMsg: Message = {
          id: Date.now(), // temp id
          session_id: sessionId,
          direction: msg.data.direction as Message["direction"],
          timestamp: msg.data.timestamp as number,
          raw_json: msg.data.raw_json as string,
          method: (msg.data.method as string) ?? null,
          is_error: msg.data.is_error ? 1 : 0,
          latency_ms: (msg.data.latency_ms as number) ?? null,
        };
        const updated = [...messagesRef.current, newMsg];
        messagesRef.current = updated;
        setMessages(updated);
      }

      if (msg.event === "session_end" && msg.data.session_id === sessionId) {
        setSession((prev) =>
          prev ? { ...prev, status: "completed", ended_at: Date.now() } : prev
        );
      }
    },
    [sessionId]
  );

  const { connected } = useWebSocket(onWsMessage);

  const calls = pairMessages(messages);

  return { session, messages, calls, loading, error, connected };
}
