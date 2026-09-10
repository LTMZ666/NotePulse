/* ============================================
   NotePulse 脉记 — Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    /* ---------- URL 参数：从通知跳转打开帖子 ---------- */
    const urlParams = new URLSearchParams(location.search);
    const urlPostId = urlParams.get('post');
    if (urlPostId) {
        const urlCmtId = urlParams.get('cmt');
        setTimeout(() => openPostDetail(Number(urlPostId), { commentId: urlCmtId ? Number(urlCmtId) : null }), 500);
    }

    /* ---------- Tab 切换 ---------- */
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    const indicator = document.querySelector('.tab-indicator');

    function moveIndicator(tab) {
        const rect = tab.getBoundingClientRect();
        const parentRect = tab.parentElement.getBoundingClientRect();
        indicator.style.left = (rect.left - parentRect.left) + 'px';
        indicator.style.width = rect.width + 'px';
    }

    function activateTab(tab) {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        moveIndicator(tab);

        const target = tab.dataset.tab;
        panels.forEach(p => {
            p.classList.remove('active');
            if (p.dataset.panel === target) {
                p.classList.add('active');
                // 重新触发该面板内的动画
                triggerPanelAnimations(target);
            }
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab));
    });

    // 初始化指示器位置
    requestAnimationFrame(() => moveIndicator(tabs[0]));
    window.addEventListener('resize', () => {
        const active = document.querySelector('.tab.active');
        if (active) moveIndicator(active);
    });

    /* ---------- 数字滚动动画 ---------- */
    function animateCount(el, target) {
        if (target === undefined) target = parseInt(el.dataset.count, 10);
        const duration = 1600;
        const start = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);

        function step(now) {
            const p = Math.min((now - start) / duration, 1);
            const val = Math.floor(target * ease(p));
            el.textContent = val.toLocaleString();
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target.toLocaleString();
        }
        requestAnimationFrame(step);
    }

    /* ---------- 脉之卷：从 API 加载统计 ---------- */
    async function loadPulseStats() {
        try {
            const res = await fetch((window.MAIJI_API_BASE || '') + '/api/stats');
            if (!res.ok) return;
            const d = await res.json();
            const els = {
                statNotes: d.note_count,
                statPosts: d.post_count,
                statReads: d.total_reads,
                statLikes: d.total_likes,
                statUsers: d.user_count,
            };
            Object.entries(els).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) {
                    el.dataset.count = val;
                    animateCount(el, val);
                }
            });
            // 关于页同步
            const about = {
                aboutUsers: d.user_count,
                aboutNotes: d.note_count,
                aboutPosts: d.post_count,
                aboutReads: d.total_reads,
            };
            Object.entries(about).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val.toLocaleString();
            });
        } catch (e) { /* 静默失败 */ }
    }

    /* ---------- 脉之卷：动态记录 ---------- */
    async function loadPulseFeed() {
        try {
            const res = await fetch((window.MAIJI_API_BASE || '') + '/api/stats/recent');
            if (!res.ok) return;
            const items = await res.json();
            const feed = document.getElementById('pulseFeed');
            if (!feed) return;
            if (!items.length) {
                feed.innerHTML = '<div class="feed-item"><span class="feed-text">暂无动态</span></div>';
                return;
            }
            feed.innerHTML = items.map(item => {
                const time = new Date(item.time);
                const hh = String(time.getHours()).padStart(2, '0');
                const mm = String(time.getMinutes()).padStart(2, '0');
                const tag = item.type === 'note' ? '笔记' : '帖子';
                const tagClass = item.type === 'note' ? 'tag-note' : 'tag-ai';
                const action = item.type === 'note' ? '新增笔记' : '发布帖子';
                return `<div class="feed-item">
                    <span class="feed-time">${hh}:${mm}</span>
                    <span class="feed-tag ${tagClass}">${tag}</span>
                    <span class="feed-text">${action}：${escapeHtml(item.title)}</span>
                </div>`;
            }).join('');
        } catch (e) { /* 静默失败 */ }
    }

    /* ---------- 各面板动画触发 ---------- */
    let statsRendered = false;

    function triggerPanelAnimations(panel) {
        if (panel === 'pulse') {
            loadPulseStats();
            loadPulseFeed();
        } else if (panel === 'notes') {
            loadNotesGrid();
        } else if (panel === 'posts') {
            loadAiRecommend();
        }
    }

    // 首次加载触发脉之卷
    triggerPanelAnimations('pulse');

    /* ---------- 籍之库：加载笔记列表 ---------- */
    async function loadNotesGrid() {
        const grid = document.getElementById('notesGrid');
        if (!grid) return;
        try {
            const token = localStorage.getItem('maiji_token');
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            const res = await fetch((window.MAIJI_API_BASE || '') + '/api/notes?size=20', { headers });
            if (!res.ok) throw new Error('加载失败');
            const data = await res.json();
            if (!data.items.length) {
                grid.innerHTML = '<div class="feed-item"><span class="feed-text">尚无笔记，登录后创建第一篇吧。</span></div>';
                return;
            }
            grid.innerHTML = data.items.map(n => {
                const pinned = n.is_pinned ? '<span class="featured-tag">置顶</span>' : '';
                const date = new Date(n.updated_at);
                const dateStr = date.getFullYear() + '·' + String(date.getMonth() + 1).padStart(2, '0');
                const excerpt = escapeHtml(n.content.slice(0, 80)) + (n.content.length > 80 ? '...' : '');
                return `<article class="note-card glass${n.is_pinned ? ' featured' : ''}">
                    <div class="note-meta"><span class="note-cat">${escapeHtml(n.category)}</span><span class="note-date">${dateStr}</span>${pinned}</div>
                    <h3 class="note-title">${escapeHtml(n.title)}</h3>
                    <p class="note-excerpt">${excerpt}</p>
                    <div class="note-foot"><span class="note-stat">${new Date(n.created_at).toLocaleDateString('zh-CN')}</span></div>
                </article>`;
            }).join('');
            // 绑定点击墨晕
            grid.querySelectorAll('.note-card').forEach(card => {
                card.addEventListener('click', function(e) {
                    const ripple = document.createElement('span');
                    const rect = this.getBoundingClientRect();
                    const size = Math.max(rect.width, rect.height);
                    ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;background:radial-gradient(circle,rgba(26,22,18,0.22) 0%,rgba(183,71,42,0.12) 50%,transparent 70%);border-radius:50%;transform:scale(0);animation:rippleExpand 0.8s ease-out;pointer-events:none;`;
                    this.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 800);
                });
            });
        } catch (e) {
            grid.innerHTML = '<div class="feed-item"><span class="feed-text">笔记加载失败</span></div>';
        }
    }

    /* ---------- 同之贴：AI 推荐帖子 ---------- */
    let aiRecommendLoaded = false;
    async function loadAiRecommend() {
        if (aiRecommendLoaded) return;
        const token = localStorage.getItem('maiji_token');
        const section = document.getElementById('aiRecommendSection');
        const grid = document.getElementById('aiRecommendGrid');
        if (!section || !grid) return;
        if (!token) {
            // 未登录不显示 AI 推荐区
            return;
        }
        aiRecommendLoaded = true;
        section.style.display = 'block';
        grid.innerHTML = '<div class="feed-item"><span class="feed-text">脉鉴灵正在为你甄选...</span></div>';
        try {
            const res = await fetch((window.MAIJI_API_BASE || '') + '/api/ai/recommend', {
                headers: { 'Authorization': 'Bearer ' + token },
            });
            if (!res.ok) throw new Error('推荐加载失败');
            const items = await res.json();
            if (!items.length) {
                section.style.display = 'none';
                return;
            }
            grid.innerHTML = items.map(p => {
                const reason = p.reason ? `<div class="ai-rec-reason">${escapeHtml(p.reason)}</div>` : '';
                const meta = `${p.author_name || '匿名'} · 阅读 ${toHotNum(p.read_count || 0)} · 赞 ${toHotNum(p.like_count || 0)}`;
                return `<div class="ai-rec-card" data-pid="${p.id}">
                    <div class="ai-rec-cat">${escapeHtml(p.category || '')}</div>
                    <div class="ai-rec-title">${escapeHtml(p.title)}</div>
                    ${reason}
                    <div class="ai-rec-meta">${meta}</div>
                </div>`;
            }).join('');
            // 绑定点击打开帖子
            grid.querySelectorAll('.ai-rec-card').forEach(card => {
                card.addEventListener('click', () => {
                    const pid = Number(card.dataset.pid);
                    if (window.openPostDetail) window.openPostDetail(pid);
                });
            });
        } catch (e) {
            grid.innerHTML = '<div class="feed-item"><span class="feed-text">推荐加载失败</span></div>';
        }
    }

    /* ---------- 数据面板：从 API 加载 ---------- */
    const DONUT_COLORS = ['#7C5CFF', '#00E5C7', '#FF6B9D', '#FFB547', '#3D4E6D', '#B7472A'];

    async function loadStatsView() {
        if (statsRendered) return;
        statsRendered = true;
        try {
            const [statsRes, noteCatRes, postCatRes] = await Promise.all([
                fetch((window.MAIJI_API_BASE || '') + '/api/stats'),
                fetch((window.MAIJI_API_BASE || '') + '/api/stats/note-categories'),
                fetch((window.MAIJI_API_BASE || '') + '/api/stats/categories'),
            ]);
            const stats = await statsRes.json();
            const noteCats = await noteCatRes.json();
            const postCats = await postCatRes.json();

            // 关键指标
            const kvList = document.getElementById('statsKvList');
            if (kvList) {
                kvList.innerHTML = `
                    <div class="kv"><span>注册用户</span><b>${stats.user_count.toLocaleString()}</b></div>
                    <div class="kv"><span>典藏笔记</span><b>${stats.note_count.toLocaleString()}</b></div>
                    <div class="kv"><span>同之帖</span><b>${stats.post_count.toLocaleString()}</b></div>
                    <div class="kv"><span>累计阅读</span><b>${stats.total_reads.toLocaleString()}</b></div>
                    <div class="kv"><span>累计点赞</span><b>${stats.total_likes.toLocaleString()}</b></div>
                `;
            }

            // 笔记分类饼图
            renderDonut('noteDonut', 'donutTotal', 'donutLegend', noteCats, stats.note_count);
            // 帖子分类饼图
            renderDonut('postDonut', 'postDonutTotal', 'postDonutLegend', postCats, stats.post_count);
            // 柱状图（笔记 vs 帖子数量对比）
            renderBarChartReal(stats.note_count, stats.post_count);
        } catch (e) { /* 静默失败 */ }
    }

    function renderDonut(svgId, totalId, legendId, cats, total) {
        const svg = document.getElementById(svgId);
        const totalEl = document.getElementById(totalId);
        const legendEl = document.getElementById(legendId);
        if (!svg || !legendEl) return;
        if (totalEl) totalEl.textContent = total.toLocaleString();
        // 移除旧弧
        svg.querySelectorAll('circle[data-cat]').forEach(c => c.remove());
        const circumference = 2 * Math.PI * 45; // ~283
        let offset = 0;
        cats.slice(0, 6).forEach((cat, i) => {
            const pct = total > 0 ? cat.count / total : 0;
            const dash = pct * circumference;
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', '60');
            c.setAttribute('cy', '60');
            c.setAttribute('r', '45');
            c.setAttribute('fill', 'none');
            c.setAttribute('stroke', DONUT_COLORS[i % DONUT_COLORS.length]);
            c.setAttribute('stroke-width', '14');
            c.setAttribute('stroke-dasharray', `${dash} ${circumference - dash}`);
            c.setAttribute('stroke-dashoffset', `${-offset}`);
            c.setAttribute('transform', 'rotate(-90 60 60)');
            c.setAttribute('data-cat', '1');
            svg.appendChild(c);
            offset += dash;
        });
        // 图例
        legendEl.innerHTML = cats.slice(0, 6).map((cat, i) => {
            const pct = total > 0 ? Math.round(cat.count / total * 100) : 0;
            return `<div class="dl-item"><i class="dot dot-${i+1}"></i>${escapeHtml(cat.category)} <span>${pct}%</span></div>`;
        }).join('');
    }

    function renderBarChartReal(noteCount, postCount) {
        const wrap = document.getElementById('barChart');
        if (!wrap) return;
        const total = noteCount + postCount;
        const notePct = total > 0 ? Math.round(noteCount / total * 100) : 0;
        const postPct = total > 0 ? 100 - notePct : 0;
        wrap.innerHTML = `
            <div class="hbar-section">
                <div class="hbar-row">
                    <div class="hbar-label">典藏笔记</div>
                    <div class="hbar-track">
                        <div class="hbar-fill hbar-note" style="width:0%">
                            <span class="hbar-val">${noteCount.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="hbar-pct">${notePct}%</div>
                </div>
                <div class="hbar-row">
                    <div class="hbar-label">同之帖</div>
                    <div class="hbar-track">
                        <div class="hbar-fill hbar-post" style="width:0%">
                            <span class="hbar-val">${postCount.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="hbar-pct">${postPct}%</div>
                </div>
                <div class="hbar-total">
                    <span>共计 ${total.toLocaleString()} 篇</span>
                    <span class="hbar-ratio">笔记 : 帖子 = ${noteCount} : ${postCount}</span>
                </div>
            </div>
        `;
        // 动画填充
        setTimeout(() => {
            const bars = wrap.querySelectorAll('.hbar-fill');
            if (bars[0]) bars[0].style.width = notePct + '%';
            if (bars[1]) bars[1].style.width = postPct + '%';
        }, 100);
    }

    /* ---------- 朱砂笔锋跟随光晕 ---------- */
    const glow = document.createElement('div');
    glow.style.cssText = `
        position: fixed;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(183,71,42,0.07) 0%, rgba(160,122,44,0.04) 40%, transparent 70%);
        pointer-events: none;
        z-index: 0;
        transform: translate(-50%, -50%);
        transition: transform 0.15s ease-out;
        mix-blend-mode: multiply;
    `;
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });

    /* ---------- 心电图实时刷新 ---------- */
    const ecgPath = document.getElementById('ecgPath');
    if (ecgPath) {
        let phase = 0;
        setInterval(() => {
            phase += 0.5;
            // 偶尔小幅扰动以模拟脉动变化
            if (Math.random() > 0.95) {
                ecgPath.style.opacity = '0.7';
                setTimeout(() => ecgPath.style.opacity = '1', 100);
            }
        }, 1000);
    }

    /* ---------- 卷籍点击墨晕（动态绑定，由 loadNotesGrid 内部处理） ---------- */

    // 注入波纹动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rippleExpand {
            to { transform: scale(2.5); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    /* ---------- 滚动渐入 ---------- */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.glass').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.8s, transform 0.8s';
        observer.observe(el);
    });

    /* ---------- 智鉴输入回复 ---------- */
    const aiInput = document.getElementById('aiInput');
    const aiChat = document.getElementById('aiChat');
    const sendBtn = document.getElementById('aiSendBtn');
    let aiHistory = []; // 对话历史

    if (aiInput && sendBtn) {
        const send = async () => {
            const text = aiInput.value.trim();
            if (!text) return;
            const token = localStorage.getItem('maiji_token');
            if (!token) {
                const tip = document.createElement('div');
                tip.className = 'msg ai';
                tip.innerHTML = `<div class="msg-bubble">请先登录后再与我对话，我将基于你的知识笔记为你解答。</div>`;
                aiChat.appendChild(tip);
                aiChat.scrollTop = aiChat.scrollHeight;
                return;
            }

            // 显示用户消息
            const userMsg = document.createElement('div');
            userMsg.className = 'msg user';
            userMsg.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
            aiChat.appendChild(userMsg);
            aiInput.value = '';
            aiChat.scrollTop = aiChat.scrollHeight;

            // 显示"思考中"
            const thinkingMsg = document.createElement('div');
            thinkingMsg.className = 'msg ai';
            thinkingMsg.innerHTML = `<div class="msg-bubble">脉鉴灵正在遍历你的知识笔记...</div>`;
            aiChat.appendChild(thinkingMsg);
            aiChat.scrollTop = aiChat.scrollHeight;

            try {
                const res = await fetch((window.MAIJI_API_BASE || '') + '/api/ai/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token,
                    },
                    body: JSON.stringify({
                        message: text,
                        history: aiHistory,
                    }),
                });
                const data = await res.json();
                thinkingMsg.remove();
                const aiMsg = document.createElement('div');
                aiMsg.className = 'msg ai';
                aiMsg.innerHTML = `<div class="msg-bubble">${escapeHtml(data.reply)}</div>`;
                aiChat.appendChild(aiMsg);
                aiChat.scrollTop = aiChat.scrollHeight;
                // 保存对话历史
                aiHistory.push({ role: 'user', content: text });
                aiHistory.push({ role: 'assistant', content: data.reply });
            } catch (e) {
                thinkingMsg.remove();
                const errMsg = document.createElement('div');
                errMsg.className = 'msg ai';
                errMsg.innerHTML = `<div class="msg-bubble">脉鉴灵暂时无法回应，请稍后再试。</div>`;
                aiChat.appendChild(errMsg);
                aiChat.scrollTop = aiChat.scrollHeight;
            }
        };
        sendBtn.addEventListener('click', send);
        aiInput.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /* ---------- 导航链接与面板联动 ---------- */
    // 通用：按 panel 名切换激活面板（不依赖 tab 高亮，适合没有对应 tab 的面板如 about / profile / my-notes / favorites / settings）
    function activatePanelByName(name) {
        const matchedTab = document.querySelector(`.tab[data-tab="${name}"]`);
        if (matchedTab) {
            activateTab(matchedTab);
            return;
        }
        // 无对应 tab：取消所有 tab 高亮，仅切 panel
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => {
            p.classList.remove('active');
            if (p.dataset.panel === name) {
                p.classList.add('active');
                triggerPanelAnimations(name);
            }
        });
        document.querySelector('.content').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ---------- 视图切换（首页 / 数据面板 / 关于） ---------- */
    function switchView(view) {
        // 切换 nav-link active 状态
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.view === view);
        });
        // 切换 hero + main 视图可见性
        const viewHero = document.getElementById('viewHero');
        const viewHome = document.getElementById('viewHome');
        const viewStats = document.getElementById('viewStats');
        const viewAbout = document.getElementById('viewAbout');
        [viewHero, viewHome, viewStats, viewAbout].forEach(v => { if (v) v.hidden = true; });
        if (view === 'home') {
            if (viewHero) viewHero.hidden = false;
            if (viewHome) viewHome.hidden = false;
        } else if (view === 'stats' && viewStats) {
            viewStats.hidden = false;
            loadStatsView();
        } else if (view === 'about' && viewAbout) {
            viewAbout.hidden = false;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            const view = link.dataset.view;
            if (!view) return;
            e.preventDefault();
            switchView(view);
        });
    });

    // 用户下拉里的四个用户中心入口已改为 href 跳转到独立 .html 页面
    // （profile.html / my-notes.html / favorites.html / settings.html），
    // 由浏览器原生整页跳转，无需 JS 拦截；登录态守卫在各自页面的 guardAuth() 中完成。

    /* ============================================
       登录 / 注册 模态框
       ============================================ */
    const authModal = document.getElementById('authModal');
    const modalClose = document.getElementById('modalClose');
    // 原 loginBtn / registerBtn 已移除，改为从用户头像下拉进入
    const authTabs = document.querySelectorAll('.auth-tab');
    const authTabIndicator = document.querySelector('.auth-tab-indicator');
    const authForm = document.getElementById('authForm');
    const submitText = document.querySelector('.submit-text');
    const userMenu = document.getElementById('userMenu');
    const userAvatar = document.getElementById('userAvatar');
    const avatarGlyph = document.getElementById('avatarGlyph');
    const userDropdown = document.getElementById('userDropdown');
    const udHeadGuest = document.getElementById('udHeadGuest');
    const udHeadUser = document.getElementById('udHeadUser');
    const udListGuest = document.getElementById('udListGuest');
    const udListUser = document.getElementById('udListUser');
    const udAvatar = document.getElementById('udAvatar');
    const udName = document.getElementById('udName');
    const udMail = document.getElementById('udMail');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const guestRegisterBtn = document.getElementById('guestRegisterBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const toast = document.getElementById('toast');

    let authMode = 'login';

    function openAuth(mode) {
        authMode = mode;
        setAuthMode(mode);
        // 清空表单
        authForm.reset();
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeAuth() {
        authModal.classList.remove('show');
        document.body.style.overflow = '';
        // 关闭时清空表单
        authForm.reset();
    }

    function setAuthMode(mode) {
        authMode = mode;
        authTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
        authTabIndicator.classList.toggle('right', mode === 'register');

        const usernameField = authForm.querySelector('[data-name="username"]');
        const confirmField = authForm.querySelector('[data-name="confirm"]');
        const rowLogin = document.getElementById('formRowLogin');
        const rowTerms = document.getElementById('formRowTerms');

        if (mode === 'register') {
            usernameField.style.display = '';
            confirmField.style.display = '';
            rowLogin.style.display = 'none';
            rowTerms.style.display = '';
            submitText.textContent = '注册';
        } else {
            usernameField.style.display = 'none';
            confirmField.style.display = 'none';
            rowLogin.style.display = '';
            rowTerms.style.display = 'none';
            submitText.textContent = '登录';
        }
    }

    // 访客下拉内的"入卷/开卷"
    guestLoginBtn && guestLoginBtn.addEventListener('click', e => { e.preventDefault(); userDropdown.classList.remove('show'); openAuth('login'); });
    guestRegisterBtn && guestRegisterBtn.addEventListener('click', e => { e.preventDefault(); userDropdown.classList.remove('show'); openAuth('register'); });
    const noteBtn = document.getElementById('noteBtn');
    noteBtn && noteBtn.addEventListener('click', () => {
        if (typeof openNoteEditor === 'function') openNoteEditor();
    });
    modalClose.addEventListener('click', closeAuth);
    document.querySelector('.modal-backdrop').addEventListener('click', closeAuth);

    authTabs.forEach(t => {
        t.addEventListener('click', () => setAuthMode(t.dataset.mode));
    });

    // ESC 关闭
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && authModal.classList.contains('show')) closeAuth();
    });

    // 密码可见性切换
    document.querySelectorAll('.toggle-pwd').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    });

    /* ---------- Toast 提示 ---------- */
    let toastTimer;
    function showToast(msg, type = 'info') {
        clearTimeout(toastTimer);
        toast.className = 'toast ' + type;
        toast.textContent = msg;
        // 重新加上前缀（因为 textContent 清掉了 ::before）
        requestAnimationFrame(() => toast.classList.add('show'));
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
    }

    /* ---------- 表单提交（调用后端 /api/auth/*） ---------- */
    // 同域部署时 API 走相对路径；前后端分离开发可改 window.MAIJI_API_BASE
    const API_BASE = window.MAIJI_API_BASE || '';
    const TOKEN_KEY = 'maiji_token';
    const USER_KEY = 'maiji_user';

    async function callApi(path, { method = 'POST', body } = {}) {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(API_BASE + path, {
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

    authForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = authForm.querySelector('[data-name="email"] input').value.trim();
        const pwd = authForm.querySelector('[data-name="password"] input').value;
        const username = authForm.querySelector('[data-name="username"] input')?.value.trim();

        if (!email || !pwd) { showToast('请输入邮箱和密码', 'error'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('邮箱格式不正确', 'error'); return; }
        if (pwd.length < 6) { showToast('密码至少需要 6 个字符', 'error'); return; }

        // 提交按钮置灰防重复点击
        const submitBtn = authForm.querySelector('button[type="submit"]');
        const originText = submitText.textContent;
        if (submitBtn) submitBtn.disabled = true;
        submitText.textContent = '处理中…';

        try {
            if (authMode === 'register') {
                const confirm = authForm.querySelector('[data-name="confirm"] input').value;
                if (!username) { showToast('请输入用户名', 'error'); return; }
                if (pwd !== confirm) { showToast('两次输入的密码不一致', 'error'); return; }
                if (!document.getElementById('agreeTerms').checked) {
                    showToast('请先同意服务条款和隐私政策', 'error'); return;
                }
                // 注册成功后直接用同一账号密码登录，拿到真实 token 与用户信息
                await callApi('/api/auth/register', { body: { username, email, password: pwd } });
                showToast(`注册成功，欢迎加入脉记，${username}！`, 'success');
                // 用注册时的账号自动登录，确保登录态用户名就是注册填写的用户名
                const loginData = await callApi('/api/auth/login', { body: { account: email, password: pwd } });
                applyLoginState(loginData.access_token, loginData.user);
                setTimeout(closeAuth, 800);
            } else {
                const loginData = await callApi('/api/auth/login', { body: { account: email, password: pwd } });
                showToast(`登录成功，欢迎回来，${loginData.user.username}`, 'success');
                applyLoginState(loginData.access_token, loginData.user);
                setTimeout(closeAuth, 800);
            }
        } catch (err) {
            showToast(err.message || '操作失败', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            submitText.textContent = originText;
        }
    });

    /* ---------- 登录态管理 ---------- */
    // 蛊虫纷飞头像：暗紫红渐变 + 飞舞虫纹（SVG），登录后启用
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
                <!-- 飞舞的蛊虫（散点 + 弧线轨迹） -->
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
                <!-- 中央蛊字徽 -->
                <text x="24" y="30" text-anchor="middle" font-family="serif"
                      font-size="14" font-weight="700" fill="#e8c46a"
                      style="letter-spacing:0;">蛊</text>
            </svg>`;
    }

    function applyLoginState(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        renderUserState(user);
    }

    function renderUserState(user) {
        if (!user) return;
        const name = user.username || '同道';
        const email = user.email || '';
        // 头像：自定义 URL 优先，否则蛊虫纷飞 SVG
        if (user.avatar) {
            userAvatar.innerHTML = `<img src="${user.avatar}" alt="${name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            if (udAvatar) udAvatar.innerHTML = `<img src="${user.avatar}" alt="${name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            applyGuAvatar(userAvatar);
            applyGuAvatar(udAvatar);
        }
        // 下拉头信息
        udName.textContent = name;
        udMail.textContent = email;
        udHeadGuest.style.display = 'none';
        udHeadUser.style.display = '';
        udListGuest.style.display = 'none';
        udListUser.style.display = '';
        // 兼容旧样式（不依赖颜色变量，确保登录态有视觉变化）
        userAvatar.style.borderColor = '#6b1a4a';
        userAvatar.style.background = '#3a0f28';
    }

    function renderGuestState() {
        // 直接写文字头像（logout 后 userAvatar 的子节点结构可能变化，避免依赖旧引用）
        userAvatar.innerHTML = '<span id="avatarGlyph">游</span>';
        if (udAvatar) udAvatar.textContent = '游';
        udHeadGuest.style.display = '';
        udHeadUser.style.display = 'none';
        udListGuest.style.display = '';
        udListUser.style.display = 'none';
        userAvatar.style.borderColor = 'var(--indigo)';
        userAvatar.style.background = 'var(--grad-indigo)';
    }

    function logoutUser() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        renderGuestState();
        userDropdown.classList.remove('show');
        showToast('已退出登录', 'info');
    }

    // 检查 JWT 是否过期（解码 payload 的 exp 字段）
    function isTokenExpired(token) {
        if (!token) return true;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // exp 是秒级时间戳
            return payload.exp * 1000 < Date.now();
        } catch (_) { return true; }
    }

    // 启动时从 localStorage 恢复登录态（检查 token 是否过期）
    function restoreLoginState() {
        const token = localStorage.getItem(TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);
        if (token && userJson) {
            // token 过期则清除，显示访客态
            if (isTokenExpired(token)) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                renderGuestState();
                showToast('登录已过期，请重新登录', 'info');
                return false;
            }
            try {
                const user = JSON.parse(userJson);
                renderUserState(user);
                return true;
            } catch (_) { /* 损坏数据忽略 */ }
        }
        renderGuestState();
        return false;
    }

    // 默认进入：尝试恢复登录态，否则访客态
    restoreLoginState();

    // 定时检查 token 过期（每 60 秒），过期自动登出
    setInterval(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && isTokenExpired(token)) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            renderGuestState();
            showToast('登录已过期，请重新登录', 'info');
        }
    }, 60000);

    // 全局同步：设置页保存头像后实时刷新首页顶部头像
    document.addEventListener('user:updated', e => {
        const user = e.detail;
        if (user) {
            renderUserState(user);
        }
    });
    // 跨标签页同步
    window.addEventListener('storage', e => {
        if (e.key === USER_KEY && e.newValue) {
            try { renderUserState(JSON.parse(e.newValue)); } catch (_) {}
        }
        if (e.key === TOKEN_KEY && !e.newValue) {
            renderGuestState();
        }
    });

    userAvatar.addEventListener('click', e => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', e => {
        if (!userMenu.contains(e.target)) userDropdown.classList.remove('show');
    });
    logoutBtn && logoutBtn.addEventListener('click', e => {
        e.preventDefault();
        logoutUser();
    });

    /* ============================================
       同之帖 · 同道藏帖（数据 · 渲染 · 筛选 · 排序）
       ============================================ */
    const AVATAR_COLORS = [
        'linear-gradient(135deg,#b7472a,#a0632a)',
        'linear-gradient(135deg,#3d5a80,#6b7ba5)',
        'linear-gradient(135deg,#5e6b4a,#8a9a6c)',
        'linear-gradient(135deg,#7a3e5a,#b06c8f)',
        'linear-gradient(135deg,#2e5c55,#4f8b7f)',
        'linear-gradient(135deg,#8b5a2b,#c7935a)',
        'linear-gradient(135deg,#4e4b7a,#7b79b8)',
    ];
    function pickColor(name) {
        let sum = 0; for (const c of name) sum += c.charCodeAt(0);
        return AVATAR_COLORS[sum % AVATAR_COLORS.length];
    }
    function cmtAvatarFallback(img) {
        const d = img.parentElement;
        d.innerHTML = '';
        d.style.background = d.dataset.bg || pickColor(d.dataset.name || '佚名');
        d.textContent = d.dataset.char || (d.dataset.name || '佚').charAt(0);
    }
    window.cmtAvatarFallback = cmtAvatarFallback;
    function toCnNum(n) {
        const map = ['零','一','二','三','四','五','六','七','八','九'];
        if (n < 10) return map[n];
        if (n < 100) {
            const t = Math.floor(n/10), o = n%10;
            return (t===1?'十':map[t]+'十') + (o===0?'':map[o]);
        }
        return String(n);
    }
    function toCnDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    }

    // 帖子数据从后端加载
    let ALL_POSTS = [];

    const postsGrid = document.getElementById('postsGrid');
    const categoryChips = document.getElementById('categoryChips');
    const sortChips = document.getElementById('sortChips');
    const postSearchInput = document.getElementById('postSearchInput');

    let currentCat = 'all';
    let currentSort = 'hot';
    let currentKw = '';
    // 分页状态
    let currentPage = 1;
    let totalPages = 1;
    let totalCount = 0;
    const POSTS_PAGE_SIZE = 9;

    const iconViews = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const iconCmts = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    const iconLikes = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

    function toHotNum(n) {
        if (n >= 10000) return (n/10000).toFixed(1)+'万';
        if (n >= 1000)  return (n/1000).toFixed(1)+'千';
        return String(n);
    }

    // 从后端加载帖子（所有用户的帖子，不需鉴权，分页）
    async function loadPosts(page) {
        if (page !== undefined) currentPage = page;
        try {
            const params = new URLSearchParams();
            params.set('page', String(currentPage));
            params.set('size', String(POSTS_PAGE_SIZE));
            if (currentCat !== 'all') params.set('category', currentCat);
            if (currentKw) params.set('keyword', currentKw);
            const url = (window.MAIJI_API_BASE || '') + '/api/posts?' + params.toString();
            // 帖子是公开内容，不带 token，确保搜到所有人的帖子
            const res = await fetch(url);
            const data = await res.json();
            ALL_POSTS = (data.items || []).map(p => ({
                id: p.id,
                author: p.author_name || '佚名',
                sub: p.category || '',
                title: p.title,
                excerpt: p.excerpt || '',
                cat: p.category || '随笔杂谈',
                tags: [],
                views: p.read_count || 0,
                comments: p.comment_count || 0,
                likes: p.like_count || 0,
                date: new Date(p.created_at),
                hot: (p.read_count || 0) > 1000
            }));
            // 更新分页信息
            totalCount = data.total || 0;
            totalPages = Math.max(1, Math.ceil(totalCount / POSTS_PAGE_SIZE));
            if (currentPage > totalPages) currentPage = totalPages;
        } catch (err) {
            ALL_POSTS = [];
            totalCount = 0;
            totalPages = 1;
        }
        renderPosts();
        renderPagination();
    }

    /* ---------- 渲染帖子图片 ---------- */
    function renderPostImages(images) {
        if (!images) return '';
        let arr;
        try { arr = JSON.parse(images); } catch { return ''; }
        if (!Array.isArray(arr) || !arr.length) return '';
        const single = arr.length === 1;
        return `<div class="pd-images ${single ? 'pd-images-single' : ''}">${arr.map(src =>
            `<img src="${src}" class="pd-img" loading="lazy" onclick="this.classList.toggle('pd-img-full')"/>`
        ).join('')}</div>`;
    }

    function renderPosts() {
        if (!postsGrid) return;

        // 1) 过滤（后端已支持 category/keyword，前端过滤保留兼容）
        let list = ALL_POSTS.filter(p => {
            if (currentCat !== 'all' && p.cat !== currentCat) return false;
            if (currentKw) {
                const kw = currentKw.toLowerCase();
                const hay = (p.title + p.excerpt + p.author + p.tags.join(' ') + p.cat).toLowerCase();
                if (!hay.includes(kw)) return false;
            }
            return true;
        });

        // 2) 排序：hot= 综合分；new= 日期；comment= 评论；like= 点赞
        list = list.slice().sort((a, b) => {
            const score = p => p.views*0.5 + p.comments*4 + p.likes*3 + (p.hot ? 500 : 0);
            if (currentSort === 'new') return b.date - a.date;
            if (currentSort === 'comment') return b.comments - a.comments;
            if (currentSort === 'like') return b.likes - a.likes;
            return score(b) - score(a);
        });

        if (!list.length) {
            postsGrid.innerHTML = `
                <div class="post-empty glass">
                    <div class="empty-seal">空</div>
                    <div>该分类下暂无帖子</div>
                    <div style="margin-top:8px;font-size:13px;color:var(--text-mute);letter-spacing:0.15em;">试试其他分类，或者自己发布一篇</div>
                </div>`;
            return;
        }

        postsGrid.innerHTML = list.map(p => `
            <article class="post-card glass ${p.hot?'hot':''}" data-pid="${p.id}" tabindex="0" role="button" aria-label="查看帖子详情：${escapeHTML(p.title)}">
                ${p.hot ? `<div class="post-hot-badge">热</div>` : ''}
                <div class="post-meta">
                    <div class="post-author">
                        <div class="pavatar" style="background:${pickColor(p.author)}">${p.author.charAt(0)}</div>
                        <div class="pauthor-info">
                            <div class="pauthor-name">${p.author}</div>
                            <div class="pauthor-sub">${p.sub}</div>
                        </div>
                    </div>
                    <div class="post-cat-tag">${p.cat}</div>
                </div>
                <h3 class="post-title">${p.title}</h3>
                <p class="post-excerpt">${p.excerpt}</p>
                <div class="post-tags">
                    ${p.tags.map(t => `<span class="post-tag">#${t}</span>`).join('')}
                </div>
                <div class="post-foot">
                    <div class="post-stats">
                        <div class="post-stat" title="阅读">${iconViews} <span>${toHotNum(p.views)}</span></div>
                        <div class="post-stat" title="评论">${iconCmts} <span>${toHotNum(p.comments)}</span></div>
                        <div class="post-stat" title="点赞">${iconLikes} <span>${toHotNum(p.likes)}</span></div>
                    </div>
                    <div class="post-date">${toCnDate(p.date)}</div>
                </div>
            </article>
        `).join('');
    }

    // 简易 HTML 转义
    function escapeHTML(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    /* ---------- 轻量 Markdown 渲染器 ---------- */
    function renderMarkdown(text) {
        if (!text) return '';
        // 先转义 HTML，防 XSS
        let html = escapeHTML(text);
        // 1. 提取代码块 ```lang\n...\n``` → 占位替换，避免内部被其他规则处理
        const codeBlocks = [];
        html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push(`<pre class="md-code"><code>${code.replace(/\n$/, '')}</code></pre>`);
            return `\u0000CODE${idx}\u0000`;
        });
        // 2. 行内代码 `code`
        html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');
        // 3. 按行处理块级元素
        const lines = html.split('\n');
        const out = [];
        let inList = false, inQuote = false, inCode = false;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            // 代码块占位行，直接输出
            if (/^\u0000CODE\d+\u0000$/.test(line.trim())) {
                if (inList) { out.push('</ul>'); inList = false; }
                if (inQuote) { out.push('</blockquote>'); inQuote = false; }
                out.push(line.trim());
                continue;
            }
            // 标题 ## / ###
            const h = line.match(/^(#{2,3})\s+(.+)$/);
            if (h) {
                if (inList) { out.push('</ul>'); inList = false; }
                if (inQuote) { out.push('</blockquote>'); inQuote = false; }
                const level = h[1].length; // ##=2, ###=3
                out.push(`<h${level + 1} class="md-h">${h[2]}</h${level + 1}>`);
                continue;
            }
            // # 单级标题
            const h1 = line.match(/^#\s+(.+)$/);
            if (h1) {
                if (inList) { out.push('</ul>'); inList = false; }
                if (inQuote) { out.push('</blockquote>'); inQuote = false; }
                out.push(`<h3 class="md-h">${h1[1]}</h3>`);
                continue;
            }
            // 无序列表 - item
            const li = line.match(/^[-*]\s+(.+)$/);
            if (li) {
                if (inQuote) { out.push('</blockquote>'); inQuote = false; }
                if (!inList) { out.push('<ul class="md-ul">'); inList = true; }
                out.push(`<li>${li[1]}</li>`);
                continue;
            }
            // 有序列表 1. item
            const ol = line.match(/^\d+\.\s+(.+)$/);
            if (ol) {
                if (inQuote) { out.push('</blockquote>'); inQuote = false; }
                if (!inList) { out.push('<ul class="md-ul">'); inList = true; }
                out.push(`<li>${ol[1]}</li>`);
                continue;
            }
            // 引用 >
            const bq = line.match(/^&gt;\s*(.+)$/);
            if (bq) {
                if (inList) { out.push('</ul>'); inList = false; }
                if (!inQuote) { out.push('<blockquote class="md-quote">'); inQuote = true; }
                out.push(bq[1]);
                continue;
            }
            // 空行：关闭列表/引用
            if (line.trim() === '') {
                if (inList) { out.push('</ul>'); inList = false; }
                if (inQuote) { out.push('</blockquote>'); inQuote = false; }
                out.push('');
                continue;
            }
            // 普通段落行
            if (inList) { out.push('</ul>'); inList = false; }
            if (inQuote) { out.push('</blockquote>'); inQuote = false; }
            out.push(`<p class="md-p">${line}</p>`);
        }
        if (inList) out.push('</ul>');
        if (inQuote) out.push('</blockquote>');
        html = out.join('\n');
        // 4. 粗体 **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // 5. 还原代码块占位
        html = html.replace(/\u0000CODE(\d+)\u0000/g, (m, idx) => codeBlocks[parseInt(idx)] || '');
        return html;
    }

    /* ---------- 分页渲染 ---------- */
    function renderPagination() {
        const oldPager = document.getElementById('postPager');
        if (oldPager) oldPager.remove();
        if (totalPages <= 1) return;
        const pager = document.createElement('div');
        pager.className = 'post-pager';
        pager.id = 'postPager';

        const btn = (label, page, opts = {}) => {
            const b = document.createElement('button');
            b.className = 'pager-btn' + (opts.disabled ? ' disabled' : '') + (opts.active ? ' active' : '');
            b.textContent = label;
            if (opts.disabled) b.disabled = true;
            else b.addEventListener('click', () => loadPosts(page));
            return b;
        };

        // 上一页
        pager.appendChild(btn('‹ 上页', currentPage - 1, { disabled: currentPage <= 1 }));

        // 页码：始终显示首尾页和当前页前后2页，其余用省略号
        const pages = [];
        const add = p => { if (!pages.includes(p)) pages.push(p); };
        add(1); add(currentPage - 1); add(currentPage); add(currentPage + 1); add(totalPages);
        pages.sort((a, b) => a - b);
        let last = 0;
        pages.forEach(p => {
            if (p < 1 || p > totalPages) return;
            if (last && p - last > 1) {
                const ell = document.createElement('span');
                ell.className = 'pager-ellipsis';
                ell.textContent = '…';
                pager.appendChild(ell);
            }
            pager.appendChild(btn(String(p), p, { active: p === currentPage }));
            last = p;
        });

        // 下一页
        pager.appendChild(btn('下页 ›', currentPage + 1, { disabled: currentPage >= totalPages }));

        // 页码信息
        const info = document.createElement('span');
        info.className = 'pager-info';
        info.textContent = `第 ${currentPage} / ${totalPages} 卷 · 共 ${totalCount} 帖`;
        pager.appendChild(info);

        postsGrid.insertAdjacentElement('afterend', pager);
    }

    /* ---------- 帖子详情模态框（含评论区 + 鉴权点赞） ---------- */
    let postDetailEl = null;
    let pdCurrentUserId = null;
    let pdHasLiked = false; // 当前用户是否已点赞
    let pdHasFavorited = false; // 当前用户是否已收藏
    const pdExpandedReplies = new Set(); // 已展开更多回复的评论ID集合
    function ensurePostDetail() {
        if (postDetailEl) return postDetailEl;
        postDetailEl = document.createElement('div');
        postDetailEl.className = 'pd-modal';
        postDetailEl.style.display = 'none';
        postDetailEl.innerHTML = `
            <div class="pd-mask" data-pd-close></div>
            <div class="pd-panel">
                <div class="pd-head">
                    <div class="pd-title-row">
                        <span class="pd-seal">帖</span>
                        <h2 class="pd-title">阅帖</h2>
                    </div>
                    <button class="pd-close" data-pd-close aria-label="关闭">×</button>
                </div>
                <div class="pd-body">
                    <div class="pd-loading">正在展开此帖…</div>
                </div>
                <div class="pd-foot">
                    <div class="pd-stats">
                        <span class="pd-stat" id="pdViews">阅读 0</span>
                        <span class="pd-stat" id="pdLikes">点赞 0</span>
                        <span class="pd-stat" id="pdCmtCount">评论 0</span>
                    </div>
                    <div class="pd-action-btns">
                        <button class="pd-like-btn" id="pdLikeBtn"><span class="pd-like-icon">♡</span> 点赞</button>
                        <button class="pd-fav-btn" id="pdFavBtn">☆ 收藏</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(postDetailEl);
        postDetailEl.querySelectorAll('[data-pd-close]').forEach(el => {
            el.addEventListener('click', closePostDetail);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && postDetailEl && postDetailEl.style.display !== 'none') closePostDetail();
        });
        // 点赞按钮（toggle：已点赞→取消，未点赞→点赞）
        const likeBtn = postDetailEl.querySelector('#pdLikeBtn');
        if (likeBtn) likeBtn.addEventListener('click', async () => {
            if (!postDetailEl) return;
            const id = postDetailEl.dataset.pid;
            if (!id) return;
            const token = localStorage.getItem('maiji_token');
            if (!token) {
                showToast('请先登录再点赞', 'info');
                return;
            }
            likeBtn.disabled = true;
            try {
                const res = await fetch((window.MAIJI_API_BASE || '') + '/api/posts/' + id + '/like', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!res.ok) {
                    const err = await res.json();
                    showToast(err.detail || '操作失败', 'error');
                    return;
                }
                const data = await res.json();
                const likeEl = postDetailEl.querySelector('#pdLikes');
                if (likeEl) likeEl.textContent = '点赞 ' + toHotNum(data.like_count || 0);
                pdHasLiked = data.has_liked;
                likeBtn.classList.toggle('liked', pdHasLiked);
                const likeIcon = likeBtn.querySelector('.pd-like-icon');
                if (likeIcon) likeIcon.textContent = pdHasLiked ? '❤' : '♡';
                showToast(data.message, 'success');
                loadPosts();
            } catch (err) {
                showToast('操作失败', 'error');
            } finally {
                likeBtn.disabled = false;
            }
        });
        // 收藏按钮（toggle：已收藏→取消，未收藏→收藏）
        const favBtn = postDetailEl.querySelector('#pdFavBtn');
        if (favBtn) favBtn.addEventListener('click', async () => {
            if (!postDetailEl) return;
            const id = postDetailEl.dataset.pid;
            if (!id) return;
            const token = localStorage.getItem('maiji_token');
            if (!token) {
                showToast('请先登录再收藏', 'info');
                return;
            }
            favBtn.disabled = true;
            try {
                if (pdHasFavorited) {
                    const res = await fetch((window.MAIJI_API_BASE || '') + '/api/favorites/posts/' + id, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        pdHasFavorited = false;
                        favBtn.classList.remove('favorited');
                        showToast('已取消收藏', 'info');
                    }
                } else {
                    const res = await fetch((window.MAIJI_API_BASE || '') + '/api/favorites/posts/' + id, {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        pdHasFavorited = true;
                        favBtn.classList.add('favorited');
                        showToast('已珍藏此帖', 'success');
                    }
                }
            } catch (err) {
                showToast('操作失败', 'error');
            } finally {
                favBtn.disabled = false;
            }
        });
        return postDetailEl;
    }

    async function openPostDetail(postId, opts) {
        const modal = ensurePostDetail();
        modal.dataset.pid = postId;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => modal.classList.add('show'));
        const body = modal.querySelector('.pd-body');
        body.innerHTML = '<div class="pd-loading">正在展开此帖…</div>';
        pdHasLiked = false;
        pdHasFavorited = false;
        // 重置评论分页状态
        pdCommentCursor = null;
        pdCommentHasMore = false;
        pdCommentLoading = false;
        pdExpandedReplies.clear();
        const likeBtn = modal.querySelector('#pdLikeBtn');
        if (likeBtn) {
            likeBtn.classList.remove('liked');
            const likeIcon = likeBtn.querySelector('.pd-like-icon');
            if (likeIcon) likeIcon.textContent = '♡';
        }
        const favBtn = modal.querySelector('#pdFavBtn');
        if (favBtn) favBtn.classList.remove('favorited');
        // 阅读数去重：同一会话内已查看过的帖子不再累加阅读数
        const viewedKey = 'pd_viewed';
        let viewed = [];
        try { viewed = JSON.parse(sessionStorage.getItem(viewedKey) || '[]'); } catch (_) {}
        const alreadyViewed = viewed.includes(postId);
        try {
            const token = localStorage.getItem('maiji_token');
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;
            const url = (window.MAIJI_API_BASE || '') + '/api/posts/' + postId + (alreadyViewed ? '?inc=false' : '');
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error('帖子不存在或已下架');
            const p = await res.json();
            // 记录已查看
            if (!alreadyViewed) {
                viewed.push(postId);
                sessionStorage.setItem(viewedKey, JSON.stringify(viewed));
            }
            // 设置点赞/收藏初始状态
            pdHasLiked = !!p.has_liked;
            pdHasFavorited = !!p.has_favorited;
            if (likeBtn) {
                likeBtn.classList.toggle('liked', pdHasLiked);
                const likeIcon = likeBtn.querySelector('.pd-like-icon');
                if (likeIcon) likeIcon.textContent = pdHasLiked ? '❤' : '♡';
            }
            if (favBtn) favBtn.classList.toggle('favorited', pdHasFavorited);
            renderPostDetail(p);
            await loadPostComments(postId);
            // 如果从通知跳转且指定了评论ID，滚动到对应评论
            if (opts && opts.commentId) {
                setTimeout(() => {
                    const cmtEl = modal.querySelector(`[data-cmt-id="${opts.commentId}"]`);
                    if (cmtEl) cmtEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        } catch (err) {
            body.innerHTML = `<div class="pd-error">${escapeHTML(err.message || '加载失败')}</div>`;
        }
    }

    function closePostDetail() {
        if (!postDetailEl) return;
        postDetailEl.classList.remove('show');
        document.body.style.overflow = '';
        setTimeout(() => { if (postDetailEl) postDetailEl.style.display = 'none'; }, 280);
    }

    function renderPostDetail(p) {
        const modal = postDetailEl;
        const body = modal.querySelector('.pd-body');
        const date = new Date(p.created_at);
        body.innerHTML = `
            <div class="pd-article">
                <div class="pd-article-head">
                    <div class="pd-cat-tag">${escapeHTML(p.category || '随笔杂谈')}</div>
                    <h1 class="pd-article-title">${escapeHTML(p.title)}</h1>
                    <div class="pd-article-meta">
                        <div class="pd-author">
                            <div class="pavatar" style="background:${pickColor(p.author_name || '佚名')}">${(p.author_name || '佚').charAt(0)}</div>
                            <div>
                                <div class="pd-author-name">${escapeHTML(p.author_name || '佚名')}</div>
                                <div class="pd-author-date">${toCnDate(date)} · 第 ${p.id} 帖</div>
                            </div>
                        </div>
                    </div>
                </div>
                ${p.excerpt ? `<div class="pd-excerpt">「${escapeHTML(p.excerpt)}」</div>` : ''}
                <div class="pd-content">${renderMarkdown(p.content || '')}</div>
                ${renderPostImages(p.images)}
            </div>
            <div class="pd-comments" id="pdComments">
                <div class="pd-cmt-head">
                    <span class="pd-cmt-title">评论</span>
                    <span class="pd-cmt-count" id="pdCmtCountInline">0</span>
                </div>
                <div class="pd-cmt-form" id="pdCmtForm">
                    <textarea id="pdCmtInput" class="pd-cmt-input" placeholder="留下你的看法…" rows="2" maxlength="2000"></textarea>
                    <button class="pd-cmt-submit" id="pdCmtSubmit">发表评论</button>
                </div>
                <div class="pd-cmt-list" id="pdCmtList">
                    <div class="pd-loading">正在加载评论…</div>
                </div>
            </div>
        `;
        modal.querySelector('#pdViews').textContent = '阅读 ' + toHotNum(p.read_count || 0);
        modal.querySelector('#pdLikes').textContent = '点赞 ' + toHotNum(p.like_count || 0);
        modal.querySelector('#pdCmtCount').textContent = '评论 ' + toHotNum(p.comment_count || 0);
        modal.querySelector('#pdCmtCountInline').textContent = toHotNum(p.comment_count || 0);
        // 检查登录态，未登录则禁用评论框并提示
        const token = localStorage.getItem('maiji_token');
        const cmtForm = modal.querySelector('#pdCmtForm');
        if (!token) {
            cmtForm.innerHTML = '<div class="pd-cmt-login-tip">登录后可发表评论</div>';
        } else {
            // 用事件委托绑定提交，避免 DOM 替换后监听器丢失
            modal.querySelector('#pdCmtSubmit').addEventListener('click', () => {
                const input = modal.querySelector('#pdCmtInput');
                if (input) submitPostComment(p.id, null, input);
            });
            modal.querySelector('#pdCmtInput').addEventListener('keydown', e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    const input = e.target;
                    submitPostComment(p.id, null, input);
                }
            });
        }
    }

    /* ---------- 评论列表加载与渲染（楼中楼 · 游标分页） ---------- */
    // 评论分页状态
    let pdCommentCursor = null;     // 下一页游标
    let pdCommentHasMore = false;   // 是否还有更多
    let pdCommentLoading = false;   // 加载锁

    async function loadPostComments(postId, append = false) {
        const modal = postDetailEl;
        if (!modal) return;
        const listEl = modal.querySelector('#pdCmtList');
        if (!listEl) return;
        if (pdCommentLoading) return;
        pdCommentLoading = true;
        try {
            const token = localStorage.getItem('maiji_token');
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            let url = (window.MAIJI_API_BASE || '') + '/api/posts/' + postId + '/comments';
            if (append && pdCommentCursor) {
                url += '?cursor=' + encodeURIComponent(pdCommentCursor);
            }
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error('评论加载失败');
            const data = await res.json();
            pdCurrentUserId = data.current_user_id;
            pdCommentCursor = data.next_cursor || null;
            pdCommentHasMore = !!data.has_more;
            if (append) {
                // 追加渲染：在末尾插入新评论
                const frag = document.createElement('div');
                frag.innerHTML = (data.items || []).map(c => renderCommentNode(c, 0)).join('');
                // 移除旧的"加载更多"按钮
                const oldMore = listEl.querySelector('.pd-cmt-load-more');
                if (oldMore) oldMore.remove();
                while (frag.firstChild) listEl.appendChild(frag.firstChild);
                // 绑定新元素事件
                listEl.querySelectorAll('[data-cmt-action]:not([data-bound])').forEach(btn => {
                    btn.setAttribute('data-bound', '1');
                    btn.addEventListener('click', e => {
                        e.stopPropagation();
                        bindCommentAction(btn);
                    });
                });
            } else {
                renderPostComments(data.items || [], listEl);
            }
            // 更新计数
            const total = data.total || 0;
            const cntEl = modal.querySelector('#pdCmtCount');
            const cntInline = modal.querySelector('#pdCmtCountInline');
            if (cntEl) cntEl.textContent = '评论 ' + toHotNum(total);
            if (cntInline) cntInline.textContent = toHotNum(total);
            // 如果还有更多，添加"加载更多"按钮
            if (pdCommentHasMore) {
                appendLoadMoreBtn(listEl, postId);
            }
        } catch (err) {
            if (!append) {
                listEl.innerHTML = `<div class="pd-error">${escapeHTML(err.message)}</div>`;
            }
        } finally {
            pdCommentLoading = false;
        }
    }

    function appendLoadMoreBtn(listEl, postId) {
        const btn = document.createElement('button');
        btn.className = 'pd-cmt-load-more';
        btn.textContent = '加载更多评论';
        btn.addEventListener('click', () => {
            btn.textContent = '加载中…';
            btn.disabled = true;
            loadPostComments(postId, true).finally(() => {
                if (!pdCommentHasMore) btn.remove();
            });
        });
        listEl.appendChild(btn);
    }

    function bindCommentAction(btn) {
        const action = btn.dataset.cmtAction;
        const cid = Number(btn.dataset.cmtId);
        const pid = btn.dataset.cmtPid ? Number(btn.dataset.cmtPid) : null;
        if (action === 'delete') deletePostComment(cid);
        else if (action === 'reply') toggleReplyForm(pid, cid);
        else if (action === 'reply-submit') {
            const ta = btn.closest('.pd-reply-form')?.querySelector('textarea');
            if (ta) submitPostComment(Number(btn.dataset.postId), pid, ta);
        }
        else if (action === 'reply-cancel') toggleReplyForm(pid, null);
        else if (action === 'toggle-replies') toggleReplies(cid);
    }

    function renderPostComments(tree, container) {
        if (!tree.length) {
            container.innerHTML = '<div class="pd-cmt-empty">尚无评论，留下第一笔吧。</div>';
            return;
        }
        container.innerHTML = tree.map(c => renderCommentNode(c, 0)).join('');
        // 绑定事件：删除、回复
        container.querySelectorAll('[data-cmt-action]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                bindCommentAction(btn);
            });
        });
    }

    function renderCommentAvatar(name, avatar) {
        const displayName = name || '佚名';
        if (avatar && avatar.trim()) {
            return `<div class="pd-cmt-avatar" data-name="${escapeHTML(displayName)}" data-bg="${pickColor(displayName)}" data-char="${escapeHTML(displayName.charAt(0))}"><img src="${escapeHTML(avatar)}" alt="${escapeHTML(displayName)}" onerror="cmtAvatarFallback(this)"></div>`;
        }
        return `<div class="pd-cmt-avatar" style="background:${pickColor(displayName)}">${escapeHTML(displayName.charAt(0))}</div>`;
    }

    // 将嵌套回复树扁平化为一维数组，并附带每条回复的被回复者名字
    function flattenReplies(replies, parentName) {
        const result = [];
        for (const r of replies) {
            result.push({ ...r, reply_to_name: parentName });
            if (r.replies && r.replies.length) {
                result.push(...flattenReplies(r.replies, r.author_name));
            }
        }
        return result;
    }

    // 渲染单条评论（顶层评论或扁平化后的回复）
    function renderCommentNode(c, depth, replyToName) {
        const isMine = pdCurrentUserId && c.user_id === pdCurrentUserId;
        const date = new Date(c.created_at);
        // 每条评论都有回复表单
        const replyForm = `
            <div class="pd-reply-form" id="pdReplyForm_${c.id}" style="display:none;">
                <textarea placeholder="回复 ${escapeHTML(c.author_name)}…" rows="2" maxlength="2000"></textarea>
                <div class="pd-reply-actions">
                    <button class="pd-reply-cancel" data-cmt-action="reply-cancel" data-cmt-id="${c.id}" data-cmt-pid="${c.id}">取消</button>
                    <button class="pd-reply-submit" data-cmt-action="reply-submit" data-cmt-id="${c.id}" data-cmt-pid="${c.id}" data-post-id="${c.post_id}">回复</button>
                </div>
            </div>
        `;
        // 回复目标标识：仅回复显示"回复了 @xxx"
        const replyToBadge = replyToName
            ? `<span class="pd-cmt-reply-to">回复了 @${escapeHTML(replyToName)}</span>`
            : '';
        let innerHtml = `
            <div class="pd-cmt-head">
                <span class="pd-cmt-author">${escapeHTML(c.author_name || '佚名')}</span>
                ${replyToBadge}
                <span class="pd-cmt-date">${toCnDate(date)}</span>
                ${isMine ? `<button class="pd-cmt-del" data-cmt-action="delete" data-cmt-id="${c.id}" data-cmt-pid="${c.parent_id ?? ''}" title="删除">删</button>` : ''}
            </div>
            <div class="pd-cmt-content">${escapeHTML(c.content || '').replace(/\n/g, '<br>')}</div>
            <button class="pd-cmt-reply" data-cmt-action="reply" data-cmt-id="${c.id}" data-cmt-pid="${c.id}">回复</button>
            ${replyForm}
        `;
        // 仅顶层评论渲染回复列表（扁平化，所有回复同一列）
        if (depth === 0) {
            const flatReplies = flattenReplies(c.replies || [], c.author_name);
            const expanded = pdExpandedReplies.has(c.id);
            const visibleReplies = expanded ? flatReplies : flatReplies.slice(0, 3);
            const hiddenCount = flatReplies.length - visibleReplies.length;
            if (flatReplies.length) {
                innerHtml += `
                    <div class="pd-cmt-replies">
                        ${visibleReplies.map(r => renderCommentNode(r, 1, r.reply_to_name)).join('')}
                        ${hiddenCount > 0 ? `<button class="pd-reply-more" data-cmt-action="toggle-replies" data-cmt-id="${c.id}">展开 ${hiddenCount} 条回复</button>` : ''}
                        ${expanded && flatReplies.length > 3 ? `<button class="pd-reply-more" data-cmt-action="toggle-replies" data-cmt-id="${c.id}">收起回复</button>` : ''}
                    </div>
                `;
            }
        }
        return `
            <div class="pd-cmt-item" data-cmt-id="${c.id}">
                ${renderCommentAvatar(c.author_name, c.author_avatar)}
                <div class="pd-cmt-main">${innerHtml}</div>
            </div>
        `;
    }

    function toggleReplies(cid) {
        if (pdExpandedReplies.has(cid)) pdExpandedReplies.delete(cid);
        else pdExpandedReplies.add(cid);
        // 重新渲染评论列表（保留当前评论列表数据）
        const modal = postDetailEl;
        if (!modal) return;
        const listEl = modal.querySelector('#pdCmtList');
        // 从当前已渲染的评论重新渲染（不需要重新请求接口）
        // 简单处理：直接重新请求评论列表
        const postId = Number(modal.dataset.pid);
        loadPostComments(postId);
    }

    function toggleReplyForm(parentId, replyCid) {
        const modal = postDetailEl;
        if (!modal) return;
        // 关闭其他已展开的回复框
        modal.querySelectorAll('.pd-reply-form').forEach(f => { f.style.display = 'none'; });
        if (replyCid) {
            const target = modal.querySelector('#pdReplyForm_' + replyCid);
            if (target) {
                target.style.display = '';
                const ta = target.querySelector('textarea');
                if (ta) setTimeout(() => ta.focus(), 50);
            }
        }
    }

    async function submitPostComment(postId, parentId, inputEl) {
        if (!inputEl) return;
        const content = inputEl.value.trim();
        if (!content) {
            showToast('评论内容不能为空', 'info');
            inputEl.focus();
            return;
        }
        const token = localStorage.getItem('maiji_token');
        if (!token) {
            showToast('请先登录', 'info');
            return;
        }
        // 判断是顶层评论还是楼中楼回复，精确禁用对应按钮
        const isReply = !!inputEl.closest('.pd-reply-form');
        const submitBtn = isReply
            ? inputEl.closest('.pd-reply-form')?.querySelector('.pd-reply-submit')
            : inputEl.closest('.pd-cmt-form')?.querySelector('#pdCmtSubmit');
        if (submitBtn) submitBtn.disabled = true;
        try {
            await callApi(`/api/posts/${postId}/comments`, {
                method: 'POST',
                body: { content, parent_id: parentId }
            });
            inputEl.value = '';
            showToast('评论已发表', 'success');
            await loadPostComments(postId);
            // 同步刷新外层列表的 comment_count
            loadPosts();
        } catch (err) {
            showToast(err.message || '评论失败', 'error');
        } finally {
            // 重新查找对应按钮并恢复可用
            const btn = isReply
                ? document.querySelector('.pd-reply-form:not([style*="none"]) .pd-reply-submit')
                : document.querySelector('#pdCmtSubmit');
            if (btn) btn.disabled = false;
        }
    }

    async function deletePostComment(commentId) {
        if (!postDetailEl) return;
        const postId = Number(postDetailEl.dataset.pid);
        const token = localStorage.getItem('maiji_token');
        if (!token) {
            showToast('请先登录', 'info');
            return;
        }
        if (!confirm('确认删除此评论？')) return;
        try {
            await callApi(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
            showToast('已删除', 'success');
            await loadPostComments(postId);
            loadPosts();
        } catch (err) {
            showToast(err.message || '删除失败', 'error');
        }
    }

    loadPosts();

    // 监听发帖事件：发帖后自动刷新帖子列表
    document.addEventListener('post:created', () => {
        loadPosts(1);
    });

    // 事件：分类切换
    categoryChips && categoryChips.addEventListener('click', e => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        categoryChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.dataset.cat;
        loadPosts(1);
    });
    // 事件：排序切换
    sortChips && sortChips.addEventListener('click', e => {
        const btn = e.target.closest('.sort-chip');
        if (!btn) return;
        sortChips.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        renderPosts();
    });
    // 事件：搜索（去抖）
    let searchTimer;
    postSearchInput && postSearchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentKw = e.target.value.trim();
            loadPosts(1);
        }, 220);
    });

    // 事件：点击帖子卡片打开详情
    postsGrid && postsGrid.addEventListener('click', e => {
        const card = e.target.closest('.post-card[data-pid]');
        if (!card) return;
        const pid = Number(card.dataset.pid);
        if (pid) openPostDetail(pid);
    });
    // 键盘可访问性：回车打开详情
    postsGrid && postsGrid.addEventListener('keydown', e => {
        const card = e.target.closest('.post-card[data-pid]');
        if (!card) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const pid = Number(card.dataset.pid);
            if (pid) openPostDetail(pid);
        }
    });

    window.openPostDetail = openPostDetail;
    window.closePostDetail = closePostDetail;

    /* ---------- 第三方登录（模拟） ---------- */
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.getAttribute('aria-label');
            showToast(`正在跳转 ${provider} 授权...`, 'info');
            setTimeout(() => {
                loginUser(provider + ' 用户', `user@${provider.toLowerCase()}.com`);
                closeAuth();
                showToast(`已通过 ${provider} 登录成功`, 'success');
            }, 1000);
        });
    });

    console.log('%c 脉记 · 笔记知识典藏 %c v2.4 ',
        'background:linear-gradient(135deg,#b7472a,#a07a2c);color:#fffaf0;padding:4px 12px;border-radius:2px 0 0 2px;font-weight:bold;font-family:"KaiTi","STKaiti",serif',
        'background:#3d352a;color:#c7a25a;padding:4px 12px;border-radius:0 2px 2px 0;font-family:monospace'
    );
});
