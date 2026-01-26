
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit2, Check, X, Loader2, Tag, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Offer, OfferStatus } from '../types';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOffer, setNewOffer] = useState<Partial<Offer>>({ status: OfferStatus.TESTING });

  const fetchOffers = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('offers').select('*').order('name');
    if (data) {
      setOffers(data.map(o => ({
        ...o,
        productPrice: o.product_price,
        productCost: o.product_cost
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchOffers(); }, []);

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const { data, error } = await supabase.from('offers').insert([{
      name: newOffer.name,
      status: newOffer.status,
      product_price: newOffer.productPrice || 0,
      product_cost: newOffer.productCost || 0
    }]).select();

    if (data) {
      const added = { ...data[0], productPrice: data[0].product_price, productCost: data[0].product_cost };
      setOffers([...offers, added]);
      setIsModalOpen(false);
      setNewOffer({ status: OfferStatus.TESTING });
    }
  };

  const deleteOffer = async (id: string) => {
    if (!supabase) return;
    if (confirm('Atenção: Excluir esta oferta não apagará os anúncios já registrados, mas eles podem perder a referência. Continuar?')) {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (!error) setOffers(offers.filter(o => o.id !== id));
    }
  };

  const getStatusColor = (status: OfferStatus) => {
    switch(status) {
      case OfferStatus.RUNNING: return 'bg-emerald-100 text-emerald-700';
      case OfferStatus.TESTING: return 'bg-blue-100 text-blue-700';
      case OfferStatus.PAUSED: return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-500 text-sm">Gerencie seus produtos e ofertas para rastreio de lucro.</p>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg"
        >
          <Plus size={18} /> Nova Oferta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div key={offer.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Tag size={20} /></div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${getStatusColor(offer.status)}`}>
                {offer.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{offer.name}</h3>
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ticket Médio</span>
                <span className="font-bold text-emerald-600">R$ {offer.productPrice?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Custo Produto (CMV)</span>
                <span className="font-bold text-rose-500">R$ {offer.productCost?.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => deleteOffer(offer.id)} className="text-gray-300 hover:text-rose-500 transition-colors p-2"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}

        {offers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-400 font-medium">Nenhuma oferta cadastrada.<br/>Comece adicionando seu primeiro produto.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">Nova Oferta</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddOffer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Oferta / Produto</label>
                <input required type="text" value={newOffer.name || ''} onChange={e => setNewOffer({...newOffer, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" placeholder="Ex: Robô Aspirador X1"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status Atual</label>
                <select value={newOffer.status} onChange={e => setNewOffer({...newOffer, status: e.target.value as OfferStatus})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5">
                  {Object.values(OfferStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço Venda (Ticket)</label>
                  <input required type="number" step="0.01" value={newOffer.productPrice || ''} onChange={e => setNewOffer({...newOffer, productPrice: parseFloat(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" placeholder="0.00"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Custo (CMV + Taxas)</label>
                  <input required type="number" step="0.01" value={newOffer.productCost || ''} onChange={e => setNewOffer({...newOffer, productCost: parseFloat(e.target.value)})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5" placeholder="0.00"/>
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Criar Oferta</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
