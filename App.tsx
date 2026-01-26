
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  PieChart,
  ShoppingBag,
  FileSearch,
  FolderKanban,
  RefreshCw,
  UserCircle2,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ReferencesPage } from './pages/ReferencesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { OffersPage } from './pages/OffersPage';
import { SettingsPage } from './pages/SettingsPage';
import { EntriesPage } from './pages/EntriesPage'; 
import { AdEntry, ExtraExpense, Offer, DateRangeType, RecurringExpense } from './types';
import { supabase } from './services/supabaseClient';

const ALLOWED_USERS = ["JOÃO PEDRO", "ARTHUR", "VINICIUS"];

type TabType = 'dashboard' | 'entries' | 'offers' | 'settings' | 'references' | 'projects';

const SidebarLink = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}`}>
    <Icon size={20} className={active ? 'text-indigo-600' : 'text-gray-400'} />
    <span className="hidden lg:block whitespace-nowrap">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('adtracker_user'));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedOfferId, setSelectedOfferId] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('last7days');
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [expenses, setExpenses] = useState<ExtraExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  const handleLogin = (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('adtracker_user', user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('adtracker_user');
  };

  const fetchData = async () => {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const [offersRes, adsRes, expensesRes, recurringRes] = await Promise.all([
        supabase.from('offers').select('*'),
        supabase.from('marketing_data').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('recurring_expenses').select('*')
      ]);
      if (offersRes.data) setOffers(offersRes.data.map((o: any) => ({ ...o, productPrice: o.product_price, productCost: o.product_cost })));
      if (adsRes.data) setAds(adsRes.data.map((a: any) => ({ ...a, offerId: a.offer_id })));
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (recurringRes.data) setRecurringExpenses(recurringRes.data.map((r: any) => ({ ...r, dayOfMonth: r.day_of_month })));
    } catch (e) { 
      console.error('Erro ao buscar dados:', e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-indigo-500/30 font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 opacity-70"></div>
        <div className="relative bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/10 w-full max-w-lg text-center">
           <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20 ring-4 ring-white/5">
             <PieChart size={48} className="text-white" />
           </div>
           <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">AdTracker Pro</h1>
           <p className="text-slate-400 mb-10 font-medium uppercase tracking-widest text-xs">Acesso Restrito à Operação</p>
           
           <div className="grid grid-cols-1 gap-4">
             {ALLOWED_USERS.map(user => (
               <button 
                key={user} 
                onClick={() => handleLogin(user)}
                className="flex items-center justify-between p-6 rounded-[1.5rem] bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-indigo-600/10 transition-all group overflow-hidden relative"
               >
                 <div className="flex items-center gap-5 relative z-10">
                   <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                     <UserCircle2 size={28} />
                   </div>
                   <span className="font-bold text-xl text-slate-200 group-hover:text-white tracking-wide uppercase">{user}</span>
                 </div>
                 <ChevronRight className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" size={24} />
               </button>
             ))}
           </div>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
      <RefreshCw className="animate-spin mb-4 text-indigo-500" size={48} />
      <h2 className="text-xl font-bold text-white tracking-widest uppercase">Sincronizando...</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      <aside className="w-20 lg:w-72 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 shadow-sm">
        <div className="p-8 flex items-center gap-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100"><PieChart size={24} className="text-white" /></div>
          <div className="hidden lg:block">
            <span className="font-black text-xl tracking-tight block leading-none">AdTracker</span>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Sênior</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-3">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={ShoppingBag} label="Ofertas" active={activeTab === 'offers'} onClick={() => setActiveTab('offers')} />
          <SidebarLink icon={PlusCircle} label="Registros" active={activeTab === 'entries'} onClick={() => setActiveTab('entries')} />
          <div className="pt-6 border-t border-gray-100 mt-4 space-y-3">
            <SidebarLink icon={FileSearch} label="Spy Vault" active={activeTab === 'references'} onClick={() => setActiveTab('references')} />
            <SidebarLink icon={FolderKanban} label="Operações" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          </div>
        </nav>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="hidden lg:flex flex-col gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                   {currentUser[0]}
                </div>
                <div className="flex-1 overflow-hidden">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Logado como</p>
                   <p className="text-sm font-black text-gray-900 truncate uppercase">{currentUser}</p>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100">
               <LogOut size={14} /> Desconectar
             </button>
          </div>
          <SidebarLink icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-72 p-6 lg:p-12">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
              {activeTab === 'dashboard' ? 'Performance' : activeTab === 'projects' ? 'Operações' : activeTab === 'entries' ? 'Fluxo de Caixa' : activeTab === 'references' ? 'Spy Vault' : activeTab === 'offers' ? 'Produtos' : 'Ajustes'}
          </h1>
        </header>

        {activeTab === 'dashboard' && <Dashboard ads={ads} expenses={expenses} recurringExpenses={recurringExpenses} offers={offers} selectedOfferId={selectedOfferId} dateRange={dateRange} />}
        {activeTab === 'entries' && <EntriesPage />}
        {activeTab === 'references' && <ReferencesPage />}
        {activeTab === 'projects' && <ProjectsPage currentUser={currentUser} />}
        {activeTab === 'offers' && <OffersPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
};

export default App;
