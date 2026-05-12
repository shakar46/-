import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users,
  ChevronRight,
  ArrowUpRight,
  Globe,
  Zap,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { useFirebase } from "../components/FirebaseProvider";

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-8 rounded-[2rem] border border-slate-100 premium-shadow group relative overflow-hidden"
  >
    <div className={cn("absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] transition-transform duration-700 group-hover:scale-125 group-hover:rotate-12", colorClass)}>
      <Icon size={128} />
    </div>
    
    <div className="flex items-center justify-between mb-10 relative z-10">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner font-bold", colorClass.replace('text-', 'bg-') + "/10", colorClass)}>
        <Icon size={26} strokeWidth={2.5} />
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
        <ArrowUpRight size={16} />
      </div>
    </div>
    
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">{title}</p>
    <div className="flex items-baseline gap-2 relative z-10">
      <h4 className="text-4xl font-bold tracking-tight text-slate-900">{value}</h4>
      <span className="text-[10px] text-slate-400 font-bold tracking-tighter">Ед.</span>
    </div>
  </motion.div>
);

const BranchProgress = ({ name, count, total, index }: { name: string, count: number, total: number, index: number }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end">
      <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{name}</span>
      <span className="text-slate-900 font-bold text-base">{count}</span>
    </div>
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${(count / (total || 1)) * 100}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
        className="h-full bg-slate-900 rounded-full shadow-[0_0_10px_rgba(15,23,42,0.1)]" 
      />
    </div>
  </div>
);

export default function Dashboard() {
  const { userRole, userData, user } = useFirebase();
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inWork: 0,
    completed: 0,
    recentAppeals: [] as any[],
    topBranches: [] as { name: string, count: number }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const todayStart = startOfDay(new Date());

        const q = query(
          collection(db, "requests"), 
          where("createdAt", ">=", todayStart),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        let todayRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        if (userRole === 'manager' && userData?.branchId) {
          todayRequests = todayRequests.filter(r => r.branchId === userData.branchId);
        }

        const branchCounts = todayRequests.reduce((acc: any, curr: any) => {
          const bName = curr.branchId || "Неизвестно";
          acc[bName] = (acc[bName] || 0) + 1;
          return acc;
        }, {});

        const topBranches = Object.entries(branchCounts)
          .map(([name, count]) => ({ 
            name, 
            count: count as number
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const convertToDate = (val: any) => {
          if (!val) return null;
          if (typeof val.toDate === 'function') return val.toDate();
          if (val._seconds) return new Date(val._seconds * 1000);
          if (val.seconds) return new Date(val.seconds * 1000);
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date;
        };

        setStats({
          total: todayRequests.length,
          new: todayRequests.filter(r => r.status === "new" || !r.status).length,
          inWork: todayRequests.filter(r => r.status === "in_progress").length,
          completed: todayRequests.filter(r => r.status === "done").length,
          recentAppeals: todayRequests.map(r => ({ ...r, _date: convertToDate(r.createdAt) })),
          topBranches
        });
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        handleFirestoreError(error, OperationType.LIST, "requests");
      }
      setLoading(false);
    };
    fetchData();
  }, [user, userRole, userData?.branchId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 18) return "Добрый день";
    return "Добрый вечер";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full mb-4" 
        />
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">Инициализация данных...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-accent font-bold text-[10px] uppercase tracking-[0.25em]">{getGreeting()}, {user?.displayName?.split(' ')[0] || "Герой"}!</span>
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Ваш обзор сессии
          </h1>
          <p className="text-slate-400 text-lg mt-3 max-w-lg font-medium leading-relaxed">
            Сегодня система зафиксировала <span className="text-slate-900 font-bold">{stats.total} обращения</span>. Вот краткий дайджест активности.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/quick-request"
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold text-sm tracking-tight interactive-scale shadow-xl shadow-slate-200"
          >
            <Plus size={18} />
            Быстрый ввод
          </Link>
        </div>
      </section>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Всего сегодня" value={stats.total} icon={MessageSquare} colorClass="text-slate-900" />
        <StatCard title="Новые в очереди" value={stats.new} icon={AlertCircle} colorClass="text-accent" />
        <StatCard title="В обработке" value={stats.inWork} icon={Clock} colorClass="text-warning" />
        <StatCard title="Успешно решено" value={stats.completed} icon={CheckCircle2} colorClass="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-10">
        {/* Recent Activity */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold tracking-tight">Последние записи</h3>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">{stats.recentAppeals.length}</span>
            </div>
            <Link to="/requests" className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-[0.2em] hover:translate-x-1 transition-transform">
              Архив запросов <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 premium-shadow divide-y divide-slate-50 overflow-hidden">
            {stats.recentAppeals.slice(0, 6).map((request, index) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={request.id}
              >
                <Link 
                  to={`/requests/${request.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 hover:bg-slate-50 transition-all group relative"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 leading-tight mb-1 group-hover:text-accent transition-colors">
                        {request.clientName || "Анонимный гость"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{request.branchId}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{request.classification || "Категория не указана"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 mt-4 sm:mt-0">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-bold text-slate-900">
                        {request._date ? format(request._date, "HH:mm") : "—"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        {request._date ? format(request._date, "d MMMM", { locale: ru }) : "—"}
                      </p>
                    </div>
                    
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm",
                      request.status === "in_progress" ? "bg-warning/10 text-warning border-warning/10" : 
                      request.status === "done" ? "bg-success/10 text-success border-success/10" : 
                      request.status === "new" ? "bg-accent/10 text-accent border-accent/10" :
                      "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      {request.status === "in_progress" ? "В работе" : 
                       request.status === "done" ? "Решено" : 
                       request.status === "new" ? "Новый" : "Архив"}
                    </div>
                    
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-slate-900 group-hover:bg-slate-100 transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            {stats.recentAppeals.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} className="text-slate-200" />
                </div>
                <p className="text-slate-900 font-bold text-lg mb-2 tracking-tight">Рабочая нагрузка снята</p>
                <p className="text-slate-400 text-sm mb-10 max-w-xs mx-auto">Все текущие обращения обработаны и закрыты. Хорошая работа!</p>
                <Link to="/quick-request" className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-transform shadow-xl shadow-slate-200">
                  <Plus size={18} />
                  Создать запись
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Top Branches */}
        {userRole !== 'manager' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-bold tracking-tight px-2">Локации</h3>
            
            <div className="bg-white p-10 rounded-[3rem] premium-shadow border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <Globe size={20} />
                </div>
                <div>
                  <h4 className="text-slate-900 font-bold text-lg tracking-tight leading-none">Филиалы</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Топ по нагрузке</p>
                </div>
              </div>
              
              <div className="space-y-8 mb-10">
                {stats.topBranches.length > 0 ? stats.topBranches.map((item, i) => (
                  <BranchProgress 
                    key={item.name}
                    name={item.name}
                    count={item.count}
                    total={stats.topBranches[0].count}
                    index={i}
                  />
                )) : (
                  <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Нет данных для анализа</p>
                  </div>
                )}
              </div>
              
              <Link to="/analytics" className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-900 hover:text-white py-5 rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.25em] transition-all group/btn border border-slate-100">
                Полный отчет <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* AI Insight Box */}
            <div className="glass-card border-accent/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute right-4 top-4 text-accent/10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <Zap size={48} />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-accent font-black text-[9px] uppercase tracking-[0.2em] mb-4">
                <Zap size={10} />
                <span>AI Insights</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                Сегодня преобладает категория <span className="font-bold text-slate-900">"{stats.recentAppeals[0]?.classification || "Сервис"}"</span>. Рекомендуем обратить внимание на обучение персонала в филиале <span className="font-bold text-slate-900">{stats.topBranches[0]?.name || "Центральный"}</span>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
