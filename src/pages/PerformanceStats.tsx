import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock,
  Filter,
  Calendar,
  ChevronDown,
  UserCheck,
  Activity,
  ArrowRight
} from "lucide-react";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { format, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const PerformanceStats = () => {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const appealsQ = query(collection(db, "appeals"));
        const logsQ = query(collection(db, "complaint_logs"), orderBy("timestamp", "desc"));
        const usersQ = query(collection(db, "users"));

        const [appealsSnap, logsSnap, usersSnap] = await Promise.all([
          getDocs(appealsQ),
          getDocs(logsQ),
          getDocs(usersQ)
        ]);

        setAppeals(appealsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAppeals = useMemo(() => {
    let filtered = [...appeals];
    const now = new Date();
    let start, end;

    if (period === "custom" && startDate && endDate) {
      start = startOfDay(new Date(startDate));
      end = endOfDay(new Date(endDate));
    } else {
      if (period === "day") start = startOfDay(now);
      else if (period === "week") start = startOfWeek(now, { weekStartsOn: 1 });
      else if (period === "month") start = startOfMonth(now);
      else start = subDays(now, 7); // fallback
      end = endOfDay(now);
    }

    return filtered.filter(a => {
      const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
      return isWithinInterval(date, { start, end });
    });
  }, [appeals, period, startDate, endDate]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    let start, end;

    if (period === "custom" && startDate && endDate) {
      start = startOfDay(new Date(startDate));
      end = endOfDay(new Date(endDate));
    } else {
      if (period === "day") start = startOfDay(now);
      else if (period === "week") start = startOfWeek(now, { weekStartsOn: 1 });
      else if (period === "month") start = startOfMonth(now);
      else start = subDays(now, 7);
      end = endOfDay(now);
    }

    return logs.filter(l => {
      const date = new Date(l.timestamp);
      return isWithinInterval(date, { start, end });
    });
  }, [logs, period, startDate, endDate]);

  // Operator Stats (Who closed appeals)
  const operatorPerformance = useMemo(() => {
    const stats: any = {};
    const operators = users.filter(u => u.role === 'operator' || u.role === 'admin');
    
    operators.forEach(op => {
      stats[op.displayName] = {
        name: op.displayName,
        email: op.email,
        closedCount: 0,
        appeals: []
      };
    });

    filteredAppeals.forEach(a => {
      if (a.status === "Выполнен" && a.processed_by_name) {
        if (!stats[a.processed_by_name]) {
          stats[a.processed_by_name] = { name: a.processed_by_name, closedCount: 0, appeals: [] };
        }
        stats[a.processed_by_name].closedCount++;
        stats[a.processed_by_name].appeals.push(a);
      }
    });

    return Object.values(stats).sort((a: any, b: any) => b.closedCount - a.closedCount);
  }, [filteredAppeals, users]);

  // Manager Stats (Who gave assessments/reviews)
  const managerPerformance = useMemo(() => {
    const stats: any = {};
    const managers = users.filter(u => u.role === 'manager' || u.role === 'head');

    managers.forEach(m => {
      stats[m.displayName] = {
        name: m.displayName,
        email: m.email,
        actionCount: 0,
        logs: []
      };
    });

    filteredLogs.forEach(l => {
      if (l.manager_name) {
        if (!stats[l.manager_name]) {
          stats[l.manager_name] = { name: l.manager_name, actionCount: 0, logs: [] };
        }
        stats[l.manager_name].actionCount++;
        stats[l.manager_name].logs.push(l);
      }
    });

    return Object.values(stats).sort((a: any, b: any) => b.actionCount - a.actionCount);
  }, [filteredLogs, users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Отчёт по продуктивности</h1>
          <p className="text-zinc-500">Анализ работы операторов и менеджеров системы.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm">
          <button 
            onClick={() => setPeriod("day")}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", period === "day" ? "bg-black text-white" : "hover:bg-zinc-100")}
          >
            Сегодня
          </button>
          <button 
            onClick={() => setPeriod("week")}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", period === "week" ? "bg-black text-white" : "hover:bg-zinc-100")}
          >
            Неделя
          </button>
          <button 
            onClick={() => setPeriod("month")}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", period === "month" ? "bg-black text-white" : "hover:bg-zinc-100")}
          >
            Месяц
          </button>
          <div className="h-6 w-px bg-zinc-200 mx-1" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriod("custom"); }}
              className="bg-zinc-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-black"
            />
            <span className="text-zinc-400 text-xs">—</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod("custom"); }}
              className="bg-zinc-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Закрыто жалоб</p>
          <p className="text-3xl font-bold">{filteredAppeals.filter(a => a.status === "Выполнен").length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Активность менеджеров</p>
          <p className="text-3xl font-bold">{filteredLogs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Активные сотрудники</p>
          <p className="text-3xl font-bold">{new Set([...filteredLogs.map(l => l.manager_name), ...filteredAppeals.filter(a => a.status === "Выполнен").map(a => a.processed_by_name)]).size - 1}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
            <Clock size={24} />
          </div>
          <p className="text-zinc-500 text-sm font-medium mb-1">Среднее время обработки</p>
          <p className="text-3xl font-bold">~24ч</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Operator Performance Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <UserCheck size={18} />
            </div>
            <h2 className="text-xl font-bold">Продуктивность операторов</h2>
          </div>
          <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Сотрудник</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Закрыто</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Эффективность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {operatorPerformance.map((op: any, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                            {op.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{op.name}</p>
                            <p className="text-[10px] text-zinc-400">{op.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                          {op.closedCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${Math.min(100, (op.closedCount / (filteredAppeals.length || 1)) * 1000)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{Math.round((op.closedCount / (filteredAppeals.length || 1)) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Manager Activity Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
              <Activity size={18} />
            </div>
            <h2 className="text-xl font-bold">Активность менеджеров</h2>
          </div>
          <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Менеджер</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Действий</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Доля</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {managerPerformance.map((m: any, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                            {m.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{m.name}</p>
                            <p className="text-[10px] text-zinc-400">{m.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                          {m.actionCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${Math.min(100, (m.actionCount / (filteredLogs.length || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{Math.round((m.actionCount / (filteredLogs.length || 1)) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Activity Feed (Head Role Specific) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-2">Последние действия сотрудников</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLogs.slice(0, 9).map((l, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {format(new Date(l.timestamp), "dd MMM, HH:mm", { locale: ru })}
                </span>
                <span className="px-2 py-0.5 bg-zinc-100 text-[10px] font-bold rounded-full">
                  {l.action}
                </span>
              </div>
              <p className="text-sm font-bold mb-1">{l.manager_name}</p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ArrowRight size={12} className="text-zinc-300" />
                <span>Обращение #{l.appeal_id?.slice(-6) || "..."}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceStats;
