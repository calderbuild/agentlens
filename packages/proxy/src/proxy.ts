import { spawn, ChildProcess } from "node:child_process";
import { createSession, endSession, insertMessage } from "./db.js";
import { broadcast } from "./ws.js";
import { randomUUID } from "node:crypto";

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  params?: unknown;
}

function tryParseJsonRpc(data: string): JsonRpcMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === "object") {
      return parsed as JsonRpcMessage;
    }
  } catch {
    // not valid JSON
  }
  return null;
}

// Track pending requests to compute latency
const pendingRequests = new Map<
  string | number,
  { method: string; timestamp: number }
>();

export function startProxy(
  command: string,
  args: string[],
  sessionId: string
): ChildProcess {
  const serverCommand = [command, ...args].join(" ");
  createSession(sessionId, serverCommand);

  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env },
  });

  // Buffer for incomplete JSON-RPC messages (newline-delimited)
  let clientBuffer = "";
  let serverBuffer = "";

  function processBuffer(
    buffer: string,
    direction: "client_to_server" | "server_to_client"
  ): string {
    const lines = buffer.split("\n");
    // last element might be incomplete
    const remaining = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const msg = tryParseJsonRpc(trimmed);
      if (!msg) continue;

      let method: string | null = msg.method ?? null;
      let isError = false;
      let latencyMs: number | null = null;

      if (direction === "client_to_server" && msg.method && msg.id != null) {
        // Request from client - track for latency
        pendingRequests.set(msg.id, {
          method: msg.method,
          timestamp: Date.now(),
        });
      }

      if (
        direction === "server_to_client" &&
        msg.id != null &&
        !msg.method
      ) {
        // Response from server - compute latency
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          latencyMs = Date.now() - pending.timestamp;
          method = pending.method;
          pendingRequests.delete(msg.id);
        }
        if (msg.error) {
          isError = true;
        }
      }

      insertMessage(sessionId, direction, trimmed, method, isError, latencyMs);

      broadcast("message", {
        session_id: sessionId,
        direction,
        timestamp: Date.now(),
        method,
        is_error: isError,
        latency_ms: latencyMs,
        raw_json: trimmed.length > 2000 ? trimmed.slice(0, 2000) + "..." : trimmed,
      });
    }

    return remaining;
  }

  // Client (stdin) -> Proxy -> Server
  process.stdin.on("data", (data: Buffer) => {
    const str = data.toString();
    clientBuffer += str;
    clientBuffer = processBuffer(clientBuffer, "client_to_server");

    // Forward to child process
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.write(data);
    }
  });

  // Server -> Proxy -> Client (stdout)
  child.stdout?.on("data", (data: Buffer) => {
    const str = data.toString();
    serverBuffer += str;
    serverBuffer = processBuffer(serverBuffer, "server_to_client");

    // Forward to parent (MCP client)
    process.stdout.write(data);
  });

  process.stdin.on("end", () => {
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.end();
    }
  });

  child.on("exit", (code) => {
    endSession(sessionId, code === 0 ? "completed" : "error");
    broadcast("session_end", { session_id: sessionId, code });
  });

  child.on("error", (err) => {
    process.stderr.write(`AgentLens: child process error: ${err.message}\n`);
    endSession(sessionId, "error");
  });

  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });

  return child;
}

export function generateSessionId(): string {
  return randomUUID().slice(0, 8);
}
