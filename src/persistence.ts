/// <reference path="./types/better-sqlite3.d.ts" />
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const CURRENT_SCHEMA_VERSION = 2;

export const DB_SCHEMA = `PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_profiles (
  user_id TEXT PRIMARY KEY,
  current_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  daily_xp INTEGER NOT NULL DEFAULT 0,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  streak_multiplier REAL NOT NULL DEFAULT 1.0,
  last_xp_update TEXT,
  grace_window_minutes INTEGER NOT NULL DEFAULT 120,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS streak_states (
  user_id TEXT PRIMARY KEY,
  current_days INTEGER NOT NULL DEFAULT 0,
  last_completion_date TEXT,
  grace_expiry_date TEXT,
  is_broken INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  due_at TEXT,
  scheduled_at TEXT,
  difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
  base_xp INTEGER NOT NULL CHECK(base_xp >= 0),
  estimated_duration_minutes INTEGER NOT NULL CHECK(estimated_duration_minutes >= 0),
  status TEXT NOT NULL CHECK(status IN ('Pending','Completed','Skipped')),
  is_verified INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS completion_records (
  record_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  completion_quality TEXT NOT NULL CHECK(completion_quality IN ('Poor','Standard','Good','Excellent')),
  source TEXT NOT NULL CHECK(source IN ('Manual','VerifiedSensor','ExternalSystem')),
  metadata_hash TEXT NOT NULL,
  received_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS diary_entries (
  entry_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT NOT NULL CHECK(mood IN ('Consistency','Productivity','Reflection')),
  tags TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
  achievement_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0.0,
  threshold REAL NOT NULL,
  awarded_at TEXT,
  category TEXT NOT NULL CHECK(category IN ('Consistency','Productivity','Reflection')),
  is_active INTEGER NOT NULL DEFAULT 1,
  initial_progress REAL NOT NULL DEFAULT 0.1,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS unlockable_features (
  feature_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  minimum_level INTEGER NOT NULL DEFAULT 0,
  required_achievement_category TEXT,
  required_total_xp INTEGER,
  is_unlocked INTEGER NOT NULL DEFAULT 0,
  unlocked_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_reflection_jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED')),
  payload TEXT NOT NULL,
  response TEXT,
  scheduled_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_attempt_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_completion_records_task_completed_at ON completion_records(task_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_created_at ON diary_entries(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_achievements_user_category ON achievements(user_id, category);
CREATE INDEX IF NOT EXISTS idx_unlockables_user_level ON unlockable_features(user_id, minimum_level);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_status ON ai_reflection_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_scheduled_at ON ai_reflection_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_xp_profiles_total_xp ON xp_profiles(total_xp);
`;

export type ExportedLifeOSData = {
  meta: {
    version: string;
    schemaVersion: number;
    exportedAt: string;
  };
  users: Record<string, unknown>[];
  xp_profiles: Record<string, unknown>[];
  streak_states: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  completion_records: Record<string, unknown>[];
  diary_entries: Record<string, unknown>[];
  achievements: Record<string, unknown>[];
  unlockable_features: Record<string, unknown>[];
  ai_reflection_jobs: Record<string, unknown>[];
};

function queryAllRows(db: Database, table: string): Record<string, unknown>[] {
  return db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
}

export function openDatabase(dbPath: string): Database {
  const fullPath = path.resolve(dbPath);
  const db = new Database(fullPath, { fileMustExist: false });
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

export function initializeDatabase(dbPath: string): Database {
  const db = openDatabase(dbPath);
  migrateDatabase(db);
  return db;
}

export function migrateDatabase(db: Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  if (currentVersion === 0) {
    db.transaction(() => {
      db.exec(DB_SCHEMA);
      db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
      const stmt = db.prepare('INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)');
      stmt.run(CURRENT_SCHEMA_VERSION, new Date().toISOString(), 'Initial schema creation');
    })();
    return;
  }

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    db.transaction(() => {
      for (let version = currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
        applyMigration(db, version);
      }
      db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
    })();
  }
}

function applyMigration(db: Database, version: number): void {
  switch (version) {
    case 1:
      // schema already created in initial migration block
      break;
    case 2:
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_reflection_jobs (
          job_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED')),
          payload TEXT NOT NULL,
          response TEXT,
          scheduled_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_attempt_at TEXT,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_status ON ai_reflection_jobs(user_id, status);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_ai_jobs_scheduled_at ON ai_reflection_jobs(scheduled_at);`);
      break;
    default:
      throw new Error(`No migration script for version ${version}`);
  }
}

export function exportDatabase(db: Database): ExportedLifeOSData {
  return {
    meta: {
      version: '1.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
    },
    users: queryAllRows(db, 'users'),
    xp_profiles: queryAllRows(db, 'xp_profiles'),
    streak_states: queryAllRows(db, 'streak_states'),
    tasks: queryAllRows(db, 'tasks'),
    completion_records: queryAllRows(db, 'completion_records'),
    diary_entries: queryAllRows(db, 'diary_entries'),
    achievements: queryAllRows(db, 'achievements'),
    unlockable_features: queryAllRows(db, 'unlockable_features'),
    ai_reflection_jobs: queryAllRows(db, 'ai_reflection_jobs'),
  };
}

export function exportDatabaseToFile(db: Database, destinationPath: string): void {
  const payload = exportDatabase(db);
  const normalizedPath = path.resolve(destinationPath);
  fs.writeFileSync(normalizedPath, JSON.stringify(payload, null, 2), { encoding: 'utf8' });
}
