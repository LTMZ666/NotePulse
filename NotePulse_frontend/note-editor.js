/* ============================================
   脉记 · 笔记编辑模态框
   —— 顶部导航"墨"按钮触发的快速记录浮层
   依赖：user-utils.js（callApi / showToast / 登录态判断）
   ============================================ */

const NE_TOKEN_KEY = 'maiji_token';

/* 分类预设（古风类目） */
const NE_CATEGORIES = [
    '随笔杂谈', '读书笔记', '技术札记',
    '诗词曲赋', '灵感乍现', '人物志异',
    '系统架构', '算法研究', '生活所感'
];

/* ---------- 入口：打开模态框 ---------- */
function openNoteEditor() {
    // 登录态校验
    const token = localStorage.getItem(NE_TOKEN_KEY);
    if (!token) {
        showToast('请先登录后再记一笔', 'info');
        return;
    }

    let modal = document.getElementById('noteEditorModal');
    if (modal) {
        // 已存在则清空表单并显示
        resetNoteForm();
        modal.classList.add('show');
        return;
    }

    modal = buildNoteModal();
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));
    bindNoteEvents(modal);
    // 自动聚焦标题
    setTimeout(() => {
        const title = modal.querySelector('#neTitle');
        if (title) title.focus();
    }, 200);
}

/* ---------- 关闭模态框 ---------- */
function closeNoteEditor() {
    const modal = document.getElementById('noteEditorModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        const title = modal.querySelector('#neTitle').value.trim();
        const content = modal.querySelector('#neContent').value.trim();
        // 内容非空时提示保留
        if (title || content) {
            // 直接清空，简化体验
        }
        modal.remove();
    }, 280);
}

/* ---------- 重置表单 ---------- */
function resetNoteForm() {
    const title = document.getElementById('neTitle');
    const content = document.getElementById('neContent');
    const category = document.getElementById('neCategory');
    if (title) title.value = '';
    if (content) content.value = '';
    if (category) category.value = NE_CATEGORIES[0];
}

/* ---------- 构造模态框 DOM ---------- */
function buildNoteModal() {
    const modal = document.createElement('div');
    modal.className = 'ne-modal';
    modal.id = 'noteEditorModal';
    modal.innerHTML = `
        <div class="ne-mask" data-close></div>
        <div class="ne-panel glass" role="dialog" aria-modal="true">
            <header class="ne-head">
                <div class="ne-title-row">
                    <span class="ne-seal">墨</span>
                    <h2 class="ne-title">落笔成卷</h2>
                </div>
                <button class="ne-close" data-close aria-label="关闭">×</button>
            </header>
            <div class="ne-body">
                <div class="ne-field">
                    <label class="ne-label" for="neTitle">题名 <span class="ne-required">*</span></label>
                    <input type="text" id="neTitle" class="ne-input" maxlength="200"
                           placeholder="一句话概括此卷主旨…"/>
                </div>
                <div class="ne-field">
                    <label class="ne-label" for="neCategory">归类</label>
                    <select id="neCategory" class="ne-input ne-select">
                        ${NE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                    <button type="button" id="nePinBtn" class="ne-pin" title="置顶此卷">
                        <span class="ne-pin-dot"></span>
                        <span class="ne-pin-text">置顶</span>
                    </button>
                </div>
                <div class="ne-field">
                    <label class="ne-label" for="neContent">正文</label>
                    <textarea id="neContent" class="ne-input ne-textarea" rows="10"
                              placeholder="书写所思所悟，所感所悟…&#10;每一段文字，都是脉搏的一次跳动。"></textarea>
                    <div class="ne-counter"><span id="neContentCount">0</span> 字</div>
                </div>
                <div class="ne-field">
                    <label class="ne-label">配图 <span class="ne-hint">可选，最多 6 张，单张 ≤ 1MB</span></label>
                    <div class="ne-images">
                        <label class="ne-image-add">
                            <span class="ne-add-icon">+</span>
                            <span class="ne-add-text">择图</span>
                            <input type="file" id="neImageInput" accept="image/*" multiple hidden/>
                        </label>
                        <div class="ne-image-list" id="neImageList"></div>
                    </div>
                </div>
            </div>
            <footer class="ne-foot">
                <button class="ne-btn ne-btn-ghost" data-close>弃笔</button>
                <button class="ne-btn ne-btn-primary" id="neSubmit">
                    <span class="ne-submit-text">颁行入卷</span>
                </button>
            </footer>
        </div>
    `;
    return modal;
}

/* ---------- 绑定事件 ---------- */
let nePinned = false;
let neImages = []; // base64 图片数组

function bindNoteEvents(modal) {
    nePinned = false;
    neImages = [];

    // 关闭按钮 / 遮罩点击关闭
    modal.querySelectorAll('[data-close]').forEach(el => {
        el.addEventListener('click', closeNoteEditor);
    });
    // Esc 关闭
    document.addEventListener('keydown', neEscHandler);

    // 字数计数
    const content = modal.querySelector('#neContent');
    const counter = modal.querySelector('#neContentCount');
    if (content && counter) {
        content.addEventListener('input', () => {
            counter.textContent = content.value.length;
        });
    }

    // 置顶按钮
    const pinBtn = modal.querySelector('#nePinBtn');
    if (pinBtn) {
        pinBtn.addEventListener('click', () => {
            nePinned = !nePinned;
            pinBtn.classList.toggle('active', nePinned);
            const text = pinBtn.querySelector('.ne-pin-text');
            if (text) text.textContent = nePinned ? '已置顶' : '置顶';
        });
    }

    // 图片上传
    const imageInput = modal.querySelector('#neImageInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelect);
    }

    // 提交
    const submit = modal.querySelector('#neSubmit');
    if (submit) {
        submit.addEventListener('click', submitNote);
    }

    // Ctrl/Cmd + Enter 快捷提交
    if (content) {
        content.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                submitNote();
            }
        });
    }
}

/* ---------- 图片选择处理 ---------- */
function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remain = 6 - neImages.length;
    if (remain <= 0) {
        showToast('配图已满 6 张，请先移除再添加', 'info');
        e.target.value = '';
        return;
    }
    const adding = files.slice(0, remain);
    if (files.length > remain) {
        showToast(`最多 6 张，仅取前 ${remain} 张`, 'info');
    }

    let done = 0;
    adding.forEach(file => {
        if (file.size > 1024 * 1024) {
            showToast(`「${file.name}」超 1MB，已跳过`, 'error');
            done++;
            if (done === adding.length) renderNeImages();
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            neImages.push({ src: reader.result, name: file.name });
            done++;
            if (done === adding.length) renderNeImages();
        };
        reader.onerror = () => {
            showToast(`「${file.name}」读取失败`, 'error');
            done++;
            if (done === adding.length) renderNeImages();
        };
        reader.readAsDataURL(file);
    });
    e.target.value = '';
}

/* ---------- 渲染已选图片 ---------- */
function renderNeImages() {
    const list = document.getElementById('neImageList');
    if (!list) return;
    list.innerHTML = '';
    neImages.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className = 'ne-image-item';
        item.innerHTML = `
            <img src="${img.src}" alt="${escapeHtml(img.name)}"/>
            <button type="button" class="ne-image-remove" data-idx="${idx}" aria-label="移除">×</button>
        `;
        list.appendChild(item);
    });
    // 绑定移除
    list.querySelectorAll('.ne-image-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            neImages.splice(idx, 1);
            renderNeImages();
        });
    });
}

function neEscHandler(e) {
    if (e.key === 'Escape') closeNoteEditor();
}

/* ---------- 提交笔记 ---------- */
async function submitNote() {
    const title = document.getElementById('neTitle').value.trim();
    const content = document.getElementById('neContent').value.trim();
    const category = document.getElementById('neCategory').value;

    if (!title) {
        showToast('请先为此卷题名', 'error');
        document.getElementById('neTitle').focus();
        return;
    }

    const submitBtn = document.getElementById('neSubmit');
    const submitText = submitBtn.querySelector('.ne-submit-text');
    const originalText = submitText.textContent;
    submitBtn.disabled = true;
    submitText.textContent = '颁行中…';

    try {
        const note = await callApi('/api/notes', {
            method: 'POST',
            body: {
                title,
                content,
                category,
                is_pinned: nePinned,
                images: neImages.length ? JSON.stringify(neImages.map(i => i.src)) : null
            }
        });
        showToast('已颁行入卷 · 笔脉 +1', 'success');
        closeNoteEditor();
        // 通知页面刷新（如果页面监听了此事件）
        document.dispatchEvent(new CustomEvent('note:created', { detail: note }));
    } catch (err) {
        showToast(err.message || '颁行失败，请稍后再试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = originalText;
    }
}
