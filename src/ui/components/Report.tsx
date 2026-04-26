import { useMemo } from 'react';
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
      <div className="report-page">
        <h2>Report</h2>
        <div className="skeleton-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Report</p>
          <h2>AI reflection queue</h2>
        </div>
      </div>

      <div className="report-grid">
        <div className="card report-summary-card">
          <p className="card-label">Reflection queue</p>
          <h3>{pendingCount} pending</h3>
          <p className="caption">{completedCount} completed</p>
          <button className="primary-button" onClick={() => void processQueue()}>
            Process now
          </button>
        </div>

        <div className="card privacy-card">
          <p className="card-label">Privacy audit</p>
          <h3>PII redaction enforced</h3>
          <p className="caption">All reflection payloads are scrubbed before AI submission.</p>
        </div>
      </div>

      <div className="reflection-list-card card">
        <p className="card-label">Queued jobs</p>
        {reflections.length === 0 ? (
          <p className="caption">No reflection jobs queued yet.</p>
        ) : (
          <div className="reflection-list">
            {reflections.map((job) => (
              <article key={job.job_id} className="reflection-row">
                <div>
                  <h4>{job.job_id}</h4>
                  <p className="caption">{job.status} • Scheduled {new Date(job.scheduled_at).toLocaleString()}</p>
                </div>
                <span className={`status-badge ${job.status.toLowerCase()}`}>{job.status}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
