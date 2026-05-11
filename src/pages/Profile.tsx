import React, { useState, useEffect } from "react";
import { User, Lock, Save, Shield, Key, AlertCircle, CheckCircle, Camera, History, Calendar, Smartphone, Globe, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../components/FirebaseProvider";
import { db, auth } from "../firebase";
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
  const [dateFilter, setDateFilter] = useState({
    from: "",
    to: ""
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const fetchHistory = async () => {
    if (!userData?.uid) return;
    setHistoryLoading(true);
    try {
      let q = query(
        collection(db, "audit_logs"),
        where("userId", "==", userData.uid),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      const snapshot = await getDocs(q);
      let logs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date()
      }));
      
      // Apply manual filter for dates
      if (dateFilter.from) {
        const fromDate = new Date(dateFilter.from);
        logs = logs.filter(l => l.createdAt >= fromDate);
      }
      if (dateFilter.to) {
        const toDate = new Date(dateFilter.to);
        toDate.setHours(23, 59, 59, 999);
        logs = logs.filter(l => l.createdAt <= toDate);
      }

      setChangeHistory(logs.filter((log: any) => 
        log.action?.includes('Обновление') || 
        log.action?.includes('Изменен') || 
        log.entityType === 'User'
      ));
      
      setActionHistory(logs.filter((log: any) => 
        log.action?.includes('вход') || 
        log.action?.includes('Создан') || 
        log.action?.includes('Смена пароля') ||
        log.entityType === 'Auth'
      ));
    } catch (err) {
      console.error("Fetch history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userData?.uid, dateFilter]);

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
    setError(null);

    if (passwordForm.newPassword.length < 6) {
      setError("Минимальная длина пароля - 6 символов");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/profile/changePassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Не удалось сменить пароль");

      alert("Пароль успешно изменен. Пожалуйста, войдите в систему с новым паролем.");
      logout();
    } catch (err: any) {
       setError(err.message || "Ошибка при смене пароля");
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
    } catch (err: any) {
      setError(err.message || "Ошибка при обновлении");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
      <div className="flex flex-col md:flex-row items-center gap-8 justify-between bg-white p-10 rounded-[3rem] premium-shadow border border-slate-50 mb-12">
        <div className="flex items-center gap-8">
          <div className="relative group">
            <div className="w-28 h-28 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={48} strokeWidth={1.5} />
              )}
              <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                <Camera size={26} className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-success text-white w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
              <CheckCircle size={18} />
            </div>
          </div>
          <div>
            <span className="text-accent font-bold text-[10px] uppercase tracking-[0.25em] mb-2 block">Профиль подтвержден</span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-none mb-2">{userData?.displayName || 'Пользователь'}</h1>
            <p className="text-slate-400 font-medium text-lg leading-none">@{userData?.nickname || userData?.login || 'username'}</p>
          </div>
        </div>
        <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
           <button onClick={logout} className="px-8 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-white hover:shadow-sm transition-all active:scale-95">Выйти из системы</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] border border-slate-100 premium-shadow overflow-hidden"
          >
            <div className="p-10 lg:p-12">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                <h3 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <Pencil size={24} className="text-slate-200" />
                  Личные данные
                </h3>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ФИО Пользователя</label>
                    <input 
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Публичный Никнейм</label>
                    <input 
                      type="text"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                      placeholder="@nickname"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ID Входа (Логин)</label>
                    <input 
                      type="text"
                      disabled
                      value={formData.login}
                      className="w-full px-6 py-4 bg-slate-100 border border-slate-100 rounded-2xl outline-none font-bold text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Контактный Номер</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+998 (__) ___-__-__"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Сохранить изменения"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="md:w-max px-10 bg-slate-50 text-slate-900 py-5 rounded-[2rem] font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95 border border-slate-100"
                  >
                    <Lock size={18} />
                    Сменить пароль
                  </button>
                </div>

                {success && (
                  <div className="p-5 bg-success/10 text-success rounded-[1.5rem] text-sm font-bold flex items-center gap-3 border border-success/10">
                    <CheckCircle size={20} /> Профиль успешно обновлен в системе
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
                          {log.createdAt ? log.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
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
                          {log.createdAt ? log.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
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
           <div className="bg-[#AAF0D1] text-zinc-900 p-8 rounded-[2.5rem] shadow-xl">
             <div className="w-12 h-12 bg-white/40 rounded-2xl flex items-center justify-center mb-6">
                <Shield size={24} className="text-zinc-900" />
             </div>
             <h4 className="text-xl font-black mb-2">Статус аккаунта</h4>
             <p className="text-zinc-700 text-sm mb-6">Разрешения и доступы вашей учетной записи</p>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/30 rounded-2xl">
                   <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Роль</span>
                   <span className="text-xs font-black uppercase">{userData?.role === 'head' ? 'Руководитель' : userData?.role === 'admin' ? 'Админ' : 'Сотрудник'}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/30 rounded-2xl">
                   <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Филиал</span>
                   <span className="text-xs font-black uppercase tracking-tight">{userData?.responsibleBranch || 'Все'}</span>
                </div>
             </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
              <h5 className="font-black text-lg mb-6 flex items-center gap-2">
                <Calendar size={20} className="text-zinc-400" />
                Фильтр по дате
              </h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">От</label>
                  <input 
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">До</label>
                  <input 
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-sm"
                  />
                </div>
                <button 
                  onClick={() => setDateFilter({ from: "", to: "" })}
                  className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  Сбросить фильтры
                </button>
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
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                <Lock className="text-zinc-400" />
                Смена пароля
              </h3>
              {error && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-2 border border-rose-100 italic">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Старый пароль</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.old ? "text" : "password"}
                      required
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                    >
                      {showPasswords.old ? <Globe size={18} /> : <Key size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Новый пароль</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.new ? "text" : "password"}
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                    >
                      {showPasswords.new ? <Globe size={18} /> : <Key size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Подтвердите пароль</label>
                  <div className="relative">
                    <input 
                      type={showPasswords.confirm ? "text" : "password"}
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                    >
                      {showPasswords.confirm ? <Globe size={18} /> : <Key size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-4 font-bold text-zinc-400 hover:bg-zinc-50 rounded-2xl transition-all font-sans">Отмена</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-2 bg-black text-white py-4 px-8 rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center justify-center font-sans tracking-tight"
                  >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Обновить пароль"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
