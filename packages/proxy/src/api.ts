import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { getSessions, getSession, getMessages } from "./db.js";

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  if (req.method === "OPTIONS") {
    json(res, null, 204);
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // GET /api/sessions
  if (path === "/api/sessions" && req.method === "GET") {
    json(res, getSessions());
    return;
  }

  // GET /api/sessions/:id
  const sessionMatch = path.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch && req.method === "GET") {
    const session = getSession(sessionMatch[1]);
    if (!session) {
      json(res, { error: "Session not found" }, 404);
      return;
    }
    json(res, session);
    return;
  }

  // GET /api/sessions/:id/messages
  const messagesMatch = path.match(/^\/api\/sessions\/([^/]+)\/messages$/);
  if (messagesMatch && req.method === "GET") {
    const session = getSession(messagesMatch[1]);
    if (!session) {
      json(res, { error: "Session not found" }, 404);
      return;
    }
    json(res, getMessages(messagesMatch[1]));
    return;
  }

  json(res, { error: "Not found" }, 404);
}

export function startApiServer(port: number): void {
  const server = createServer(handleRequest);
  server.listen(port, "127.0.0.1", () => {
    process.stderr.write(
      `AgentLens API: http://127.0.0.1:${port}/api/sessions\n`
    );
  });
}
