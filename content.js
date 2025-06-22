class AutoLogin {
    constructor() {
        this.credentialManager = null;
        this.init();
    }

    async init() {
        if (this.isLoginPage()) {
            await this.loadCredentialManager();
            await this.checkAndAutoLogin();
        }
    }

    isLoginPage() {
        return window.location.hostname === 'idp.account.tsukuba.ac.jp' &&
               document.querySelector('#username') &&
               document.querySelector('#password') &&
               document.querySelector('button[name="_eventId_proceed"]');
    }

    async loadCredentialManager() {
        this.credentialManager = {
            async decrypt(encryptedArray, password) {
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
        };
    }

    async getStoredCredentials() {
        try {
            const result = await chrome.storage.local.get([
                'encryptedCredentials', 
                'encryptionKey', 
                'autoLogin'
            ]);

            if (!result.autoLogin) {
                return null;
            }

            if (!result.encryptedCredentials || !result.encryptionKey) {
                return null;
            }

            const username = await this.credentialManager.decrypt(
                result.encryptedCredentials.username,
                result.encryptionKey
            );
            const password = await this.credentialManager.decrypt(
                result.encryptedCredentials.password,
                result.encryptionKey
            );

            return { username, password };
        } catch (error) {
            console.error('認証情報の取得エラー:', error);
            return null;
        }
    }

    async fillLoginForm(username, password) {
        const usernameField = document.querySelector('#username');
        const passwordField = document.querySelector('#password');

        if (usernameField && passwordField) {
            usernameField.value = username;
            passwordField.value = password;

            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));

            return true;
        }
        return false;
    }

    async submitForm() {
        const form = document.querySelector('form');
        const submitButton = document.querySelector('button[name="_eventId_proceed"]');

        if (submitButton) {
            submitButton.click();
            return true;
        } else if (form) {
            form.submit();
            return true;
        }
        return false;
    }

    async checkAndAutoLogin() {
        if (this.hasFormErrors()) {
            return;
        }

        const credentials = await this.getStoredCredentials();
        if (!credentials) {
            return;
        }

        if (await this.fillLoginForm(credentials.username, credentials.password)) {
            setTimeout(async () => {
                if (await this.submitForm()) {
                    console.log('自動ログインを実行しました');
                }
            }, 500);
        }
    }

    hasFormErrors() {
        const errorElements = document.querySelectorAll('.form-error, .error, .alert-danger, [class*="error"]');
        return errorElements.length > 0;
    }

    addVisualIndicator() {
        if (document.querySelector('.auto-login-indicator')) {
            return;
        }

        const indicator = document.createElement('div');
        indicator.className = 'auto-login-indicator';
        indicator.innerHTML = '🔐 自動ログイン有効';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #2ecc71;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            font-family: sans-serif;
        `;
        document.body.appendChild(indicator);

        setTimeout(() => {
            indicator.remove();
        }, 3000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AutoLogin();
    });
} else {
    new AutoLogin();
}