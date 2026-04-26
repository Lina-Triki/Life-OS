import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';

function XPProgressBar({ currentXP, nextLevelXP }: { currentXP: number; nextLevelXP: number }) {
  const progress = Math.min(100, (currentXP / nextLevelXP) * 100);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="card relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-violet-500/10 via-transparent to-sky-400/10" />
      <div className="relative space-y-5">
        <div className="card-header">
          <div>
            <p className="card-label">XP Progress</p>
            <h2 className="text-3xl font-semibold text-white">{currentXP} / {nextLevelXP}</h2>
          </div>
          <span className="rounded-full bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-200">
            Level {Math.max(1, Math.ceil(currentXP / 200))}
          </span>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="caption">{progress.toFixed(0)}% to the next milestone.</p>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="card"
    >
      <p className="card-label">{label}</p>
      <h3 className="text-3xl font-semibold text-white">{value}</h3>
      <p className="caption">{detail}</p>
    </motion.div>
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
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="grid gap-6">
        <XPProgressBar currentXP={currentXP} nextLevelXP={nextLevelXP} />
        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard label="Completed Tasks" value={`${completedCount}`} detail="Today’s progress toward your streak." />
          <StatCard label="Pending Tasks" value={`${pendingCount}`} detail="Work items waiting for completion." />
          <StatCard label="Reflection Jobs" value={`${reflectionPending}`} detail="Pending AI check-ins in the queue." />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="card"
      >
        <div className="card-header">
          <div>
            <p className="card-label">Quick actions</p>
            <h2 className="text-2xl font-semibold text-white">Keep the system moving</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <button
            className="primary-button w-full"
            onClick={() => void processQueue()}
          >
            Process queued reflections
          </button>
          <button
            className="secondary-button w-full cursor-not-allowed opacity-70"
            disabled
          >
            Sync full report (coming soon)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
