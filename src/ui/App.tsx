import { useEffect } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { TaskManager } from './components/TaskManager';
import { Diary } from './components/Diary';
import { Report } from './components/Report';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/tasks', label: 'Task Manager' },
  { path: '/diary', label: 'Diary' },
  { path: '/reports', label: 'Report' },
];

export default function App() {
  const loadTasks = useAppStore((state) => state.loadTasks);
  const loadDiaryEntries = useAppStore((state) => state.loadDiaryEntries);
  const loadReflections = useAppStore((state) => state.loadReflections);
  const processQueue = useAppStore((state) => state.processQueue);
  const statusMessage = useAppStore((state) => state.statusMessage);

  useEffect(() => {
    void Promise.all([loadTasks(), loadDiaryEntries(), loadReflections()]);
  }, [loadTasks, loadDiaryEntries, loadReflections]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.24),_transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_32%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid gap-6 xl:grid-cols-[260px_1fr]"
          >
            <aside className="space-y-8 rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel backdrop-blur-xl">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Queenzy LifeOS</p>
                <h1 className="text-3xl font-semibold text-white">Life operating system</h1>
                <p className="max-w-xs text-sm leading-6 text-slate-400">
                  Align daily focus, track streaks, and keep AI reflections moving with a polished desktop command center.
                </p>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                        isActive
                          ? 'border-violet-400/30 bg-violet-500/10 text-white shadow-glow'
                          : 'border-white/5 text-slate-300 hover:border-slate-300/20 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">System pulse</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">{statusMessage}</span>
                  <button
                    onClick={() => void processQueue()}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-glow transition hover:brightness-110"
                  >
                    Process Queue
                  </button>
                </div>
                <p className="text-xs text-slate-500">Use this control to hydrate the reflection queue and keep review cadence active.</p>
              </div>
            </aside>

            <main className="space-y-6">
              <div className="grid gap-6 rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Command center</p>
                    <h2 className="text-3xl font-semibold text-white">Focus your next success loop</h2>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-slate-400">
                    Quick access to your dashboard, task manager, diary, and reports keeps every workflow anchored in one responsive desktop shell.
                  </p>
                </div>
              </div>

              <section className="space-y-6">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tasks" element={<TaskManager />} />
                  <Route path="/diary" element={<Diary />} />
                  <Route path="/reports" element={<Report />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </section>
            </main>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
