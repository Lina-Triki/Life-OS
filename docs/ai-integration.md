# AI Weekly Reflection Integration

## Privacy-first Local AI Architecture

This module performs weekly reflection generation while keeping diary data private.

### Anonymization Pipeline

1. Read diary entries and week-scoped task summaries from the local SQLite database.
2. Concatenate raw text into a single analysis document.
3. Apply deterministic PII scrubbing using explicit regex pipelines:
   - email addresses → `[REDACTED_EMAIL]`
   - phone numbers → `[REDACTED_PHONE]`
   - SSNs → `[REDACTED_ID]`
   - postal addresses → `[REDACTED_ADDRESS]`
   - explicit location names → `[REDACTED_LOCATION]`
   - person titles and multi-word name patterns → `[REDACTED_PERSON]`
4. Build an anonymized payload containing only sanitized diary content and task summaries.
5. Store a local `anonymizationAudit` audit section documenting scrubbed PII categories.

### Payload Design

The exact JSON payload sent to the Gemini API is:

```json
{
  "model": "gemini-1.5",
  "input": {
    "messages": [
      { "role": "system", "content": "<system prompt>" },
      { "role": "user", "content": "<stringified anonymized payload>" }
    ],
    "temperature": 0,
    "max_output_tokens": 500,
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "weekly_summary": { "type": "string" },
          "insights": { "type": "array", "items": { "type": "string" } },
          "recommended_focus": {
            "type": "object",
            "properties": {
              "category": { "type": "string" },
              "reason": { "type": "string" }
            },
            "required": ["category", "reason"],
            "additionalProperties": false
          },
          "reflections": { "type": "array", "items": { "type": "string" } },
          "mood_trend": { "type": "string" },
          "privacy_check": {
            "type": "object",
            "properties": {
              "containsPII": { "type": "boolean" },
              "scrubbedFields": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["containsPII", "scrubbedFields"],
            "additionalProperties": false
          }
        },
        "required": ["weekly_summary", "insights", "recommended_focus", "reflections", "mood_trend", "privacy_check"],
        "additionalProperties": false
      }
    }
  }
}
```

### System Prompt

The prompt sent to the AI is:

```text
You are a privacy-first weekly reflection assistant for a personal life operating system.

Your task: Analyze the anonymized diary content and task summaries and return exactly one JSON object matching the schema provided. Do not include any markdown, explanation, or extra keys. Do not expose any personally identifiable information.

Required behavior:
- Use the anonymized input only.
- Do not make up names, locations, or identifiable details.
- Return only valid JSON with the exact required keys.
- Use concise, human-readable sentences in the summary and insights.
```

### Response Schema

The app expects this exact JSON schema:

- `weekly_summary`: string
- `insights`: array of strings
- `recommended_focus`: object with `category` and `reason`
- `reflections`: array of strings
- `mood_trend`: string
- `privacy_check`: object with `containsPII` boolean and `scrubbedFields` string array

### Offline/Fallback Architecture

- Weekly reflection jobs are stored in the local `ai_reflection_jobs` SQLite table.
- If the user is offline on Sunday night, the job remains in status `PENDING`.
- A periodic background worker runs on app startup and every 15 minutes.
- Retry conditions:
  - `PENDING` jobs are processed once `scheduled_at` is reached.
  - `FAILED` jobs are retried with exponential backoff: `15m`, `30m`, `60m`.
  - Up to 5 retry attempts.
- If network is unavailable, the job remains `PENDING` and the system preserves the payload locally.
- On successful API response, the job status becomes `COMPLETED` and the serialized AI output is stored.

### Local Queue Table

The new SQLite table for queued reflection work is:

```sql
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
```

This design ensures the diary content never leaves the local machine until it is anonymized, and that the app can recover automatically from offline or transient network failures.
