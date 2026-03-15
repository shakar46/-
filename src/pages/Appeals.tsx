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
  X
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES } from "../constants";
import { Appeal } from "../types";
import * as XLSX from "xlsx";

export default function Appeals() {
  const location = useLocation();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get("search");
    if (search) {
      setSearchQuery(search);
    }
    fetchAppeals();
  }, [location.search]);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "appeals"), orderBy(sortField, sortOrder), limit(100));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appeal));
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
  }, [sortField, sortOrder]);

  const filteredAppeals = appeals.filter(a => {
    const matchesSearch = 
      a.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.client_phone?.includes(searchQuery) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "Все" || a.status === statusFilter;
    const matchesBranch = branchFilter === "Все" || a.branch_name === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

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

    const exportData = filteredAppeals.map(a => ({
      "ID": a.id,
      "Дата": safeFormatDate(a.created_at, "dd.MM.yyyy HH:mm"),
      "Клиент": a.client_name,
      "Телефон": a.client_phone,
      "Филиал": a.branch_name,
      "Классификация": a.complaint_classification,
      "Статус": a.status,
      "Текст обращения": a.complaint_text
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Appeals");
    XLSX.writeFile(wb, `Appeals_Export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Обращения</h1>
          <p className="text-zinc-500">Управление жалобами и запросами клиентов в реальном времени.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white border border-zinc-200 px-5 py-3 rounded-xl font-bold hover:bg-zinc-50 transition-all"
          >
            <Download size={18} />
            Экспорт
          </button>
          <Link
            to="/appeals/new"
            className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
          >
            <Plus size={20} />
            Новое обращение
          </Link>
        </div>
      </header>

      <div className="bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по имени, телефону или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${showFilters ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            <Filter size={18} />
            Фильтры
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-zinc-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Статус</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-black transition-all"
                  >
                    <option>Все</option>
                    <option>Новый</option>
                    <option>В работе</option>
                    <option>Выполнен</option>
                    <option>Отменен</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Филиал</label>
                  <select 
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-black transition-all"
                  >
                    <option>Все</option>
                    {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setStatusFilter("Все");
                      setBranchFilter("Все");
                      setSearchQuery("");
                    }}
                    className="text-xs font-bold text-zinc-400 hover:text-black transition-colors"
                  >
                    Сбросить все фильтры
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-2">
                    ID / Дата
                    <ArrowUpDown size={12} className={sortField === "created_at" ? "text-black" : "text-zinc-300"} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors"
                  onClick={() => handleSort("client_name")}
                >
                  <div className="flex items-center gap-2">
                    Клиент
                    <ArrowUpDown size={12} className={sortField === "client_name" ? "text-black" : "text-zinc-300"} />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Классификация</th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-2">
                    Статус
                    <ArrowUpDown size={12} className={sortField === "status" ? "text-black" : "text-zinc-300"} />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Филиал</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredAppeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-400 font-medium">
                    Ничего не найдено
                  </td>
                </tr>
              ) : (
                filteredAppeals.map((appeal) => (
                  <React.Fragment key={appeal.id}>
                    <tr 
                      className={cn(
                        "hover:bg-zinc-50/50 transition-colors group cursor-pointer",
                        expandedRowId === appeal.id && "bg-zinc-50/80"
                      )}
                      onClick={() => setExpandedRowId(expandedRowId === appeal.id ? null : appeal.id)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-400 mb-1">#{appeal.id.slice(0, 8)}</span>
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Clock size={14} className="text-zinc-300" />
                            {format(new Date(appeal.created_at), "dd MMM, HH:mm", { locale: ru })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                            <User size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{appeal.client_name}</span>
                            <span className="text-xs text-zinc-400">{appeal.client_phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-sm font-medium truncate">{appeal.complaint_classification}</span>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold truncate">{appeal.classification_section}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(appeal.status)}`}>
                          {appeal.status === "Новый" && <AlertCircle size={12} />}
                          {appeal.status === "Выполнен" && <CheckCircle2 size={12} />}
                          {appeal.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-medium">
                          <MapPin size={14} className="text-zinc-300" />
                          {appeal.branch_name}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(appeal.id);
                            }}
                            className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Удалить"
                          >
                            <Trash2 size={16} />
                          </button>
                          <Link 
                            to={`/appeals/${appeal.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all inline-flex items-center gap-1 text-xs font-bold"
                          >
                            Открыть
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedRowId === appeal.id && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0 border-none">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-zinc-50/30"
                            >
                              <div className="px-20 py-8 grid grid-cols-1 md:grid-cols-2 gap-12 border-l-4 border-black ml-6 my-4">
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Текст жалобы</h4>
                                    <p className="text-sm text-zinc-700 leading-relaxed bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
                                      {appeal.complaint_text || "Текст отсутствует"}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Источник</h4>
                                      <p className="text-sm font-medium">{appeal.source || "Не указан"}</p>
                                    </div>
                                    <div>
                                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Дата заказа</h4>
                                      <p className="text-sm font-medium">{appeal.order_date || "Не указана"}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Классификация</h4>
                                    <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-zinc-400">Тип:</span>
                                        <span className="text-sm font-bold">{appeal.complaint_classification}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-zinc-400">Секция:</span>
                                        <span className="text-sm font-bold">{appeal.classification_section}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-zinc-400">Продукт/Сотрудник:</span>
                                        <span className="text-sm font-bold">{appeal.product_employee || "—"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Ответственный</h4>
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                                        <User size={12} />
                                      </div>
                                      <span className="text-sm font-medium">{appeal.responsible_person || "Не назначен"}</span>
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
        <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-400 font-medium">Показано {filteredAppeals.length} из {appeals.length} обращений</p>
          <div className="flex gap-2">
            <button disabled className="p-2 text-zinc-300 cursor-not-allowed"><ChevronRight size={18} className="rotate-180" /></button>
            <button disabled className="p-2 text-zinc-300 cursor-not-allowed"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight">Удалить обращение?</h3>
              <p className="text-zinc-500 mb-8">Это действие необратимо. Все данные этого обращения будут удалены навсегда.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold border border-zinc-200 hover:bg-zinc-50 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
