import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Check, 
  User, 
  Zap,
  Phone,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  FileText,
  Trash2,
  Save,
  AlertCircle
} from "lucide-react";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useFirebase } from "../components/FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "../lib/utils";
import { CRMRequest, RequestAction } from "../types";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";

export default function AppealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole, token } = useFirebase();
  const [request, setRequest] = useState<CRMRequest | null>(null);
  const [actions, setActions] = useState<RequestAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resolution, setResolution] = useState("");
  const [instantFix, setInstantFix] = useState("");

  const fetchRequestData = async () => {
    if (!id || id === 'new') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "requests", id));
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() } as CRMRequest);
        
        // Fetch actions
        const actionsQuery = query(
          collection(db, "request_actions"),
          where("requestId", "==", id),
          orderBy("createdAt", "desc")
        );
        const actionsSnap = await getDocs(actionsQuery);
        setActions(actionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RequestAction)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `requests/${id}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequestData();
  }, [id]);

  const handleProcess = async () => {
    if (!resolution) return alert("Введите решение");
    setProcessing(true);
    try {
      const response = await fetch("/api/requests/process", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: id,
          instantFix,
          resolution
        })
      });
      const result = await response.json();
      if (result.success) {
        setResolution("");
        setInstantFix("");
        fetchRequestData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Process error:", error);
    }
    setProcessing(false);
  };

  const handleComplete = async () => {
    if (!window.confirm("Завершить обращение?")) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/requests/complete", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: id })
      });
      const result = await response.json();
      if (result.success) {
        fetchRequestData();
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Complete error:", error);
    }
    setProcessing(false);
  };

  if (loading) return <div className="p-20 text-center font-bold text-zinc-400">Загрузка...</div>;
  if (!request && id !== 'new') return <div className="p-20 text-center font-bold text-zinc-400">Обращение не найдено</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 pt-10">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/requests")}
          className="flex items-center gap-2 text-zinc-500 hover:text-black font-bold transition-colors"
        >
          <ChevronLeft size={20} /> Назад
        </button>
        <div className="flex items-center gap-3">
          {request?.status === 'in_progress' && (userRole === 'manager' || userRole === 'admin' || userRole === 'owner') && (
            <button 
              onClick={handleComplete}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Check size={20} /> Завершить обращение
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Request Header Info */}
          <section className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center p-1 border border-zinc-100">
                  {request?.clientPhoto ? (
                    <img src={request.clientPhoto} className="w-full h-full object-cover rounded-[1.25rem]" />
                  ) : (
                    <User size={32} className="text-zinc-200" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-zinc-900 leading-tight mb-1">{request?.clientName}</h1>
                  <p className="text-zinc-400 font-bold text-sm tracking-wide">{request?.clientPhone}</p>
                </div>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                request?.status === 'in_progress' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                {request?.status === 'in_progress' ? "В работе" : "Выполнено"}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-zinc-50">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Филиал</p>
                <p className="text-sm font-bold text-zinc-900">{request?.branchId}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Классификация</p>
                <p className="text-sm font-bold text-zinc-900">{request?.classification}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Дедлайн</p>
                <p className="text-sm font-bold text-zinc-900">
                  {request?.deadlineAt ? format(request.deadlineAt.toDate(), "dd MMM, HH:mm", { locale: ru }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Создано</p>
                <p className="text-sm font-bold text-zinc-900">
                  {request?.createdAt ? format(request.createdAt.toDate(), "dd.MM.yyyy HH:mm", { locale: ru }) : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Message Section */}
          <section className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 px-1">Суть обращения</h2>
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 italic text-zinc-700 leading-relaxed">
              "{request?.message}"
            </div>
          </section>

          {/* Actions Timeline */}
          <section className="space-y-6 px-1">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">История действий</h2>
            <div className="space-y-4">
              {actions.map(action => (
                <motion.div 
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                         <Zap size={14} fill="currentColor" />
                       </div>
                       <span className="text-xs font-black text-zinc-900 uppercase">Менеджер #{action.createdBy ? action.createdBy.slice(0, 4) : "????"}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">{action.createdAt ? format(action.createdAt.toDate(), "dd.MM.yyyy HH:mm") : "—"}</span>
                  </div>
                  
                  {action.instantFix && (
                    <div className="mb-4">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Мгновенное исправление</p>
                      <p className="text-sm font-medium text-zinc-600">{action.instantFix}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Решение</p>
                    <p className="text-sm font-bold text-zinc-800 leading-relaxed">{action.resolution}</p>
                  </div>
                </motion.div>
              ))}
              {actions.length === 0 && (
                <div className="py-12 bg-white/50 border-2 border-dashed border-zinc-100 rounded-3xl text-center text-zinc-400 text-sm font-medium italic">
                  Действий пока не зафиксировано
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Processing Form */}
        <aside className="space-y-8">
          {request?.status === 'in_progress' && (userRole === 'manager' || userRole === 'admin' || userRole === 'owner') ? (
            <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-xl sticky top-24">
              <div className="mb-6">
                 <h2 className="text-xl font-black text-zinc-900 mb-1">Действие</h2>
                 <p className="text-zinc-500 text-xs font-medium">Зафиксируйте решение или коррекцию</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">Мгновенное исправление</label>
                  <textarea 
                    rows={2}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                    value={instantFix}
                    onChange={(e) => setInstantFix(e.target.value)}
                    placeholder="Что было сделано сразу?"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-1">Финальное решение *</label>
                  <textarea 
                    rows={4}
                    required
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Опишите результат..."
                  />
                </div>

                <button 
                  onClick={handleProcess}
                  disabled={processing || !resolution}
                  className="w-full py-4 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {processing ? "Обработка..." : "Записать действие"}
                </button>
              </div>
            </section>
          ) : (
            <section className="bg-emerald-600 p-8 rounded-3xl text-white shadow-xl shadow-emerald-200">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                   <Check size={24} />
                 </div>
                 <h3 className="text-xl font-black">Завершено</h3>
               </div>
               <p className="text-emerald-50 text-sm font-medium leading-relaxed mb-6">
                 Данное обращение успешно обработано и закрыто в системе.
               </p>
               <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Менеджер</p>
                 <p className="text-sm font-bold">#{request?.managerId ? request.managerId.slice(0, 8) : "—"}</p>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-4 mb-1">Дата закрытия</p>
                 <p className="text-sm font-bold">
                   {request?.completedAt ? format(request.completedAt.toDate(), "dd.MM.yyyy", { locale: ru }) : "—"}
                 </p>
               </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
