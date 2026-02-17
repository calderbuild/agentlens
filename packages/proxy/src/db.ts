import Database from "better-sqlite3";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";

const DATA_DIR = join(homedir(), ".agentlens");
const DB_PATH = join(DATA_DIR, "sessions.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      server_command TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      total_messages INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      direction TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      raw_json TEXT NOT NULL,
      method TEXT,
      is_error INTEGER NOT NULL DEFAULT 0,
      latency_ms REAL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_error ON messages(session_id, is_error) WHERE is_error = 1;
  `);
  return db;
}

export interface SessionRow {
  id: string;
  server_command: string;
  started_at: number;
  ended_at: number | null;
  status: string;
  total_messages: number;
  error_count: number;
}

export interface MessageRow {
  id: number;
  session_id: string;
  direction: string;
  timestamp: number;
  raw_json: string;
  method: string | null;
  is_error: number;
  latency_ms: number | null;
}

export function createSession(id: string, serverCommand: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO sessions (id, server_command, started_at, status) VALUES (?, ?, ?, 'active')"
  ).run(id, serverCommand, Date.now());
}

export function endSession(
  id: string,
  status: "completed" | "error"
): void {
  const db = getDb();
  db.prepare(
    "UPDATE sessions SET ended_at = ?, status = ? WHERE id = ?"
  ).run(Date.now(), status, id);
}

export function insertMessage(
  sessionId: string,
  direction: string,
  rawJson: string,
  method: string | null,
  isError: boolean,
  latencyMs: number | null
): void {
  const db = getDb();
  const truncated =
    rawJson.length > 100_000
      ? rawJson.slice(0, 100_000) + "\n...[truncated]"
      : rawJson;
  db.prepare(
    `INSERT INTO messages (session_id, direction, timestamp, raw_json, method, is_error, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    direction,
    Date.now(),
    truncated,
    method,
    isError ? 1 : 0,
    latencyMs
  );
  const col = isError ? "error_count" : "total_messages";
  db.prepare(
    `UPDATE sessions SET total_messages = total_messages + 1${
      isError ? ", error_count = error_count + 1" : ""
    } WHERE id = ?`
  ).run(sessionId);
}

export function getSessions(): SessionRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sessions ORDER BY started_at DESC")
    .all() as SessionRow[];
}

export function getSession(id: string): SessionRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(id) as SessionRow | undefined;
}

export function getMessages(sessionId: string): MessageRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC"
    )
    .all(sessionId) as MessageRow[];
}
