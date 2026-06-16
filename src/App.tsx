import React, { useState, useEffect } from 'react';
import { parseDeckList } from './lib/deckParser';
import { fetchCardsCollection, DeckCard, ScryfallCard } from './lib/scryfall';
import { generatePdf } from './lib/pdfExport';
import { translations, Locale } from './lib/i18n';
import { ArtSelector } from './components/ArtSelector';
import { CardSearchModal } from './components/CardSearchModal';
import { Download, Languages, Loader2, RefreshCw, Plus, Share2, Check } from 'lucide-react';
import { cn } from './lib/utils';

export interface DeckData {
  id: string;
  name: string;
  input: string;
  cards: DeckCard[];
  notFound: string[];
  updatedAt: number;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');

  const [decks, setDecks] = useState<DeckData[]>(() => {
    try {
      const savedDecks = localStorage.getItem('mtg-proxy-decks');
      if (savedDecks) {
         let parsed = JSON.parse(savedDecks);
         parsed = parsed.filter((d: DeckData) => typeof d.input === 'string' && (d.input.trim() || d.cards.length > 0 || d.name.trim()));
         return parsed;
      }
      const oldCards = localStorage.getItem('mtg-proxy-cards');
      if (oldCards) {
        const parsed = JSON.parse(oldCards);
        if (parsed.length > 0) {
          return [{
            id: crypto.randomUUID(),
            name: localStorage.getItem('mtg-proxy-deckName') || '',
            input: localStorage.getItem('mtg-proxy-deckInput') || '',
            cards: parsed,
            notFound: JSON.parse(localStorage.getItem('mtg-proxy-notFound') || '[]'),
            updatedAt: Date.now()
          }];
        }
      }
      return [];
    } catch { return []; }
  });

  const [activeDeckId, setActiveDeckId] = useState<string>(() => {
    return localStorage.getItem('mtg-proxy-currentDeckId') || crypto.randomUUID();
  });

  const [sharedDeckToImport, setSharedDeckToImport] = useState<{name: string, input: string} | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deckParam = params.get('deck');
    if (deckParam) {
       try {
         const decoded = JSON.parse(decodeURIComponent(atob(deckParam)));
         if (decoded && typeof decoded.n === 'string' && typeof decoded.i === 'string') {
            setSharedDeckToImport({ name: decoded.n, input: decoded.i });
         }
       } catch (e) {
         console.error('Invalid shared deck link');
       }
       const newUrl = window.location.pathname;
       window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const handleShare = async () => {
    try {
      const shareData = { n: deckName, i: deckInput };
      const base64 = btoa(encodeURIComponent(JSON.stringify(shareData)));
      const url = `${window.location.origin}${window.location.pathname}?deck=${base64}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportShared = async () => {
     if (!sharedDeckToImport) return;
     const newId = crypto.randomUUID();
     
     const newDeck: DeckData = {
        id: newId,
        name: sharedDeckToImport.name,
        input: sharedDeckToImport.input,
        cards: [],
        notFound: [],
        updatedAt: Date.now()
     };

     setDecks(prev => [...prev, newDeck]);
     setActiveDeckId(newId);
     const input = sharedDeckToImport.input;
     setSharedDeckToImport(null);

     if (input.trim()) {
        setLoading(true);
        const parsed = parseDeckList(input);
        const result = await fetchCardsCollection(parsed);
        
        setDecks(prev => prev.map(d => d.id === newId ? { ...d, cards: result.found, notFound: result.notFound } : d));
        setLoading(false);
     }
  };

  const activeDeck = decks.find(d => d.id === activeDeckId) || {
    id: activeDeckId,
    name: '',
    input: '',
    cards: [],
    notFound: [],
    updatedAt: Date.now()
  };

  const deckName = typeof activeDeck.name === 'string' ? activeDeck.name : '';
  const deckInput = typeof activeDeck.input === 'string' ? activeDeck.input : '';
  const cards = Array.isArray(activeDeck.cards) ? activeDeck.cards : [];
  const notFound = Array.isArray(activeDeck.notFound) ? activeDeck.notFound : [];

  const updateActiveDeck = (updates: Partial<DeckData> | ((prev: DeckData) => Partial<DeckData>)) => {
    setDecks(prev => {
       const index = prev.findIndex(d => d.id === activeDeckId);
       const currentDeck = index !== -1 ? prev[index] : {
          id: activeDeckId,
          name: '',
          input: '',
          cards: [],
          notFound: [],
          updatedAt: Date.now()
       };
       const changes = typeof updates === 'function' ? updates(currentDeck) : updates;
       if (index === -1) {
          return [...prev, { ...currentDeck, ...changes, updatedAt: Date.now() }];
       } else {
          const next = [...prev];
          next[index] = { ...currentDeck, ...changes, updatedAt: Date.now() };
          return next;
       }
    });
  };

  const setDeckName = (name: string) => updateActiveDeck({ name });
  const setDeckInput = (input: string) => updateActiveDeck({ input });

  const setCards = (updater: React.SetStateAction<DeckCard[]>) => {
      updateActiveDeck(prev => ({
          cards: typeof updater === 'function' ? updater(prev.cards) : updater
      }));
  };

  const setNotFound = (updater: React.SetStateAction<string[]>) => {
      updateActiveDeck(prev => ({
          notFound: typeof updater === 'function' ? updater(prev.notFound) : updater
      }));
  };

  useEffect(() => {
    localStorage.setItem('mtg-proxy-decks', JSON.stringify(decks));
  }, [decks]);

  useEffect(() => {
    localStorage.setItem('mtg-proxy-currentDeckId', activeDeckId);
  }, [activeDeckId]);

  const handleNewDeck = () => {
    setActiveDeckId(crypto.randomUUID());
  };
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectingArtFor, setSelectingArtFor] = useState<DeckCard | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const handleAddCard = (scryfallData: ScryfallCard) => {
    const existingIndex = cards.findIndex((c: DeckCard) => c.name === scryfallData.name);
    if (existingIndex !== -1) {
       updateQuantity(cards[existingIndex].id, 1);
       setIsSearchModalOpen(false);
    } else {
       let selectedImageUrl = scryfallData.image_uris?.normal;
       if (!selectedImageUrl && scryfallData.card_faces) {
          selectedImageUrl = scryfallData.card_faces[0].image_uris?.normal;
       }
       setCards(prev => [...prev, {
          id: crypto.randomUUID(),
          name: scryfallData.name,
          quantity: 1,
          scryfallData,
          selectedImageUrl
       }]);
       setIsSearchModalOpen(false);
    }
  };

  const t = translations[locale];

  const toggleLanguage = () => setLocale(prev => prev === 'en' ? 'it' : 'en');

  const handleLoadCards = async () => {
     if (!deckInput.trim()) return;
     setLoading(true);
     setNotFound([]);
     const parsed = parseDeckList(deckInput);
     const result = await fetchCardsCollection(parsed);
     setCards(result.found);
     setNotFound(result.notFound);
     setLoading(false);
  };

  const handleClear = () => {
     setDeckInput('');
     setCards([]);
     setNotFound([]);
  };

  const handleExport = async () => {
     if (cards.length === 0) return;
     setPdfGenerating(true);
     setProgress(0);
     try {
       await generatePdf(cards, (p) => setProgress(p));
     } catch (e) {
       console.error("PDF generation failed", e);
     }
     setPdfGenerating(false);
  };

  const handleSelectArt = (imageUrl: string) => {
     if (selectingArtFor) {
        setCards(prev => prev.map(c => 
           c.id === selectingArtFor.id ? { ...c, selectedImageUrl: imageUrl } : c
        ));
     }
     setSelectingArtFor(null);
  };

  const updateQuantity = (id: string, delta: number) => {
     setCards(prev => prev.map(c => {
        if (c.id === id) {
           const newQ = Math.max(0, c.quantity + delta);
           return { ...c, quantity: newQ };
        }
        return c;
     }).filter(c => c.quantity > 0));
  };

  const splitCard = (id: string) => {
     setCards(prev => {
        const index = prev.findIndex(c => c.id === id);
        if (index === -1) return prev;
        const card = prev[index];
        if (card.quantity <= 1) return prev;

        const newCards = [...prev];
        newCards.splice(index, 1); // remove original
        
        for (let i = 0; i < card.quantity; i++) {
           newCards.splice(index + i, 0, {
             ...card,
             id: crypto.randomUUID(),
             quantity: 1
           });
        }
        return newCards;
     });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <header className="h-16 px-4 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold shrink-0">M</div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block shrink-0">{t.appTitle}</h1>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <input 
              type="text" 
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder={t.untitledDeck}
              className="text-sm font-bold text-slate-700 bg-transparent border border-transparent hover:border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 rounded-md px-2 py-1.5 w-32 sm:w-48 lg:w-64 transition-all placeholder:text-slate-400 placeholder:font-medium"
              aria-label="Deck Name"
            />
            <button
              onClick={handleNewDeck}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/10 shrink-0"
              title={t.newDeck}
              aria-label={t.newDeck}
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 hidden sm:block shrink-0"></div>
            <button
              onClick={handleShare}
              className={cn("p-1.5 rounded-md transition-all focus:outline-none focus:ring-2 flex items-center justify-center shrink-0 w-7 h-7", copied ? "text-green-600 bg-green-50 focus:ring-green-500/20" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:ring-slate-900/10")}
              title={copied ? t.linkCopied : t.shareDeck}
              aria-label={t.shareDeck}
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button 
              onClick={() => setLocale('en')}
              className={cn("px-3 py-1 text-xs font-bold rounded focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors", locale === 'en' ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500 hover:text-slate-700 font-medium")}
            >EN</button>
            <button 
              onClick={() => setLocale('it')}
              className={cn("px-3 py-1 text-xs font-bold rounded focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors", locale === 'it' ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500 hover:text-slate-700 font-medium")}
            >IT</button>
          </div>
          <button 
            onClick={handleExport}
            disabled={pdfGenerating || cards.length === 0}
            className="bg-slate-900 text-white px-4 lg:px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 flex items-center gap-2 shadow-md outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
          >
            {pdfGenerating ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 <span className="hidden sm:inline">{progress}%</span>
               </>
             ) : (
               <>
                 <span className="hidden sm:inline">{t.exportPdf}</span>
                 <Download className="w-4 h-4" />
               </>
             )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 bg-white lg:border-r border-b lg:border-b-0 border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
          <section>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="import-list" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{t.importDeck}</label>
              <button onClick={handleClear} className="text-xs text-slate-400 hover:text-slate-600 font-bold focus:outline-none focus:text-slate-900">{t.clear}</button>
            </div>
            <textarea
              id="import-list"
              value={deckInput}
              onChange={(e) => setDeckInput(e.target.value)}
              placeholder={t.deckListPlaceholder}
              className="w-full h-48 lg:h-64 p-3 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all placeholder:text-slate-300 resize-none"
              aria-label="Deck list input"
            />
            <button
              onClick={handleLoadCards}
              disabled={loading || !deckInput.trim()}
              className="w-full mt-3 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t.loadCards}
            </button>
            
            {notFound.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs">
                 <p className="font-bold mb-1">{t.unrecognizedCards}</p>
                 <ul className="list-disc pl-4 space-y-0.5">
                   {notFound.map((n, i) => <li key={i}>{n}</li>)}
                 </ul>
              </div>
            )}
          </section>

          <section className="flex-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Deck Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Total Cards</span>
                  <span className="font-semibold">{cards.reduce((acc, c) => acc + c.quantity, 0)}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-slate-900 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.round((cards.reduce((acc, c) => acc + c.quantity, 0) / 60) * 100))}%` }}></div>
                </div>
              </div>
            </div>
          </section>
        </aside>

        {/* Builder Grid */}
        <section className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 relative">
          {cards.length === 0 ? (
            <div className="mt-8 p-12 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              </div>
              <p className="text-slate-600 font-medium">{t.noCardsFound}</p>
              
              {decks.length > 0 && (
                <div className="mt-8 w-full max-w-sm text-left">
                  <label htmlFor="deck-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center text-slate-400">
                    {t.loadSavedDeck}
                  </label>
                  <select
                    id="deck-select"
                    className="w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-sm cursor-pointer"
                    onChange={(e) => {
                       if (e.target.value) setActiveDeckId(e.target.value);
                    }}
                    value={activeDeckId}
                  >
                    <option value={activeDeckId} disabled>{t.selectSavedDeck}</option>
                    {decks.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name || t.untitledDeck} ({d.cards.length})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
             <>
                <div className="flex items-end justify-between mb-8">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm text-slate-500 font-medium mb-1">Current Project</p>
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                      <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 truncate" title={deckName || t.untitledDeck}>{deckName || t.untitledDeck}</h2>
                      <button 
                        onClick={() => setIsSearchModalOpen(true)}
                        className="px-3 py-1.5 flex items-center gap-1.5 bg-slate-900 text-white rounded-lg outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t.addCard}
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">Total</p>
                    <p className="text-xl lg:text-2xl font-mono font-bold text-slate-900">{cards.reduce((acc, c) => acc + c.quantity, 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 pb-8">
                  {cards.map((card) => (
                    <div key={card.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group focus-within:ring-2 focus-within:ring-slate-900 flex flex-col">
                      <div className="h-auto aspect-[63/88] bg-slate-200 relative overflow-hidden">
                        <img 
                          src={card.selectedImageUrl} 
                          alt={card.name} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]" 
                          loading="lazy" 
                        />
                        <div className="absolute inset-0 bg-slate-800 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/95 shadow-sm backdrop-blur rounded text-[10px] font-bold uppercase truncate max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity">Variant Select</div>
                        <button 
                          onClick={() => setSelectingArtFor(card)}
                          className="absolute inset-0 w-full h-full text-transparent focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-500"
                          aria-label={`Select variant art for ${card.name}`}
                        >
                           <span className="sr-only">{t.selectArt}</span>
                        </button>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="truncate flex-1">
                            <h3 className="font-bold text-sm leading-tight text-slate-900 truncate" title={card.name}>{card.name}</h3>
                          </div>
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded shadow-sm shrink-0">x{card.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-auto">
                           <button onClick={() => updateQuantity(card.id, -1)} className="flex-1 py-1.5 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors">-</button>
                           <button onClick={() => updateQuantity(card.id, 1)} className="flex-1 py-1.5 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 font-bold focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors">+</button>
                        </div>
                        {card.quantity > 1 && (
                          <button 
                            onClick={() => splitCard(card.id)} 
                            className="mt-2 w-full py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                          >
                            {t.split}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
             </>
          )}
        </section>
      </main>

      {/* Art Selector Modal */}
      {selectingArtFor && selectingArtFor.scryfallData && (
         <ArtSelector 
           card={selectingArtFor.scryfallData} 
           currentImageUrl={selectingArtFor.selectedImageUrl}
           locale={locale}
           onSelect={handleSelectArt}
           onClose={() => setSelectingArtFor(null)}
         />
      )}

      {/* Card Search Modal */}
      {isSearchModalOpen && (
        <CardSearchModal
          locale={locale}
          onAdd={handleAddCard}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}

      {/* Import Shared Deck Dialog */}
      {sharedDeckToImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in-95 duration-200">
             <h3 className="text-xl font-bold text-slate-900 mb-2">{t.importSharedTitle}</h3>
             <p className="text-slate-600 mb-6 text-sm">{t.importSharedMessage.replace('{name}', sharedDeckToImport.name || t.untitledDeck)}</p>
             <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setSharedDeckToImport(null)}
                  className="px-4 py-2 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 text-sm"
                >
                  {t.cancelBtn}
                </button>
                <button 
                  onClick={handleImportShared}
                  className="px-4 py-2 rounded-lg font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 text-sm flex items-center gap-2"
                >
                  {t.importBtn}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
