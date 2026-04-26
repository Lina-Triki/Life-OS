import type { DiaryEntryRow, TaskRow, WeeklyReflectionPayload } from './types';

const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const phoneRegex = /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
const addressRegex = /\b\d{1,5}\s+[A-Za-z0-9\.\s]{3,50}\b(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct))?/gi;
const locationRegex = /\b(?:New York|Los Angeles|San Francisco|Chicago|London|Paris|Berlin|Tokyo|Sydney|Toronto|Vancouver|Seattle|Austin|Boston|Madrid|Rome|Dublin)\b/gi;
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
  text = text.replace(multiWordNameRegex, (match) => {
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
  const diaryEntriesNormalized = diaryEntries.map((entry) => ({
    entryId: entry.entry_id,
    createdAt: entry.created_at,
    content: scrubPII(entry.content).scrubbedText,
    mood: entry.mood,
    tags: entry.tags ? entry.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
  }));

  const taskSummaries = tasks.map((task) => ({
    taskId: task.task_id,
    title: scrubPII(task.title).scrubbedText,
    description: scrubPII(task.description).scrubbedText,
    difficulty: task.difficulty,
    status: task.status,
    isVerified: task.is_verified === 1,
  }));

  const combinedText = [
    diaryEntriesNormalized
      .map((entry) => `DIARY_ENTRY:${entry.entryId}\n${entry.content}`)
      .join('\n\n'),
    taskSummaries
      .map((task) => `TASK:${task.taskId}\nTITLE:${task.title}\nDESCRIPTION:${task.description}`)
      .join('\n\n'),
  ]
    .filter(Boolean)
    .join('\n\n');

  const anonymizationAudit = scrubPII(combinedText);

  return {
    userId,
    timezone,
    weekStart,
    weekEnd,
    diaryEntries: diaryEntriesNormalized,
    taskSummaries,
    anonymizationAudit: {
      scrubbedTerms: Object.entries(anonymizationAudit.labelCounts)
        .filter(([, count]) => count > 0)
        .map(([label]) => label),
      labelCounts: anonymizationAudit.labelCounts,
    },
  };
}
