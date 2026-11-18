/* ============================================================
   Демо-данные: пользователи, лоты, ставки.
   Запускается один раз при первом открытии (если база пуста).
   Демо-пароль у всех: 123456
   ============================================================ */
(async function seed() {
  const db = JSON.parse(localStorage.getItem('gavel_db_v1') || 'null');
  if (db && db.users && db.users.length) return; // уже засеяно

  const now = Date.now();
  const h = (n) => new Date(now + n * 3600 * 1000).toISOString();

  const users = [
    { id: 'u_demo1', email: 'collector@gavel.demo', password: '123456', name: 'Анна Соколова', role: 'private', deals_count: 52,  avatar_url: null, created_at: h(-500) },
    { id: 'u_demo2', email: 'blogger@gavel.demo',   password: '123456', name: 'Максим Литвин', role: 'media',   deals_count: 12,  avatar_url: null, created_at: h(-400) },
    { id: 'u_demo3', email: 'company@gavel.demo',   password: '123456', name: 'Антиквариум LLC', role: 'company', deals_count: 160, avatar_url: null, created_at: h(-300) },
    { id: 'u_demo4', email: 'newbie@gavel.demo',    password: '123456', name: 'Иван Новиков', role: 'private', deals_count: 3,   avatar_url: null, created_at: h(-100) },
  ];

  const img = (seed) => `https://picsum.photos/seed/${seed}/600/600`;

  const listings = [
    { id: 'l_demo1', seller_id: 'u_demo1', title: 'Серебряный рубль 1898 г.', description: 'Подлинник, отличная сохранность. Провенанс: частная коллекция.', category: 'Монеты', image_url: img('coin1'), start_price: 5000, step: 500, current_price: 6500, status: 'active', created_at: h(-20), ends_at: h(0.5), extended_count: 0 },
    { id: 'l_demo2', seller_id: 'u_demo2', title: 'Винил: Pink Floyd — The Wall (1979)', description: 'Первый пресс, конверт в идеале.', category: 'Винил', image_url: img('vinyl2'), start_price: 3000, step: 250, current_price: 3500, status: 'active', created_at: h(-30), ends_at: h(2), extended_count: 0 },
    { id: 'l_demo3', seller_id: 'u_demo3', title: 'Картина «Закат над Невой», 1962', description: 'Холст, масло. Реставрация не требуется.', category: 'Живопись', image_url: img('art3'), start_price: 40000, step: 2000, current_price: 44000, status: 'active', created_at: h(-50), ends_at: h(6), extended_count: 0 },
    { id: 'l_demo4', seller_id: 'u_demo1', title: 'Фигурка: Дракон, фарфор (XIX в.)', description: 'Клеймо мануфактуры. Музейное состояние.', category: 'Антиквариат', image_url: img('dragon4'), start_price: 12000, step: 1000, current_price: 12000, status: 'active', created_at: h(-10), ends_at: h(12), extended_count: 0 },
    { id: 'l_demo5', seller_id: 'u_demo2', title: 'Комикс: Amazing Spider-Man #300', description: 'Ключевой выпуск, CGC 9.2.', category: 'Комиксы', image_url: img('comic5'), start_price: 20000, step: 1000, current_price: 21000, status: 'active', created_at: h(-5), ends_at: h(24), extended_count: 0 },
  ];

  const bids = [
    { id: 'b_1', lot_id: 'l_demo1', bidder_id: 'u_demo2', amount: 6000, created_at: h(-3) },
    { id: 'b_2', lot_id: 'l_demo1', bidder_id: 'u_demo3', amount: 6500, created_at: h(-1) },
    { id: 'b_3', lot_id: 'l_demo2', bidder_id: 'u_demo1', amount: 3250, created_at: h(-4) },
    { id: 'b_4', lot_id: 'l_demo2', bidder_id: 'u_demo4', amount: 3500, created_at: h(-2) },
    { id: 'b_5', lot_id: 'l_demo3', bidder_id: 'u_demo1', amount: 42000, created_at: h(-5) },
    { id: 'b_6', lot_id: 'l_demo3', bidder_id: 'u_demo2', amount: 44000, created_at: h(-1.5) },
    { id: 'b_7', lot_id: 'l_demo5', bidder_id: 'u_demo4', amount: 21000, created_at: h(-1) },
  ];

  localStorage.setItem('gavel_db_v1', JSON.stringify({
    users, listings, bids, orders: [], session: null,
  }));

  console.log('%c[Gavel] Демо-данные загружены. Логин: collector@gavel.demo / 123456', 'color:#c9a24b');
})();