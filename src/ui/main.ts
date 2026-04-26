import { buildWeeklyReflectionPayload } from './ai-utils';
import type { DiaryEntryRow, TaskRow } from './types';
import { useAppStore } from './store';

const statusElement = document.getElementById('status');
const refreshTasksButton = document.getElementById('refresh-tasks');
const runReflectionButton = document.getElementById('run-reflection');
const taskList = document.getElementById('task-list');
const reflectionList = document.getElementById('reflection-list');

const state = useAppStore();

function updateStatus(message: string) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function renderTasks(tasks: TaskRow[]) {
  if (!taskList) return;
  taskList.innerHTML = '';
  tasks.forEach((task) => {
    const item = document.createElement('li');
    item.textContent = `${task.title} [${task.status}]`;
    const completeButton = document.createElement('button');
    completeButton.textContent = 'Complete';
    completeButton.onclick = async () => {
      await state.completeTask(task.task_id, {
        completedAtUTC: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        completionDurationMinutes: 15,
        quality: 'Standard',
        source: 'Manual',
        metadataHash: '',
      });
      render();
    };
    item.appendChild(completeButton);
    taskList.appendChild(item);
  });
}

function renderReflections(reflections: Array<{ job_id: string; status: string; scheduled_at: string; attempt_count: number; error_message: string | null }>) {
  if (!reflectionList) return;
  reflectionList.innerHTML = '';
  reflections.forEach((job) => {
    const item = document.createElement('li');
    item.textContent = `${job.job_id} — ${job.status} — scheduled ${job.scheduled_at} — attempts ${job.attempt_count}`;
    if (job.error_message) {
      const error = document.createElement('div');
      error.style.color = 'red';
      error.textContent = `Error: ${job.error_message}`;
      item.appendChild(error);
    }
    reflectionList.appendChild(item);
  });
}

async function render() {
  updateStatus(state.statusMessage);
  renderTasks(state.tasks);
  renderReflections(state.reflections);
}

async function refreshAll() {
  await state.loadTasks();
  await state.loadReflections();
  render();
}

function getCurrentWeeklyRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}T00:00:00Z`,
    weekEnd: `${sunday.getUTCFullYear()}-${String(sunday.getUTCMonth() + 1).padStart(2, '0')}-${String(sunday.getUTCDate()).padStart(2, '0')}T23:59:59Z`,
  };
}

async function scheduleWeeklyReflection(): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const range = getCurrentWeeklyRange();
  const payload = buildWeeklyReflectionPayload('local-user', timezone, range.weekStart, range.weekEnd, [], state.tasks as TaskRow[]);
  await state.requestWeeklyReflection('local-user', payload);
  render();
}

refreshTasksButton?.addEventListener('click', async () => {
  await refreshAll();
});

runReflectionButton?.addEventListener('click', async () => {
  await scheduleWeeklyReflection();
});

window.addEventListener('load', async () => {
  await refreshAll();
});
