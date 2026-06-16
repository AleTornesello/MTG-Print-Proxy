import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ScryfallCard, fetchCardPrints } from '../lib/scryfall';
import { cn } from '../lib/utils';
import { translations, Locale } from '../lib/i18n';

interface ArtSelectorProps {
  card: ScryfallCard;
  currentImageUrl?: string;
  locale: Locale;
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}

export function ArtSelector({ card, currentImageUrl, locale, onSelect, onClose }: ArtSelectorProps) {
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[locale];

  useEffect(() => {
    let mounted = true;
    const fetchPrints = async () => {
      try {
        const results = await fetchCardPrints(card.prints_search_uri);
        if (mounted) {
          setPrints(results.filter(r => r.image_uris?.normal || r.card_faces?.[0]?.image_uris?.normal));
          setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    };
    fetchPrints();
    return () => { mounted = false };
  }, [card.prints_search_uri]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 id="modal-title" className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
            {t.selectArt} ({card.name})
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            aria-label={t.close}
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
             <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
             </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {prints.map(p => {
                const imgUrl = p.image_uris?.normal || p.card_faces?.[0]?.image_uris?.normal;
                if (!imgUrl) return null;
                const isSelected = imgUrl === currentImageUrl;

                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(imgUrl)}
                    className={cn(
                      "relative rounded-xl overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all",
                      isSelected ? "ring-4 ring-blue-500 scale-[1.02]" : "hover:scale-[1.02] hover:shadow-lg"
                    )}
                  >
                    <img 
                       src={imgUrl} 
                       alt={`Variant art for ${card.name} from set ${p.id}`} 
                       className="w-full h-auto rounded-xl"
                       loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
