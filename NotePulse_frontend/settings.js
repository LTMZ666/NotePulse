/* 设置 · settings.js */
document.addEventListener('DOMContentLoaded', async () => {
    if (!guardAuth()) return;
    injectSimpleNav('settings');
    restoreLoginState();

    // —— 预填资料 ——
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('maiji_user') || '{}');
        const elU = document.getElementById('settingsUsername');
        const elA = document.getElementById('settingsAvatar');
        const elB = document.getElementById('settingsBio');
        const elPreview = document.getElementById('avatarPreview');
        if (elU) elU.value = currentUser.username || '';
        if (elA) elA.value = currentUser.avatar || '';
        if (elB) elB.value = currentUser.bio || '';
        // 头像预览：有自定义则显示图片，否则蛊虫 SVG
        if (elPreview) {
            if (currentUser.avatar) {
                elPreview.innerHTML = `<img src="${escapeHtml(currentUser.avatar)}" alt="头像"/>`;
            } else {
                applyGuAvatar(elPreview);
            }
        }
    } catch (_) { /* ignore */ }

    // —— 头像文件选择 → base64 ——
    const avatarFile = document.getElementById('avatarFile');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarInput = document.getElementById('settingsAvatar');
    if (avatarFile) {
        avatarFile.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 512 * 1024) {
                showToast('图片过大，请选小于 512KB 的图', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                if (avatarInput) avatarInput.value = dataUrl;
                if (avatarPreview) avatarPreview.innerHTML = `<img src="${dataUrl}" alt="头像预览"/>`;
                showToast('头像已读入，点"颁行修改"生效', 'info');
            };
            reader.onerror = () => showToast('图片读取失败', 'error');
            reader.readAsDataURL(file);
        });
    }

    // —— 恢复蛊虫纷飞按钮 ——
    const avatarClear = document.getElementById('avatarClear');
    if (avatarClear) {
        avatarClear.addEventListener('click', () => {
            if (avatarInput) avatarInput.value = '';
            if (avatarPreview) applyGuAvatar(avatarPreview);
            showToast('已恢复蛊虫纷飞默认头像，点"颁行修改"生效', 'info');
        });
    }

    // —— 界面偏好预填 ——
    try {
        const prefs = JSON.parse(localStorage.getItem('maiji_prefs') || '{}');
        const elDark = document.getElementById('prefDarkMode');
        const elBrush = document.getElementById('prefBrushFont');
        if (elDark) elDark.checked = !!prefs.darkMode;
        if (elBrush) elBrush.checked = !!prefs.brushFont;
    } catch (_) { /* ignore */ }

    // —— 资料表单提交 ——
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('settingsUsername').value.trim();
            const avatar = document.getElementById('settingsAvatar').value.trim();
            const bio = document.getElementById('settingsBio').value.trim();
            if (!username) { showToast('用户名不可为空', 'error'); return; }
            try {
                const updated = await callApi('/api/users/me', { method: 'PUT', body: { username, avatar, bio } });
                localStorage.setItem('maiji_user', JSON.stringify(updated));
                renderUserState(updated);
                // 派发全局事件，让其他打开的页面/标签同步头像
                document.dispatchEvent(new CustomEvent('user:updated', { detail: updated }));
                showToast('主笔名册已颁行', 'success');
            } catch (err) { showToast(err.message, 'error'); }
        });
    }

    // —— 改密码表单提交 ——
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async e => {
            e.preventDefault();
            const newPwd = document.getElementById('newPassword').value;
            const confirmPwd = document.getElementById('confirmPassword').value;
            if (newPwd.length < 6) { showToast('新密钥至少 6 位', 'error'); return; }
            if (newPwd !== confirmPwd) { showToast('两次新密钥不一致', 'error'); return; }
            try {
                const res = await callApi('/api/users/me/password', { method: 'PUT', body: { new_password: newPwd } });
                showToast((res && res.message) || '密钥已更换', 'success');
                passwordForm.reset();
                setTimeout(() => {
                    logoutUser();
                    setTimeout(() => location.href = 'index.html', 600);
                }, 1200);
            } catch (err) { showToast(err.message, 'error'); }
        });
    }

    // —— 界面偏好切换 ——
    const elDark = document.getElementById('prefDarkMode');
    const elBrush = document.getElementById('prefBrushFont');
    const savePrefs = () => {
        const prefs = {
            darkMode: !!(elDark && elDark.checked),
            brushFont: !!(elBrush && elBrush.checked),
        };
        localStorage.setItem('maiji_prefs', JSON.stringify(prefs));
        document.body.classList.toggle('dark-mode', prefs.darkMode);
        document.body.classList.toggle('brush-font-mode', prefs.brushFont);
    };
    if (elDark) elDark.addEventListener('change', savePrefs);
    if (elBrush) elBrush.addEventListener('change', savePrefs);
});
