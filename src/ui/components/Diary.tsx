import { useMemo } from 'react';
import { useAppStore } from '../store';

export function Diary() {
  const diaryEntries = useAppStore((state) => state.diaryEntries);
  const loading = useAppStore((state) => state.loading);
  const diaryError = useAppStore((state) => state.diaryError);

  const moodSummary = useMemo(() => {
    const moodCounts = diaryEntries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(moodCounts)
      .map(([mood, count]) => `${mood}: ${count}`)
      .join(', ');
  }, [diaryEntries]);

  if (loading) {
    return (
      <div className="diary-page">
        <h2>Diary</h2>
        <div className="skeleton-grid">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (diaryError) {
    return (
      <div className="diary-page">
        <h2>Diary</h2>
        <div className="error-card">
          <h3>Unable to load diary entries</h3>
          <p>Something went wrong while fetching your journal content.</p>
        </div>
      </div>
    );
  }

  if (diaryEntries.length === 0) {
    return (
      <div className="diary-page">
        <h2>Diary</h2>
        <div className="empty-state-card">
          <p className="card-label">Your reflection vault is empty</p>
          <h3>Start capturing small wins</h3>
          <p>Make a note about your day and let Queenzy turn it into weekly insight.</p>
        </div>
      </div>
    );
  }

  return (
      <div className="diary-page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Diary</p>
            <h2>Weekly reflections</h2>
          </div>
          <p className="caption">{moodSummary || 'No mood summary available yet.'}</p>
        </div>
        <div className="diary-list">
          {diaryEntries.map((entry) => (
            <article key={entry.entry_id} className="card diary-card">
              <div className="card-header">
                <div>
                  <p className="card-label">{entry.mood}</p>
                  <h3>{new Date(entry.created_at).toLocaleDateString()}</h3>
                </div>
              </div>
              <p>{entry.content}</p>
              <p className="caption">Tags: {entry.tags ?? 'None'}</p>
            </article>
          ))}
        </div>
      </div>
  );
}
