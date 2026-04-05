import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Search, Plus, FileText, Trash2, Edit, Save, X, ChevronRight, Repeat } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function Scripts() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "", category: "Скрипты гостей" });

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "scripts"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScripts(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "scripts");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) return;
    
    try {
      if (editingScript) {
        await updateDoc(doc(db, "scripts", editingScript.id), formData);
      } else {
        await addDoc(collection(db, "scripts"), formData);
      }
      
      setIsModalOpen(false);
      setEditingScript(null);
      setFormData({ title: "", content: "", category: "Скрипты гостей" });
      fetchScripts();
    } catch (error) {
      handleFirestoreError(error, editingScript ? OperationType.UPDATE : OperationType.CREATE, "scripts");
    }
  };

  const handleDelete = async () => {
    if (!scriptToDelete) return;
    try {
      await deleteDoc(doc(db, "scripts", scriptToDelete));
      setIsDeleteModalOpen(false);
      setScriptToDelete(null);
      fetchScripts();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `scripts/${scriptToDelete}`);
    }
  };

  const CATEGORIES = [
    "Скрипты гостей",
    "Скрипты входящих запросов",
    "Скрипты стандартных обращений",
    "Повторные корневые причины"
  ];

  const filteredScripts = scripts.filter(s => {
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
          <h1 className="text-4xl font-bold tracking-tight mb-2">Скрипты</h1>
          <p className="text-zinc-500">База знаний и готовые сценарии ответов для операторов.</p>
        </div>
        <button
          onClick={() => {
            setEditingScript(null);
            setFormData({ title: "", content: "", category: "Скрипты гостей" });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Добавить скрипт
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input
          type="text"
          placeholder="Поиск по названию или содержанию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-lg focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
        />
      </div>

      <div className="space-y-12">
        <section className="bg-zinc-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
            <Repeat size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Повторные корректирующие действия</h2>
            <p className="text-zinc-400 max-w-xl">
              База данных типовых решений для часто возникающих проблем. Используйте проверенные методы для быстрого устранения жалоб.
            </p>
            <Link 
              to="/scripts/repeated-actions"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all"
            >
              Открыть базу действий
              <ChevronRight size={18} />
            </Link>
          </div>
        </section>

        {CATEGORIES.map(category => {
          const categoryScripts = filteredScripts.filter(s => s.category === category);
          if (categoryScripts.length === 0 && !searchQuery) return null;
          if (categoryScripts.length === 0 && searchQuery) return null;

          return (
            <section key={category} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">{category}</h2>
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  {categoryScripts.length} скриптов
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {categoryScripts.map((script) => (
                    <motion.div
                      key={script.id}
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
                              setEditingScript(script);
                              setFormData({ title: script.title, content: script.content, category: script.category });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setScriptToDelete(script.id);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold mb-2 line-clamp-1">{script.title}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-3 leading-relaxed mb-4">
                        {script.content}
                      </p>
                      <button 
                        onClick={() => {
                          setEditingScript(script);
                          setFormData({ title: script.title, content: script.content, category: script.category });
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
            </section>
          );
        })}

        {filteredScripts.length === 0 && searchQuery && (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <p className="text-zinc-400 font-medium">По вашему запросу ничего не найдено</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingScript ? "Редактировать скрипт" : "Новый скрипт"}</h2>
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
                    placeholder="Напр. Приветствие клиента"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Категория</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Текст скрипта</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
                  placeholder="Введите текст скрипта здесь..."
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
              <h3 className="text-2xl font-bold mb-2 tracking-tight">Удалить скрипт?</h3>
              <p className="text-zinc-500 mb-8">Это действие необратимо. Скрипт будет удален из базы данных навсегда.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setScriptToDelete(null);
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
