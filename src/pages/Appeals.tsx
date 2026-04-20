import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  ArrowUpDown,
  X,
  Zap
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES } from "../constants";
import { Appeal } from "../types";
import { useFirebase } from "../components/FirebaseProvider";
import * as XLSX from "xlsx";

import { cn } from "../lib/utils";

export default function Appeals() {
  const location = useLocation();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [importanceFilter, setImportanceFilter] = useState("Все");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    if (search) {
      setSearchQuery(search);
    }
    fetchAppeals();
  }, [location.search]);

  const { userRole, userData } = useFirebase();

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "appeals"), orderBy("created_at", "desc"), limit(1000));
      const querySnapshot = await getDocs(q);
      let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
      
      if (userRole === 'manager' && userData?.responsibleBranch) {
        data = data.filter(a => a.branch === userData.responsibleBranch);
      }
      
      setAppeals(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "appeals");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "appeals", id));
      setAppeals(appeals.filter(a => a.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appeals/${id}`);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, branchFilter, importanceFilter]);

  const isNearingDeadline = (appeal: Appeal) => {
    if (!appeal.completion_date || appeal.deadline) return false;
    try {
      const deadlineDate = new Date(appeal.completion_date);
      const now = new Date();
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffHours = diffTime / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    } catch (e) {
      return false;
    }
  };

  const isOverdue = (appeal: Appeal) => {
    if (!appeal.completion_date || appeal.deadline) return false;
    try {
      const deadlineDate = new Date(appeal.completion_date);
      const now = new Date();
      return deadlineDate.getTime() < now.getTime();
    } catch (e) {
      return false;
    }
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return "—";
    try {
      const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
      if (isNaN(date.getTime())) return "—";
      return format(date, "dd MMM, HH:mm", { locale: ru });
    } catch (e) {
      return "—";
    }
  };

  const filteredAppeals = appeals.filter(a => {
    const matchesSearch = 
      a.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.client_phone?.includes(searchQuery) ||
      a.complaint_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.id && a.id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "Все" || a.status === statusFilter;
    const matchesBranch = branchFilter === "Все" || a.branch_name === branchFilter;
    const matchesImportance = importanceFilter === "Все" || a.complaint_status === importanceFilter;

    return matchesSearch && matchesStatus && matchesBranch && matchesImportance;
  }).sort((a, b) => {
    const valA = (a as any)[sortField];
    const valB = (b as any)[sortField];
    
    if (sortField === "created_at") {
      const dateA = valA?.toDate ? valA.toDate() : new Date(valA || 0);
      const dateB = valB?.toDate ? valB.toDate() : new Date(valB || 0);
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    }
    
    if (typeof valA === "string") {
      return sortOrder === "asc" 
        ? valA.localeCompare(valB || "") 
        : (valB || "").localeCompare(valA);
    }
    
    return sortOrder === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
  });

  const totalPages = Math.ceil(filteredAppeals.length / itemsPerPage);
  const paginatedAppeals = filteredAppeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Новый": return "bg-blue-50 text-blue-600 border-blue-100";
      case "В работе": return "bg-amber-50 text-amber-600 border-amber-100";
      case "Выполнен": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Отменен": return "bg-zinc-100 text-zinc-500 border-zinc-200";
      default: return "bg-zinc-50 text-zinc-400 border-zinc-100";
    }
  };

  const handleExport = () => {
    const safeFormatDate = (dateVal: any, formatStr: string) => {
      try {
        if (!dateVal) return "—";
        const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        if (isNaN(date.getTime())) return "—";
        return format(date, formatStr, { locale: ru });
      } catch (e) {
        return "—";
      }
    };

    const truncate = (str: string, max: number = 32700) => {
      if (!str) return "";
      const s = String(str);
      return s.length > max ? s.substring(0, max) + "..." : s;
    };

    const exportData = filteredAppeals.map(a => ({
      "ID": truncate(a.id),
      "Дата создания": safeFormatDate(a.created_at, "dd.MM.yyyy HH:mm"),
      "Клиент": truncate(a.client_name),
      "Телефон": truncate(a.client_phone),
      "Филиал": truncate(a.branch_name),
      "Классификация": truncate(a.complaint_classification),
      "Раздел": truncate(a.classification_section),
      "Статус": truncate(a.status),
      "Текст обращения": truncate(a.complaint_text),
      "Решение": truncate(a.solution || "—"),
      "Дата выполнения": truncate(a.completion_date || "—"),
      "Дедлайн статус": truncate(a.deadline || "—"),
      "Отдел мотивации": truncate(a.motivation_status || "—"),
      "Источник": truncate(a.source || "—")
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appeals");
    
    // Set column widths
    const wscols = [
      {wch: 15}, {wch: 20}, {wch: 25}, {wch: 15}, {wch: 20}, 
      {wch: 25}, {wch: 25}, {wch: 15}, {wch: 40}, {wch: 30}, 
      {wch: 20}, {wch: 15}, {wch: 20}, {wch: 15}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Appeals_Export_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Обращения</h1>
          <p className="text-zinc-500 mt-1 font-medium">Контроль качества и работа с инцидентами</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all shadow-sm"
          >
            <Download size={18} />
            Экспорт
          </button>
          <Link
            to="/quick-appeal"
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
          >
            <Plus size={18} />
            Оставить отзыв
          </Link>
        </div>
      </header>

      <section className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm space-y-6">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Поиск по клиенту, телефону или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-zinc-400"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
              showFilters ? 'bg-primary text-white shadow-md' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            <Filter size={18} />
            {showFilters ? 'Скрыть фильтры' : 'Развернутые фильтры'}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-zinc-50">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Статус</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-zinc-50 border-white rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm text-[#1F2937]"
                  >
                    <option>Все</option>
                    <option>Новый</option>
                    <option>В работе</option>
                    <option>Выполнен</option>
                    <option>Отменен</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Филиал</label>
                  <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full bg-zinc-50 border-white rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm text-[#1F2937]"
                  >
                    <option>Все</option>
                    {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Степень важности</label>
                  <select 
                    value={importanceFilter}
                    onChange={(e) => setImportanceFilter(e.target.value)}
                    className="w-full bg-zinc-50 border-white rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm text-[#1F2937]"
                  >
                    <option>Все</option>
                    <option>Критические</option>
                    <option>Значимые</option>
                    <option>Незначимые</option>
                  </select>
                </div>
                <div className="flex items-end pb-3">
                  <button 
                    onClick={() => {
                      setStatusFilter("Все");
                      setBranchFilter("Все");
                      setImportanceFilter("Все");
                      setSearchQuery("");
                    }}
                    className="text-[10px] font-black text-zinc-400 hover:text-primary uppercase tracking-[0.2em] transition-colors"
                  >
                    Сбросить всё
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-xl overflow-hidden flex flex-col h-[750px] relative">
        <div className="overflow-auto flex-1 custom-scrollbar scroll-smooth">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-50">
              <tr className="bg-white transition-all">
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors border-b border-zinc-50"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-2">
                    ID / Дата
                    <ArrowUpDown size={14} className={sortField === "created_at" ? "text-primary" : "text-zinc-200"} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors border-b border-zinc-50"
                  onClick={() => handleSort("client_name")}
                >
                  <div className="flex items-center gap-2">
                    Клиент
                    <ArrowUpDown size={14} className={sortField === "client_name" ? "text-primary" : "text-zinc-200"} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors border-b border-zinc-50"
                  onClick={() => handleSort("complaint_classification")}
                >
                  <div className="flex items-center gap-2">
                    Классификация
                    <ArrowUpDown size={14} className={sortField === "complaint_classification" ? "text-primary" : "text-zinc-200"} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors border-b border-zinc-50"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-2">
                    Статус
                    <ArrowUpDown size={14} className={sortField === "status" ? "text-primary" : "text-zinc-200"} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-zinc-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="mt-6 text-zinc-400 text-xs font-black uppercase tracking-widest italic animate-pulse">Синхронизация данных...</p>
                  </td>
                </tr>
              ) : filteredAppeals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-zinc-200">
                      <Search size={40} />
                    </div>
                    <h3 className="text-xl font-black text-zinc-400 tracking-tight">Ничего не найдено</h3>
                    <p className="text-zinc-300 text-sm mt-2">Попробуйте изменить параметры поиска или фильтры.</p>
                  </td>
                </tr>
              ) : (
                paginatedAppeals.map((appeal, idx) => (
                  <React.Fragment key={appeal.id}>
                    <tr 
                      className={cn(
                        "hover:bg-primary/5 transition-all group cursor-pointer relative",
                        expandedRowId === appeal.id ? "bg-primary/5 shadow-inner" : "",
                        isNearingDeadline(appeal) && "bg-warning/5",
                        isOverdue(appeal) && "bg-error/5"
                      )}
                      onClick={() => setExpandedRowId(expandedRowId === appeal.id ? null : appeal.id)}
                    >
                      <td className="px-10 py-8">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em]">#{appeal.id?.slice(0, 8) || "—"}</span>
                            {isNearingDeadline(appeal) && (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-[9px] font-black animate-pulse uppercase tracking-wider">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Срочно</span>
                              </div>
                            )}
                            {isOverdue(appeal) && (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-error/10 text-error text-[9px] font-black uppercase tracking-wider">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Просрочено</span>
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-black flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Clock size={16} className="text-zinc-300 group-hover:text-primary/50" />
                            {formatDate(appeal.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-primary group-hover:shadow-md transition-all">
                            <User size={24} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-black tracking-tight text-[#1F2937] group-hover:text-primary transition-colors">{appeal.client_name}</span>
                            <span className="text-[11px] text-zinc-400 font-black tracking-widest">{appeal.client_phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col max-w-[240px]">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{appeal.branch_name}</span>
                          <span className="text-sm font-black text-[#1F2937] truncate">{appeal.complaint_classification}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate">{appeal.classification_section}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                          getStatusColor(appeal.status)
                        )}>
                          {appeal.status === "Новый" && <AlertCircle size={14} />}
                          {appeal.status === "Выполнен" && <CheckCircle2 size={14} />}
                          {appeal.status}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-4">
                          {userRole === 'admin' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(appeal.id);
                              }}
                              className="p-3 text-zinc-300 hover:text-error hover:bg-error/10 rounded-2xl transition-all active:scale-90"
                              title="Удалить инцидент"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                          <Link 
                            to={`/appeals/${appeal.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-4 bg-zinc-50 text-zinc-400 hover:bg-primary hover:text-white rounded-[1.25rem] transition-all group/btn shadow-inner active:scale-90"
                          >
                            <ChevronRight size={24} className="group-hover/btn:rotate-90 transition-transform" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedRowId === appeal.id && (
                        <tr>
                          <td colSpan={5} className="px-0 py-0 border-none bg-zinc-50/50">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-16 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 border-l-[6px] border-primary m-10 bg-white rounded-[3rem] shadow-xl">
                                <div className="space-y-10">
                                  <div className="relative">
                                    <div className="absolute -left-4 top-0 w-1 h-full bg-primary/20 rounded-full" />
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Суть инцидента</h4>
                                    <p className="text-lg font-bold text-[#1F2937] leading-relaxed italic">
                                      "{appeal.complaint_text || "Описание отсутствует"}"
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-10">
                                    <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                                      <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Мгновенная коррекция</h4>
                                      <p className="text-sm font-black text-success leading-relaxed">
                                        {appeal.instant_correction || "Не заполнено"}
                                      </p>
                                    </div>
                                    <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                                      <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Источник жалобы</h4>
                                      <p className="text-sm font-black text-primary leading-relaxed">
                                        {appeal.source || "Не указан"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                                          <User size={18} />
                                        </div>
                                        <div>
                                          <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ответственный</h5>
                                          <p className="text-sm font-black text-[#1F2937]">{appeal.responsible_person || "Не назначен"}</p>
                                        </div>
                                      </div>
                                      {appeal.processed_by_name && (
                                        <div className="flex items-center gap-3 border-l pl-6 border-zinc-100">
                                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Zap size={18} fill="currentColor" />
                                          </div>
                                          <div>
                                            <h5 className="text-[9px] font-black text-primary uppercase tracking-widest">Обработал менеджер</h5>
                                            <p className="text-sm font-black text-[#1F2937]">{appeal.processed_by_name}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <Link to={`/appeals/${appeal.id}`} className="px-8 py-3 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                                      Редактировать полностью
                                    </Link>
                                  </div>
                                </div>
                                
                                <div className="space-y-8">
                                  <div className="bg-[#1F2937] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
                                    <h4 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Классификация инцидента</h4>
                                    <div className="space-y-6">
                                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <span className="text-zinc-500 text-xs font-black">Кластер:</span>
                                        <span className="text-white text-sm font-black">{appeal.complaint_classification}</span>
                                      </div>
                                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <span className="text-zinc-500 text-xs font-black">Раздел:</span>
                                        <span className="text-white text-sm font-black">{appeal.classification_section}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-zinc-500 text-xs font-black">Продукт/Фокус:</span>
                                        <span className="text-white text-sm font-black truncate max-w-[150px]">{appeal.product_employee || "Не указан"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-100">
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 text-center">Важность</h4>
                                    <div className="flex justify-center">
                                      {appeal.complaint_status ? (
                                        <span className={cn(
                                          "px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-sm",
                                          appeal.complaint_status === 'Критические' ? "bg-error text-white shadow-error/20" :
                                          appeal.complaint_status === 'Значимые' ? "bg-warning text-white shadow-warning/20" :
                                          "bg-primary text-white shadow-primary/20"
                                        )}>
                                          {appeal.complaint_status}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-300 font-black italic">Статус не определен</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Modern Pagination Footer */}
        <footer className="px-10 py-6 bg-white border-t border-zinc-50 flex flex-col xl:flex-row items-center justify-between gap-6 z-[60]">
          <div className="flex items-center gap-6 order-2 xl:order-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] bg-zinc-50 px-5 py-3 rounded-2xl shadow-inner italic">
              CRM <span className="text-zinc-200 mx-2">|</span> 
              Записи <span className="text-primary">{filteredAppeals.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}—{Math.min(filteredAppeals.length, currentPage * itemsPerPage)}</span> 
              из <span className="text-primary">{filteredAppeals.length}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4 order-1 xl:order-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(
                "p-4 rounded-2xl transition-all shadow-sm active:scale-90",
                currentPage === 1 ? 'bg-zinc-50 text-zinc-200 cursor-not-allowed' : 'bg-zinc-100 text-[#1F2937] hover:bg-white hover:shadow-xl hover:text-primary ring-1 ring-black/5'
              )}
            >
              <ChevronRight size={24} className="rotate-180" />
            </button>
            
            <div className="flex items-center gap-2">
              {getPaginationRange(currentPage, totalPages).map((pageNum, idx) => (
                pageNum === '...' ? (
                  <span key={`dots-${idx}`} className="text-zinc-300 px-2 font-black italic tracking-widest">...</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum as number)}
                    className={cn(
                      "w-12 h-12 rounded-[1.25rem] text-xs font-black transition-all shadow-sm active:scale-90",
                      currentPage === pageNum 
                        ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-110' 
                        : 'bg-white text-zinc-400 hover:text-primary hover:bg-zinc-50'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={cn(
                "p-4 rounded-2xl transition-all shadow-sm active:scale-90",
                currentPage === totalPages || totalPages === 0 ? 'bg-zinc-50 text-zinc-200 cursor-not-allowed' : 'bg-zinc-100 text-[#1F2937] hover:bg-white hover:shadow-xl hover:text-primary ring-1 ring-black/5'
              )}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </footer>
      </div>

      {/* Modern High-End Delete Confirm */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-[#1F2937]/30 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] max-w-md w-full p-12 text-center border border-white"
            >
              <div className="w-24 h-24 bg-error/10 text-error rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
                <Trash2 size={40} />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tight text-[#1F2937]">Удалить запись?</h3>
              <p className="text-zinc-500 mb-12 text-lg leading-relaxed">Данные об инциденте <span className="text-[#1F2937] font-black">#{deleteConfirmId.slice(0, 8)}</span> будут стерты навсегда.</p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                  className="w-full py-6 rounded-[2rem] font-black bg-error text-white hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-error/20 text-lg"
                >
                  Подтвердить удаление
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-6 rounded-[2rem] font-black bg-zinc-100 text-[#1F2937] hover:bg-zinc-200 transition-all text-sm uppercase tracking-widest"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getPaginationRange(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const range = [];
  if (current <= 3) {
    range.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    range.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    range.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return range;
}

