
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Calendar, Loader2, Info } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { RecurringExpense, ExpenseCategory } from '../types';

export const SettingsPage: React.FC = () => {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRec, setNewRec] = useState<Partial<RecurringExpense>>({ category: ExpenseCategory.TOOLS, dayOfMonth: 1 });

  const fetchRecurring = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from('recurring_expenses').select('*');
    if (data) setRecurring(data.map(r => ({ ...r, dayOfMonth: r.day_of_month })));
    setLoading(false);
  };

  useEffect(() => { fetchRecurring(); }, []);

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const { data, error } = await supabase.from('recurring_expenses').insert([{
      name: newRec.name,
      amount: newRec.amount,
      day_of_month: newRec.dayOfMonth,
      category: newRec.category
    }]).select();

    if (data) {
      setRecurring([...recurring, { ...data[0], dayOfMonth: data[0].day_of_month }]);
      setNewRec({ category: ExpenseCategory.TOOLS, dayOfMonth: 1 });
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
    if (!error) setRecurring(recurring.filter(r => r.id !== id));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-800 text-sm">
        <Info className="shrink-0" size={20} />
        <p>Gastos recorrentes são debitados automaticamente do seu lucro no Dashboard com base no dia do vencimento selecionado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm h-fit">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Plus size={18} className="text-indigo-600"/> Novo Gasto Fixo</h3>
          <form onSubmit={handleAddRecurring} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição</label>
              <input required type="text" value={newRec.name || ''} onChange={e => setNewRec({...newRec, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Ex: Assinatura Shopify"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
              <select value={newRec.category} onChange={e => setNewRec({...newRec, category: e.target.value as ExpenseCategory})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor (R$)</label>
                <input required type="number" step="0.01" value={newRec.amount || ''} onChange={e => setNewRec({...newRec, amount: parseFloat(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="0.00"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Dia Venc.</label>
                <input required type="number" min="1" max="31" value={newRec.dayOfMonth || ''} onChange={e => setNewRec({...newRec, dayOfMonth: parseInt(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="1 a 31"/>
              </div>
            </div>
            <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all shadow-lg">Salvar Recorrência</button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Custos Fixos Ativos</h3>
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-bold text-gray-500">Descrição</th>
                    <th className="p-4 font-bold text-gray-500">Vencimento</th>
                    <th className="p-4 font-bold text-gray-500 text-right">Valor</th>
                    <th className="p-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recurring.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{rec.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">{rec.category}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} /> Todo dia {rec.dayOfMonth}
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-rose-600">R$ {rec.amount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => deleteRecurring(rec.id)} className="text-gray-300 hover:text-rose-500 transition-colors p-2"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {recurring.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhum custo fixo configurado.</td>
                    </tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};
