import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
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
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";

export default function Dashboard() {
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        // Fetch only today's appeals for the list and stats
        const q = query(
          collection(db, "appeals"), 
          orderBy("created_at", "desc")
        );
        const querySnapshot = await getDocs(q);
        const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        const todayAppeals = allData.filter(a => new Date(a.created_at) >= today);
        const recent = todayAppeals.slice(0, 5);

        const branchCounts = todayAppeals.reduce((acc: any, curr: any) => {
          acc[curr.branch_name] = (acc[curr.branch_name] || 0) + 1;
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
          total: todayAppeals.length,
          new: todayAppeals.filter(a => a.status === "Новый").length,
          inWork: todayAppeals.filter(a => a.status === "В работе").length,
          completed: todayAppeals.filter(a => a.status === "Выполнен").length,
          recentAppeals: recent,
          topBranches
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "appeals");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Обзор системы</h1>
        <p className="text-zinc-500 text-lg font-medium">Добро пожаловать в CRM Шакарочка. Вот что происходит сегодня.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Всего обращений" value={stats.total} icon={MessageSquare} />
        <StatCard title="Новые" value={stats.new} icon={AlertCircle} color="text-blue-500" />
        <StatCard title="В работе" value={stats.inWork} icon={Clock} color="text-amber-500" />
        <StatCard title="Выполнено" value={stats.completed} icon={CheckCircle2} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight">Последние обращения</h3>
            <Link to="/appeals" className="text-sm font-bold text-zinc-400 hover:text-black flex items-center gap-1 transition-colors">
              Все обращения <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-50">
              {stats.recentAppeals.map((appeal) => (
                <Link 
                  key={appeal.id} 
                  to={`/appeals/${appeal.id}`}
                  className="flex items-center justify-between p-6 hover:bg-zinc-50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-all">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900">{appeal.client_name}</h4>
                      <p className="text-xs text-zinc-400 font-medium">{appeal.complaint_classification || "Без категории"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-xs font-bold text-zinc-900">{format(new Date(appeal.created_at), "HH:mm")}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{format(new Date(appeal.created_at), "d MMM", { locale: ru })}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                      appeal.status === "Новый" ? "bg-blue-50 text-blue-600 border-blue-100" : 
                      appeal.status === "Выполнен" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                      "bg-zinc-100 text-zinc-500 border-zinc-200"
                    }`}>
                      {appeal.status}
                    </span>
                    <ChevronRight size={20} className="text-zinc-200 group-hover:text-black transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold tracking-tight">Активность</h3>
          
          <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm">
            <h4 className="font-bold mb-6">Топ филиалов за сегодня</h4>
            <div className="space-y-6">
              {stats.topBranches.length > 0 ? stats.topBranches.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{item.name}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color}`} 
                      style={{ width: `${(item.count / stats.topBranches[0].count) * 100}%` }} 
                    />
                  </div>
                </div>
              )) : (
                <p className="text-xs text-zinc-400 text-center py-4">Нет данных за сегодня</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color = "text-black" }: any) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center ${color}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-4xl font-bold tracking-tight">{value}</h4>
    </div>
  );
}
