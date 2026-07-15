
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const companyCitySelect = document.getElementById('companyCity');
    const companySelect = document.getElementById('companySelect');
    let allCompanies = [];

    // 載入公司與縣市資料
    if (companyCitySelect && companySelect) {
        fetch('/api/companies')
            .then(res => res.json())
            .then(companies => {
                allCompanies = companies;
                const cities = [...new Set(companies.map(c => c.city || '未指定'))];
                companyCitySelect.innerHTML = '<option value="">-- 請選擇縣市 --</option>';
                cities.forEach(city => {
                    const opt = document.createElement('option');
                    opt.value = city;
                    opt.textContent = city;
                    companyCitySelect.appendChild(opt);
                });
            })
            .catch(err => console.error('無法載入公司清單:', err));

        // 縣市連動公司選單
        companyCitySelect.addEventListener('change', () => {
            const selectedCity = companyCitySelect.value;
            companySelect.innerHTML = '<option value="">-- 請選擇公司 --</option>';
            if (!selectedCity) {
                companySelect.innerHTML = '<option value="">-- 請先選擇縣市 --</option>';
                return;
            }
            const filtered = allCompanies.filter(c => (c.city || '未指定') === selectedCity);
            if (filtered.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = '此縣市暫無公司';
                companySelect.appendChild(opt);
            } else {
                filtered.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    companySelect.appendChild(opt);
                });
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 防止頁面重新整理

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const company_id = companySelect ? companySelect.value : null;

            if (!name || !email || !password || (companySelect && !company_id)) {
                alert('請填寫完整資訊！');
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: name, email: email, company_id: company_id })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(`註冊成功！您的帳號目前為「待審核」狀態，請等待管理員開通。`);
                    window.location.href = 'admin.html';
                } else {
                    alert(`註冊失敗: ${data.detail}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('伺服器連線失敗，請稍後再試。');
            }
        });
    }

    // Google 登入模擬邏輯 (改成對後端發送註冊請求)
    const googleSignIn = document.getElementById('googleSignIn');
    if (googleSignIn) {
        googleSignIn.addEventListener('click', async () => {
            const mockEmail = 'user' + Math.floor(Math.random() * 1000) + '@gmail.com';
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: 'Google User', email: mockEmail })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(`Google 授權成功！您的帳號目前為「待審核」狀態，請等待管理員開通。\n(登入帳號: ${mockEmail})`);
                    window.location.href = 'admin.html';
                } else {
                    alert(`授權失敗: ${data.detail}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('伺服器連線失敗，請稍後再試。');
            }
        });
    }
});


