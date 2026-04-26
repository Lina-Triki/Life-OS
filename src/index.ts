/// <reference path="./types/better-sqlite3.d.ts" />
import path from 'path';
import Database from 'better-sqlite3';
import { initializeDatabase } from './persistence';
import {
  hasReflectionJobForWeek,
  processQueuedReflectionJobs,
  scheduleWeeklyReflectionJob,
} from './ai-reflections';

const DB_FILE_NAME = 'lifeos.db';
const POLL_INTERVAL_MINUTES = 15;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

async function main(): Promise<void> {
  const dbPath = path.resolve(__dirname, '..', DB_FILE_NAME);
  const db = initializeDatabase(dbPath);

  await runReflectionWorker(db);
  setInterval(() => {
    void runReflectionWorker(db);
  }, POLL_INTERVAL_MINUTES * 60 * 1000);
}

async function runReflectionWorker(db: Database): Promise<void> {
  try {
    await processQueuedReflectionJobs(db, GEMINI_API_KEY);
    scheduleWeeklyReflectionJobsForUsers(db);
  } catch (error) {
    console.error('Reflection worker error:', error);
  }
}

function scheduleWeeklyReflectionJobsForUsers(db: Database): void {
  const users = db.prepare('SELECT user_id, timezone FROM users').all() as Array<{ user_id: string; timezone: string }>;
  const now = new Date();

  for (const user of users) {
    const currentWeek = getWeekRange(now, user.timezone);
    const previousWeek = getWeekRange(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), user.timezone);

    if (!hasReflectionJobForWeek(db, user.user_id, previousWeek.weekStart) && now > new Date(previousWeek.weekEnd)) {
      scheduleReflectionJob(db, user.user_id, user.timezone, previousWeek, now);
    }

    if (!hasReflectionJobForWeek(db, user.user_id, currentWeek.weekStart)) {
      scheduleReflectionJob(db, user.user_id, user.timezone, currentWeek, new Date(currentWeek.weekEnd));
    }
  }
}

function scheduleReflectionJob(
  db: Database,
  userId: string,
  timezone: string,
  weekRange: { weekStart: string; weekEnd: string },
  scheduledAt: Date,
): void {
  const diaryEntries = db
    .prepare(
      `SELECT entry_id, user_id, created_at, timezone, content, mood, tags
       FROM diary_entries
       WHERE user_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at ASC`
    )
    .all(userId, weekRange.weekStart, weekRange.weekEnd);

  const tasks = db
    .prepare(
      `SELECT task_id, owner_id, title, description, difficulty, status, is_verified
       FROM tasks
       WHERE owner_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at ASC`
    )
    .all(userId, weekRange.weekStart, weekRange.weekEnd);

  const jobId = `reflection-${userId}-${weekRange.weekStart}`;
  scheduleWeeklyReflectionJob(db, userId, timezone, weekRange.weekStart, weekRange.weekEnd, diaryEntries, tasks, scheduledAt, jobId);
}

function getWeekRange(date: Date, timezone: string): { weekStart: string; weekEnd: string } {
  const local = getLocalDateParts(date, timezone);
  const weekdayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(local.weekday);
  const mondayOffset = weekdayIndex === 0 ? -6 : 1 - weekdayIndex;

  const weekStartLocal = addDays(local, mondayOffset);
  const weekEndLocal = addDays(weekStartLocal, 6);

  return {
    weekStart: localTimeToUTCString(weekStartLocal.year, weekStartLocal.month, weekStartLocal.day, 0, 0, 0, timezone),
    weekEnd: localTimeToUTCString(weekEndLocal.year, weekEndLocal.month, weekEndLocal.day, 23, 59, 59, timezone),
  };
}

function getLocalDateParts(date: Date, timezone: string): { year: number; month: number; day: number; weekday: string; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return {
    year: Number(parts.find(p => p.type === 'year')?.value ?? '1970'),
    month: Number(parts.find(p => p.type === 'month')?.value ?? '1'),
    day: Number(parts.find(p => p.type === 'day')?.value ?? '1'),
    weekday: parts.find(p => p.type === 'weekday')?.value ?? 'Monday',
    hour: Number(parts.find(p => p.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find(p => p.type === 'minute')?.value ?? '0'),
    second: Number(parts.find(p => p.type === 'second')?.value ?? '0'),
  };
}

function addDays(date: { year: number; month: number; day: number; weekday?: string }, offset: number) {
  const base = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0));
  const result = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function localTimeToUTCString(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): string {
  const targetDay = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  const targetTime = `${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}`;
  let candidate = Date.UTC(year, month - 1, day, 0, 0, 0) - 24 * 60 * 60 * 1000;
  const limit = Date.UTC(year, month - 1, day, 0, 0, 0) + 24 * 60 * 60 * 1000;

  while (candidate <= limit) {
    const local = getLocalDateParts(new Date(candidate), timezone);
    const localDate = `${pad(local.year, 4)}-${pad(local.month, 2)}-${pad(local.day, 2)}`;
    const localTime = `${pad(local.hour, 2)}:${pad(local.minute, 2)}:${pad(local.second, 2)}`;
    if (localDate === targetDay && localTime === targetTime) {
      return new Date(candidate).toISOString();
    }
    candidate += 60000;
  }
  throw new Error(`Unable to convert local time ${targetDay}T${targetTime} in timezone ${timezone} to UTC`);
}

function pad(value: number, digits: number): string {
  return String(value).padStart(digits, '0');
}

main().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});

