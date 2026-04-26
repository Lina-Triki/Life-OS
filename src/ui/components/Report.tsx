import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';

export function Report() {
  const reflections = useAppStore((state) => state.reflections);
  const loading = useAppStore((state) => state.loading);
  const processQueue = useAppStore((state) => state.processQueue);

  const pendingCount = useMemo(
    () => reflections.filter((job) => job.status === 'PENDING' || job.status === 'FAILED').length,
    [reflections],
  );

  const completedCount = useMemo(
    () => reflections.filter((job) => job.status === 'COMPLETED').length,
    [reflections],
  );

  if (loading) {
    return (
      <div className="report-page grid gap-6">
        <div>
          <p className="eyebrow">Report</p>
          <h2 className="text-3xl font-semibold text-white">Review AI operations</h2>
        </div>
        <div className="skeleton-grid lg:grid-cols-2">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="report-page grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="eyebrow">Report</p>
          <h2 className="text-3xl font-semibold text-white">AI reflection queue</h2>
        </div>
        <p className="caption max-w-xl">Track queued jobs, audit privacy posture, and process AI insights when you need them.</p>
      </div>

      <div className="report-grid">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="card"
        >
          <p className="card-label">Reflection queue</p>
          <h3 className="text-3xl font-semibold text-white">{pendingCount} pending</h3>
          <p className="caption">{completedCount} completed</p>
          <button className="primary-button mt-6 w-full" onClick={() => void processQueue()}>
            Process now
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
          className="card"
        >
          <p className="card-label">Privacy audit</p>
          <h3 className="text-2xl font-semibold text-white">PII redaction enforced</h3>
          <p className="caption">All reflection payloads are scrubbed before AI submission.</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        className="card"
      >
        <p className="card-label">Queued jobs</p>
        {reflections.length === 0 ? (
          <p className="caption">No reflection jobs queued yet.</p>
        ) : (
          <div className="reflection-list grid gap-4">
            {reflections.map((job) => (
              <article
                key={job.job_id}
                className="reflection-row rounded-3xl border border-white/10 bg-slate-900/80 p-4"
              >
                <div>
                  <h4 className="text-lg font-semibold text-white">{job.job_id}</h4>
                  <p className="caption">{job.status} • Scheduled {new Date(job.scheduled_at).toLocaleString()}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {job.status}
                </span>
              </article>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
