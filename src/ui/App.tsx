import { useEffect } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
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
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">Queenzy LifeOS</div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="primary-button" onClick={() => void processQueue()}>
          Run reflection queue
        </button>
      </aside>
      <main className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Personal AI Life Operating System</p>
            <h1>Dashboard</h1>
          </div>
          <div className="status-pill">{statusMessage}</div>
        </header>

        <section className="app-content">
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
    </div>
  );
}
