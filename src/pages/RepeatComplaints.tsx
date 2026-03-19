import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../utils/firestoreErrorHandler";
import { AlertTriangle, Search, MapPin, Tag, User, Clock, ChevronRight, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { BRANCH_NAMES, COMPLAINT_CLASSIFICATIONS } from "../constants";

export default function RepeatComplaints() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("Все");
  const [classificationFilter, setClassificationFilter] = useState("Все");

  useEffect(() => {
    const fetchAppeals = async () => {
      try {
        const q = query(collection(db, "appeals"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAppeals(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "appeals");
      }
      setLoading(false);
    };
    fetchAppeals();
  }, []);

  // Group by phone to find repeats
  const phoneGroups = appeals.reduce((acc: any, appeal) => {
    const phone = appeal.client_phone;
    if (!acc[phone]) acc[phone] = [];
    acc[phone].push(appeal);
    return acc;
  }, {});

  const repeatAppeals = Object.values(phoneGroups)
    .filter((group: any) => group.length > 1)
    .flat()
    .sort((a: any, b: any) => b.created_at?.toDate?.()?.getTime() - a.created_at?.toDate?.()?.getTime());

  const filteredRepeats = repeatAppeals.filter((a: any) => {
    const matchesSearch = 
      a.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.client_phone?.includes(searchQuery) ||
      a.branch_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = branchFilter === "Все" || a.branch_name === branchFilter;
    const matchesClassification = classificationFilter === "Все" || a.complaint_classification === classificationFilter;
    return matchesSearch && matchesBranch && matchesClassification;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Повторные жалобы</h1>
        <p className="text-zinc-500 text-lg">Анализ обращений от одних и тех же клиентов.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Search size={12} /> Поиск
          </label>
          <input
            type="text"
            placeholder="Имя, телефон..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
          />
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin size={12} /> Филиал
          </label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
          >
            <option>Все</option>
            {BRANCH_NAMES.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Tag size={12} /> Классификация
          </label>
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-all"
          >
            <option>Все</option>
            {COMPLAINT_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-3 flex items-center justify-center">
          <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 w-full">
            <AlertTriangle size={24} />
            <div>
              <div className="text-sm font-bold">Повторов</div>
              <div className="text-2xl font-black">{filteredRepeats.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Дата</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Клиент</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Филиал</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Классификация</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Статус</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredRepeats.map((appeal: any) => (
                <tr key={appeal.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Clock size={14} className="text-zinc-300" />
                      {appeal.created_at?.toDate ? format(appeal.created_at.toDate(), "dd.MM.yyyy", { locale: ru }) : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{appeal.client_name}</span>
                      <span className="text-xs text-zinc-400">{appeal.client_phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-medium">
                      <MapPin size={14} className="text-zinc-300" />
                      {appeal.branch_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-medium">
                      <Tag size={14} className="text-zinc-300" />
                      {appeal.complaint_classification}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      appeal.status === "Новый" ? "bg-rose-50 text-rose-600 border-rose-100" :
                      appeal.status === "Выполнен" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    }`}>
                      {appeal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/appeals/${appeal.id}`}
                      className="p-2 text-zinc-400 hover:text-black transition-colors inline-block"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredRepeats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-400 font-medium">
                    Повторных жалоб не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
