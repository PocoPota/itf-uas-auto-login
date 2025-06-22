class CredentialManager {
    static async encrypt(text, password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password.padEnd(32, '0').slice(0, 32)),
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encrypted), iv.length);
        return Array.from(result);
    }

    static async decrypt(encryptedArray, password) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const encrypted = new Uint8Array(encryptedArray);
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password.padEnd(32, '0').slice(0, 32)),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        const iv = encrypted.slice(0, 12);
        const data = encrypted.slice(12);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        return decoder.decode(decrypted);
    }

    static generateKey() {
        return crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => 
            acc + byte.toString(16).padStart(2, '0'), '');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const autoLoginCheckbox = document.getElementById('autoLogin');
    const saveButton = document.getElementById('save');
    const clearButton = document.getElementById('clear');
    const statusDiv = document.getElementById('status');

    function showStatus(message, isSuccess = true) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isSuccess ? 'success' : 'error'}`;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['encryptedCredentials', 'encryptionKey', 'autoLogin']);
            
            if (result.encryptedCredentials && result.encryptionKey) {
                try {
                    const decryptedUsername = await CredentialManager.decrypt(
                        result.encryptedCredentials.username, 
                        result.encryptionKey
                    );
                    const decryptedPassword = await CredentialManager.decrypt(
                        result.encryptedCredentials.password, 
                        result.encryptionKey
                    );
                    
                    usernameInput.value = decryptedUsername;
                    passwordInput.value = decryptedPassword;
                } catch (error) {
                    console.error('復号化エラー:', error);
                    showStatus('保存されたデータの読み込みに失敗しました', false);
                }
            }
            
            autoLoginCheckbox.checked = result.autoLogin || false;
        } catch (error) {
            console.error('設定の読み込みエラー:', error);
            showStatus('設定の読み込みに失敗しました', false);
        }
    }

    async function saveSettings() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const autoLogin = autoLoginCheckbox.checked;

        if (!username || !password) {
            showStatus('ユーザーIDとパスワードを入力してください', false);
            return;
        }

        try {
            let encryptionKey = (await chrome.storage.local.get(['encryptionKey'])).encryptionKey;
            if (!encryptionKey) {
                encryptionKey = CredentialManager.generateKey();
            }

            const encryptedUsername = await CredentialManager.encrypt(username, encryptionKey);
            const encryptedPassword = await CredentialManager.encrypt(password, encryptionKey);

            await chrome.storage.local.set({
                encryptedCredentials: {
                    username: encryptedUsername,
                    password: encryptedPassword
                },
                encryptionKey: encryptionKey,
                autoLogin: autoLogin
            });

            showStatus('設定が保存されました');
        } catch (error) {
            console.error('設定の保存エラー:', error);
            showStatus('設定の保存に失敗しました', false);
        }
    }

    async function clearSettings() {
        if (confirm('保存された設定をすべて削除しますか？')) {
            try {
                await chrome.storage.local.clear();
                usernameInput.value = '';
                passwordInput.value = '';
                autoLoginCheckbox.checked = false;
                showStatus('設定がクリアされました');
            } catch (error) {
                console.error('設定のクリアエラー:', error);
                showStatus('設定のクリアに失敗しました', false);
            }
        }
    }

    saveButton.addEventListener('click', saveSettings);
    clearButton.addEventListener('click', clearSettings);

    await loadSettings();
});