
import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Trash2, Instagram, Music, Filter, Plus, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Reference {
  id: string;
  title: string;
  niche: string;
  source: 'Instagram' | 'TikTok';
  image_url: string;
  link: string;
}

export const ReferencesPage: React.FC = () => {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRef, setNewRef] = useState<Partial<Reference>>({ source: 'Instagram' });

  const fetchReferences = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('reference_vault')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setReferences(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const { data, error } = await supabase.from('reference_vault').insert([{
      title: newRef.title || 'Sem Título',
      niche: newRef.niche || 'Geral',
      source: newRef.source,
      image_url: newRef.image_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&auto=format&fit=crop&q=60',
      link: newRef.link || '#'
    }]).select();

    if (data) {
      setReferences([data[0], ...references]);
      setIsModalOpen(false);
      setNewRef({ source: 'Instagram' });
    } else if (error) {
      alert('Erro ao salvar no Supabase: ' + error.message);
    }
  };

  const deleteReference = async (id: string) => {
    if (!supabase) return;
    if (confirm('Excluir esta referência permanentemente?')) {
      const { error } = await supabase.from('reference_vault').delete().eq('id', id);
      if (!error) {
        setReferences(references.filter(r => r.id !== id));
      }
    }
  };

  const filtered = references.filter(ref => 
    ref.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ref.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por nicho ou título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            Adicionar Referência
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {filtered.map((ref) => (
            <div key={ref.id} className="break-inside-avoid bg-white border border-gray-200 rounded-2xl overflow-hidden group relative shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative overflow-hidden aspect-[4/5]">
                 <img src={ref.image_url} alt={ref.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <a href={ref.link} target="_blank" rel="noreferrer" className="p-3 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform shadow-lg">
                    <ExternalLink size={20} />
                  </a>
                  <button 
                    onClick={() => deleteReference(ref.id)}
                    className="p-3 bg-white rounded-full text-rose-600 hover:scale-110 transition-transform shadow-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900 leading-tight text-sm">{ref.title}</h4>
                  {ref.source === 'Instagram' ? <Instagram size={14} className="text-pink-600" /> : <Music size={14} className="text-black" />}
                </div>
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold uppercase tracking-wider rounded">{ref.niche}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PARA ADICIONAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">Nova Referência</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddReference} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título</label>
                <input required type="text" value={newRef.title || ''} onChange={e => setNewRef({...newRef, title: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Ex: Criativo Escala Fone"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nicho</label>
                  <input required type="text" value={newRef.niche || ''} onChange={e => setNewRef({...newRef, niche: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Beleza"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fonte</label>
                  <select value={newRef.source} onChange={e => setNewRef({...newRef, source: e.target.value as any})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL da Imagem</label>
                <input required type="url" value={newRef.image_url || ''} onChange={e => setNewRef({...newRef, image_url: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="https://..."/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link de Origem (Opcional)</label>
                <input type="url" value={newRef.link || ''} onChange={e => setNewRef({...newRef, link: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="https://..."/>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Salvar no Banco de Dados</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
