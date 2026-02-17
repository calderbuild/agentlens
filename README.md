# AgentLens

MCP Agent Session Replay & Visual Debugger.

AgentLens sits between your MCP client and server as a transparent stdio proxy. It records every JSON-RPC message, then provides a real-time dashboard to visualize, inspect, and replay the full session.

## How It Works

```
MCP Client  <-->  AgentLens Proxy (stdio)  <-->  MCP Server
                       |
                  SQLite + WebSocket
                       |
                  Dashboard (browser)
```

The proxy intercepts all stdin/stdout traffic between client and server, parses JSON-RPC 2.0 messages, and stores them in a local SQLite database. A WebSocket server broadcasts new messages in real-time. The dashboard connects to both the REST API and WebSocket to render an interactive trace timeline.

## Quick Start

```bash
# Install dependencies
npm install

# Build the proxy
npm run build --workspace=packages/proxy

# Wrap any MCP server command
npx agentlens -- node my-mcp-server.js

# Start the dashboard (in another terminal)
npm run dev --workspace=packages/dashboard
```

Open `http://localhost:3000` to see recorded sessions.

## MCP Client Configuration

Drop AgentLens in front of any MCP server by wrapping the command:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["agentlens", "--", "node", "my-server.js"]
    }
  }
}
```

All messages flow through transparently. The server works exactly as before, but every request and response is now recorded.

## Dashboard Features

**Session List** -- Browse all recorded sessions with status, message count, error count, and duration.

**Trace Timeline** -- Visual node graph of every tool call in sequence. Error nodes pulse red. Click any node to inspect.

**Inspector Panel** -- View the full JSON-RPC request and response for any tool call, with syntax highlighting. See latency, timestamps, and error details.

**Replay Mode** -- Step through tool calls one by one with a scrubber. Nodes ahead of the current step are dimmed. Use arrow keys to step, press `J` to jump to the next error.

**Real-time Updates** -- When a session is active, new tool calls appear in the timeline as they happen via WebSocket.

## Architecture

```
packages/
  proxy/          # stdio proxy + SQLite + WebSocket + REST API
    src/
      proxy.ts    # spawn child process, intercept stdin/stdout
      db.ts       # SQLite with WAL mode, sessions + messages tables
      ws.ts       # WebSocket server (port 6381)
      api.ts      # HTTP REST API (port 6382)
      index.ts    # CLI entry point
  dashboard/      # Next.js web UI
    src/
      app/        # pages (session list, session detail)
      components/ # TraceTimeline, Inspector, Stats, ReplayController
      hooks/      # useSession, useWebSocket
      lib/        # API client, message pairing logic
```

## Tech Stack

- **Proxy**: Node.js, TypeScript, better-sqlite3 (WAL mode), ws
- **Dashboard**: Next.js 16, React 19, Tailwind CSS 4, @xyflow/react, react-json-view-lite
- **Transport**: JSON-RPC 2.0 over stdio, WebSocket for live updates, REST for historical data

## Ports

| Service   | Port | Purpose                    |
|-----------|------|----------------------------|
| WebSocket | 6381 | Real-time message broadcast |
| REST API  | 6382 | Session and message queries  |
| Dashboard | 3000 | Web UI                      |

## Development

```bash
# Watch mode for proxy
npm run dev --workspace=packages/proxy

# Dev server for dashboard
npm run dev --workspace=packages/dashboard

# Run the demo server through the proxy
npx agentlens -- npx tsx examples/demo-server/index.ts
```

## License

MIT
