import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function startWsServer(port: number): WebSocketServer {
  wss = new WebSocketServer({ port, host: "127.0.0.1" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  return wss;
}

export function broadcast(event: string, data: unknown): void {
  const payload = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function closeWsServer(): void {
  if (wss) {
    for (const client of clients) {
      client.close();
    }
    clients.clear();
    wss.close();
    wss = null;
  }
}
