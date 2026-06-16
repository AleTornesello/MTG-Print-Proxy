# MTG Print Proxy

A modern, clean, and accessible web application for building and printing Magic: The Gathering proxy decks. Designed with a polished, minimalist interface, it allows users to import deck lists from plain text, customize card arts, save multiple projects locally, and export them directly to a printable PDF format.

## Features

- **Text-to-Deck Import:** Simply paste your decklist in a standard format (e.g., `4 Lightning Bolt`, `1 Snapcaster Mage`) and let the application automatically fetch the card data in the background.
- **Variant Art Selection:** Click on any loaded card to browse and select from its various printings and alternate arts pulled straight from the Scryfall API.
- **Split into Singles:** Want different artwork for each of your basic lands? You can easily split a stack of cards into individual copies to customize each one uniquely.
- **Export to PDF:** Create a ready-to-print A4 PDF document containing all your selected cards, automatically arranged in a 3x3 grid (9 cards per page) at the correct MTG standard size (63x88mm).
- **Multiple Deck Management:** Save multiple deck projects. Your decks are automatically persisted in your browser's local storage so you can close the app and resume building later.
- **Bilingual Interface:** Supports English (EN) and Italian (IT) languages, easily toggleable from the navigation bar.
- **Accessible & Responsive:** WCAG 2.1 AA compliant interface. Fully keyboard accessible and designed to work gracefully across desktop, tablet, and mobile devices.

## How to run locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed along with a package manager like `npm`.

### Installation
1. Clone this repository to your local machine.
2. Install the required dependencies:
   ```bash
   npm install
   ```

### Development Server
Run the development server natively with Vite:
```bash
npm run dev
```

### Building for Production
To build the application for production deployment:
```bash
npm run build
```

## Built With
- **React.js (19)** - Frontend framework
- **Tailwind CSS (v4)** - Utility-first styling
- **Vite** - Lightning fast bundler
- **Scryfall API** - Comprehensive MTG card data and imagery
- **jsPDF** - Client-side high fidelity PDF generation
