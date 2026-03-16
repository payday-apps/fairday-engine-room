import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, Database, Megaphone, Target, ShieldAlert, MessageSquare } from 'lucide-react';
import { authenticateAdmin } from './lib/api';
import DataEngine from './pages/DataEngine';
import ContactSubmissions from './pages/ContactSubmissions';

// Placeholder Pages
const GlobalCommand = () => <div className="p-8"><h1>Global Command Center</h1><p className="text-zinc-400 mt-2">System health and daily traffic lights will go here.</p></div>;
const AcquisitionEngine = () => <div className="p-8"><h1>Engine 1: Acquisition</h1><p className="text-zinc-400 mt-2">Trending claims and AI content generation will go here.</p></div>;
const SalesEngine = () => <div className="p-8"><h1>Engine 3: Sales & B2B</h1><p className="text-zinc-400 mt-2">Unsold leads and firm outreach tools will go here.</p></div>;

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Global Command', icon: <Activity size={20} /> },
    { path: '/engine-1', label: 'Engine 1: Acquisition', icon: <Megaphone size={20} /> },
    { path: '/engine-2', label: 'Engine 2: Data & Matching', icon: <Database size={20} /> },
    { path: '/engine-3', label: 'Engine 3: Sales & B2B', icon: <Target size={20} /> },
    { path: '/contact-submissions', label: 'Contact Submissions', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="w-64 bg-surface border-r border-white/5 h-screen p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 bg-neon rounded-lg flex items-center justify-center font-black text-dark text-sm">F</div>
        <div>
          <h1 className="font-bold text-white leading-tight">Engine Room</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Fairday OS</p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-neon/10 text-neon' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    authenticateAdmin().then(setIsAuthenticated);
  }, []);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-dark flex items-center justify-center text-zinc-500">Connecting to Fairday Systems...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400">Your session is invalid or you are not an administrator.</p>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/engine-room">
      <div className="min-h-screen bg-dark flex text-zinc-100 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<GlobalCommand />} />
            <Route path="/engine-1" element={<AcquisitionEngine />} />
            <Route path="/engine-2" element={<DataEngine />} />
            <Route path="/engine-3" element={<SalesEngine />} />
            <Route path="/contact-submissions" element={<ContactSubmissions />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}