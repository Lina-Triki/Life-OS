import { invoke } from '@tauri-apps/api/core';
import type { CompletionContext, DiaryEntryRow, TaskRow, WeeklyReflectionPayload } from './types';

export type ReflectionJob = {
  job_id: string;
  user_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  scheduled_at: string;
  created_at: string;
  attempt_count: number;
  error_message: string | null;
};

export function getTasks(): Promise<TaskRow[]> {
  return invoke('get_tasks');
}

export function getDiaryEntries(): Promise<DiaryEntryRow[]> {
  return invoke('get_diary_entries');
}

export function getReflectionJobs(): Promise<ReflectionJob[]> {
  return invoke('get_reflection_jobs');
}

export function completeTask(taskId: string, completionContext: CompletionContext): Promise<boolean> {
  return invoke('complete_task', { taskId, completionContext });
}

export function submitWeeklyReflectionJob(
  userId: string,
  payload: WeeklyReflectionPayload,
  scheduledAt: string,
): Promise<string> {
  return invoke('submit_weekly_reflection_job', {
    userId,
    payload: JSON.stringify(payload),
    scheduledAt,
  });
}

export function processQueuedReflectionJobs(): Promise<number> {
  return invoke('process_queued_reflection_jobs');
}

export function exportData(destinationPath: string): Promise<string> {
  return invoke('export_data', { destinationPath });
}
