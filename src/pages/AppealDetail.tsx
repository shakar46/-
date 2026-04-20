import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Trash2, 
  Plus, 
  X, 
  Check, 
  Search,
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Tag,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertCircle,
  History,
  Zap,
  Wand2,
  SortAsc,
  SortDesc,
  ChevronRight,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { logEvent } from "../utils/logger";
import { sendTelegramMessage } from "../utils/telegram";
import * as XLSX from "xlsx";
import { 
  COMPLAINT_CLASSIFICATIONS, 
  CLASSIFICATION_SECTIONS, 
  ADJECTIVE_COMMENTS, 
  PRODUCTS_EMPLOYEES, 
  BRANCH_NAMES, 
  SOURCES, 
  DEADLINE_STATUSES, 
  MOTIVATION_STATUSES,
  COMPLAINT_STATUSES
} from "../constants";
import { Appeal } from "../types";
import { useFirebase } from "../components/FirebaseProvider";

const Autocomplete = ({ label, value, options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((o: string) => {
    const option = o || "";
    return option.toLowerCase().includes(search.toLowerCase());
  });

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
      {label && <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</label>}
      <div 
        onClick={() => setIsOpen(true)}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-all"
      >
        <span className={value ? "text-black font-medium" : "text-zinc-400"}>
          {value || placeholder || "Выберите вариант..."}
        </span>
        <Search size={16} className="text-zinc-400" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-zinc-100">
              <input 
                autoFocus
                type="text" 
                className="w-full bg-zinc-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-0"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100 transition-colors flex items-center justify-between group"
                >
                  {opt}
                  {value === opt && <Check size={14} className="text-black" />}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="p-4 text-center text-zinc-400 text-xs italic">Ничего не найдено</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MultiSelect = ({ label, values = [], options, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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
      {label && <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{label}</label>}
      <div 
        onClick={() => setIsOpen(true)}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 min-h-[46px] text-sm flex flex-wrap gap-2 cursor-pointer hover:border-zinc-300 transition-all"
      >
        {values.length > 0 ? (
          values.map((v: string) => (
            <span key={v} className="bg-black text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
              {v}
              <X size={10} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleOption(v); }} />
            </span>
          ))
        ) : (
          <span className="text-zinc-400 py-1">{placeholder || "Выберите варианты..."}</span>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-zinc-100">
              <input 
                autoFocus
                type="text" 
                className="w-full bg-zinc-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-0"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100 transition-colors flex items-center justify-between group"
                >
                  {opt}
                  {values.includes(opt) && <Check size={14} className="text-black" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import imageCompression from "browser-image-compression";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AppealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useFirebase();
  const [appeal, setAppeal] = useState<Appeal>({
    client_name: "",
    client_phone: "",
    complaint_text: "",
    status: "Новый",
    product_employee: "",
    classification_section: "",
    adjective_comment: "",
    branch_name: BRANCH_NAMES[0],
    source: SOURCES[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    complaint_photos: [],
    completion_date: "",
    confirmed_classification: "",
    confirmed_section: ""
  });
  const [initialAppeal, setInitialAppeal] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [standardAppeals, setStandardAppeals] = useState<any[]>([]);
  const [isQuickReplyOpen, setIsQuickReplyOpen] = useState(false);
  const [scriptSearch, setScriptSearch] = useState("");
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const exportStandardReport = () => {
    if (!appeal) return;

    const formatDate = (dateStr: string | undefined, formatStr: string) => {
      if (!dateStr) return "—";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "—";
        return format(date, formatStr, { locale: ru });
      } catch (e) {
        return "—";
      }
    };

    const data = [
      {
        "Дата/время поступления жалобы в отдел": formatDate(appeal.created_at, "dd.MM.yyyy HH:mm"),
        "Дата заказа": formatDate(appeal.order_date, "dd.MM.yyyy"),
        "Классификация жалобы": appeal.complaint_classification || "—",
        "Раздел классификации": appeal.classification_section || "—",
        "Прилагательный комментарий": appeal.adjective_comment || "—",
        "Продукт / Сотрудник": appeal.product_employee || "—",
        "Название филиала": appeal.branch_name || "—",
        "Чек заказа": appeal.order_receipt || "—",
        "Краткое описание обращения": appeal.complaint_text || "—",
        "Источник": appeal.source || "—",
        "Имя": appeal.client_name || "—",
        "Телефон": appeal.client_phone || "—",
        "Образец / Фото": appeal.complaint_photos && appeal.complaint_photos.length > 0 ? `Есть (${appeal.complaint_photos.length})` : "Нет",
        "Дополнительная информация": appeal.solution || "—",
        "Кто принял жалобу": appeal.accepted_by || "—",
        "SIP — аудиозапись": appeal.sip_link || "—",
        "Ответственный за коррекцию": appeal.responsible_person || "—",
        "Срок устранения": formatDate(appeal.completion_date, "dd.MM.yyyy"),
        "Моментальная коррекция от ответственного лица": appeal.instant_correction || "—",
        "Анализ корневых причин (метод «Почему»)": appeal.root_cause_analysis || "—",
        "Статус для отдела мотивации и аналитики": appeal.motivation_status || "—",
        "Корректирующие действия": appeal.corrective_actions || "—"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Отчёт");

    // Set column widths
    const wscols = [
      { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 15 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
      { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 40 },
      { wch: 25 }, { wch: 40 }
    ];
    ws["!cols"] = wscols;

    XLSX.writeFile(wb, `Стандартный_отчет_${id?.slice(0, 8)}_${format(new Date(), "dd_MM_yyyy")}.xlsx`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };

    for (const file of files) {
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAppeal(prev => ({
            ...prev, 
            complaint_photos: [...(prev.complaint_photos || []), reader.result as string]
          }));
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  useEffect(() => {
    if (id === "new") {
      setLoading(false);
      return;
    }
    const fetchAppeal = async () => {
      const docRef = doc(db, "appeals", id!);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Appeal;
          setAppeal(data);
          setInitialAppeal(data);
          fetchAuditLogs();
          fetchStandardAppeals();
          fetchComplaintLogs();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `appeals/${id}`);
      }
      setLoading(false);
    };
    fetchAppeal();
  }, [id]);

  const fetchStandardAppeals = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "standard_appeals"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStandardAppeals(data);
    } catch (error) {
      console.error("Error fetching standard appeals:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const q = query(
        collection(db, "audit_logs"), 
        where("appeal_id", "==", id),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      setAuditLogs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "audit_logs");
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    client_name: "Имя клиента",
    client_phone: "Телефон",
    branch_name: "Филиал",
    complaint_text: "Текст жалобы",
    complaint_classification: "Классификация",
    status: "Статус",
    motivation_status: "Отдел мотивации",
    solution: "Решение",
    deadline: "Дедлайн",
    comment: "Комментарий",
    operator_comment: "Комментарий оператора"
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isNew = id === "new";
      const appealData = {
        ...appeal,
        updated_at: new Date().toISOString()
      };

      const changes: string[] = [];
      if (!isNew && initialAppeal) {
        Object.keys(appealData).forEach(key => {
          if (key !== 'updated_at' && key !== 'id' && JSON.stringify(appealData[key]) !== JSON.stringify(initialAppeal[key])) {
            const label = FIELD_LABELS[key] || key;
            const oldVal = initialAppeal[key] || "—";
            const newVal = appealData[key] || "—";
            changes.push(`🔹 <b>${label}</b>: ${oldVal} ➡️ ${newVal}`);
          }
        });
      }

      let appealId = id;
      if (isNew) {
        const docRef = await addDoc(collection(db, "appeals"), appealData);
        appealId = docRef.id;
      } else {
        await updateDoc(doc(db, "appeals", id!), appealData);
      }

      // Add audit log
      await addDoc(collection(db, "audit_logs"), {
        appeal_id: appealId,
        user_id: user?.uid || "system",
        user_name: user?.displayName || "shakar46",
        action: isNew ? "Создание обращения" : "Обновление обращения",
        changes: changes.length > 0 ? changes.join('\n') : null,
        timestamp: new Date().toISOString()
      });

      // Log to global audit log
      await logEvent({
        userId: user?.uid || "system",
        userEmail: user?.email || "",
        userName: user?.displayName || "User",
        type: 'action',
        action: isNew ? `Создано обращение #${appealId?.slice(0, 8)}` : `Обновлено обращение #${appealId?.slice(0, 8)}`,
        metadata: { appealId, clientName: appeal.client_name, changes: changes.length > 0 ? changes : undefined }
      });

      // Send Audit notification (only for new appeals as per user request to remove update messages)
      if (isNew) {
        const auditMessage = `🛡 <b>АУДИТ: Создание обращения</b>\n\n` +
          `👤 Кто: ${user?.displayName || "User"} (${user?.email})\n` +
          `📝 Действие: Создано новое обращение\n` +
          `🆔 ID: #${appealId?.slice(0, 8)}\n` +
          `👤 Клиент: ${appeal.client_name}`;

        await sendTelegramMessage(auditMessage, 'audit');
      }

      // Telegram notification logic
      if (isNew) {
        const settingsSnap = await getDoc(doc(db, "settings", "telegram"));
        if (settingsSnap.exists() && settingsSnap.data().notifications_enabled) {
          const { telegram_token, telegram_chat_id } = settingsSnap.data();
          if (telegram_token && telegram_chat_id) {
            let message = `📢 Новое обращение #${appealId?.slice(0, 8)}\n👤 Клиент: ${appeal.client_name}\n📍 Филиал: ${appeal.branch_name}\n📝 Статус: ${appeal.status}\n🔗 Подробнее: ${window.location.origin}/#/appeals/${appealId}`;
            
            // Overdue notification
            if (appeal.deadline === "Просроченно выполнен" || appeal.deadline === "Вообще не выполнен") {
              message = `⚠️ ВНИМАНИЕ: ПРОСРОЧЕНО!\n\n${message}\n⏳ Дедлайн: ${appeal.deadline}`;
            }

            // Send message with photo if exists
            if (appeal.complaint_photos && appeal.complaint_photos.length > 0) {
              const photo = appeal.complaint_photos[0];
              const formData = new FormData();
              formData.append("chat_id", telegram_chat_id);
              formData.append("caption", message);
              formData.append("parse_mode", "HTML");
              
              if (photo.startsWith("data:image")) {
                const blob = await (await fetch(photo)).blob();
                formData.append("photo", blob, "photo.jpg");
              } else {
                formData.append("photo", photo);
              }

              fetch(`https://api.telegram.org/bot${telegram_token}/sendPhoto`, {
                method: "POST",
                body: formData
              }).catch(console.error);
            } else {
              fetch(`https://api.telegram.org/bot${telegram_token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: telegram_chat_id, text: message, parse_mode: "HTML" })
              }).catch(console.error);
            }
          }
        }
      }

      if (isNew) navigate(`/appeals/${appealId}`);
      else {
        fetchAuditLogs();
        fetchComplaintLogs();
      }
      
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      setSaveStatus("error");
      const errorMessage = err?.message || "Неизвестная ошибка";
      alert(`Ошибка при сохранении: ${errorMessage}`);
      setTimeout(() => setSaveStatus("idle"), 5000);
      handleFirestoreError(err, id === "new" ? OperationType.CREATE : OperationType.UPDATE, "appeals");
    }
    setSaving(false);
  };

  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!appeal.instant_correction || !appeal.solution) {
      alert("Пожалуйста, заполните 'Мгновенную коррекцию' и 'Решение' перед отправкой.");
      return;
    }

    setProcessing(true);
    try {
      const processedAt = new Date().toISOString();
      const updateData = {
        ...appeal,
        status: "Выполнен",
        processed_by: user?.uid || "system",
        processed_by_name: user?.displayName || "shakar46",
        processed_at: processedAt,
        updated_at: processedAt
      };

      await updateDoc(doc(db, "appeals", id!), updateData);

      // Create complaint log
      await addDoc(collection(db, "complaint_logs"), {
        appeal_id: id,
        manager_id: user?.uid || "system",
        manager_name: user?.displayName || "shakar46",
        action: "Обработка жалобы",
        fields_filled: ["instant_correction", "solution", "status"],
        timestamp: processedAt
      });

      setAppeal(updateData as Appeal);
      fetchAuditLogs();
      fetchComplaintLogs();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appeals/${id}`);
      setSaveStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  const [complaintLogs, setComplaintLogs] = useState<any[]>([]);

  const fetchComplaintLogs = async () => {
    try {
      const q = query(
        collection(db, "complaint_logs"), 
        where("appeal_id", "==", id),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      setComplaintLogs(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching complaint logs:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "appeals", id!));
      
      // Log deletion
      await logEvent({
        userId: user?.uid || "system",
        userEmail: user?.email || "",
        userName: user?.displayName || "User",
        type: 'action',
        action: `Удалено обращение #${id?.slice(0, 8)}`,
        metadata: { appealId: id }
      });

      // Send Audit notification
      await sendTelegramMessage(
        `🛡 <b>АУДИТ: Удаление обращения</b>\n\n` +
        `👤 Кто: ${user?.displayName || "User"} (${user?.email})\n` +
        `📝 Действие: Удалено обращение\n` +
        `🆔 ID: #${id?.slice(0, 8)}`,
        'audit'
      );

      navigate("/appeals");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appeals/${id}`);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-zinc-400">Загрузка...</div>;

  const parseMulti = (val: string | undefined) => val ? val.split(", ") : [];
  const stringifyMulti = (arr: string[]) => arr.join(", ");

  const getSuggestedMotivation = (classification: string, section: string, source: string): string[] => {
    const cls = (classification || "").toLowerCase();
    const sec = (section || "").toLowerCase();
    const src = (source || "").toLowerCase();

    if (src.includes("яндекс")) return ["Яндекс"];
    if (src.includes("узум")) return ["Узум тезкор"];
    if (src.includes("wolt")) return ["Wolt"];
    if (src.includes("express")) return ["ДОСТАВКА"];

    if (sec.includes("вкус") || sec.includes("запах") || sec.includes("внешний вид")) return ["КУХНЯ"];
    if (sec.includes("остывшая еда") || sec.includes("отдача")) return ["КУХНЯ", "ДОСТАВКА"];
    if (sec.includes("инородное тело")) return ["ПРОИЗВОДСТВЕННЫЙ ЦЕХ"];
    
    if (sec.includes("недоложили")) return ["УПАКОВКА", "КУХНЯ"];
    if (sec.includes("перепутаница") || sec.includes("перепутали")) return ["УПАКОВКА", "РАЗДАЧНИК"];
    
    if (sec.includes("срок")) return ["ДОСТАВКА", "АДМИН, КУРЬЕР"];
    if (sec.includes("отравление")) return ["ПРОИЗВОДСТВЕННЫЙ ЦЕХ", "СКЛАД", "КУХНЯ"];
    
    if (sec.includes("менеджер")) return ["МЕНЕДЖЕР"];
    if (sec.includes("официант")) return ["ЗАЛ"];
    if (sec.includes("хостес")) return ["ХОСТЕС"];
    if (sec.includes("курьер")) return ["АДМИН, КУРЬЕР"];
    
    if (cls.includes("колл") || sec.includes("колл")) return ["КОЛЛ ЦЕНТР"];

    return [];
  };

  const autoFillMotivation = () => {
    const confirmedCls = appeal.confirmed_classification || appeal.complaint_classification || "";
    const confirmedSec = appeal.confirmed_section || appeal.classification_section || "";
    const suggested = getSuggestedMotivation(confirmedCls, confirmedSec, appeal.source || "");
    if (suggested.length > 0) {
      setAppeal({ ...appeal, motivation_status: stringifyMulti(suggested) });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 pt-10">
      <header className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/appeals")}
          className="flex items-center gap-2 text-zinc-500 hover:text-black font-bold transition-colors"
        >
          <ChevronLeft size={20} /> Назад к списку
        </button>
        <div className="flex items-center gap-3">
          {id !== "new" && userRole === 'admin' && (
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {saving ? "Сохранение..." : <><Save size={20} /> Сохранить</>}
          </button>
        </div>
      </header>

      {saveStatus === "error" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl flex items-center gap-3 font-medium mb-4"
        >
          <AlertCircle size={20} />
          <span>Произошла ошибка при сохранении. Убедитесь, что все обязательные поля заполнены.</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Manager Action Section - Highlighted */}
          {id !== "new" && (
            <section className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 mb-1">
                  Обработка обращения
                </h2>
                <p className="text-zinc-500 text-xs font-medium">
                  Заполните информацию о решении и мгновенном исправлении
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Мгновенное исправление (Обратная связь)
                  </label>
                  <textarea 
                    rows={3}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none shadow-sm"
                    value={appeal.instant_correction || ""}
                    onChange={(e) => setAppeal({...appeal, instant_correction: e.target.value})}
                    placeholder="Что сказали клиенту?"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Решение ситуации
                  </label>
                  <textarea 
                    rows={3}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none shadow-sm"
                    value={appeal.solution || ""}
                    onChange={(e) => setAppeal({...appeal, solution: e.target.value})}
                    placeholder="Итоговое решение..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProcess}
                    disabled={processing || appeal.status === 'Выполнен'}
                    className={cn(
                      "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all",
                      appeal.status === 'Выполнен' 
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200" 
                        : "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/10"
                    )}
                  >
                    {processing ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : appeal.status === 'Выполнен' ? (
                      <><Check size={18} /> Обработано</>
                    ) : (
                      "Завершить обработку"
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-8">
            <h2 className="text-xl font-black flex items-center gap-3">
              <FileText size={22} className="text-zinc-400" /> Основная информация
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Имя клиента</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  value={appeal.client_name || ""}
                  onChange={(e) => setAppeal({...appeal, client_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Важность жалобы</label>
                <select 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all appearance-none"
                  value={appeal.complaint_status || "Незначимые"}
                  onChange={(e) => setAppeal({...appeal, complaint_status: e.target.value as any})}
                >
                  {COMPLAINT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Телефон</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  value={appeal.client_phone || ""}
                  onChange={(e) => setAppeal({...appeal, client_phone: e.target.value.replace(/\D/g, "")})}
                  placeholder="998901234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Дата заказа</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  value={appeal.order_date || ""}
                  onChange={(e) => setAppeal({...appeal, order_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Кто принял жалобу</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  value={appeal.accepted_by || ""}
                  onChange={(e) => setAppeal({...appeal, accepted_by: e.target.value})}
                  placeholder="ФИО специалиста..."
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Текст обращения</label>
                <button 
                  onClick={() => setIsQuickReplyOpen(true)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-black bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded-lg transition-colors"
                >
                  <Zap size={12} />
                  Быстрый ответ
                </button>
              </div>
              <textarea 
                rows={4}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                value={appeal.complaint_text || ""}
                onChange={(e) => setAppeal({...appeal, complaint_text: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Autocomplete 
                label="Классификация жалобы" 
                value={appeal.complaint_classification || ""}
                options={COMPLAINT_CLASSIFICATIONS}
                onChange={(val: string) => setAppeal({...appeal, complaint_classification: val})}
              />
              <MultiSelect 
                label="Раздел классификации"
                values={parseMulti(appeal.classification_section)}
                options={CLASSIFICATION_SECTIONS}
                onChange={(vals: string[]) => setAppeal({...appeal, classification_section: stringifyMulti(vals)})}
              />
            </div>

            <MultiSelect 
              label="Прилагательный комментарий"
              values={parseMulti(appeal.adjective_comment)}
              options={ADJECTIVE_COMMENTS}
              onChange={(vals: string[]) => setAppeal({...appeal, adjective_comment: stringifyMulti(vals)})}
            />

            <MultiSelect 
              label="Продукт / Сотрудник"
              values={parseMulti(appeal.product_employee)}
              options={PRODUCTS_EMPLOYEES}
              onChange={(vals: string[]) => setAppeal({...appeal, product_employee: stringifyMulti(vals)})}
            />
          </section>

          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin size={20} className="text-zinc-400" /> Локация и Источник
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Autocomplete 
                label="Название филиала"
                value={appeal.branch_name || ""}
                options={BRANCH_NAMES}
                onChange={(val: string) => setAppeal({...appeal, branch_name: val})}
              />
              <Autocomplete 
                label="Источник"
                value={appeal.source || ""}
                options={SOURCES}
                onChange={(val: string) => setAppeal({...appeal, source: val})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Чек заказа</label>
              <input 
                type="text" 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                value={appeal.order_receipt || ""}
                onChange={(e) => setAppeal({...appeal, order_receipt: e.target.value})}
              />
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ImageIcon size={20} className="text-zinc-400" /> Фотографии жалобы
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence>
                {(appeal.complaint_photos || []).map((photo, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square bg-zinc-100 rounded-2xl overflow-hidden group"
                  >
                    <img 
                      src={photo} 
                      alt={`Complaint ${index + 1}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedPhoto(photo)}
                        className="p-2 bg-white text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                      >
                        Увеличить
                      </button>
                      <button 
                        onClick={() => {
                          const newPhotos = [...(appeal.complaint_photos || [])];
                          newPhotos.splice(index, 1);
                          setAppeal({...appeal, complaint_photos: newPhotos});
                        }}
                        className="p-2 bg-rose-500 text-white rounded-xl hover:scale-105 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <label className="aspect-square flex flex-col items-center justify-center border-2 border-zinc-200 border-dashed rounded-2xl cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-all">
                <Plus className="w-8 h-8 mb-2 text-zinc-300" />
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Добавить фото</p>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle size={20} className="text-zinc-400" /> Анализ и Решение
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Дата выполнения (Deadline)</label>
                <input 
                  type="datetime-local"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  value={appeal.completion_date || ""}
                  onChange={(e) => setAppeal({...appeal, completion_date: e.target.value})}
                />
              </div>
              <Autocomplete 
                label="Статус дедлайна"
                value={appeal.deadline || ""}
                options={DEADLINE_STATUSES}
                onChange={(val: string) => setAppeal({...appeal, deadline: val})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Ответственный за коррекцию</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                  value={appeal.responsible_person || ""}
                  onChange={(e) => setAppeal({...appeal, responsible_person: e.target.value})}
                  placeholder="ФИО ответственного..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Загрузить файл / Аудиозапись</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                    value={appeal.sip_link || ""}
                    onChange={(e) => setAppeal({...appeal, sip_link: e.target.value})}
                    placeholder="Ссылка на файл или загрузите..."
                  />
                  <label className="p-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl cursor-pointer transition-colors">
                    <Download size={20} className="text-zinc-600" />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAppeal({...appeal, sip_link: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="relative">
                <MultiSelect 
                  label="Статус для отдела мотивации"
                  values={parseMulti(appeal.motivation_status)}
                  options={MOTIVATION_STATUSES}
                  onChange={(vals: string[]) => setAppeal({...appeal, motivation_status: stringifyMulti(vals)})}
                />
                <button 
                  onClick={autoFillMotivation}
                  title="Рассчитать отдел мотивации автоматически"
                  className="absolute right-0 -top-2 p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-full transition-all"
                >
                  <Wand2 size={16} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Статус обоснованности</label>
                <div className="flex gap-2">
                  {["Обосновано", "Необосновано"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setAppeal({ ...appeal, justification_status: status as any })}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold border transition-all",
                        appeal.justification_status === status
                          ? "bg-black text-white border-black"
                          : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-zinc-50/50 rounded-3xl p-6 border border-zinc-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Подтвержденная классификация</h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Итоговый анализ типа и разделов жалобы</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MultiSelect 
                  label="Категория (Тип)"
                  values={parseMulti(appeal.confirmed_classification)}
                  options={COMPLAINT_CLASSIFICATIONS}
                  onChange={(vals: string[]) => setAppeal({...appeal, confirmed_classification: stringifyMulti(vals)})}
                  placeholder="Выберите типы..."
                />
                <MultiSelect 
                  label="Секции (Разделы)"
                  values={parseMulti(appeal.confirmed_section)}
                  options={CLASSIFICATION_SECTIONS}
                  onChange={(vals: string[]) => setAppeal({...appeal, confirmed_section: stringifyMulti(vals)})}
                  placeholder="Выберите разделы..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Корректирующие действия</label>
              <textarea 
                rows={3}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                value={appeal.corrective_actions || ""}
                onChange={(e) => setAppeal({...appeal, corrective_actions: e.target.value})}
              />
            </div>
          </section>

          {id !== "new" && complaintLogs.length > 0 && (
            <section className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
              <h2 className="text-xl font-black flex items-center gap-3">
                <History size={22} className="text-zinc-400" /> Лог обработки
              </h2>
              <div className="space-y-4">
                {complaintLogs.map((log: any) => (
                  <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{log.manager_name}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          {format(new Date(log.timestamp), "d MMM, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">
                        {log.action}. Изменены поля: <span className="font-medium text-black">{log.fields_filled.join(", ")}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold">Статус и Важность</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Текущий статус</label>
                <select 
                  className="w-full bg-zinc-900 text-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-0 cursor-pointer"
                  value={appeal.status || "Новый"}
                  onChange={(e) => setAppeal({...appeal, status: e.target.value})}
                >
                  <option>Новый</option>
                  <option>В работе</option>
                  <option>Выполнен</option>
                  <option>Отменен</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Важность жалобы</label>
                <div className="grid grid-cols-1 gap-2">
                  {['Критические', 'Значимые', 'Незначимые'].map((imp) => (
                    <button
                      key={imp}
                      onClick={() => setAppeal({ ...appeal, complaint_status: imp as any })}
                      className={cn(
                        "w-full py-3 rounded-xl text-sm font-bold border transition-all",
                        appeal.complaint_status === imp
                          ? "bg-black text-white border-black"
                          : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      {imp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History size={20} className="text-zinc-400" /> История изменений
              </h2>
              <button 
                onClick={() => setHistorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 hover:bg-zinc-50 rounded-lg transition-colors text-zinc-400"
                title={historySortOrder === 'asc' ? "Сначала новые" : "Сначала старые"}
              >
                {historySortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
              </button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">История пуста</p>
              ) : (
                auditLogs
                  .sort((a, b) => {
                    const dateA = new Date(a.timestamp).getTime();
                    const dateB = new Date(b.timestamp).getTime();
                    return historySortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                  })
                  .map((log) => (
                    <div key={log.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-zinc-900">{log.action}</p>
                        <p className="text-[10px] text-zinc-400">{format(new Date(log.timestamp), "d MMM, HH:mm", { locale: ru })}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium">Автор: {log.user_name || "Система"}</p>
                      {log.changes && <p className="text-[10px] text-zinc-400 italic">{log.changes}</p>}
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 relative">
              <Clock size={20} className="text-zinc-400" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Создано</p>
                {userRole === 'admin' ? (
                  <input 
                    type="datetime-local"
                    className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none"
                    value={appeal.created_at ? format(new Date(appeal.created_at), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setAppeal({...appeal, created_at: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-bold">{appeal.created_at ? format(new Date(appeal.created_at), "d MMM yyyy, HH:mm", { locale: ru }) : "Сейчас"}</p>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>

      <AnimatePresence>
        {saveStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold ${
              saveStatus === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            {saveStatus === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
            {saveStatus === "success" ? "Обращение сохранено" : "Не получилось сохранить"}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuickReplyOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickReplyOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Быстрый ответ</h3>
                  <p className="text-sm text-zinc-500">Выберите скрипт для вставки в текст обращения</p>
                </div>
                <button onClick={() => setIsQuickReplyOpen(false)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 border-b border-zinc-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Поиск по скриптам..."
                    value={scriptSearch}
                    onChange={(e) => setScriptSearch(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {standardAppeals
                  .filter(s => {
                    const title = s.title || "";
                    const content = s.content || "";
                    const search = scriptSearch.toLowerCase();
                    return title.toLowerCase().includes(search) || 
                           content.toLowerCase().includes(search);
                  })
                  .map(script => (
                    <button
                      key={script.id}
                      onClick={() => {
                        setAppeal({ ...appeal!, complaint_text: (appeal?.complaint_text ? appeal.complaint_text + '\n' : '') + script.content });
                        setIsQuickReplyOpen(false);
                      }}
                      className="w-full text-left p-5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{script.category}</span>
                        <ChevronRight size={14} className="text-zinc-300 group-hover:text-black transition-colors" />
                      </div>
                      <h4 className="font-bold text-black mb-1">{script.title}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{script.content}</p>
                    </button>
                  ))}
                {standardAppeals.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-zinc-400">Шаблоны не найдены</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-4">Удалить обращение?</h3>
              <p className="text-zinc-500 mb-8">Это действие необратимо. Все данные этого обращения будут удалены из системы и Google Таблицы.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-zinc-100 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                >
                  Да, удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
