import React, { useState, useEffect, useMemo } from "react";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown,
  Edit2,
  Trash2,
  Save,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SheetRow {
  [key: string]: string;
  id: string;
}

const COLUMNS = [
  "Дата",
  "Имя клиента",
  "Телефон",
  "Текст обращения",
  "Статус",
  "Классификация",
  "Секция классификации",
  "Комментарий",
  "Продукт/Сотрудник",
  "Источник",
  "Ответственный",
  "Срок",
  "Корректирующее действие"
];

export default function GoogleSheetsView() {
  const [data, setData] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  const [editingRow, setEditingRow] = useState<SheetRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        const docRef = doc(db, "settings", "telegram");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const settings = docSnap.data();
          if (settings.google_spreadsheet_url) {
            setSpreadsheetUrl(settings.google_spreadsheet_url);
          }
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gsheets/data");
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      
      // Map data to objects with IDs (row index)
      // Assuming result is string[][] where result[0] is headers
      const mappedData = result.slice(1).map((row: string[], index: number) => {
        const obj: any = { id: (index + 2).toString() }; // +2 because 1-indexed and skip header
        COLUMNS.forEach((col, i) => {
          obj[col] = row[i] || "";
        });
        return obj;
      });
      
      setData(mappedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const filteredData = useMemo(() => {
    return sortedData.filter(row => 
      Object.values(row).some(val => 
        val.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [sortedData, searchQuery]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleSave = async () => {
    if (!editingRow) return;
    setSaving(true);
    try {
      const rowIndex = parseInt(editingRow.id);
      const rowData = COLUMNS.map(col => editingRow[col]);
      
      const response = await fetch("/api/gsheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex, rowData })
      });

      if (!response.ok) throw new Error("Failed to sync");
      
      setData(prev => prev.map(row => row.id === editingRow.id ? editingRow : row));
      setEditingRow(null);
    } catch (err) {
      alert("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту строку?")) return;
    
    try {
      const rowIndex = parseInt(id);
      const response = await fetch(`/api/gsheets/row/${rowIndex}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete");
      
      setData(prev => prev.filter(row => row.id !== id));
      setEditingRow(null);
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <FileSpreadsheet className="text-emerald-500" size={32} />
            Google Таблица
          </h1>
          <p className="text-zinc-500">Прямой доступ к данным из Google Sheets с возможностью редактирования.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <a 
            href={spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${(import.meta as any).env.VITE_GOOGLE_SPREADSHEET_ID || ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold hover:bg-emerald-100 transition-all"
          >
            <ExternalLink size={18} />
            Открыть оригинал
          </a>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Поиск по таблице..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <span>Всего строк: {filteredData.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                {COLUMNS.map((col) => (
                  <th 
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest cursor-pointer hover:bg-zinc-100 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      {col}
                      <ArrowUpDown size={12} className={sortConfig?.key === col ? "text-black" : "text-zinc-300"} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-6 py-20 text-center text-zinc-400">
                    Данные не найдены
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors group">
                    {COLUMNS.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-zinc-600 max-w-[200px] truncate">
                        {row[col]}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingRow(row)}
                          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(row.id)}
                          className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
            Страница {currentPage} из {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRow(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Edit2 size={20} className="text-zinc-400" />
                  Редактирование строки #{editingRow.id}
                </h3>
                <button 
                  onClick={() => setEditingRow(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {COLUMNS.map((col) => (
                    <div key={col} className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{col}</label>
                      {col === "Текст обращения" || col === "Корректирующее действие" ? (
                        <textarea 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all resize-none"
                          rows={3}
                          value={editingRow[col]}
                          onChange={(e) => setEditingRow({...editingRow, [col]: e.target.value})}
                        />
                      ) : (
                        <input 
                          type="text"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                          value={editingRow[col]}
                          onChange={(e) => setEditingRow({...editingRow, [col]: e.target.value})}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                <button 
                  onClick={() => handleDelete(editingRow.id)}
                  className="flex items-center gap-2 px-4 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                  Удалить строку
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingRow(null)}
                    className="px-6 py-2 bg-white border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-2 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                  >
                    {saving ? "Сохранение..." : <><Save size={18} /> Сохранить</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
