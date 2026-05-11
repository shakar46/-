import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronRight, 
  Clock,
  User,
  Trash2,
  ArrowUpDown,
  AlertCircle,
  MessageSquare,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES } from "../constants";
import { CRMRequest } from "../types";
import { useFirebase } from "../components/FirebaseProvider";
import { SearchableSelect } from "../components/SearchableSelect";
import * as XLSX from "xlsx";
import { safeFormat } from "../utils/dateUtils";
import { cn } from "../lib/utils";
import { ru } from "date-fns/locale";

export default function Requests() {
  const [requests, setRequests] = useState<CRMRequest[]>([]);
  const [dictionaries, setDictionaries] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [importanceFilter, setImportanceFilter] = useState("Все");
  const [classificationFilter, setClassificationFilter] = useState("Все");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { userRole, userData } = useFirebase();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const requestsQ = userRole === 'manager' && userData?.branchId
        ? query(collection(db, "requests"), where("branchId", "==", userData.branchId), orderBy("createdAt", "desc"))
        : query(collection(db, "requests"), orderBy("createdAt", "desc"));

      const dictQ = query(collection(db, "dictionaries"));
      
      const [requestsSnapshot, dictSnapshot] = await Promise.all([
        getDocs(requestsQ),
        getDocs(dictQ)
      ]);

      const data = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as CRMRequest));
      setRequests(data);

      const dictData: Record<string, any> = {};
      dictSnapshot.docs.forEach(doc => {
        dictData[doc.id] = doc.data();
      });
      setDictionaries(dictData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "requests");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [userRole, userData?.branchId]);

  const handleDelete = async (id: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/requests/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: id })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setRequests(requests.filter(r => r.id !== id));
      setDeleteConfirmId(null);
    } catch (error: any) {
      alert("Ошибка при удалении: " + error.message);
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

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clientPhone?.includes(searchQuery) ||
      r.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.classification?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(r.classificationSection) 
        ? r.classificationSection.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
        : r.classificationSection?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.branchId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.finalResolution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id && r.id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "Все" || 
      (statusFilter === "Новый" && (!r.status || r.status === "new")) ||
      (statusFilter === "В работе" && r.status === "in_progress") || 
      (statusFilter === "На проверке" && r.status === "under_review") || 
      (statusFilter === "Выполнено" && r.status === "done") ||
      (statusFilter === "Отменен" && r.status === "cancelled");
    
    const matchesBranch = userRole === 'manager' || branchFilter === "Все" || r.branchName === branchFilter || r.branchId === branchFilter;
    const matchesImportance = importanceFilter === "Все" || r.significance === importanceFilter;
    const matchesClassification = classificationFilter === "Все" || r.classification === classificationFilter;

    const requestDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
    const matchesDate = (!startDate || requestDate >= new Date(startDate)) && 
                        (!endDate || requestDate <= new Date(endDate + "T23:59:59"));

    return matchesSearch && matchesStatus && matchesBranch && matchesImportance && matchesClassification && matchesDate;
  }).sort((a, b) => {
    const valA = (a as any)[sortField];
    const valB = (b as any)[sortField];
    
    if (sortField === "createdAt") {
      const dateA = valA?.toDate ? valA.toDate() : new Date(valA || 0);
      const dateB = valB?.toDate ? valB.toDate() : new Date(valB || 0);
      return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
    
    return sortOrder === "asc" ? (valA || "").toString().localeCompare(valB || "") : (valB || "").toString().localeCompare(valA || "");
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ";
    switch (status) {
      case "in_progress": return <span className={base + "bg-warning/10 text-warning border-warning/20"}>В работе</span>;
      case "under_review": return <span className={base + "bg-accent/10 text-accent border-accent/20"}>Проверка</span>;
      case "done": return <span className={base + "bg-success/10 text-success border-success/20"}>Решено</span>;
      case "cancelled": return <span className={base + "bg-slate-100 text-slate-400 border-slate-200"}>Отменен</span>;
      default: return <span className={base + "bg-accent/10 text-accent border-accent/20"}>Новый</span>;
    }
  };

  const handleExport = () => {
    const exportData = filteredRequests.map(r => ({
      "ID": r.id,
      "Дата": safeFormat(r.createdAt, "dd.MM.yyyy HH:mm"),
      "Клиент": r.clientName,
      "Телефон": r.clientPhone,
      "Филиал": r.branchId,
      "Категория": r.classification,
      "Статус": r.status || "new",
      "Сообщение": r.message,
      "Решение": r.finalResolution
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requests");
    XLSX.writeFile(wb, `Requests_${safeFormat(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  const branchOptions = ["Все", ...(dictionaries.branch_names?.items || BRANCH_NAMES)];
  const classificationOptions = ["Все", ...(dictionaries.classification?.items || [])];

  return (
    <div className="space-y-10 pb-20">
      {/* Page Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-slate-400" />
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Управление очередью</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Журнал обращений
          </h1>
          <p className="text-slate-400 text-lg mt-3 max-w-lg font-medium leading-relaxed">
            Полноценный контроль качества и детальный анализ каждого инцидента.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white text-slate-600 border border-slate-100 px-6 py-3.5 rounded-2xl font-bold text-sm tracking-tight interactive-scale shadow-sm"
          >
            <Download size={18} />
            Экспорт
          </button>
          {(userRole === 'admin' || userRole === 'owner' || userRole === 'head' || userRole === 'manager') && (
            <Link
              to="/quick-request"
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-sm tracking-tight interactive-scale shadow-xl shadow-slate-200"
            >
              <Plus size={20} />
              Новая запись
            </Link>
          )}
        </div>
      </header>

      {/* Advanced Filter Section */}
      <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 premium-shadow">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Глобальный поиск по всем полям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all interactive-scale",
              showFilters ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-500 border border-slate-100'
            )}
          >
            <Filter size={18} />
            {showFilters ? 'Закрыть' : 'Фильтры'}
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
              <div className="pt-8 border-t border-slate-50 mt-8 space-y-8">
                {/* Row 1: Selects */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Статус решения</label>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                    >
                      <option>Все</option>
                      <option>Новый</option>
                      <option>В работе</option>
                      <option>На проверке</option>
                      <option>Выполнено</option>
                      <option>Отменен</option>
                    </select>
                  </div>
                  {userRole !== 'manager' && (
                    <div className="space-y-3">
                      <SearchableSelect 
                        label="Локация / Филиал"
                        options={branchOptions}
                        value={branchFilter}
                        onChange={setBranchFilter}
                        placeholder="Все филиалы"
                      />
                    </div>
                  )}
                  <div className="space-y-3">
                    <SearchableSelect 
                      label="Классификация"
                      options={classificationOptions}
                      value={classificationFilter}
                      onChange={setClassificationFilter}
                      placeholder="Все категории"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Степень важности</label>
                    <select 
                      value={importanceFilter}
                      onChange={(e) => setImportanceFilter(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                    >
                      <option>Все</option>
                      <option>Критическая</option>
                      <option>Средняя</option>
                      <option>Низкая</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Date Range & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Дата от</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Дата до</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setStatusFilter("Все");
                        setBranchFilter("Все");
                        setImportanceFilter("Все");
                        setClassificationFilter("Все");
                        setStartDate("");
                        setEndDate("");
                        setSearchQuery("");
                      }}
                      className="flex-1 py-4 text-[10px] font-black text-slate-400 hover:text-accent uppercase tracking-widest transition-colors border border-dashed border-slate-100 rounded-2xl hover:bg-slate-50"
                    >
                      Сбросить всё
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Main Table Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 premium-shadow overflow-hidden flex flex-col relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/30">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  <button onClick={() => handleSort("createdAt")} className="flex items-center gap-2 hover:text-slate-900 transition-colors">
                    ID / Дата
                    <ArrowUpDown size={12} className={sortField === "createdAt" ? "text-accent" : "text-slate-200"} />
                  </button>
                </th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  Клиентские данные
                </th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  Контекст запроса
                </th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  Текущий статус
                </th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <div className="w-12 h-12 border-4 border-slate-50 border-t-accent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Запрос в облако...</p>
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-50">
                      <Search size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Пустота</h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">Критерии поиска не совпали ни с одной записью в базе данных.</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request, idx) => (
                  <motion.tr 
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest mb-1.5 opacity-50">#{request.id?.slice(0, 8)}</span>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Clock size={14} className="text-slate-300" />
                          {safeFormat(request.createdAt, "dd MMMM, HH:mm", { locale: ru })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform shadow-sm">
                          <User size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-slate-900 group-hover:text-accent transition-colors">{request.clientName || "Не указан"}</span>
                          <span className="text-[11px] text-slate-400 font-bold tracking-tight">{request.clientPhone || "Нет контакта"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col max-w-[280px]">
                        <span className="text-[9px] font-bold text-accent uppercase tracking-widest mb-1">{request.branchId}</span>
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {request.classification || "Без категории"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {getStatusBadge(request.status || "new")}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        {userRole === 'admin' || userRole === 'owner' ? (
                          <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(request.id!); }}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : null}
                        <Link 
                          to={`/requests/${request.id}`}
                          className="p-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <footer className="px-10 py-8 bg-slate-50/50 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Показано <span className="text-slate-900">{paginatedRequests.length}</span> из <span className="text-slate-900">{filteredRequests.length}</span> записей
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                    currentPage === i + 1 
                      ? "bg-slate-900 text-white shadow-lg" 
                      : "bg-white border border-slate-100 text-slate-400 hover:text-slate-900"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </footer>
      </div>

      {/* Premium Delete Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center border border-white/20"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Подтвердите удаление</h3>
              <p className="text-slate-500 mb-10 text-sm leading-relaxed">Это действие невозможно отменить. Вы уверены, что хотите удалить запись <span className="font-bold text-slate-900">#{deleteConfirmId.slice(0, 8)}</span>?</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="w-full py-4 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-xl shadow-red-200 active:scale-95"
                >
                  Удалить навсегда
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 rounded-2xl font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
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
