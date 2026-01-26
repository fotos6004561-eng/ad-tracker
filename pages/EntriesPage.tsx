
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  Tag, 
  DollarSign, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { AdEntry, ExtraExpense, Offer, ExpenseCategory } from '../types';

export const EntriesPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [expenses, setExpenses] = useState<ExtraExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [adForm, setAdForm] = useState({
    date: new Date().toISOString().split('T')[0],
    offerId: '',
    spend: '',
    revenue: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.BM_GGMAX,
    amount: '',
    description: ''
  });

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [offersRes, adsRes, expRes] = await Promise.all([
        supabase.from('offers').select('*').order('name'),
        supabase.from('ads').select('*').order('date', { ascending: false }).limit(20),
        supabase.from('expenses').select('*').order('date', { ascending: false }).limit(20)
      ]);
      
      if (offersRes.data) setOffers(offersRes.data);
      if (adsRes.data) setAds(adsRes.data.map(a => ({ ...a, offerId: a.offer_id })));
      if (expRes.data) setExpenses(expRes.data);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm.offerId || submitting) return;
    setSubmitting(true);

    if (supabase) {
      try {
        const { error } = await supabase.from('ads').insert([{
          date: adForm.date,
          offer_id: adForm.offerId,
          spend: parseFloat(adForm.spend),
          revenue: parseFloat(adForm.revenue)
        }]);
        if (!error) {
          setAdForm({ ...adForm, spend: '', revenue: '' });
          await fetchData();
        } else {
          alert("Erro ao salvar: " + error.message);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setSubmitting(false);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    if (supabase) {
      try {
        const { error } = await supabase.from('expenses').insert([{
          date: expenseForm.date,
          category: expenseForm.category,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description
        }]);
        if (!error) {
          setExpenseForm({ ...expenseForm, amount: '', description: '' });
          await fetchData();
        } else {
          alert("Erro ao salvar despesa: " + error.message);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setSubmitting(false);
  };

  const deleteAd = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Excluir este registro de anúncio?')) return;
    
    // Atualização otimista: remove da tela primeiro
    const previousAds = [...ads];
    setAds(current => current.filter(ad => ad.id !== id));

    if (supabase) {
      try {
        const { error } = await supabase.from('ads').delete().eq('id', id);
        if (error) {
          console.error("Erro Supabase:", error);
          alert("Erro no servidor ao excluir. O registro será restaurado na tela.");
          setAds(previousAds);
        }
      } catch (err: any) {
        console.error("Erro de conexão:", err);
        // Se for erro de fetch mas o ID sumiu do banco, não precisamos alertar agressivamente
        if (err.name !== 'TypeError') {
           alert("Erro de conexão ao tentar excluir.");
           setAds(previousAds);
        }
      }
    }
  };

  const deleteExpense = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Excluir esta despesa?')) return;

    const previousExpenses = [...expenses];
    setExpenses(current => current.filter(exp => exp.id !== id));

    if (supabase) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) {
          console.error("Erro Supabase:", error);
          alert("Erro no servidor ao excluir.");
          setExpenses(previousExpenses);
        }
      } catch (err) {
        console.error(err);
        setExpenses(previousExpenses);
      }
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* FORMULÁRIO DE ANÚNCIOS (ADS) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={20}/></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Lançar Tráfego Pago</h3>
          </div>
          
          <form onSubmit={handleAdSubmit} className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-xl shadow-emerald-50/50 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <input type="date" value={adForm.date} onChange={e => setAdForm({...adForm, date: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"/>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Oferta / Produto</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                  <select required value={adForm.offerId} onChange={e => setAdForm({...adForm, offerId: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 appearance-none shadow-inner">
                    <option value="">Selecione...</option>
                    {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gasto (Ads)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-sm">R$</span>
                  <input required type="number" step="0.01" value={adForm.spend} onChange={e => setAdForm({...adForm, spend: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner" placeholder="0,00"/>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receita (Vendas)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm">R$</span>
                  <input required type="number" step="0.01" value={adForm.revenue} onChange={e => setAdForm({...adForm, revenue: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 shadow-inner" placeholder="0,00"/>
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={18}/> : <><CheckCircle2 size={18}/> Confirmar Registro</>}
            </button>
          </form>

          {/* LISTA RECENTE ADS */}
          <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Últimos Lançamentos de Ads</h4>
            </div>
            <div className="divide-y divide-gray-50">
              {ads.map(ad => (
                <div key={ad.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-gray-100 p-2 rounded-lg min-w-[50px]">
                       <span className="block text-[10px] font-black text-gray-400 uppercase">{ad.date.split('-')[2]}/{ad.date.split('-')[1]}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{offers.find(o => o.id === ad.offerId)?.name || 'Oferta'}</p>
                      <div className="flex gap-3 text-[10px] font-black uppercase">
                        <span className="text-rose-500">Gasto: R${ad.spend.toFixed(2)}</span>
                        <span className="text-emerald-600">Voltou: R${ad.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => deleteAd(e, ad.id)} className="p-3 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                </div>
              ))}
              {ads.length === 0 && <div className="p-10 text-center text-gray-300 font-bold uppercase text-[10px]">Nenhum registro recente</div>}
            </div>
          </div>
        </div>

        {/* FORMULÁRIO DE DESPESAS EXTRAS */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><TrendingDown size={20}/></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Despesas Extras / Contingência</h3>
          </div>
          
          <form onSubmit={handleExpenseSubmit} className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-xl shadow-rose-50/50 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 shadow-inner"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value as ExpenseCategory})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 appearance-none shadow-inner">
                  {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor do Gasto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-sm">R$</span>
                <input required type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rose-500 shadow-inner" placeholder="0,00"/>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição (Opcional)</label>
              <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 shadow-inner" placeholder="Ex: BM comprada com o João"/>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white font-black uppercase text-xs tracking-[0.2em] py-4 rounded-2xl shadow-xl hover:bg-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={18}/> : <><AlertCircle size={18}/> Registrar Saída</>}
            </button>
          </form>

          {/* LISTA RECENTE DESPESAS */}
          <div className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Últimos Gastos Manuais</h4>
            </div>
            <div className="divide-y divide-gray-50">
              {expenses.map(exp => (
                <div key={exp.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><DollarSign size={16}/></div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{exp.description || exp.category}</p>
                      <div className="flex gap-3 text-[10px] font-black uppercase">
                        <span className="text-gray-400">{exp.date.split('-').reverse().join('/')}</span>
                        <span className="text-rose-500">Valor: R${exp.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => deleteExpense(e, exp.id)} className="p-3 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                </div>
              ))}
              {expenses.length === 0 && <div className="p-10 text-center text-gray-300 font-bold uppercase text-[10px]">Nenhuma despesa recente</div>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
