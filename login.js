
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    async function performLogin(email) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (response.ok) {
                alert('登入成功！');
                localStorage.setItem('user_id', data.id);
                localStorage.setItem('user_email', data.email);
                localStorage.setItem('user_name', data.name);
                localStorage.setItem('user_role', data.role);
                window.location.href = 'dashboard.html';
            } else {
                alert(`登入失敗: ${data.detail}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('伺服器連線失敗，請稍後再試。');
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            if (!email) {
                alert('請輸入電子郵件！');
                return;
            }
            await performLogin(email);
        });
    }

    // --- Google 登入設定 ───
    const googleSignInContainer = document.getElementById('googleSignInContainer');
    
    // 從後端獲取配置
    async function initGoogleLogin() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const config = await res.json();
                const clientId = config.google_client_id;
                
                if (clientId) {
                    console.log("Initializing real Google Sign-In with Client ID:", clientId);
                    // 清空原本的模擬按鈕
                    if (googleSignInContainer) {
                        googleSignInContainer.innerHTML = '';
                    }
                    
                    // 初始化 Google Identity Services SDK
                    google.accounts.id.initialize({
                        client_id: clientId,
                        callback: handleCredentialResponse
                    });
                    
                    // 渲染官方 Google 登入按鈕
                    google.accounts.id.renderButton(
                        googleSignInContainer,
                        { 
                            theme: 'filled_blue', 
                            size: 'large', 
                            width: 320, 
                            text: 'signin_with', 
                            shape: 'rectangular' 
                        }
                    );
                    
                    // 啟動 Google One Tap 浮動提示
                    google.accounts.id.prompt();
                } else {
                    setupMockGoogleLogin();
                }
            } else {
                setupMockGoogleLogin();
            }
        } catch (err) {
            console.warn("Failed to fetch config, using mock Google login:", err);
            setupMockGoogleLogin();
        }
    }
    
    // 真實 Google 登入憑證回傳處理
    async function handleCredentialResponse(response) {
        const credential = response.credential;
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credential })
            });
            const data = await res.json();
            if (res.ok) {
                alert('登入成功！');
                localStorage.setItem('user_id', data.id);
                localStorage.setItem('user_email', data.email);
                localStorage.setItem('user_name', data.name);
                localStorage.setItem('user_role', data.role);
                window.location.href = 'dashboard.html';
            } else {
                alert(`Google 驗證失敗: ${data.detail}`);
            }
        } catch (err) {
            console.error("Google authentication error:", err);
            alert('伺服器驗證失敗，請稍後再試。');
        }
    }

    // 模擬登入後備方案
    function setupMockGoogleLogin() {
        console.log("Mock Google Sign-In activated.");
        const googleSignIn = document.getElementById('googleSignIn');
        if (googleSignIn) {
            googleSignIn.addEventListener('click', async () => {
                const mockEmail = prompt("【模擬 Google 登入】請輸入您註冊的 Email 來登入：");
                if (mockEmail) {
                    await performLogin(mockEmail);
                }
            });
        }
    }
    
    // 初始化執行
    initGoogleLogin();
});


