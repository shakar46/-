import React, { useState } from "react";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { sendTelegramMessage } from "../utils/telegram";
import { logEvent } from "../utils/logger";
import { useFirebase } from "../components/FirebaseProvider";
import { Link } from "react-router-dom";
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
  X,
  AlertTriangle,
  Flag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BRANCH_NAMES, COMPLAINT_STATUSES } from "../constants";

import imageCompression from "browser-image-compression";

export default function QuickRequest() {
  const { user, token } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    branch_name: BRANCH_NAMES[0],
    complaint_text: "",
    complaint_photos: [] as string[],
    complaint_status: "Незначимые" as any,
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
      const response = await fetch("/api/requests/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          clientName: formData.client_name,
          clientPhone: formData.client_phone,
          clientPhoto: formData.complaint_photos.length > 0 ? formData.complaint_photos[0] : null,
          message: formData.complaint_text,
          classification: formData.complaint_status,
          branchId: formData.branch_name
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setStatus("success");
      setFormData({
        client_name: "",
        client_phone: "",
        branch_name: BRANCH_NAMES[0],
        complaint_text: "",
        complaint_photos: [],
        complaint_status: "Незначимые",
      });
    } catch (error: any) {
      console.error("Error creating request:", error);
      setStatus("error");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Новое обращение</h1>
          <p className="text-zinc-500 text-lg">Быстрое создание жалобы или предложения.</p>
        </div>
        <Link 
          to="/poisoning-request"
          className="flex items-center gap-2 bg-rose-50 text-rose-600 px-5 py-3 rounded-2xl font-bold hover:bg-rose-100 transition-all text-sm"
        >
          <AlertTriangle size={18} />
          Обращение по отравлению
        </Link>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Flag size={12} /> Статус жалобы
              </label>
              <select
                value={formData.complaint_status}
                onChange={(e) => setFormData({ ...formData, complaint_status: e.target.value as any })}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-lg outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all appearance-none"
              >
                {COMPLAINT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

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
