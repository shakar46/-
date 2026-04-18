import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useFirebase } from "../components/FirebaseProvider";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { Search, Plus, FileText, Trash2, Edit, Save, X, Download, User, Calendar, ExternalLink, Link as LinkIcon, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";

export default function LearningBase() {
  const { user, userRole } = useFirebase();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    author: user?.displayName || "",
    fileUrl: "",
    fileName: "",
    category: "Общее"
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, "learning_base"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "learning_base");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) return;
    setSaving(true);
    setSaveStatus("idle");
    
    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        await updateDoc(doc(db, "learning_base", editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, "learning_base"), {
          ...dataToSave,
          created_at: new Date().toISOString(),
          created_by: user?.uid
        });
      }
      
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({
        title: "",
        description: "",
        author: user?.displayName || "",
        fileUrl: "",
        fileName: "",
        category: "Общее"
      });
      fetchItems();
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      handleFirestoreError(error, editingItem ? OperationType.UPDATE : OperationType.CREATE, "learning_base");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "learning_base", itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchItems();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `learning_base/${itemToDelete}`);
    }
  };

  const filteredItems = items.filter(item => {
    const search = searchQuery.toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(search) ||
      (item.description || "").toLowerCase().includes(search) ||
      (item.author || "").toLowerCase().includes(search)
    );
  });

  const CATEGORIES = ["Общее", "Инструкции", "Стандарты", "Видео", "Презентации"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">База обучения</h1>
          <p className="text-zinc-500">Обучающие материалы, инструкции и полезные файлы для сотрудников.</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({
              title: "",
              description: "",
              author: user?.displayName || "",
              fileUrl: "",
              fileName: "",
              category: "Общее"
            });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Добавить материал
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input
          type="text"
          placeholder="Поиск по названию, описанию или автору..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-4 text-lg focus:ring-4 focus:ring-black/5 focus:border-black outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col"
            >
              <div className="p-8 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-black transition-colors">
                    <FileText size={24} />
                  </div>
                  {(userRole === 'admin' || user?.uid === item.created_by) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({
                            title: item.title,
                            description: item.description,
                            author: item.author,
                            fileUrl: item.fileUrl || "",
                            fileName: item.fileName || "",
                            category: item.category || "Общее"
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setItemToDelete(item.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-zinc-100 text-[10px] font-bold text-zinc-400 rounded uppercase tracking-wider">
                      {item.category || "Общее"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-black transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-zinc-500 text-sm line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-50">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <User size={14} />
                    <span>{item.author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <Calendar size={14} />
                    <span>{item.created_at ? format(new Date(item.created_at), "dd.MM.yyyy") : "—"}</span>
                  </div>
                </div>
              </div>

              {item.fileUrl && (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black p-4 text-white flex items-center justify-center gap-2 font-bold hover:bg-zinc-800 transition-colors"
                >
                  <Download size={18} />
                  {item.fileName || "Скачать файл"}
                </a>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-20 bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-zinc-400">
            <FileText size={32} />
          </div>
          <p className="text-zinc-500 font-medium">
            {searchQuery ? "По вашему запросу ничего не найдено" : "Пока нет добавленных материалов"}
          </p>
        </div>
      )}

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{editingItem ? "Редактировать материал" : "Добавить новый материал"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Заголовок</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="Напр. Инструкция по работе с гостями"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Категория</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Описание</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all resize-none"
                    placeholder="Кратко опишите содержание материала..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Автор</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="Имя автора"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Название файла</label>
                    <input
                      type="text"
                      value={formData.fileName}
                      onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                      placeholder="Напр. Handbook.pdf"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <LinkIcon size={12} />
                    Ссылка на файл / ресурс
                  </label>
                  <input
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-black/5 focus:border-black transition-all"
                    placeholder="https://example.com/file.pdf"
                  />
                  <p className="text-[10px] text-zinc-400">Прикрепите ссылку на документ в облаке (Google Drive, Dropbox и др.)</p>
                </div>
              </div>
              <div className="p-8 bg-zinc-50 flex gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-200 transition-all font-sans"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-black text-white py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 font-sans"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={20} />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                <Trash2 size={40} />
              </div>
              <h3 className="text-3xl font-bold mb-4 tracking-tight">Удалить материал?</h3>
              <p className="text-zinc-500 mb-10 leading-relaxed">Это действие необратимо. Файл и информация о нем будут удалены навсегда.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold border border-zinc-200 hover:bg-zinc-50 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Удалить
                </button>
              </div>
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
            {saveStatus === "success" ? "Материал сохранен" : "Ошибка сохранения"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
