import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Search, Plus, FileText, Trash2, Edit, Save, X, ChevronLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";

export default function RepeatedCorrectiveActions() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);
  const [actionToDelete, setActionToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", category: "Стандартные" });

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "repeated_actions"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActions(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "repeated_actions");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) return;
    
    try {
      if (editingAction) {
        await updateDoc(doc(db, "repeated_actions", editingAction.id), formData);
      } else {
        await addDoc(collection(db, "repeated_actions"), formData);
      }
      
      setIsModalOpen(false);
      setEditingAction(null);
      setFormData({ title: "", description: "", category: "Стандартные" });
      fetchActions();
    } catch (error) {
      handleFirestoreError(error, editingAction ? OperationType.UPDATE : OperationType.CREATE, "repeated_actions");
    }
  };

  const handleDelete = async () => {
    if (!actionToDelete) return;
    try {
      await deleteDoc(doc(db, "repeated_actions", actionToDelete));
      setIsDeleteModalOpen(false);
      setActionToDelete(null);
      fetchActions();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `repeated_actions/${actionToDelete}`);
    }
  };

  const filteredActions = actions.filter(a => {
    const title = a.title || "";
    const description = a.description || "";
    const search = searchQuery.toLowerCase();
    
    return title.toLowerCase().includes(search) || 
           description.toLowerCase().includes(search);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <Link to="/scripts" className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Повторные корректирующие действия</h1>
          <p className="text-zinc-500">База типовых решений для устранения жалоб.</p>
        </div>
        <button
          onClick={() => {
            setEditingAction(null);
            setFormData({ title: "", description: "", category: "Стандартные" });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Добавить действие
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input
          type="text"
          placeholder="Поиск по названию или описанию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-lg focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredActions.map((action) => (
            <motion.div
              key={action.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingAction(action);
                      setFormData({ title: action.title, description: action.description, category: action.category });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition-all"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setActionToDelete(action.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{action.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {action.description}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredActions.length === 0 && searchQuery && (
        <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
          <p className="text-zinc-400 font-medium">Ничего не найдено</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingAction ? "Редактировать действие" : "Новое действие"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Название</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  placeholder="Напр. Замена блюда"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Описание действия</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
                  placeholder="Опишите корректирующее действие..."
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
              <h3 className="text-2xl font-bold mb-2 tracking-tight">Удалить действие?</h3>
              <p className="text-zinc-500 mb-8">Это действие необратимо. Данные будут удалены из базы данных навсегда.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setActionToDelete(null);
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
    </div>
  );
}
