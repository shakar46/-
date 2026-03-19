import React, { useState, useEffect, useMemo } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Search, History, ChevronRight, Phone, MapPin, Tag, Calendar, Filter, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { BRANCH_NAMES, COMPLAINT_CLASSIFICATIONS } from "../constants";

export default function ComplaintHistory() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const q = query(collection(db, "appeals"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAppeals(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "appeals");
      }
      setLoading(false);
    };
    fetchAppeals();
  }, []);

  const filteredAppeals = useMemo(() => {
    return appeals.filter(a => {
      const search = searchQuery.toLowerCase();
      const matchesSearch = (
        a.client_name?.toLowerCase().includes(search) ||
        a.client_phone?.includes(search) ||
        a.complaint_classification?.toLowerCase().includes(search) ||
        a.branch_name?.toLowerCase().includes(search)
      );

      const matchesStatus = statusFilter === "All" || a.status === statusFilter;
      const matchesBranch = branchFilter === "All" || a.branch_name === branchFilter;
      const matchesClass = classFilter === "All" || a.complaint_classification === classFilter;

      let matchesDate = true;
      if (startDate && endDate) {
        const date = new Date(a.created_at);
        matchesDate = isWithinInterval(date, {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate))
        });
      }

      return matchesSearch && matchesStatus && matchesBranch && matchesClass && matchesDate;
    });
  }, [appeals, searchQuery, statusFilter, branchFilter, classFilter, startDate, endDate]);

  const resetFilters = () => {
    setStatusFilter("All");
    setBranchFilter("All");
    setClassFilter("All");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-black">История жалоб</h1>
          <p className="text-zinc-500">Полный лог всех обращений и жалоб в системе.</p>
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            showFilters ? "bg-black text-white" : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <Filter size={20} />
          {showFilters ? "Скрыть фильтры" : "Фильтры"}
        </button>
      </header>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Статус</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="All">Все статусы</option>
                    <option value="Новый">Новый</option>
                    <option value="В работе">В работе</option>
                    <option value="Выполнен">Выполнен</option>
                    <option value="Отменен">Отменен</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Филиал</label>
                  <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="All">Все филиалы</option>
                    {BRANCH_NAMES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Классификация</label>
                  <select 
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="All">Все категории</option>
                    {COMPLAINT_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-1 md:col-span-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Период</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                    />
                    <span className="text-zinc-300">—</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={resetFilters}
                  className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg transition-all"
                >
                  <X size={14} />
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input
          type="text"
          placeholder="Поиск по имени, телефону, филиалу или классификации..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-lg focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
        />
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Дата</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Клиент</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Филиал</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Классификация</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Статус</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredAppeals.map((appeal) => (
                <tr key={appeal.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                      <Calendar size={14} className="text-zinc-400" />
                      {format(new Date(appeal.created_at), "dd.MM.yyyy", { locale: ru })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-black">{appeal.client_name || "Без имени"}</span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Phone size={10} /> {appeal.client_phone}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <MapPin size={14} className="text-zinc-400" />
                      {appeal.branch_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Tag size={14} className="text-zinc-400" />
                      {appeal.complaint_classification}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${
                      appeal.status === "Выполнен" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      appeal.status === "В работе" ? "bg-amber-50 text-amber-600 border-amber-100" :
                      appeal.status === "Новый" ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-zinc-50 text-zinc-400 border-zinc-100"
                    }`}>
                      {appeal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/appeals/${appeal.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-black transition-colors"
                    >
                      Открыть <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAppeals.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
              <History size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">История пуста</h3>
            <p className="text-zinc-500">Обращений по вашему запросу не найдено.</p>
          </div>
        )}
      </div>
    </div>
  );
}
