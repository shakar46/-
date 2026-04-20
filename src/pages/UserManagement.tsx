import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  Mail, 
  Search,
  Plus,
  X,
  Check,
  AlertCircle,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { logEvent } from "../utils/logger";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  addDoc, 
  setDoc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs
} from "firebase/firestore";
import { useFirebase } from "../components/FirebaseProvider";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { sendTelegramMessage } from "../utils/telegram";
import { BRANCH_NAMES } from "../constants";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserData {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  role: 'head' | 'admin' | 'operator' | 'manager';
  login?: string;
  password?: string;
  responsibleBranch?: string;
  createdAt?: any;
  lastLogin?: string;
}

const UserManagement = () => {
  const { user: currentUser, userRole } = useFirebase();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    login: "",
    password: "",
    displayName: "",
    role: 'operator' as 'head' | 'admin' | 'operator' | 'manager',
    responsibleBranch: ""
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'head') return;

    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error("User fetch error:", err);
      setError("Ошибка при получении списка пользователей: " + err.message);
    });

    return () => unsubscribe();
  }, [userRole]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      login: "",
      password: "",
      displayName: "",
      role: 'operator',
      responsibleBranch: ""
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      email: user.email || "",
      login: user.login || "",
      password: user.password || "",
      displayName: user.displayName || "",
      role: user.role || 'operator',
      responsibleBranch: user.responsibleBranch || ""
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.login.trim() || !formData.password.trim() || !formData.displayName.trim()) {
      setError("Пожалуйста, заполните Логин, Пароль и Имя");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const userData: any = {
        email: formData.email.trim().toLowerCase(),
        login: formData.login.trim(),
        password: formData.password.trim(),
        displayName: formData.displayName.trim(),
        role: formData.role,
        responsibleBranch: formData.role === 'manager' ? formData.responsibleBranch : "",
        updatedAt: serverTimestamp()
      };

      if (!editingUser) {
        // Check if login already exists
        const q = query(collection(db, "users"), where("login", "==", formData.login.trim()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          throw new Error("Пользователь с таким логином уже существует");
        }

        userData.createdAt = serverTimestamp();
        const docId = formData.login.trim().toLowerCase().replace(/\s+/g, '_');
        await setDoc(doc(db, "users", docId), userData);
        
        await sendTelegramMessage(
          `🛡 <b>АУДИТ: Добавление пользователя</b>\n\n` +
          `👤 Кто: ${currentUser?.displayName || 'Admin'}\n` +
          `📧 Новый: ${formData.displayName} (${formData.login})\n` +
          `🛡 Роль: ${formData.role}`,
          'audit'
        );
      } else {
        await updateDoc(doc(db, "users", editingUser.id), userData);
        
        await sendTelegramMessage(
          `🛡 <b>АУДИТ: Изменение пользователя</b>\n\n` +
          `👤 Кто: ${currentUser?.displayName || 'Admin'}\n` +
          `📧 Изменен: ${formData.displayName} (${formData.login})\n` +
          `🛡 Новая роль: ${formData.role}`,
          'audit'
        );
      }

      setIsModalOpen(false);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || "Ошибка при сохранении пользователя");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === "shakar0406@gmail.com") {
      alert("Нельзя удалить главного администратора");
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить пользователя ${userEmail}?`)) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      
      // Send Audit notification
      await sendTelegramMessage(
        `🛡 <b>АУДИТ: Удаление пользователя</b>\n\n` +
        `👤 Кто удалил: ${currentUser?.displayName || 'Admin'} (${currentUser?.email})\n` +
        `📧 Удален: ${userEmail}`,
        'audit'
      );

      // Log action
      await logEvent({
        userId: currentUser?.uid || "system",
        userEmail: currentUser?.email || "",
        userName: currentUser?.displayName || "User",
        type: 'action',
        action: `Удален пользователь: ${userEmail}`,
        metadata: { targetUserId: userId, targetEmail: userEmail }
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Ошибка при удалении пользователя");
    }
  };

  const handleUpdateRole = async (userId: string, userEmail: string, currentRole: 'head' | 'admin' | 'operator' | 'manager') => {
    if (userRole !== 'head') {
      alert("Только Руководитель может менять роли сотрудников");
      return;
    }
    if (userEmail === "shakar0406@gmail.com") {
      alert("Нельзя изменить роль главного администратора");
      return;
    }

    const roles: ('head' | 'admin' | 'operator' | 'manager')[] = userRole === 'head' 
      ? ['operator', 'manager', 'admin', 'head']
      : ['operator', 'manager', 'admin'];
      
    const currentIndex = roles.indexOf(currentRole);
    const nextRole = roles[(currentIndex + 1) % roles.length];
    
    if (!confirm(`Изменить роль пользователя ${userEmail} на ${nextRole === 'head' ? 'Руководитель' : nextRole === 'admin' ? 'Админ' : nextRole === 'manager' ? 'Менеджер' : 'Оператор'}?`)) return;

    try {
      await updateDoc(doc(db, "users", userId), {
        role: nextRole,
        updatedAt: serverTimestamp()
      });

      // Send Audit notification
      await sendTelegramMessage(
        `🛡 <b>АУДИТ: Изменение роли</b>\n\n` +
        `👤 Кто изменил: ${currentUser?.displayName || 'Admin'} (${currentUser?.email})\n` +
        `📧 Пользователь: ${userEmail}\n` +
        `🛡 Новая роль: ${nextRole === 'head' ? 'Руководитель' : nextRole === 'admin' ? 'Администратор' : nextRole === 'manager' ? 'Менеджер' : 'Оператор'}`,
        'audit'
      );

      // Log action
      await logEvent({
        userId: currentUser?.uid || "system",
        userEmail: currentUser?.email || "",
        userName: currentUser?.displayName || "User",
        type: 'action',
        action: `Изменена роль пользователя ${userEmail} на ${nextRole}`,
        metadata: { targetUserId: userId, targetEmail: userEmail, newRole: nextRole }
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Ошибка при изменении роли");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const filteredUsers = users.filter(u => {
    const email = u.email || "";
    const displayName = u.displayName || "";
    const search = searchQuery.toLowerCase();
    const matchesSearch = email.toLowerCase().includes(search) || 
                         displayName.toLowerCase().includes(search);
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (userRole !== 'admin' && userRole !== 'head') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Доступ запрещен</h2>
        <p className="text-zinc-500">Только администраторы могут управлять пользователями.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Управление пользователями</h1>
          <p className="text-zinc-500">Добавляйте сотрудников и управляйте их доступом к платформе.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
        >
          <UserPlus size={20} />
          Добавить сотрудника
        </button>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <p className="text-zinc-500 text-sm font-medium mb-1">Всего пользователей</p>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
        <div className="md:col-span-2 bg-white p-4 rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text"
              placeholder="Поиск по email или имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="text-zinc-400" size={20} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-zinc-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-black transition-all cursor-pointer w-full md:w-auto"
            >
              <option value="All">Все роли</option>
              {userRole === 'head' && <option value="head">Руководители</option>}
              <option value="admin">Админы</option>
              <option value="manager">Менеджеры</option>
              <option value="operator">Операторы</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Сотрудник</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Логин</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Роль</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Филиал</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Последний вход</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-zinc-500">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold">
                          {(u.displayName?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{u.displayName}</p>
                          <p className="text-sm text-zinc-500">{u.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-mono text-zinc-600 bg-zinc-100 px-2 py-1 rounded inline-block">
                        {u.login || "—"}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                        u.role === 'head' ? "bg-indigo-600 text-white" :
                        u.role === 'admin' ? "bg-black text-white" : 
                        u.role === 'manager' ? "bg-zinc-800 text-white" :
                        "bg-zinc-100 text-zinc-600"
                      )}>
                        {u.role === 'head' ? <ShieldAlert size={12} /> : u.role === 'admin' ? <Shield size={12} /> : u.role === 'manager' ? <Check size={12} /> : <Users size={12} />}
                        {u.role === 'head' ? 'Руководитель' : u.role === 'admin' ? 'Админ' : u.role === 'manager' ? 'Менеджер' : 'Оператор'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm text-zinc-500 italic">
                        {u.responsibleBranch || (u.role === 'manager' ? 'Все филиалы' : '—')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-zinc-500">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString('ru-RU') : "—"}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(u)}
                          disabled={u.email === "shakar0406@gmail.com" && userRole !== 'head'}
                          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                          title="Редактировать"
                        >
                          <Plus size={18} className="rotate-45" />
                        </button>
                        {u.email !== "shakar0406@gmail.com" && (
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.email || u.login || u.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Удалить"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                    <UserPlus size={20} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {editingUser ? "Редактировать сотрудника" : "Новый сотрудник"}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Имя сотрудника</label>
                    <input 
                      type="text"
                      required
                      placeholder="Имя Фамилия"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Email (опционально)</label>
                    <input 
                      type="email"
                      placeholder="example@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Логин доступа</label>
                    <input 
                      type="text"
                      required
                      placeholder="login_name"
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Пароль</label>
                    <input 
                      type="text"
                      required
                      placeholder="password123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Роль</label>
                  <div className={cn("grid gap-3", userRole === 'head' ? "grid-cols-4" : "grid-cols-3")}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'operator' })}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                        formData.role === 'operator' ? "border-black bg-zinc-100 shadow-sm" : "border-zinc-100 bg-white hover:border-zinc-200"
                      )}
                    >
                      <Users size={20} className={formData.role === 'operator' ? "text-black" : "text-zinc-400"} />
                      <p className="font-bold text-[10px]">Оператор</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'manager' })}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                        formData.role === 'manager' ? "border-black bg-zinc-100 shadow-sm" : "border-zinc-100 bg-white hover:border-zinc-200"
                      )}
                    >
                      <Check size={20} className={formData.role === 'manager' ? "text-black" : "text-zinc-400"} />
                      <p className="font-bold text-[10px]">Менеджер</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'admin' })}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                        formData.role === 'admin' ? "border-black bg-zinc-100 shadow-sm" : "border-zinc-100 bg-white hover:border-zinc-200"
                      )}
                    >
                      <Shield size={20} className={formData.role === 'admin' ? "text-black" : "text-zinc-400"} />
                      <p className="font-bold text-[10px]">Админ</p>
                    </button>
                    {userRole === 'head' && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'head' })}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2",
                          formData.role === 'head' ? "border-indigo-600 bg-indigo-50" : "border-zinc-100 bg-white hover:border-zinc-200"
                        )}
                      >
                        <ShieldAlert size={20} className={formData.role === 'head' ? "text-indigo-600" : "text-zinc-400"} />
                        <p className="font-bold text-[10px]">Руководитель</p>
                      </button>
                    )}
                  </div>
                </div>

                {formData.role === 'manager' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-amber-50 rounded-3xl border border-amber-100"
                  >
                    <label className="block text-sm font-bold text-amber-900 mb-3">Ответственный филиал</label>
                    <select
                      value={formData.responsibleBranch}
                      onChange={(e) => setFormData({ ...formData, responsibleBranch: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    >
                      <option value="">Все филиалы</option>
                      {BRANCH_NAMES.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                    <p className="mt-3 text-xs text-amber-700/70">
                      Менеджер будет видеть отзывы только выбранного филиала.
                    </p>
                  </motion.div>
                )}

                {error && (
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-start gap-3 text-sm font-medium border border-rose-100">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white px-6 py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      "Сохранить"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {saveStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold ${
              saveStatus === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            {saveStatus === "success" ? <Check size={20} /> : <AlertCircle size={20} />}
            {saveStatus === "success" ? "Данные обновлены" : "Ошибка"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
