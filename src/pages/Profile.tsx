import React, { useState } from "react";
import { User, Lock, Save, Shield, Key, AlertCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../components/FirebaseProvider";
import { db } from "../firebase";
import { doc, updateDoc, getDocs, collection, query, where, deleteDoc, setDoc } from "firebase/firestore";
import { cn } from "../lib/utils";

export const Profile = () => {
  const { userData, logout } = useFirebase();
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || "",
    login: userData?.login || "",
    password: userData?.password || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.login.trim() || !formData.password.trim() || !formData.displayName.trim()) {
      setError("Пожалуйста, заполните все поля");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const oldLogin = userData?.login;
      const newLogin = formData.login.trim();
      const needsIdChange = oldLogin !== newLogin;

      // Check if new login is taken if it's changing
      if (needsIdChange) {
        const q = query(collection(db, "users"), where("login", "==", newLogin));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          throw new Error("Этот логин уже занят");
        }
      }

      const updatedData = {
        ...userData,
        displayName: formData.displayName.trim(),
        login: newLogin,
        password: formData.password.trim(),
        updatedAt: new Date().toISOString()
      };

      if (needsIdChange) {
        // Since we use deterministic IDs based on login, we must move the document
        const newDocId = newLogin.toLowerCase().replace(/\s+/g, '_');
        const oldDocId = oldLogin.toLowerCase().replace(/\s+/g, '_');
        
        await setDoc(doc(db, "users", newDocId), updatedData);
        await deleteDoc(doc(db, "users", oldDocId));
        
        setSuccess(true);
        // Force re-login or session update might be needed, but logout is safer when ID/Login changes
        alert("Данные входа изменены. Войдите в систему повторно с новым логином.");
        logout();
      } else {
        const docId = oldLogin.toLowerCase().replace(/\s+/g, '_');
        await updateDoc(doc(db, "users", docId), updatedData);
        setSuccess(true);
      }

    } catch (err: any) {
      setError(err.message || "Ошибка при обновлении профиля");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white shadow-xl shadow-black/10">
          <User size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Ваш профиль</h1>
          <p className="text-zinc-500 font-medium">Управление личными данными входа</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden"
      >
        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex items-center gap-6 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
               <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl font-black text-zinc-400 border border-zinc-200 uppercase">
                 {userData?.displayName?.[0] || "U"}
               </div>
               <div className="flex-1">
                 <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Ваша роль</p>
                 <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                   <Shield size={12} />
                   {userData?.role === 'head' ? 'Руководитель' : userData?.role === 'admin' ? 'Админ' : userData?.role === 'manager' ? 'Менеджер' : 'Оператор'}
                 </div>
                 <p className="mt-2 text-[10px] text-zinc-400 font-bold">Вы не можете изменять свою роль самостоятельно</p>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-black text-zinc-700 mb-2 ml-1">Как вас зовут</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors">
                    <User size={20} />
                  </div>
                  <input 
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    placeholder="Ваше имя"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-zinc-700 mb-2 ml-1">Логин</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors">
                    <Key size={20} />
                  </div>
                  <input 
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    placeholder="Желаемый логин"
                  />
                </div>
                <p className="mt-2 text-[10px] text-zinc-400 font-bold ml-1 uppercase font-mono tracking-tighter italic">ID документа изменится при смене логина</p>
              </div>

              <div>
                <label className="block text-sm font-black text-zinc-700 mb-2 ml-1">Пароль</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-bold"
                    placeholder="Ваш пароль"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm font-bold"
                >
                  <AlertCircle size={20} className="shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600 text-sm font-bold"
                >
                  <CheckCircle size={20} className="shrink-0" />
                  <p>Данные успешно обновлены!</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white py-5 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Сохранить изменения
                  <Save size={22} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
