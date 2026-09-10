/* 我的笔记 · my-notes.js */
let myNotesCurrentCat = '全部';
let myNotesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!guardAuth()) return;
    injectSimpleNav('my-notes');
    restoreLoginState();

    // 监听笔记创建事件 → 自动刷新列表
    document.addEventListener('note:created', () => {
        if (typeof renderMyNotes === 'function') renderMyNotes();
    });

    // 分类筛选
    document.addEventListener('click', e => {
        const chip = e.target.closest('#myNotesChips .chip');
        if (!chip) return;
        document.querySelectorAll('#myNotesChips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        myNotesCurrentCat = chip.dataset.cat;
        renderMyNotesList();
    });

    // 新建笔记
    const newBtn = document.getElementById('myNotesNewBtn');
    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            const title = prompt('请输入笔记标题：');
            if (!title) return;
            const content = prompt('请输入笔记正文（可稍后编辑补充）：') || '';
            try {
                await callApi('/api/notes', { body: { title, content, category: '随笔杂谈' } });
                showToast('笔记已入卷', 'success');
                await renderMyNotes();
            } catch (err) { showToast(err.message, 'error'); }
        });
    }

    await renderMyNotes();
});

async function renderMyNotes() {
    const grid = document.getElementById('myNotesGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="profile-empty">展卷载入…</div>';
    try {
        const data = await callApi('/api/notes?page=1&size=100', { method: 'GET' });
        myNotesCache = data.items || [];
        renderMyNotesList();
    } catch (err) {
        grid.innerHTML = `<div class="profile-empty">载入失败：${escapeHtml(err.message || '')}</div>`;
    }
}

function renderMyNotesList() {
    const grid = document.getElementById('myNotesGrid');
    if (!grid) return;
    let list = myNotesCache;
    if (myNotesCurrentCat !== '全部') {
        list = list.filter(n => (n.category || '随笔杂谈') === myNotesCurrentCat);
    }
    list = list.slice().sort((a, b) => {
        if (!!b.is_pinned - !!a.is_pinned) return !!b.is_pinned - !!a.is_pinned;
        return new Date(b.created_at) - new Date(a.created_at);
    });
    if (!list.length) {
        grid.innerHTML = `
            <div class="profile-empty glass" style="grid-column:1/-1;">
                <div class="empty-seal">空</div>
                <div>该部类下暂无笔记</div>
            </div>`;
        return;
    }
    grid.innerHTML = list.map(n => `
        <article class="note-card glass ${n.is_pinned ? 'featured' : ''}">
            <div class="note-meta">
                <span class="note-cat">${escapeHtml(n.category || '随笔杂谈')}</span>
                <span class="note-date">${toCnDate(n.created_at)}</span>
                ${n.is_pinned ? '<span class="featured-tag">PINNED</span>' : ''}
            </div>
            <h3 class="note-title">${escapeHtml(n.title)}</h3>
            <p class="note-excerpt">${escapeHtml((n.content || '').slice(0, 80))}${(n.content||'').length>80?'…':''}</p>
            <div class="note-foot">
                <span class="note-stat">${toCnDate(n.updated_at)} 更新</span>
            </div>
            <div class="note-actions">
                <button class="note-act-btn pin-toggle ${n.is_pinned?'pin-active':''}" data-id="${n.id}" data-action="pin">
                    ${n.is_pinned ? '取消置顶' : '置顶'}
                </button>
                <button class="note-act-btn danger" data-id="${n.id}" data-action="delete">删除</button>
            </div>
        </article>
    `).join('');

    grid.querySelectorAll('.note-act-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === 'delete') {
                if (!confirm('确认删除此条笔记？此动不可逆。')) return;
                try {
                    await callApi('/api/notes/' + id, { method: 'DELETE' });
                    showToast('笔记已删除', 'success');
                    myNotesCache = myNotesCache.filter(n => String(n.id) !== String(id));
                    renderMyNotesList();
                } catch (err) { showToast(err.message, 'error'); }
            } else if (action === 'pin') {
                try {
                    const cur = myNotesCache.find(n => String(n.id) === String(id));
                    await callApi('/api/notes/' + id, { method: 'PUT', body: { is_pinned: !cur.is_pinned } });
                    cur.is_pinned = !cur.is_pinned;
                    renderMyNotesList();
                    showToast(cur.is_pinned ? '已置顶' : '已取消置顶', 'success');
                } catch (err) { showToast(err.message, 'error'); }
            }
        });
    });
}
