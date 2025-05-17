# EUMHC Treasurer Portal

A web-based dashboard for managing Edinburgh University Men's Hockey Club finances.

## Features

- CSV transaction import
- Monthly transaction view with categorization
- Yearly summary by category
- Budget tracking and comparison
- Data persistence using localStorage
- Export to Google Sheets (coming soon)

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- Chakra UI for styling
- React Router for navigation
- React Query for data management
- Papa Parse for CSV parsing

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Development

The project structure is organized as follows:

```
src/
  components/     # Reusable UI components
  pages/          # Page components
  types/          # TypeScript type definitions
  utils/          # Utility functions
```

## Data Storage

All data is stored in the browser's localStorage:
- Transactions
- Categories
- Starting balance
- Category assignments

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
