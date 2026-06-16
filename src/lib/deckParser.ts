export interface ParsedCard {
  quantity: number;
  name: string;
}

export function parseDeckList(deckList: string): ParsedCard[] {
  const lines = deckList.split('\n');
  const cards: ParsedCard[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Ignore sideboards or section headers (e.g. "Sideboard", "Commander", "") or comments starting with //
    if (trimmed.startsWith('//') || !/^\d+/.test(trimmed)) {
       continue;
    }

    // Match patterns like "4 Lightning Bolt" or "1x Brainstorm" or "1 Tarmogoyf (MMA) 166"
    // Since names might include set codes, we just isolate the first number and the rest up to a parenthesis or end
    const match = trimmed.match(/^(\d+)x?\s+(.+)/);
    
    if (match) {
      const quantity = parseInt(match[1], 10);
      let name = match[2].trim();

      // Clean up set codes like (KTK) 123
      const setCodeMatch = name.indexOf(' (');
      if (setCodeMatch !== -1) {
        name = name.substring(0, setCodeMatch).trim();
      }

      cards.push({ quantity, name });
    }
  }

  // Combine duplicates (if the list has "4 Lightning Bolt" and "1 Lightning Bolt")
  const combined = new Map<string, number>();
  for (const card of cards) {
    const current = combined.get(card.name.toLowerCase()) || 0;
    combined.set(card.name.toLowerCase(), current + card.quantity);
  }

  // Preserve initial capitalizations by mapping back carefully or just use the first seen name
  return Array.from(combined.entries()).map(([lowerName, quantity]) => {
     const originalName = cards.find(c => c.name.toLowerCase() === lowerName)?.name || lowerName;
     return { name: originalName, quantity };
  });
}
