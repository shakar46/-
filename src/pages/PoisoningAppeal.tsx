import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { sendTelegramMessage } from "../utils/telegram";
import { logEvent } from "../utils/logger";
import { useFirebase } from "../components/FirebaseProvider";
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  User, 
  MapPin, 
  MessageSquare, 
  AlertTriangle,
  Clock,
  Utensils,
  Activity,
  Calendar,
  ChevronLeft,
  FileText,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES } from "../constants";
import { Link, useNavigate } from "react-router-dom";

export default function PoisoningAppeal() {
  const { user } = useFirebase();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    branch_name: BRANCH_NAMES[0],
    symptoms: "",
    duration: "",
    people_consumed: 1,
    people_symptoms: 1,
    stomach_state: "Голодный" as "Голодный" | "Сытый",
    time_after_consumption: "",
    suspected_ingredients: "",
    previous_cases: "",
    medical_report: false,
    is_aggressive: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "Новый",
    complaint_status: "Критические" as any,
    complaint_classification: "Отравление",
    classification_section: "Пищевая безопасность"
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, client_phone: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    try {
      const docRef = await addDoc(collection(db, "appeals"), {
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      const appealId = docRef.id;
      
      // Send Telegram notification
      const messageText = `🚨 <b>ОБРАЩЕНИЕ ПО ОТРАВЛЕНИЮ</b> 🚨\n\n` +
        `🆔 ID: #${appealId.slice(0, 8)}\n` +
        `👤 Клиент: ${formData.client_name}\n` +
        `📞 Телефон: ${formData.client_phone}\n` +
        `📍 Филиал: ${formData.branch_name}\n\n` +
        `🤢 Симптомы: ${formData.symptoms}\n` +
        `⏳ Длительность: ${formData.duration}\n` +
        `👥 Ели/Заболели: ${formData.people_consumed}/${formData.people_symptoms}\n` +
        `🥣 Состояние желудка: ${formData.stomach_state}\n` +
        `🕒 Время после еды: ${formData.time_after_consumption}\n` +
        `🧪 Подозрительные ингредиенты: ${formData.suspected_ingredients}\n` +
        `🔄 Ранее были случаи: ${formData.previous_cases}\n` +
        `🏥 Мед. справка: ${formData.medical_report ? "Есть" : "Нет"}\n` +
        `🤬 Агрессивное состояние: ${formData.is_aggressive ? "Да" : "Нет"}\n\n` +
        `🔗 <a href="${window.location.origin}/#/appeals/${appealId}">Открыть в CRM</a>`;

      await sendTelegramMessage(messageText, 'main');

      // Send Audit notification
      await sendTelegramMessage(
        `🛡 <b>АУДИТ: Обращение по отравлению</b>\n\n` +
        `👤 Кто: ${user?.displayName || "Система"} (${user?.email || "N/A"})\n` +
        `🆔 ID: #${appealId.slice(0, 8)}\n` +
        `👤 Клиент: ${formData.client_name}`,
        'audit'
      );

      // Log action
      await logEvent({
        userId: user?.uid || "system",
        userEmail: user?.email || "N/A",
        userName: user?.displayName || "System",
        type: 'action',
        action: `Создано обращение по отравлению #${appealId.slice(0, 8)}`,
        metadata: { appealId, clientName: formData.client_name }
      });

      setStatus("success");
      setTimeout(() => navigate("/appeals"), 2000);
    } catch (error) {
      setStatus("error");
      handleFirestoreError(error, OperationType.CREATE, "appeals");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Link to="/appeals/new" className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Обращение по отравлению</h1>
          <p className="text-zinc-500 text-lg">Сбор детальной информации по инциденту.</p>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          {/* Client Info Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
              <User className="text-zinc-400" size={20} />
              <h2 className="text-lg font-bold">Информация о клиенте</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Имя</label>
                <input
                  required
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                  placeholder="Имя"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Телефон</label>
                <input
                  required
                  type="tel"
                  value={formData.client_phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                  placeholder="998901234567"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Филиал</label>
                <select
                  value={formData.branch_name}
                  onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                >
                  {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Symptoms Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
              <AlertTriangle className="text-rose-500" size={20} />
              <h2 className="text-lg font-bold">Симптомы и состояние</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Симптомы</label>
                <textarea
                  required
                  rows={3}
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all resize-none"
                  placeholder="Тошнота, рвота, диарея..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Период длительности</label>
                <textarea
                  required
                  rows={3}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all resize-none"
                  placeholder="Как долго длятся симптомы?"
                />
              </div>
            </div>
          </section>

          {/* Consumption Details Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
              <Utensils className="text-zinc-400" size={20} />
              <h2 className="text-lg font-bold">Детали употребления</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Сколько чел. ели</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.people_consumed}
                    onChange={(e) => setFormData({ ...formData, people_consumed: parseInt(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Сколько заболели</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.people_symptoms}
                    onChange={(e) => setFormData({ ...formData, people_symptoms: parseInt(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Состояние желудка</label>
                <div className="flex gap-4">
                  {(['Голодный', 'Сытый'] as const).map(state => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => setFormData({ ...formData, stomach_state: state })}
                      className={cn(
                        "flex-1 py-3 rounded-2xl font-bold text-sm transition-all border",
                        formData.stomach_state === state 
                          ? "bg-black text-white border-black" 
                          : "bg-zinc-50 text-zinc-500 border-zinc-100 hover:bg-zinc-100"
                      )}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Через сколько проявилось</label>
                <input
                  type="text"
                  value={formData.time_after_consumption}
                  onChange={(e) => setFormData({ ...formData, time_after_consumption: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                  placeholder="Например: 2 часа"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Подозрительные ингредиенты</label>
                <input
                  type="text"
                  value={formData.suspected_ingredients}
                  onChange={(e) => setFormData({ ...formData, suspected_ingredients: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all"
                  placeholder="Что именно вызвало подозрение?"
                />
              </div>
            </div>
          </section>

          {/* Additional Info Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
              <ShieldAlert className="text-zinc-400" size={20} />
              <h2 className="text-lg font-bold">Дополнительная информация</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Были ли ранее подобные случаи?</label>
                <textarea
                  rows={2}
                  value={formData.previous_cases}
                  onChange={(e) => setFormData({ ...formData, previous_cases: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 outline-none focus:border-black transition-all resize-none"
                  placeholder="Опишите, если были..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <label className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 cursor-pointer hover:bg-zinc-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.medical_report}
                    onChange={(e) => setFormData({ ...formData, medical_report: e.target.checked })}
                    className="w-5 h-5 rounded border-zinc-300 text-black focus:ring-black"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Медицинская справка</span>
                    <span className="text-[10px] text-zinc-400 uppercase">Имеется ли подтверждение от врача?</span>
                  </div>
                </label>
                <label className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.is_aggressive}
                    onChange={(e) => setFormData({ ...formData, is_aggressive: e.target.checked })}
                    className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-rose-700">Агрессивное состояние</span>
                    <span className="text-[10px] text-rose-400 uppercase">Клиент настроен враждебно?</span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-5 rounded-2xl font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={20} />
                  Отправить обращение
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {status !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-6 rounded-2xl flex items-center gap-4 ${
                  status === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}
              >
                {status === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                <p className="font-bold">
                  {status === "success" ? "Обращение успешно сохранено! Перенаправление..." : "Произошла ошибка при сохранении. Попробуйте еще раз."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
