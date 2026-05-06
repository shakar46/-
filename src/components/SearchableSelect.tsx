import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Check, Layers } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Option {
  label: string;
  value: string;
  group?: string;
}

interface GroupedOption {
  name: string;
  items: string[];
}

interface SearchableSelectProps {
  options: string[] | GroupedOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Выберите...", label, error, disabled }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const flatOptions: Option[] = Array.isArray(options) 
    ? (options.length > 0 && typeof options[0] === 'string'
        ? (options as string[]).map(o => ({ label: o, value: o }))
        : (options as GroupedOption[]).flatMap(g => (g.items || []).map(i => ({ label: i, value: i, group: g.name }))))
    : [];

  const filteredOptions = flatOptions.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.group && o.group.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold flex items-center justify-between transition-all",
          isOpen ? "ring-4 ring-primary/5 border-primary/20 shadow-lg" : "hover:bg-zinc-100/50",
          error && "border-red-200 bg-red-50",
          disabled && "opacity-50 cursor-not-allowed grayscale"
        )}
      >
        <span className={cn(value ? "text-zinc-900" : "text-zinc-400")}>
          {value || placeholder}
        </span>
        <ChevronDown size={18} className={cn("text-zinc-300 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[200] top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-96"
          >
            <div className="p-4 border-b border-zinc-50 bg-zinc-50/50 flex items-center gap-3">
              <Search size={16} className="text-zinc-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Поиск..."
                className="bg-transparent border-none outline-none text-sm font-bold w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto custom-scrollbar p-2">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                      value === opt.value ? "bg-primary text-white" : "hover:bg-zinc-50 text-zinc-600"
                    )}
                  >
                    <div className="flex flex-col items-start text-left">
                       <span>{opt.label}</span>
                       {opt.group && <span className={cn("text-[8px] uppercase tracking-widest", value === opt.value ? "text-white/60" : "text-zinc-400")}>{opt.group}</span>}
                    </div>
                    {value === opt.value && <Check size={16} />}
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">Ничего не найдено</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SearchableMultiSelectProps {
  options: GroupedOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({ options, value = [], onChange, placeholder = "Выберите...", label, disabled }: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeOption = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== val));
  };

  const filteredGroups = options.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.toLowerCase().includes(search.toLowerCase()) || 
      group.name.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "min-h-[64px] w-full bg-zinc-50 border border-zinc-100 rounded-3xl p-4 flex flex-wrap gap-2 items-center cursor-pointer transition-all",
          isOpen ? "ring-4 ring-primary/5 border-primary/20 shadow-lg" : "hover:bg-zinc-100/50",
          disabled && "opacity-50 cursor-not-allowed grayscale"
        )}
      >
        {value.length > 0 ? (
          value.map(v => (
            <div key={v} className="bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              {v}
              <button onClick={(e) => removeOption(v, e)} className="hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))
        ) : (
          <span className="text-zinc-400 text-sm font-bold pl-2">{placeholder}</span>
        )}
        <div className="flex-1" />
        <ChevronDown size={18} className={cn("text-zinc-300 transition-transform mr-1", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[200] top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-96"
          >
            <div className="p-4 border-b border-zinc-50 bg-zinc-50/50 flex items-center gap-3">
              <Search size={16} className="text-zinc-400" />
              <input 
                autoFocus
                type="text" 
                placeholder="Поиск по группам или элементам..."
                className="bg-transparent border-none outline-none text-sm font-bold w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto custom-scrollbar p-6 space-y-8">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-primary" />
                      <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{group.name}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((item, iIdx) => {
                        const isSelected = value.includes(item);
                        return (
                          <button
                            key={iIdx}
                            type="button"
                            onClick={() => toggleOption(item)}
                            className={cn(
                              "flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                              isSelected 
                                ? "bg-primary border-primary text-white" 
                                : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-300"
                            )}
                          >
                            {item}
                            {isSelected && <Check size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">Ничего не найдено</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
