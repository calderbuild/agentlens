#!/usr/bin/env node

import { startProxy, generateSessionId } from "./proxy.js";
import { startWsServer, closeWsServer } from "./ws.js";
import { startApiServer } from "./api.js";

const WS_PORT = 6381;
const API_PORT = 6382;
const DASHBOARD_URL = "http://127.0.0.1:3000";

function printUsage(): void {
  process.stderr.write(
    `
AgentLens - MCP Agent Session Replay & Visual Debugger

Usage:
  agentlens -- <command> [args...]

Example:
  agentlens -- node my-mcp-server.js
  agentlens -- python server.py

MCP config:
  { "command": "npx", "args": ["agentlens", "--", "node", "my-server.js"] }

`.trimStart()
  );
}

function main(): void {
  // Parse args: everything after "--" is the child command
  const rawArgs = process.argv.slice(2);
  const separatorIndex = rawArgs.indexOf("--");

  let childArgs: string[];
  if (separatorIndex >= 0) {
    childArgs = rawArgs.slice(separatorIndex + 1);
  } else {
    childArgs = rawArgs;
  }

  if (childArgs.length === 0) {
    printUsage();
    process.exit(1);
  }

  const command = childArgs[0];
  const args = childArgs.slice(1);

  // Start services
  startWsServer(WS_PORT);
  startApiServer(API_PORT);

  const sessionId = generateSessionId();
  process.stderr.write(
    `AgentLens: session ${sessionId} started\n` +
      `AgentLens: WebSocket ws://127.0.0.1:${WS_PORT}\n` +
      `AgentLens: API http://127.0.0.1:${API_PORT}/api/sessions\n` +
      `AgentLens: Dashboard ${DASHBOARD_URL}\n`
  );

  const child = startProxy(command, args, sessionId);

  child.on("exit", (code) => {
    process.stderr.write(
      `AgentLens: session ${sessionId} ended (code ${code})\n`
    );
    closeWsServer();
    // Give a moment for cleanup, then exit with same code
    setTimeout(() => process.exit(code ?? 1), 200);
  });
}

main();
