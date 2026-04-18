import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  AlertCircle, 
  FileSpreadsheet, 
  Send,
  X,
  Check,
  Download,
  ChevronRight,
  Plus
} from "lucide-react";
import { format, subDays, addDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears, eachDayOfInterval } from "date-fns";
import * as XLSX from "xlsx";
import { ru } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { sendTelegramFile } from "../utils/telegram";
import { motion, AnimatePresence } from "motion/react";

import { 
  BRANCH_NAMES, 
  COMPLAINT_CLASSIFICATIONS, 
  COMPLAINT_STATUSES,
  CLASSIFICATION_SECTIONS,
  MOTIVATION_STATUSES
} from "../constants";

import { cn } from "../lib/utils";
import { Appeal } from "../types";

const MultiSelectFilter = ({ label, values = [], options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((o: string) => {
    const option = o || "";
    return option.toLowerCase().includes(search.toLowerCase());
  });

  const toggleOption = (opt: string) => {
    const newValues = values.includes(opt) 
      ? values.filter((v: string) => v !== opt)
      : [...values, opt];
    onChange(newValues);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-zinc-200 rounded-2xl px-5 flex flex-wrap gap-2 cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all min-h-[48px] items-center py-2"
      >
        {values.length > 0 ? (
          values.map((v: string) => (
            <span key={v} className="bg-primary/5 text-primary px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 border border-primary/10">
              {v.length > 20 ? v.substring(0, 20) + '...' : v}
              <X size={12} className="cursor-pointer hover:scale-125 transition-transform" onClick={(e) => { e.stopPropagation(); toggleOption(v); }} />
            </span>
          ))
        ) : (
          <span className="text-zinc-400 text-xs">{placeholder || "Выбрать..."}</span>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="absolute z-[100] top-full left-0 right-0 mt-3 bg-white border border-zinc-100 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-50">
              <input 
                autoFocus
                type="text" 
                className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-zinc-300 font-medium"
                placeholder="Поиск по категориям..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
              {filteredOptions.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={cn(
                    "w-full text-left px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all flex items-center justify-between group mb-1",
                    values.includes(opt) ? "bg-primary text-white" : "hover:bg-primary/5 text-zinc-600 hover:text-primary"
                  )}
                >
                  <span className="tracking-tight">{opt}</span>
                  {values.includes(opt) ? (
                    <Check size={18} className="text-white" />
                  ) : (
                    <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-zinc-300 text-xs font-black uppercase tracking-widest italic">Нет совпадений</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [statusFilter, setStatusFilter] = useState("Все");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [classificationFilters, setClassificationFilters] = useState<string[]>([]);
  const [sectionFilters, setSectionFilters] = useState<string[]>([]);
  const [motivationFilters, setMotivationFilters] = useState<string[]>([]);
  const [importanceFilter, setImportanceFilter] = useState("Все");

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
    let filtered = [...targetAppeals];

    if (targetPeriod === "custom" && targetStart && targetEnd) {
      const start = startOfDay(new Date(targetStart));
      const end = endOfDay(new Date(targetEnd));
      filtered = filtered.filter(a => {
        const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        return isWithinInterval(date, { start, end });
      });
    } else if (targetPeriod !== "custom") {
      const now = new Date();
      let start;
      if (targetPeriod === "day") start = startOfDay(now);
      else if (targetPeriod === "week") start = startOfWeek(now, { weekStartsOn: 1 });
      else if (targetPeriod === "month") start = startOfMonth(now);
      else if (targetPeriod === "year") start = startOfYear(now);
      
      if (start) {
        filtered = filtered.filter(a => {
          const date = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
          return date.getTime() >= start.getTime();
        });
      }
    }

    if (statusFilter !== "Все") filtered = filtered.filter(a => a.status === statusFilter);
    if (branchFilter !== "Все") filtered = filtered.filter(a => a.branch_name === branchFilter);
    if (classificationFilters.length > 0) {
      filtered = filtered.filter(a => {
        const val = a.confirmed_classification || a.complaint_classification || "";
        const vals = val.split(", ");
        return classificationFilters.some(filter => vals.includes(filter));
      });
    }
    if (sectionFilters.length > 0) {
      filtered = filtered.filter(a => {
        const val = a.confirmed_section || a.classification_section || "";
        const vals = val.split(", ");
        return sectionFilters.some(filter => vals.includes(filter));
      });
    }
    if (motivationFilters.length > 0) {
      filtered = filtered.filter(a => {
        const val = a.motivation_status || "";
        const vals = val.split(", ");
        return motivationFilters.some(filter => vals.includes(filter));
      });
    }
    if (importanceFilter !== "Все") filtered = filtered.filter(a => a.complaint_status === importanceFilter);

    return filtered;
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

  const filteredAppeals = React.useMemo(() => getFilteredData(), [appeals, period, startDate, endDate, statusFilter, branchFilter, classificationFilters, sectionFilters, motivationFilters, importanceFilter]);
  const previousAppeals = React.useMemo(() => getPreviousPeriodData(), [appeals, period, startDate, endDate]);

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

  const WEEKLY_BRANCHES = BRANCH_NAMES;

  const WEEKLY_CATEGORIES = [
    "Вкус", "Запах", "Внешний вид", "Пищевое отравление", "Инородное тело", 
    "Аллергические реакции", "Обслуживание (официанта, хостеса, менеджера, сотрудника зала)", 
    "Сроки доставки", "Состояние продукта при доставке", "Обслуживание курьера", 
    "Перепутаница", "Не доставлен вообще", "Недоложили", "Вид упаковки", 
    "Информационная технология", "Колл центр", "Кухня", "Специфические качества", 
    "Пищевая безопасность", "Доставка", "Упаковка", "Пресный вкус", "Слабый вкус", "Яркий вкус"
  ];

  const getMotivationDepartment = (classification: string, section: string, source: string) => {
    const cls = (classification || "").trim();
    const sec = (section || "").trim();
    const src = (source || "").toLowerCase();

    // Priority 1: Partner Source (if not matched by classification specifically as a complaint about them)
    if (src.includes("яндекс")) return "Яндекс";
    if (src.includes("узум")) return "Узум тезкор";
    if (src.includes("wolt")) return "Wolt";
    if (src.includes("express")) return "Express 24";

    // Priority 2: Logic from Point 8 Mapping
    // 🟢 Кухня / Продукт
    if (cls === "Вкус" || cls === "Запах" || cls === "Внешний вид" || cls === "Остывшая еда") return "КУХНЯ";
    if (cls === "Инородное тело") return "ПРОИЗВОДСТВЕННЫЙ ЦЕХ";

    // 🟢 Операции
    if (cls === "Не доложили") return "УПАКОВКА";
    if (cls === "Перепутали заказ" || cls === "Перепутаница") return "РАЗДАЧНИК";

    // 🟢 Логистика
    if (cls === "Долгая доставка" || cls === "Сроки доставки") return "ДОСТАВКА";

    // 🟢 Пищевая безопасность
    if (cls === "Отравление") return "ПРОИЗВОДСТВЕННЫЙ ЦЕХ";

    // 🟢 Сервис
    if (cls === "Обслуживание менеджера") return "МЕНЕДЖЕР";
    if (cls === "Обслуживание официанта") return "ЗАЛ";
    if (cls === "Обслуживание хостеса") return "ХОСТЕС";
    if (cls === "Обслуживание курьера") return "Курьер";

    // 🟢 Колл-центр
    if (cls === "Оператор" || cls === "Обслуживание колл центра") return "КОЛЛ ЦЕНТР";

    // Fallback search in strings
    const lowerCls = cls.toLowerCase();
    const lowerSec = sec.toLowerCase();
    if (lowerCls.includes("вкус") || lowerCls.includes("запах") || lowerSec.includes("вкус")) return "КУХНЯ";
    if (lowerCls.includes("официант") || lowerSec.includes("официант")) return "ЗАЛ";
    if (lowerCls.includes("менеджер") || lowerSec.includes("менеджер")) return "МЕНЕДЖЕР";
    if (lowerCls.includes("курьер") || lowerSec.includes("курьер")) return "Курьер";
    if (lowerCls.includes("доставка") || lowerSec.includes("доставка")) return "ДОСТАВКА";
    if (lowerCls.includes("упаковк") || lowerSec.includes("упаковк")) return "УПАКОВКА";
    if (lowerCls.includes("хостес") || lowerSec.includes("хостес")) return "ХОСТЕС";

    return "НЕ ОПРЕДЕЛЕНО";
  };

  const truncate = (str: string, max: number = 32700) => {
    if (!str) return "";
    return str.length > max ? str.substring(0, max) + "..." : str;
  };

  const getExcelData = (data: any[], type: 'daily' | 'weekly' | 'comments' = 'daily') => {
    if (type === 'daily') {
      return data.map(a => {
        const confirmedCls = a.confirmed_classification || a.complaint_classification || "";
        const confirmedSec = a.confirmed_section || a.classification_section || "";
        const mappedMotivation = a.justification_status === "Обосновано" ? getMotivationDepartment(confirmedCls, confirmedSec, a.source || "") : (a.motivation_status || "—");

        return {
          "БРЕНД / ФИЛИАЛ": truncate(a.branch_name || "—"),
          "Дата отзыва": safeFormatDate(a.created_at, "dd.MM.yyyy HH:mm"),
          "Дата заказа": truncate(a.order_date || "—"),
          "Классификация (Класс)": truncate(confirmedCls),
          "Раздел (Тип)": truncate(confirmedSec),
          "Дополнительный комментарий": truncate(a.adjective_comment || "—"),
          "Продукт / Сотрудник": truncate(a.product_employee || "—"),
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
          "Статус для отдела мотивации": truncate(mappedMotivation),
          "Корректирующие действия": truncate(a.corrective_actions || "—"),
          "Решение": truncate(a.solution || "—"),
          "Обоснованность": truncate(a.justification_status || "—")
        };
      });
    } else {
      // Logic for 'weekly' and 'comments' (Matrix reports)
      const allCols = [
        "Вкус", "Запах", "Внешний вид", "Пищевое отравление", "Инородное тело",
        "Обслуживание официанта", "Обслуживание хостеса", "Обслуживание менеджера",
        "Сроки доставки", "Состояние продукта при доставке", "Перепутаница",
        "Не доставлен", "Недоложили", "Упаковка", "Колл центр", "Другое"
      ];

      const getMatrixColumn = (appeal: Appeal): string => {
        if (appeal.justification_status === "Необосновано") return "Другое";
        
        const section = (appeal.confirmed_section || "").trim();

        if (section.includes("Вкус")) return "Вкус";
        if (section.includes("Запах")) return "Запах";
        if (section.includes("Внешний вид")) return "Внешний вид";
        if (section.includes("Отравление")) return "Пищевое отравление";
        if (section.includes("Инородное тело")) return "Инородное тело";
        if (section.includes("официант")) return "Обслуживание официанта";
        if (section.includes("хостес")) return "Обслуживание хостеса";
        if (section.includes("менеджер")) return "Обслуживание менеджера";
        if (section.includes("доставки")) return "Сроки доставки";
        if (section.includes("Состояние продукта")) return "Состояние продукта при доставке";
        if (section.includes("Перепутаница")) return "Перепутаница";
        if (section.includes("Не доставлен")) return "Не доставлен";
        if (section.includes("Недоложили")) return "Недоложили";
        if (section.includes("упаковк")) return "Упаковка";
        if (section.includes("колл центр")) return "Колл центр";
        
        return "Другое";
      };

      if (type === 'weekly') {
        const reportData = BRANCH_NAMES.map(branch => {
          const branchAppeals = data.filter(a => a.branch_name === branch && a.confirmed_section);
          const row: any = { "Филиал": branch };
          allCols.forEach(col => row[col] = 0);

          branchAppeals.forEach(a => {
            const col = getMatrixColumn(a);
            row[col]++;
          });

          row["ОБЩЕЕ"] = allCols.reduce((sum, col) => sum + row[col], 0);
          return row;
        });

        const totals: any = { "Филиал": "ИТОГО" };
        allCols.forEach(col => {
          totals[col] = reportData.reduce((sum, row) => sum + row[col], 0);
        });
        totals["ОБЩЕЕ"] = allCols.reduce((sum, col) => sum + totals[col], 0);
        reportData.push(totals);
        return reportData;
      } else {
        // type === 'comments'
        const reportData = BRANCH_NAMES.map(branch => {
          const branchAppeals = data.filter(a => a.branch_name === branch && a.confirmed_section);
          const row: any = { "Филиал": branch };
          const complaints: Record<string, string[]> = {};
          const corrections: Record<string, string[]> = {};

          allCols.forEach(col => {
            complaints[col] = [];
            corrections[col] = [];
            row[col] = 0;
          });

          branchAppeals.forEach(a => {
            const col = getMatrixColumn(a);
            complaints[col].push(a.complaint_text || "—");
            corrections[col].push(a.instant_correction || "—");
          });

          allCols.forEach(col => {
            const count = complaints[col].length;
            if (count > 0) {
              row[col] = `${count}\n${complaints[col].join('\n')}\n\n${corrections[col].join('\n')}`;
            } else {
              row[col] = 0;
            }
          });

          row["ОБЩЕЕ"] = allCols.reduce((sum, col) => sum + (complaints[col].length || 0), 0);
          return row;
        });

        const totals: any = { "Филиал": "ИТОГО" };
        allCols.forEach(col => {
          totals[col] = reportData.reduce((sum, row) => {
            const val = row[col];
            const count = typeof val === 'string' ? parseInt(val.split('\n')[0]) : (typeof val === 'number' ? val : 0);
            return sum + count;
          }, 0);
        });
        totals["ОБЩЕЕ"] = allCols.reduce((sum, col) => sum + totals[col], 0);
        reportData.push(totals);
        return reportData;
      }
    }
  };

  const sendExcelToTelegram = async (type: 'daily' | 'weekly' | 'comments' = 'daily') => {
    setIsSendingToTelegram(true);
    try {
      const dataToExport = getExcelData(filteredAppeals, type);
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      const sheetName = type === 'daily' ? "Стандартный отчёт" : type === 'weekly' ? "Свод отчёт" : "Отчёт с комментариями";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `${type === 'daily' ? 'Стандартный' : type === 'weekly' ? 'Сводный' : 'Комментарии'}_отчет_${format(new Date(), "dd_MM_yyyy")}.xlsx`;
      const periodText = period === 'custom' ? `${startDate} - ${endDate}` : 
                        period === 'day' ? 'Сегодня' :
                        period === 'week' ? 'Эта неделя' :
                        period === 'month' ? 'Этот месяц' : 'Этот год';
      const caption = `📊 <b>${type === 'daily' ? 'Стандартный отчёт' : type === 'weekly' ? 'Свод отчёт' : 'Отчёт с комментариями'}</b>\n📅 Период: ${periodText}\n📈 Всего записей: ${dataToExport.length}`;
      
      const success = await sendTelegramFile(blob, fileName, caption);
      if (success) alert("Файл успешно отправлен в Telegram");
      else alert("Не удалось отправить файл");
    } catch (error) {
      console.error("Error sending to telegram:", error);
      alert("Произошла ошибка при отправке");
    }
    setIsSendingToTelegram(false);
  };

  const exportToExcel = (type: 'daily' | 'weekly' | 'comments' = 'daily') => {
    const dataToExport = getExcelData(filteredAppeals, type);
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    const sheetName = type === 'daily' ? "Стандартный отчёт" : type === 'weekly' ? "Свод отчёт" : "Отчёт с комментариями";
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
      const wscols = Array(25).fill({wch: 15});
      ws['!cols'] = wscols;
    }

    XLSX.writeFile(wb, `${type === 'daily' ? 'Стандартный' : type === 'weekly' ? 'Сводный' : 'Комментарии'}_отчет_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) {
      return {
        label: current > 0 ? "+100%" : "0%",
        isPositive: current === 0
      };
    }
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
      let status = curr.motivation_status || "Не указан";
      if (curr.justification_status === "Обосновано") {
        const confirmedCls = curr.confirmed_classification || curr.complaint_classification || "";
        const confirmedSec = curr.confirmed_section || curr.classification_section || "";
        status = getMotivationDepartment(confirmedCls, confirmedSec, curr.source || "");
      }
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

  const getDateParams = () => {
    let start, end;
    if (period === "custom") {
      start = startDate;
      end = endDate;
    } else {
      const now = new Date();
      if (period === "day") start = format(startOfDay(now), "yyyy-MM-dd");
      else if (period === "week") start = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      else if (period === "month") start = format(startOfMonth(now), "yyyy-MM-dd");
      else if (period === "year") start = format(startOfYear(now), "yyyy-MM-dd");
      end = format(endOfDay(now), "yyyy-MM-dd");
    }
    return `&start=${start}&end=${end}`;
  };

  const exportSectionToExcel = (data: any[], title: string) => {
    const dataToExport = getExcelData(data, 'daily');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Отчёт");
    XLSX.writeFile(wb, `${title}_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  const ChartHeader = ({ title, onExport }: { title: string; onExport: () => void }) => (
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <button 
        onClick={(e) => { e.stopPropagation(); onExport(); }}
        className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"
        title="Скачать отчёт по этой секции"
      >
        <Download size={18} />
      </button>
    </div>
  );

  // Data for Classification Pie Chart
  const classificationData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const cat = curr.complaint_classification || "Другое";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [filteredAppeals]);

  // Data for Dynamics Line Chart
  const dynamicsData = React.useMemo(() => {
    const counts = filteredAppeals.reduce((acc: any, curr) => {
      const date = curr.created_at?.toDate ? curr.created_at.toDate() : new Date(curr.created_at);
      const dateStr = format(date, "dd.MM.yyyy");
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {});

    let start, end;
    const now = new Date();
    
    if (period === "day") {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (period === "week") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfDay(now);
    } else if (period === "month") {
      start = startOfMonth(now);
      end = endOfDay(now);
    } else if (period === "year") {
      start = startOfYear(now);
      end = endOfDay(now);
    } else if (period === "custom" && startDate && endDate) {
      start = startOfDay(new Date(startDate));
      end = endOfDay(new Date(endDate));
    } else {
      // Default to last 7 days if something is missing
      start = subDays(startOfDay(now), 7);
      end = endOfDay(now);
    }

    try {
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dateStr = format(day, "dd.MM.yyyy");
        return {
          date: dateStr,
          count: counts[dateStr] || 0
        };
      });
    } catch (e) {
      // Fallback in case of invalid interval
      return Object.entries(counts)
        .map(([date, count]) => ({ date, count: count as number }))
        .sort((a, b) => {
          const [d1, m1, y1] = a.date.split('.').map(Number);
          const [d2, m2, y2] = b.date.split('.').map(Number);
          return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
        });
    }
  }, [filteredAppeals, period, startDate, endDate]);

  // Data for Appeal Status Chart
  const appealStatusData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const status = curr.status || "Новый";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [filteredAppeals]);

  // Data for Complaint Status Chart
  const complaintStatusData = React.useMemo(() => Object.entries(
    filteredAppeals.reduce((acc: any, curr) => {
      const status = curr.complaint_status || "Не указано";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number })), [filteredAppeals]);

  // Data for Status by Branch
  const statusByBranchData = React.useMemo(() => {
    const branches = Array.from(new Set(filteredAppeals.map(a => a.branch_name || "Не указан")));
    return branches.map(branch => {
      const branchAppeals = filteredAppeals.filter(a => a.branch_name === branch);
      return {
        name: branch,
        Критические: branchAppeals.filter(a => a.complaint_status === "Критические").length,
        Значимые: branchAppeals.filter(a => a.complaint_status === "Значимые").length,
        Незначимые: branchAppeals.filter(a => a.complaint_status === "Незначимые").length,
        total: branchAppeals.length
      };
    }).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredAppeals]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-2xl shadow-sm border border-zinc-200">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Аналитика</h1>
          <p className="text-zinc-500 mt-1 font-medium">Контроль качества и анализ обращений</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            {(["day", "week", "month", "year", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  period === p ? "bg-white text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {p === "day" ? "День" : p === "week" ? "Нед" : p === "month" ? "Мес" : p === "year" ? "Год" : "Свой"}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-white border border-zinc-200 rounded-[2rem] p-1.5 px-6 shadow-sm ring-2 ring-primary/5"
            >
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-black focus:ring-0 text-primary uppercase"
              />
              <span className="text-zinc-200">/</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-black focus:ring-0 text-primary uppercase"
              />
            </motion.div>
          )}
        </div>
      </header>

      {/* Standard Filter Grid */}
      <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8 border-b border-zinc-100 pb-4">
          <TrendingUp size={20} className="text-primary" />
          <h2 className="text-xl font-bold text-zinc-900">Фильтры данных</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Статус обращения</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-zinc-50 border-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 appearance-none shadow-sm transition-all text-[#1F2937]"
              >
                <option>Все</option>
                <option>Новый</option>
                <option>В работе</option>
                <option>Выполнен</option>
                <option>Отменен</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Филиал (Объект)</label>
              <select 
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full bg-zinc-50 border-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 appearance-none shadow-sm transition-all text-[#1F2937]"
              >
                <option>Все</option>
                {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            <MultiSelectFilter 
              label="Категория"
              values={classificationFilters}
              options={COMPLAINT_CLASSIFICATIONS}
              onChange={setClassificationFilters}
            />
            <MultiSelectFilter 
              label="Раздел"
              values={sectionFilters}
              options={CLASSIFICATION_SECTIONS}
              onChange={setSectionFilters}
            />
            <MultiSelectFilter 
              label="Статус мотивации"
              values={motivationFilters}
              options={MOTIVATION_STATUSES}
              onChange={setMotivationFilters}
            />

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Степень важности</label>
              <select 
                value={importanceFilter}
                onChange={(e) => setImportanceFilter(e.target.value)}
                className="w-full bg-zinc-50 border-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 appearance-none shadow-sm transition-all text-[#1F2937]"
              >
                <option>Все</option>
                {COMPLAINT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-zinc-100">
            {/* Telegram Export Group */}
            <div className="relative group/tg">
              <button 
                className="flex items-center gap-2 bg-[#0088CC] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-md shadow-blue-500/10"
              >
                <Send size={18} />
                Отправить в телеграмм
              </button>
              <div className="absolute left-0 bottom-full mb-3 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover/tg:opacity-100 group-hover/tg:visible transition-all z-[100] overflow-hidden p-1">
                <button 
                  onClick={() => sendExcelToTelegram('daily')}
                  disabled={isSendingToTelegram}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 rounded-lg transition-all border-b border-zinc-100 flex items-center justify-between"
                >
                  Стандартный отчёт
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
                <button 
                  onClick={() => sendExcelToTelegram('weekly')}
                  disabled={isSendingToTelegram}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 rounded-lg transition-all border-b border-zinc-100 flex items-center justify-between"
                >
                  Сводный отчёт
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
                <button 
                  onClick={() => sendExcelToTelegram('comments')}
                  disabled={isSendingToTelegram}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 rounded-lg transition-all flex items-center justify-between"
                >
                  Отчёт с комментариями
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Excel Download Group */}
            <div className="relative group/dl">
              <button 
                className="flex items-center gap-2 bg-[#0088CC] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-md shadow-blue-500/10"
              >
                <Download size={18} />
                скачать Экзел файл
              </button>
              <div className="absolute left-0 bottom-full mb-3 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover/dl:opacity-100 group-hover/dl:visible transition-all z-[100] overflow-hidden p-1">
                <button 
                  onClick={() => exportToExcel('daily')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 rounded-lg transition-all border-b border-zinc-100 flex items-center justify-between"
                >
                  Стандартный XLSX
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
                <button 
                  onClick={() => exportToExcel('weekly')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 rounded-lg transition-all border-b border-zinc-100 flex items-center justify-between"
                >
                  сводный отчёт
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
                <button 
                  onClick={() => exportToExcel('comments')}
                  className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-zinc-50 rounded-lg transition-all flex items-center justify-between"
                >
                  Отчёт (Комментарии)
                  <ChevronRight size={14} className="text-zinc-400" />
                </button>
              </div>
            </div>

            <p className="ml-auto text-zinc-400 text-xs font-medium">
              Найдено: <span className="text-primary font-bold">{filteredAppeals.length}</span> записей
            </p>
          </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
          color="text-warning" 
          trend={showComparison ? getTrend(filteredAppeals.filter(a => a.status === "В работе").length, previousAppeals.filter(a => a.status === "В работе").length) : null}
        />
        <StatCard 
          title="Выполнено" 
          value={filteredAppeals.filter(a => a.status === "Выполнен").length} 
          icon={Check} 
          color="text-success" 
          trend={showComparison ? getTrend(filteredAppeals.filter(a => a.status === "Выполнен").length, previousAppeals.filter(a => a.status === "Выполнен").length) : null}
        />
        <StatCard 
          title="Просрочено" 
          value={filteredAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length} 
          icon={AlertCircle} 
          color="text-error" 
          trend={showComparison ? getTrend(filteredAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length, previousAppeals.filter(a => a.deadline && new Date(a.deadline).getTime() < new Date().getTime()).length) : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Dynamics Chart */}
        <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm lg:col-span-2 hover:shadow-xl transition-shadow duration-500">
          <ChartHeader title="Динамика обращений" onExport={() => exportSectionToExcel(filteredAppeals, "Динамика_обращений")} />
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicsData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F80ED" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2F80ED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="count" stroke="#2F80ED" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Category Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <ChartHeader title="Категории жалоб (статистика)" onExport={() => exportSectionToExcel(filteredAppeals, "Категории_жалоб")} />
          <div className="h-[300px] w-full text-zinc-400">
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
                  onClick={(data) => {
                    if (data && data.name) {
                      navigate(`/analytics/category?value=${data.name}${getDateParams()}`);
                    }
                  }}
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
          <ChartHeader title="Отдел мотивации" onExport={() => exportSectionToExcel(filteredAppeals, "Отчет_по_мотивации")} />
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
                  onClick={(data) => {
                    if (data && data.name) {
                      navigate(`/analytics/motivation?value=${data.name}${getDateParams()}`);
                    }
                  }}
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

        {/* Complaint Status Pie Chart (Importance) */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <ChartHeader title="Важность жалоб (статистика)" onExport={() => exportSectionToExcel(filteredAppeals, "Важность_жалоб")} />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complaintStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => navigate(`/analytics/complaint_status?value=${data.name}${getDateParams()}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {complaintStatusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === "Критические" ? "#f43f5e" : entry.name === "Значимые" ? "#f59e0b" : "#3b82f6"} 
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

        {/* Justification Status Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <ChartHeader title="Обоснованность жалоб (статистика)" onExport={() => exportSectionToExcel(filteredAppeals, "Обоснованность_жалоб")} />
          <div className="h-[300px] w-full text-zinc-400">
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
                  onClick={(data) => navigate(`/analytics/justification?value=${data.name}${getDateParams()}`)}
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

        {/* Appeal Status Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <ChartHeader title="Статус обращений (статистика)" onExport={() => exportSectionToExcel(filteredAppeals, "Статус_обращений")} />
          <div className="h-[300px] w-full text-zinc-400">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appealStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => navigate(`/analytics/status?value=${data.name}${getDateParams()}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {appealStatusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === "Выполнен" ? "#10b981" : 
                        entry.name === "В работе" ? "#f59e0b" : 
                        entry.name === "Новый" ? "#3b82f6" : 
                        "#94a3b8"
                      } 
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

        {/* Branch Bar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold">Топ-10 филиалов по жалобам</h3>
              <button 
                onClick={() => exportSectionToExcel(filteredAppeals.filter(a => branchData.some(b => b.name === a.branch_name)), "Топ_филиалов")}
                className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition-all"
              >
                <Download size={18} />
              </button>
            </div>
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
                    navigate(`/analytics/branch?value=${data.activeLabel}${getDateParams()}`);
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

        {/* Status by Branch Horizontal Stacked Bar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm col-span-full">
          <ChartHeader title="Статус жалоб по филиалам (Топ-10)" onExport={() => exportSectionToExcel(filteredAppeals, "Статус_по_филиалам")} />
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={statusByBranchData}
                onClick={(data) => {
                  if (data && data.activeLabel) {
                    navigate(`/analytics/branch?value=${data.activeLabel}${getDateParams()}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} width={120} />
                <Tooltip 
                  cursor={{ fill: '#f8f9fa' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                <Bar dataKey="Критические" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="Значимые" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={32} />
                <Bar dataKey="Незначимые" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
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
