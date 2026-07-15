
// 機器人管理模組 (Multi-Bot / Multi-Exchange)
(function() {
    let botsList = [];
    let pollingIntervalId = null;

    const limitMap = {
        'member': 1,
        'vip': 3,
        'admin': 999
    };

    // 初始化進入點
    window.initBots = function() {
        console.log("Initializing Multi-Bot module...");
        setupEventListeners();
        window.loadBots();
    };

    // 取得並渲染機器人列表
    window.loadBots = async function() {
        const userId = localStorage.getItem('user_id');
        const role = localStorage.getItem('user_role') || 'member';
        
        if (!userId) return;

        try {
            const res = await fetch(`/api/bots?user_id=${encodeURIComponent(userId)}`);
            if (res.ok) {
                botsList = await res.json();
                renderBots();
                updateOverallStats();
                manageSimulators();
            } else {
                console.error("Failed to load bots.");
            }
        } catch (err) {
            console.error("Connection error loading bots:", err);
        }
    };

    // 建立 UI 事件監聽
    function setupEventListeners() {
        // Modal 顯示與隱藏
        const openCreateBtn = document.getElementById('openCreateBotModalBtn');
        const emptyStateBtn = document.getElementById('emptyStateCreateBtn');
        const createModal = document.getElementById('createBotModal');
        const editModal = document.getElementById('editBotModal');

        const closeCreateX = document.getElementById('closeCreateModalBtn');
        const closeEditX = document.getElementById('closeEditModalBtn');
        const cancelCreate = document.getElementById('cancelCreateBtn');
        const cancelEdit = document.getElementById('cancelEditBtn');

        const openCreate = () => {
            // 自動帶入預設風控參數
            const maxPos = document.getElementById('maxPosition')?.value || 5;
            const sl = document.getElementById('stopLoss')?.value || 2;
            const tp = document.getElementById('takeProfit')?.value || 5;

            document.getElementById('newBotMaxPos').value = maxPos;
            document.getElementById('newBotStopLoss').value = sl;
            document.getElementById('newBotTakeProfit').value = tp;

            createModal.style.display = 'flex';
        };

        if (openCreateBtn) openCreateBtn.addEventListener('click', openCreate);
        if (emptyStateBtn) emptyStateBtn.addEventListener('click', openCreate);

        const closeCreate = () => {
            createModal.style.display = 'none';
            document.getElementById('createBotForm').reset();
        };
        const closeEdit = () => {
            editModal.style.display = 'none';
            document.getElementById('editBotForm').reset();
        };

        if (closeCreateX) closeCreateX.addEventListener('click', closeCreate);
        if (cancelCreate) cancelCreate.addEventListener('click', closeCreate);
        if (closeEditX) closeEditX.addEventListener('click', closeEdit);
        if (cancelEdit) cancelEdit.addEventListener('click', closeEdit);

        // 新增機器人 Form
        const createForm = document.getElementById('createBotForm');
        if (createForm) {
            createForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userId = localStorage.getItem('user_id');
                const name = document.getElementById('newBotName').value;
                const symbol = document.getElementById('newBotSymbol').value;
                const exchange = document.getElementById('newBotExchange').value;
                const apiKey = document.getElementById('newBotApiKey').value;
                const secretKey = document.getElementById('newBotSecretKey').value;
                const strategy = document.getElementById('newBotStrategy').value;
                const maxPos = parseFloat(document.getElementById('newBotMaxPos').value);
                const stopLoss = parseFloat(document.getElementById('newBotStopLoss').value);
                const takeProfit = parseFloat(document.getElementById('newBotTakeProfit').value);

                try {
                    const res = await fetch('/api/bots', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: userId,
                            name, exchange, api_key: apiKey, secret_key: secretKey,
                            strategy, max_pos: maxPos, stop_loss: stopLoss, take_profit: takeProfit,
                            symbol
                        })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message);
                        closeCreate();
                        window.loadBots();
                    } else {
                        alert(`${window.t('alert_create_fail', '建立失敗')}: ${data.detail}`);
                    }
                } catch (err) {
                    alert(window.t('alert_conn_fail', '連線失敗，請稍後再試。'));
                }
            });
        }

        // 編輯機器人 Form
        const editForm = document.getElementById('editBotForm');
        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const botId = document.getElementById('editBotId').value;
                const name = document.getElementById('editBotName').value;
                const symbol = document.getElementById('editBotSymbol').value;
                const strategy = document.getElementById('editBotStrategy').value;
                const maxPos = parseFloat(document.getElementById('editBotMaxPos').value);
                const stopLoss = parseFloat(document.getElementById('editBotStopLoss').value);
                const takeProfit = parseFloat(document.getElementById('editBotTakeProfit').value);

                try {
                    const res = await fetch(`/api/bots/${botId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name, strategy, max_pos: maxPos, stop_loss: stopLoss, take_profit: takeProfit,
                            symbol
                        })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message);
                        closeEdit();
                        window.loadBots();
                    } else {
                        alert(`${window.t('alert_update_fail', '更新失敗')}: ${data.detail}`);
                    }
                } catch (err) {
                    alert(window.t('alert_conn_fail', '連線失敗，請稍後再試。'));
                }
            });
        }
    }

    // 渲染卡片
    function renderBots() {
        const container = document.getElementById('botsContainer');
        if (!container) return;

        if (botsList.length === 0) {
            container.innerHTML = `
                <div class="admin-card" style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                    <div style="font-size: 3.5rem; margin-bottom: 1.5rem;">🤖</div>
                    <h3 style="margin-bottom: 0.5rem;" data-i18n="empty_title">${window.t('empty_title', '尚未建立任何交易機器人')}</h3>
                    <p class="text-muted" style="max-width: 450px; margin: 0 auto 1.5rem auto;" data-i18n="empty_desc">${window.t('empty_desc', '點擊右上方「新增交易機器人」按鈕，綁定您的交易所 API Key，即可啟動多策略、多商品自動量化交易！')}</p>
                    <button id="emptyStateCreateBtn2" class="btn btn-primary" style="padding: 0.7rem 1.5rem;" data-i18n="empty_btn">${window.t('empty_btn', '🚀 立即新增第一個機器人')}</button>
                </div>
            `;
            const emptyBtn = document.getElementById('emptyStateCreateBtn2');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', () => {
                    document.getElementById('createBotModal').style.display = 'flex';
                });
            }
            return;
        }

        container.innerHTML = botsList.map(bot => {
            const isRunning = bot.status === 'running';
            const statusClass = isRunning ? 'status-online' : 'status-offline';
            const statusText = isRunning ? window.t('bot_status_running', '🟢 運行中') : window.t('bot_status_stopped', '⚫ 已停止');
            
            const pnlColor = bot.cum_pnl > 0 ? '#10b981' : (bot.cum_pnl < 0 ? '#ef4444' : 'var(--text-muted)');
            const pnlSign = bot.cum_pnl > 0 ? '+' : '';
            const strategyName = window.t('strategy_' + bot.strategy, bot.strategy);

            return `
                <div class="admin-card bot-card" data-id="${bot.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h4 style="margin:0; font-size:1.1rem; font-weight:700;">
                            ${escapeHtml(bot.name)}
                            <span style="font-size:0.8rem; color:#678B91; margin-left:0.5rem; font-weight:500;">(${bot.symbol || 'EUR/USD'})</span>
                        </h4>
                        <span class="status-indicator ${statusClass}" style="font-size:0.8rem; font-weight:600; padding:0.2rem 0.5rem; border-radius:4px; background:rgba(255,255,255,0.05);">
                            ${statusText}
                        </span>
                    </div>

                    <!-- 機器人基本屬性 -->
                    <div class="bot-meta-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; font-size:0.82rem; color:var(--text-muted); margin-bottom:1.2rem; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:1rem;">
                        <div>${window.t('bot_card_exchange', '🔌 交易所')}: <strong style="color:white;">${window.t('exchange_' + bot.exchange.toLowerCase(), bot.exchange)}</strong></div>
                        <div>${window.t('bot_card_strategy', '🔬 交易策略')}: <strong style="color:white;">${strategyName}</strong></div>
                        <div>${window.t('bot_card_max_pos', '💰 最大倉位')}: <strong style="color:white;">${bot.max_pos}%</strong></div>
                        <div>${window.t('bot_card_sl_tp', '🛡️ 停損/停利')}: <strong style="color:white;">${bot.stop_loss}% / ${bot.take_profit}%</strong></div>
                    </div>

                    <!-- 損益與交易次數 -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                        <div>
                            <span class="text-muted" style="font-size:0.75rem; display:block;">${window.t('bot_card_cum_pnl', '累積收益')}</span>
                            <span style="font-size:1.4rem; font-weight:800; color:${pnlColor}; letter-spacing:-0.5px;">
                                ${pnlSign}$${bot.cum_pnl.toFixed(2)}
                            </span>
                        </div>
                        <div style="text-align:right;">
                            <span class="text-muted" style="font-size:0.75rem; display:block;">${window.t('bot_card_trades', '已執行交易')}</span>
                            <span style="font-size:1.1rem; font-weight:700; color:white;">
                                ${window.t('trade_count_template', '{count} 筆').replace('{count}', bot.trades)}
                            </span>
                        </div>
                    </div>

                    <!-- 操作按鈕 -->
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="toggleBotState('${bot.id}', '${bot.status}')" class="btn ${isRunning ? 'btn-danger' : 'btn-primary'}" style="flex:1; padding:0.5rem; font-size:0.85rem;">
                            ${isRunning ? window.t('bot_btn_stop', '⏹️ 停止') : window.t('bot_btn_start', '▶️ 啟動')}
                        </button>
                        <button onclick="openEditBotModal('${bot.id}')" class="btn btn-secondary" style="padding:0.5rem; font-size:0.85rem;" ${isRunning ? 'disabled style="opacity:0.5;"' : ''}>
                            ${window.t('bot_btn_settings', '⚙️ 設定')}
                        </button>
                        <button onclick="deleteBot('${bot.id}')" class="btn btn-danger" style="padding:0.5rem; font-size:0.85rem; background:#b91c1c; border-color:#b91c1c;" ${isRunning ? 'disabled style="opacity:0.5;"' : ''}>
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 觸發靜態翻譯套用
        if (typeof window.applyI18n === 'function') {
            window.applyI18n();
        }
    }

    // 更新頂部整體數據
    function updateOverallStats() {
        const totalActiveBots = botsList.filter(b => b.status === 'running').length;
        const totalBotPnl = botsList.reduce((sum, b) => sum + b.cum_pnl, 0);
        const totalBotTrades = botsList.reduce((sum, b) => sum + b.trades, 0);

        const activeEl = document.getElementById('totalActiveBotsVal');
        const pnlEl = document.getElementById('totalBotPnlVal');
        const tradesEl = document.getElementById('totalBotTradesVal');
        const mddEl = document.getElementById('overallBotMddVal');
        const badgeEl = document.getElementById('botLimitBadge');

        const role = localStorage.getItem('user_role') || 'member';
        const limit = limitMap[role] || 1;

        if (activeEl) activeEl.textContent = totalActiveBots;
        if (pnlEl) {
            pnlEl.textContent = (totalBotPnl >= 0 ? '+' : '') + '$' + totalBotPnl.toFixed(2);
            pnlEl.style.color = totalBotPnl > 0 ? '#10b981' : (totalBotPnl < 0 ? '#ef4444' : 'white');
        }
        if (tradesEl) {
            tradesEl.textContent = window.t('trade_count_template', '{count} 筆').replace('{count}', totalBotTrades);
        }
        
        // 模擬一個整體的最大回撤
        if (mddEl) {
            const simulatedMdd = totalBotPnl < 0 ? Math.min(Math.abs(totalBotPnl) / 100, 15.8) : (totalActiveBots > 0 ? Math.random() * 2.5 : 0);
            mddEl.textContent = simulatedMdd.toFixed(2) + '%';
        }

        if (badgeEl) {
            const limitStr = limit === 999 ? window.t('badge_unlimited', '無限制') : limit;
            badgeEl.textContent = `${window.t('badge_created', '已建立')}：${botsList.length} / ${limitStr}`;
        }
    }

    // 啟動/停止機器人
    window.toggleBotState = async function(botId, currentStatus) {
        const action = currentStatus === 'running' ? 'stop' : 'start';
        try {
            const res = await fetch(`/api/bots/${botId}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                window.loadBots();
            } else {
                const failPrefix = action === 'start' ? window.t('alert_start_fail', '啟動失敗') : window.t('alert_stop_fail', '停止失敗');
                alert(`${failPrefix}: ${data.detail}`);
            }
        } catch (err) {
            alert(window.t('alert_conn_fail', '連線失敗，請稍後再試。'));
        }
    };

    // 開啟編輯 Modal
    window.openEditBotModal = function(botId) {
        const bot = botsList.find(b => b.id === botId);
        if (!bot) return;

        document.getElementById('editBotId').value = bot.id;
        document.getElementById('editBotName').value = bot.name;
        document.getElementById('editBotSymbol').value = bot.symbol || 'EUR/USD';
        document.getElementById('editBotStrategy').value = bot.strategy;
        document.getElementById('editBotMaxPos').value = bot.max_pos;
        document.getElementById('editBotStopLoss').value = bot.stop_loss;
        document.getElementById('editBotTakeProfit').value = bot.take_profit;

        document.getElementById('editBotModal').style.display = 'flex';
        if (typeof window.applyI18n === 'function') {
            window.applyI18n();
        }
    };

    // 刪除機器人
    window.deleteBot = async function(botId) {
        const confirmMsg = window.t('alert_delete_confirm', '您確定要刪除這個交易機器人嗎？將會永久刪除所有歷史損益。');
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/bots/${botId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                alert(window.t('alert_delete_success', data.message));
                window.loadBots();
            } else {
                const failMsg = window.t('alert_delete_fail', '刪除失敗');
                alert(`${failMsg}: ${data.detail}`);
            }
        } catch (err) {
            alert(window.t('alert_conn_fail', '連線失敗，請稍後再試。'));
        }
    };

    // 管理損益輪詢器
    function manageSimulators() {
        const hasRunningBot = botsList.some(b => b.status === 'running');
        
        if (hasRunningBot) {
            if (!pollingIntervalId) {
                // 每 5 秒輪詢一次後端以同步損益
                pollingIntervalId = setInterval(async () => {
                    const userId = localStorage.getItem('user_id');
                    if (!userId) return;
                    try {
                        const res = await fetch(`/api/bots?user_id=${encodeURIComponent(userId)}`);
                        if (res.ok) {
                            botsList = await res.json();
                            renderBots();
                            updateOverallStats();
                        }
                    } catch (err) {
                        console.error("Polling error fetching bots:", err);
                    }
                }, 5000);
                console.log("Started backend polling for running bots.");
            }
        } else {
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
                pollingIntervalId = null;
                console.log("Stopped backend polling (no bots running).");
            }
        }
    }

    // HTML 跳脫防範 XSS
    function escapeHtml(string) {
        return String(string).replace(/[&<>"']/g, function(s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[s];
        });
    }

})();


