/**
 * CryptoScope — Client-side JS
 * Handles live refresh via the /api/ticker/:symbol JSON endpoint
 */

// Refresh a ticker card using the JSON API route
async function refreshTicker(symbol, btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = "↻ Loading…";
  btn.disabled = true;

  try {
    const res = await fetch(`/api/ticker/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Unknown error");

    const d = json.data;

    // Update price
    const priceEl = document.querySelector(".price-main");
    if (priceEl && d.last) {
      priceEl.textContent =
        "$" + Number(d.last).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      // Flash animation
      priceEl.style.color = "#00e5a0";
      setTimeout(() => (priceEl.style.color = ""), 600);
    }

    // Update 24h change badge
    if (d.change !== null && d.change !== undefined) {
      const changeEl = document.querySelector(".price-change");
      if (changeEl) {
        const pos = parseFloat(d.change) >= 0;
        changeEl.className = `price-change ${pos ? "pos" : "neg"}`;
        changeEl.innerHTML = `${pos ? "▲" : "▼"} ${Math.abs(d.change)}% <span class="change-label">24h</span>`;
      }
    }

    btn.innerHTML = "✓ Updated";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1500);
  } catch (err) {
    btn.innerHTML = "✗ Error";
    console.error("Refresh failed:", err);
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

// Auto-uppercase search input
const searchInput = document.querySelector('.search-wrap input[name="symbol"]');
if (searchInput) {
  searchInput.addEventListener("input", function () {
    const pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
  });
}

// Animate bar fills on load
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".bar-fill").forEach((el) => {
    const w = el.style.width;
    el.style.width = "0";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.width = w;
      });
    });
  });
});
