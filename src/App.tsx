import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Table, 
  Settings, 
  Bell, 
  Menu, 
  X,
  ChevronRight,
  Search,
  Plus,
  Filter,
  Download,
  Trash2,
  Edit,
  Save,
  ExternalLink,
  Users,
  LogOut,
  LogIn
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FirebaseProvider, useFirebase } from "./components/FirebaseProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

// Pages
import Dashboard from "./pages/Dashboard";
import Appeals from "./pages/Appeals";
import AppealDetail from "./pages/AppealDetail";
import Analytics from "./pages/Analytics";
import PublicForm from "./pages/PublicForm";
import RepeatingAppeals from "./pages/RepeatingAppeals";
import GoogleSheetsView from "./pages/GoogleSheetsView";
import TelegramSettings from "./pages/TelegramSettings";
import QuickAppeal from "./pages/QuickAppeal";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
  key?: string;
}

const SidebarItem = ({ to, icon: Icon, label, active }: SidebarItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-black text-white shadow-lg shadow-black/10" 
        : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
    )}
  >
    <Icon size={20} className={cn("transition-transform duration-200 group-hover:scale-110", active ? "text-white" : "text-zinc-400 group-hover:text-black")} />
    <span className="font-medium text-sm tracking-tight">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-pill" 
        className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
      />
    )}
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userRole, loading } = useFirebase();

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Главная" },
    { to: "/appeals", icon: MessageSquare, label: "Обращения" },
    { to: "/quick-appeal", icon: Plus, label: "Новое обращение" },
    { to: "/repeating", icon: Users, label: "Повторные жалобы" },
    { to: "/analytics", icon: BarChart3, label: "Аналитика" },
    { to: "/google-sheets", icon: Table, label: "Google Таблица" },
    { to: "/settings", icon: Settings, label: "Настройки" },
  ];

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && location.pathname !== "/form") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200 p-10 shadow-xl text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-8">
            <span className="text-white font-bold text-3xl">Ш</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Добро пожаловать</h2>
          <p className="text-zinc-500 mb-8">Пожалуйста, войдите в систему, чтобы продолжить работу с CRM Шакарочка.</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
          >
            <LogIn size={20} />
            Войти через Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-zinc-200 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">Ш</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Шакарочка</h1>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">ултует CRM</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.to} 
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))} 
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-100">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                <img src={user?.photoURL || "https://picsum.photos/seed/admin/100/100"} alt="User" referrerPolicy="no-referrer" />
              </div>
              <div className="max-w-[120px]">
                <p className="text-sm font-bold truncate">{user?.displayName || "Пользователь"}</p>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{userRole || "Загрузка..."}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Выйти"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 h-16 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Ш</span>
          </div>
          <h1 className="font-bold text-sm">Шакарочка</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="lg:hidden fixed inset-0 top-16 bg-white z-40 p-6"
          >
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl",
                    location.pathname === item.to ? "bg-zinc-100 font-bold" : "text-zinc-500"
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:p-10 p-4 pt-20 lg:pt-10 max-w-[1600px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/appeals" element={<Appeals />} />
              <Route path="/appeals/:id" element={<AppealDetail />} />
              <Route path="/repeating" element={<RepeatingAppeals />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/google-sheets" element={<GoogleSheetsView />} />
              <Route path="/settings" element={<TelegramSettings />} />
              <Route path="/quick-appeal" element={<QuickAppeal />} />
              <Route path="/form" element={<PublicForm />} />
            </Routes>
          </Layout>
        </Router>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
