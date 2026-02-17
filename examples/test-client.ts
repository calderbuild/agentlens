// Simulates an MCP client sending JSON-RPC messages to the proxy's stdin
// Usage: node test-client.js | node proxy-dist/index.js -- node demo-server-compiled.js

import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });

// Read responses from stdout
rl.on("line", (line) => {
  process.stderr.write(`[client] received: ${line.slice(0, 120)}\n`);
});

function send(msg: object) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  // 1. Initialize
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {} } });
  await delay(300);

  // 2. List tools
  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  await delay(300);

  // 3. Read a file
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read_file", arguments: { path: "src/index.ts" } } });
  await delay(500);

  // 4. Search for a pattern (success)
  send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search", arguments: { pattern: "function" } } });
  await delay(500);

  // 5. Write a file
  send({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "write_file", arguments: { path: "output.txt", content: "Hello AgentLens!" } } });
  await delay(300);

  // 6. Run a command
  send({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "run_command", arguments: { command: "ls -la" } } });
  await delay(600);

  // 7. Search with "error" pattern - triggers the bug!
  send({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "search", arguments: { pattern: "error handler" } } });
  await delay(500);

  // 8. Read another file
  send({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "read_file", arguments: { path: "README.md" } } });
  await delay(500);

  // Done - close
  process.exit(0);
}

run();
