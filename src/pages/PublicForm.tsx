import React, { useState } from "react";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Send, CheckCircle2, AlertCircle, Phone, User, MapPin, MessageSquare, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES } from "../constants";

export default function PublicForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    branch_name: BRANCH_NAMES[0],
    complaint_text: "",
    status: "Новый",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "appeals"), {
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const appealId = docRef.id;

      // Telegram notification logic
      const settingsSnap = await getDoc(doc(db, "settings", "telegram"));
      if (settingsSnap.exists() && settingsSnap.data().notifications_enabled) {
        const { telegram_token, telegram_chat_id } = settingsSnap.data();
        if (telegram_token && telegram_chat_id) {
          const message = `🌐 *Новое обращение с сайта*\n\n` +
                         `ID: #${appealId.slice(0, 8)}\n` +
                         `👤 Клиент: ${formData.client_name}\n` +
                         `📞 Телефон: ${formData.client_phone}\n` +
                         `📍 Филиал: ${formData.branch_name}\n` +
                         `📝 Текст: ${formData.complaint_text}\n\n` +
                         `🔗 [Открыть в CRM](${window.location.origin}/#/appeals/${appealId})`;
          
          fetch(`https://api.telegram.org/bot${telegram_token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              chat_id: telegram_chat_id, 
              text: message,
              parse_mode: "Markdown"
            })
          }).catch(console.error);
        }
      }

      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "appeals");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-black/5 text-center border border-zinc-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Спасибо!</h2>
          <p className="text-zinc-500 mb-10 leading-relaxed">Ваше обращение принято и уже передано в работу. Мы свяжемся с вами в ближайшее время.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
          >
            Отправить еще одно
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">Ш</span>
          </div>
          <h1 className="font-bold text-2xl tracking-tight">Шакарочка CRM</h1>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-zinc-100 overflow-hidden">
          <div className="bg-black p-8 text-white">
            <h2 className="text-2xl font-bold mb-2">Оставить обращение</h2>
            <p className="text-white/60 text-sm">Мы ценим ваше мнение и стремимся стать лучше.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={12} /> Ваше имя
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="Иван Иванов"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone size={12} /> Номер телефона
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="+998 90 123 45 67"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => formData.client_name && formData.client_phone && setStep(2)}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
                  >
                    Далее
                    <ChevronRight size={20} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={12} /> Филиал
                    </label>
                    <select
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none"
                    >
                      {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={12} /> Суть обращения
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.complaint_text}
                      onChange={(e) => setFormData({ ...formData, complaint_text: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all resize-none"
                      placeholder="Опишите вашу ситуацию подробно..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                    >
                      Назад
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? "Отправка..." : "Отправить"}
                      <Send size={20} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <p className="mt-8 text-center text-zinc-400 text-xs">
          Нажимая кнопку "Отправить", вы соглашаетесь на обработку персональных данных.
        </p>
      </div>
    </div>
  );
}
