import React, { useState, useEffect } from "react";
import { User, Lock, Save, Shield, Key, AlertCircle, CheckCircle, Camera, History, Calendar, Smartphone, Globe, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../components/FirebaseProvider";
import { db } from "../firebase";
import { doc, updateDoc, getDocs, collection, query, where, deleteDoc, setDoc, orderBy, limit } from "firebase/firestore";
import { cn } from "../lib/utils";
import { logEvent } from "../utils/logger";

export const Profile = () => {
  const { userData, user, logout } = useFirebase();
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || "",
    nickname: userData?.nickname || "",
    login: userData?.login || "",
    password: userData?.password || "",
    phone: userData?.phone || "",
    profilePhoto: userData?.profilePhoto || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // History states
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userData?.uid) return;
      try {
        const q = query(
          collection(db, "audit_logs"),
          where("userId", "==", userData.uid),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setChangeHistory(logs.filter((log: any) => log.action?.includes('Обновление') || log.action?.includes('Изменен')));
        setActionHistory(logs.filter((log: any) => log.action?.includes('вход') || log.action?.includes('Создан')));
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [userData?.uid]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой (макс. 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }
    if (passwordForm.oldPassword !== userData?.password) {
      alert("Неверный старый пароль");
      return;
    }

    setIsSubmitting(true);
    try {
      const docId = userData?.login?.toLowerCase().replace(/\s+/g, '_');
      if (!docId) throw new Error("ID пользователя не найден");
      
      await updateDoc(doc(db, "users", docId), {
        password: passwordForm.newPassword,
        updatedAt: new Date().toISOString()
      });

      await logEvent({
        userId: user?.uid || userData?.id || "unknown",
        userEmail: "",
        userName: userData?.displayName || "User",
        login: userData?.login,
        type: 'change',
        action: 'Изменен пароль',
        metadata: { login: userData?.login }
      });

      alert("Пароль успешно изменен");
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nickname: formData.nickname.trim(),
          displayName: formData.displayName.trim(),
          photoUrl: formData.profilePhoto
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setSuccess(true);
      // Reload is handled by the auth state change in FirebaseProvider usually,
      // but we might need a manual refresh or just wait for the provider to sync.
    } catch (err: any) {
      setError(err.message || "Ошибка при обновлении");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
      <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-black rounded-[2rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden">
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={40} />
              )}
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={24} className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{userData?.displayName || 'Пользователь'}</h1>
            <p className="text-zinc-500 font-medium">@{userData?.nickname || userData?.login || 'username'}</p>
          </div>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-2xl">
           <button onClick={logout} className="px-6 py-2 rounded-xl text-sm font-bold text-rose-500 hover:bg-white transition-all">Выйти</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden"
          >
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-100">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Pencil size={20} className="text-zinc-400" />
                  Редактировать данные
                </h3>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Имя профиля</label>
                    <input 
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Никнейм</label>
                    <input 
                      type="text"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      placeholder="@nickname"
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Логин</label>
                    <input 
                      type="text"
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Телефон</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+998 (__) ___-__-__"
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white py-4 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Сохранить изменения"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="md:w-max px-8 bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock size={18} />
                    Сменить пароль
                  </button>
                </div>

                {success && (
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
                    <CheckCircle size={16} /> Данные успешно обновлены
                  </div>
                )}
              </form>
            </div>
          </motion.div>

          {/* History Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Action History */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
              <h4 className="text-lg font-black mb-6 flex items-center gap-2">
                <History size={20} className="text-zinc-400" />
                История действий
              </h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {historyLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-zinc-50 rounded-2xl animate-pulse" />)
                ) : actionHistory.length === 0 ? (
                  <p className="text-zinc-400 text-xs italic text-center py-10">Нет активностей</p>
                ) : (
                  actionHistory.map((log) => (
                    <div key={log.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          {log.timestamp?.toDate() ? log.timestamp.toDate().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Smartphone size={10} className="text-zinc-300" />
                          <Globe size={10} className="text-zinc-300" />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-zinc-800">{log.action}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Change History */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
              <h4 className="text-lg font-black mb-6 flex items-center gap-2">
                <Calendar size={20} className="text-zinc-400" />
                История изменений
              </h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {historyLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="h-16 bg-zinc-50 rounded-2xl animate-pulse" />)
                ) : changeHistory.length === 0 ? (
                  <p className="text-zinc-400 text-xs italic text-center py-10">Нет изменений</p>
                ) : (
                  changeHistory.map((log) => (
                    <div key={log.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          {log.timestamp?.toDate() ? log.timestamp.toDate().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-800">{log.action}</p>
                      {log.metadata?.login && <p className="text-[10px] text-zinc-400">Логин: {log.metadata.login}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-8">
           <div className="bg-zinc-900 text-white p-8 rounded-[2.5rem] shadow-xl">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Shield size={24} className="text-white" />
             </div>
             <h4 className="text-xl font-black mb-2">Статус аккаунта</h4>
             <p className="text-zinc-400 text-sm mb-6">Разрешения и доступы вашей учетной записи</p>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                   <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Роль</span>
                   <span className="text-xs font-black uppercase">{userData?.role === 'head' ? 'Руководитель' : userData?.role === 'admin' ? 'Админ' : 'Сотрудник'}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                   <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Филиал</span>
                   <span className="text-xs font-black uppercase">{userData?.responsibleBranch || 'Все'}</span>
                </div>
             </div>
           </div>

           <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem]">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center mb-4">
                <CheckCircle size={20} />
              </div>
              <h5 className="font-black text-lg text-emerald-900 mb-2">Совет по безопасности</h5>
              <p className="text-emerald-700/70 text-sm leading-relaxed">
                Рекомендуется менять пароль раз в 3 месяца и не использовать его для других сервисов.
              </p>
           </div>
        </div>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10"
            >
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <Lock className="text-zinc-400" />
                Смена пароля
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Старый пароль</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Новый пароль</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Подтвердите пароль</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-4 font-bold text-zinc-400 hover:bg-zinc-50 rounded-2xl transition-all">Отмена</button>
                  <button type="submit" className="flex-2 bg-black text-white py-4 px-8 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10">Обновить пароль</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
