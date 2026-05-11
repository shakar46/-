import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useFirebase } from "../components/FirebaseProvider";
import { 
  MessageSquare, 
  ChevronRight, 
  ArrowRight,
  Clock,
  Filter,
  Search,
  MessageCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { safeFormat } from "../utils/dateUtils";

export default function GiveFeedback() {
  const { user, userRole, userData } = useFirebase();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Fetch all requests in progress for this manager's branch
        let requestQuery = query(
          collection(db, "requests"),
          where("status", "==", "in_progress"),
          orderBy("createdAt", "desc")
        );

        const requestSnap = await getDocs(requestQuery);
        let allRequests = requestSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter by branch for manager
        if (userData?.branchId) {
          allRequests = allRequests.filter((r: any) => r.branchId === userData.branchId);
        }

        // 2. Fetch actions taken by this manager
        const actionsQuery = query(
          collection(db, "request_actions"),
          where("createdBy", "==", user.uid)
        );
        const actionsSnap = await getDocs(actionsQuery);
        const actedRequestIds = new Set(actionsSnap.docs.map(doc => doc.data().requestId));

        // 3. Filter out requests that this manager already commented on
        const filtered = allRequests.filter((r: any) => !actedRequestIds.has(r.id));
        
        setRequests(filtered);
      } catch (error) {
        console.error("Error fetching feedback list:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, userData]);

  const filteredItems = requests.filter(r => 
    r.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userRole !== 'manager' && userRole !== 'admin' && userRole !== 'owner' && userRole !== 'head') {
    return <div className="p-20 text-center font-bold text-zinc-400">У вас нет доступа к этой странице</div>;
  }

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 pt-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
             <div className="px-3 py-1 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">Feedback Queue</div>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-[#1F2937]">Дать ОС по отзыву</h1>
          <p className="text-zinc-400 font-medium">Список отзывов, требующих вашего внимания</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl shadow-sm border border-zinc-100 w-full md:w-96">
          <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Поиск по клиенту или тексту..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-zinc-800 placeholder:text-zinc-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
           <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Анализируем очередь...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((request, i) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-8 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all group flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                      <MessageCircle size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-zinc-900 leading-none">{request.clientName}</h3>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Филиал: {request.branchId}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-50 px-3 py-1.5 rounded-full text-[10px] font-black text-zinc-400">
                    {safeFormat(request.createdAt, "dd MMM")}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 italic text-zinc-600 text-sm leading-relaxed mb-6 line-clamp-4 min-h-[120px]">
                    "{request.message}"
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-zinc-50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-warning">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-warning/80">Ожидает ОС</span>
                  </div>
                  
                  <Link 
                    to={`/requests/${request.id}`}
                    className="flex items-center gap-2 pl-6 pr-4 py-3 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all group/btn shadow-xl shadow-zinc-200"
                  >
                    Дать ОС <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mb-8 shadow-inner">
                <CheckCircle2 size={48} className="text-success" />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Всё чисто!</h2>
              <p className="text-zinc-500 font-medium max-w-sm">Все отзывы в вашем филиале уже получили обратную связь. Отличная работа!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckCircle2({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
