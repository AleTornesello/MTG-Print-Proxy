import React, { useState, useEffect } from 'react';
import { X, Loader2, Search, Plus } from 'lucide-react';
import { ScryfallCard, searchCards } from '../lib/scryfall';
import { translations, Locale } from '../lib/i18n';

interface CardSearchModalProps {
  locale: Locale;
  onAdd: (card: ScryfallCard) => void;
  onClose: () => void;
}

export function CardSearchModal({ locale, onAdd, onClose }: CardSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const t = translations[locale];

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const delay = setTimeout(async () => {
      setLoading(true);
      const res = await searchCards(query);
      setResults(res.slice(0, 20)); // limit to 20
      setLoading(false);
    }, 500);

    return () => clearTimeout(delay);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
           <Search className="w-5 h-5 text-slate-400" />
           <input
             autoFocus
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder={t.searchCardPlaceholder}
             className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 font-medium text-lg"
           />
           <button 
             onClick={onClose}
             className="p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
             aria-label={t.close}
           >
             <X className="w-5 h-5 text-slate-500" />
           </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2">
           {loading ? (
              <div className="flex items-center justify-center py-12">
                 <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
           ) : query.length >= 3 && results.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">
                 {t.noResults}
              </div>
           ) : (
              <ul className="space-y-1">
                 {results.map(card => {
                   const imgUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
                   return (
                     <li key={card.id}>
                        <button
                          onClick={() => {
                             onAdd(card);
                          }}
                          className="w-full text-left flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:bg-slate-50 group"
                        >
                           <div className="flex items-center gap-4">
                             {imgUrl ? (
                               <img src={imgUrl} className="w-10 h-14 rounded bg-slate-200 object-cover border border-slate-200" />
                             ) : (
                               <div className="w-10 h-14 rounded bg-slate-200 border border-slate-200" />
                             )}
                             <div>
                               <p className="font-bold text-sm text-slate-900">{card.name}</p>
                               <p className="text-xs text-slate-500 truncate max-w-sm">{card.type_line}</p>
                             </div>
                           </div>
                           <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                     </li>
                   );
                 })}
              </ul>
           )}
        </div>
      </div>
    </div>
  );
}
