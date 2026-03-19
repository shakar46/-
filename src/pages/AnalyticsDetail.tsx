import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { ChevronLeft, MessageSquare, Calendar, MapPin, Tag, Users, AlertCircle, X, Image as ImageIcon } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";

const COLORS = ['#000000', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];

export default function AnalyticsDetail() {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const value = searchParams.get("value");
  
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const q = query(collection(db, "appeals"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        // Filter based on type and value
        if (type === "branch") {
          data = data.filter(a => a.branch_name === value);
        } else if (type === "date") {
          const targetDate = value; // format "dd.MM.yyyy"
          data = data.filter(a => {
            const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
            return format(date, "dd.MM.yyyy") === targetDate;
          });
        } else if (type === "category") {
          data = data.filter(a => a.complaint_classification === value);
        } else if (type === "motivation") {
          data = data.filter(a => a.motivation_status === value);
        } else if (type === "justification") {
          data = data.filter(a => a.justification_status === value);
        }

        setAppeals(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "appeals");
      }
      setLoading(false);
    };
    fetchAppeals();
  }, [type, value]);

  const categoryData = useMemo(() => Object.entries(
    appeals.reduce((acc: any, curr) => {
      const cat = curr.complaint_classification || "Другое";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [appeals]);

  const motivationData = useMemo(() => Object.entries(
    appeals.reduce((acc: any, curr) => {
      const status = curr.motivation_status || "Не указан";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [appeals]);

  const branchData = useMemo(() => Object.entries(
    appeals.reduce((acc: any, curr) => {
      const branch = curr.branch_name || "Не указан";
      acc[branch] = (acc[branch] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }))
   .sort((a, b) => b.value - a.value), [appeals]);

  const getTitle = () => {
    switch(type) {
      case 'branch': return `Филиал: ${value}`;
      case 'date': return `Дата: ${value}`;
      case 'category': return `Категория: ${value}`;
      case 'motivation': return `Отдел: ${value}`;
      case 'justification': return `Обоснованность: ${value}`;
      default: return 'Детальная аналитика';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/analytics")}
          className="flex items-center gap-2 text-zinc-500 hover:text-black font-bold transition-colors"
        >
          <ChevronLeft size={20} /> Назад к аналитике
        </button>
      </header>

      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{getTitle()}</h1>
        <p className="text-zinc-500">Детальный обзор жалоб и статистические показатели.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Всего жалоб" value={appeals.length} icon={MessageSquare} />
        <StatCard title="В работе" value={appeals.filter(a => a.status === "В работе").length} icon={AlertCircle} color="text-amber-500" />
        <StatCard title="Выполнено" value={appeals.filter(a => a.status === "Выполнен").length} icon={Users} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branch breakdown for non-branch types */}
        {type !== 'branch' && (
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Распределение по филиалам</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} width={100} />
                  <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#000" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {(type === 'branch' || type === 'date' || type === 'motivation' || type === 'justification') && (
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Распределение по категориям</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Motivation breakdown */}
        {(type === 'branch' || type === 'date' || type === 'category') && (
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Распределение по отделам мотивации</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={motivationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                  <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#000" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <h3 className="font-bold">Список жалоб</h3>
        </div>
        <div className="overflow-x-auto">
          <ComplaintsTable data={appeals} setSelectedPhoto={setSelectedPhoto} />
        </div>
      </div>

      {/* Photo Enlargement Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedPhoto} 
                alt="Enlarged" 
                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComplaintsTable({ data, setSelectedPhoto }: { data: any[], setSelectedPhoto: (p: string) => void }) {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-zinc-50/50">
          <th onClick={() => requestSort('created_at')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Дата</th>
          <th onClick={() => requestSort('client_name')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Клиент</th>
          <th onClick={() => requestSort('branch_name')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Филиал</th>
          <th onClick={() => requestSort('complaint_classification')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Категория</th>
          <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Текст</th>
          <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Фото</th>
          <th onClick={() => requestSort('status')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Статус</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {sortedData.map((a) => (
          <tr 
            key={a.id} 
            className="hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <td 
              className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap"
              onClick={() => navigate(`/appeals/${a.id}`)}
            >
              {a.created_at?.toDate ? format(a.created_at.toDate(), "dd.MM.yyyy HH:mm") : format(new Date(a.created_at), "dd.MM.yyyy HH:mm")}
            </td>
            <td 
              className="px-6 py-4"
              onClick={() => navigate(`/appeals/${a.id}`)}
            >
              <div className="text-sm font-bold">{a.client_name}</div>
              <div className="text-[10px] text-zinc-400">{a.client_phone}</div>
            </td>
            <td 
              className="px-6 py-4 text-sm font-medium"
              onClick={() => navigate(`/appeals/${a.id}`)}
            >
              {a.branch_name}
            </td>
            <td 
              className="px-6 py-4"
              onClick={() => navigate(`/appeals/${a.id}`)}
            >
              <span className="px-2 py-1 rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500 uppercase">
                {a.complaint_classification}
              </span>
            </td>
            <td 
              className="px-6 py-4 text-sm text-zinc-500 min-w-[200px] whitespace-normal"
              onClick={() => navigate(`/appeals/${a.id}`)}
            >
              {a.complaint_text}
            </td>
            <td className="px-6 py-4">
              <div className="flex -space-x-2">
                {(a.complaint_photos || []).slice(0, 3).map((photo: string, i: number) => (
                  <div 
                    key={i} 
                    className="relative group/photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                  >
                    <img src={photo} className="w-8 h-8 rounded-full border-2 border-white object-cover hover:scale-110 transition-transform cursor-zoom-in" referrerPolicy="no-referrer" />
                  </div>
                ))}
                {(a.complaint_photos || []).length > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                    +{(a.complaint_photos || []).length - 3}
                  </div>
                )}
                {(a.complaint_photos || []).length === 0 && (
                  <span className="text-zinc-300"><ImageIcon size={16} /></span>
                )}
              </div>
            </td>
            <td 
              className="px-6 py-4"
              onClick={() => navigate(`/appeals/${a.id}`)}
            >
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                a.status === "Выполнен" ? "bg-emerald-50 text-emerald-600" :
                a.status === "В работе" ? "bg-amber-50 text-amber-600" :
                "bg-zinc-100 text-zinc-500"
              }`}>
                {a.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-black" }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-3xl font-bold tracking-tight">{value}</h4>
    </div>
  );
}
