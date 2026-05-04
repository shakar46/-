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
import { CRMRequest } from "../types";
import { useFirebase } from "../components/FirebaseProvider";
import * as XLSX from "xlsx";

import { cn } from "../lib/utils";

export default function Requests() {
  const location = useLocation();
  const [requests, setRequests] = useState<CRMRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [classificationFilter, setClassificationFilter] = useState("Все");
  const [importanceFilter, setImportanceFilter] = useState("Все");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { userRole, userData } = useFirebase();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CRMRequest));
      
      if (userRole === 'manager' && userData?.branchId) {
        data = data.filter(r => r.branchId === userData.branchId);
      }
      
      setRequests(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "requests");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "requests", id));
      setRequests(requests.filter(r => r.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
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
    setCurrentPage(1);
  }, [searchQuery, statusFilter, branchFilter, classificationFilter]);

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

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clientPhone?.includes(searchQuery) ||
      r.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id && r.id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "Все" || 
      (statusFilter === "В работе" && r.status === "in_progress") || 
      (statusFilter === "Выполнено" && r.status === "done");
    
    const matchesBranch = branchFilter === "Все" || r.branchId === branchFilter;
    const matchesClassification = classificationFilter === "Все" || r.classification === classificationFilter;

    return matchesSearch && matchesStatus && matchesBranch && matchesClassification;
  }).sort((a, b) => {
    const valA = (a as any)[sortField];
    const valB = (b as any)[sortField];
    
    if (sortField === "createdAt") {
      const dateA = valA?.toDate ? valA.toDate() : new Date(valA || 0);
      const dateB = valB?.toDate ? valB.toDate() : new Date(valB || 0);
      return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
    
    return sortOrder === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-amber-50 text-amber-600 border-amber-100";
      case "done": return "bg-emerald-50 text-emerald-600 border-emerald-100";
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

    const exportData = filteredRequests.map(r => ({
      "ID": r.id,
      "Дата создания": safeFormatDate(r.createdAt, "dd.MM.yyyy HH:mm"),
      "Клиент": r.clientName,
      "Телефон": r.clientPhone,
      "Филиал": r.branchId,
      "Классификация": r.classification,
      "Статус": r.status === "in_progress" ? "В работе" : "Выполнено",
      "Текст обращения": r.message,
      "Дата завершения": safeFormatDate(r.completedAt, "dd.MM.yyyy")
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requests");
    
    // Set column widths
    const wscols = [
      {wch: 15}, {wch: 20}, {wch: 25}, {wch: 15}, {wch: 20}, 
      {wch: 25}, {wch: 15}, {wch: 40}, {wch: 20}
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Requests_Export_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Запросы</h1>
          <p className="text-zinc-500 mt-1 font-medium">Контроль качества и работа с обращениями</p>
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
            to="/quick-request"
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
          >
            <Plus size={18} />
            Новое обращение
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
              ) : filteredRequests.length === 0 ? (
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
                paginatedRequests.map((request, idx) => (
                  <React.Fragment key={request.id}>
                    <tr 
                      className={cn(
                        "hover:bg-primary/5 transition-all group cursor-pointer relative"
                      )}
                    >
                      <td className="px-10 py-8">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em]">#{request.id?.slice(0, 8) || "—"}</span>
                          </div>
                          <span className="text-sm font-black flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Clock size={16} className="text-zinc-300 group-hover:text-primary/50" />
                            {formatDate(request.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-white group-hover:text-primary group-hover:shadow-md transition-all divide-none">
                            {request.clientPhoto ? (
                              <img src={request.clientPhoto} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <User size={24} />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-black tracking-tight text-[#1F2937] group-hover:text-primary transition-colors">{request.clientName}</span>
                            <span className="text-[11px] text-zinc-400 font-black tracking-widest">{request.clientPhone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col max-w-[240px]">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{request.branchId}</span>
                          <span className="text-sm font-black text-[#1F2937] truncate">{request.classification}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                          getStatusColor(request.status)
                        )}>
                          {request.status === "in_progress" ? "В работе" : "Выполнено"}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <Link 
                            to={`/requests/${request.id}`}
                            className="p-4 bg-zinc-50 text-zinc-400 hover:bg-primary hover:text-white rounded-[1.25rem] transition-all group/btn shadow-inner active:scale-90"
                          >
                            <ChevronRight size={24} className="group-hover/btn:rotate-90 transition-transform" />
                          </Link>
                        </div>
                      </td>
                    </tr>
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
              Записи <span className="text-primary">{filteredRequests.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}—{Math.min(filteredRequests.length, currentPage * itemsPerPage)}</span> 
              из <span className="text-primary">{filteredRequests.length}</span>
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

