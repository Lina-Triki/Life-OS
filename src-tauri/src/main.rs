#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use reqwest::blocking::Client;
use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::thread;
use std::time::Duration;
use tauri::{Manager, State};

#[derive(Serialize, Deserialize)]
struct Task {
  task_id: String,
  owner_id: String,
  title: String,
  description: String,
  difficulty: i32,
  status: String,
  is_verified: i32,
}

#[derive(Serialize, Deserialize)]
struct DiaryEntry {
  entry_id: String,
  user_id: String,
  created_at: String,
  timezone: String,
  content: String,
  mood: String,
  tags: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct ReflectionJob {
  job_id: String,
  user_id: String,
  status: String,
  payload: String,
  response: Option<String>,
  scheduled_at: String,
  created_at: String,
  last_attempt_at: Option<String>,
  attempt_count: i32,
  error_message: Option<String>,
}

struct AppDatabase {
  path: PathBuf,
}

#[tauri::command]
fn get_tasks(db: State<AppDatabase>) -> Result<Vec<Task>, String> {
  let conn = open_connection(&db.path)?;
  let mut stmt = conn
    .prepare(
      "SELECT task_id, owner_id, title, description, difficulty, status, is_verified FROM tasks ORDER BY created_at DESC",
    )
    .map_err(|err| err.to_string())?;
  let tasks = stmt
    .query_map([], |row| {
      Ok(Task {
        task_id: row.get(0)?,
        owner_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        difficulty: row.get(4)?,
        status: row.get(5)?,
        is_verified: row.get(6)?,
      })
    })
    .map_err(|err| err.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|err| err.to_string())?;
  Ok(tasks)
}

#[derive(Deserialize)]
struct CompletionContext {
  completedAtUTC: String,
  timezone: String,
  completionDurationMinutes: i32,
  quality: String,
  source: String,
  metadataHash: String,
}

#[tauri::command]
fn complete_task(db: State<AppDatabase>, task_id: String, completion_context: CompletionContext) -> Result<bool, String> {
  let conn = open_connection(&db.path)?;
  let now = chrono::Utc::now().to_rfc3339();
  conn.execute(
    "UPDATE tasks SET status = 'Completed', is_verified = 0 WHERE task_id = ?",
    params![task_id],
  )
  .map_err(|err| err.to_string())?;
  conn.execute(
    "INSERT INTO completion_records (record_id, task_id, completed_at, timezone, completion_quality, source, metadata_hash, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    params![
      format!("completion-{}-{}", task_id, now),
      task_id,
      completion_context.completedAtUTC,
      completion_context.timezone,
      completion_context.quality,
      completion_context.source,
      completion_context.metadataHash,
      now,
    ],
  )
  .map_err(|err| err.to_string())?;
  Ok(true)
}

#[tauri::command]
fn get_reflection_jobs(db: State<AppDatabase>) -> Result<Vec<ReflectionJob>, String> {
  let conn = open_connection(&db.path)?;
  let mut stmt = conn
    .prepare(
      "SELECT job_id, user_id, status, payload, response, scheduled_at, created_at, last_attempt_at, attempt_count, error_message FROM ai_reflection_jobs ORDER BY scheduled_at ASC",
    )
    .map_err(|err| err.to_string())?;
  let jobs = stmt
    .query_map([], |row| {
      Ok(ReflectionJob {
        job_id: row.get(0)?,
        user_id: row.get(1)?,
        status: row.get(2)?,
        payload: row.get(3)?,
        response: row.get(4)?,
        scheduled_at: row.get(5)?,
        created_at: row.get(6)?,
        last_attempt_at: row.get(7)?,
        attempt_count: row.get(8)?,
        error_message: row.get(9)?,
      })
    })
    .map_err(|err| err.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|err| err.to_string())?;
  Ok(jobs)
}

#[tauri::command]
fn submit_weekly_reflection_job(
  db: State<AppDatabase>,
  user_id: String,
  payload: String,
  scheduled_at: String,
) -> Result<String, String> {
  let conn = open_connection(&db.path)?;
  let job_id = format!("reflection-{}-{}", user_id, scheduled_at);
  conn.execute(
    "INSERT OR IGNORE INTO ai_reflection_jobs (job_id, user_id, status, payload, scheduled_at, created_at, attempt_count) VALUES (?, ?, 'PENDING', ?, ?, ?, 0)",
    params![job_id, user_id, payload, scheduled_at, chrono::Utc::now().to_rfc3339()],
  )
  .map_err(|err| err.to_string())?;
  Ok(job_id)
}

fn process_reflection_queue(path: &PathBuf) -> Result<i32, String> {
  let conn = open_connection(path)?;
  let mut stmt = conn
    .prepare(
      "SELECT job_id, payload FROM ai_reflection_jobs WHERE status IN ('PENDING', 'FAILED') ORDER BY scheduled_at ASC LIMIT 10",
    )
    .map_err(|err| err.to_string())?;
  let rows = stmt
    .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
    .map_err(|err| err.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|err| err.to_string())?;

  let api_key = std::env::var("GEMINI_API_KEY").unwrap_or_default();
  let mut processed = 0;
  for (job_id, payload) in rows {
    let now = chrono::Utc::now().to_rfc3339();
    match send_to_gemini(&api_key, &payload) {
      Ok(response_text) => {
        conn.execute(
          "UPDATE ai_reflection_jobs SET status = 'COMPLETED', response = ?, last_attempt_at = ?, attempt_count = attempt_count + 1, error_message = NULL WHERE job_id = ?",
          params![response_text, now, job_id],
        )
        .map_err(|err| err.to_string())?;
      }
      Err(err_msg) => {
        conn.execute(
          "UPDATE ai_reflection_jobs SET status = 'FAILED', last_attempt_at = ?, attempt_count = attempt_count + 1, error_message = ? WHERE job_id = ?",
          params![now, err_msg, job_id],
        )
        .map_err(|err| err.to_string())?;
      }
    }
    processed += 1;
  }
  Ok(processed)
}

#[tauri::command]
fn process_queued_reflection_jobs(db: State<AppDatabase>) -> Result<i32, String> {
  process_reflection_queue(&db.path)
}

#[tauri::command]
fn export_data(db: State<AppDatabase>, destination_path: String) -> Result<String, String> {
  let conn = open_connection(&db.path)?;
  let users: Vec<serde_json::Value> = conn
    .prepare("SELECT * FROM users")
    .map_err(|err| err.to_string())?
    .query_map([], |row| {
      let user_id: String = row.get(0)?;
      let email: String = row.get(1)?;
      let timezone: String = row.get(2)?;
      let created_at: String = row.get(3)?;
      let last_active_at: String = row.get(4)?;
      Ok(serde_json::json!({
        "user_id": user_id,
        "email": email,
        "timezone": timezone,
        "created_at": created_at,
        "last_active_at": last_active_at,
      }))
    })
    .map_err(|err| err.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|err| err.to_string())?;

  let payload = serde_json::json!({
    "meta": {
      "version": "1.0",
      "schemaVersion": 2,
      "exportedAt": chrono::Utc::now().to_rfc3339()
    },
    "users": users,
  });
  std::fs::write(&destination_path, serde_json::to_string_pretty(&payload).map_err(|err| err.to_string())?)
    .map_err(|err| err.to_string())?;
  Ok(destination_path)
}

fn open_connection(path: &PathBuf) -> Result<Connection, String> {
  let conn = Connection::open(path).map_err(|err| err.to_string())?;
  conn.pragma_update(None, "journal_mode", &"WAL").map_err(|err| err.to_string())?;
  ensure_schema(&conn).map_err(|err| err.to_string())?;
  Ok(conn)
}

fn ensure_schema(conn: &Connection) -> SqlResult<()> {
  conn.execute_batch(
    "PRAGMA foreign_keys = ON;
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
    ",
  )
}

fn send_to_gemini(api_key: &str, payload: &str) -> Result<String, String> {
  if api_key.is_empty() {
    return Err("Missing Gemini API key".into());
  }
  let client = Client::new();
  let request_body = serde_json::json!({
    "model": "gemini-1.5",
    "input": {
      "messages": [
        {"role": "system", "content": "You are a privacy-first weekly reflection assistant. Return only the requested JSON schema."},
        {"role": "user", "content": payload}
      ],
      "temperature": 0,
      "max_output_tokens": 500,
      "response_format": {
        "type": "json_schema",
        "json_schema": {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object"
        }
      }
    }
  });

  let response = client
    .post("https://api.gemini.com/v1/responses:generate")
    .bearer_auth(api_key)
    .json(&request_body)
    .send()
    .map_err(|err| err.to_string())?;

  let text = response.text().map_err(|err| err.to_string())?;
  if !response.status().is_success() {
    return Err(format!("Gemini API error: {}", text));
  }
  Ok(text)
}

fn get_database_path(app_handle: &tauri::AppHandle) -> PathBuf {
  let mut path = app_handle
    .path_resolver()
    .app_dir()
    .unwrap_or_else(|| PathBuf::from("."));
  path.push("lifeos.db");
  path
}

fn spawn_background_worker(path: PathBuf) {
  thread::spawn(move || loop {
    if let Err(err) = process_reflection_queue(&path) {
      eprintln!("Reflection worker error: {}", err);
    }
    thread::sleep(Duration::from_secs(15 * 60));
  });
}

fn main() {
  let app = tauri::Builder::default()
    .setup(|app| {
      let path = get_database_path(&app.handle());
      let _ = open_connection(&path);
      spawn_background_worker(path.clone());
      Ok(())
    })
    .manage(AppDatabase {
      path: get_database_path(&app.handle()),
    })
    .invoke_handler(tauri::generate_handler![
      get_tasks,
      complete_task,
      get_reflection_jobs,
      submit_weekly_reflection_job,
      process_queued_reflection_jobs,
      export_data
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
