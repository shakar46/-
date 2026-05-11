import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare,
  MessageCircle,
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
  CheckCircle2,
  History,
  Zap,
  HelpCircle,
  AlertCircle,
  TrendingUp,
  User,
  Book
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
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Analytics from "./pages/Analytics";
import PublicForm from "./pages/PublicForm";
import RepeatingRequests from "./pages/RepeatingRequests";
import TelegramSettings from "./pages/TelegramSettings";
import QuickRequest from "./pages/QuickRequest";
import PoisoningRequest from "./pages/PoisoningRequest";
import Scripts from "./pages/Scripts";
import HowTo from "./pages/HowTo";
import UserManagement from "./pages/UserManagement";
import AcceptedResolutions from "./pages/AcceptedResolutions";
import AnalyticsDetail from "./pages/AnalyticsDetail";
import LearningBase from "./pages/LearningBase";
import PerformanceStats from "./pages/PerformanceStats";
import DictionaryManagement from "./pages/DictionaryManagement";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import GiveFeedback from "./pages/GiveFeedback";

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
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
        "flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
        active 
          ? "bg-slate-900 text-white shadow-2xl shadow-slate-400/20 scale-[1.02]" 
          : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-lg hover:shadow-slate-200/50 hover:scale-[1.01]"
      )}
    >
      {active && (
        <motion.div 
          layoutId="active-glow"
          className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className={cn("transition-all relative z-10", active ? "text-white" : "text-slate-400 group-hover:text-slate-900 group-hover:rotate-6")} />
      <span className={cn("text-sm transition-all relative z-10", active ? "font-bold tracking-tight" : "font-semibold")}>{label}</span>
      {active && (
        <motion.div 
          layoutId="active-indicator" 
          className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]"
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

  // Pages that don't need the sidebar layout
  const noLayoutPages = ["/form", "/landing", "/login"];
  const isNoLayout = noLayoutPages.includes(location.pathname) || (!isAuthorized && location.pathname === "/");

  const menuItems = [];
  
  if (userRole !== 'operator') {
    menuItems.push({ to: "/", icon: LayoutDashboard, label: "Обзор" });
  }

  menuItems.push({ to: "/requests", icon: MessageSquare, label: "Запросы" });

  if (userRole === 'owner' || userRole === 'admin' || userRole === 'operator' || userRole === 'head' || userRole === 'manager') {
    menuItems.push({ to: "/quick-request", icon: Plus, label: "Новое" });
  }

  if (userRole !== 'operator') {
    menuItems.push({ to: "/repeating", icon: Users, label: "Повторы" });
  }

  if (userRole === 'owner' || userRole === 'admin' || userRole === 'head' || userRole === 'operator') {
    if (userRole !== 'operator') {
      menuItems.push({ to: "/resolutions", icon: ShieldCheck, label: "Решения" });
    }
    menuItems.push({ to: "/scripts", icon: Zap, label: "Скрипты" });
    menuItems.push({ to: "/learning-base", icon: FileText, label: "База обучения" });
  }

  if (userRole === 'admin' || userRole === 'operator' || userRole === 'owner' || userRole === 'head') {
    menuItems.push({ to: "/analytics", icon: BarChart3, label: "Аналитика" });
  }

  if (userRole === 'manager' || userRole === 'head') {
    menuItems.push({ to: "/give-feedback", icon: MessageCircle, label: "Дать ОС" });
  }

  menuItems.push({ to: "/profile", icon: User, label: "Профиль" });
  menuItems.push({ to: "/how-to", icon: HelpCircle, label: "Инфо" });

  if (userRole === "owner" || userRole === "head") {
    menuItems.push({ to: "/performance", icon: TrendingUp, label: "Продуктивность" });
  }

  if (userRole === "admin" || userRole === "owner" || userRole === 'head') {
    menuItems.push({ to: "/users", icon: Users, label: "Команда" });
  }

  if (userRole === "admin" || userRole === "owner" || userRole === "head") {
    menuItems.push({ to: "/dictionaries", icon: Book, label: "Справочники" });
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center shadow-2xl shadow-slate-200"
        >
          <ShieldCheck size={32} className="text-white" />
        </motion.div>
        <p className="mt-8 text-slate-900 font-black text-2xl uppercase tracking-[0.2em]">CRM</p>
        <div className="mt-2 w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            animate={{ x: [-100, 100] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-full h-full bg-accent"
          />
        </div>
      </div>
    );
  }

  if (isNoLayout) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  if (!isAuthorized) {
    return <Landing />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-white border-r border-slate-100 p-8">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 px-2 group cursor-pointer">
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="w-11 h-11 bg-slate-900 rounded-[14px] flex items-center justify-center shadow-xl shadow-slate-200 rotate-3 font-bold text-white text-xl"
            >
              Ш
            </motion.div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">CRM Feedback</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 opacity-60">Enterprise System</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1 custom-scrollbar overflow-y-auto pr-2">
            {menuItems.map((item, idx) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.4 }}
              >
                <SidebarItem 
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))} 
                />
              </motion.div>
            ))}
          </nav>

          <footer className="mt-8 pt-6 border-t border-slate-100">
            <div 
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all group cursor-pointer"
            >
              <div className="relative">
                <img 
                  src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                  alt="User" 
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success border-2 border-white rounded-full" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold truncate group-hover:text-accent transition-colors">{user?.displayName || "Operator"}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {userRole === 'owner' ? 'Владелец' : 
                   userRole === 'head' ? 'Руководитель' :
                   userRole === 'admin' ? 'Админ' : 
                   userRole === 'manager' ? 'Менеджер' : 
                   userRole === 'operator' ? 'Оператор' : 
                   userRole === 'viewer' ? 'Зритель' : 'Гость'}
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
          </footer>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-100 h-20 px-6 flex items-center justify-between z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg font-bold text-white text-xl">
            Ш
          </div>
          <h1 className="font-bold text-lg tracking-tight">CRM Feedback</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
        >
          <Menu size={22} />
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="lg:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white z-[120] p-8 flex flex-col shadow-2xl rounded-l-[40px]"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black tracking-tight">Навигация</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2.5 bg-slate-50 rounded-xl text-slate-500"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {menuItems.map((item, idx) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-3xl transition-all border border-transparent relative overflow-hidden",
                        location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))
                          ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 active:scale-95" 
                          : "text-slate-600 hover:bg-slate-50 hover:border-slate-100"
                      )}
                    >
                      {(location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))) && (
                         <motion.div 
                           layoutId="active-glow-mobile"
                           className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent pointer-events-none"
                         />
                      )}
                      <item.icon size={22} className={cn("relative z-10", (location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))) ? "text-white" : "text-slate-400")} />
                      <span className="text-[17px] font-bold relative z-10">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <button
                onClick={handleLogout}
                className="mt-8 w-full flex items-center justify-center gap-3 bg-red-50 text-red-500 py-5 rounded-[24px] font-bold transition-all active:scale-95"
              >
                <LogOut size={20} />
                Выйти из системы
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-10 lg:py-16 pt-28 lg:pt-16">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </div>
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
              {/* If authorized, root is Dashboard, otherwise Landing */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/requests/:id" element={<RequestDetail />} />
              <Route path="/repeating" element={<RepeatingRequests />} />
              <Route path="/resolutions" element={<AcceptedResolutions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/analytics/:type" element={<AnalyticsDetail />} />
              <Route path="/settings" element={<TelegramSettings />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/quick-request" element={<QuickRequest />} />
              <Route path="/poisoning-request" element={<PoisoningRequest />} />
              <Route path="/scripts" element={<Scripts />} />
              <Route path="/learning-base" element={<LearningBase />} />
              <Route path="/performance" element={<PerformanceStats />} />
              <Route path="/dictionaries" element={<DictionaryManagement />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/how-to" element={<HowTo />} />
              <Route path="/give-feedback" element={<GiveFeedback />} />
              <Route path="/form" element={<PublicForm />} />
            </Routes>
          </Layout>
        </Router>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
