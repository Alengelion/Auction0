/* ============================================================
   Уровни коллекционера. Пороги — количество завершённых сделок.
   Меняешь тут — меняется везде.
   ============================================================ */
const LEVELS = [
  { level: 1, name: 'Новичок',      threshold: 0,   perks: 'Базовый листинг, 3 фото, 1 активный лот' },
  { level: 2, name: 'Коллекционер', threshold: 10,  perks: '5 фото, витрина-профиль, 3 активных лота' },
  { level: 3, name: 'Знаток',       threshold: 50,  perks: '10 фото, видео, 5 активных лотов, приватные лоты' },
  { level: 4, name: 'Эксперт',      threshold: 150, perks: '15 фото, 10 активных лотов, аналитика' },
  { level: 5, name: 'Мастер',       threshold: 275, perks: '20 фото, 20 активных лотов, бейдж в ленте' },
  { level: 6, name: 'Легенда',      threshold: 400, perks: 'Всё + ручная модерация, эфиры' },
];

function getLevelInfo(dealsCount) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (dealsCount >= l.threshold) current = l;
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  const span = next ? next.threshold - current.threshold : 0;
  const done = next ? dealsCount - current.threshold : 1;
  const percent = next ? Math.min(100, Math.round((done / span) * 100)) : 100;
  return {
    level: current.level,
    name: current.name,
    perks: current.perks,
    dealsCount,
    next: next ? { level: next.level, name: next.name, threshold: next.threshold } : null,
    toNext: next ? next.threshold - dealsCount : 0,
    percent,
  };
}

// Лимиты по уровню (используются при создании лота)
function getLimits(dealsCount) {
  const lvl = getLevelInfo(dealsCount).level;
  const photos = [3, 5, 10, 15, 20, 20][lvl - 1];
  const activeLots = [1, 3, 5, 10, 20, 20][lvl - 1];
  return { photos, activeLots };
}