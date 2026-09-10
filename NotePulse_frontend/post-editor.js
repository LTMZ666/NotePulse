/* ============================================
   脉记 · 发帖模态框
   —— 点击顶部"帖"按钮弹出，调用 POST /api/posts 创建帖子
   ============================================ */

(function () {
    let modalEl = null;
    let editingPost = null;
    let postImages = []; // base64 图片数组

    /* ---------- 图片处理 ---------- */
    function handleImageFiles(files) {
        const remaining = 9 - postImages.length;
        if (remaining <= 0) { showToast('最多 9 张图片', 'error'); return; }
        const toProcess = Array.from(files).slice(0, remaining);
        toProcess.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = e => {
                // 压缩到合理大小
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxW = 1200;
                    const scale = img.width > maxW ? maxW / img.width : 1;
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressed = canvas.toDataURL('image/jpeg', 0.75);
                    postImages.push(compressed);
                    renderPostImages();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderPostImages() {
        const area = modalEl.querySelector('#postImagesArea');
        const uploadBtn = modalEl.querySelector('#postImgUploadBtn');
        // 移除旧预览
        area.querySelectorAll('.pe-img-preview').forEach(el => el.remove());
        postImages.forEach((src, idx) => {
            const preview = document.createElement('div');
            preview.className = 'pe-img-preview';
            preview.innerHTML = `<img src="${src}"/><div class="pe-img-del" data-idx="${idx}">×</div>`;
            area.insertBefore(preview, uploadBtn);
            preview.querySelector('.pe-img-del').addEventListener('click', e => {
                e.stopPropagation();
                postImages.splice(idx, 1);
                renderPostImages();
            });
        });
        // 超过9张隐藏上传按钮
        uploadBtn.style.display = postImages.length >= 9 ? 'none' : 'flex';
    }

    /* ---------- 构建 DOM ---------- */
    function buildModal() {
        const modal = document.createElement('div');
        modal.className = 'pe-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="pe-mask" data-close></div>
            <div class="pe-panel">
                <div class="pe-head">
                    <div class="pe-title-row">
                        <span class="pe-seal">帖</span>
                        <h2 class="pe-title">落笔成帖</h2>
                    </div>
                    <button class="pe-close" data-close aria-label="关闭">×</button>
                </div>
                <div class="pe-body">
                    <div class="pe-row">
                        <div class="pe-field pe-field-title">
                            <label class="pe-label">题名 <span class="pe-required">*</span></label>
                            <input type="text" id="postTitleInput" class="pe-input" placeholder="帖子标题，2-200 字" maxlength="200"/>
                        </div>
                        <div class="pe-field pe-field-cat">
                            <label class="pe-label">归类</label>
                            <select id="postCategorySelect" class="pe-select">
                                <option value="数学研究">数学研究</option>
                                <option value="系统架构">系统架构</option>
                                <option value="前端技术">前端技术</option>
                                <option value="算法">算法</option>
                                <option value="产品设计">产品设计</option>
                                <option value="数学">数学</option>
                                <option value="随笔杂谈" selected>随笔杂谈</option>
                            </select>
                        </div>
                    </div>
                    <div class="pe-field">
                        <label class="pe-label">摘要 <span class="pe-label-hint">不填则自动截取正文前 100 字</span></label>
                        <textarea id="postExcerptInput" class="pe-textarea pe-excerpt" rows="2" placeholder="一句话摘要，便于同道浏览" maxlength="500"></textarea>
                    </div>
                    <div class="pe-field">
                        <label class="pe-label">正文 <span class="pe-required">*</span></label>
                        <textarea id="postContentInput" class="pe-textarea pe-content" rows="8" placeholder="书写正文内容，可多段叙述…" maxlength="10000"></textarea>
                        <div class="pe-counter" id="postContentCount">0 / 10000</div>
                    </div>
                    <div class="pe-field">
                        <label class="pe-label">附图 <span class="pe-label-hint">可选，最多 9 张</span></label>
                        <div class="pe-images-area" id="postImagesArea">
                            <div class="pe-img-upload-btn" id="postImgUploadBtn">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5-5 5-3-3-4 4"/></svg>
                                <span>添加图片</span>
                            </div>
                            <input type="file" id="postImgInput" accept="image/*" multiple style="display:none"/>
                        </div>
                    </div>
                </div>
                <div class="pe-foot">
                    <span class="pe-hint">Ctrl + Enter 快速颁行</span>
                    <button class="pe-submit" id="postSubmitBtn"><span>颁行入卷</span></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modalEl = modal;
        bindEvents();
    }

    /* ---------- 事件绑定 ---------- */
    function bindEvents() {
        modalEl.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', closeEditor);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !modalEl.hidden) closeEditor();
        });
        const contentInput = modalEl.querySelector('#postContentInput');
        const contentCount = modalEl.querySelector('#postContentCount');
        contentInput.addEventListener('input', () => {
            contentCount.textContent = contentInput.value.length + ' / 10000';
        });
        contentInput.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                submitPost();
            }
        });
        modalEl.querySelector('#postSubmitBtn').addEventListener('click', submitPost);
        // 图片上传
        const uploadBtn = modalEl.querySelector('#postImgUploadBtn');
        const imgInput = modalEl.querySelector('#postImgInput');
        if (uploadBtn && imgInput) {
            uploadBtn.addEventListener('click', () => imgInput.click());
            imgInput.addEventListener('change', () => {
                handleImageFiles(imgInput.files);
                imgInput.value = '';
            });
        }
    }

    /* ---------- 提交帖子（创建 or 编辑） ---------- */
    async function submitPost() {
        const title = modalEl.querySelector('#postTitleInput').value.trim();
        const category = modalEl.querySelector('#postCategorySelect').value;
        const excerpt = modalEl.querySelector('#postExcerptInput').value.trim();
        const content = modalEl.querySelector('#postContentInput').value.trim();

        if (!title) { showToast('请填写题名', 'error'); return; }
        if (title.length < 2) { showToast('题名至少 2 字', 'error'); return; }
        if (!content) { showToast('正文不可为空', 'error'); return; }

        const finalExcerpt = excerpt || content.slice(0, 100);
        const imagesPayload = postImages.length ? JSON.stringify(postImages) : null;

        const btn = modalEl.querySelector('#postSubmitBtn');
        const btnText = btn.querySelector('span');
        btn.disabled = true;
        btnText.textContent = editingPost ? '存改中…' : '颁行中…';

        try {
            if (editingPost) {
                await callApi('/api/posts/' + editingPost.id, {
                    method: 'PUT',
                    body: { title, category, excerpt: finalExcerpt, content, images: imagesPayload }
                });
                showToast('帖子已存改入卷', 'success');
                document.dispatchEvent(new CustomEvent('post:updated'));
            } else {
                await callApi('/api/posts', {
                    method: 'POST',
                    body: { title, category, excerpt: finalExcerpt, content, images: imagesPayload }
                });
                showToast('帖子已颁行入卷', 'success');
                document.dispatchEvent(new CustomEvent('post:created'));
            }
            setTimeout(closeEditor, 600);
        } catch (err) {
            showToast(err.message || '操作失败', 'error');
        } finally {
            btn.disabled = false;
            btnText.textContent = editingPost ? '存改入卷' : '颁行入卷';
        }
    }

    /* ---------- 打开/关闭 ---------- */
    function openEditor() {
        const token = localStorage.getItem('maiji_token');
        if (!token) {
            showToast('请先登录再发帖', 'error');
            const loginBtn = document.getElementById('guestLoginBtn');
            if (loginBtn) loginBtn.click();
            return;
        }
        if (!modalEl) buildModal();
        editingPost = null;
        modalEl.querySelector('.pe-title').textContent = '落笔成帖';
        modalEl.querySelector('#postSubmitBtn span').textContent = '颁行入卷';
        modalEl.querySelector('#postTitleInput').value = '';
        modalEl.querySelector('#postExcerptInput').value = '';
        modalEl.querySelector('#postContentInput').value = '';
        modalEl.querySelector('#postContentCount').textContent = '0 / 10000';
        modalEl.querySelector('#postCategorySelect').value = '随笔杂谈';
        postImages = [];
        renderPostImages();
        modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modalEl.classList.add('show');
            setTimeout(() => modalEl.querySelector('#postTitleInput').focus(), 200);
        });
    }

    function openPostEditorForEdit(post) {
        const token = localStorage.getItem('maiji_token');
        if (!token) {
            showToast('请先登录再编辑', 'error');
            return;
        }
        if (!modalEl) buildModal();
        editingPost = post;
        modalEl.querySelector('.pe-title').textContent = '修帖存卷';
        modalEl.querySelector('#postSubmitBtn span').textContent = '存改入卷';
        modalEl.querySelector('#postTitleInput').value = post.title || '';
        modalEl.querySelector('#postCategorySelect').value = post.category || '随笔杂谈';
        modalEl.querySelector('#postExcerptInput').value = post.excerpt || '';
        modalEl.querySelector('#postContentInput').value = post.content || '';
        modalEl.querySelector('#postContentCount').textContent = (post.content || '').length + ' / 10000';
        // 加载已有图片
        postImages = [];
        if (post.images) {
            try { postImages = JSON.parse(post.images) || []; } catch { postImages = []; }
        }
        renderPostImages();
        modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            modalEl.classList.add('show');
            setTimeout(() => modalEl.querySelector('#postTitleInput').focus(), 200);
        });
    }

    function closeEditor() {
        if (!modalEl) return;
        modalEl.classList.remove('show');
        document.body.style.overflow = '';
        setTimeout(() => { modalEl.style.display = 'none'; }, 280);
    }

    /* ---------- 绑定顶部"帖"按钮 ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('postBtn');
        if (btn) btn.addEventListener('click', openEditor);
    });

    window.openPostEditor = openEditor;
    window.closePostEditor = closeEditor;
    window.openPostEditorForEdit = openPostEditorForEdit;
})();
