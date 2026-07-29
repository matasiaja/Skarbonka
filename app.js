const CURRENCIES = {
  GBP: { symbol: '£', denoms: [50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01] },
  PLN: { symbol: 'zł', denoms: [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01] },
  EUR: { symbol: '€', denoms: [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01] }
};
const CURRENCY_ORDER = ['GBP', 'PLN', 'EUR'];

const JARS = [
  { key: 'zycie', name: '1. Na życie', pct: 0.55 },
  { key: 'wolnosc', name: '2. Wolność finansowa', pct: 0.10 },
  { key: 'inwestowanie', name: '3. Inwestowanie', pct: 0.10 },
  { key: 'edukacja', name: '4. Edukacja', pct: 0.10 },
  { key: 'fun', name: '5. FUN', pct: 0.10 },
  { key: 'pomoc', name: '6. Pomoc innym', pct: 0.05 }
];

const STORAGE_KEY = 'skarbonka-state-v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { currency: 'GBP', counts: {} };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
if (!CURRENCIES[state.currency]) state.currency = 'GBP';
if (!state.counts) state.counts = {};

const denomListEl = document.getElementById('denomList');
const jarListEl = document.getElementById('jarList');
const totalMoneyEl = document.getElementById('totalMoney');
const coinCountEl = document.getElementById('coinCount');
const currencyBtn = document.getElementById('currencyBtn');
const resetBtn = document.getElementById('resetBtn');

function fmt(n) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCount(denom) {
  return state.counts[state.currency]?.[denom] ?? 0;
}

function setCount(denom, value) {
  const v = Math.max(0, Math.floor(Number(value) || 0));
  if (!state.counts[state.currency]) state.counts[state.currency] = {};
  state.counts[state.currency][denom] = v;
  saveState();
  render();
}

function renderDenoms() {
  const cur = CURRENCIES[state.currency];
  denomListEl.innerHTML = '';
  cur.denoms.forEach(denom => {
    const count = getCount(denom);
    const subtotal = count * denom;
    const row = document.createElement('div');
    row.className = 'denom-row';
    row.innerHTML = `
      <div class="denom-top">
        <div class="denom-value">${cur.symbol} ${fmt(denom)}</div>
        <div class="denom-subtotal">${cur.symbol} ${fmt(subtotal)}</div>
      </div>
      <div class="denom-controls">
        <button class="row-reset" data-action="reset" data-denom="${denom}" title="Wyzeruj ${cur.symbol} ${fmt(denom)}" aria-label="Wyzeruj ${cur.symbol} ${fmt(denom)}">↺</button>
        <div class="stepper">
          <button data-action="dec" data-denom="${denom}" aria-label="Zmniejsz">−</button>
          <input type="number" inputmode="numeric" min="0" value="${count}" data-denom="${denom}">
          <button data-action="inc" data-denom="${denom}" aria-label="Zwiększ">+</button>
        </div>
      </div>
    `;
    denomListEl.appendChild(row);
  });

  denomListEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const denom = Number(btn.dataset.denom);
      const action = btn.dataset.action;
      if (action === 'reset') {
        setCount(denom, 0);
        return;
      }
      const cur = getCount(denom);
      setCount(denom, action === 'inc' ? cur + 1 : cur - 1);
    });
  });
  const inputs = Array.from(denomListEl.querySelectorAll('input'));
  inputs.forEach((input, idx) => {
    input.addEventListener('change', () => {
      setCount(Number(input.dataset.denom), input.value);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setCount(Number(input.dataset.denom), input.value);
        const next = inputs[idx + 1];
        if (next) {
          requestAnimationFrame(() => {
            const freshInputs = Array.from(denomListEl.querySelectorAll('input'));
            const target = freshInputs[idx + 1];
            if (target) {
              target.focus();
              target.select();
            }
          });
        } else {
          input.blur();
        }
      }
    });
  });
}

function getTotal() {
  const cur = CURRENCIES[state.currency];
  return cur.denoms.reduce((sum, d) => sum + getCount(d) * d, 0);
}

function getTotalCoins() {
  const cur = CURRENCIES[state.currency];
  return cur.denoms.reduce((sum, d) => sum + getCount(d), 0);
}

function renderJars(total) {
  const cur = CURRENCIES[state.currency];
  jarListEl.innerHTML = '';
  JARS.forEach(jar => {
    const value = total * jar.pct;
    const row = document.createElement('div');
    row.className = 'jar-row';
    row.innerHTML = `
      <div>
        <div class="jar-name">${jar.name}</div>
        <div class="jar-pct">${Math.round(jar.pct * 100)}%</div>
      </div>
      <div class="jar-value">${cur.symbol} ${fmt(value)}</div>
    `;
    jarListEl.appendChild(row);
  });
}

function render() {
  const cur = CURRENCIES[state.currency];
  currencyBtn.textContent = cur.symbol;
  renderDenoms();
  const total = getTotal();
  totalMoneyEl.textContent = `${cur.symbol} ${fmt(total)}`;
  coinCountEl.textContent = `${getTotalCoins()} sztuk`;
  renderJars(total);
}

currencyBtn.addEventListener('click', () => {
  const idx = CURRENCY_ORDER.indexOf(state.currency);
  state.currency = CURRENCY_ORDER[(idx + 1) % CURRENCY_ORDER.length];
  saveState();
  render();
});

resetBtn.addEventListener('click', () => {
  if (confirm('Wyzerować wszystkie liczniki dla bieżącej waluty?')) {
    state.counts[state.currency] = {};
    saveState();
    render();
  }
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
