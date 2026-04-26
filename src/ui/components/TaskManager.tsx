import { useMemo, useState } from 'react';
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
      <div className="task-page">
        <h2>Task Manager</h2>
        <div className="skeleton-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (taskError) {
    return (
      <div className="task-page">
        <h2>Task Manager</h2>
        <div className="error-card">
          <h3>Database unavailable</h3>
          <p>The task database is locked or unavailable. Please restart the app or try again later.</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (visibleTasks.length === 0) {
    return (
      <div className="task-page">
        <h2>Task Manager</h2>
        <div className="empty-state-card">
          <p className="card-label">No tasks yet</p>
          <h3>Start building momentum</h3>
          <p>Once your first task is added and completed, Queenzy will begin tracking streaks and XP.</p>
          <button className="primary-button" disabled>
            Create your first task
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-page">
      <div className="task-header">
        <div>
          <p className="eyebrow">Task Manager</p>
          <h2>Keep your workload aligned</h2>
        </div>
        <div className="filter-buttons">
          {statusOptions.map((option) => (
            <button
              key={option}
              className={`secondary-button${filter === option ? ' active' : ''}`}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="task-list">
        {visibleTasks.map((task) => (
          <article key={task.task_id} className="task-card">
            <div>
              <p className="card-label">{task.status}</p>
              <h3>{task.title}</h3>
              <p className="caption">Difficulty: {task.difficulty}</p>
            </div>
            <div className="task-actions">
              <button
                className="primary-button"
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
