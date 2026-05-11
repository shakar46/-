import React from "react";
import { motion } from "motion/react";
import { 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  MessageSquare, 
  ArrowRight,
  TrendingUp,
  Lock,
  Globe
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useFirebase } from "../components/FirebaseProvider";

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-accent/30 transition-colors group"
  >
    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
      <Icon className="text-accent" size={24} />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-500 leading-relaxed text-sm">
      {description}
    </p>
  </motion.div>
);

const Landing = () => {
  const { isAuthorized } = useFirebase();
  const navigate = useNavigate();

  return (
    <div className="bg-white min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3 text-white font-bold text-xl">
              Ш
            </div>
            <span className="font-bold text-xl tracking-tight">CRM Feedback</span>
          </div>
          <div className="flex items-center gap-6">
            {isAuthorized ? (
              <Link 
                to="/" 
                className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                В панель
              </Link>
            ) : (
              <Link 
                to="/login"
                className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-accent text-sm font-bold mb-6">
                <Zap size={16} />
                <span>Будущее управления отзывами</span>
              </div>
              <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tighter mb-8">
                Превратите <span className="text-accent italic">критику</span> в лояльность за секунды.
              </h1>
              <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-xl">
                Интеллектуальная CRM-система для обработки обращений, аналитики качества и автоматизации ответов. Масштабируйте ваш сервис с помощью ИИ.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => navigate(isAuthorized ? "/" : "/login")}
                  className="bg-primary text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 active:scale-95"
                >
                  Начать работу
                  <ArrowRight size={20} />
                </button>
                <button className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95">
                  Узнать больше
                </button>
              </div>
              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <img 
                      key={i}
                      src={`https://i.pravatar.cc/100?u=${i}`} 
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                      alt="User"
                    />
                  ))}
                </div>
                <div className="text-sm font-medium">
                  <span className="text-slate-900 font-bold">500+</span> компаний уже с нами
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-accent/20 blur-3xl opacity-50 rounded-full" />
              <div className="glass-card p-4 rounded-[40px] relative">
                <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200" 
                    alt="Dashboard Preview"
                    className="w-full h-auto"
                  />
                </div>
                {/* Floating elements */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center text-success">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Обслуживание</p>
                    <p className="text-sm font-bold">+24% за месяц</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center text-accent">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Обработка</p>
                    <p className="text-sm font-bold">1.2 мин среднее</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold mb-6">Все инструменты для идеального сервиса</h2>
            <p className="text-slate-500 text-lg">
              Мы объединили мощную аналитику, систему контроля качества и удобные инструменты для операторов в одном месте.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={BarChart3}
              title="Глубокая аналитика"
              description="Отслеживайте NPS, среднее время ответа и популярные жалобы в режиме реального времени на детальных графиках."
              delay={0.1}
            />
            <FeatureCard 
              icon={Zap}
              title="ИИ-Предложения"
              description="Наша нейросеть анализирует текст обращения и предлагает лучшие варианты решения, экономя время ваших сотрудников."
              delay={0.2}
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Контроль качества"
              description="Многоуровневая система проверки решений гарантирует, что каждый клиент получит лучший сервис."
              delay={0.3}
            />
            <FeatureCard 
              icon={Globe}
              title="Омниканальность"
              description="Собирайте отзывы со всех платформ: сайт, социальные сети, мессенджеры и внутренние формы обратной связи."
              delay={0.4}
            />
            <FeatureCard 
              icon={Lock}
              title="Безопасность данных"
              description="Шифрование банковского уровня и гибкая настройка ролей гарантируют сохранность персональных данных ваших клиентов."
              delay={0.5}
            />
            <FeatureCard 
              icon={Users}
              title="Управление командой"
              description="Легко отслеживайте KPI каждого менеджера и оператора, помогая им расти и работать эффективнее."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-primary rounded-[40px] p-12 lg:p-20 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-accent/20 blur-[120px] rounded-full -top-1/2 -left-1/2 opacity-30" />
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl text-white font-bold mb-8 max-w-3xl mx-auto leading-tight">
                Готовы поднять свой сервис на новый уровень?
              </h2>
              <p className="text-white/60 text-xl mb-12 max-w-xl mx-auto">
                Присоединяйтесь к лидерам рынка и начните строить честные отношения с клиентами прямо сейчас.
              </p>
              <button 
                onClick={() => navigate(isAuthorized ? "/" : "/login")}
                className="bg-white text-primary px-10 py-5 rounded-3xl font-bold text-xl hover:bg-slate-100 transition-all active:scale-95 shadow-2xl"
              >
                Создать аккаунт бесплатно
              </button>
              <div className="mt-12 flex flex-wrap justify-center gap-10 items-center opacity-40 grayscale contrast-125">
                <span className="text-white font-bold text-2xl tracking-tighter">APPLE</span>
                <span className="text-white font-bold text-2xl tracking-tighter">GOOGLE</span>
                <span className="text-white font-bold text-2xl tracking-tighter">STRIPE</span>
                <span className="text-white font-bold text-2xl tracking-tighter">NOTION</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              Ш
            </div>
            <span className="font-bold text-lg tracking-tight">CRM Feedback</span>
          </div>
          <div className="text-slate-400 text-sm">
            © 2026 CRM Feedback System. Все права защищены.
          </div>
          <div className="flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#" className="hover:text-accent transition-colors">Приватность</a>
            <a href="#" className="hover:text-accent transition-colors">Условия</a>
            <a href="#" className="hover:text-accent transition-colors">Поддержка</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
