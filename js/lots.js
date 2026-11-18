/* ============================================================
   LOTS — логика ленты лотов (главная страница)
   ============================================================ */

// Функция для красивого форматирования цены
function formatPrice(num) {
  return new Intl.NumberFormat('ru-RU').format(num) + ' ₽';
}

// Функция для расчета оставшегося времени
function getTimeLeft(endsAt) {
  const ms = new Date(endsAt) - new Date();
  if (ms <= 0) return 'Завершён';
  
  const sec = Math.floor(ms / 1000);
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} д ${hours % 24} ч`;
  if (hours > 0) return `${hours} ч ${mins % 60} мин`;
  if (mins > 0) return `${mins} мин ${sec % 60} сек`;
  return `${sec} сек`;
}

// Главная функция отрисовки ленты
async function renderLots() {
  const grid = document.getElementById('lots');
  if (!grid) return;

  const lots = await store.getLots({ sort: 'ending' }); // сортируем: кто заканчивается раньше

  if (lots.length === 0) {
    grid.innerHTML = `<div class="empty" style="grid-column: 1/-1;">Пока нет активных лотов. Станьте первым!</div>`;
    return;
  }

  grid.innerHTML = lots.map(lot => {
    const isEnded = new Date(lot.ends_at) <= new Date() || lot.status === 'ended';
    const timeText = getTimeLeft(lot.ends_at);
    
    // Получаем уровень продавца для бейджа
    const sellerLvl = getLevelInfo(lot.seller_deals);
    
    return `
      <a href="lot.html?id=${lot.id}" class="lot-card">
        <img src="${lot.image_url || 'https://picsum.photos/400/400?random=1'}" alt="${lot.title}">
        <div class="lot-card-body">
          <div class="lot-card-title">${lot.title}</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:10px;">
            <div class="lot-card-price">${formatPrice(lot.current_price)}</div>
            <div class="muted" style="font-size:11px;">${lot.bids_count} ставок</div>
          </div>
          
          <div class="lot-card-meta" style="margin-top:8px; border-top:1px solid var(--border); padding-top:8px;">
            <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
              <span style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden; max-width:100px;">${lot.seller_name}</span>
              <span class="level-badge level-${sellerLvl.level}" style="font-size:9px; padding:1px 6px;">${sellerLvl.name}</span>
            </div>
            <div style="color: ${isEnded ? 'var(--text-dim)' : 'var(--gold)'}; font-weight: 500;">
              ${isEnded ? 'Завершён' : '⏱ ' + timeText}
            </div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // Запускаем обновление таймеров каждую секунду
  setInterval(() => {
    document.querySelectorAll('.lot-card').forEach((card, i) => {
      const lot = lots[i];
      const isEnded = new Date(lot.ends_at) <= new Date() || lot.status === 'ended';
      const timeEl = card.querySelector('.lot-card-meta > div:last-child');
      if (timeEl && !isEnded) {
        timeEl.innerHTML = '⏱ ' + getTimeLeft(lot.ends_at);
      }
    });
  }, 1000);
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', renderLots);