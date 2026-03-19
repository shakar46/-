import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { CheckCircle2, Search, Calendar, User, MessageSquare, ChevronRight, Filter, MapPin, Tag, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";

export default function ComplaintResolutions() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const q = query(
          collection(db, "appeals"), 
          where("status", "==", "Выполнен"),
          orderBy("created_at", "desc")
        );
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

  const filteredAppeals = appeals.filter(a => {
    const matchesSearch = 
      a.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.client_phone?.includes(searchQuery) ||
      a.branch_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.solution?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Принятые решения</h1>
        <p className="text-zinc-500 text-lg">Архив успешно решенных жалоб и принятых по ним мер.</p>
      </header>

      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Search size={12} /> Поиск по решениям
        </label>
        <input
          type="text"
          placeholder="Клиент, филиал или текст решения..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAppeals.map((appeal) => (
          <motion.div 
            key={appeal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">{appeal.client_name}</div>
                  <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                    {appeal.created_at?.toDate ? format(appeal.created_at.toDate(), "dd MMMM yyyy", { locale: ru }) : "—"}
                  </div>
                </div>
              </div>
              <Link to={`/appeals/${appeal.id}`} className="p-2 text-zinc-300 hover:text-black transition-colors">
                <ChevronRight size={20} />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} /> {appeal.branch_name}
                </div>
                <div className="flex items-center gap-1.5">
                  <Tag size={12} /> {appeal.complaint_classification}
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Принятое решение:</div>
                <p className="text-sm text-zinc-600 leading-relaxed italic mb-4">
                  {appeal.solution || "Решение не указано"}
                </p>

                {appeal.instant_correction && (
                  <div className="mb-4">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Мгновенное исправление:</div>
                    <p className="text-xs text-zinc-500">{appeal.instant_correction}</p>
                  </div>
                )}

                {appeal.justification_status && (
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest inline-block ${
                    appeal.justification_status === "Обосновано" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  }`}>
                    {appeal.justification_status}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {filteredAppeals.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-400 font-medium">
            Решенных жалоб не найдено
          </div>
        )}
      </div>
    </div>
  );
}
