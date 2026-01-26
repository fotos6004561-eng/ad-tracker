
import React, { useState } from 'react';
import { Search, ExternalLink, Trash2, Instagram, Music, Filter } from 'lucide-react';

interface Reference {
  id: string;
  title: string;
  niche: string;
  source: 'Instagram' | 'TikTok';
  imageUrl: string;
  link: string;
}

const MOCK_REFERENCES: Reference[] = [
  {
    id: '1',
    title: 'Anúncio Encapsulado Viral',
    niche: 'Beleza',
    source: 'Instagram',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfac4033c1?w=500&auto=format&fit=crop&q=60',
    link: '#'
  },
  {
    id: '2',
    title: 'Creative UGC - Fone Bluetooth',
    niche: 'Tech',
    source: 'TikTok',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
    link: '#'
  },
  {
    id: '3',
    title: 'Landing Page High Ticket',
    niche: 'Infoproduto',
    source: 'Instagram',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60',
    link: '#'
  },
  {
    id: '4',
    title: 'Demo Cozinha Criativa',
    niche: 'Casa',
    source: 'TikTok',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&auto=format&fit=crop&q=60',
    link: '#'
  }
];

export const ReferencesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = MOCK_REFERENCES.filter(ref => 
    ref.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ref.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6">
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
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium">
          <Filter size={16} />
          Filtrar Nichos
        </button>
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {filtered.map((ref) => (
          <div key={ref.id} className="break-inside-avoid bg-white border border-gray-200 rounded-2xl overflow-hidden group relative shadow-sm hover:shadow-xl transition-all duration-300">
            <img src={ref.imageUrl} alt={ref.title} className="w-full h-auto object-cover" />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <a href={ref.link} target="_blank" rel="noreferrer" className="p-3 bg-white rounded-full text-gray-900 hover:scale-110 transition-transform">
                <ExternalLink size={20} />
              </a>
              <button className="p-3 bg-white rounded-full text-rose-600 hover:scale-110 transition-transform">
                <Trash2 size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-900 leading-tight">{ref.title}</h4>
                {ref.source === 'Instagram' ? (
                  <Instagram size={16} className="text-pink-600 shrink-0" />
                ) : (
                  <Music size={16} className="text-cyan-600 shrink-0" />
                )}
              </div>
              <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded">
                {ref.niche}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="py-20 text-center text-gray-400">
          <Search size={48} className="mx-auto mb-4 opacity-20" />
          <p>Nenhuma referência encontrada para "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};
