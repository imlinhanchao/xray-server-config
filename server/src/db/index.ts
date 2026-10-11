import Database from 'better-sqlite3';
import fs from 'node:fs';
import { CONFIG } from '../config.js';

export interface ServerRow {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'privateKey';
  password: string | null;
  private_key: string | null;
  passphrase: string | null;
  remote_path: string;
  post_command: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoryRow {
  id: number;
  version: number;
  title: string;
  description: string | null;
  content: string;
  operator: string;
  action_type: 'edit' | 'pull' | 'rollback' | 'push' | 'initial';
  server_id: number | null;
  server_name: string | null;
  created_at: string;
}

export const db = new Database(CONFIG.DB_PATH);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL DEFAULT 'root',
      auth_type TEXT NOT NULL CHECK(auth_type IN ('password', 'privateKey')),
      password TEXT,
      private_key TEXT,
      passphrase TEXT,
      remote_path TEXT NOT NULL DEFAULT '/usr/local/etc/xray/config.json',
      post_command TEXT DEFAULT 'systemctl restart xray',
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      operator TEXT NOT NULL DEFAULT 'admin',
      action_type TEXT NOT NULL CHECK(action_type IN ('edit', 'pull', 'rollback', 'push', 'initial')),
      server_id INTEGER,
      server_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_version ON history(version DESC);
    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
  `);

  // Check if history is empty. If so, seed initial record from config.json if it exists
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM history');
  const result = countStmt.get() as { count: number };

  if (result.count === 0 && fs.existsSync(CONFIG.CONFIG_FILE_PATH)) {
    try {
      const content = fs.readFileSync(CONFIG.CONFIG_FILE_PATH, 'utf-8');
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO history (version, title, description, content, operator, action_type, created_at)
        VALUES (1, '初始配置导入', '系统初次启动自动载入现有 config.json', ?, 'admin', 'initial', ?)
      `).run(content, now);
      console.log('Seeded initial config.json history record (version 1)');
    } catch (err) {
      console.error('Failed to seed initial history record:', err);
    }
  }
}

// Server CRUD Helpers
export function getAllServers(): ServerRow[] {
  return db.prepare('SELECT * FROM servers ORDER BY id DESC').all() as ServerRow[];
}

export function getServerById(id: number): ServerRow | undefined {
  return db.prepare('SELECT * FROM servers WHERE id = ?').get(id) as ServerRow | undefined;
}

export function createServer(data: Omit<ServerRow, 'id' | 'created_at' | 'updated_at'>): ServerRow {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO servers (name, host, port, username, auth_type, password, private_key, passphrase, remote_path, post_command, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.name,
    data.host,
    data.port || 22,
    data.username || 'root',
    data.auth_type,
    data.password || null,
    data.private_key || null,
    data.passphrase || null,
    data.remote_path || '/usr/local/etc/xray/config.json',
    data.post_command || null,
    data.description || null,
    now,
    now
  );
  return getServerById(Number(info.lastInsertRowid))!;
}

export function updateServer(id: number, data: Partial<Omit<ServerRow, 'id' | 'created_at' | 'updated_at'>>): ServerRow | undefined {
  const existing = getServerById(id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  const updated: ServerRow = {
    ...existing,
    ...data,
    updated_at: now,
  };

  db.prepare(`
    UPDATE servers
    SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, password = ?, private_key = ?, passphrase = ?, remote_path = ?, post_command = ?, description = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.host,
    updated.port,
    updated.username,
    updated.auth_type,
    updated.password,
    updated.private_key,
    updated.passphrase,
    updated.remote_path,
    updated.post_command,
    updated.description,
    now,
    id
  );

  return getServerById(id);
}

export function deleteServer(id: number): boolean {
  const info = db.prepare('DELETE FROM servers WHERE id = ?').run(id);
  return info.changes > 0;
}

// History Helpers
export function getNextVersionNumber(): number {
  const row = db.prepare('SELECT MAX(version) as max_v FROM history').get() as { max_v: number | null };
  return (row.max_v || 0) + 1;
}

export function createHistoryRecord(data: {
  title: string;
  description?: string;
  content: string;
  operator?: string;
  action_type: 'edit' | 'pull' | 'rollback' | 'push' | 'initial';
  server_id?: number | null;
  server_name?: string | null;
}): HistoryRow {
  const version = getNextVersionNumber();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO history (version, title, description, content, operator, action_type, server_id, server_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    version,
    data.title,
    data.description || null,
    data.content,
    data.operator || 'admin',
    data.action_type,
    data.server_id || null,
    data.server_name || null,
    now
  );
  return getHistoryById(Number(info.lastInsertRowid))!;
}

export function getAllHistory(limit = 100, offset = 0): Array<Omit<HistoryRow, 'content'> & { contentLength: number }> {
  return db.prepare(`
    SELECT id, version, title, description, operator, action_type, server_id, server_name, created_at, LENGTH(content) as contentLength
    FROM history
    ORDER BY version DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Array<Omit<HistoryRow, 'content'> & { contentLength: number }>;
}

export function getHistoryById(id: number): HistoryRow | undefined {
  return db.prepare('SELECT * FROM history WHERE id = ?').get(id) as HistoryRow | undefined;
}

export function getHistoryByVersion(version: number): HistoryRow | undefined {
  return db.prepare('SELECT * FROM history WHERE version = ?').get(version) as HistoryRow | undefined;
}

export function getLatestHistory(): HistoryRow | undefined {
  return db.prepare('SELECT * FROM history ORDER BY version DESC LIMIT 1').get() as HistoryRow | undefined;
}
