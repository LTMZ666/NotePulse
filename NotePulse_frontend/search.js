/* ============================================
   脉记 · 全局搜籍模态框
   —— 点击顶部搜籍按钮弹出，支持搜索笔记与帖子
   ============================================ */

(function () {
    let modalEl = null;
    let searchTimer = null;

    /* ---------- 构建 DOM ---------- */
    function buildModal() {
        const modal = document.createElement('div');
        modal.className = 'search-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="search-overlay" data-close></div>
            <div class="search-dialog">
                <div class="search-head">
                    <div class="search-input-wrap">
                        <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="text" id="globalSearchInput" placeholder="搜笔记、搜帖子…" autocomplete="off"/>
                        <button class="search-clear" id="searchClearBtn" aria-label="清除" hidden>×</button>
                    </div>
                    <button class="search-close" data-close aria-label="关闭">关闭</button>
                </div>
                <div class="search-tabs">
                    <button class="search-tab active" data-type="all">全部</button>
                    <button class="search-tab" data-type="note">笔记</button>
                    <button class="search-tab" data-type="post">帖子</button>
                </div>
                <div class="search-body" id="searchBody">
                    <div class="search-empty">请输入关键词，搜索你的笔记与帖子</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modalEl = modal;
        bindEvents();
    }

    /* ---------- 事件绑定 ---------- */
    function bindEvents() {
        // 关闭
        modalEl.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', closeSearch);
        });
        // Esc 关闭
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !modalEl.hidden) closeSearch();
        });
        // 输入搜索（防抖）
        const input = modalEl.querySelector('#globalSearchInput');
        const clearBtn = modalEl.querySelector('#searchClearBtn');
        input.addEventListener('input', e => {
            const val = e.target.value.trim();
            clearBtn.hidden = !val;
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => doSearch(val), 350);
        });
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.hidden = true;
            document.getElementById('searchBody').innerHTML = '<div class="search-empty">请输入关键词，搜索你的笔记与帖子</div>';
            input.focus();
        });
        // Tab 切换
        let currentType = 'all';
        modalEl.querySelectorAll('.search-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modalEl.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentType = tab.dataset.type;
                const val = input.value.trim();
                if (val) doSearch(val);
            });
        });
        // 记录当前 Tab（闭包共享）
        modalEl._getType = () => currentType;
    }

    /* ---------- 执行搜索 ---------- */
    async function doSearch(keyword) {
        const body = document.getElementById('searchBody');
        if (!keyword) {
            body.innerHTML = '<div class="search-empty">请输入关键词，搜索笔记与帖子</div>';
            return;
        }
        const type = modalEl._getType();
        body.innerHTML = '<div class="search-loading">正在搜籍…</div>';
        try {
            const tasks = [];
            // 笔记是私密的，需要登录；未登录时自动返回空
            if (type === 'all' || type === 'note') {
                const token = localStorage.getItem('maiji_token');
                if (token) {
                    tasks.push(callApi('/api/notes?keyword=' + encodeURIComponent(keyword) + '&size=20', { method: 'GET' }).then(r => ({ type: 'note', data: r })).catch(() => ({ type: 'note', data: { items: [], total: 0 } })));
                } else {
                    tasks.push(Promise.resolve({ type: 'note', data: { items: [], total: 0 } }));
                }
            }
            // 帖子是公开的，所有用户都能搜到
            if (type === 'all' || type === 'post') {
                const apiBase = window.MAIJI_API_BASE || '';
                const url = apiBase + '/api/posts?keyword=' + encodeURIComponent(keyword) + '&size=20';
                tasks.push(fetch(url).then(r => r.json()).then(data => ({ type: 'post', data })).catch(() => ({ type: 'post', data: { items: [], total: 0 } })));
            }
            const results = await Promise.all(tasks);
            renderResults(results, keyword);
        } catch (err) {
            body.innerHTML = `<div class="search-empty">搜籍失败：${escapeHtml(err.message || '')}</div>`;
        }
    }

    /* ---------- 渲染结果 ---------- */
    function renderResults(results, keyword) {
        const body = document.getElementById('searchBody');
        let html = '';
        let totalCount = 0;
        results.forEach(r => {
            const items = (r.data && r.data.items) || [];
            totalCount += items.length;
            if (!items.length) return;
            const typeLabel = r.type === 'note' ? '笔记' : '帖子';
            const typeIcon = r.type === 'note' ? '墨' : '帖';
            html += `<div class="search-group">
                <div class="search-group-head">
                    <span class="search-group-icon">${typeIcon}</span>
                    <span class="search-group-label">${typeLabel}</span>
                    <span class="search-group-count">${items.length} 条</span>
                </div>`;
            items.forEach(item => {
                const title = escapeHtml(highlight(item.title, keyword));
                const excerpt = escapeHtml(highlight(item.excerpt || item.content || '', keyword)).slice(0, 80);
                const date = toCnDate(item.created_at);
                html += `<a class="search-item" href="${r.type === 'note' ? 'my-notes.html' : 'index.html'}" data-id="${item.id}">
                    <div class="search-item-title">${title}</div>
                    <div class="search-item-excerpt">${excerpt}</div>
                    <div class="search-item-meta">${date}</div>
                </a>`;
            });
            html += '</div>';
        });
        if (!totalCount) {
            body.innerHTML = `<div class="search-empty">未找到与「${escapeHtml(keyword)}」相关的内容</div>`;
            return;
        }
        body.innerHTML = html;
    }

    /* ---------- 关键词高亮 ---------- */
    function highlight(text, keyword) {
        if (!text || !keyword) return text || '';
        const safe = String(text);
        const idx = safe.toLowerCase().indexOf(keyword.toLowerCase());
        if (idx === -1) return safe;
        return safe.slice(0, idx) + '「' + safe.slice(idx, idx + keyword.length) + '」' + safe.slice(idx + keyword.length);
    }

    /* ---------- 打开/关闭 ---------- */
    function openSearch() {
        if (!modalEl) buildModal();
        modalEl.hidden = false;
        document.body.style.overflow = 'hidden';
        const input = modalEl.querySelector('#globalSearchInput');
        setTimeout(() => input && input.focus(), 100);
    }

    function closeSearch() {
        if (!modalEl) return;
        modalEl.hidden = true;
        document.body.style.overflow = '';
    }

    /* ---------- 绑定顶部搜索按钮 ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('searchBtn');
        if (btn) btn.addEventListener('click', openSearch);
        // 快捷键 Ctrl/Cmd + K
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openSearch();
            }
        });
    });

    // 暴露给外部
    window.openSearch = openSearch;
    window.closeSearch = closeSearch;
})();
