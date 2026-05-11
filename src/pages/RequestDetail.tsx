import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus,
  History as HistoryIcon,
  ChevronLeft, 
  Check, 
  User, 
  Zap,
  Phone,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  FileText,
  Trash2,
  Save,
  AlertCircle,
  Edit,
  Layers,
  Image as ImageIcon,
  Mic,
  ArrowRight,
  Info,
  X
} from "lucide-react";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useFirebase } from "../components/FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import imageCompression from "browser-image-compression";
import { cn } from "../lib/utils";
import { CRMRequest, Dictionary } from "../types";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { convertToDate, safeFormat } from "../utils/dateUtils";
import { SearchableSelect, SearchableMultiSelect } from "../components/SearchableSelect";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole, token } = useFirebase();
  
  const [request, setRequest] = useState<CRMRequest | null>(null);
  const [dictionaries, setDictionaries] = useState<Record<string, Dictionary>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [sidebarActions, setSidebarActions] = useState<any[]>([]);
  
  // Image Viewer state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [resolution, setResolution] = useState("");
  const [instantFix, setInstantFix] = useState("");
  const [classificationConfirmed, setClassificationConfirmed] = useState<string[]>([]);

  // Local state for all fields (to allow editing)
  const [formData, setFormData] = useState<Partial<CRMRequest>>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch Request
      const docSnap = await getDoc(doc(db, "requests", id));
      if (docSnap.exists()) {
        const data = docSnap.id === 'new' ? {} : { id: docSnap.id, ...docSnap.data() } as CRMRequest;
        setRequest(data as CRMRequest);
        setFormData(data);
      }

      // Fetch Dictionaries
      const dictSnap = await getDocs(collection(db, "dictionaries"));
      const dictData: Record<string, Dictionary> = {};
      dictSnap.docs.forEach(doc => {
        dictData[doc.id] = { id: doc.id, ...doc.data() } as Dictionary;
      });
      setDictionaries(dictData);

      // Fetch Actions for right sidebar/history
      if (id !== 'new') {
        fetchActions();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `requests/${id}`);
    }
    setLoading(false);
  };

  const fetchActions = async () => {
    if (!id) return;
    const actionsQuery = query(
      collection(db, "request_actions"),
      where("requestId", "==", id),
      orderBy("createdAt", "desc")
    );
    const actionsSnap = await getDocs(actionsQuery);
    setSidebarActions(actionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleProcess = async () => {
    if (!resolution) return alert("Введите решение");
    setProcessing(true);
    try {
      const response = await fetch("/api/requests/process", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: id,
          instantFix,
          resolution,
          classificationConfirmed: classificationConfirmed.length > 0 
            ? `${formData.classification} / ${classificationConfirmed.join(', ')}`
            : `${formData.classification} / ${Array.isArray(formData.classificationSection) ? formData.classificationSection.join(', ') : formData.classificationSection}`
        })
      });
      const result = await response.json();
      if (result.success) {
        setResolution("");
        setInstantFix("");
        setClassificationConfirmed([]);
        fetchActions();
        // Update local request data if status changed
        const docSnap = await getDoc(doc(db, "requests", id!));
        if (docSnap.exists()) {
          const newData = { id: docSnap.id, ...docSnap.data() } as CRMRequest;
          setRequest(newData);
          setFormData(newData);
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Process error:", error);
    }
    setProcessing(false);
  };

  const handleComplete = async () => {
    if (!window.confirm("Завершить обращение?")) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/requests/complete", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ requestId: id })
      });
      const result = await response.json();
      if (result.success) {
        const docSnap = await getDoc(doc(db, "requests", id!));
        if (docSnap.exists()) {
          const newData = { id: docSnap.id, ...docSnap.data() } as CRMRequest;
          setRequest(newData);
          setFormData(newData);
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Complete error:", error);
    }
    setProcessing(false);
  };

  const handleSaveField = async (field: keyof CRMRequest, value: any) => {
    if (!id || id === 'new') return;
    setFormData(prev => ({ ...prev, [field]: value }));
    try {
      await updateDoc(doc(db, "requests", id), {
        [field]: value,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
  };

  const handleBulkSave = async () => {
    if (!id || id === 'new') return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "requests", id), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      alert("Данные успешно сохранены");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
    setSaving(false);
  };

  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const handleAIAnalyze = async () => {
    if (!formData.message) return alert("Введите текст обращения для анализа");
    setAiAnalyzing(true);
    try {
      const response = await fetch("/api/ai/analyze-root-cause", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: formData.message,
          classification: formData.classification,
          section: formData.classificationSection
        })
      });
      const result = await response.json();
      if (result.analysis) {
        setFormData(prev => ({ 
          ...prev, 
          rootCauseAnalysis: result.analysis,
          correctiveActions: result.recommendation 
        }));
      }
    } catch (error) {
      console.error("AI analysis error:", error);
    }
    setAiAnalyzing(false);
  };

  const canEditMainInfo = ['admin', 'owner', 'head', 'operator'].includes(userRole || "");
  const canEditProcessing = ['admin', 'owner', 'head', 'manager'].includes(userRole || "");
  const canEditAnalytics = ['admin', 'operator'].includes(userRole || "");
  const isOperatorOnly = userRole === 'operator';

  if (loading) return <div className="p-20 text-center font-bold text-zinc-400">Загрузка карточки...</div>;
  if (!request) return <div className="p-20 text-center font-bold text-zinc-400">Обращение не найдено</div>;

  const TABS = [
    { id: "general", label: "Инфо", icon: Info },
    { id: "evidence", label: "Подтверждение", icon: ImageIcon },
    { id: "processing", label: "Обработка", icon: Zap },
    { id: "analytics", label: "Аналитика", icon: FileText }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32 pt-10 px-4 lg:px-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/requests")}
            className="p-3 bg-white border border-zinc-100 rounded-2xl text-zinc-400 hover:text-black hover:border-zinc-200 transition-all shadow-sm"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tight text-zinc-900">
                Обращение #{id.slice(0, 6)}
              </h1>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                request?.status === 'done' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                request?.status === 'under_review' ? "bg-blue-50 text-blue-600 border-blue-100" :
                "bg-amber-50 text-amber-600 border-amber-100"
              )}>
                {request?.status === 'in_progress' ? "В работе" : 
                 request?.status === 'under_review' ? "На проверке" : "Выполнено"}
              </div>
            </div>
            <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">
              Создано: {safeFormat(request?.createdAt, "dd.MM.yyyy HH:mm")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {request?.status === 'in_progress' && (userRole === 'admin' || userRole === 'owner' || userRole === 'head') && (
            <button 
              onClick={handleComplete}
              disabled={processing}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
            >
              <Check size={20} /> Завершить обращение
            </button>
          )}
          <button 
            onClick={handleBulkSave}
            disabled={saving}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="flex gap-2 bg-white p-2 rounded-[2rem] border border-zinc-100 shadow-sm overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all",
              activeTab === tab.id 
                ? "bg-zinc-900 text-white shadow-xl" 
                : "text-zinc-400 hover:bg-zinc-50"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-10">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Block 1: Основная информация */}
                <section className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                      <User size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">1. Основная информация</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Дата создания</label>
                      <div className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold text-zinc-500">
                        {safeFormat(request?.createdAt, "dd.MM.yyyy HH:mm:ss")}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Имя потребителя</label>
                      <input 
                        disabled={!canEditMainInfo}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                        value={formData.clientName || ""}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="Автоматически..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Телефон</label>
                      <input 
                        disabled={!canEditMainInfo}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                        value={formData.clientPhone || ""}
                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                        placeholder="Автоматически..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Дата поступления (Дата и время)</label>
                      <input 
                        type="datetime-local"
                        disabled={!canEditMainInfo}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                        value={formData.dateReceived || ""}
                        onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Дата заказа (Дата и время)</label>
                      <input 
                        type="datetime-local"
                        disabled={!canEditMainInfo}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                        value={formData.orderDate || ""}
                        onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                      />
                    </div>
                    <SearchableSelect 
                      label="Источник"
                      disabled={!canEditMainInfo}
                      options={dictionaries.sources?.items || []}
                      value={formData.source || ""}
                      onChange={(val) => setFormData({ ...formData, source: val })}
                      placeholder="Выберите источник..."
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Чек заказа</label>
                      <input 
                        disabled={!canEditMainInfo}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-50"
                        value={formData.orderCheck || ""}
                        onChange={(e) => setFormData({ ...formData, orderCheck: e.target.value })}
                        placeholder="Автоматически..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SearchableSelect 
                      label="Филиал"
                      disabled={!canEditMainInfo}
                      options={dictionaries.branch_names?.items || []}
                      value={formData.branchName || ""}
                      onChange={(val) => setFormData({ ...formData, branchName: val })}
                      placeholder="Автоматически..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Краткое описание обращения</label>
                    <textarea 
                      disabled={!canEditMainInfo}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-6 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all min-h-[100px] resize-none disabled:opacity-50"
                      value={formData.message || ""}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Автоматически..."
                    />
                  </div>
                </section>

                {/* Block 2: Классификация обращения */}
                <section className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                      <Layers size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">2. Классификация обращения</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SearchableSelect 
                      label="Классификация жалобы"
                      disabled={!canEditMainInfo}
                      options={dictionaries.classification?.items || []}
                      value={formData.classification || ""}
                      onChange={(val) => setFormData({ ...formData, classification: val, classificationSection: "" })}
                    />
                    <SearchableMultiSelect 
                      label="Раздел классификации"
                      disabled={!canEditMainInfo}
                      options={[{ 
                        name: formData.classification || "Разделы", 
                        items: dictionaries.sections?.groups?.find(g => g.name === formData.classification)?.items || [] 
                      }]}
                      value={Array.isArray(formData.classificationSection) ? formData.classificationSection : (formData.classificationSection ? [formData.classificationSection] : [])}
                      onChange={(val) => setFormData({ ...formData, classificationSection: val })}
                      placeholder="Выберите разделы..."
                    />
                  </div>

                  <SearchableMultiSelect 
                    label="Прилагательный комментарий"
                    disabled={!canEditMainInfo}
                    options={dictionaries.adjective_comments?.groups || []}
                    value={formData.additionalComment ? formData.additionalComment.split(',').filter(Boolean) : []}
                    onChange={(val) => setFormData({ ...formData, additionalComment: val.join(',') })}
                  />

                  <SearchableMultiSelect 
                    label="Продукт / Сотрудник"
                    disabled={!canEditProcessing}
                    options={dictionaries.products_employees?.groups || []}
                    value={formData.productEmployee || []}
                    onChange={(val) => setFormData({ ...formData, productEmployee: val })}
                  />
                </section>
              </motion.div>
            )}

            {activeTab === 'evidence' && (
              <motion.div
                key="evidence"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Block 3: Подтверждение */}
                <section className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                      <ImageIcon size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">3. Подтверждение</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Фото от потребителя</label>
                        <div className="grid grid-cols-2 gap-4">
                          {formData.clientPhotos?.map((url, idx) => (
                            <div key={idx} className="relative group cursor-pointer" onClick={() => setSelectedImage(url)}>
                              <img src={url} className="w-full h-32 object-cover rounded-2xl border border-zinc-100 shadow-sm" referrerPolicy="no-referrer" />
                              {canEditMainInfo && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newUrls = [...(formData.clientPhotos || [])];
                                    newUrls.splice(idx, 1);
                                    setFormData({ ...formData, clientPhotos: newUrls });
                                  }}
                                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <label className="h-32 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-primary hover:border-primary transition-all cursor-pointer">
                            <Plus size={24} />
                            <span className="text-[8px] font-black uppercase tracking-widest text-center px-2">Добавить фото</span>
                            <input 
                              type="file" 
                              multiple
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                
                                const options = {
                                  maxSizeMB: 0.5,
                                  maxWidthOrHeight: 1280,
                                  useWebWorker: true
                                };
                                
                                const newPhotos = [...(formData.clientPhotos || [])];
                                for (const file of files) {
                                  try {
                                    const compressedFile = await imageCompression(file, options);
                                    const reader = new FileReader();
                                    const photoData = await new Promise<string>((resolve) => {
                                      reader.onloadend = () => resolve(reader.result as string);
                                      reader.readAsDataURL(compressedFile);
                                    });
                                    newPhotos.push(photoData);
                                  } catch (error) {
                                    console.error("Compression error:", error);
                                  }
                                }
                                setFormData({ ...formData, clientPhotos: newPhotos });
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">SIP-аудиозапись (Ссылка)</label>
                      <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        <Mic className="text-zinc-400" size={20} />
                        <input 
                          disabled={!canEditMainInfo}
                          className="bg-transparent flex-1 outline-none text-sm font-bold disabled:opacity-50"
                          value={formData.sipAudio || ""}
                          onChange={(e) => setFormData({ ...formData, sipAudio: e.target.value })}
                          placeholder="Вставьте ссылку на запись..."
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Block 4: Обработка */}
                <section className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                      <Zap size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 tracking-tight">4. Обработка</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Кто принял жалобу</label>
                      <input 
                        disabled
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-zinc-400"
                        value={formData.complaintTaker || "Автоматически..."}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ответственный за коррекцию</label>
                      <input 
                        disabled
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none text-zinc-400"
                        value={formData.responsibleForCorrection || "Автоматически..."}
                      />
                    </div>
                    <SearchableSelect 
                      label="Срок устранения"
                      disabled={!canEditProcessing}
                      options={dictionaries.deadline_statuses?.items || []}
                      value={formData.deadlineStatus || ""}
                      onChange={(val) => setFormData({ ...formData, deadlineStatus: val })}
                      placeholder="Автоматически..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Моментальная коррекция</label>
                    <textarea 
                      disabled
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-6 text-sm font-bold outline-none resize-none min-h-[120px] text-zinc-400"
                      value={formData.instantCorrection || "Автоматически..."}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Решение</label>
                    <textarea 
                      disabled
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-6 text-sm font-bold outline-none resize-none min-h-[150px] text-zinc-400"
                      value={formData.finalResolution || "Автоматически..."}
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                {/* Block 5: Аналитика */}
                <section className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400">
                        <FileText size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-zinc-900 tracking-tight">5. Аналитика</h2>
                    </div>
                    <button 
                      onClick={handleAIAnalyze}
                      disabled={aiAnalyzing}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                    >
                      {aiAnalyzing ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      Провести AI-анализ
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Корневая причина
                    </label>
                    <textarea 
                      disabled={!canEditAnalytics}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-6 text-sm font-bold outline-none min-h-[120px] disabled:opacity-50 focus:ring-4 focus:ring-primary/5 transition-all"
                      value={formData.rootCauseAnalysis || ""}
                      onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })}
                      placeholder="Опишите основную причину..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-50">
                    <SearchableSelect 
                      label="Отдел мотивации"
                      disabled={!canEditAnalytics}
                      options={dictionaries.motivation_departments?.items || []}
                      value={formData.motivationDept || ""}
                      onChange={(val) => setFormData({ ...formData, motivationDept: val })}
                      placeholder="Выберите отдел..."
                    />
                    <SearchableSelect 
                      label="Статус обоснованности"
                      disabled={!canEditAnalytics}
                      options={["обоснованный", "не обоснованный", "выявляется"]}
                      value={formData.validityStatus || "выявляется"}
                      onChange={(val) => setFormData({ ...formData, validityStatus: val as any })}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Корректирующие действия
                    </label>
                    <textarea 
                      disabled={!canEditAnalytics}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl px-8 py-6 text-sm font-bold outline-none min-h-[120px] disabled:opacity-50 focus:ring-4 focus:ring-primary/5 transition-all"
                      value={formData.correctiveActions || ""}
                      onChange={(e) => setFormData({ ...formData, correctiveActions: e.target.value })}
                      placeholder="Опишите действия..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-zinc-50 pt-8 mt-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Подтвердить классификацию жалобы</label>
                       <SearchableSelect 
                        options={dictionaries.classification?.items || []}
                        value={formData.classificationConfirmed?.split(' / ')[0] || ""}
                        onChange={(val) => setFormData({ ...formData, classificationConfirmed: val + ' / ' + (formData.classificationConfirmed?.split(' / ')[1] || "") })}
                        placeholder="Классификация..."
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Подтвердить раздел классификации</label>
                       <SearchableSelect 
                        options={dictionaries.sections?.groups?.find(g => g.name === (formData.classificationConfirmed?.split(' / ')[0] || formData.classification))?.items || []}
                        value={formData.classificationConfirmed?.split(' / ')[1] || ""}
                        onChange={(val) => setFormData({ ...formData, classificationConfirmed: (formData.classificationConfirmed?.split(' / ')[0] || formData.classification) + ' / ' + val })}
                        placeholder="Раздел..."
                       />
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Action Sidebar / History */}
        <aside className="space-y-8">


          <section className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-zinc-200">
             <h3 className="text-xl font-black mb-6 flex items-center gap-3">
               <HistoryIcon size={20} className="text-primary" />
               Активность
             </h3>
             <div className="space-y-6">
               {sidebarActions.length > 0 ? sidebarActions.slice(0, 5).map(action => (
                 <div key={action.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                   <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] bg-primary rounded-full shadow-[0_0_10px_rgba(255,100,0,0.5)]" />
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                     {safeFormat(action.createdAt, "dd.MM HH:mm")}
                   </p>
                   <div className="space-y-2">
                     <p className="text-xs font-bold leading-relaxed">{action.resolution}</p>
                     {action.classificationConfirmed && (
                       <div className="text-[8px] font-black uppercase text-white/30 tracking-widest">
                         Классификация: {action.classificationConfirmed}
                       </div>
                     )}
                   </div>
                 </div>
               )) : (
                 <p className="text-white/20 text-xs font-bold italic">Записей пока нет</p>
               )}
             </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="text-zinc-300" size={24} />
                <h3 className="text-lg font-black text-zinc-900">Статус Эскроу</h3>
             </div>
             <p className="text-xs text-zinc-400 font-bold uppercase tracking-[0.15em] mb-4">Текущий прогресс</p>
             <div className="w-full h-3 bg-zinc-50 rounded-full overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: request.status === 'done' ? '100%' : '65%' }}
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    request.status === 'done' ? "bg-emerald-500" : "bg-amber-500"
                  )}
                />
             </div>
          </section>
        </aside>
      </div>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all z-[110]"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
            
            <div 
              className="relative max-w-full max-h-full overflow-hidden flex items-center justify-center cursor-zoom-in group"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(prev => prev === 1 ? 2.5 : 1);
              }}
              onMouseMove={(e) => {
                if (zoom > 1) {
                  const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - left) / width) * 100;
                  const y = ((e.clientY - top) / height) * 100;
                  setPosition({ x, y });
                }
              }}
            >
              <img 
                src={selectedImage} 
                alt="Zoom view"
                className={cn(
                  "max-w-full max-h-[85vh] transition-transform duration-300 rounded-lg",
                  zoom > 1 ? "scale-[2.5]" : "scale-100"
                )}
                style={zoom > 1 ? {
                  transformOrigin: `${position.x}% ${position.y}%`
                } : {}}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const History = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);