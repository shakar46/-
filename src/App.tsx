import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
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
  LogIn,
  ShieldCheck,
  History,
  Zap,
  HelpCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FirebaseProvider, useFirebase } from "./components/FirebaseProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { auth, db } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from "firebase/auth";
import { logEvent } from "./utils/logger";
import { doc, getDoc } from "firebase/firestore";
import { cn } from "./lib/utils";

interface SidebarItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
}

// Pages
import Dashboard from "./pages/Dashboard";
import Appeals from "./pages/Appeals";
import AppealDetail from "./pages/AppealDetail";
import Analytics from "./pages/Analytics";
import PublicForm from "./pages/PublicForm";
import RepeatingAppeals from "./pages/RepeatingAppeals";
import TelegramSettings from "./pages/TelegramSettings";
import QuickAppeal from "./pages/QuickAppeal";
import PoisoningAppeal from "./pages/PoisoningAppeal";
import Scripts from "./pages/Scripts";
import HowTo from "./pages/HowTo";
import UserManagement from "./pages/UserManagement";
import ComplaintResolutions from "./pages/ComplaintResolutions";
import AnalyticsDetail from "./pages/AnalyticsDetail";
import LearningBase from "./pages/LearningBase";
import PerformanceStats from "./pages/PerformanceStats";


import { Login } from "./pages/Login";

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    className="w-full"
  >
    {children}
  </motion.div>
);

const SidebarItem = ({ to, icon: Icon, label, active }: SidebarItemProps) => {
  const navigate = useNavigate();
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
        active 
          ? "bg-primary text-white shadow-sm scale-100" 
          : "text-zinc-500 hover:bg-zinc-100 hover:text-primary"
      )}
    >
      <Icon size={20} className={cn("transition-all", active ? "text-white" : "text-zinc-400 group-hover:text-primary")} />
      <span className="font-semibold text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="active-pill" 
          className="ml-auto w-1 h-4 rounded-full bg-white"
        />
      )}
    </Link>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userRole, userData, isAuthorized, loading: firebaseLoading, logout } = useFirebase();

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Обзор" },
    { to: "/appeals", icon: MessageSquare, label: "Обращения" },
    { to: "/quick-appeal", icon: Plus, label: "Новое" },
    { to: "/repeating", icon: Users, label: "Повторы" },
    { to: "/resolutions", icon: ShieldCheck, label: "Решения" },
    { to: "/analytics", icon: BarChart3, label: "Аналитика" },
    { to: "/scripts", icon: Zap, label: "Скрипты" },
    { to: "/learning-base", icon: FileText, label: "База обучения" },
    { to: "/how-to", icon: HelpCircle, label: "Инфо" },
  ];

  if (userRole === "head") {
    menuItems.push({ to: "/performance", icon: TrendingUp, label: "Продуктивность" });
  }

  if (userRole === "admin" || userRole === "head") {
    menuItems.push({ to: "/users", icon: Users, label: "Команда" });
    menuItems.push({ to: "/settings", icon: Settings, label: "Настройки" });
  }

  const handleLogout = () => {
    if (window.confirm("Вы уверены, что хотите выйти?")) {
      logout();
      navigate('/');
    }
  };

  if (firebaseLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-segoe">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center shadow-xl shadow-black/10"
        >
          <ShieldCheck size={32} className="text-white" />
        </motion.div>
        <p className="mt-8 text-zinc-900 font-black text-xl uppercase tracking-widest animate-pulse">Platform SHAKAR</p>
        <p className="mt-2 text-zinc-400 font-bold text-sm tracking-tighter uppercase">Загрузка системы...</p>
      </div>
    );
  }

  if (!isAuthorized && location.pathname !== "/form") {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 font-segoe">
      {/* Sidebar - Standard, Non-floating */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-zinc-200">
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20 rotate-3 font-bold text-white text-xl">
                Ш
              </div>
              <div>
                <h1 className="font-bold text-lg leading-none tracking-tight">CRM</h1>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Feedback System</p>
              </div>
            </div>

            <nav className="flex flex-col gap-1 pr-1">
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
          </div>

          <div className="mt-auto p-6 border-t border-zinc-100">
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <img 
                src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/100/100`} 
                alt="User" 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-lg object-cover border border-zinc-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user?.displayName || "Operator"}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {userRole === 'admin' ? 'Админ' : userRole === 'manager' ? 'Менеджер' : 'Оператор'}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header - Standard */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 h-16 px-6 flex items-center justify-between z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md font-bold text-white text-xl">
            Ш
          </div>
          <h1 className="font-bold text-lg tracking-tight">CRM</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white z-[120] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Меню</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-zinc-400"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl transition-all",
                      location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))
                        ? "bg-primary text-white shadow-md" 
                        : "text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="text-base font-bold">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <button
                onClick={handleLogout}
                className="mt-6 w-full flex items-center justify-center gap-3 bg-red-50 text-red-500 py-4 rounded-xl font-bold transition-all"
              >
                <LogOut size={20} />
                Выйти
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 lg:p-10 p-6 pt-24 lg:pt-10 max-w-7xl mx-auto w-full min-h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
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
              <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
              <Route path="/appeals" element={<PageTransition><Appeals /></PageTransition>} />
              <Route path="/appeals/:id" element={<PageTransition><AppealDetail /></PageTransition>} />
              <Route path="/repeating" element={<PageTransition><RepeatingAppeals /></PageTransition>} />
              <Route path="/resolutions" element={<PageTransition><ComplaintResolutions /></PageTransition>} />
              <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
              <Route path="/analytics/:type" element={<PageTransition><AnalyticsDetail /></PageTransition>} />
              <Route path="/settings" element={<PageTransition><TelegramSettings /></PageTransition>} />
              <Route path="/users" element={<PageTransition><UserManagement /></PageTransition>} />
              <Route path="/quick-appeal" element={<PageTransition><QuickAppeal /></PageTransition>} />
              <Route path="/poisoning-appeal" element={<PageTransition><PoisoningAppeal /></PageTransition>} />
              <Route path="/scripts" element={<PageTransition><Scripts /></PageTransition>} />
              <Route path="/learning-base" element={<PageTransition><LearningBase /></PageTransition>} />
              <Route path="/performance" element={<PageTransition><PerformanceStats /></PageTransition>} />
              <Route path="/how-to" element={<PageTransition><HowTo /></PageTransition>} />
              <Route path="/form" element={<PublicForm />} />
            </Routes>
          </Layout>
        </Router>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
