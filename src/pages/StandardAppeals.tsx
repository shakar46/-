import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Search, Plus, FileText, Trash2, Edit, Save, X, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function StandardAppeals() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAppeal, setEditingAppeal] = useState<any>(null);
  const [appealToDelete, setAppealToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "", category: "Общее" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAppeals = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "standard_appeals"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppeals(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "standard_appeals");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) return;
    
    try {
      if (editingAppeal) {
        await updateDoc(doc(db, "standard_appeals", editingAppeal.id), formData);
      } else {
        await addDoc(collection(db, "standard_appeals"), formData);
      }
      
      setIsModalOpen(false);
      setEditingAppeal(null);
      setFormData({ title: "", content: "", category: "Общее" });
      fetchAppeals();
      showToast("Сохранено", "success");
    } catch (error) {
      handleFirestoreError(error, editingAppeal ? OperationType.UPDATE : OperationType.CREATE, "standard_appeals");
      showToast("Не удалось сохранить", "error");
    }
  };

  const handleDelete = async () => {
    if (!appealToDelete) return;
    try {
      await deleteDoc(doc(db, "standard_appeals", appealToDelete));
      setIsDeleteModalOpen(false);
      setAppealToDelete(null);
      fetchAppeals();
      showToast("Удалено", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `standard_appeals/${appealToDelete}`);
      showToast("Не удалось удалить", "error");
    }
  };

  const filteredAppeals = appeals.filter(s => {
    const title = s.title || "";
    const content = s.content || "";
    const category = s.category || "";
    const search = searchQuery.toLowerCase();
    
    return title.toLowerCase().includes(search) || 
           content.toLowerCase().includes(search) ||
           category.toLowerCase().includes(search);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Стандартные обращения</h1>
          <p className="text-zinc-500">Шаблоны ответов для быстрого реагирования на обращения.</p>
        </div>
        <button
          onClick={() => {
            setEditingAppeal(null);
            setFormData({ title: "", content: "", category: "Общее" });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Добавить шаблон
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input
          type="text"
          placeholder="Поиск по названию, содержанию или категории..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-lg focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAppeals.map((appeal) => (
            <motion.div
              key={appeal.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-black transition-colors">
                  <FileText size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingAppeal(appeal);
                      setFormData({ title: appeal.title, content: appeal.content, category: appeal.category });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition-all"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setAppealToDelete(appeal.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <span className="inline-block px-2 py-1 rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                {appeal.category}
              </span>
              <h3 className="text-lg font-bold mb-2 line-clamp-1">{appeal.title}</h3>
              <p className="text-sm text-zinc-500 line-clamp-3 leading-relaxed mb-4">
                {appeal.content}
              </p>
              <button 
                onClick={() => {
                  setEditingAppeal(appeal);
                  setFormData({ title: appeal.title, content: appeal.content, category: appeal.category });
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-black transition-colors pt-4 border-t border-zinc-50"
              >
                Читать полностью
                <ChevronRight size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingAppeal ? "Редактировать шаблон" : "Новый шаблон"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Название</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="Напр. Приветствие"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Категория</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  >
                    <option>Общее</option>
                    <option>Жалобы</option>
                    <option>Благодарности</option>
                    <option>Инструкции</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Текст шаблона</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
                  placeholder="Введите текст шаблона здесь..."
                />
              </div>
            </div>
            <div className="p-8 bg-zinc-50 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Сохранить
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight">Удалить шаблон?</h3>
              <p className="text-zinc-500 mb-8">Это действие необратимо. Шаблон будет удален навсегда.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setAppealToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-xl font-bold border border-zinc-200 hover:bg-zinc-50 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
              toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
