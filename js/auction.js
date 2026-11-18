/* ============================================================
   AUCTION — страница лота, ставки, таймер, анти-снайпинг
   ============================================================ */

// Получаем ID лота из URL (lot.html?id=l_demo1)
const urlParams = new URLSearchParams(window.location.search);
const lotId = urlParams.get('id');

let currentLot = null;
let currentUser = null;
let timerInterval = null;

// Форматирование
const fmtPrice = (n) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
const fmtTime = (ms) => {
  if (ms <= 0) return 'Завершён';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 24) return `${Math.floor(h / 24)} д ${h % 24} ч`;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${s} сек`;
  return `${s} сек`;
};

// Загрузка и отрисовка
async function loadLotPage() {
  currentUser = await store.getMe();
  currentLot = await store.getLot(lotId);
  
  const container = document.getElementById('lot-content');

  if (!currentLot) {
    container.innerHTML = `<div class="empty">Лот не найден. <a href="index.html">Вернуться в ленту</a></div>`;
    return;
  }

  const bids = await store.getBids(lotId);
  const isEnded = new Date(currentLot.ends_at) <= new Date() || currentLot.status === 'ended';
  const sellerLvl = getLevelInfo(currentLot.seller_deals);
  
  // Проверка: может ли текущий юзер делать ставку
  let canBid = true;
  let bidReason = '';
  if (!currentUser) { canBid = false; bidReason = 'Войдите, чтобы сделать ставку'; }
  else if (currentUser.id === currentLot.seller_id) { canBid = false; bidReason = 'Вы не можете делать ставки на свой лот'; }
  else if (isEnded) { canBid = false; bidReason = 'Аукцион завершён'; }

  // Минимальная ставка
  const minBid = bids.length > 0 ? currentLot.current_price + currentLot.step : currentLot.start_price;

  // Рендерим HTML
  container.innerHTML = `
    <div class="lot-layout">
      <!-- Левая часть: Фото -->
      <div>
        <img src="${currentLot.image_url}" alt="${currentLot.title}" class="lot-image-large">
      </div>

      <!-- Правая часть: Инфо и ставки -->
      <div class="lot-info">
        <div class="lot-header">
          <h1>${currentLot.title}</h1>
          <div class="lot-seller">
            Продавец: <strong>${currentLot.seller_name}</strong>
            <span class="level-badge level-${sellerLvl.level}">${sellerLvl.name}</span>
          </div>
        </div>

        <p style="color: var(--text-dim); line-height: 1.6;">${currentLot.description || 'Без описания'}</p>
        
        <div style="font-size: 14px; color: var(--text-dim);">
          Категория: <span style="color:var(--text);">${currentLot.category}</span> &nbsp;•&nbsp; 
          Ставок: <span style="color:var(--text);">${bids.length}</span>
        </div>

        <div class="bid-box">
          <div class="bid-current">Текущая цена</div>
          <div class="bid-price">${fmtPrice(currentLot.current_price)}</div>
          <div class="bid-timer" id="lot-timer">⏱ Загрузка...</div>

          ${isEnded ? `
            <div class="ended-banner">Аукцион завершён</div>
          ` : canBid ? `
            <form id="bid-form">
              <div class="bid-form-row">
                <input type="number" id="bid-amount" min="${minBid}" step="${currentLot.step}" value="${minBid}" required>
                <button type="submit" class="btn btn-solid" style="padding: 0 24px;">Ставка</button>
              </div>
              <div style="font-size:12px; color:var(--text-dim); margin-top:8px;">Минимальная ставка: ${fmtPrice(minBid)} (шаг ${fmtPrice(currentLot.step)})</div>
              <div class="bid-error" id="bid-error"></div>
              <div class="bid-success" id="bid-success"></div>
            </form>
          ` : `
            <div style="text-align:center; padding: 16px; background: var(--bg-soft); border-radius: 8px; color: var(--text-dim); font-size: 14px;">
              ${bidReason}
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- История ставок -->
    <div class="history-section">
      <h2 class="section-title" style="font-size: 22px;">История ставок</h2>
      <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;">
        <table class="history-table">
          <thead><tr><th>Участник</th><th>Ставка</th><th>Время</th></tr></thead>
          <tbody>
            ${bids.length === 0 ? `<tr><td colspan="3" style="text-align:center; color:var(--text-dim);">Ставок пока нет. Будьте первым!</td></tr>` : 
              bids.map((b, i) => `
                <tr>
                  <td>${b.bidder_name} ${b.bidder_id === currentUser?.id ? '<span class="muted">(Вы)</span>' : ''}</td>
                  <td class="${i === 0 ? 'top-bid' : ''}">${fmtPrice(b.amount)}</td>
                  <td class="muted">${new Date(b.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Запуск таймера
  startTimer(isEnded);

  // Обработчик формы ставки
  if (canBid && !isEnded) {
    document.getElementById('bid-form').onsubmit = handleBid;
  }
}

// Логика таймера
function startTimer(isEnded) {
  const timerEl = document.getElementById('lot-timer');
  if (isEnded) { timerEl.textContent = 'Завершён'; return; }
  
  clearInterval(timerInterval);
  const tick = () => {
    const msLeft = new Date(currentLot.ends_at) - new Date();
    if (msLeft <= 0) {
      timerEl.textContent = 'Завершён';
      clearInterval(timerInterval);
      loadLotPage(); // перерисовать, чтобы убрать кнопку ставки
      return;
    }
    timerEl.innerHTML = `⏱ До конца: <strong>${fmtTime(msLeft)}</strong>`;
    timerEl.classList.toggle('urgent', msLeft < 60000); // красный, если меньше минуты
  };
  tick();
  timerInterval = setInterval(tick, 1000);
}

// Обработка ставки
async function handleBid(e) {
  e.preventDefault();
  const errEl = document.getElementById('bid-error');
  const okEl = document.getElementById('bid-success');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  const amount = Number(document.getElementById('bid-amount').value);
  const btn = e.target.querySelector('button');
  btn.disabled = true;

  try {
    await store.placeBid(lotId, currentUser.id, amount);
    okEl.textContent = 'Ставка принята!';
    okEl.style.display = 'block';
    setTimeout(() => loadLotPage(), 800); // перерисовать с новыми данными
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
  }
}

// Слушаем обновления из других вкладок (эмуляция realtime)
window.addEventListener('gavel-update', () => {
  if (lotId) loadLotPage();
});

// Старт
if (lotId) {
  document.addEventListener('DOMContentLoaded', loadLotPage);
} else {
  document.getElementById('lot-content').innerHTML = '<div class="empty">ID лота не указан</div>';
}