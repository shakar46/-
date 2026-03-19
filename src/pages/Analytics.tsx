import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { Download, Calendar, TrendingUp, Users, MessageSquare, AlertCircle, FileSpreadsheet, Send, ChevronRight } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, startOfMonth, startOfYear, isAfter, isBefore, subWeeks, subMonths, subYears } from "date-fns";
import * as XLSX from "xlsx";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { sendTelegramFile } from "../utils/telegram";

const COLORS = ['#000000', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];

export default function Analytics() {
  const navigate = useNavigate();
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSendingToTelegram, setIsSendingToTelegram] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [branchSortOrder, setBranchSortOrder] = useState<"desc" | "asc">("desc");
  const [tableSortConfig, setTableSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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

  const getFilteredData = (targetAppeals = appeals, targetPeriod = period, targetStart = startDate, targetEnd = endDate) => {
    if (targetPeriod === "custom" && targetStart && targetEnd) {
      const start = startOfDay(new Date(targetStart));
      const end = endOfDay(new Date(targetEnd));
      return targetAppeals.filter(a => {
        const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        return isWithinInterval(date, { start, end });
      });
    }

    const now = new Date();
    let start;
    if (targetPeriod === "day") start = startOfDay(now);
    else if (targetPeriod === "week") start = startOfWeek(now, { weekStartsOn: 1 });
    else if (targetPeriod === "month") start = startOfMonth(now);
    else if (targetPeriod === "year") start = startOfYear(now);
    else return targetAppeals;

    return targetAppeals.filter(a => {
      const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
      return date.getTime() >= start.getTime();
    });
  };

  const getPreviousPeriodData = () => {
    const now = new Date();
    let start, end;
    
    if (period === "day") {
      start = startOfDay(subDays(now, 1));
      end = endOfDay(subDays(now, 1));
    } else if (period === "week") {
      start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      end = endOfDay(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1));
    } else if (period === "month") {
      start = startOfMonth(subMonths(now, 1));
      end = endOfDay(subDays(startOfMonth(now), 1));
    } else if (period === "year") {
      start = startOfYear(subYears(now, 1));
      end = endOfDay(subDays(startOfYear(now), 1));
    } else if (period === "custom" && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diff = e.getTime() - s.getTime();
      start = new Date(s.getTime() - diff - 86400000);
      end = new Date(s.getTime() - 86400000);
    } else {
      return [];
    }

    return appeals.filter(a => {
      const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
      return isWithinInterval(date, { start, end });
    });
  };

  const filteredAppeals = React.useMemo(() => getFilteredData(), [appeals, period, startDate, endDate]);
  const previousAppeals = React.useMemo(() => getPreviousPeriodData(), [appeals, period, startDate, endDate]);

  const sortedAppeals = React.useMemo(() => {
    let sortableItems = [...filteredAppeals];
    if (tableSortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[tableSortConfig.key];
        const bValue = b[tableSortConfig.key];
        if (aValue < bValue) return tableSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return tableSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredAppeals, tableSortConfig]);

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

  const WEEKLY_BRANCHES = [
    "Абай", "Бадамзар", "Боткина", "Бухара", "Шота Руставелли", "Мегаполис", "Новза", 
    "Самарканд Рудаки", "Самарканд Фэмили", "Сергели", "Сеул", "Учтепа", "ЦУМ", 
    "Заводская", "Ривьера", "Сайрам", "Фергана", "Тарас Шевченко", "Куйлюк", 
    "Депо Молл", "ТТЗ", "Сагбан", "Дарк китчен", "Хай Таун", "Ибн Сино", 
    "Мирабад", "Андижан", "Джиззах", "Колл Центр", "Янгиюль", "Чирчик"
  ];

  const truncate = (str: string, max: number = 32700) => {
    if (!str) return "";
    return str.length > max ? str.substring(0, max) + "..." : str;
  };

  const getExcelData = (data: any[], type: 'daily' | 'weekly' = 'daily') => {
    if (type === 'daily') {
      return data.map(a => ({
        "Дата отзыва": safeFormatDate(a.created_at, "dd.MM.yyyy HH:mm"),
        "Дата заказа": truncate(a.order_date || "—"),
        "Классификация жалобы": truncate(a.complaint_classification || "—"),
        "Раздел классификации": truncate(a.classification_section || "—"),
        "Дополнительный комментарий": truncate(a.adjective_comment || "—"),
        "Продукт / Сотрудник": truncate(a.product_employee || "—"),
        "Название филиала": truncate(a.branch_name || "—"),
        "Чек заказа": truncate(a.order_receipt || "—"),
        "Текст обращения": truncate(a.complaint_text || "—"),
        "Имя клиента": truncate(a.client_name || "—"),
        "Телефон": truncate(a.client_phone || "—"),
        "Источник": truncate(a.source || "—"),
        "Фотографии жалобы": truncate((a.complaint_photos || []).join(", ")),
        "Кто принял жалобу": truncate(a.accepted_by || "—"),
        "SIP аудиозапись (ссылка)": truncate(a.sip_link || "—"),
        "Ответственный за коррекцию": truncate(a.responsible_person || "—"),
        "Статус дедлайна": truncate(a.deadline || "—"),
        "Моментальная коррекция": truncate(a.instant_correction || "—"),
        "Анализ корневых причин": truncate(a.root_cause_analysis || "—"),
        "Статус для отдела мотивации": truncate(a.motivation_status || "—"),
        "Корректирующие действия": truncate(a.corrective_actions || "—"),
        "Решение": truncate(a.solution || "—")
      }));
    } else {
      // Weekly report format
      // Filter data for "Кухня" (Kitchen)
      const kitchenData = data.filter(a => 
        a.motivation_status === "КУХНЯ" || 
        a.complaint_classification === "Кухня"
      );

      return WEEKLY_BRANCHES.map(branch => {
        const branchAppeals = kitchenData.filter(a => a.branch_name === branch);
        const justifiedCount = branchAppeals.filter(a => a.justification_status === "Обосновано").length;
        const texts = branchAppeals.map(a => a.complaint_text).filter(Boolean).join(" -- ");
        const corrections = branchAppeals.map(a => a.instant_correction).filter(Boolean).join(" -- ");

        return {
          "Кухня": branch,
          "вкус": justifiedCount > 0 ? justifiedCount : "",
          "Текст обращения": truncate(texts || ""),
          "Моментальная коррекция": truncate(corrections || "")
        };
      });
    }
  };

  const sendExcelToTelegram = async (type: 'daily' | 'weekly' = 'daily') => {
    setIsSendingToTelegram(true);
    try {
      const dataToExport = getExcelData(sortedAppeals, type);
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      const sheetName = type === 'daily' ? "Стандартный отчёт" : "Отчёт свод";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `${type === 'daily' ? 'Стандартный' : 'Свод'}_отчет_${format(new Date(), "dd_MM_yyyy")}.xlsx`;
      const periodText = period === 'custom' ? `${startDate} - ${endDate}` : 
                        period === 'day' ? 'Сегодня' :
                        period === 'week' ? 'Эта неделя' :
                        period === 'month' ? 'Этот месяц' : 'Этот год';
      const caption = `📊 <b>${sheetName}</b>\n📅 Период: ${periodText}\n📈 Всего записей: ${dataToExport.length}`;
      
      const success = await sendTelegramFile(blob, fileName, caption);
      if (success) alert("Файл успешно отправлен в Telegram");
      else alert("Не удалось отправить файл");
    } catch (error) {
      console.error("Error sending to telegram:", error);
      alert("Произошла ошибка при отправке");
    }
    setIsSendingToTelegram(false);
  };

  const exportToExcel = (type: 'daily' | 'weekly' = 'daily') => {
    const dataToExport = getExcelData(sortedAppeals, type);
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    const sheetName = type === 'daily' ? "Стандартный отчёт" : "Отчёт свод";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    if (type === 'daily') {
      const wscols = [
        {wch: 20}, {wch: 15}, {wch: 25}, {wch: 25}, {wch: 30}, 
        {wch: 25}, {wch: 20}, {wch: 15}, {wch: 50}, {wch: 20},
        {wch: 15}, {wch: 15}, {wch: 50}, {wch: 20}, {wch: 30}, 
        {wch: 25}, {wch: 20}, {wch: 40}, {wch: 40}, {wch: 25}, {wch: 40}, {wch: 40}
      ];
      ws['!cols'] = wscols;
    } else {
      const wscols = [
        {wch: 30}, {wch: 10}, {wch: 60}, {wch: 60}
      ];
      ws['!cols'] = wscols;
    }

    XLSX.writeFile(wb, `${type === 'daily' ? 'Стандартный' : 'Свод'}_отчет_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    const diff = ((current - previous) / previous) * 100;
    const isPositive = diff > 0;
    return {
      label: `${isPositive ? "+" : ""}${Math.round(diff)}%`,
      isPositive: !isPositive // For complaints, more is usually bad
    };
  };

  // Data for Justification Status Chart
  const justificationData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const status = curr.justification_status || "Не указано";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [filteredAppeals]);

  // Data for Motivation Status Chart
  const motivationData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const status = curr.motivation_status || "Не указан";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }))
   .sort((a, b) => b.value - a.value), [filteredAppeals]);

  // Data for Branch Bar Chart
  const branchData = React.useMemo(() => {
    const data = Object.entries(
      filteredAppeals.reduce((acc: any, curr) => {
        const branch = curr.branch_name || "Не указан";
        acc[branch] = (acc[branch] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number }));

    return data
      .sort((a, b) => branchSortOrder === "desc" ? b.value - a.value : a.value - b.value)
      .slice(0, 10);
  }, [filteredAppeals, branchSortOrder]);

  // Data for Classification Pie Chart
  const classificationData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const cat = curr.complaint_classification || "Другое";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [filteredAppeals]);

  // Data for Dynamics Line Chart
  const dynamicsData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const date = curr.created_at?.toDate ? curr.created_at.toDate() : new Date(curr.created_at);
      const dateStr = format(date, "dd.MM.yyyy");
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {})
  ).map(([date, count]) => ({ date, count: count as number }))
   .sort((a, b) => {
     const [d1, m1, y1] = a.date.split('.').map(Number);
     const [d2, m2, y2] = b.date.split('.').map(Number);
     return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
   }), [filteredAppeals]);

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
          <div className="flex bg-white border border-zinc-200 rounded-2xl p-1 shadow-sm">
            {(["day", "week", "month", "year", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  period === p ? "bg-black text-white shadow-lg shadow-black/10" : "text-zinc-500 hover:text-black"
                }`}
              >
                {p === "day" ? "День" : p === "week" ? "Неделя" : p === "month" ? "Месяц" : p === "year" ? "Год" : "Свой"}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-2xl p-1 shadow-sm">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold px-2 focus:ring-0"
              />
              <span className="text-zinc-300">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold px-2 focus:ring-0"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button 
                className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-2xl font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
              >
                <Send size={16} />
                В Telegram
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <button 
                  onClick={() => sendExcelToTelegram('daily')}
                  disabled={isSendingToTelegram}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 transition-colors border-b border-zinc-100"
                >
                  Стандартный отчёт
                </button>
                <button 
                  onClick={() => sendExcelToTelegram('weekly')}
                  disabled={isSendingToTelegram}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  Отчёт свод
                </button>
              </div>
            </div>

            <div className="relative group">
              <button 
                className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
              >
                <FileSpreadsheet size={16} />
                Экспорт в Excel
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <button 
                  onClick={() => exportToExcel('daily')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 transition-colors border-b border-zinc-100"
                >
                  Стандартный отчёт
                </button>
                <button 
                  onClick={() => exportToExcel('weekly')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  Отчёт свод
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Всего обращений" 
          value={filteredAppeals.length} 
          icon={MessageSquare} 
          trend={showComparison ? getTrend(filteredAppeals.length, previousAppeals.length) : null}
        />
        <StatCard 
          title="В работе" 
          value={filteredAppeals.filter(a => a.status === "В работе").length} 
          icon={TrendingUp} 
          color="text-amber-500" 
          trend={showComparison ? getTrend(filteredAppeals.filter(a => a.status === "В работе").length, previousAppeals.filter(a => a.status === "В работе").length) : null}
        />
        <StatCard 
          title="Выполнено" 
          value={filteredAppeals.filter(a => a.status === "Выполнен").length} 
          icon={Users} 
          color="text-emerald-500" 
          trend={showComparison ? getTrend(filteredAppeals.filter(a => a.status === "Выполнен").length, previousAppeals.filter(a => a.status === "Выполнен").length) : null}
        />
        <StatCard 
          title="Просрочено" 
          value={filteredAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length} 
          icon={AlertCircle} 
          color="text-rose-500" 
          trend={showComparison ? getTrend(filteredAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length, previousAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length) : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dynamics Line Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Динамика обращений</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={dynamicsData}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    navigate(`/analytics/date?value=${data.activeLabel}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#000" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#000' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Bar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Топ-10 филиалов по жалобам</h3>
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button 
                onClick={() => setBranchSortOrder("desc")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${branchSortOrder === "desc" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
              >
                Убывание
              </button>
              <button 
                onClick={() => setBranchSortOrder("asc")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${branchSortOrder === "asc" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
              >
                Возрастание
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={branchData} 
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    navigate(`/analytics/branch?value=${data.activeLabel}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#000" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classification Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Категории жалоб (статистика)</h3>
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
                  onClick={(data) => navigate(`/analytics/category?value=${data.name}`)}
                  style={{ cursor: 'pointer' }}
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

        {/* Motivation Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Отдел мотивации</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={motivationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => navigate(`/analytics/motivation?value=${data.name}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {motivationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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

        {/* Justification Status Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Обоснованность жалоб (статистика)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={justificationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => navigate(`/analytics/justification?value=${data.name}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {justificationData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === "Обосновано" ? "#10b981" : entry.name === "Необосновано" ? "#f43f5e" : "#94a3b8"} 
                    />
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

        {/* Summary Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 col-span-full">
          {/* Classification Summary Table */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Категории жалоб (статистика)</h3>
            </div>
            <div className="space-y-4">
              {classificationData.slice(0, 10).map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => navigate(`/analytics/category?value=${item.name}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition-colors">{item.name}</span>
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
            
            <div className="mt-8 pt-8 border-t border-zinc-100">
              <h4 className="text-sm font-bold mb-4">Топ-10 филиалов по жалобам (статистика)</h4>
              <div className="space-y-2">
                {branchData.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.name}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Justification Summary Table */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Обоснованность жалоб (статистика)</h3>
            </div>
            <div className="space-y-4">
              {justificationData.map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => navigate(`/analytics/justification?value=${item.name}`)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: item.name === "Обосновано" ? "#10b981" : item.name === "Необосновано" ? "#f43f5e" : "#94a3b8" }} 
                    />
                    <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition-colors">{item.name}</span>
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

            <div className="mt-8 pt-8 border-t border-zinc-100">
              <h4 className="text-sm font-bold mb-4">Динамика обращений (статистика)</h4>
              <div className="space-y-2">
                {dynamicsData.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{item.date}</span>
                    <span className="font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Motivation Summary Table */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Отдел мотивации (статистика)</h3>
            </div>
            <div className="space-y-4">
              {motivationData.map((item, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between group cursor-pointer"
                  onClick={() => navigate(`/analytics/motivation?value=${item.name}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                    <span className="text-sm font-medium text-zinc-600 group-hover:text-black transition-colors">{item.name}</span>
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

        {/* Complaints Table */}
        <div className="col-span-full bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <h3 className="font-bold">Список обращений</h3>
            <span className="text-xs text-zinc-400 font-medium">{filteredAppeals.length} записей</span>
          </div>
          <div className="overflow-x-auto">
            <ComplaintsTable 
              data={sortedAppeals} 
              sortConfig={tableSortConfig}
              onSort={(key) => {
                let direction: 'asc' | 'desc' = 'asc';
                if (tableSortConfig && tableSortConfig.key === key && tableSortConfig.direction === 'asc') {
                  direction = 'desc';
                }
                setTableSortConfig({ key, direction });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplaintsTable({ data, sortConfig, onSort }: { 
  data: any[]; 
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-zinc-50/50">
          <th onClick={() => onSort('created_at')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Дата</th>
          <th onClick={() => onSort('client_name')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Клиент</th>
          <th onClick={() => onSort('branch_name')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Филиал</th>
          <th onClick={() => onSort('complaint_classification')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Категория</th>
          <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Текст</th>
          <th onClick={() => onSort('status')} className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors">Статус</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {data.map((a) => (
          <tr key={a.id} className="hover:bg-zinc-50 transition-colors cursor-pointer" onClick={() => navigate(`/appeals/${a.id}`)}>
            <td className="px-6 py-4 text-sm text-zinc-500 whitespace-nowrap">
              {a.created_at?.toDate ? format(a.created_at.toDate(), "dd.MM.yyyy HH:mm") : format(new Date(a.created_at), "dd.MM.yyyy HH:mm")}
            </td>
            <td className="px-6 py-4">
              <div className="text-sm font-bold">{a.client_name}</div>
              <div className="text-[10px] text-zinc-400">{a.client_phone}</div>
            </td>
            <td className="px-6 py-4 text-sm font-medium">{a.branch_name}</td>
            <td className="px-6 py-4">
              <span className="px-2 py-1 rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500 uppercase">
                {a.complaint_classification}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-zinc-500 min-w-[200px] whitespace-normal">
              {a.complaint_text}
            </td>
            <td className="px-6 py-4">
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

function StatCard({ title, value, icon: Icon, trend, color = "text-black" }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            trend.isPositive ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50"
          }`}>
            {trend.label}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-3xl font-bold tracking-tight">{value}</h4>
    </div>
  );
}
