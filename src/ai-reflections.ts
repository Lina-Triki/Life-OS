/// <reference path="./types/better-sqlite3.d.ts" />
import Database from 'better-sqlite3';

export type ReflectionJobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type DiaryEntryRow = {
  entry_id: string;
  user_id: string;
  created_at: string;
  timezone: string;
  content: string;
  mood: string;
  tags: string | null;
};

export type TaskRow = {
  task_id: string;
  owner_id: string;
  title: string;
  description: string;
  difficulty: number;
  status: string;
  is_verified: number;
};

export type WeeklyReflectionPayload = {
  userId: string;
  timezone: string;
  weekStart: string;
  weekEnd: string;
  diaryEntries: Array<{
    entryId: string;
    createdAt: string;
    content: string;
    mood: string;
    tags: string[];
  }>;
  taskSummaries: Array<{
    taskId: string;
    title: string;
    description: string;
    difficulty: number;
    status: string;
    isVerified: boolean;
  }>;
  anonymizationAudit: {
    scrubbedTerms: string[];
    labelCounts: Record<string, number>;
  };
};

export type GeminiRequestPayload = {
  model: string;
  input: {
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    temperature: number;
    max_output_tokens: number;
    response_format: {
      type: 'json_schema';
      json_schema: Record<string, unknown>;
    };
  };
};

export type GeminiResponsePayload = {
  output: Array<{
    content: {
      parts: string[];
    };
  }>;
};

export type WeeklyReflectionResult = {
  weekly_summary: string;
  insights: string[];
  recommended_focus: {
    category: string;
    reason: string;
  };
  reflections: string[];
  mood_trend: string;
  privacy_check: {
    containsPII: boolean;
    scrubbedFields: string[];
  };
};

export const geminiSystemPrompt = `You are a privacy-first weekly reflection assistant for a personal life operating system.

Your task: Analyze the anonymized diary content and task summaries and return exactly one JSON object matching the schema provided. Do not include any markdown, explanation, or extra keys. Do not expose any personally identifiable information.

Required behavior:
- Use the anonymized input only.
- Do not make up names, locations, or identifiable details.
- Return only valid JSON with the exact required keys.
- Use concise, human-readable sentences in the summary and insights.
`;

export const weeklyReflectionResponseSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    weekly_summary: { type: 'string' },
    insights: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
    recommended_focus: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['category', 'reason'],
      additionalProperties: false,
    },
    reflections: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
    mood_trend: { type: 'string' },
    privacy_check: {
      type: 'object',
      properties: {
        containsPII: { type: 'boolean' },
        scrubbedFields: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['containsPII', 'scrubbedFields'],
      additionalProperties: false,
    },
  },
  required: ['weekly_summary', 'insights', 'recommended_focus', 'reflections', 'mood_trend', 'privacy_check'],
  additionalProperties: false,
} as const;

export const GEMINI_API_ENDPOINT = 'https://api.gemini.com/v1/responses:generate';
export const MAX_REFLECTION_RETRY_ATTEMPTS = 5;

const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const phoneRegex = /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
const addressRegex = /\b\d{1,5}\s+[A-Za-z0-9\.\s]{3,50}\b(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct))?/gi;
const locationRegex = /\b(?:New York|Los Angeles|San Francisco|Chicago|London|Paris|Berlin|Tokyo|Sydney|Toronto|Vancouver|Seattle|Austin|Boston|Madrid|Rome|Madrid|Dublin)\b/gi;
const personTitleRegex = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.\s+[A-Z][a-z]+\b/g;
const multiWordNameRegex = /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g;

export function scrubPII(rawText: string): { scrubbedText: string; labelCounts: Record<string, number> } {
  const labelCounts: Record<string, number> = {
    email: 0,
    phone: 0,
    ssn: 0,
    address: 0,
    location: 0,
    person: 0,
  };

  let text = rawText;
  text = text.replace(emailRegex, () => {
    labelCounts.email += 1;
    return '[REDACTED_EMAIL]';
  });

  text = text.replace(phoneRegex, () => {
    labelCounts.phone += 1;
    return '[REDACTED_PHONE]';
  });

  text = text.replace(ssnRegex, () => {
    labelCounts.ssn += 1;
    return '[REDACTED_ID]';
  });

  text = text.replace(addressRegex, () => {
    labelCounts.address += 1;
    return '[REDACTED_ADDRESS]';
  });

  text = text.replace(locationRegex, () => {
    labelCounts.location += 1;
    return '[REDACTED_LOCATION]';
  });

  text = text.replace(personTitleRegex, () => {
    labelCounts.person += 1;
    return '[REDACTED_PERSON]';
  });

  text = text.replace(multiWordNameRegex, (match, capture) => {
    const isSentenceStart = /^([A-Z][a-z]+[.!?]\s+)?/.test(match);
    if (isSentenceStart && match.split(' ').length === 2) {
      return match;
    }
    labelCounts.person += 1;
    return '[REDACTED_PERSON]';
  });

  return {
    scrubbedText: text,
    labelCounts,
  };
}

export function buildWeeklyReflectionPayload(
  userId: string,
  timezone: string,
  weekStart: string,
  weekEnd: string,
  diaryEntries: DiaryEntryRow[],
  tasks: TaskRow[],
): WeeklyReflectionPayload {
  const diaryEntriesNormalized = diaryEntries.map(entry => ({
    entryId: entry.entry_id,
    createdAt: entry.created_at,
    content: entry.content.trim(),
    mood: entry.mood,
    tags: entry.tags ? entry.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
  }));

  const taskSummaries = tasks.map(task => ({
    taskId: task.task_id,
    title: task.title.trim(),
    description: task.description.trim(),
    difficulty: task.difficulty,
    status: task.status,
    isVerified: task.is_verified === 1,
  }));

  const combinedText = [
    diaryEntriesNormalized
      .map(entry => `DIARY_ENTRY:${entry.entryId}\n${entry.content}`)
      .join('\n\n'),
    taskSummaries
      .map(task => `TASK:${task.taskId}\nTITLE:${task.title}\nDESCRIPTION:${task.description}`)
      .join('\n\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

  const { scrubbedText, labelCounts } = scrubPII(combinedText);

  return {
    userId,
    timezone,
    weekStart,
    weekEnd,
    diaryEntries: diaryEntriesNormalized.map(entry => ({
      ...entry,
      content: scrubPII(entry.content).scrubbedText,
    })),
    taskSummaries: taskSummaries.map(task => ({
      ...task,
      title: scrubPII(task.title).scrubbedText,
      description: scrubPII(task.description).scrubbedText,
    })),
    anonymizationAudit: {
      scrubbedTerms: Object.entries(labelCounts)
        .filter(([, count]) => count > 0)
        .map(([label]) => label),
      labelCounts,
    },
  };
}

export function buildGeminiRequestPayload(payload: WeeklyReflectionPayload): GeminiRequestPayload {
  return {
    model: 'gemini-1.5',
    input: {
      messages: [
        { role: 'system', content: geminiSystemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            weekStart: payload.weekStart,
            weekEnd: payload.weekEnd,
            timezone: payload.timezone,
            diaryEntries: payload.diaryEntries,
            taskSummaries: payload.taskSummaries,
            anonymizationAudit: payload.anonymizationAudit,
          }),
        },
      ],
      temperature: 0,
      max_output_tokens: 500,
      response_format: {
        type: 'json_schema',
        json_schema: weeklyReflectionResponseSchema,
      },
    },
  };
}

export function buildGeminiSystemPrompt(): string {
  return geminiSystemPrompt;
}

export function buildGeminiResponseSchema(): Record<string, unknown> {
  return weeklyReflectionResponseSchema;
}

export function isNetworkAvailable(): boolean {
  return typeof fetch !== 'undefined';
}

export function getPendingReflectionJobs(db: Database): Array<Record<string, unknown>> {
  return db
    .prepare(
      `SELECT * FROM ai_reflection_jobs
       WHERE status IN ('PENDING','FAILED')
       ORDER BY scheduled_at ASC, attempt_count ASC`
    )
    .all();
}

export function hasReflectionJobForWeek(db: Database, userId: string, weekStart: string): boolean {
  const stmt = db.prepare(`SELECT 1 FROM ai_reflection_jobs WHERE job_id = ? LIMIT 1`);
  return !!stmt.get(`reflection-${userId}-${weekStart}`);
}

export function scheduleWeeklyReflectionJob(
  db: Database,
  userId: string,
  timezone: string,
  weekStart: string,
  weekEnd: string,
  diaryEntries: DiaryEntryRow[],
  tasks: TaskRow[],
  scheduledAt: Date,
  jobId?: string,
): string {
  const payload = buildWeeklyReflectionPayload(userId, timezone, weekStart, weekEnd, diaryEntries, tasks);
  const finalJobId = jobId ?? `reflection-${userId}-${Date.now()}`;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO ai_reflection_jobs
     (job_id, user_id, status, payload, scheduled_at, created_at, attempt_count)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  );
  stmt.run(finalJobId, userId, 'PENDING', JSON.stringify(payload), scheduledAt.toISOString(), new Date().toISOString());
  return finalJobId;
}

function parseJSON<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export function shouldRetryJob(job: { status: string; attempt_count: number; last_attempt_at: string | null; scheduled_at: string }): boolean {
  const now = new Date();
  const scheduledAt = new Date(job.scheduled_at);
  if (job.status === 'PENDING' && scheduledAt <= now) {
    return true;
  }
  if (job.status === 'FAILED' && job.attempt_count < MAX_REFLECTION_RETRY_ATTEMPTS) {
    if (!job.last_attempt_at) {
      return true;
    }
    const lastAttempt = new Date(job.last_attempt_at);
    const delayMinutes = Math.min(60, Math.pow(2, job.attempt_count) * 15);
    return now.getTime() - lastAttempt.getTime() >= delayMinutes * 60000;
  }
  return false;
}

export async function processQueuedReflectionJobs(db: Database, apiKey: string): Promise<void> {
  if (!isNetworkAvailable()) {
    return;
  }
  const jobs = getPendingReflectionJobs(db) as Array<Record<string, unknown>>;
  for (const job of jobs) {
    if (!shouldRetryJob(job as any)) {
      continue;
    }
    const jobId = job.job_id as string;
    const payload = parseJSON<WeeklyReflectionPayload>(job.payload as string);
    if (!payload) {
      markJobFailed(db, jobId, 'Invalid saved payload');
      continue;
    }
    await executeReflectionJob(db, apiKey, jobId, payload);
  }
}

async function executeReflectionJob(db: Database, apiKey: string, jobId: string, payload: WeeklyReflectionPayload): Promise<void> {
  updateJobStatus(db, jobId, 'IN_PROGRESS', undefined, 0, undefined);
  const requestPayload = buildGeminiRequestPayload(payload);
  try {
    const response = await sendToGemini(apiKey, requestPayload);
    const body = await response.json();
    const parsedResponse = parseGeminiResponse(body);
    if (!parsedResponse) {
      throw new Error('Response did not match expected JSON schema');
    }
    const responseText = JSON.stringify(parsedResponse);
    completeJob(db, jobId, responseText);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isOffline = /network|fetch|offline/i.test(message);
    if (isOffline) {
      updateJobStatus(db, jobId, 'PENDING', undefined, 0, message);
      return;
    }
    const currentJob = db.prepare('SELECT attempt_count FROM ai_reflection_jobs WHERE job_id = ?').get(jobId);
    const attemptCount = (currentJob?.attempt_count ?? 0) + 1;
    updateJobStatus(db, jobId, 'FAILED', undefined, attemptCount, message);
  }
}

function updateJobStatus(
  db: Database,
  jobId: string,
  status: ReflectionJobStatus,
  response?: string,
  attemptCount?: number,
  errorMessage?: string,
): void {
  const stmt = db.prepare(
    `UPDATE ai_reflection_jobs
     SET status = ?, response = COALESCE(?, response), last_attempt_at = ?, attempt_count = COALESCE(?, attempt_count), error_message = ?
     WHERE job_id = ?`
  );
  stmt.run(status, response ?? null, new Date().toISOString(), attemptCount ?? null, errorMessage ?? null, jobId);
}

function completeJob(db: Database, jobId: string, responseText: string): void {
  const stmt = db.prepare(
    `UPDATE ai_reflection_jobs
     SET status = 'COMPLETED', response = ?, last_attempt_at = ?, attempt_count = attempt_count + 1, error_message = NULL
     WHERE job_id = ?`
  );
  stmt.run(responseText, new Date().toISOString(), jobId);
}

function markJobFailed(db: Database, jobId: string, errorMessage: string): void {
  const stmt = db.prepare(
    `UPDATE ai_reflection_jobs
     SET status = 'FAILED', error_message = ?, last_attempt_at = ?, attempt_count = attempt_count + 1
     WHERE job_id = ?`
  );
  stmt.run(errorMessage, new Date().toISOString(), jobId);
}

export function buildReflectionPayloadFromDatabase(
  db: Database,
  userId: string,
  timezone: string,
  weekStart: string,
  weekEnd: string,
): WeeklyReflectionPayload {
  const diaryRows = db.prepare(
    `SELECT entry_id, user_id, created_at, timezone, content, mood, tags
     FROM diary_entries
     WHERE user_id = ? AND created_at >= ? AND created_at <= ?
     ORDER BY created_at ASC`
  ).all(userId, weekStart, weekEnd) as DiaryEntryRow[];

  const taskRows = db.prepare(
    `SELECT task_id, owner_id, title, description, difficulty, status, is_verified
     FROM tasks
     WHERE owner_id = ? AND created_at >= ? AND created_at <= ?
     ORDER BY created_at ASC`
  ).all(userId, weekStart, weekEnd) as TaskRow[];

  return buildWeeklyReflectionPayload(userId, timezone, weekStart, weekEnd, diaryRows, taskRows);
}

async function sendToGemini(apiKey: string, payload: GeminiRequestPayload): Promise<Response> {
  const fetchFn = getFetch();
  const response = await fetchFn(GEMINI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }
  return response;
}

function getFetch(): typeof fetch {
  if (typeof fetch === 'undefined') {
    throw new Error('Global fetch is not available in this runtime. Use Node 18+ or polyfill fetch.');
  }
  return fetch.bind(globalThis);
}

function parseGeminiResponse(body: unknown): WeeklyReflectionResult | null {
  const parsed = body as GeminiResponsePayload;
  if (!parsed || !Array.isArray(parsed.output) || parsed.output.length === 0) {
    return null;
  }
  const part = parsed.output[0]?.content?.parts?.[0];
  if (typeof part !== 'string') {
    return null;
  }
  const result = parseJSON<WeeklyReflectionResult>(part);
  if (!result) {
    return null;
  }
  return validateWeeklyReflectionResult(result) ? result : null;
}

function validateWeeklyReflectionResult(result: any): result is WeeklyReflectionResult {
  if (typeof result !== 'object' || result === null) {
    return false;
  }
  if (typeof result.weekly_summary !== 'string') {
    return false;
  }
  if (!Array.isArray(result.insights) || result.insights.some((item: unknown) => typeof item !== 'string')) {
    return false;
  }
  if (typeof result.recommended_focus !== 'object' || result.recommended_focus === null) {
    return false;
  }
  if (typeof result.recommended_focus.category !== 'string' || typeof result.recommended_focus.reason !== 'string') {
    return false;
  }
  if (!Array.isArray(result.reflections) || result.reflections.some((item: unknown) => typeof item !== 'string')) {
    return false;
  }
  if (typeof result.mood_trend !== 'string') {
    return false;
  }
  if (typeof result.privacy_check !== 'object' || result.privacy_check === null) {
    return false;
  }
  if (typeof result.privacy_check.containsPII !== 'boolean') {
    return false;
  }
  if (!Array.isArray(result.privacy_check.scrubbedFields) || result.privacy_check.scrubbedFields.some((item: unknown) => typeof item !== 'string')) {
    return false;
  }
  return true;
}
