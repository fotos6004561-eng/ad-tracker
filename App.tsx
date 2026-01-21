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
  RefreshCcw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { AdEntry, ExtraExpense, Offer, ExpenseCategory, DateRangeType, OfferStatus, RecurringExpense } from './types';
import { supabase } from './services/supabaseClient';

const today = new Date().toISOString().split('T')[0];

const App: React.FC = () => {
  // State Initialization
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entries' | 'offers' | 'settings'>('dashboard');
  const [selectedOfferId, setSelectedOfferId] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('last7days');
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [expenses, setExpenses] = useState<ExtraExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  // Form States
  const [newAd, setNewAd] = useState<Partial<AdEntry>>({ date: today });
  const [newExpense, setNewExpense] = useState<Partial<ExtraExpense>>({ date: today, category: ExpenseCategory.OTHER });
  const [newOffer, setNewOffer] = useState<Partial<Offer>>({ status: OfferStatus.PRODUCING });
  const [newRecurring, setNewRecurring] = useState<Partial<RecurringExpense>>({ category: ExpenseCategory.TOOLS });

  // --- SUPABASE DATA FETCHING ---
  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const [offersRes, adsRes, expensesRes, recurringRes] = await Promise.all([
        supabase.from('offers').select('*'),
        supabase.from('ads').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('recurring_expenses').select('*')
      ]);

      if (offersRes.error) throw offersRes.error;
      if (adsRes.error) throw adsRes.error;
      
      if (offersRes.data) setOffers(offersRes.data.map((o: any) => ({
          ...o,
          productPrice: o.product_price, // Map snake_case from DB to camelCase
          productCost: o.product_cost
      })));
      
      if (adsRes.data) setAds(adsRes.data.map((a: any) => ({
          ...a,
          offerId: a.offer_id // Map snake_case
      })));
      
      if (expensesRes.data) setExpenses(expensesRes.data);
      
      if (recurringRes.data) setRecurringExpenses(recurringRes.data.map((r: any) => ({
          ...r,
          dayOfMonth: r.day_of_month // Map snake_case
      })));

    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      alert('Erro de conexão com Supabase: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLERS (Async Supabase) ---

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return alert('Supabase não configurado.');

    if (newAd.date && newAd.offerId && newAd.spend !== undefined && newAd.revenue !== undefined) {
      const payload = {
        date: newAd.date,
        offer_id: newAd.offerId,
        spend: newAd.spend,
        revenue: newAd.revenue
      };

      const { data, error } = await supabase.from('ads').insert([payload]).select();

      if (error) {
        alert('Erro ao salvar anúncio: ' + error.message);
      } else if (data) {
        // Optimistic update or refetch
        const newEntry = { ...data[0], offerId: data[0].offer_id };
        setAds([...ads, newEntry]);
        setNewAd({ date: today });
        alert('Registro de tráfego adicionado!');
      }
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return alert('Supabase não configurado.');

    if (newExpense.date && newExpense.category && newExpense.amount !== undefined) {
       const payload = {
          date: newExpense.date,
          category: newExpense.category,
          amount: newExpense.amount,
          description: newExpense.description
       };

       const { data, error } = await supabase.from('expenses').insert([payload]).select();

       if (error) {
         alert('Erro ao salvar despesa: ' + error.message);
       } else if (data) {
         setExpenses([...expenses, data[0]]);
         setNewExpense({ date: today, category: ExpenseCategory.OTHER });
         alert('Despesa extra registrada!');
       }
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return alert('Supabase não configurado.');

    if (newOffer.name && newOffer.status) {
       const payload = {
          name: newOffer.name,
          status: newOffer.status,
          product_price: newOffer.productPrice || 0,
          product_cost: newOffer.productCost || 0
       };

       const { data, error } = await supabase.from('offers').insert([payload]).select();

       if (error) {
         alert('Erro ao criar oferta: ' + error.message);
       } else if (data) {
         const created = { ...data[0], productPrice: data[0].product_price, productCost: data[0].product_cost };
         setOffers([...offers, created]);
         setNewOffer({ status: OfferStatus.PRODUCING, name: '', productPrice: undefined, productCost: undefined });
         alert('Nova oferta cadastrada!');
       }
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return alert('Supabase não configurado.');

    if (newRecurring.name && newRecurring.amount && newRecurring.dayOfMonth) {
      const payload = {
          name: newRecurring.name,
          amount: newRecurring.amount,
          day_of_month: newRecurring.dayOfMonth,
          category: newRecurring.category
      };

      const { data, error } = await supabase.from('recurring_expenses').insert([payload]).select();

      if (error) {
        alert('Erro ao criar recorrente: ' + error.message);
      } else if (data) {
        const created = { ...data[0], dayOfMonth: data[0].day_of_month };
        setRecurringExpenses([...recurringExpenses, created]);
        setNewRecurring({ category: ExpenseCategory.TOOLS, name: '', amount: undefined, dayOfMonth: undefined });
        alert('Custo recorrente adicionado!');
      }
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!supabase) return;
    if(confirm('Remover este custo recorrente?')) {
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
      if (!error) {
          setRecurringExpenses(recurringExpenses.filter(r => r.id !== id));
      } else {
          alert('Erro ao deletar: ' + error.message);
      }
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!supabase) return;
    if(confirm('ATENÇÃO: Deletar esta oferta não apaga os registros financeiros dela, mas pode causar inconsistências visuais. Continuar?')) {
        const { error } = await supabase.from('offers').delete().eq('id', id);
        if(!error) {
            setOffers(offers.filter(o => o.id !== id));
        } else {
            alert('Erro ao deletar: ' + error.message);
        }
    }
  };

  // Helper to calculate total ROI per offer for the Offers List
  const offersWithStats = useMemo(() => {
    return offers.map(offer => {
      const offerAds = ads.filter(a => a.offerId === offer.id);
      const totalSpend = offerAds.reduce((acc, curr) => acc + curr.spend, 0);
      const totalRevenue = offerAds.reduce((acc, curr) => acc + curr.revenue, 0);
      const profit = totalRevenue - totalSpend;
      const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;
      
      // Feature 10: Break Even Calculations
      let breakEvenRoas = 0;
      let maxCPA = 0;
      
      if (offer.productPrice && offer.productPrice > 0) {
         const cost = offer.productCost || 0;
         const margin = offer.productPrice - cost;
         if (margin > 0) {
            maxCPA = margin;
            breakEvenRoas = offer.productPrice / margin;
         }
      }

      return { ...offer, totalSpend, totalRevenue, profit, roi, breakEvenRoas, maxCPA };
    });
  }, [offers, ads]);

  const dateRangeLabels: Record<DateRangeType, string> = {
      today: 'Hoje',
      yesterday: 'Ontem',
      last3days: 'Últimos 3 dias',
      last7days: 'Últimos 7 dias',
      last30days: 'Últimos 30 dias',
      thisMonth: 'Este Mês',
      allTime: 'Todo o Período'
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

  // --- RENDER SAFEGUARDS ---
  
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg border border-red-100">
           <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-500" size={32} />
           </div>
           <h2 className="text-xl font-bold text-gray-900 mb-2">Conexão Pendente</h2>
           <p className="text-gray-600 mb-6">
             O aplicativo está configurado para usar o <strong>Supabase</strong>, mas não encontrou as chaves de API.
           </p>
           <div className="bg-gray-900 text-gray-300 text-left p-4 rounded-lg text-sm font-mono overflow-x-auto mb-6">
              VITE_SUPABASE_URL=...<br/>
              VITE_SUPABASE_ANON_KEY=...
           </div>
           <p className="text-sm text-gray-500">
             Adicione essas variáveis ao seu arquivo <code>.env</code> local ou nas configurações da Vercel.
           </p>
         </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500">
         <Loader2 className="animate-spin mb-2 text-indigo-600" size={32} />
         <p>Conectando ao banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
            <PieChart size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg hidden lg:block tracking-tight text-gray-900">AdTracker Pro</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <LayoutDashboard size={20} />
            <span className="hidden lg:block">Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('offers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'offers' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <ShoppingBag size={20} />
            <span className="hidden lg:block">Ofertas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('entries')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'entries' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <PlusCircle size={20} />
            <span className="hidden lg:block">Registros</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
           <button 
             onClick={() => setActiveTab('settings')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}
           >
              <Settings size={20} />
              <span className="hidden lg:block text-sm">Configurações</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        
        {/* Header Bar */}
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'dashboard' ? 'Painel de Controle' : 
               activeTab === 'offers' ? 'Gestão de Ofertas' : 
               activeTab === 'settings' ? 'Configurações' : 'Novos Lançamentos'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'offers' ? 'Gerencie seus produtos, custos e validação.' : 
               activeTab === 'settings' ? 'Gerencie custos recorrentes e preferências.' :
               'Visão consolidada da operação.'}
            </p>
          </div>

          {activeTab === 'dashboard' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              {/* Date Range Selector */}
              <div className="relative group min-w-[180px]">
                 <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 cursor-pointer hover:border-gray-300 shadow-sm transition-all">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} />
                        <span className="text-sm font-medium">{dateRangeLabels[dateRange]}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                 </div>
                 <div className="absolute right-0 top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                    {(Object.keys(dateRangeLabels) as DateRangeType[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setDateRange(key)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${dateRange === key ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-600'}`}
                        >
                            {dateRangeLabels[key]}
                        </button>
                    ))}
                 </div>
              </div>

              {/* Offer Selector */}
              <div className="relative group min-w-[200px]">
                <div className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 cursor-pointer hover:border-gray-300 shadow-sm transition-all">
                  <span className="text-sm font-medium text-gray-600 truncate max-w-[160px]">
                    {selectedOfferId === 'all' ? 'Todas as Ofertas' : offers.find(o => o.id === selectedOfferId)?.name}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </div>
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button 
                    onClick={() => setSelectedOfferId('all')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 first:rounded-t-lg font-medium"
                  >
                    Todas as Ofertas
                  </button>
                  {offers.map(offer => (
                    <button 
                      key={offer.id}
                      onClick={() => setSelectedOfferId(offer.id)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 last:rounded-b-lg border-t border-gray-50"
                    >
                      {offer.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </header>

        {activeTab === 'dashboard' ? (
          <Dashboard 
            ads={ads}
            expenses={expenses}
            recurringExpenses={recurringExpenses}
            offers={offers}
            selectedOfferId={selectedOfferId}
            dateRange={dateRange}
          />
        ) : activeTab === 'settings' ? (
           <div className="max-w-4xl animate-fade-in space-y-8">
              {/* Recurring Expenses Manager */}
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-3 bg-purple-50 rounded-xl">
                      <RefreshCcw className="text-purple-600" size={24} />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-gray-900">Custos Fixos / Recorrentes</h2>
                     <p className="text-sm text-gray-500">Adicione custos mensais (ferramentas, equipe) para serem calculados automaticamente.</p>
                   </div>
                </div>

                <form onSubmit={handleAddRecurring} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                   <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                      <input type="text" required placeholder="Ex: Shopify" value={newRecurring.name || ''} onChange={e => setNewRecurring({...newRecurring, name: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm" />
                   </div>
                   <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Dia do Mês (Cobrança)</label>
                      <input type="number" min="1" max="31" required placeholder="Ex: 10" value={newRecurring.dayOfMonth || ''} onChange={e => setNewRecurring({...newRecurring, dayOfMonth: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm" />
                   </div>
                   <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Valor (R$)</label>
                      <input type="number" step="0.01" required placeholder="0.00" value={newRecurring.amount || ''} onChange={e => setNewRecurring({...newRecurring, amount: parseFloat(e.target.value)})} className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm" />
                   </div>
                   <div className="flex items-end">
                      <button type="submit" className="w-full bg-purple-600 text-white font-medium py-2 rounded hover:bg-purple-700 transition">Adicionar</button>
                   </div>
                </form>

                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-100 text-gray-500 font-semibold">
                       <tr>
                         <th className="p-3">Nome</th>
                         <th className="p-3">Dia</th>
                         <th className="p-3 text-right">Valor</th>
                         <th className="p-3 text-center">Ação</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-200">
                       {recurringExpenses.map(item => (
                         <tr key={item.id}>
                           <td className="p-3 font-medium text-gray-800">{item.name}</td>
                           <td className="p-3">Dia {item.dayOfMonth}</td>
                           <td className="p-3 text-right">R$ {item.amount.toFixed(2)}</td>
                           <td className="p-3 text-center">
                             <button onClick={() => handleDeleteRecurring(item.id)} className="text-red-500 hover:text-red-700 p-1">
                               <Trash2 size={16} />
                             </button>
                           </td>
                         </tr>
                       ))}
                       {recurringExpenses.length === 0 && (
                         <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum custo recorrente cadastrado.</td></tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
           </div>
        ) : activeTab === 'offers' ? (
          <div className="max-w-6xl animate-fade-in space-y-8">
             
             {/* Offer Creation Form */}
             <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-3 bg-indigo-50 rounded-xl">
                      <Target className="text-indigo-600" size={24} />
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">Cadastrar Nova Oferta</h2>
                </div>
                <form onSubmit={handleAddOffer} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da Oferta</label>
                    <input 
                      type="text" required placeholder="Ex: Encapsulado X"
                      value={newOffer.name || ''} onChange={e => setNewOffer({...newOffer, name: e.target.value})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ticket (Preço)</label>
                    <input 
                      type="number" step="0.01" placeholder="0.00"
                      value={newOffer.productPrice || ''} onChange={e => setNewOffer({...newOffer, productPrice: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">CMV (Custo)</label>
                    <input 
                      type="number" step="0.01" placeholder="0.00"
                      value={newOffer.productCost || ''} onChange={e => setNewOffer({...newOffer, productCost: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                    <select 
                      required value={newOffer.status} onChange={e => setNewOffer({...newOffer, status: e.target.value as OfferStatus})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {Object.values(OfferStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <button type="submit" className="w-full h-[46px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all shadow-md shadow-indigo-200">
                      Adicionar
                    </button>
                  </div>
                </form>
             </div>

             {/* Offers List */}
             <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Minhas Ofertas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 font-semibold">
                      <tr>
                        <th className="p-4">Nome da Oferta</th>
                        <th className="p-4 text-center">Break-Even</th>
                        <th className="p-4 text-center">CPA Máx</th>
                        <th className="p-4 text-right">Investimento</th>
                        <th className="p-4 text-right">Retorno</th>
                        <th className="p-4 text-right">ROI</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {offersWithStats.map((offer) => (
                        <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{offer.name}</div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(offer.status)}`}>
                              {offer.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {offer.breakEvenRoas > 0 ? (
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-xs font-bold">
                                    ROAS {offer.breakEvenRoas.toFixed(2)}
                                </span>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-center">
                            {offer.maxCPA > 0 ? (
                                <span className="text-gray-700 font-semibold">R$ {offer.maxCPA.toFixed(2)}</span>
                            ) : '-'}
                          </td>
                          <td className="p-4 text-right">R$ {offer.totalSpend.toFixed(2)}</td>
                          <td className="p-4 text-right">R$ {offer.totalRevenue.toFixed(2)}</td>
                          <td className="p-4 text-right font-bold">
                             <span className={`${offer.roi >= 100 ? 'text-emerald-600' : offer.roi > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                {offer.roi.toFixed(0)}%
                             </span>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteOffer(offer.id)} className="text-gray-400 hover:text-red-600 transition">
                                <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl animate-fade-in">
            
            {/* Form 1: Ad Spend & Revenue */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-blue-50 rounded-xl">
                    <ActivityIcon className="text-blue-600" size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900">Registrar Tráfego (Ads)</h2>
              </div>
              
              <form onSubmit={handleAddAd} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data</label>
                  <input 
                    type="date" 
                    required
                    value={newAd.date}
                    onChange={e => setNewAd({...newAd, date: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Oferta</label>
                  <select 
                    required
                    value={newAd.offerId || ''}
                    onChange={e => setNewAd({...newAd, offerId: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="">Selecione a Oferta...</option>
                    {offers.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Investido (R$)</label>
                    <input 
                      type="number" step="0.01" required placeholder="0.00"
                      value={newAd.spend || ''}
                      onChange={e => setNewAd({...newAd, spend: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Retorno (R$)</label>
                    <input 
                      type="number" step="0.01" required placeholder="0.00"
                      value={newAd.revenue || ''}
                      onChange={e => setNewAd({...newAd, revenue: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md shadow-blue-200 mt-4">
                  Salvar Dados
                </button>
              </form>
            </div>

            {/* Form 2: Extra Expenses */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-rose-50 rounded-xl">
                    <Wallet className="text-rose-600" size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900">Gastos Operacionais</h2>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data</label>
                  <input 
                    type="date" required
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
                  <select 
                    required
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  >
                    {Object.values(ExpenseCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor (R$)</label>
                    <input 
                      type="number" step="0.01" required placeholder="0.00"
                      value={newExpense.amount || ''}
                      onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                    />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição (Opcional)</label>
                  <input 
                    type="text" placeholder="Ex: Compra de 5 perfis"
                    value={newExpense.description || ''}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                  />
                </div>

                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-lg transition-all shadow-md shadow-rose-200 mt-4">
                  Registrar Despesa
                </button>
              </form>
            </div>

            {/* Quick List of Recent */}
            <div className="lg:col-span-2 mt-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Últimos Registros</h3>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-4">Data</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Detalhe</th>
                      <th className="p-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ...ads.map(a => ({date: a.date, type: 'Tráfego', detail: offers.find(o => o.id === a.offerId)?.name, val: -a.spend})),
                      ...ads.map(a => ({date: a.date, type: 'Venda', detail: offers.find(o => o.id === a.offerId)?.name, val: a.revenue})),
                      ...expenses.map(e => ({date: e.date, type: 'Despesa', detail: e.category, val: -e.amount}))
                    ].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5).map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{item.date}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            item.type === 'Venda' ? 'bg-emerald-100 text-emerald-700' : 
                            item.type === 'Tráfego' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700">{item.detail}</td>
                        <td className={`p-4 text-right font-bold ${item.val > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                           {item.val > 0 ? '+' : ''} R$ {Math.abs(item.val).toFixed(2)}
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

// Helper for icon
const ActivityIcon = ({className, size}: {className?: string, size: number}) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
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
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
);

export default App;