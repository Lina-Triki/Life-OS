import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { initializeDatabase, exportDatabase, openDatabase, migrateDatabase } from './persistence';

const tmpDir = path.join(os.tmpdir(), 'queenzy-tests');
let dbPath: string;

beforeEach(() => {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  dbPath = path.join(tmpDir, `lifeos-${Date.now()}.db`);
});

afterEach(() => {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});

describe('Persistence layer', () => {
  it('creates a new database and migrates schema', () => {
    const db = initializeDatabase(dbPath);
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count as number;
    expect(userCount).toBe(0);
    db.close();
  });

  it('exports database payload structure', () => {
    const db = initializeDatabase(dbPath);
    db.prepare('INSERT INTO users (user_id, email, timezone, created_at, last_active_at) VALUES (?, ?, ?, ?, ?)').run(
      'user-1',
      'test@example.com',
      'UTC',
      new Date().toISOString(),
      new Date().toISOString(),
    );
    const payload = exportDatabase(db);
    expect(payload.users).toHaveLength(1);
    expect(payload.meta.schemaVersion).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it('opens an existing database without recreating', () => {
    initializeDatabase(dbPath).close();
    const db = openDatabase(dbPath);
    migrateDatabase(db);
    expect(db.prepare('PRAGMA user_version').pluck().get()).toBeGreaterThanOrEqual(1);
    db.close();
  });
});
