import { useMemo } from 'react';
import { motion } from 'framer-motion';
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
      <div className="diary-page grid gap-6">
        <div>
          <p className="eyebrow">Diary</p>
          <h2 className="text-3xl font-semibold text-white">Loading reflections</h2>
        </div>
        <div className="skeleton-grid lg:grid-cols-2">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (diaryError) {
    return (
      <div className="diary-page grid gap-6">
        <div>
          <p className="eyebrow">Diary</p>
          <h2 className="text-3xl font-semibold text-white">Unable to load diary</h2>
        </div>
        <div className="card error-card">
          <p className="text-lg font-semibold text-white">Unable to load diary entries</p>
          <p className="caption">Something went wrong while fetching your journal content. Try again later.</p>
        </div>
      </div>
    );
  }

  if (diaryEntries.length === 0) {
    return (
      <div className="diary-page grid gap-6">
        <div>
          <p className="eyebrow">Diary</p>
          <h2 className="text-3xl font-semibold text-white">Start capturing small wins</h2>
        </div>
        <div className="card empty-state-card">
          <p className="card-label">Your reflection vault is empty</p>
          <h3 className="text-2xl font-semibold text-white">Begin your growth journal</h3>
          <p className="caption">Record a quick note about your day and let Queenzy turn it into insight over time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="diary-page grid gap-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="eyebrow">Diary</p>
          <h2 className="text-3xl font-semibold text-white">Weekly reflections</h2>
        </div>
        <p className="caption max-w-xl">{moodSummary || 'No mood summary available yet.'}</p>
      </div>

      <div className="diary-list grid gap-5">
        {diaryEntries.map((entry) => (
          <motion.article
            key={entry.entry_id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="card diary-card"
          >
            <div className="card-header">
              <div>
                <p className="card-label">{entry.mood}</p>
                <h3 className="text-xl font-semibold text-white">{new Date(entry.created_at).toLocaleDateString()}</h3>
              </div>
            </div>
            <p className="leading-7 text-slate-200">{entry.content}</p>
            <p className="caption">Tags: {entry.tags ?? 'None'}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
