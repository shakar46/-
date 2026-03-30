import React from "react";
import { 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Settings, 
  ShieldCheck,
  Zap
} from "lucide-react";
import { motion } from "motion/react";

const InstructionSection = ({ title, icon: Icon, children }: any) => (
  <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-black">
        <Icon size={24} />
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
    <div className="space-y-4 text-zinc-600 leading-relaxed">
      {children}
    </div>
  </section>
);

const Step = ({ number, title, description }: any) => (
  <div className="flex gap-4 group">
    <div className="flex-shrink-0 w-8 h-8 bg-zinc-100 text-black rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-black group-hover:text-white transition-colors">
      {number}
    </div>
    <div className="space-y-1">
      <h3 className="font-bold text-black">{title}</h3>
      <p className="text-sm text-zinc-500">{description}</p>
    </div>
  </div>
);

export default function HowTo() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-xs font-bold uppercase tracking-widest text-zinc-500">
          <BookOpen size={14} /> Руководство пользователя
        </div>
        <h1 className="text-5xl font-bold tracking-tight">Как пользоваться CRM</h1>
        <p className="text-xl text-zinc-500 max-w-2xl mx-auto">
          Подробная инструкция по работе с системой обработки жалоб и аналитики.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <InstructionSection title="Работа с обращениями" icon={MessageSquare}>
          <p>
            Основной модуль системы предназначен для регистрации и обработки жалоб клиентов.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Step 
              number="1" 
              title="Создание обращения" 
              description="Нажмите 'Создать обращение' на главной или в списке. Заполните данные клиента и текст жалобы." 
            />
            <Step 
              number="2" 
              title="Классификация" 
              description="Выберите тип жалобы, раздел и добавьте прилагательные комментарии для точной аналитики." 
            />
            <Step 
              number="3" 
              title="Обработка" 
              description="Укажите филиал, источник и прикрепите фотографии, если они есть." 
            />
            <Step 
              number="4" 
              title="Решение" 
              description="Опишите принятые меры, установите дедлайн и ответственное лицо." 
            />
          </div>
        </InstructionSection>

        <InstructionSection title="Аналитика и Отчеты" icon={BarChart3}>
          <p>
            Модуль аналитики позволяет отслеживать эффективность работы филиалов и выявлять проблемные зоны.
          </p>
          <ul className="space-y-3 mt-4">
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 mt-1 flex-shrink-0" />
              <span><b>Фильтрация:</b> Используйте фильтры по дате, филиалу и статусу для детального анализа.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 mt-1 flex-shrink-0" />
              <span><b>Сравнение периодов:</b> Система автоматически сравнивает текущие показатели с предыдущим периодом.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-emerald-500 mt-1 flex-shrink-0" />
              <span><b>Экспорт:</b> Вы можете скачать 'Недельный отчёт (Кухня)' или отправить его напрямую в Telegram.</span>
            </li>
          </ul>
        </InstructionSection>

        <InstructionSection title="База знаний (Скрипты)" icon={Zap}>
          <p>
            Раздел скриптов содержит готовые сценарии ответов, разделенные на три категории:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <h4 className="font-bold mb-2">Скрипты гостей</h4>
              <p className="text-xs text-zinc-500">Для прямого общения с посетителями в залах.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <h4 className="font-bold mb-2">Входящие запросы</h4>
              <p className="text-xs text-zinc-500">Для обработки звонков и сообщений в мессенджерах.</p>
            </div>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <h4 className="font-bold mb-2">Стандартные обращения</h4>
              <p className="text-xs text-zinc-500">Шаблоны для типичных ситуаций и жалоб.</p>
            </div>
          </div>
        </InstructionSection>

        <InstructionSection title="Безопасность и Роли" icon={ShieldCheck}>
          <p>
            Доступ к системе строго разграничен по ролям:
          </p>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-2xl">
              <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-bold">A</div>
              <div>
                <h4 className="font-bold">Администратор</h4>
                <p className="text-sm text-zinc-500">Полный доступ к аналитике, настройкам и удалению данных.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 border border-zinc-100 rounded-2xl">
              <div className="w-10 h-10 bg-zinc-100 text-black rounded-xl flex items-center justify-center font-bold">O</div>
              <div>
                <h4 className="font-bold">Оператор</h4>
                <p className="text-sm text-zinc-500">Создание и редактирование обращений, просмотр скриптов.</p>
              </div>
            </div>
          </div>
        </InstructionSection>

        <div className="bg-black text-white p-12 rounded-[3rem] text-center space-y-6">
          <HelpCircle size={48} className="mx-auto opacity-50" />
          <h2 className="text-3xl font-bold">Остались вопросы?</h2>
          <p className="text-zinc-400 max-w-md mx-auto">
            Если у вас возникли трудности при работе с системой, обратитесь к системному администратору или в отдел аналитики.
          </p>
          <button 
            onClick={() => window.location.href = 'mailto:support@example.com'}
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all"
          >
            Написать в поддержку <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
