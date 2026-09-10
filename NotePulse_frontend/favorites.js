/* 我的收藏 · favorites.js */
document.addEventListener('DOMContentLoaded', async () => {
    if (!guardAuth()) return;
    injectSimpleNav('favorites');
    restoreLoginState();

    await renderFavorites();
});

async function renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const elCount = document.getElementById('favCount');
    if (!grid) return;
    grid.innerHTML = '<div class="profile-empty">展卷载入…</div>';
    try {
        const data = await callApi('/api/favorites', { method: 'GET' });
        const items = data.items || [];
        if (elCount) elCount.textContent = `${data.total || items.length} 帖`;
        if (!items.length) {
            grid.innerHTML = `
                <div class="post-empty glass" style="grid-column:1/-1;">
                    <div class="empty-seal">空</div>
                    <div>尚未珍存任何帖子</div>
                    <div style="margin-top:8px;font-size:13px;color:var(--text-mute);letter-spacing:0.15em;">前往「同之帖」点收藏按钮加入藏珍</div>
                </div>`;
            return;
        }
        grid.innerHTML = items.map(f => {
            const p = f.post;
            return `
                <article class="post-card glass">
                    <div class="post-meta">
                        <div class="post-author">
                            <div class="pavatar" style="background:${pickColor(p.author_name || '匿')}">${escapeHtml((p.author_name || '匿').charAt(0))}</div>
                            <div class="pauthor-info">
                                <div class="pauthor-name">${escapeHtml(p.author_name || '匿名')}</div>
                                <div class="pauthor-sub">收藏于 ${toCnDate(f.created_at)}</div>
                            </div>
                        </div>
                        <div class="post-cat-tag">${escapeHtml(p.category || '随笔杂谈')}</div>
                    </div>
                    <h3 class="post-title">${escapeHtml(p.title)}</h3>
                    <p class="post-excerpt">${escapeHtml(p.excerpt || '')}</p>
                    <div class="post-foot">
                        <span class="post-stat">阅 ${p.read_count || 0}</span>
                        <span class="post-stat">赞 ${p.like_count || 0}</span>
                    </div>
                    <button class="fav-unfav-btn" data-pid="${p.id}">取消收藏</button>
                </article>`;
        }).join('');
        grid.querySelectorAll('.fav-unfav-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pid = btn.dataset.pid;
                try {
                    await callApi('/api/favorites/posts/' + pid, { method: 'DELETE' });
                    showToast('已取消收藏', 'info');
                    await renderFavorites();
                } catch (err) { showToast(err.message, 'error'); }
            });
        });
    } catch (err) {
        grid.innerHTML = `<div class="profile-empty">载入失败：${escapeHtml(err.message || '')}</div>`;
    }
}
