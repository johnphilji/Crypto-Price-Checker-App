# CryptoScope 🔭

A real-time cryptocurrency price tracker built with **Node.js**, **Express**, **Axios**, and **EJS**, powered by the **Blockchain.com Exchange API**.

## Features

- 🔍 Search any crypto pair (e.g. `BTC-USD`, `ETH-USD`, `SOL-USD`)
- 📊 View 24h stats: open, high, low, volume, % change
- 📈 Visual price range bar for each coin
- ⚡ Live refresh button via `/api/ticker/:symbol` JSON endpoint
- 🌐 Server-side rendering with EJS templates

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Server     | Node.js + Express.js    |
| HTTP Client| Axios                   |
| Templating | EJS                     |
| API        | Blockchain.com v3       |
| Styling    | Pure CSS (no framework) |

## API Used

**Blockchain.com Exchange API**  
`GET https://api.blockchain.com/v3/exchange/tickers/{symbol}`

No API key required for ticker endpoints.

## Setup & Run

```bash
# Install dependencies
npm install

# Start server
npm start
```

Open your browser at: `http://localhost:3000`

## Routes

| Route                   | Method | Description                        |
|-------------------------|--------|------------------------------------|
| `/`                     | GET    | Homepage with popular coin prices  |
| `/search`               | POST   | Search for a specific coin pair    |
| `/api/ticker/:symbol`   | GET    | JSON endpoint for live refresh     |

## Project Structure

```
crypto-tracker/
├── server.js           # Express app + Axios API calls
├── views/
│   ├── index.ejs       # Main page template
│   └── 404.ejs         # 404 page
├── public/
│   ├── css/style.css   # Styling
│   └── js/app.js       # Client-side JS (refresh)
└── package.json
```
