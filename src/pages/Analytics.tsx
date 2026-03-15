import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { Download, Calendar, TrendingUp, Users, MessageSquare, AlertCircle, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, startOfMonth, startOfYear, isAfter, isBefore } from "date-fns";
import * as XLSX from "xlsx";
import { ru } from "date-fns/locale";

const COLORS = ['#000000', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];

export default function Analytics() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const q = query(collection(db, "appeals"), orderBy("created_at", "desc"));
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

  const getFilteredData = () => {
    if (period === "custom" && startDate && endDate) {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      return appeals.filter(a => {
        const date = new Date(a.created_at);
        return isWithinInterval(date, { start, end });
      });
    }

    const now = new Date();
    let start;
    if (period === "day") start = startOfDay(now);
    else if (period === "week") start = startOfWeek(now, { weekStartsOn: 1 });
    else if (period === "month") start = startOfMonth(now);
    else if (period === "year") start = startOfYear(now);
    else return appeals; // Default fallback

    return appeals.filter(a => new Date(a.created_at).getTime() >= start.getTime());
  };

  const exportSummaryToExcel = () => {
    const dataToExport = classificationData.map(item => ({
      "Категория": item.name,
      "Количество": item.value,
      "Процент": filteredAppeals.length > 0 ? `${Math.round(((item.value as number) / filteredAppeals.length) * 100)}%` : "0%"
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Сводная статистика");
    XLSX.writeFile(wb, `Сводная_статистика_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

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

  const exportToExcel = () => {
    const dataToExport = filteredAppeals.map(a => ({
      "ID": a.id,
      "Дата": safeFormatDate(a.created_at, "dd.MM.yyyy HH:mm"),
      "Клиент": a.client_name,
      "Телефон": a.client_phone,
      "Текст жалобы": a.complaint_text,
      "Статус": a.status,
      "Филиал": a.branch_name,
      "Классификация": a.complaint_classification,
      "Секция": a.classification_section,
      "Комментарий": a.adjective_comment,
      "Продукт/Сотрудник": a.product_employee,
      "Источник": a.source
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Жалобы");
    XLSX.writeFile(wb, `Жалобы_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  const filteredAppeals = getFilteredData();

  // Data for Branch Bar Chart
  const branchData = Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const branch = curr.branch_name || "Не указан";
      acc[branch] = (acc[branch] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 10);

  // Data for Classification Pie Chart
  const classificationData = Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const cat = curr.complaint_classification || "Другое";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  // Data for Dynamics Line Chart
  const dynamicsData = Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const date = format(new Date(curr.created_at), "dd.MM");
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {})
  ).map(([date, count]) => ({ date, count: count as number })).reverse();

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Аналитика</h1>
          <p className="text-zinc-500">Визуализация данных и анализ эффективности.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-zinc-200">
            {(["day", "week", "month", "year", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  period === p ? "bg-black text-white shadow-lg shadow-black/10" : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                {p === "day" ? "День" : p === "week" ? "Неделя" : p === "month" ? "Месяц" : p === "year" ? "Год" : "Свой период"}
              </button>
            ))}
          </div>
          
          {period === "custom" && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-zinc-200">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold outline-none bg-transparent"
              />
              <span className="text-zinc-300">—</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold outline-none bg-transparent"
              />
            </div>
          )}

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
          >
            <FileSpreadsheet size={16} />
            Скачать Excel
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Всего обращений" value={filteredAppeals.length} icon={MessageSquare} />
        <StatCard title="В работе" value={filteredAppeals.filter(a => a.status === "В работе").length} icon={TrendingUp} color="text-amber-500" />
        <StatCard title="Выполнено" value={filteredAppeals.filter(a => a.status === "Выполнен").length} icon={Users} color="text-emerald-500" />
        <StatCard title="Просрочено" value={filteredAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length} icon={AlertCircle} color="text-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dynamics Line Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Динамика обращений</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dynamicsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="count" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Bar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Топ-10 филиалов по жалобам</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#000" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classification Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Категории жалоб</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classificationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {classificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Сводная статистика</h3>
            <button 
              onClick={exportSummaryToExcel}
              className="text-xs font-bold text-zinc-400 hover:text-black flex items-center gap-1 transition-colors"
            >
              <Download size={14} /> Экспорт
            </button>
          </div>
          <div className="space-y-4">
            {classificationData.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-medium text-zinc-600">{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold">{item.value}</span>
                  <span className="text-xs text-zinc-400 w-10 text-right">
                    {filteredAppeals.length > 0 ? Math.round(((item.value as number) / filteredAppeals.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color = "text-black" }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-3xl font-bold tracking-tight">{value}</h4>
    </div>
  );
}
