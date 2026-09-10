/* ============================================
   脉记 · 用户中心独立页面共享工具
   —— 供 profile / my-notes / favorites / settings 引用
   包含：callApi / showToast / escapeHtml / toCnDate / pickColor
        / applyGuAvatar / 登录态管理 / 简化导航注入 / 鉴权守卫
   ============================================ */

const USER_API_BASE = window.MAIJI_API_BASE || '';
const USER_TOKEN_KEY = 'maiji_token';
const USER_USER_KEY = 'maiji_user';
const USER_PREFS_KEY = 'maiji_prefs';

/* ---------- API 调用（带 Bearer token） ---------- */
async function callApi(path, { method = 'POST', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(USER_TOKEN_KEY);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(USER_API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* 无 JSON 体 */ }
    if (!res.ok) {
        const msg = (data && (data.detail || data.message)) || ('请求失败：' + res.status);
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    return data;
}

/* ---------- Toast 提示（自带容器，不依赖页面已有 DOM） ---------- */
function showToast(msg, type = 'info') {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'toastWrap';
        wrap.className = 'toast-wrap';
        wrap.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = msg;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 300);
    }, 2400);
}

/* ---------- HTML 转义 ---------- */
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

/* ---------- 日期 → 中文年月日 ---------- */
function toCnDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

/* ---------- 名字首字符取色（古风五方色） ---------- */
function pickColor(name) {
    const palette = ['#b7472a', '#3d4e6d', '#a0632a', '#7a8f69', '#6b1a4a', '#a07a2c'];
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
}

/* ---------- 蛊虫纷飞头像（暗紫红渐变 + 飞虫 + 蛊字徽） ---------- */
function applyGuAvatar(el) {
    if (!el) return;
    el.innerHTML = `
        <svg viewBox="0 0 48 48" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
             xmlns="http://www.w3.org/2000/svg" style="display:block;">
            <defs>
                <radialGradient id="guBg" cx="35%" cy="30%" r="80%">
                    <stop offset="0%" stop-color="#6b1a4a"/>
                    <stop offset="55%" stop-color="#3a0f28"/>
                    <stop offset="100%" stop-color="#15060f"/>
                </radialGradient>
            </defs>
            <rect width="48" height="48" fill="url(#guBg)"/>
            <g fill="#e8c46a" opacity="0.92">
                <circle cx="10" cy="12" r="1.4"/>
                <circle cx="34" cy="9" r="1.1"/>
                <circle cx="40" cy="22" r="1.6"/>
                <circle cx="14" cy="32" r="1.2"/>
                <circle cx="28" cy="38" r="1.5"/>
                <circle cx="6" cy="26" r="1.0"/>
                <circle cx="38" cy="40" r="1.3"/>
            </g>
            <g fill="none" stroke="#e8c46a" stroke-width="0.5" opacity="0.4">
                <path d="M8 14 Q18 8 34 10"/>
                <path d="M40 22 Q30 28 16 32"/>
                <path d="M28 38 Q22 32 14 32"/>
            </g>
            <text x="24" y="30" text-anchor="middle" font-family="serif"
                  font-size="14" font-weight="700" fill="#e8c46a">蛊</text>
        </svg>`;
}

/* ---------- 登录态管理 ---------- */
function renderUserState(user) {
    if (!user) return;
    const name = user.username || '同道';
    const email = user.email || '';
    // 顶部圆形头像按钮（页面顶部始终可见的那个）
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        // 若用户设了自定义头像 URL，用 <img> 显示；否则注入蛊虫纷飞 SVG
        if (user.avatar) {
            userAvatar.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            applyGuAvatar(userAvatar);
        }
    }
    // 下拉头部的头像
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) {
        if (user.avatar) {
            navAvatar.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            applyGuAvatar(navAvatar);
        }
    }
    const navName = document.getElementById('navName');
    if (navName) navName.textContent = name;
    const navEmail = document.getElementById('navEmail');
    if (navEmail) navEmail.textContent = email;
    const udHeadGuest = document.getElementById('udHeadGuest');
    const udHeadUser = document.getElementById('udHeadUser');
    const udListGuest = document.getElementById('udListGuest');
    const udListUser = document.getElementById('udListUser');
    if (udHeadGuest) udHeadGuest.style.display = 'none';
    if (udHeadUser) udHeadUser.style.display = '';
    if (udListGuest) udListGuest.style.display = 'none';
    if (udListUser) udListUser.style.display = '';
}

function renderGuestState() {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.textContent = '游';
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) navAvatar.textContent = '游';
    const navName = document.getElementById('navName');
    if (navName) navName.textContent = '游客';
    const udHeadGuest = document.getElementById('udHeadGuest');
    const udHeadUser = document.getElementById('udHeadUser');
    const udListGuest = document.getElementById('udListGuest');
    const udListUser = document.getElementById('udListUser');
    if (udHeadGuest) udHeadGuest.style.display = '';
    if (udHeadUser) udHeadUser.style.display = 'none';
    if (udListGuest) udListGuest.style.display = '';
    if (udListUser) udListUser.style.display = 'none';
}

function restoreLoginState() {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    const userJson = localStorage.getItem(USER_USER_KEY);
    if (token && userJson) {
        try {
            const user = JSON.parse(userJson);
            renderUserState(user);
            return true;
        } catch (_) { /* 损坏数据忽略 */ }
    }
    renderGuestState();
    return false;
}

function logoutUser() {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_USER_KEY);
    renderGuestState();
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('show');
    showToast('已退出登录', 'info');
}

/* ---------- 全局同步：监听 user:updated 事件 + 跨标签页 storage 事件 ---------- */
// 同页面内（如设置页保存后立即刷新顶部头像）
document.addEventListener('user:updated', e => {
    const user = e.detail;
    if (user) renderUserState(user);
});
// 跨标签页同步：其他标签页修改了 localStorage 时触发
window.addEventListener('storage', e => {
    if (e.key === USER_USER_KEY && e.newValue) {
        try {
            const user = JSON.parse(e.newValue);
            renderUserState(user);
        } catch (_) { /* ignore */ }
    }
    if (e.key === USER_TOKEN_KEY && !e.newValue) {
        // 其他标签页登出了
        renderGuestState();
    }
});

/* ---------- 鉴权守卫：未登录跳回首页 ---------- */
function guardAuth() {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    if (!token) {
        // 用 sessionStorage 记录来源，供登录后跳回（可选增强）
        try { sessionStorage.setItem('maiji_redirect', location.href); } catch (_) {}
        location.href = 'index.html';
        return false;
    }
    return true;
}

/* ---------- 注入简化导航 ---------- */
function injectSimpleNav(activePage) {
    const nav = document.getElementById('simpleNav');
    if (!nav) return;
    nav.className = 'nav page-nav';
    nav.innerHTML = `
        <div class="nav-inner">
            <a href="index.html" class="page-logo">
                <span class="logo-seal">脉</span>
                <span class="logo-text">脉记</span>
            </a>
            <a href="index.html" class="back-link">← 返回首页</a>
            <button class="icon-btn note-btn" id="noteBtn" aria-label="记一笔" title="记一笔">
                <span class="note-btn-seal">墨</span>
            </button>
            <div class="bell-host" id="bellHost"></div>
            <div class="user-menu" id="userMenu">
                <button class="user-avatar" id="userAvatar" aria-label="用户菜单">游</button>
                <div class="user-dropdown" id="userDropdown">
                    <div class="ud-head ud-head-guest" id="udHeadGuest">
                        <div class="ud-head-avatar">游</div>
                        <div class="ud-head-info">
                            <div class="ud-head-name">游客</div>
                            <div class="ud-head-sub">未登录</div>
                        </div>
                    </div>
                    <div class="ud-head ud-head-user" id="udHeadUser" style="display:none;">
                        <div class="ud-head-avatar" id="navAvatar">蛊</div>
                        <div class="ud-head-info">
                            <div class="ud-head-name" id="navName">同道</div>
                            <div class="ud-head-sub" id="navEmail">—</div>
                        </div>
                    </div>
                    <div class="ud-list" id="udListGuest">
                        <a href="index.html"><span>↩</span> 去登录</a>
                    </div>
                    <div class="ud-list" id="udListUser" style="display:none;">
                        <a href="profile.html" class="${activePage === 'profile' ? 'active' : ''}"><span>人</span> 个人中心</a>
                        <a href="my-notes.html" class="${activePage === 'my-notes' ? 'active' : ''}"><span>墨</span> 我的笔记</a>
                        <a href="favorites.html" class="${activePage === 'favorites' ? 'active' : ''}"><span>珍</span> 我的收藏</a>
                        <a href="settings.html" class="${activePage === 'settings' ? 'active' : ''}"><span>设</span> 设置</a>
                        <div class="ud-divider"></div>
                        <a href="#" id="logoutBtn"><span>↩</span> 退出登录</a>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 头像点击切换下拉
    const userAvatar = document.getElementById('userAvatar');
    const userDropdown = document.getElementById('userDropdown');
    if (userAvatar && userDropdown) {
        userAvatar.addEventListener('click', e => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        document.addEventListener('click', e => {
            if (!userMenu.contains(e.target)) userDropdown.classList.remove('show');
        });
    }

    // 退出登录
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            logoutUser();
            setTimeout(() => location.href = 'index.html', 600);
        });
    }

    // 顶部"墨"按钮 → 打开笔记编辑模态框
    const noteBtn = document.getElementById('noteBtn');
    if (noteBtn) {
        noteBtn.addEventListener('click', () => {
            if (typeof openNoteEditor === 'function') openNoteEditor();
        });
    }
}

/* ---------- 暗夜卷帙 / 笔锋字体偏好（启动时应用） ---------- */
(function applyStoredPrefs() {
    try {
        const prefs = JSON.parse(localStorage.getItem(USER_PREFS_KEY) || '{}');
        if (prefs.darkMode) document.body.classList.add('dark-mode');
        if (prefs.brushFont) document.body.classList.add('brush-font-mode');
    } catch (_) { /* ignore */ }
})();
