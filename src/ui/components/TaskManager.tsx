import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';

const statusOptions = ['All', 'Pending', 'Completed', 'Skipped'] as const;

type StatusOption = typeof statusOptions[number];

export function TaskManager() {
  const tasks = useAppStore((state) => state.tasks);
  const loading = useAppStore((state) => state.loading);
  const taskError = useAppStore((state) => state.taskError);
  const completeTask = useAppStore((state) => state.completeTask);
  const [filter, setFilter] = useState<StatusOption>('All');

  const visibleTasks = useMemo(() => {
    if (filter === 'All') {
      return tasks;
    }
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  if (loading) {
    return (
      <div className="task-page grid gap-6">
        <div className="space-y-3">
          <p className="eyebrow">Task Manager</p>
          <h2 className="text-3xl font-semibold text-white">Loading your task board</h2>
        </div>
        <div className="skeleton-grid lg:grid-cols-3">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (taskError) {
    return (
      <div className="task-page grid gap-6">
        <div className="space-y-3">
          <p className="eyebrow">Task Manager</p>
          <h2 className="text-3xl font-semibold text-white">Unable to load tasks</h2>
        </div>
        <div className="card error-card">
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">Database unavailable</h3>
            <p className="caption">The task database is locked or unavailable. Restart the app or try again in a moment.</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (visibleTasks.length === 0) {
    return (
      <div className="task-page grid gap-6">
        <div className="space-y-3">
          <p className="eyebrow">Task Manager</p>
          <h2 className="text-3xl font-semibold text-white">Start shaping your day</h2>
        </div>
        <div className="card empty-state-card">
          <p className="card-label">No tasks yet</p>
          <h3 className="text-2xl font-semibold text-white">Start building momentum</h3>
          <p className="caption">Once your first task is added and completed, Queenzy will begin tracking streaks and XP.</p>
          <button className="primary-button w-fit cursor-not-allowed opacity-70" disabled>
            Create your first task
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-page grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="eyebrow">Task Manager</p>
          <h2 className="text-3xl font-semibold text-white">Keep your workload aligned</h2>
        </div>
        <div className="filter-buttons">
          {statusOptions.map((option) => (
            <button
              key={option}
              className={`secondary-button ${filter === option ? 'active' : ''}`}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {visibleTasks.map((task) => (
          <motion.article
            key={task.task_id}
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="card task-card"
          >
            <div className="space-y-2">
              <p className="card-label">{task.status}</p>
              <h3 className="text-xl font-semibold text-white">{task.title}</h3>
              <p className="caption">Difficulty: {task.difficulty}</p>
            </div>
            <button
              className="primary-button w-max"
              disabled={task.status === 'Completed'}
              onClick={() =>
                void completeTask(task.task_id, {
                  completedAtUTC: new Date().toISOString(),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  completionDurationMinutes: 15,
                  quality: 'Standard',
                  source: 'Manual',
                  metadataHash: '',
                })
              }
            >
              Complete
            </button>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
