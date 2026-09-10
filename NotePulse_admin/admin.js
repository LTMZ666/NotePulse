/* ============================================
   NotePulse 典枢院（管理端）· 交互逻辑
   登录验证（调用后端 /api/admin/login） + 仪表盘渲染（真实 API 数据）
   Tab/按钮交互 + 数字滚动 + 柱状/环形图
   ============================================ */

(function () {
    'use strict';

    // ---------- 配置 ----------
    // 同域部署时留空走相对路径；本地开发前后端分离时可改成如 'http://localhost:8000'
    const API_BASE = window.MAIJI_API_BASE || '';
    const SESSION_KEY = 'maiji_admin_session';
    const FRONT_URL = '/';  // 返回前台（同域名根）

    // ---------- DOM ----------
    const $ = sel => document.querySelector(sel);
    const $$ = sel => document.querySelectorAll(sel);
    const loginView = $('#loginView');
    const dashView = $('#dashboardView');
    const loginForm = $('#loginForm');
    const usernameInput = $('#username');
    const passwordInput = $('#password');
    const togglePwdBtn = $('#togglePwd');
    const errorToast = $('#errorToast');
    const errorText = $('#errorText');
    const btnLogout = $('#btnLogout');
    const backHome = $('#backHome');
    const globalToast = $('#globalToast');

    // ---------- 工具 ----------
    function showError(msg) {
        errorText.textContent = msg || '主笔之号或开卷之钥有误，请再审慎赐下';
        errorToast.style.display = 'flex';
        setTimeout(() => { errorToast.style.display = 'none'; }, 3500);
    }
    function toast(msg, type = 'ok') {
        globalToast.textContent = msg;
        globalToast.className = 'global-toast ' + (type === 'err' ? 'toast-err' : type === 'ok' ? 'toast-ok' : '');
        globalToast.style.display = 'block';
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { globalToast.style.display = 'none'; }, 2400);
    }
    function formatNum(n) { return (n || 0).toLocaleString('en-US'); }
    function animateNumber(el, target, duration = 1400) {
        target = Number(target) || 0;
        const start = performance.now();
        const from = 0;
        function step(now) {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = Math.floor(from + (target - from) * eased);
            el.textContent = formatNum(val);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = formatNum(target);
        }
        requestAnimationFrame(step);
    }

    // ---------- API 封装 ----------
    async function api(path, opts = {}) {
        const url = API_BASE + path;
        const session = getSession();
        const headers = Object.assign({}, opts.headers || {});
        if (session && session.token) headers['Authorization'] = 'Bearer ' + session.token;
        if (opts.body && !(opts.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(url, {
            method: opts.method || 'GET',
            headers,
            body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
        });
        let data = null;
        try { data = await res.json(); } catch (_) { /* 无 JSON 体 */ }
        if (!res.ok) {
            // 401：凭证失效，清登录态
            if (res.status === 401) {
                clearSession();
                showLoginView();
            }
            const msg = (data && (data.detail || data.message)) || ('请求失败：' + res.status);
            const err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    // ---------- 登录态 ----------
    function getSession() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
        catch { return null; }
    }
    function setSession(token, username) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, username, loginAt: Date.now() }));
    }
    function clearSession() { sessionStorage.removeItem(SESSION_KEY); }
    function isLoggedIn() { return !!getSession(); }
    function showLoginView() {
        loginView.style.display = 'flex';
        dashView.style.display = 'none';
        document.title = '脉记·典枢院 | 请登录';
    }
    function showDashView() {
        loginView.style.display = 'none';
        dashView.style.display = 'block';
        document.title = '脉记·典枢院 | NotePulse Admin';
        if (!showDashView._ran) {
            setTimeout(runOverviewAnimations, 80);
            renderPosts();
            renderUsers();
            showDashView._ran = true;
        }
    }

    // ---------- 密码显隐 ----------
    togglePwdBtn.addEventListener('click', () => {
        const t = passwordInput.type;
        passwordInput.type = (t === 'password') ? 'text' : 'password';
    });

    // ---------- 登录提交（调用后端） ----------
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const u = usernameInput.value.trim();
        const p = passwordInput.value;
        if (!u || !p) { showError('请填齐主笔之号与开卷之钥'); return; }
        try {
            const data = await api('/api/admin/login', { method: 'POST', body: { username: u, password: p } });
            setSession(data.access_token, data.username || u);
            toast('枢门已启，恭迎主笔入内院', 'ok');
            setTimeout(showDashView, 450);
        } catch (err) {
            showError(err.message || '主笔之号或开卷之钥有误，请再审慎赐下');
            [usernameInput, passwordInput].forEach(el => {
                const wrap = el.closest('.field-input-wrap');
                wrap.style.animation = 'shakeToast .4s';
                setTimeout(() => { wrap.style.animation = ''; }, 450);
            });
        }
    });

    // ---------- 退出 ----------
    btnLogout.addEventListener('click', () => {
        if (confirm('确定退枢出典吗？将返回枢门登录页。')) {
            clearSession();
            showDashView._ran = false;
            showLoginView();
            toast('已退枢出典，欢迎再次入卷', 'ok');
        }
    });
    backHome.addEventListener('click', () => {
        window.location.href = FRONT_URL;
    });

    // ---------- Tab 切换 ----------
    $$('.dash-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.dash-tab').forEach(t => t.classList.toggle('active', t === tab));
            $$('.dash-panel').forEach(p => {
                p.classList.toggle('active', p.dataset.panel === target);
            });
            if (target === 'overview') runOverviewAnimations();
            if (target === 'posts') renderPosts();
            if (target === 'users') renderUsers();
        });
    });

    // ============================================
    // 壹·藏鉴概览（GET /api/admin/stats）
    // ============================================
    let _statsCache = null;
    async function fetchStats() {
        if (_statsCache) return _statsCache;
        try {
            _statsCache = await api('/api/admin/stats');
        } catch (err) {
            toast(err.message || '概览数据获取失败', 'err');
            _statsCache = null;
        }
        return _statsCache;
    }

    async function runOverviewAnimations() {
        const data = await fetchStats();
        if (!data) return;
        const ov = data.overview || {};
        // 四张统计卡片：卷籍总数 / 思想脉动 / 在册同道 / 新墨投稿（待审）
        const cards = $$('.stat-card .sc-num');
        const targets = [ov.post_count || 0, ov.total_reads || 0, ov.user_count || 0, ov.pending_count || 0];
        cards.forEach((el, i) => {
            el.dataset.target = targets[i];
            animateNumber(el, targets[i]);
        });
        renderBarChart(data.daily_trend || []);
        renderDonutChart(data.categories || []);
    }

    // 七日柱状图（来自后端 daily_trend）
    function renderBarChart(trend) {
        const data = trend.length ? trend : [
            { label: '初一', value: 0 }, { label: '初二', value: 0 }, { label: '初三', value: 0 },
            { label: '初四', value: 0 }, { label: '初五', value: 0 }, { label: '初六', value: 0 },
            { label: '今日', value: 0 }
        ];
        const max = Math.max(1, ...data.map(d => d.value));
        const box = $('#barChart');
        box.innerHTML = data.map(d => {
            const h = (d.value / max) * 160 + 4;  // px
            return `
                <div class="bar-item">
                    <div class="bar-value">${formatNum(d.value)}</div>
                    <div class="bar-body" style="height: 4px;" data-h="${h}"></div>
                    <div class="bar-label">${d.label}</div>
                </div>`;
        }).join('');
        setTimeout(() => {
            $$('.bar-body').forEach(b => { b.style.height = b.dataset.h + 'px'; });
        }, 50);
    }

    // 环形图（来自后端 categories）
    const DONUT_COLORS = ['#b7472a', '#3d4e6d', '#a0632a', '#7a8f69', '#a07a2c', '#6b4a8e', '#4a7a8e'];
    function renderDonutChart(categories) {
        const list = categories.length ? categories : [{ category: '暂无', count: 1 }];
        const total = list.reduce((s, c) => s + (c.count || 0), 0) || 1;
        const R = 60, C = 2 * Math.PI * R;
        let offset = 0;
        const circles = list.slice(0, 7).map((s, i) => {
            const value = s.count || 0;
            const len = (value / total) * C;
            const dash = `${len} ${C - len}`;
            const off = -offset;
            offset += len;
            return `<circle cx="85" cy="85" r="${R}" stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}"
                     stroke-dasharray="${dash}" stroke-dashoffset="${off}"/>`;
        }).join('');
        $('#donutChart').innerHTML = `
            <svg class="donut-svg" viewBox="0 0 170 170">
                <circle cx="85" cy="85" r="${R}" stroke="rgba(160,122,44,.12)"
                        stroke-dasharray="${C} 0" stroke-dashoffset="0"/>
                ${circles}
            </svg>
            <div class="donut-center">
                <div class="donut-cnum">${list.length}</div>
                <div class="donut-clabel">部类 · TOTAL</div>
            </div>`;
        // 动态图例
        const legend = $('.donut-legend');
        if (legend) {
            legend.innerHTML = list.slice(0, 7).map((c, i) => {
                const pct = ((c.count / total) * 100).toFixed(0);
                return `<li><span class="dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>${c.category} ${pct}%</li>`;
            }).join('');
        }
    }

    // ============================================
    // 贰·藏帖审校（GET /api/admin/posts + approve/reject）
    // ============================================
    let postStatus = 'all';
    const POSTS_CACHE = [];  // 当前页帖子缓存，供按钮定位

    // 分类样式映射（颜色档）
    const CAT_CLASS_MAP = {
        '算学深究': 1, '典籍架构': 2, '博物格致': 3, '文心笔谈': 4,
    };
    function catClassOf(cat) { return CAT_CLASS_MAP[cat] || 0; }

    function statusTag(s) {
        const map = {
            pending:  ['status-pending',  '● 待审稿'],
            approved: ['status-approved', '✓ 已入藏'],
            rejected: ['status-rejected', '✗ 已退回']
        };
        const m = map[s] || ['status-pending', s];
        return `<span class="pt-status ${m[0]}">${m[1]}</span>`;
    }

    async function renderPosts() {
        const tbody = $('#postTableBody');
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-mute);font-family:var(--font-kai);letter-spacing:.1em;">—— 载入藏帖中 ——</td></tr>`;
        try {
            const data = await api('/api/admin/posts?status=' + postStatus + '&size=50');
            const items = data.items || [];
            POSTS_CACHE.length = 0; POSTS_CACHE.push(...items);
            if (!items.length) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-mute);font-family:var(--font-kai);letter-spacing:.1em;">—— 此处暂无藏帖，静候新墨 ——</td></tr>`;
                return;
            }
            tbody.innerHTML = items.map(p => {
                const date = (p.created_at || '').slice(0, 10);
                return `
                <tr data-id="${p.id}">
                    <td class="pt-id">NP-${String(p.id).padStart(4, '0')}</td>
                    <td class="pt-main">
                        <span class="pt-title">${escapeHtml(p.title)}</span>
                        <span class="pt-author"><strong>${escapeHtml(p.author_name || '佚名')}</strong></span>
                    </td>
                    <td><span class="pt-cat cat-${catClassOf(p.category)}">${escapeHtml(p.category || '其他')}</span></td>
                    <td class="pt-views">👁 ${formatNum(p.read_count)}</td>
                    <td class="pt-hot">🔥 ${formatNum(p.like_count)}</td>
                    <td class="pt-date">${date}</td>
                    <td>${statusTag(p.status)}</td>
                    <td class="pt-actions">
                        <button class="tbtn tbtn-view" data-act="view" data-id="${p.id}">观览</button>
                        ${p.status === 'pending' ? `
                            <button class="tbtn tbtn-approve" data-act="approve" data-id="${p.id}">入藏</button>
                            <button class="tbtn tbtn-reject" data-act="reject" data-id="${p.id}">退回</button>
                        ` : ''}
                        ${p.status === 'approved' ? `
                            <button class="tbtn tbtn-unpublish" data-act="unpublish" data-id="${p.id}">下架</button>
                        ` : ''}
                        ${p.status === 'rejected' ? `
                            <button class="tbtn tbtn-approve" data-act="approve" data-id="${p.id}">入藏</button>
                        ` : ''}
                        <button class="tbtn tbtn-delete" data-act="delete" data-id="${p.id}">删除</button>
                    </td>
                </tr>`;
            }).join('');
            updatePendingBadge();
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#b7472a;font-family:var(--font-kai);">载入失败：${escapeHtml(err.message || '未知错误')}</td></tr>`;
        }
    }

    // 更新待审稿 chip 的徽标
    async function updatePendingBadge() {
        try {
            const data = await api('/api/admin/posts?status=pending&size=1');
            const badge = $('#postStatusChips .chip[data-status="pending"] .badge');
            if (badge) {
                const n = data.total || 0;
                badge.textContent = n;
                badge.style.display = n > 0 ? '' : 'none';
            }
        } catch (_) { /* 静默 */ }
    }

    // 帖子筛选 + 批点按钮
    document.addEventListener('click', async e => {
        const chip = e.target.closest('#postStatusChips .chip');
        if (chip) {
            $$('#postStatusChips .chip').forEach(c => c.classList.toggle('active', c === chip));
            postStatus = chip.dataset.status;
            renderPosts();
            return;
        }
        const btn = e.target.closest('.tbtn');
        if (btn) {
            const id = Number(btn.dataset.id);
            const act = btn.dataset.act;
            if (!id) return;
            if (act === 'view') {
                openPostPreview(id);
                return;
            }
            try {
                if (act === 'approve') {
                    await api('/api/admin/posts/' + id + '/approve', { method: 'POST' });
                    toast('朱批已下 · 该帖已入藏：NP-' + String(id).padStart(4, '0'), 'ok');
                } else if (act === 'reject') {
                    if (!confirm('确定退回此帖吗？')) return;
                    await api('/api/admin/posts/' + id + '/reject', { method: 'POST' });
                    toast('帖已退回 · 批点附后', 'err');
                } else if (act === 'unpublish') {
                    if (!confirm('确定下架此帖吗？将改为待审状态。')) return;
                    await api('/api/admin/posts/' + id + '/unpublish', { method: 'POST' });
                    toast('该帖已下架待审', 'err');
                } else if (act === 'delete') {
                    if (!confirm('确定删除此帖吗？此操作不可撤销。')) return;
                    await api('/api/admin/posts/' + id, { method: 'DELETE' });
                    toast('藏帖已除名', 'err');
                }
                renderPosts();
            } catch (err) {
                toast(err.message || '操作失败', 'err');
            }
            return;
        }
        // 典制保存
        if (e.target.matches('.btn-primary')) {
            toast('典制已颁行，各院即刻遵行', 'ok');
        }
        if (e.target.matches('.btn-secondary')) {
            toast('已恢复前典旧章', '');
        }
        // 同道名册：启用/禁用
        const ubtn = e.target.closest('.uc-action-btn');
        if (ubtn) {
            const uid = Number(ubtn.dataset.uid);
            if (uid) {
                try {
                    const data = await api('/api/admin/users/' + uid + '/toggle-active', { method: 'POST' });
                    toast(data.message || '操作成功', 'ok');
                    renderUsers();
                } catch (err) {
                    toast(err.message || '操作失败', 'err');
                }
            }
        }
        // 关闭预览
        if (e.target.closest('[data-preview-close]')) {
            closePostPreview();
        }
    });

    // ---------- 帖子预览模态框 ----------
    function openPostPreview(id) {
        const p = POSTS_CACHE.find(x => x.id === id);
        if (!p) { toast('未找到该帖', 'err'); return; }
        let modal = $('#postPreviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'postPreviewModal';
            modal.className = 'preview-modal';
            modal.innerHTML = `
                <div class="preview-mask" data-preview-close></div>
                <div class="preview-panel">
                    <div class="preview-head">
                        <span class="preview-cat" id="previewCat"></span>
                        <h2 class="preview-title" id="previewTitle"></h2>
                        <button class="preview-close" data-preview-close>×</button>
                    </div>
                    <div class="preview-meta" id="previewMeta"></div>
                    <div class="preview-excerpt" id="previewExcerpt"></div>
                    <div class="preview-content" id="previewContent"></div>
                    <div class="preview-images" id="previewImages"></div>
                    <div class="preview-actions" id="previewActions"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        const date = (p.created_at || '').slice(0, 10);
        $('#previewCat').textContent = p.category || '其他';
        $('#previewCat').className = 'preview-cat cat-' + catClassOf(p.category);
        $('#previewTitle').textContent = p.title;
        $('#previewMeta').innerHTML = `作者：<strong>${escapeHtml(p.author_name || '佚名')}</strong> · ${date} · ${statusTag(p.status)} · 👁 ${formatNum(p.read_count)} · 🔥 ${formatNum(p.like_count)}`;
        $('#previewExcerpt').textContent = p.excerpt ? '「' + p.excerpt + '」' : '';
        $('#previewExcerpt').style.display = p.excerpt ? 'block' : 'none';
        $('#previewContent').innerHTML = escapeHtml(p.content || '').replace(/\n/g, '<br>');
        // 图片
        const imgBox = $('#previewImages');
        if (p.images) {
            let imgs;
            try { imgs = JSON.parse(p.images); } catch { imgs = []; }
            if (Array.isArray(imgs) && imgs.length) {
                imgBox.innerHTML = imgs.map(src => `<img src="${src}" class="preview-img" loading="lazy"/>`).join('');
                imgBox.style.display = 'grid';
            } else {
                imgBox.innerHTML = '';
                imgBox.style.display = 'none';
            }
        } else {
            imgBox.innerHTML = '';
            imgBox.style.display = 'none';
        }
        // 操作按钮
        let actionsHtml = '';
        if (p.status === 'pending') {
            actionsHtml += `<button class="tbtn tbtn-approve" data-act="approve" data-id="${p.id}">入藏</button>`;
            actionsHtml += `<button class="tbtn tbtn-reject" data-act="reject" data-id="${p.id}">退回</button>`;
        }
        if (p.status === 'approved') {
            actionsHtml += `<button class="tbtn tbtn-unpublish" data-act="unpublish" data-id="${p.id}">下架</button>`;
        }
        if (p.status === 'rejected') {
            actionsHtml += `<button class="tbtn tbtn-approve" data-act="approve" data-id="${p.id}">入藏</button>`;
        }
        actionsHtml += `<button class="tbtn tbtn-delete" data-act="delete" data-id="${p.id}">删除</button>`;
        $('#previewActions').innerHTML = actionsHtml;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closePostPreview() {
        const modal = $('#postPreviewModal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // ============================================
    // 叁·同道名册（GET /api/admin/users）
    // ============================================
    async function renderUsers() {
        const box = $('#userCards');
        box.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-mute);font-family:var(--font-kai);">—— 载入同道名册中 ——</div>`;
        try {
            const data = await api('/api/admin/users?size=50');
            const items = data.items || [];
            if (!items.length) {
                box.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-mute);font-family:var(--font-kai);letter-spacing:.1em;">—— 尚无同道入卷 ——</div>`;
                return;
            }
            box.innerHTML = items.map(u => {
                const meta = deriveUserMeta(u);
                const activeLabel = u.is_active ? '禁用' : '启用';
                const activeCls = u.is_active ? 'uc-btn-disable' : 'uc-btn-enable';
                return `
                <div class="ucard ${u.is_active ? '' : 'ucard-disabled'}">
                    <div class="uc-head">
                        <div class="uc-avatar ${meta.lvClass}">${meta.initial}</div>
                        <div class="uc-info">
                            <div class="uc-name">
                                ${escapeHtml(u.username)}
                                <span class="uc-badge ${meta.badgeCls}">${meta.badge}</span>
                                ${u.is_active ? '' : '<span class="uc-status-off">已禁用</span>'}
                            </div>
                            <div class="uc-subtitle">${meta.sub}</div>
                        </div>
                    </div>
                    <div class="uc-stats">
                        <div class="uc-stat"><div class="uc-stat-num">${formatNum(u.post_count)}</div><div class="uc-stat-label">藏帖</div></div>
                        <div class="uc-stat"><div class="uc-stat-num">${formatNum(u.total_reads)}</div><div class="uc-stat-label">阅览</div></div>
                        <div class="uc-stat"><div class="uc-stat-num">${formatNum(u.total_likes)}</div><div class="uc-stat-label">赏赞</div></div>
                    </div>
                    <div class="uc-foot">
                        <span class="uc-joined">入卷于 ${(u.created_at || '').slice(0, 10)}</span>
                        <button class="uc-action-btn ${activeCls}" data-uid="${u.id}">${activeLabel}</button>
                    </div>
                </div>`;
            }).join('');
        } catch (err) {
            box.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#b7472a;font-family:var(--font-kai);">载入失败：${escapeHtml(err.message || '未知错误')}</div>`;
        }
    }

    // 根据发帖量推导用户等级/徽章/副标题
    function deriveUserMeta(u) {
        const posts = u.post_count || 0;
        const initial = (u.username || '?').charAt(0);
        let lv, lvClass, badge, badgeCls, sub;
        if (posts >= 100) {
            lv = 1; lvClass = 'lv-1'; badge = '翰林编修'; badgeCls = 'sage';
            sub = '藏经百卷 · 主笔修撰';
        } else if (posts >= 30) {
            lv = 1; lvClass = 'lv-1'; badge = '翰林院待诏'; badgeCls = 'sage';
            sub = '藏经数十卷 · 同道';
        } else if (posts >= 10) {
            lv = 2; lvClass = 'lv-2'; badge = '入藏同道'; badgeCls = 'scholar';
            sub = '入藏数载 · 同道';
        } else if (posts >= 1) {
            lv = 2; lvClass = 'lv-2'; badge = '新墨'; badgeCls = 'scholar';
            sub = '新入同道 · 初帖';
        } else {
            lv = 3; lvClass = 'lv-3'; badge = '新墨'; badgeCls = '';
            sub = '尚无藏帖 · 静候';
        }
        return { lv, lvClass, badge, badgeCls, sub, initial };
    }

    // ---------- HTML 转义 ----------
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ---------- 初始化 ----------
    async function init() {
        if (isLoggedIn()) showDashView();
        else showLoginView();
        usernameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') passwordInput.focus();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
