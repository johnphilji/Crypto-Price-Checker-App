const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Blockchain.com API base URL
const BLOCKCHAIN_API = "https://api.blockchain.com/v3/exchange/tickers";

// Popular crypto symbols for the homepage
const POPULAR_SYMBOLS = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "BNB-USD",
  "XRP-USD",
  "ADA-USD",
];

// Helper: fetch a single ticker
async function fetchTicker(symbol) {
  const url = `${BLOCKCHAIN_API}/${symbol.toUpperCase()}`;
  const response = await axios.get(url, {
    timeout: 8000,
    headers: { Accept: "application/json" },
  });
  return response.data;
}

// Helper: format large numbers
function formatNumber(num) {
  if (!num && num !== 0) return "N/A";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return parseFloat(num).toFixed(2);
}

// Helper: calculate 24h price change %
function calcChange(last, open24h) {
  if (!last || !open24h || open24h === 0) return null;
  return (((last - open24h) / open24h) * 100).toFixed(2);
}

// GET / — Homepage with popular coins
app.get("/", async (req, res) => {
  let popularData = [];
  let errors = [];

  const results = await Promise.allSettled(
    POPULAR_SYMBOLS.map((sym) => fetchTicker(sym))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      const d = result.value;
      popularData.push({
        symbol: d.symbol,
        last: d.last_trade_price,
        open24h: d.price_24h,
        volume24h: d.volume_24h,
        change: calcChange(d.last_trade_price, d.price_24h),
      });
    } else {
      errors.push(POPULAR_SYMBOLS[i]);
    }
  });

  res.render("index", {
    popularData,
    errors,
    searchResult: null,
    searchError: null,
    searchSymbol: null,
    formatNumber,
  });
});

// POST /search — Search for a specific ticker
app.post("/search", async (req, res) => {
  const rawSymbol = (req.body.symbol || "").trim().toUpperCase();
  // Auto-append -USD if user typed just e.g. "BTC"
  const symbol = rawSymbol.includes("-") ? rawSymbol : `${rawSymbol}-USD`;

  let searchResult = null;
  let searchError = null;

  try {
    const d = await fetchTicker(symbol);
    searchResult = {
      symbol: d.symbol,
      last: d.last_trade_price,
      open24h: d.price_24h,
      volume24h: d.volume_24h,
      change: calcChange(d.last_trade_price, d.price_24h),
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      searchError = `Symbol "${symbol}" not found. Try formats like BTC-USD or ETH-USD.`;
    } else if (err.code === "ECONNABORTED") {
      searchError = "Request timed out. The API may be temporarily unavailable.";
    } else {
      searchError = "Failed to fetch data. Please check the symbol and try again.";
    }
  }

  // Re-fetch popular data for display
  let popularData = [];
  const results = await Promise.allSettled(
    POPULAR_SYMBOLS.map((sym) => fetchTicker(sym))
  );
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      const d = result.value;
      popularData.push({
        symbol: d.symbol,
        last: d.last_trade_price,
        open24h: d.price_24h,
        volume24h: d.volume_24h,
        change: calcChange(d.last_trade_price, d.price_24h),
      });
    }
  });

  res.render("index", {
    popularData,
    errors: [],
    searchResult,
    searchError,
    searchSymbol: symbol,
    formatNumber,
  });
});

// GET /api/ticker/:symbol — JSON endpoint (for live refresh)
app.get("/api/ticker/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const d = await fetchTicker(symbol);
    res.json({
      success: true,
      data: {
        symbol: d.symbol,
        last: d.last_trade_price,
        open24h: d.price_24h,
        volume24h: d.volume_24h,
        change: calcChange(d.last_trade_price, d.price_24h),
      },
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`\n🚀 CryptoScope running at http://localhost:${PORT}\n`);
});
