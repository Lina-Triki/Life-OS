import create from 'zustand';
import { getTasks, getDiaryEntries, getReflectionJobs, completeTask as completeTaskCommand, submitWeeklyReflectionJob, processQueuedReflectionJobs } from './api';
import type { CompletionContext, DiaryEntryRow, TaskRow, WeeklyReflectionPayload } from './types';
import type { ReflectionJob } from './api';

export type AppState = {
  tasks: TaskRow[];
  diaryEntries: DiaryEntryRow[];
  reflections: ReflectionJob[];
  loading: boolean;
  statusMessage: string;
  taskError: string | null;
  diaryError: string | null;
  loadTasks: () => Promise<void>;
  loadDiaryEntries: () => Promise<void>;
  loadReflections: () => Promise<void>;
  completeTask: (taskId: string, completionContext: CompletionContext) => Promise<void>;
  requestWeeklyReflection: (userId: string, payload: WeeklyReflectionPayload) => Promise<void>;
  processQueue: () => Promise<void>;
  setStatus: (message: string) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  diaryEntries: [],
  reflections: [],
  loading: false,
  statusMessage: 'Ready',
  taskError: null,
  diaryError: null,
  setStatus: (message: string) => set({ statusMessage: message }),

  loadTasks: async () => {
    set({ loading: true, statusMessage: 'Loading tasks...', taskError: null });
    try {
      const tasks = await getTasks();
      set({ tasks, statusMessage: 'Tasks loaded' });
    } catch (error) {
      set({ taskError: String(error), statusMessage: `Cannot load tasks: ${String(error)}` });
    } finally {
      set({ loading: false });
    }
  },

  loadDiaryEntries: async () => {
    set({ loading: true, statusMessage: 'Loading diary entries...', diaryError: null });
    try {
      const diaryEntries = await getDiaryEntries();
      set({ diaryEntries, statusMessage: 'Diary entries loaded' });
    } catch (error) {
      set({ diaryError: String(error), statusMessage: `Cannot load diary entries: ${String(error)}` });
    } finally {
      set({ loading: false });
    }
  },

  loadReflections: async () => {
    set({ loading: true, statusMessage: 'Loading reflection queue...' });
    try {
      const reflections = await getReflectionJobs();
      set({ reflections, statusMessage: 'Reflection queue loaded' });
    } catch (error) {
      set({ statusMessage: `Cannot load reflections: ${String(error)}` });
    } finally {
      set({ loading: false });
    }
  },

  completeTask: async (taskId: string, completionContext: CompletionContext) => {
    set({ loading: true, statusMessage: 'Completing task...' });
    try {
      await completeTaskCommand(taskId, completionContext);
      await get().loadTasks();
      set({ statusMessage: 'Task completed' });
    } catch (error) {
      set({ statusMessage: `Task completion failed: ${String(error)}` });
    } finally {
      set({ loading: false });
    }
  },

  requestWeeklyReflection: async (userId: string, payload: WeeklyReflectionPayload) => {
    set({ loading: true, statusMessage: 'Scheduling weekly reflection...' });
    try {
      await submitWeeklyReflectionJob(userId, payload, new Date().toISOString());
      await get().loadReflections();
      set({ statusMessage: 'Weekly reflection scheduled' });
    } catch (error) {
      set({ statusMessage: `Reflection scheduling failed: ${String(error)}` });
    } finally {
      set({ loading: false });
    }
  },

  processQueue: async () => {
    set({ loading: true, statusMessage: 'Processing queued reflections...' });
    try {
      const count = await processQueuedReflectionJobs();
      await get().loadReflections();
      set({ statusMessage: `Processed ${count} queued reflections` });
    } catch (error) {
      set({ statusMessage: `Queue processing failed: ${String(error)}` });
    } finally {
      set({ loading: false });
    }
  },
}));
