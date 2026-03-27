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

// CoinGecko API base URL (free, no key required)
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Popular coins: CoinGecko IDs mapped to friendly symbols
const POPULAR_COINS = [
  { id: "bitcoin",      symbol: "BTC" },
  { id: "ethereum",     symbol: "ETH" },
  { id: "solana",       symbol: "SOL" },
  { id: "binancecoin",  symbol: "BNB" },
  { id: "ripple",       symbol: "XRP" },
  { id: "cardano",      symbol: "ADA" },
];

// Helper: format large numbers
function formatNumber(num) {
  if (!num && num !== 0) return "N/A";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9)  return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6)  return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3)  return (num / 1e3).toFixed(2) + "K";
  return parseFloat(num).toFixed(2);
}

// Helper: map a CoinGecko market object to our standard shape
function mapCoin(d) {
  return {
    id:       d.id,
    symbol:   (d.symbol || "").toUpperCase(),
    name:     d.name,
    last:     d.current_price,
    open24h:  d.current_price && d.price_change_24h
                ? (d.current_price - d.price_change_24h)
                : null,
    high24h:  d.high_24h,
    low24h:   d.low_24h,
    volume24h: d.total_volume,
    marketCap: d.market_cap,
    change:   d.price_change_percentage_24h != null
                ? parseFloat(d.price_change_percentage_24h).toFixed(2)
                : null,
    image:    d.image,
  };
}

// Helper: fetch popular coins in one call
async function fetchPopular() {
  const ids = POPULAR_COINS.map((c) => c.id).join(",");
  const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`;
  const res = await axios.get(url, {
    timeout: 10000,
    headers: { Accept: "application/json" },
  });
  return res.data.map(mapCoin);
}

// Helper: search for a coin by ticker symbol, then fetch its data
async function fetchBySymbol(query) {
  // 1. Search for the coin
  const searchRes = await axios.get(`${COINGECKO_API}/search?query=${encodeURIComponent(query)}`, {
    timeout: 8000,
    headers: { Accept: "application/json" },
  });

  const coins = searchRes.data.coins;
  if (!coins || coins.length === 0) {
    throw { notFound: true };
  }

  // Find exact symbol match first, then fall back to first result
  const exactMatch =
    coins.find((c) => c.symbol.toUpperCase() === query.toUpperCase()) ||
    coins[0];

  // 2. Fetch the market data for that coin ID
  const marketRes = await axios.get(
    `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${exactMatch.id}&sparkline=false`,
    { timeout: 8000, headers: { Accept: "application/json" } }
  );

  if (!marketRes.data || marketRes.data.length === 0) {
    throw { notFound: true };
  }

  return mapCoin(marketRes.data[0]);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET / — Homepage with popular coins
app.get("/", async (req, res) => {
  let popularData = [];
  let errors = [];

  try {
    popularData = await fetchPopular();
  } catch (err) {
    errors = POPULAR_COINS.map((c) => c.symbol);
  }

  res.render("index", {
    popularData,
    errors,
    searchResult: null,
    searchError: null,
    searchSymbol: null,
    formatNumber,
  });
});

// POST /search — Search for a specific coin
app.post("/search", async (req, res) => {
  const query = (req.body.symbol || "").trim();

  let searchResult = null;
  let searchError = null;

  try {
    searchResult = await fetchBySymbol(query);
  } catch (err) {
    if (err.notFound) {
      searchError = `"${query}" not found. Try a symbol like BTC, ETH, or SOL.`;
    } else if (err.code === "ECONNABORTED") {
      searchError = "Request timed out. Please try again.";
    } else if (err.response && err.response.status === 429) {
      searchError = "Rate limit hit — please wait a moment and try again.";
    } else {
      searchError = "Failed to fetch data. Please check the symbol and try again.";
    }
  }

  // Re-fetch popular data
  let popularData = [];
  try {
    popularData = await fetchPopular();
  } catch (_) {}

  res.render("index", {
    popularData,
    errors: [],
    searchResult,
    searchError,
    searchSymbol: query,
    formatNumber,
  });
});

// GET /api/ticker/:symbol — JSON endpoint for live refresh
app.get("/api/ticker/:symbol", async (req, res) => {
  try {
    const data = await fetchBySymbol(req.params.symbol);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.notFound ? 404 : (err.response?.status || 500);
    res.status(status).json({ success: false, error: err.message || "Not found" });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`\n🚀 CryptoScope running at http://localhost:${PORT}\n`);
});
