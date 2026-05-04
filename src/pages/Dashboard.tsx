import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, limit, where } from "firebase/firestore";
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
  ArrowDownRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { useFirebase } from "../components/FirebaseProvider";

export default function Dashboard() {
  const { userRole, userData } = useFirebase();
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inWork: 0,
    completed: 0,
    recentAppeals: [] as any[],
    topBranches: [] as { name: string, count: number, color: string }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const todayStart = startOfDay(new Date());

        // Fetch only today's requests for the list and stats
        const q = query(
          collection(db, "requests"), 
          where("createdAt", ">=", todayStart),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        let todayRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        // Filter by branch for managers
        if (userRole === 'manager' && userData?.branchId) {
          todayRequests = todayRequests.filter(r => r.branchId === userData.branchId);
        }

        const recent = todayRequests;

        const branchCounts = todayRequests.reduce((acc: any, curr: any) => {
          const bName = curr.branchId || "Неизвестно";
          acc[bName] = (acc[bName] || 0) + 1;
          return acc;
        }, {});

        const colors = ["bg-black", "bg-zinc-400", "bg-zinc-200", "bg-zinc-100"];
        const topBranches = Object.entries(branchCounts)
          .map(([name, count], i) => ({ 
            name, 
            count: count as number, 
            color: colors[i % colors.length] 
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setStats({
          total: todayRequests.length,
          new: todayRequests.filter(r => r.status === "new" || !r.status).length,
          inWork: todayRequests.filter(r => r.status === "in_progress").length,
          completed: todayRequests.filter(r => r.status === "done").length,
          recentAppeals: recent,
          topBranches
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "requests");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-12">
      <header className="bg-white p-10 rounded-[3rem] shadow-sm border border-zinc-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-primary/10 transition-all duration-1000" />
        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black tracking-tighter mb-4 text-[#1F2937]"
          >
            Обзор системы
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400 text-lg font-medium leading-relaxed max-w-xl"
          >
            Добро пожаловать в пульс вашей компании. Все ключевые показатели и новые обращения в одном месте.
          </motion.p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Всего сегодня" value={stats.total} icon={MessageSquare} />
        <StatCard title="Новые" value={stats.new} icon={AlertCircle} color="text-primary" />
        <StatCard title="В работе" value={stats.inWork} icon={Clock} color="text-warning" />
        <StatCard title="Завершено" value={stats.completed} icon={CheckCircle2} color="text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-3xl font-black tracking-tight text-[#1F2937]">Последние обращения</h3>
            <Link to="/requests" className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest hover:translate-x-1 transition-transform">
              Смотреть все <ArrowUpRight size={18} />
            </Link>
          </div>
          
          <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-50 max-h-[1000px] overflow-y-auto custom-scrollbar scroll-smooth">
              {stats.recentAppeals.map((request, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={request.id}
                >
                  <Link 
                    to={`/requests/${request.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-8 hover:bg-zinc-50 transition-all group relative"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-primary group-hover:text-white group-hover:rotate-6 transition-all shadow-sm">
                        <MessageSquare size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-xl text-[#1F2937] leading-tight mb-1">{request.clientName}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{request.classification || "Без категории"}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-200" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{request.branchId}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 mt-6 sm:mt-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-[#1F2937]">
                          {request.createdAt ? format(new Date(request.createdAt), "HH:mm") : "—"}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                          {request.createdAt ? format(new Date(request.createdAt), "d MMM", { locale: ru }) : "—"}
                        </p>
                      </div>
                      
                      <div className={cn(
                        "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        request.status === "in_progress" ? "bg-primary/5 text-primary border-primary/10" : 
                        request.status === "done" ? "bg-success/5 text-success border-success/10" : 
                        "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        {request.status === "in_progress" ? "В работе" : "Выполнено"}
                      </div>
                      
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-primary transition-colors">
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
              {stats.recentAppeals.length === 0 && (
                <div className="p-16 text-center">
                  <p className="text-zinc-400 font-black text-sm uppercase tracking-[0.3em] mb-4">Жалоб пока нет</p>
                  <Link to="/quick-request" className="inline-block bg-primary text-white px-8 py-4 rounded-[1.5rem] font-black tracking-widest shadow-xl shadow-primary/20">Добавить первую</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-3xl font-black tracking-tight text-[#1F2937] px-2">Активность</h3>
          
          <div className="bg-[#1F2937] p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <h4 className="text-white font-black text-xl mb-10 tracking-tight">Топ филиалов</h4>
            <div className="space-y-8">
              {stats.topBranches.length > 0 ? stats.topBranches.map((item, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">{item.name}</span>
                    <span className="text-white font-black text-lg">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / stats.topBranches[0].count) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                      className="h-full bg-primary shadow-[0_0_15px_rgba(47,128,237,0.5)]" 
                    />
                  </div>
                </div>
              )) : (
                <p className="text-xs text-zinc-500 text-center py-10 italic">Данные отсутствуют</p>
              )}
            </div>
            
            <Link to="/analytics" className="mt-12 w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all">
              Подробная аналитика <TrendingUp size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color = "text-[#1F2937]" }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden"
    >
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700">
        <Icon size={120} />
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={cn("w-14 h-14 rounded-[1.25rem] bg-zinc-50 flex items-center justify-center shadow-inner", color)}>
          <Icon size={28} />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-black", trendUp ? 'text-success' : 'text-error')}>
            {trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2 relative z-10">{title}</p>
      <h4 className="text-5xl font-black tracking-tighter text-[#1F2937] relative z-10">{value}</h4>
    </motion.div>
  );
}
