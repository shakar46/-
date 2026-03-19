import React, { useState } from "react";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
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
  Camera,
  FileText,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES } from "../constants";

import imageCompression from "browser-image-compression";

export default function QuickAppeal() {
  const { user } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    branch_name: BRANCH_NAMES[0],
    order_check: "",
    complaint_text: "",
    complaint_photos: [] as string[],
    status: "Новый",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, client_phone: value });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            complaint_photos: [...prev.complaint_photos, reader.result as string]
          }));
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      complaint_photos: prev.complaint_photos.filter((_, i) => i !== index)
    }));
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
      
      // Send Main notification with photos if available
      const messageText = `🚀 <b>Новое быстрое обращение</b>\n\n` +
        `🆔 ID: #${appealId.slice(0, 8)}\n` +
        `👤 Клиент: ${formData.client_name}\n` +
        `📞 Телефон: ${formData.client_phone}\n` +
        `📍 Филиал: ${formData.branch_name}\n` +
        `📝 Текст: ${formData.complaint_text}\n\n` +
        `🔗 <a href="${window.location.origin}/#/appeals/${appealId}">Открыть в CRM</a>`;

      if (formData.complaint_photos && formData.complaint_photos.length > 0) {
        // Send first photo with caption
        await sendTelegramMessage(messageText, 'main', formData.complaint_photos[0]);
        // Send remaining photos
        for (let i = 1; i < formData.complaint_photos.length; i++) {
          await sendTelegramMessage(`Фото ${i + 1} к обращению #${appealId.slice(0, 8)}`, 'main', formData.complaint_photos[i]);
        }
      } else {
        await sendTelegramMessage(messageText);
      }

      // Send Audit notification
      await sendTelegramMessage(
        `🛡 <b>АУДИТ: Новое быстрое обращение</b>\n\n` +
        `👤 Кто: ${user?.displayName || "Система/Публичная форма"} (${user?.email || "N/A"})\n` +
        `📝 Действие: Создано быстрое обращение\n` +
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
        action: `Создано быстрое обращение #${appealId.slice(0, 8)}`,
        metadata: { appealId, clientName: formData.client_name }
      });

      setStatus("success");
      setFormData({
        client_name: "",
        client_phone: "",
        branch_name: BRANCH_NAMES[0],
        order_check: "",
        complaint_text: "",
        complaint_photos: [],
        status: "Новый",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      setStatus("error");
      handleFirestoreError(error, OperationType.CREATE, "appeals");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Новое обращение</h1>
        <p className="text-zinc-500 text-lg">Быстрое создание жалобы или предложения.</p>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <User size={12} /> Имя клиента
              </label>
              <input
                required
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                placeholder="Имя"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={12} /> Номер телефона (только цифры)
              </label>
              <input
                required
                type="tel"
                value={formData.client_phone}
                onChange={handlePhoneChange}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                placeholder="998901234567"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={12} /> Чек заказа
              </label>
              <input
                type="text"
                value={formData.order_check}
                onChange={(e) => setFormData({ ...formData, order_check: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                placeholder="Номер чека"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={12} /> Суть жалобы
            </label>
            <textarea
              required
              rows={4}
              value={formData.complaint_text}
              onChange={(e) => setFormData({ ...formData, complaint_text: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all resize-none"
              placeholder="Опишите проблему..."
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Camera size={12} /> Фотографии
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.complaint_photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-black hover:text-black transition-all cursor-pointer">
                <Camera size={24} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Добавить</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
          </div>

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
                  Сохранить обращение
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
                  {status === "success" ? "Обращение успешно сохранено!" : "Произошла ошибка при сохранении. Попробуйте еще раз."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
