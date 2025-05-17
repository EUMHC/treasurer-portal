# EUMHC Treasurer Portal

A web application for managing and analyzing EUMHC (Edinburgh University Men's Hockey Club) financial transactions. The portal allows treasurers to import transaction data, view summaries, and generate detailed Exel reports. 

### Setup
1. Clone the repository:
```bash
git clone https://github.com/EUMHC/treasurer-portal.git
cd treasurer-portal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Deployment
To deploy to GitHub Pages:
```bash
npm run deploy
```

## Built With
- React
- Vite
- Typescript
- Chakra UI
- ExcelJS
- React Router
- React Query


## Data Storage

All data is stored in the browser's localStorage:
- Transactions
- Categories
- Category assignments
