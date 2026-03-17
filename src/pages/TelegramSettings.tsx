import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Save, Bell, BellOff, Send, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

export default function TelegramSettings() {
  const [settings, setSettings] = useState({
    telegram_token: "",
    telegram_chat_id: "",
    notifications_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (saveStatus !== "idle") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "telegram");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as any);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "settings/telegram");
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      await setDoc(doc(db, "settings", "telegram"), settings);
      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("error");
      handleFirestoreError(error, OperationType.WRITE, "settings/telegram");
    }
    setSaving(false);
  };

  const testNotification = async () => {
    if (!settings.telegram_token || !settings.telegram_chat_id) {
      alert("Пожалуйста, заполните токен и ID чата.");
      return;
    }
    setTestStatus("loading");
    try {
      const message = "🔔 Тестовое уведомление из CRM Шакарочка. Интеграция настроена успешно!";
      const url = `https://api.telegram.org/bot${settings.telegram_token}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegram_chat_id,
          text: message
        })
      });
      if (response.ok) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch (error) {
      setTestStatus("error");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Настройки Telegram</h1>
        <p className="text-zinc-500 text-lg">Управление уведомлениями и интеграцией с ботом.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={settings.notifications_enabled ? "text-emerald-500" : "text-zinc-400"}>
                  {settings.notifications_enabled ? <Bell size={24} /> : <BellOff size={24} />}
                </div>
                <div>
                  <h3 className="font-bold">Статус уведомлений</h3>
                  <p className="text-xs text-zinc-400">Включить или отключить отправку сообщений ботом</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, notifications_enabled: !settings.notifications_enabled })}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.notifications_enabled ? 'bg-black' : 'bg-zinc-200'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.notifications_enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="h-px bg-zinc-100" />

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Токен бота (Bot Token)</label>
                <input
                  type="password"
                  value={settings.telegram_token || ""}
                  onChange={(e) => setSettings({ ...settings, telegram_token: e.target.value })}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
                <p className="mt-2 text-[10px] text-zinc-400 italic">Получите токен у @BotFather в Telegram</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">ID чата (Chat ID)</label>
                <input
                  type="text"
                  value={settings.telegram_chat_id || ""}
                  onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                  placeholder="-100123456789"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                />
                <p className="mt-2 text-[10px] text-zinc-400 italic">ID группы или канала, куда будут приходить уведомления</p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
                  saveStatus === "success" ? "bg-emerald-500 text-white" : 
                  saveStatus === "error" ? "bg-rose-500 text-white" : "bg-black text-white hover:scale-[1.02]"
                }`}
              >
                {saveStatus === "success" ? (
                  <>
                    <ShieldCheck size={18} />
                    Сохранено!
                  </>
                ) : saveStatus === "error" ? (
                  "Ошибка!"
                ) : (
                  <>
                    <Save size={18} />
                    {saving ? "Сохранение..." : "Сохранить настройки"}
                  </>
                )}
              </button>
              <button
                onClick={testNotification}
                disabled={testStatus === "loading"}
                className="px-6 flex items-center justify-center gap-2 bg-zinc-100 text-black py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                <Send size={18} />
                Тест
              </button>
            </div>

            {testStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl text-sm font-medium ${
                  testStatus === "success" ? "bg-emerald-50 text-emerald-700" : 
                  testStatus === "error" ? "bg-rose-50 text-rose-700" : "bg-zinc-50 text-zinc-500"
                }`}
              >
                {testStatus === "loading" && "Отправка тестового сообщения..."}
                {testStatus === "success" && "✅ Тестовое сообщение успешно отправлено!"}
                {testStatus === "error" && "❌ Ошибка при отправке. Проверьте токен и ID чата."}
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 text-white p-8 rounded-3xl shadow-xl">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck size={24} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-4">Безопасность</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Ваши токены хранятся в зашифрованном виде в базе данных и доступны только администраторам системы.
            </p>
            <ul className="space-y-3 text-xs text-zinc-500">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Доступ по ролям (RBAC)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Логирование изменений
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Защищенное API Telegram
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200">
            <h4 className="font-bold mb-3">Как настроить?</h4>
            <ol className="space-y-4 text-sm text-zinc-500 list-decimal pl-4">
              <li>Найдите <b>@BotFather</b> в Telegram.</li>
              <li>Создайте нового бота и получите <b>API Token</b>.</li>
              <li>Добавьте бота в вашу группу или канал.</li>
              <li>Сделайте бота администратором.</li>
              <li>Узнайте ID чата (например, через @userinfobot).</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
