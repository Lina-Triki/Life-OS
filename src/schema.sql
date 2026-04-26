PRAGMA foreign_keys = ON;

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
