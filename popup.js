document.addEventListener('DOMContentLoaded', async () => {
    const autoLoginStatus = document.getElementById('autoLoginStatus');
    const openOptionsButton = document.getElementById('openOptions');
    const toggleAutoLoginButton = document.getElementById('toggleAutoLogin');

    async function updateStatus() {
        try {
            const result = await chrome.storage.local.get(['autoLogin', 'encryptedCredentials']);
            const isEnabled = result.autoLogin && result.encryptedCredentials;
            
            if (isEnabled) {
                autoLoginStatus.textContent = '✅ 自動ログインが有効です';
                autoLoginStatus.className = 'status enabled';
                toggleAutoLoginButton.textContent = '自動ログインを無効にする';
            } else {
                autoLoginStatus.textContent = '❌ 自動ログインが無効です';
                autoLoginStatus.className = 'status disabled';
                toggleAutoLoginButton.textContent = '自動ログインを有効にする';
            }
        } catch (error) {
            autoLoginStatus.textContent = 'エラー: 設定を読み込めません';
            autoLoginStatus.className = 'status disabled';
        }
    }

    openOptionsButton.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    toggleAutoLoginButton.addEventListener('click', async () => {
        try {
            const result = await chrome.storage.local.get(['autoLogin']);
            const newAutoLoginState = !result.autoLogin;
            
            await chrome.storage.local.set({ autoLogin: newAutoLoginState });
            await updateStatus();
        } catch (error) {
            console.error('自動ログイン設定の切り替えエラー:', error);
        }
    });

    await updateStatus();
});