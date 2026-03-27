/* ─────────────────────────────────────────────
   CryptoScope — Client JS
   • Theme toggle (dark ↔ light, persisted)
   • Live ticker refresh via JSON API
   • Range bar animation
   • Quick-chip symbol fill
   ───────────────────────────────────────────── */

// ═══════════════════════════════════════════
// 1. THEME TOGGLE
// ═══════════════════════════════════════════
const html        = document.documentElement;
const toggleTrack = document.getElementById('toggleTrack');
const toggleKnob  = document.getElementById('toggleKnob');
const toggleIcon  = document.getElementById('toggleIcon');
const toggleLabel = document.getElementById('toggleLabel');

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  if (toggleTrack) toggleTrack.classList.toggle('active', !isDark);
  if (toggleIcon)  toggleIcon.textContent  = isDark ? '☾' : '☀';
  if (toggleLabel) toggleLabel.textContent = isDark ? 'Dark' : 'Light';
  try { localStorage.setItem('cs-theme', theme); } catch(e) {}
}

// Restore saved preference
(function () {
  let saved = 'dark';
  try { saved = localStorage.getItem('cs-theme') || 'dark'; } catch(e) {}
  applyTheme(saved);
})();

// Click handler on the track div
if (toggleTrack) {
  toggleTrack.addEventListener('click', function () {
    const current = html.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// ═══════════════════════════════════════════
// 2. QUICK CHIP — fill search input
// ═══════════════════════════════════════════
function fillSymbol(sym) {
  const inp = document.getElementById('symbolInput');
  if (inp) {
    inp.value = sym;
    inp.focus();
  }
}

// Auto-uppercase as user types
const symbolInput = document.getElementById('symbolInput');
if (symbolInput) {
  symbolInput.addEventListener('input', function () {
    const pos = this.selectionStart;
    this.value = this.value.toUpperCase();
    this.setSelectionRange(pos, pos);
  });
}

// ═══════════════════════════════════════════
// 3. RANGE BAR ANIMATION ON LOAD
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Animate result range bar
  const fill = document.getElementById('rangeFill');
  const pip  = document.getElementById('rangePip');
  if (fill && pip) {
    const target = fill.dataset.target;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.width = target;
      pip.style.left   = target;
    }));
  }

  // Animate mini table bars
  document.querySelectorAll('.mini-fill').forEach(el => {
    const w = el.style.width;
    el.style.width = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'width 0.9s cubic-bezier(0.4,0,0.2,1)';
      el.style.width = w;
    }));
  });
});

// ═══════════════════════════════════════════
// 4. LIVE REFRESH via /api/ticker/:symbol
// ═══════════════════════════════════════════
async function refreshTicker(symbol, btn) {
  const orig = btn.innerHTML;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         style="width:11px;height:11px;animation:spin .8s linear infinite">
      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
    Refreshing…`;
  btn.disabled = true;

  // Add spin keyframe if not present
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  try {
    const res  = await fetch(`/api/ticker/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Unknown error');

    const d = json.data;

    // Update price
    const priceEl = document.getElementById('livePrice');
    if (priceEl && d.last) {
      const formatted = '$' + Number(d.last).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 6
      });
      priceEl.textContent = formatted;
      priceEl.style.transition = 'color 0.2s';
      priceEl.style.color = 'var(--gold)';
      setTimeout(() => priceEl.style.color = '', 700);
    }

    // Update change badge
    if (d.change !== null && d.change !== undefined) {
      const chgEl = document.getElementById('liveChg');
      if (chgEl) {
        const pos = parseFloat(d.change) >= 0;
        chgEl.className = `chg-badge ${pos ? 'pos' : 'neg'}`;
        chgEl.innerHTML =
          `${pos ? '▲' : '▼'} ${Math.abs(d.change)}% ` +
          `<span style="opacity:.6;font-size:.6rem;margin-left:.15rem">24H</span>`;
      }
    }

    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Updated`;
    btn.style.color = 'var(--green)';
    btn.style.borderColor = 'var(--green)';

    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error('Refresh error:', err);
    btn.innerHTML = `✗ Failed`;
    btn.style.color = 'var(--red)';
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.color = '';
      btn.disabled = false;
    }, 2500);
  }
}
