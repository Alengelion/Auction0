/* ============================================================
   AUTH-UI — отрисовка шапки и защита страниц
   ============================================================ */
(async function initAuthUI() {
  const slot = document.getElementById('auth-slot');
  if (!slot) return;

  const me = await store.getMe();

  if (me) {
    // Залогинен
    const info = getLevelInfo(me.deals_count);
    slot.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-left:10px; padding-left:16px; border-left:1px solid var(--border);">
        <a href="profile.html" style="display:flex; align-items:center; gap:8px;">
          <span style="color:var(--text); font-weight:500;">${me.name}</span>
          <span class="level-badge level-${info.level}">${info.name}</span>
        </a>
        <button onclick="store.logout().then(()=>location.reload())" class="btn" style="padding: 6px 12px; font-size:12px; border-color:#555; color:#aaa;">Выйти</button>
      </div>
    `;
  } else {
    // Гость
    slot.innerHTML = `<a href="login.html" class="btn" style="margin-left:10px;">Войти</a>`;
  }

  // Защита страниц (если на странице есть атрибут data-requires-auth)
  if (document.body.hasAttribute('data-requires-auth') && !me) {
    window.location.href = 'login.html';
  }
})();