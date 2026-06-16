import { jsPDF } from 'jspdf';
import { DeckCard } from './scryfall';

const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const CARD_WIDTH = 63;
const CARD_HEIGHT = 88;
const START_X = (A4_WIDTH - (3 * CARD_WIDTH)) / 2;
const START_Y = (A4_HEIGHT - (3 * CARD_HEIGHT)) / 2;

async function getBase64ImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generatePdf(deck: DeckCard[], progressCallback?: (progress: number) => void) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Flatten deck (apply quantities)
  const flattened: string[] = [];
  deck.forEach(card => {
    if (card.selectedImageUrl) {
      for (let i = 0; i < card.quantity; i++) {
        flattened.push(card.selectedImageUrl);
      }
    }
  });

  const totalCards = flattened.length;
  if (totalCards === 0) return;

  // We optimize image loading: many proxies will reuse the same image url.
  const imageCache = new Map<string, string>();
  
  let page = 0;
  
  for (let i = 0; i < totalCards; i++) {
    const r = i % 9;
    const col = r % 3;
    const row = Math.floor(r / 3);
    
    if (i > 0 && r === 0) {
      pdf.addPage();
      page++;
    }

    const x = START_X + (col * CARD_WIDTH);
    const y = START_Y + (row * CARD_HEIGHT);
    const url = flattened[i];

    try {
      let b64 = imageCache.get(url);
      if (!b64) {
         b64 = await getBase64ImageFromUrl(url);
         imageCache.set(url, b64);
      }
      
      pdf.addImage(b64, 'JPEG', x, y, CARD_WIDTH, CARD_HEIGHT);
    } catch (e) {
      console.error('Failed to load image for PDF:', url, e);
    }

    if (progressCallback) {
      progressCallback(Math.round(((i + 1) / totalCards) * 100));
    }
  }

  pdf.save('deck-proxy.pdf');
}
