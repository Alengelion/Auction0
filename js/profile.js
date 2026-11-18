/* ============================================================
   PROFILE — отрисовка профиля, прогресс-бар, завершение сделок
   ============================================================ */

async function renderProfile() {
  const me = await store.getMe();
  if (!me) return;
  const container = document.getElementById('profile-content');

  const info = getLevelInfo(me.deals_count);
  const limits = getLimits(me.deals_count);

  // 1. Получаем лоты, где юзер — продавец (его витрина)
  const myLots = await store.getMyLots(me.id);

  // 2. Получаем заказы (где он покупатель или продавец)
  const myOrders = await store.getMyOrders(me.id);
  
  // 3. Ищем лоты, которые он выиграл, но еще не завершил сделку
  const wonLots = [];
  for (const lot of myLots) {
    if (lot.status === 'active' && new Date(lot.ends_at) <= new Date()) {
      // Аукцион истек, а статус не обновился. Проверим, кто победил.
      const bids = await store.getBids(lot.id);
      const topBid = bids[0];
      if (topBid && topBid.bidder_id === me.id) wonLots.push({ ...lot, topBid });
    }
  }

  // Кнопки для оплаты (заглушка)
  const handleComplete = async (lotId) => {
    try {
      const res = await store.completeOrder(lotId, me.id);
      
      // Если произошло повышение уровня — показываем тост
      if (res.levelUps && res.levelUps.length > 0) {
        const up = res.levelUps.find(u => u.user === me.name) || res.levelUps[0];
        const toast = document.getElementById('level-toast');
        const nextLvlData = getLevelInfo(up.to === 6 ? 400 : [0,10,50,150,275,400][up.to-1]).name;
        document.getElementById('level-toast-text').innerHTML = 
          `Вы совершили ${up.to}-й уровень — <strong>${nextLvlData}</strong>!<br>Открыты новые возможности.`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
      }
      
      renderProfile(); // Перерисовываем
    } catch (e) {
      alert(e.message);
    }
  };
  
  window.handleComplete = handleComplete;

  // Формируем HTML
  container.innerHTML = `
    <div class="profile-header">
      <div class="avatar">${me.name.charAt(0).toUpperCase()}</div>
      <div class="profile-info">
        <h1>${me.name}</h1>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom: 12px;">
          <span class="role-badge role-${me.role}">
            ${me.role === 'private' ? 'Частное лицо' : me.role === 'media' ? 'Медиа' : 'Компания'}
          </span>
          <span class="level-badge level-${info.level}" style="font-size:14px; padding: 4px 12px;">${info.name}</span>
        </div>
        <p class="muted">Сделок завершено: <strong style="color:var(--text); font-size:16px;">${me.deals_count}</strong></p>
      </div>
    </div>

    <div class="level-progress">
      <div style="display:flex; justify-content:space-between; font-size: 14px;">
        <span>Прогресс до уровня <strong>${info.next ? info.next.name : 'Максимум'}</strong></span>
        <span>${info.next ? info.toNext + ' сделок' : ''}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${info.percent}%;"></div>
      </div>
      <p class="muted" style="font-size:12px;">Ваши возможности сейчас: ${info.perks}</p>
    </div>

    <h2 class="section-title" style="font-size: 24px; margin-top: 40px;">Ваши выигранные лоты</h2>
    ${wonLots.length === 0 ? `<div class="empty">Нет выигранных лотов, ожидающих оплаты.</div>` : `
      <div class="orders-list">
        ${wonLots.map(lot => `
          <div class="order-item">
            <img src="${lot.image_url}" alt="${lot.title}">
            <div class="order-details">
              <h3>${lot.title}</h3>
              <p>Вы выиграли этот лот!</p>
              <div class="order-price">${new Intl.NumberFormat('ru-RU').format(lot.topBid.amount)} ₽</div>
            </div>
            <button class="btn btn-solid" onclick="handleComplete('${lot.id}')">Оплатить (заглушка)</button>
          </div>
        `).join('')}
      </div>
    `}

    <h2 class="section-title" style="font-size: 24px; margin-top: 40px;">Витрина (Ваши лоты)</h2>
    <div id="lots" class="lots-grid">
      ${myLots.map(lot => {
        const isEnded = new Date(lot.ends_at) <= new Date();
        return `
          <a href="lot.html?id=${lot.id}" class="lot-card">
            <img src="${lot.image_url}" alt="${lot.title}">
            <div class="lot-card-body">
              <div class="lot-card-title">${lot.title}</div>
              <div class="lot-card-price">${new Intl.NumberFormat('ru-RU').format(lot.current_price)} ₽</div>
              <div class="lot-card-meta">
                <div>${lot.bids_count} ставок</div>
                <div style="color:${isEnded ? 'var(--danger)' : 'var(--gold)'}">${isEnded ? 'Завершён' : 'Активен'}</div>
              </div>
            </div>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

// Запуск
document.addEventListener('DOMContentLoaded', renderProfile);