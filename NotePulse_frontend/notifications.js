/* ============================================
   脉记 · 消息通知铃铛（风信）
   —— 依赖 user-utils.js 的 callApi / showToast / escapeHtml
   —— 挂载到 #bellHost（主页 nav 或简化导航）
   ============================================ */

(function () {
    let pollTimer = null;
    let bellEl = null;

    const API_BASE = window.MAIJI_API_BASE || '';

    function relTime(dateStr) {
        if (!dateStr) return '';
        let s = String(dateStr).replace(' ', 'T');
        // 后端用 datetime.utcnow() 存储 UTC 时间，但返回的 ISO 字符串不带 Z 后缀
        // 补上 Z 让浏览器按 UTC 解析，否则会当本地时间导致时间偏差
        if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
            s += 'Z';
        }
        const d = new Date(s);
        const diff = Date.now() - d.getTime();
        if (diff < 0) return '刚刚';
        const min = Math.floor(diff / 60000);
        if (min < 1) return '刚刚';
        if (min < 60) return min + '刻钟前';
        const hr = Math.floor(min / 60);
        if (hr < 24) return hr + '时辰前';
        const day = Math.floor(hr / 24);
        if (day < 30) return day + '日前';
        if (typeof toCnDate === 'function') return toCnDate(d);
        return d.toLocaleDateString('zh-CN');
    }

    function typeText(n) {
        const name = escapeHtml(n.actor_name || '佚名');
        const title = escapeHtml(n.post_title || '佚名帖');
        switch (n.type) {
            case 'comment':  return `<b>${name}</b> 评点了你的帖子《${title}》`;
            case 'reply':    return `<b>${name}</b> 回复了你在《${title}》中的评论`;
            case 'like':     return `<b>${name}</b> 称赞了你的帖子《${title}》`;
            case 'favorite': return `<b>${name}</b> 珍藏了你的帖子《${title}》`;
            default:         return `<b>${name}</b> 与你的帖子有了互动`;
        }
    }

    function typeIcon(type) {
        switch (type) {
            case 'comment':  return '评';
            case 'reply':    return '复';
            case 'like':     return '赞';
            case 'favorite': return '珍';
            default:         return '信';
        }
    }

    function buildBell() {
        const host = document.getElementById('bellHost');
        if (!host) return null;
        host.innerHTML = `
            <div class="bell-menu">
                <button class="icon-btn bell-btn" id="bellBtn" aria-label="风信" title="风信">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                    <span class="bell-badge" id="bellBadge" style="display:none;">0</span>
                </button>
                <div class="bell-dropdown" id="bellDropdown">
                    <div class="bell-head">
                        <span class="bell-title">风信</span>
                        <button class="bell-mark-all" id="bellMarkAll">全部已读</button>
                    </div>
                    <div class="bell-list" id="bellList">
                        <div class="bell-empty">暂无风信</div>
                    </div>
                </div>
            </div>
        `;
        const el = host.querySelector('.bell-menu');
        const btn = el.querySelector('#bellBtn');
        const dropdown = el.querySelector('#bellDropdown');
        const markAll = el.querySelector('#bellMarkAll');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('show');
            if (open) loadNotifications();
        });
        document.addEventListener('click', (e) => {
            if (!el.contains(e.target)) dropdown.classList.remove('show');
        });
        markAll.addEventListener('click', async () => {
            try {
                await callApi('/api/notifications/read-all', { method: 'PUT' });
                await loadNotifications();
                await pollUnread();
            } catch (err) { /* ignore */ }
        });
        return el;
    }

    async function pollUnread() {
        const token = localStorage.getItem('maiji_token');
        if (!token || !bellEl) return;
        try {
            const data = await callApi('/api/notifications/unread-count', { method: 'GET' });
            const badge = bellEl.querySelector('#bellBadge');
            if (badge) {
                const cnt = data.unread || 0;
                badge.textContent = cnt > 99 ? '99+' : cnt;
                badge.style.display = cnt > 0 ? '' : 'none';
            }
        } catch (_) { /* token expired etc */ }
    }

    async function loadNotifications() {
        const listEl = bellEl?.querySelector('#bellList');
        if (!listEl) return;
        listEl.innerHTML = '<div class="bell-empty">展卷载入…</div>';
        try {
            const data = await callApi('/api/notifications?page=1&size=20', { method: 'GET' });
            const items = data.items || [];
            if (!items.length) {
                listEl.innerHTML = '<div class="bell-empty">暂无风信</div>';
                return;
            }
            listEl.innerHTML = items.map(n => `
                <div class="bell-item ${n.is_read ? '' : 'unread'}" data-nid="${n.id}" data-pid="${n.post_id || ''}" data-cid="${n.comment_id || ''}">
                    <div class="bell-item-icon">${typeIcon(n.type)}</div>
                    <div class="bell-item-body">
                        <div class="bell-item-text">${typeText(n)}</div>
                        <div class="bell-item-time">${relTime(n.created_at)}</div>
                    </div>
                </div>
            `).join('');
            listEl.querySelectorAll('.bell-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const nid = item.dataset.nid;
                    const pid = item.dataset.pid;
                    const cid = item.dataset.cid;
                    try {
                        await callApi(`/api/notifications/${nid}/read`, { method: 'PUT' });
                    } catch (_) { /* ignore */ }
                    item.classList.remove('unread');
                    const dropdown = bellEl?.querySelector('#bellDropdown');
                    if (dropdown) dropdown.classList.remove('show');
                    if (pid && typeof openPostDetail === 'function') {
                        openPostDetail(Number(pid), { commentId: cid ? Number(cid) : null });
                    } else if (pid) {
                        const sep = cid ? `&cmt=${cid}` : '';
                        location.href = `index.html?post=${pid}${sep}`;
                    }
                    await pollUnread();
                });
            });
        } catch (err) {
            listEl.innerHTML = `<div class="bell-empty">载入失败</div>`;
        }
    }

    function init() {
        const token = localStorage.getItem('maiji_token');
        if (!token) return;
        // 用 requestAnimationFrame 确保 injectSimpleNav 先执行完
        requestAnimationFrame(() => {
            bellEl = buildBell();
            if (!bellEl) return;
            pollUnread();
            pollTimer = setInterval(pollUnread, 30000);
        });
    }

    // 清理：登出时停止轮询
    window.addEventListener('storage', (e) => {
        if (e.key === 'maiji_token' && !e.newValue) {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            if (bellEl) { bellEl.style.display = 'none'; }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
