import { ParsedCard } from './deckParser';

export interface ScryfallCard {
  id: string;
  name: string;
  image_uris?: {
    normal?: string;
    small?: string;
    large?: string;
    png?: string;
  };
  card_faces?: {
    image_uris?: {
      normal?: string;
      small?: string;
      large?: string;
      png?: string;
    }
  }[];
  prints_search_uri: string;
}

export interface DeckCard extends ParsedCard {
  id: string;
  scryfallData?: ScryfallCard;
  selectedImageUrl?: string;
}

export async function fetchCardsCollection(cards: ParsedCard[]): Promise<{found: DeckCard[], notFound: string[]}> {
  if (cards.length === 0) return { found: [], notFound: [] };

  const identifiers = cards.map(c => ({ name: c.name }));
  
  // Scryfall allows max 75 per request
  const chunks = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    chunks.push(identifiers.slice(i, i + 75));
  }

  let found: DeckCard[] = [];
  let notFound: string[] = [];

  for (const chunk of chunks) {
    const response = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifiers: chunk })
    });

    const data = await response.json();
    
    // Map responses back
    const fetchedCards: ScryfallCard[] = data.data || [];
    const _notFound: any[] = data.not_found || [];

    notFound.push(..._notFound.map(n => n.name));

    // For each found card, find the matching ParsedCard
    for (const scryCard of fetchedCards) {
       const parsedMatches = cards.filter(c => c.name.toLowerCase() === scryCard.name.toLowerCase() || scryCard.name.toLowerCase().includes(c.name.toLowerCase()));
       const pMatch = parsedMatches[0];
       if (pMatch) {
         let selectedImageUrl = scryCard.image_uris?.normal;
         if (!selectedImageUrl && scryCard.card_faces) {
            selectedImageUrl = scryCard.card_faces[0].image_uris?.normal;
         }
         
         // Don't duplicate if already found (handles edge cases in matching)
         if (!found.find(f => f.name === pMatch.name)) {
            found.push({
               ...pMatch,
               id: crypto.randomUUID(),
               scryfallData: scryCard,
               selectedImageUrl
            });
         }
       }
    }
  }

  // Find cards that failed to fetch completely (maybe naming mismatch)
  for (const c of cards) {
     if (!found.find(f => f.name === c.name) && !notFound.includes(c.name)) {
         notFound.push(c.name);
     }
  }

  return { found, notFound };
}

export async function fetchCardPrints(printsSearchUri: string): Promise<ScryfallCard[]> {
  const prints: ScryfallCard[] = [];
  let nextUrl = printsSearchUri;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();
    prints.push(...(data.data || []));
    if (data.has_more) {
       nextUrl = data.next_page;
       // Quick throttle
       await new Promise(r => setTimeout(r, 100));
    } else {
       break;
    }
  }

  return prints;
}
