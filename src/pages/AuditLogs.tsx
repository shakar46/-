import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Filter, 
  LogIn, 
  LogOut, 
  Activity, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  where,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: 'login' | 'logout' | 'action';
  action: string;
  timestamp: any;
  metadata?: any;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    let q = query(
      collection(db, "audit_history"), 
      orderBy("timestamp", "desc"),
      limit(pageSize)
    );

    if (typeFilter !== "All") {
      q = query(
        collection(db, "audit_history"),
        where("type", "==", typeFilter),
        orderBy("timestamp", "desc"),
        limit(pageSize)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [typeFilter, pageSize]);

  const filteredLogs = logs.filter(log => {
    const search = searchQuery.toLowerCase();
    return (
      log.userEmail.toLowerCase().includes(search) ||
      log.userName.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search)
    );
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return <LogIn className="text-emerald-500" size={18} />;
      case 'logout': return <LogOut className="text-rose-500" size={18} />;
      case 'action': return <Activity className="text-blue-500" size={18} />;
      default: return <History className="text-zinc-400" size={18} />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'login': return "Вход";
      case 'logout': return "Выход";
      case 'action': return "Действие";
      default: return type;
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">История действий</h1>
        <p className="text-zinc-500">Журнал всех входов, выходов и ключевых действий в системе.</p>
      </header>

      <div className="bg-white p-4 rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text"
            placeholder="Поиск по пользователю или действию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="text-zinc-400" size={20} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-black transition-all cursor-pointer w-full md:w-auto"
          >
            <option value="All">Все события</option>
            <option value="login">Входы</option>
            <option value="logout">Выходы</option>
            <option value="action">Действия</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Время</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Пользователь</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Тип</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-zinc-500">
                    События не найдены
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Calendar size={14} />
                        <span className="text-sm font-medium">
                          {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm:ss", { locale: ru }) : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{log.userName}</p>
                          <p className="text-xs text-zinc-400">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {getTypeText(log.type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-medium text-zinc-700">{log.action}</p>
                      {log.metadata && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(log.metadata).map(([key, val]) => (
                            <span key={key} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                              {key}: {String(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-400 font-medium">
            Показано {filteredLogs.length} последних событий
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPageSize(prev => prev + 50)}
              className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-50 transition-colors"
            >
              Загрузить еще
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
