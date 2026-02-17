// Simple MCP-like server that responds to JSON-RPC for testing
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "test-server", version: "0.1.0" },
        },
      };
      process.stdout.write(JSON.stringify(response) + "\n");
    } else if (msg.method === "tools/list") {
      const response = {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          tools: [
            {
              name: "greet",
              description: "Greet someone",
              inputSchema: {
                type: "object",
                properties: { name: { type: "string" } },
                required: ["name"],
              },
            },
          ],
        },
      };
      process.stdout.write(JSON.stringify(response) + "\n");
    } else if (msg.method === "tools/call") {
      const toolName = msg.params?.name;
      if (toolName === "greet") {
        const name = msg.params?.arguments?.name ?? "World";
        const response = {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            content: [{ type: "text", text: `Hello, ${name}!` }],
          },
        };
        process.stdout.write(JSON.stringify(response) + "\n");
      } else {
        const response = {
          jsonrpc: "2.0",
          id: msg.id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        };
        process.stdout.write(JSON.stringify(response) + "\n");
      }
    } else if (msg.method) {
      // notification or unknown method - just respond with empty result
      if (msg.id != null) {
        process.stdout.write(
          JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: {} }) + "\n"
        );
      }
    }
  } catch {
    // ignore non-JSON lines
  }
});
