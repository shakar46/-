import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { CheckCircle2, Search, Calendar, User, MessageSquare, ChevronRight, Filter, MapPin, Tag, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";

export default function AcceptedResolutions() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, "requests"), 
          where("status", "==", "done"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRequests(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "requests");
      }
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.clientPhone?.includes(searchQuery) ||
      r.branchId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.message?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Принятые решения</h1>
        <p className="text-zinc-500 text-lg">Архив успешно решенных запросов и принятых по ним мер.</p>
      </header>

      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <Search size={12} /> Поиск по решениям
        </label>
        <input
          type="text"
          placeholder="Клиент, филиал или текст..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRequests.map((request) => (
          <motion.div 
            key={request.id}
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
                  <div className="text-sm font-bold">{request.clientName}</div>
                  <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                    {request.createdAt?.toDate ? format(request.createdAt.toDate(), "dd MMMM yyyy", { locale: ru }) : 
                     request.createdAt ? format(new Date(request.createdAt), "dd MMMM yyyy", { locale: ru }) : "—"}
                  </div>
                </div>
              </div>
              <Link to={`/requests/${request.id}`} className="p-2 text-zinc-300 hover:text-black transition-colors">
                <ChevronRight size={20} />
              </Link>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} /> {request.branchId}
                </div>
                <div className="flex items-center gap-1.5">
                  <Tag size={12} /> {request.classification}
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Суть запроса:</div>
                <p className="text-sm text-zinc-600 leading-relaxed italic mb-4">
                  {request.message}
                </p>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Статус: Выполнено</div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredRequests.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-400 font-medium">
            Решенных запросов не найдено
          </div>
        )}
      </div>
    </div>
  );
}
