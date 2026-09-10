/* 个人中心 · profile.js */
document.addEventListener('DOMContentLoaded', async () => {
    if (!guardAuth()) return;
    injectSimpleNav('profile');
    restoreLoginState();

    const elAvatar = document.getElementById('profileAvatar');
    const elName = document.getElementById('profileName');
    const elEmail = document.getElementById('profileEmail');
    const elBio = document.getElementById('profileBio');
    const elJoined = document.getElementById('profileJoined');
    const elNoteCount = document.getElementById('profileNoteCount');
    const elPostCount = document.getElementById('profilePostCount');
    const elFavCount = document.getElementById('profileFavCount');
    const elFeed = document.getElementById('profileFeed');

    try {
        const profile = await callApi('/api/users/me/profile', { method: 'GET' });
        // 同步到 localStorage 并刷新顶部导航头像
        const userInfo = {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            avatar: profile.avatar || '',
            bio: profile.bio || '',
            created_at: profile.created_at,
        };
        localStorage.setItem('maiji_user', JSON.stringify(userInfo));
        renderUserState(userInfo);
        // 个人中心大头像：自定义 URL 优先，否则蛊虫纷飞 SVG
        if (profile.avatar) {
            elAvatar.innerHTML = `<img src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(profile.username)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            applyGuAvatar(elAvatar);
        }
        elName.textContent = profile.username || '同道';
        elEmail.textContent = profile.email || '—';
        elBio.textContent = profile.bio || '尚无简介，请于设置面板补全';
        elJoined.textContent = toCnDate(profile.created_at);
        elNoteCount.textContent = profile.note_count;
        elPostCount.textContent = profile.post_count;
        elFavCount.textContent = profile.favorite_count;
    } catch (err) {
        // API 失败时仍显示蛊虫头像，避免保持"蛊"占位文字
        applyGuAvatar(elAvatar);
        elFeed.innerHTML = `<div class="profile-empty">载入失败：${escapeHtml(err.message || '未知错误')}</div>`;
        return;
    }

    elFeed.innerHTML = '<div class="profile-empty">采撷近墨留痕…</div>';
    try {
        const [notesData, postsData] = await Promise.all([
            callApi('/api/notes?page=1&size=5', { method: 'GET' }),
            callApi('/api/posts?mine=1&page=1&size=5', { method: 'GET' }),
        ]);
        const notes = notesData.items || [];
        const posts = (postsData.items || []).map(p => ({ ...p, _type: 'post' }));
        const merged = [
            ...notes.map(n => ({ id: n.id, title: n.title, created_at: n.created_at, _type: 'note' })),
            ...posts.map(p => ({ id: p.id, title: p.title, created_at: p.created_at, _type: 'post' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

        if (!merged.length) {
            elFeed.innerHTML = '<div class="profile-empty">尚未留痕，去笔耕一方吧</div>';
            return;
        }
        elFeed.innerHTML = merged.map(it => `
            <div class="profile-feed-item">
                <div class="feed-type">${it._type === 'note' ? '墨' : '帖'}</div>
                <div class="feed-title">${escapeHtml(it.title)}</div>
                <div class="feed-time">${toCnDate(it.created_at)}</div>
            </div>
        `).join('');
    } catch (err) {
        elFeed.innerHTML = `<div class="profile-empty">近墨留痕载入失败：${escapeHtml(err.message || '')}</div>`;
    }

    // 监听全局 user:updated 事件：设置页改了头像/用户名后实时刷新个人中心
    document.addEventListener('user:updated', e => {
        const user = e.detail;
        if (!user) return;
        const elAvatar = document.getElementById('profileAvatar');
        const elName = document.getElementById('profileName');
        if (elAvatar) {
            if (user.avatar) {
                elAvatar.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.username)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                applyGuAvatar(elAvatar);
            }
        }
        if (elName) elName.textContent = user.username || '同道';
    });

    /* ---------- 我的帖子管理 ---------- */
    let myPostsCache = [];

    async function renderMyPosts() {
        const grid = document.getElementById('profilePostsGrid');
        const elCount = document.getElementById('profilePostCount2');
        if (!grid) return;
        grid.innerHTML = '<div class="profile-empty">展卷载入…</div>';
        try {
            const data = await callApi('/api/posts?mine=1&page=1&size=20', { method: 'GET' });
            const items = data.items || [];
            myPostsCache = items;
            if (elCount) elCount.textContent = `${data.total || items.length} 帖`;
            if (!items.length) {
                grid.innerHTML = `
                    <div class="post-empty glass" style="grid-column:1/-1;">
                        <div class="empty-seal">空</div>
                        <div>尚未入卷成帖，落笔一方吧</div>
                    </div>`;
                return;
            }
            grid.innerHTML = items.map(p => `
                <article class="post-card glass" data-pid="${p.id}">
                    <div class="post-meta">
                        <div class="post-cat-tag">${escapeHtml(p.category || '随笔杂谈')}</div>
                    </div>
                    <h3 class="post-title">${escapeHtml(p.title)}</h3>
                    <p class="post-excerpt">${escapeHtml(p.excerpt || '')}</p>
                    <div class="post-foot">
                        <div class="post-stats">
                            <span class="post-stat">阅 ${p.read_count || 0}</span>
                            <span class="post-stat">赞 ${p.like_count || 0}</span>
                            <span class="post-stat">评 ${p.comment_count || 0}</span>
                        </div>
                        <div class="post-date">${toCnDate(p.created_at)}</div>
                    </div>
                    <div class="post-actions">
                        <button class="note-act-btn" data-action="edit" data-pid="${p.id}">修</button>
                        <button class="note-act-btn danger" data-action="delete" data-pid="${p.id}">删</button>
                    </div>
                </article>
            `).join('');
            bindPostActions();
        } catch (err) {
            grid.innerHTML = `<div class="profile-empty">载入失败：${escapeHtml(err.message || '')}</div>`;
        }
    }

    function bindPostActions() {
        document.querySelectorAll('#profilePostsGrid [data-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                const pid = Number(btn.dataset.pid);
                const post = myPostsCache.find(p => p.id === pid);
                if (action === 'edit') {
                    if (post && typeof openPostEditorForEdit === 'function') {
                        openPostEditorForEdit(post);
                    }
                } else if (action === 'delete') {
                    if (!confirm('确认删除此帖？此动不可逆。')) return;
                    try {
                        await callApi('/api/posts/' + pid, { method: 'DELETE' });
                        showToast('帖子已撤卷', 'info');
                        await renderMyPosts();
                    } catch (err) {
                        showToast(err.message || '删除失败', 'error');
                    }
                }
            });
        });
    }

    // 新帖按钮
    const newPostBtn = document.getElementById('profileNewPostBtn');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            if (typeof openPostEditor === 'function') openPostEditor();
        });
    }

    // 帖子创建/编辑后刷新
    document.addEventListener('post:created', renderMyPosts);
    document.addEventListener('post:updated', renderMyPosts);

    renderMyPosts();
});
