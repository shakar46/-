import React, { useState } from "react";
import { Settings, Plus, Trash2, Move, Layout, Database, Code, Save } from "lucide-react";
import { motion } from "motion/react";

export default function PlatformEditor() {
  const [elements, setElements] = useState([
    { id: 1, name: "Dashboard", type: "page", status: "active" },
    { id: 2, name: "Appeals List", type: "component", status: "active" },
    { id: 3, name: "Appeal Card", type: "component", status: "active" },
    { id: 4, name: "Analytics Engine", type: "backend", status: "active" },
    { id: 5, name: "Google Sync", type: "integration", status: "active" },
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Редактор платформы</h1>
          <p className="text-zinc-500">Полное управление структурой и элементами CRM системы.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-black/10">
          <Plus size={20} /> Добавить элемент
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="font-bold text-lg">Структура системы</h3>
            </div>
            <div className="divide-y divide-zinc-100">
              {elements.map((el) => (
                <div key={el.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="cursor-grab text-zinc-300 hover:text-zinc-500">
                      <Move size={18} />
                    </div>
                    <div className="p-2 bg-zinc-100 rounded-lg">
                      {el.type === 'page' && <Layout size={18} />}
                      {el.type === 'component' && <Code size={18} />}
                      {el.type === 'backend' && <Database size={18} />}
                      {el.type === 'integration' && <Settings size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{el.name}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">{el.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200"><Settings size={16} /></button>
                    <button className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h3 className="font-bold text-xl">Свойства элемента</h3>
            <div className="p-10 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
              <p className="text-zinc-400 text-sm italic">Выберите элемент для редактирования его свойств и структуры полей.</p>
            </div>
          </div>

          <div className="bg-emerald-500 p-8 rounded-3xl text-white">
            <h3 className="text-xl font-bold mb-2">Авто-сохранение</h3>
            <p className="text-emerald-100 text-sm mb-6">Все изменения структуры применяются в реальном времени ко всем модулям системы.</p>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Система активна
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
