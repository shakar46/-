import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../components/FirebaseProvider';
import { LogIn, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export const Login = () => {
  const { login } = useFirebase();
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName || !password) {
      setError("Пожалуйста, введите логин и пароль");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(loginName, password);
    } catch (err: any) {
      setError(err.message || "Ошибка входа. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 selection:bg-black selection:text-white">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-zinc-200/50 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-zinc-200/50 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black/20"
          >
            <ShieldCheck size={40} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">CRM</h1>
          <p className="text-zinc-500 font-medium">CRM Система — Управление жалобами</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 p-10 border border-zinc-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2 ml-1">Логин</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text"
                  autoFocus
                  placeholder="Введите ваш логин"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2 ml-1">Пароль</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-600 text-sm font-bold"
                >
                  <AlertCircle size={20} className="shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-5 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Войти в систему
                  <LogIn size={22} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-zinc-400 text-sm font-bold">
          &copy; 2026 CRM. Все права защищены.
        </p>
      </motion.div>
    </div>
  );
};
