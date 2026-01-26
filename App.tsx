
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Wallet, 
  Settings, 
  ChevronDown,
  PieChart,
  ShoppingBag,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  FileSearch,
  FolderKanban,
  RefreshCw
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ReferencesPage } from './pages/ReferencesPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { OffersPage } from './pages/OffersPage';
import { SettingsPage } from './pages/SettingsPage';
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

const ActivityIcon = ({className, size}: {className?: string, size: number}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedOfferId, setSelectedOfferId] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('last7days');
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [expenses, setExpenses] = useState<ExtraExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const [newAd, setNewAd] = useState<Partial<AdEntry>>({ date: today });
  const [newExpense, setNewExpense] = useState<Partial<ExtraExpense>>({ date: today, category: ExpenseCategory.OTHER });

  const migrateLocalData = async () => {
    if (!supabase) return;
    const localRefs = localStorage.getItem('adtracker_pro_references');
    const localProjs = localStorage.getItem('adtracker_pro_projects_v2');
    if (!localRefs && !localProjs) return;

    setMigrating(true);
    try {
      if (localRefs) {
        const refs = JSON.parse(localRefs);
        const toInsert = refs.map((r: any) => ({
          title: r.title, niche: r.niche, source: r.source, image_url: r.imageUrl || r.image_url, link: r.link
        }));
        await supabase.from('reference_vault').insert(toInsert);
        localStorage.removeItem('adtracker_pro_references');
      }
      if (localProjs) {
        const projs = JSON.parse(localProjs);
        for (const p of projs) {
          const { data: newProj } = await supabase.from('projects').insert({
            name: p.name, status: p.status, progress: p.progress
          }).select();
          if (newProj && p.tasks && p.tasks.length > 0) {
            const tasksToInsert = p.tasks.map((t: any) => ({
              project_id: newProj[0].id, text: t.text, completed: t.completed, assignee: t.assignee
            }));
            await supabase.from('tasks').insert(tasksToInsert);
          }
        }
        localStorage.removeItem('adtracker_pro_projects_v2');
      }
    } catch (e) { console.error("Erro na migração:", e); } 
    finally { setMigrating(false); }
  };

  const fetchData = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      setLoading(true);
      await migrateLocalData();
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
    } catch (e) { console.error('Erro ao buscar dados:', e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeTab]); // Recarrega ao trocar de aba para garantir dados frescos

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (newAd.date && newAd.offerId && newAd.spend !== undefined && newAd.revenue !== undefined) {
      const { data, error } = await supabase.from('ads').insert([{ 
        date: newAd.date, offer_id: newAd.offerId, spend: newAd.spend, revenue: newAd.revenue 
      }]).select();
      if (data) { 
        setAds(prev => [...prev, { ...data[0], offerId: data[0].offer_id }]); 
        setNewAd({ date: today }); 
      }
    }
  };

  const handleUpdateAdFixed = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('ads').update({ 
      spend: editForm.spend, revenue: editForm.revenue, date: editForm.date 
    }).eq('id', id);
    if (!error) {
      setAds(prev => prev.map(a => a.id === id ? { ...a, ...editForm } : a));
      setEditingId(null);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!supabase) return;
    if(confirm('Excluir este registro?')) {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (!error) setAds(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (newExpense.date && newExpense.category && newExpense.amount !== undefined) {
       const { data, error } = await supabase.from('expenses').insert([{ 
         date: newExpense.date, category: newExpense.category, amount: newExpense.amount, description: newExpense.description 
       }]).select();
       if (data) { 
         setExpenses(prev => [...prev, data[0]]); 
         setNewExpense({ date: today, category: ExpenseCategory.OTHER }); 
       }
    }
  };

  const handleUpdateExpense = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('expenses').update({ 
      amount: editForm.amount, description: editForm.description, date: editForm.date 
    }).eq('id', id);
    if (!error) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...editForm } : e));
      setEditingId(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!supabase) return;
    if(confirm('Excluir esta despesa?')) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  if (loading || migrating) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500">
      <RefreshCw className="animate-spin mb-4 text-indigo-600" size={40} />
      <h2 className="text-xl font-bold text-gray-900">{migrating ? 'Sincronizando Dados...' : 'Carregando AdTracker Pro...'}</h2>
      <p className="mt-2">{migrating ? 'Migrando seu histórico local para a nuvem de forma segura.' : 'Preparando seu painel de tráfego.'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 transition-all duration-300 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200"><PieChart size={20} className="text-white" /></div>
          <span className="font-bold text-lg hidden lg:block tracking-tight">AdTracker Pro</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={ShoppingBag} label="Ofertas" active={activeTab === 'offers'} onClick={() => setActiveTab('offers')} />
          <SidebarLink icon={PlusCircle} label="Registros" active={activeTab === 'entries'} onClick={() => setActiveTab('entries')} />
          <div className="pt-4 border-t border-gray-50 mt-2">
            <span className="hidden lg:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-4">Ferramentas</span>
            <SidebarLink icon={FileSearch} label="Spy Vault" active={activeTab === 'references'} onClick={() => setActiveTab('references')} />
            <SidebarLink icon={FolderKanban} label="Projetos" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100"><SidebarLink icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} /></div>
      </aside>

      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' ? 'Dashboard Financeiro' : activeTab === 'projects' ? 'Project Tracker' : activeTab === 'entries' ? 'Gestão de Registros' : activeTab === 'references' ? 'Spy Vault (Referências)' : activeTab === 'offers' ? 'Gestão de Ofertas' : 'Configurações'}
            </h1>
            {activeTab === 'dashboard' && (
              <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRangeType)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="last7days">Últimos 7 dias</option><option value="last30days">Últimos 30 dias</option><option value="thisMonth">Este Mês</option><option value="allTime">Todo Período</option>
              </select>
            )}
        </header>

        {activeTab === 'dashboard' && <Dashboard ads={ads} expenses={expenses} recurringExpenses={recurringExpenses} offers={offers} selectedOfferId={selectedOfferId} dateRange={dateRange} />}
        {activeTab === 'references' && <ReferencesPage />}
        {activeTab === 'projects' && <ProjectsPage />}
        {activeTab === 'offers' && <OffersPage />}
        {activeTab === 'settings' && <SettingsPage />}
        
        {activeTab === 'entries' && (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-600"><ActivityIcon size={20}/> Registrar Ads</h2>
                    <form onSubmit={handleAddAd} className="space-y-3">
                       <input type="date" required value={newAd.date} onChange={e => setNewAd({...newAd, date: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" />
                       <select required value={newAd.offerId || ''} onChange={e => setNewAd({...newAd, offerId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5">
                         <option value="">Selecione a Oferta...</option>
                         {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                       </select>
                       <div className="flex gap-3">
                          <input type="number" step="0.01" placeholder="Gasto R$" value={newAd.spend || ''} onChange={e => setNewAd({...newAd, spend: parseFloat(e.target.value)})} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5" />
                          <input type="number" step="0.01" placeholder="Faturamento R$" value={newAd.revenue || ''} onChange={e => setNewAd({...newAd, revenue: parseFloat(e.target.value)})} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5" />
                       </div>
                       <button className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Salvar no Banco</button>
                    </form>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-600"><Wallet size={20}/> Gastos Extras</h2>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                       <input type="date" required value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" />
                       <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5">
                         {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                       <input type="number" step="0.01" placeholder="Valor R$" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" />
                       <input type="text" placeholder="Ex: Compra de 5 perfis" value={newExpense.description || ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" />
                       <button className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-black transition-all">Registrar Gasto</button>
                    </form>
                 </div>
             </div>
             
             <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900">Histórico de Movimentações</h3></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr><th className="p-4 font-bold text-gray-500">Data</th><th className="p-4 font-bold text-gray-500">Tipo</th><th className="p-4 font-bold text-gray-500">Detalhe</th><th className="p-4 text-right font-bold text-gray-500">Valores</th><th className="p-4 text-center"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[
                            ...ads.map(a => ({...a, type: 'Ad', detail: offers.find(o => o.id === a.offerId)?.name || 'Oferta Excluída', val: -a.spend, rev: a.revenue})),
                            ...expenses.map(e => ({...e, type: 'Exp', detail: e.category, val: -e.amount}))
                            ].sort((a,b) => b.date.localeCompare(a.date)).map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 group transition-colors">
                                    <td className="p-4">{editingId === item.id ? <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="border rounded px-2 py-1"/> : item.date.split('-').reverse().join('/')}</td>
                                    <td className="p-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.type === 'Ad' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {item.type === 'Ad' ? 'Anúncio' : 'Extra'}
                                      </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">{item.detail}</td>
                                    <td className="p-4 text-right">
                                        {editingId === item.id ? (
                                            <div className="flex flex-col gap-1">
                                                {item.type === 'Ad' ? <>
                                                    <input type="number" value={editForm.spend} onChange={e => setEditForm({...editForm, spend: parseFloat(e.target.value)})} className="border rounded px-2 py-1 w-24 ml-auto" />
                                                    <input type="number" value={editForm.revenue} onChange={e => setEditForm({...editForm, revenue: parseFloat(e.target.value)})} className="border rounded px-2 py-1 w-24 ml-auto" />
                                                </> : <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})} className="border rounded px-2 py-1 w-24 ml-auto" />}
                                            </div>
                                        ) : <div className="flex flex-col">{item.type === 'Ad' ? <><span className="text-emerald-600 font-bold">R$ {item.rev.toFixed(2)}</span><span className="text-gray-400 text-[10px]">Gasto: R$ {Math.abs(item.val).toFixed(2)}</span></> : <span className="text-rose-600 font-bold">R$ {Math.abs(item.val).toFixed(2)}</span>}</div>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {editingId === item.id ? (
                                                <><button onClick={() => item.type === 'Ad' ? handleUpdateAdFixed(item.id) : handleUpdateExpense(item.id)} className="text-emerald-600 p-2"><Check size={18}/></button><button onClick={() => setEditingId(null)} className="text-gray-400 p-2"><X size={18}/></button></>
                                            ) : (
                                                <><button onClick={() => startEditing(item)} className="text-indigo-600 p-2"><Edit2 size={18}/></button><button onClick={() => item.type === 'Ad' ? handleDeleteAd(item.id) : handleDeleteExpense(item.id)} className="text-rose-500 p-2"><Trash2 size={18}/></button></>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
