
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Wallet, 
  Settings, 
  ChevronDown,
  PieChart,
  Calendar,
  ShoppingBag,
  Target,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCcw,
  Loader2,
  AlertTriangle,
  FileSearch,
  FolderKanban
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ReferencesPage } from './pages/ReferencesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AdEntry, ExtraExpense, Offer, ExpenseCategory, DateRangeType, OfferStatus, RecurringExpense } from './types';
import { supabase } from './services/supabaseClient';

const today = new Date().toISOString().split('T')[0];

type TabType = 'dashboard' | 'entries' | 'offers' | 'settings' | 'references' | 'projects';

const SidebarLink = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
    <Icon size={20} className={active ? 'text-indigo-600' : 'text-gray-400'} />
    <span className="hidden lg:block whitespace-nowrap">{label}</span>
  </button>
);

const Dropdown = ({ label, icon: Icon, children }: { label: string, icon: any, children?: React.ReactNode }) => (
  <div className="relative group min-w-[180px]">
    <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-gray-300 shadow-sm transition-all">
      <div className="flex items-center gap-2 text-gray-600"><Icon size={16} /><span className="text-sm font-bold truncate max-w-[140px]">{label}</span></div>
      <ChevronDown size={16} className="text-gray-400" />
    </div>
    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">{children}</div>
  </div>
);

const ActivityIcon = ({className, size}: {className?: string, size: number}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedOfferId, setSelectedOfferId] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('last7days');
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [expenses, setExpenses] = useState<ExtraExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // Form States
  const [newAd, setNewAd] = useState<Partial<AdEntry>>({ date: today });
  const [newExpense, setNewExpense] = useState<Partial<ExtraExpense>>({ date: today, category: ExpenseCategory.OTHER });
  const [newOffer, setNewOffer] = useState<Partial<Offer>>({ status: OfferStatus.PRODUCING });
  const [newRecurring, setNewRecurring] = useState<Partial<RecurringExpense>>({ category: ExpenseCategory.TOOLS });

  const fetchData = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      setLoading(true);
      const [offersRes, adsRes, expensesRes, recurringRes] = await Promise.all([
        supabase.from('offers').select('*'),
        supabase.from('ads').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('recurring_expenses').select('*')
      ]);
      if (offersRes.data) setOffers(offersRes.data.map((o: any) => ({ ...o, productPrice: o.product_price, productCost: o.product_cost })));
      if (adsRes.data) setAds(adsRes.data.map((a: any) => ({ ...a, offerId: a.offer_id })));
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (recurringRes.data) setRecurringExpenses(recurringRes.data.map((r: any) => ({ ...r, dayOfMonth: r.day_of_month })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return alert('Modo Visualização');
    if (newAd.date && newAd.offerId && newAd.spend !== undefined && newAd.revenue !== undefined) {
      const { data, error } = await supabase.from('ads').insert([{ date: newAd.date, offer_id: newAd.offerId, spend: newAd.spend, revenue: newAd.revenue }]).select();
      if (data) { setAds([...ads, { ...data[0], offerId: data[0].offer_id }]); setNewAd({ date: today }); }
    }
  };

  const handleUpdateAd = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('ads').update({ spend: editForm.spend, revenue: editForm.revenue, date: editForm.date }).eq('id', id);
    if (!error) {
      setAds(ads.map(a => a.id === id ? { ...a, ...editForm } : a));
      setEditingId(null);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!supabase) return;
    if(confirm('Excluir este registro?')) {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (!error) setAds(ads.filter(a => a.id !== id));
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (newExpense.date && newExpense.category && newExpense.amount !== undefined) {
       const { data, error } = await supabase.from('expenses').insert([{ date: newExpense.date, category: newExpense.category, amount: newExpense.amount, description: newExpense.description }]).select();
       if (data) { setExpenses([...expenses, data[0]]); setNewExpense({ date: today, category: ExpenseCategory.OTHER }); }
    }
  };

  const handleUpdateExpense = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('expenses').update({ amount: editForm.amount, description: editForm.description, date: editForm.date }).eq('id', id);
    if (!error) {
      setExpenses(expenses.map(e => e.id === id ? { ...e, ...editForm } : e));
      setEditingId(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!supabase) return;
    if(confirm('Excluir esta despesa?')) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (!error) setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const offersWithStats = useMemo(() => {
    return offers.map(offer => {
      const offerAds = ads.filter(a => a.offerId === offer.id);
      const totalSpend = offerAds.reduce((acc, curr) => acc + curr.spend, 0);
      const totalRevenue = offerAds.reduce((acc, curr) => acc + curr.revenue, 0);
      const profit = totalRevenue - totalSpend;
      const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;
      let breakEvenRoas = 0; let maxCPA = 0;
      if (offer.productPrice && offer.productPrice > 0) {
         const cost = offer.productCost || 0;
         const margin = offer.productPrice - cost;
         if (margin > 0) { maxCPA = margin; breakEvenRoas = offer.productPrice / margin; }
      }
      return { ...offer, totalSpend, totalRevenue, profit, roi, breakEvenRoas, maxCPA };
    });
  }, [offers, ads]);

  const dateRangeLabels: Record<DateRangeType, string> = {
      today: 'Hoje', yesterday: 'Ontem', last3days: 'Últimos 3 dias', 
      last7days: 'Últimos 7 dias', last30days: 'Últimos 30 dias', 
      thisMonth: 'Este Mês', allTime: 'Todo o Período'
  };

  const getStatusColor = (status: OfferStatus) => {
    switch (status) {
        case OfferStatus.RUNNING: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case OfferStatus.VALIDATED: return 'bg-blue-100 text-blue-700 border-blue-200';
        case OfferStatus.TESTING: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case OfferStatus.PRODUCING: return 'bg-amber-100 text-amber-700 border-amber-200';
        case OfferStatus.PAUSED: return 'bg-gray-100 text-gray-600 border-gray-200';
        default: return 'bg-gray-100 text-gray-600';
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500"><Loader2 className="animate-spin mb-2 text-indigo-600" size={32} /><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg"><PieChart size={20} className="text-white" /></div><span className="font-bold text-lg hidden lg:block">AdTracker Pro</span></div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={ShoppingBag} label="Ofertas" active={activeTab === 'offers'} onClick={() => setActiveTab('offers')} />
          <SidebarLink icon={PlusCircle} label="Registros" active={activeTab === 'entries'} onClick={() => setActiveTab('entries')} />
          <div className="pt-4 border-t border-gray-50 mt-2">
            <SidebarLink icon={FileSearch} label="Spy Vault" active={activeTab === 'references'} onClick={() => setActiveTab('references')} />
            <SidebarLink icon={FolderKanban} label="Projetos" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100"><SidebarLink icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} /></div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'projects' ? 'Project Tracker' : activeTab === 'entries' ? 'Registros' : 'Gestão'}
            </h1>
        </header>

        {activeTab === 'dashboard' && <Dashboard ads={ads} expenses={expenses} recurringExpenses={recurringExpenses} offers={offers} selectedOfferId={selectedOfferId} dateRange={dateRange} />}
        {activeTab === 'references' && <ReferencesPage />}
        {activeTab === 'projects' && <ProjectsPage />}
        
        {activeTab === 'entries' && (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ActivityIcon size={20} className="text-blue-600"/> Ads</h2>
                    <form onSubmit={handleAddAd} className="space-y-3">
                       <input type="date" required value={newAd.date} onChange={e => setNewAd({...newAd, date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                       <select required value={newAd.offerId || ''} onChange={e => setNewAd({...newAd, offerId: e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Oferta...</option>{offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                       <div className="flex gap-3"><input type="number" step="0.01" placeholder="Investido" value={newAd.spend || ''} onChange={e => setNewAd({...newAd, spend: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-3 py-2" /><input type="number" step="0.01" placeholder="Retorno" value={newAd.revenue || ''} onChange={e => setNewAd({...newAd, revenue: parseFloat(e.target.value)})} className="flex-1 border rounded-lg px-3 py-2" /></div>
                       <button className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg">Salvar</button>
                    </form>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wallet size={20} className="text-rose-600"/> Despesas</h2>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                       <input type="date" required value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                       <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})} className="w-full border rounded-lg px-3 py-2">{Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}</select>
                       <input type="number" step="0.01" placeholder="Valor" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2" />
                       <input type="text" placeholder="Descrição" value={newExpense.description || ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                       <button className="w-full bg-rose-600 text-white font-bold py-2.5 rounded-lg">Registrar</button>
                    </form>
                 </div>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr><th className="p-4">Data</th><th className="p-4">Tipo</th><th className="p-4">Detalhe</th><th className="p-4 text-right">Valor</th><th className="p-4 text-center">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {[
                          ...ads.map(a => ({...a, type: 'Ad', detail: offers.find(o => o.id === a.offerId)?.name, val: -a.spend, rev: a.revenue})),
                          ...expenses.map(e => ({...e, type: 'Exp', detail: e.category, val: -e.amount}))
                        ].sort((a,b) => b.date.localeCompare(a.date)).map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="p-4">
                                    {editingId === item.id ? 
                                        <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="border rounded px-1"/> : 
                                        item.date
                                    }
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.type === 'Ad' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="p-4 font-medium">{item.detail}</td>
                                <td className="p-4 text-right">
                                    {editingId === item.id ? (
                                        <div className="flex flex-col gap-1 items-end">
                                            {item.type === 'Ad' ? (
                                                <>
                                                    <input type="number" value={editForm.spend} onChange={e => setEditForm({...editForm, spend: parseFloat(e.target.value)})} className="w-20 border rounded px-1 text-right" />
                                                    <input type="number" value={editForm.revenue} onChange={e => setEditForm({...editForm, revenue: parseFloat(e.target.value)})} className="w-20 border rounded px-1 text-right" />
                                                </>
                                            ) : (
                                                <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} className="w-20 border rounded px-1 text-right" />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="font-bold">
                                            {item.type === 'Ad' ? `R$ ${item.rev.toFixed(2)} (Ret) / R$ ${Math.abs(item.val).toFixed(2)} (Gasto)` : `R$ ${Math.abs(item.val).toFixed(2)}`}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        {editingId === item.id ? (
                                            <>
                                                <button onClick={() => item.type === 'Ad' ? handleUpdateAd(item.id) : handleUpdateExpense(item.id)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg"><Check size={16}/></button>
                                                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-50 p-1.5 rounded-lg"><X size={16}/></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEditing(item)} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={16}/></button>
                                                <button onClick={() => item.type === 'Ad' ? handleDeleteAd(item.id) : handleDeleteExpense(item.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
