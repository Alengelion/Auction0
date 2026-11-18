/* ============================================================
   STORE — единый слой данных.
   СЕЙЧАС: localStorage (демо). ЗАВТРА: Supabase.
   Все функции возвращают Promise → когда заменим на Supabase,
   страницы и скрипты останутся прежними.

   ★ Чтобы перейти на БД, поменяешь ТОЛЬКО внутренности функций
     (и уберёшь хранение паролей — там будет Supabase Auth).
   ============================================================ */

const DB_KEY = 'gavel_db_v1';

// ---- утилиты ----
function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function readDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);
  return { users: [], listings: [], bids: [], orders: [], session: null };
}
function writeDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  // уведомляем другие вкладки (эмуляция realtime)
  window.dispatchEvent(new Event('gavel-update'));
}
function notifyOtherTabs() {
  // storage-событие срабатывает в ДРУГИХ вкладках автоматически
}

// Слушатель изменений из других вкладок
window.addEventListener('storage', (e) => {
  if (e.key === DB_KEY) window.dispatchEvent(new Event('gavel-update'));
});

// ---- API ----

const store = {
  // ================= AUTH =================
  async register({ email, password, name, role, social_url = null, inn = null }) {
    const db = readDB();
    if (db.users.find(u => u.email === email)) throw new Error('Email уже занят');
    const user = {
      id: uid('u_'),
      email, password,
      name, role,
      social_url, inn, // ← новые поля для медиа и компаний
      deals_count: 0,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    db.session = user.id;
    writeDB(db);
    return user;
  },

  async login(email, password) {
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Неверный email или пароль');
    db.session = user.id;
    writeDB(db);
    return user;
  },

  async logout() {
    const db = readDB();
    db.session = null;
    writeDB(db);
  },

  async getMe() {
    const db = readDB();
    return db.users.find(u => u.id === db.session) || null;
  },

  async getProfile(userId) {
    const db = readDB();
    return db.users.find(u => u.id === userId) || null;
  },

  // ================= LOTS =================
  async getLots({ category, sort = 'ending' } = {}) {
    const db = readDB();
    let lots = db.listings.filter(l => l.status === 'active' || l.status === 'ended');
    if (category) lots = lots.filter(l => l.category === category);
    if (sort === 'ending') lots.sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at));
    if (sort === 'new') lots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // прикрепляем текущую цену и продавца
    return lots.map(l => this._decorateLot(db, l));
  },

  async getLot(id) {
    const db = readDB();
    const lot = db.listings.find(l => l.id === id);
    return lot ? this._decorateLot(db, lot) : null;
  },

  async createLot({ sellerId, title, description, category, image, startPrice, step, durationHours }) {
    const db = readDB();
    const seller = db.users.find(u => u.id === sellerId);
    if (!seller) throw new Error('Нужно войти');
    const limits = getLimits(seller.deals_count);
    const active = db.listings.filter(l => l.seller_id === sellerId && l.status === 'active').length;
    if (active >= limits.activeLots) {
      throw new Error(`Лимит активных лотов для вашего уровня: ${limits.activeLots}. Завершите сделки, чтобы повысить уровень.`);
    }
    const now = Date.now();
    const lot = {
      id: uid('l_'),
      seller_id: sellerId,
      title, description, category,
      image_url: image,           // base64 в демо; завтра — Storage URL
      start_price: Number(startPrice),
      step: Number(step),
      current_price: Number(startPrice),
      status: 'active',
      created_at: new Date(now).toISOString(),
      ends_at: new Date(now + durationHours * 3600 * 1000).toISOString(),
      extended_count: 0,
    };
    db.listings.push(lot);
    writeDB(db);
    return lot;
  },

  async getMyLots(userId) {
    const db = readDB();
    return db.listings.filter(l => l.seller_id === userId).map(l => this._decorateLot(db, l));
  },

  _decorateLot(db, lot) {
    const seller = db.users.find(u => u.id === lot.seller_id);
    const bids = db.bids.filter(b => b.lot_id === lot.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const topBid = bids[0] || null;
    return {
      ...lot,
      seller_name: seller?.name || '—',
      seller_deals: seller?.deals_count || 0,
      bids_count: bids.length,
      top_bid: topBid,
    };
  },

  // ================= BIDS =================
  async placeBid(lotId, userId, amount) {
    const db = readDB();
    const lot = db.listings.find(l => l.id === lotId);
    if (!lot) throw new Error('Лот не найден');
    if (lot.status !== 'active') throw new Error('Аукцион завершён');
    if (lot.seller_id === userId) throw new Error('Нельзя ставить на свой лот');

    const now = new Date();
    if (now > new Date(lot.ends_at)) throw new Error('Время аукциона истекло');

    const minNext = lot.bids_count === 0
      ? lot.start_price
      : lot.current_price + lot.step;
    // ВАЖНО: первый шаг = стартовая цена, далее current + step
    const topBid = db.bids.filter(b => b.lot_id === lotId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
    const minimum = topBid ? topBid.amount + lot.step : lot.start_price;
    if (Number(amount) < minimum) throw new Error(`Минимальная ставка: ${minimum} ₽`);

    const bid = {
      id: uid('b_'),
      lot_id: lotId,
      bidder_id: userId,
      amount: Number(amount),
      created_at: new Date().toISOString(),
    };
    db.bids.push(bid);
    lot.current_price = Number(amount);

    // Анти-снайпинг: ставка в последние 60 сек → +60 сек
    const msLeft = new Date(lot.ends_at) - now;
    if (msLeft < 60_000) {
      lot.ends_at = new Date(new Date(lot.ends_at).getTime() + 60_000).toISOString();
      lot.extended_count = (lot.extended_count || 0) + 1;
    }

    writeDB(db);
    return bid;
  },

  async getBids(lotId) {
    const db = readDB();
    return db.bids
      .filter(b => b.lot_id === lotId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(b => ({ ...b, bidder_name: db.users.find(u => u.id === b.bidder_id)?.name || '—' }));
  },

  // ================= ORDERS / СДЕЛКИ =================
  // Вызывается победителем: создаёт заказ и начисляет сделки.
  // ЗАВТРА: это будет делать триггер в Postgres (см. schema.sql)
  async completeOrder(lotId, buyerId) {
    const db = readDB();
    const lot = db.listings.find(l => l.id === lotId);
    if (!lot) throw new Error('Лот не найден');
    if (lot.status !== 'ended') throw new Error('Аукцион ещё не завершён');

    const topBid = db.bids.filter(b => b.lot_id === lotId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
    if (!topBid || topBid.bidder_id !== buyerId) throw new Error('Вы не победитель');

    if (db.orders.find(o => o.listing_id === lotId && o.status === 'completed')) {
      throw new Error('Сделка уже завершена');
    }

    const order = {
      id: uid('o_'),
      listing_id: lotId,
      buyer_id: buyerId,
      seller_id: lot.seller_id,
      amount: topBid.amount,
      status: 'completed', // в демо: сразу completed (заглушка оплаты)
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    db.orders.push(order);

    // ★ начисляем сделки обеим сторонам
    const buyer = db.users.find(u => u.id === buyerId);
    const seller = db.users.find(u => u.id === lot.seller_id);
    const buyerBefore = buyer ? getLevelInfo(buyer.deals_count).level : 0;
    const sellerBefore = seller ? getLevelInfo(seller.deals_count).level : 0;
    if (buyer) buyer.deals_count += 1;
    if (seller) seller.deals_count += 1;
    const buyerAfter = buyer ? getLevelInfo(buyer.deals_count).level : 0;
    const sellerAfter = seller ? getLevelInfo(seller.deals_count).level : 0;

    writeDB(db);
    return {
      order,
      levelUps: [
        buyerAfter > buyerBefore ? { user: buyer.name, from: buyerBefore, to: buyerAfter } : null,
        sellerAfter > sellerBefore ? { user: seller.name, from: sellerBefore, to: sellerAfter } : null,
      ].filter(Boolean),
    };
  },

  async getMyOrders(userId) {
    const db = readDB();
    return db.orders.filter(o => o.buyer_id === userId || o.seller_id === userId);
  },

  // ---- служебное: сброс демо-данных ----
  async _reset() {
    localStorage.removeItem(DB_KEY);
  },
};

window.store = store;