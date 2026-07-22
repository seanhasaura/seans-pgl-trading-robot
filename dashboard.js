
document.addEventListener('DOMContentLoaded', () => {
    const userEmail = localStorage.getItem('user_email');
    const userName = localStorage.getItem('user_name');

    if (!userEmail) {
        alert('請先登入！');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('welcomeName').textContent = userName || 'User';

    // 產生邀請碼
    const inviteCode = 'PGL-' + (userName || 'USER').replace(/\s/g,'').toUpperCase().slice(0, 6);
    const inviteLinkEl = document.getElementById('inviteLink');
    if (inviteLinkEl) inviteLinkEl.value = `https://pgl.bot/ref/${inviteCode}`;

    // --- 確保擁有 User ID & Role ---
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');

    if (!userId || !userRole) {
        fetch(`/api/user_info?email=${encodeURIComponent(userEmail)}`)
            .then(res => res.json())
            .then(data => {
                if (data.id) {
                    localStorage.setItem('user_id', data.id);
                    localStorage.setItem('user_role', data.role);
                    localStorage.setItem('user_vip_level', data.vip_level || 0);
                    if (typeof window.initBots === 'function') {
                        window.initBots();
                    }
                }
            })
            .catch(err => console.error("Error fetching user info:", err));
    } else {
        if (typeof window.initBots === 'function') {
            setTimeout(window.initBots, 50);
        }
    }

    // --- 側邊欄 Tab 切換 (事件監聽器，最穩固的做法) ---
    const sidebarNav = document.getElementById('sidebarNav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            e.preventDefault();
            const link = e.target.closest('a[data-tab]');
            if (!link) return;

            const tabName = link.dataset.tab;
            sidebarNav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');

            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById('tab-' + tabName);
            if (panel) panel.classList.add('active');

            const titleEl = document.getElementById('pageTitle');
            if (titleEl) {
                titleEl.dataset.i18n = "nav_" + tabName;
                titleEl.textContent = window.t("nav_" + tabName) || '';
            }

            // 手機版點擊選單後自動收回側邊欄
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }
 
            // 切換到總覽 tab 時重整機器人
            if (tabName === 'overview' && typeof window.loadBots === 'function') {
                window.loadBots();
            }
            // 切換到歸因分析 tab 時初始化圖表（只做一次）
            if (tabName === 'attribution' && typeof window.initAttributionTab === 'function') {
                setTimeout(window.initAttributionTab, 50);
            }
            // 切換到統一持倉 tab 時初始化
            if (tabName === 'portfolio' && typeof window.initPortfolioTab === 'function') {
                setTimeout(window.initPortfolioTab, 50);
            }
            // 切換到風險儀錶板 tab 時初始化
            if (tabName === 'risk' && typeof window.initRiskTab === 'function') {
                setTimeout(window.initRiskTab, 50);
            }
            // 切換到數位資產管理 tab 時初始化
            if (tabName === 'digital' && typeof window.initDigitalTab === 'function') {
                setTimeout(window.initDigitalTab, 50);
            }
        });
    }

    // --- 手機版側邊欄開關 (Sidebar Toggle) ---
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // 點擊側邊欄以外的區域時自動關閉側邊欄
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
                sidebar.classList.remove('active');
            }
        });
    }

    // --- 登出按鈕 ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_vip_level');
            window.location.href = 'index.html';
        });
    }

    // --- 風控參數表單 ---
    const riskForm = document.getElementById('riskForm');
    if (riskForm) {
        riskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const maxPos = document.getElementById('maxPosition').value;
            const sl = document.getElementById('stopLoss').value;
            const tp = document.getElementById('takeProfit').value;
            alert(window.t('alert_risk_settings_saved', '✅ 全局風控設定已儲存！\n單筆倉位：{maxPos}%  |  停損：{sl}%  |  停利：{tp}%\n(新建立的機器人將以此作為預設值)').replace('{maxPos}', maxPos).replace('{sl}', sl).replace('{tp}', tp));
        });
    }
});

// --- 複製邀請連結 ---
window.copyInviteLink = function() {
    const el = document.getElementById('inviteLink');
    if (el) {
        navigator.clipboard.writeText(el.value).then(() => {
            alert(window.t('alert_invite_copied', '✅ 邀請連結已複製到剪貼簿！'));
        }).catch(() => {
            el.select();
            document.execCommand('copy');
            alert(window.t('alert_copied', '✅ 已複製！'));
        });
    }
};

// --- MDD 計算引擎 ---
const mddState = {
    equityCurve: [0],   // 淨值歷史（以起始 0 為基準）
    peak: 0,            // 歷史最高點
    maxDrawdown: 0,     // 最大回撤（負值，%）
};

function calcMDD(equityCurve) {
    let peak = -Infinity;
    let maxDD = 0;
    for (const val of equityCurve) {
        if (val > peak) peak = val;
        const dd = peak > 0 ? (val - peak) / peak * 100 : 0;
        if (dd < maxDD) maxDD = dd;
    }
    return { peak, maxDD };
}

function updateMddDisplay() {
    const mddEl = document.getElementById('mddValue');
    const mddBarEl = document.getElementById('mddBar');
    if (!mddEl) return;

    const { maxDD } = calcMDD(mddState.equityCurve);
    mddState.maxDrawdown = maxDD;

    mddEl.textContent = maxDD.toFixed(2) + '%';
    // 顏色：回撤越深越紅
    if (maxDD > -5) {
        mddEl.style.color = '#f87171';   // 輕微
    } else if (maxDD > -15) {
        mddEl.style.color = '#ef4444';   // 中等
    } else {
        mddEl.style.color = '#b91c1c';   // 嚴重
    }
    // 標籤文字
    const labelEl = document.getElementById('mddLabel');
    if (labelEl) {
        if (maxDD > -5)       { labelEl.textContent = '✅ ' + window.t('status_safe', '安全'); labelEl.style.color = '#34d399'; }
        else if (maxDD > -10) { labelEl.textContent = '⚠️ ' + window.t('status_caution', '注意'); labelEl.style.color = '#fbbf24'; }
        else if (maxDD > -20) { labelEl.textContent = '🔶 ' + window.t('status_warning', '警告'); labelEl.style.color = '#f87171'; }
        else                  { labelEl.textContent = '🚨 ' + window.t('status_danger', '危險'); labelEl.style.color = '#b91c1c'; }
    }
    // 進度條寬度 (最大顯示 -50% 為 100%)
    if (mddBarEl) {
        const pct = Math.min(Math.abs(maxDD) / 50 * 100, 100);
        mddBarEl.style.width = pct + '%';
    }

    // --- 同步更新「總覽頁」機器人狀態卡的 MDD ---
    const ovVal   = document.getElementById('mddValueOverview');
    const ovBar   = document.getElementById('mddBarOverview');
    const ovLabel = document.getElementById('mddLabelOverview');
    if (ovVal)   { ovVal.textContent = maxDD.toFixed(2) + '%'; ovVal.style.color = mddEl.style.color; }
    if (ovBar)   { const pct = Math.min(Math.abs(maxDD) / 50 * 100, 100); ovBar.style.width = pct + '%'; }
    if (ovLabel) { ovLabel.textContent = labelEl ? labelEl.textContent : ''; ovLabel.style.color = labelEl ? labelEl.style.color : ''; }
}

// --- 模擬 PnL 數字跳動 ---
function simulatePnl() {
    const pnlEl = document.getElementById('pnlValue');
    if (!pnlEl) return;

    // 每次重啟機器人，重置權益曲線
    mddState.equityCurve = [0];
    mddState.peak = 0;
    mddState.maxDrawdown = 0;
    updateMddDisplay();

    let cumPnl = 0;
    const interval = setInterval(() => {
        // 模擬單次交易盈虧 (-5 ~ +12 隨機)
        const trade = Math.random() * 17 - 5;
        cumPnl += trade;
        if (cumPnl < 0) cumPnl = 0;

        // 更新權益曲線
        mddState.equityCurve.push(cumPnl);

        // 更新今日損益顯示
        pnlEl.textContent = '$' + cumPnl.toFixed(2);
        pnlEl.style.color = cumPnl >= 0 ? '#10b981' : '#ef4444';

        // 即時更新 MDD
        updateMddDisplay();

        const btn = document.getElementById('toggleBotBtn');
        if (btn && btn.innerHTML.includes('▶️')) {
            clearInterval(interval);
            pnlEl.textContent = '$0.00';
            pnlEl.style.color = '#10b981';
        }
    }, 2000);
}

// --- Gist 實時數據載入與帳戶淨值繪製 ---
let equityChartInstance = null;

async function loadGistOverviewData() {
    if (!window.GistService) return;
    
    try {
        const equityData = await window.GistService.getAccountEquity();
        const tradeHistory = await window.GistService.getTradeHistory();

        if (equityData && equityData.length > 0) {
            const latestEquity = equityData[equityData.length - 1].equity;
            const initialEquity = equityData[0].equity;
            const totalPnL = latestEquity - initialEquity;

            // 1. 更新總收益 (All PnL)
            const pnlEl = document.getElementById('totalBotPnlVal');
            if (pnlEl) {
                pnlEl.textContent = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                pnlEl.style.color = totalPnL >= 0 ? '#10b981' : '#f87171';
            }

            // 2. 更新總交易筆數
            const tradesEl = document.getElementById('totalBotTradesVal');
            if (tradesEl && tradeHistory) {
                tradesEl.textContent = tradeHistory.length;
            }

            // 3. 計算並更新整體回撤 (MDD)
            let peak = equityData[0].equity;
            let maxDD = 0;
            equityData.forEach(item => {
                if (item.equity > peak) peak = item.equity;
                const dd = (peak - item.equity) / peak;
                if (dd > maxDD) maxDD = dd;
            });

            const mddEl = document.getElementById('overallBotMddVal');
            if (mddEl) {
                mddEl.textContent = `-${(maxDD * 100).toFixed(2)}%`;
            }

            // 4. 更新最後時間標籤
            const updateLabel = document.getElementById('equityLastUpdate');
            if (updateLabel) {
                const lastTime = new Date(equityData[equityData.length - 1].timestamp).toLocaleTimeString();
                updateLabel.textContent = `即時連線 (最後同步: ${lastTime})`;
            }

            // 5. 繪製淨值走勢圖
            renderEquityChart(equityData);
        }
    } catch (err) {
        console.error("載入 Gist 總覽數據失敗:", err);
    }
}

function renderEquityChart(equityData) {
    const canvas = document.getElementById('equityChartCanvas');
    if (!canvas) return;

    // 若數據點過多 (> 300 筆)，自動進行均勻抽樣以提升繪圖順暢度
    let displayData = equityData;
    if (equityData.length > 300) {
        const step = Math.ceil(equityData.length / 300);
        displayData = equityData.filter((_, idx) => idx % step === 0 || idx === equityData.length - 1);
    }

    const labels = displayData.map(d => {
        const date = new Date(d.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    });
    const values = displayData.map(d => d.equity);

    if (equityChartInstance) {
        equityChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    equityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '帳戶總淨值 ($USD)',
                data: values,
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                borderWidth: 2,
                pointRadius: values.length > 50 ? 0 : 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` 淨值: $${context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af', maxTicksLimit: 8 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 頁面加載或切換時自動讀取 Gist
document.addEventListener('DOMContentLoaded', () => {
    loadGistOverviewData();
    setInterval(loadGistOverviewData, 30000);
});



