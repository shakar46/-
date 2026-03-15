import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Users, Search, ChevronRight, Phone, MessageSquare, AlertTriangle, Filter, MapPin, Tag, Package, AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES, COMPLAINT_CLASSIFICATIONS } from "../constants";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function RepeatingAppeals() {
  const [repeatingClients, setRepeatingClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [classificationFilter, setClassificationFilter] = useState("Все");
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const q = query(collection(db, "appeals"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        const allAppeals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Group by phone
        const groups = allAppeals.reduce((acc: any, curr: any) => {
          const phone = curr.client_phone;
          if (!acc[phone]) {
            acc[phone] = {
              phone,
              name: curr.client_name,
              count: 0,
              appeals: []
            };
          }
          acc[phone].count += 1;
          acc[phone].appeals.push(curr);
          return acc;
        }, {});

        // Filter only repeating (count > 1)
        const repeating = Object.values(groups)
          .filter((g: any) => g.count > 1)
          .sort((a: any, b: any) => b.count - a.count);

        setRepeatingClients(repeating);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "appeals");
      }
      setLoading(false);
    };
    fetchAppeals();
  }, []);

  const filteredClients = repeatingClients.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery);
    
    // Check if any of the client's appeals match the filters
    const matchesFilters = c.appeals.some((appeal: any) => {
      const matchesBranch = branchFilter === "Все" || appeal.branch_name === branchFilter;
      const matchesClassification = classificationFilter === "Все" || appeal.complaint_classification === classificationFilter;
      return matchesBranch && matchesClassification;
    });

    return matchesSearch && matchesFilters;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Повторные жалобы</h1>
        <p className="text-zinc-500">Анализ клиентов, которые обращались более одного раза.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Search size={12} /> Поиск клиента
          </label>
          <input
            type="text"
            placeholder="Имя или телефон..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin size={12} /> Филиал
          </label>
          <select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
          >
            <option>Все</option>
            {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Tag size={12} /> Классификация
          </label>
          <select 
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
          >
            <option>Все</option>
            {COMPLAINT_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClients.map((client) => (
          <motion.div
            key={client.phone}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-lg shadow-black/10">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{client.name}</h3>
                  <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                    <Phone size={14} />
                    {client.phone}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-black">{client.count}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Обращений</span>
              </div>
            </div>

            <div className="p-6 flex-1 space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight w-fit border border-rose-100">
                  <AlertTriangle size={14} />
                  Требует проверка СПЕЦИАЛИСТА
                </div>
                <div className="flex gap-2">
                  {client.appeals.some((a: any) => a.status === "Выполнен") && (
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-emerald-100">
                      РЕШЕНО В ДЕЛЕ
                    </span>
                  )}
                  {client.appeals.some((a: any) => a.status === "Новый") && (
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-blue-100">
                      НОВЫЙ
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Последние обращения</p>
                {client.appeals.slice(0, 3).map((appeal: any) => (
                  <Link
                    key={appeal.id}
                    to={`/appeals/${appeal.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-black hover:bg-zinc-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-all">
                        <MessageSquare size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold truncate max-w-[200px]">{appeal.complaint_classification}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(appeal.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-black transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-6 bg-zinc-50/50 border-t border-zinc-100">
              <button
                onClick={() => setSelectedClient(client)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-zinc-200 py-3 rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all"
              >
                Посмотреть всю историю
              </button>
            </div>
          </motion.div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-zinc-200 border-dashed">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Повторных жалоб не найдено</h3>
            <p className="text-zinc-500">Все клиенты обращались только один раз или поиск не дал результатов.</p>
          </div>
        )}
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedClient(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h3 className="text-2xl font-bold">{selectedClient.name || "Без имени"}</h3>
                  <p className="text-zinc-500 font-medium">{selectedClient.phone}</p>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {selectedClient.appeals.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((appeal: any) => (
                  <div key={appeal.id} className="p-6 rounded-2xl border border-zinc-100 bg-white space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {format(new Date(appeal.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${
                        appeal.status === "Выполнен" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        appeal.status === "В работе" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        appeal.status === "Новый" ? "bg-blue-50 text-blue-600 border-blue-100" :
                        "bg-zinc-50 text-zinc-400 border-zinc-100"
                      }`}>
                        {appeal.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Филиал</p>
                        <p className="text-sm font-bold">{appeal.branch_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Классификация</p>
                        <p className="text-sm font-bold">{appeal.complaint_classification}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Текст обращения</p>
                      <p className="text-sm text-zinc-600 leading-relaxed">{appeal.complaint_text}</p>
                    </div>

                    <Link 
                      to={`/appeals/${appeal.id}`}
                      className="inline-flex items-center gap-2 text-xs font-bold text-black hover:underline"
                    >
                      Подробнее <ChevronRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
