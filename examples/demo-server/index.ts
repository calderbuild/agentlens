// Demo MCP server with multiple tools and an intentional bug for testing AgentLens
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });

function respond(id: string | number, result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function respondError(id: string | number, code: number, message: string) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

const tools = [
  {
    name: "read_file",
    description: "Read a file from disk",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search",
    description: "Search for a pattern in files",
    inputSchema: {
      type: "object",
      properties: { pattern: { type: "string" }, directory: { type: "string" } },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
];

// Simulate latency
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

rl.on("line", async (line) => {
  try {
    const msg = JSON.parse(line);

    if (msg.method === "initialize") {
      respond(msg.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "demo-file-server", version: "0.1.0" },
      });
      return;
    }

    if (msg.method === "notifications/initialized") {
      // No response needed for notifications
      return;
    }

    if (msg.method === "tools/list") {
      respond(msg.id, { tools });
      return;
    }

    if (msg.method === "tools/call") {
      const toolName = msg.params?.name;
      const args = msg.params?.arguments ?? {};

      switch (toolName) {
        case "read_file":
          await delay(50 + Math.random() * 200);
          respond(msg.id, {
            content: [{ type: "text", text: `Contents of ${args.path}:\n# Hello World\nThis is a demo file.` }],
          });
          break;

        case "write_file":
          await delay(30 + Math.random() * 100);
          respond(msg.id, {
            content: [{ type: "text", text: `Written ${args.content?.length ?? 0} bytes to ${args.path}` }],
          });
          break;

        case "search":
          await delay(100 + Math.random() * 300);
          // BUG: If pattern contains "error", return malformed response (missing content array)
          if (args.pattern?.includes("error")) {
            respondError(msg.id, -32000, `Search failed: pattern "${args.pattern}" caused an internal server error`);
          } else {
            respond(msg.id, {
              content: [
                {
                  type: "text",
                  text: `Found 3 matches for "${args.pattern}":\n  src/index.ts:5\n  src/utils.ts:12\n  src/config.ts:8`,
                },
              ],
            });
          }
          break;

        case "run_command":
          await delay(200 + Math.random() * 500);
          respond(msg.id, {
            content: [{ type: "text", text: `$ ${args.command}\nCommand executed successfully.` }],
          });
          break;

        default:
          respondError(msg.id, -32601, `Unknown tool: ${toolName}`);
      }
      return;
    }

    // Unknown method with id -> respond empty
    if (msg.id != null) {
      respond(msg.id, {});
    }
  } catch {
    // ignore non-JSON
  }
});
