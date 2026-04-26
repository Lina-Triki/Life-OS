import { useMemo } from 'react';
import { useAppStore } from '../store';

function XPProgressBar({ currentXP, nextLevelXP }: { currentXP: number; nextLevelXP: number }) {
  const progress = Math.min(100, (currentXP / nextLevelXP) * 100);
  return (
    <div className="card progress-card">
      <div className="card-header">
        <div>
          <p className="card-label">XP Progress</p>
          <h2>{currentXP} / {nextLevelXP}</h2>
        </div>
        <span className="pill">Level {Math.ceil(currentXP / 200)}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="caption">{progress.toFixed(0)}% to the next milestone.</p>
    </div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card stat-card">
      <p className="card-label">{label}</p>
      <h3>{value}</h3>
      <p className="caption">{detail}</p>
    </div>
  );
}

export function Dashboard() {
  const tasks = useAppStore((state) => state.tasks);
  const reflections = useAppStore((state) => state.reflections);
  const processQueue = useAppStore((state) => state.processQueue);

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'Completed').length,
    [tasks],
  );

  const pendingCount = useMemo(
    () => tasks.filter((task) => task.status === 'Pending').length,
    [tasks],
  );

  const reflectionPending = useMemo(
    () => reflections.filter((job) => job.status === 'PENDING' || job.status === 'FAILED').length,
    [reflections],
  );

  const currentXP = completedCount * 50 + pendingCount * 10;
  const nextLevelXP = 2000;

  return (
    <div className="dashboard-grid">
      <XPProgressBar currentXP={currentXP} nextLevelXP={nextLevelXP} />
      <div className="dashboard-panels">
        <StatCard label="Completed Tasks" value={`${completedCount}`} detail="Today’s progress toward your streak." />
        <StatCard label="Pending Tasks" value={`${pendingCount}`} detail="Work items waiting for completion." />
        <StatCard label="Reflection Jobs" value={`${reflectionPending}`} detail="Pending AI check-ins in the queue." />
      </div>

      <div className="card quick-actions-card">
        <div className="card-header">
          <div>
            <p className="card-label">Quick actions</p>
            <h2>Keep the system moving</h2>
          </div>
        </div>
        <div className="action-list">
          <button className="primary-button" onClick={() => void processQueue()}>
            Process queued reflections
          </button>
          <button className="secondary-button" disabled>
            Sync full report (coming soon)
          </button>
        </div>
      </div>
    </div>
  );
}
