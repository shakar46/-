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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserData {
  id: string;
  uid?: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator';
  createdAt?: any;
  lastLogin?: string;
}

const UserManagement = () => {
  const { user: currentUser, userRole } = useFirebase();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<'admin' | 'operator'>('operator');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== 'admin') return;

    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if user already exists
      const q = query(collection(db, "users"), where("email", "==", newEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError("Пользователь с такой почтой уже добавлен");
        setIsSubmitting(false);
        return;
      }

      // Add user to Firestore
      // We use a random ID because we don't have the UID yet
      const docRef = await addDoc(collection(db, "users"), {
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        displayName: "Новый сотрудник",
        createdAt: serverTimestamp(),
      });

      // Log action
      await logEvent({
        userId: currentUser?.uid || "system",
        userEmail: currentUser?.email || "",
        userName: currentUser?.displayName || "User",
        type: 'action',
        action: `Добавлен новый пользователь: ${newEmail.trim().toLowerCase()} (${newRole})`,
        metadata: { targetEmail: newEmail.trim().toLowerCase(), role: newRole, docId: docRef.id }
      });

      setIsAddModalOpen(false);
      setNewEmail("");
    } catch (err) {
      console.error("Error adding user:", err);
      setError("Ошибка при добавлении пользователя");
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

  const handleUpdateRole = async (userId: string, userEmail: string, currentRole: string) => {
    if (userEmail === "shakar0406@gmail.com") {
      alert("Нельзя изменить роль главного администратора");
      return;
    }

    const newRole = currentRole === 'admin' ? 'operator' : 'admin';
    if (!confirm(`Изменить роль пользователя ${userEmail} на ${newRole === 'admin' ? 'Админ' : 'Оператор'}?`)) return;

    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });

      // Log action
      await logEvent({
        userId: currentUser?.uid || "system",
        userEmail: currentUser?.email || "",
        userName: currentUser?.displayName || "User",
        type: 'action',
        action: `Изменена роль пользователя ${userEmail} на ${newRole}`,
        metadata: { targetUserId: userId, targetEmail: userEmail, newRole }
      });
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Ошибка при изменении роли");
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

  if (userRole !== 'admin') {
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
          onClick={() => setIsAddModalOpen(true)}
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
              <option value="admin">Админы</option>
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
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Роль</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Статус</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Последний вход</th>
                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-zinc-500">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold">
                          {(u.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{u.displayName}</p>
                          <p className="text-sm text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <button
                        onClick={() => handleUpdateRole(u.id, u.email, u.role)}
                        disabled={u.email === "shakar0406@gmail.com"}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                          u.role === 'admin' ? "bg-black text-white" : "bg-zinc-100 text-zinc-600",
                          u.email !== "shakar0406@gmail.com" && "hover:scale-105"
                        )}
                      >
                        {u.role === 'admin' ? <Shield size={12} /> : <Users size={12} />}
                        {u.role === 'admin' ? 'Админ' : 'Оператор'}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          u.uid ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-zinc-300"
                        )} />
                        <span className="text-sm font-medium">
                          {u.uid ? "Активен" : "Ожидает входа"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-zinc-500">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString('ru-RU') : "—"}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {u.email !== "shakar0406@gmail.com" && (
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Удалить"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                    <UserPlus size={20} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Новый сотрудник</h2>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Email (Google Account)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="email"
                      required
                      placeholder="example@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border-zinc-200 rounded-xl focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2 px-1">Роль</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewRole('operator')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2",
                        newRole === 'operator' ? "border-black bg-zinc-50" : "border-zinc-100 bg-white hover:border-zinc-200"
                      )}
                    >
                      <Users size={24} className={newRole === 'operator' ? "text-black" : "text-zinc-400"} />
                      <p className="font-bold text-xs">Оператор</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRole('admin')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2",
                        newRole === 'admin' ? "border-black bg-zinc-50" : "border-zinc-100 bg-white hover:border-zinc-200"
                      )}
                    >
                      <Shield size={24} className={newRole === 'admin' ? "text-black" : "text-zinc-400"} />
                      <p className="font-bold text-xs">Админ</p>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-start gap-3 text-sm font-medium">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSubmitting ? "Добавление..." : "Добавить"}
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

export default UserManagement;
