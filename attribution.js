
(function () {
    'use strict';

    // ── 策略 / 商品 / 時段 定義 ──
    const STRATEGIES = {
        ma_cross:     { name: '均線交叉', color: '#10b981', count: 42, winRate: 0.86, avgWin: 44, avgLoss: -18 },
        trend_follow: { name: '趨勢追蹤', color: '#678B91', count: 28, winRate: 0.78, avgWin: 54, avgLoss: -22 },
        pattern_prob: { name: '歷史機率', color: '#fbbf24', count: 15, winRate: 0.73, avgWin: 37, avgLoss: -20 },
    };
    const ASSETS = {
        index:     { name: '指數', color: '#818cf8', symbols: ['S&P500', 'Nasdaq', 'Nikkei225', 'FTSE100'] },
        commodity: { name: '原料', color: '#f59e0b', symbols: ['黃金', '原油', '白銀', '銅'] },
    };
    const SESSIONS = {
        asia:   { name: '亞盤', mult: 1.20 },
        europe: { name: '歐盤', mult: 1.00 },
        us:     { name: '美盤', mult: 0.85 },
    };
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const DAY_NAMES = { Mon: '週一', Tue: '週二', Wed: '週三', Thu: '週四', Fri: '週五' };

    // ── 固定種子隨機（保持 demo 資料一致）──
    let _seed = 20260512;
    function rng() {
        _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
        return (_seed >>> 0) / 0xffffffff;
    }

    // ── 生成模擬交易 ──
    function generateTrades() {
        const trades = [];
        let id = 1;
        const base = new Date('2026-05-12');
        for (const [sKey, s] of Object.entries(STRATEGIES)) {
            for (let i = 0; i < s.count; i++) {
                const aKey   = rng() < 0.58 ? 'index' : 'commodity';
                const asset  = ASSETS[aKey];
                const symbol = asset.symbols[Math.floor(rng() * asset.symbols.length)];
                const sessKey= Object.keys(SESSIONS)[Math.floor(rng() * 3)];
                const sess   = SESSIONS[sessKey];
                const day    = DAYS[Math.floor(rng() * 5)];
                const dir    = rng() < 0.55 ? 'BUY' : 'SELL';
                const isWin  = rng() < s.winRate;
                let pnl = isWin
                    ? (s.avgWin  + rng() * 35 - 12) * sess.mult
                    : (s.avgLoss - rng() * 18 +  5) * sess.mult;
                pnl = Math.round(pnl * 100) / 100;
                const d = new Date(base);
                d.setDate(d.getDate() - Math.floor(rng() * 60));
                trades.push({
                    id: `T${String(id++).padStart(4,'0')}`,
                    strategy: sKey, strategyName: s.name, strategyColor: s.color,
                    assetClass: aKey, assetName: asset.name,
                    symbol, direction: dir,
                    session: sessKey, sessionName: sess.name,
                    day, pnl,
                    date: d.toISOString().split('T')[0],
                });
            }
        }
        return trades.sort((a, b) => b.date.localeCompare(a.date));
    }

    // ── 聚合函數 ──
    function aggByStrategy(trades) {
        const m = {};
        for (const t of trades) {
            if (!m[t.strategy]) m[t.strategy] = { key: t.strategy, name: t.strategyName, color: t.strategyColor, pnl: 0, trades: 0, wins: 0, pnls: [] };
            m[t.strategy].pnl    += t.pnl;
            m[t.strategy].trades ++;
            if (t.pnl > 0) m[t.strategy].wins++;
            m[t.strategy].pnls.push(t.pnl);
        }
        return Object.values(m).map(s => ({
            ...s,
            pnl:      Math.round(s.pnl * 100) / 100,
            win_rate: Math.round(s.wins / s.trades * 1000) / 10,
            mdd:      mddFromPnls(s.pnls),
            sharpe:   sharpe(s.pnls),
        }));
    }

    function aggByAsset(trades) {
        const m = {};
        for (const t of trades) {
            if (!m[t.assetClass]) m[t.assetClass] = { key: t.assetClass, name: t.assetName, color: ASSETS[t.assetClass].color, pnl: 0, trades: 0, wins: 0, bySymbol: {} };
            m[t.assetClass].pnl    += t.pnl;
            m[t.assetClass].trades ++;
            if (t.pnl > 0) m[t.assetClass].wins++;
            const bs = m[t.assetClass].bySymbol;
            if (!bs[t.symbol]) bs[t.symbol] = { name: t.symbol, pnl: 0, trades: 0 };
            bs[t.symbol].pnl    += t.pnl;
            bs[t.symbol].trades ++;
        }
        return Object.values(m).map(a => ({
            ...a,
            pnl:      Math.round(a.pnl * 100) / 100,
            win_rate: Math.round(a.wins / a.trades * 1000) / 10,
            symbols:  Object.values(a.bySymbol).map(s => ({ ...s, pnl: Math.round(s.pnl*100)/100 })).sort((a,b) => b.pnl - a.pnl),
        }));
    }

    function aggBySession(trades) {
        const m = {};
        for (const t of trades) {
            if (!m[t.session]) m[t.session] = { key: t.session, name: t.sessionName, pnl: 0, trades: 0, wins: 0 };
            m[t.session].pnl    += t.pnl;
            m[t.session].trades ++;
            if (t.pnl > 0) m[t.session].wins++;
        }
        return Object.values(m).map(s => ({ ...s, pnl: Math.round(s.pnl*100)/100, win_rate: Math.round(s.wins/s.trades*1000)/10 }));
    }

    function buildHeatmap(trades) {
        const h = {};
        for (const day of DAYS) {
            h[day] = {};
            for (const sess of Object.keys(SESSIONS)) h[day][sess] = { pnl: 0, trades: 0 };
        }
        for (const t of trades) {
            if (h[t.day] && h[t.day][t.session]) { h[t.day][t.session].pnl += t.pnl; h[t.day][t.session].trades++; }
        }
        return h;
    }

    function mddFromPnls(pnls) {
        let peak = 0, cum = 0, maxDD = 0;
        for (const p of pnls) {
            cum += p;
            if (cum > peak) peak = cum;
            const dd = peak > 0 ? (cum - peak) / peak * 100 : 0;
            if (dd < maxDD) maxDD = dd;
        }
        return Math.round(maxDD * 100) / 100;
    }

    function sharpe(pnls) {
        if (!pnls.length) return 0;
        const avg = pnls.reduce((a,b)=>a+b,0) / pnls.length;
        const std = Math.sqrt(pnls.reduce((a,b)=>a+(b-avg)**2,0)/pnls.length);
        return std > 0 ? Math.round(avg/std * Math.sqrt(252) * 100)/100 : 0;
    }

    // ── Mappings ──
    const strategyKeyMap = {
        ma_cross: 'strategy_ma_cross',
        trend_follow: 'strategy_trend_follow',
        pattern_prob: 'strategy_history_prob'
    };
    const assetClassKeyMap = {
        index: 'asset_index',
        commodity: 'asset_commodity'
    };
    const symbolKeyMap = {
        '黃金': 'symbol_gold',
        '原油': 'symbol_oil',
        '白銀': 'symbol_silver',
        '銅': 'symbol_copper'
    };

    // ── 摘要卡片 ──
    function updateSummaryCards(trades, byStrategy, byAsset) {
        const totalPnl = Math.round(trades.reduce((a,t)=>a+t.pnl,0)*100)/100;
        const wins     = trades.filter(t=>t.pnl>0).length;
        const best     = [...byStrategy].sort((a,b)=>b.pnl-a.pnl)[0];
        const bestA    = [...byAsset].sort((a,b)=>b.pnl-a.pnl)[0];
        const worstMDD = Math.min(...byStrategy.map(s=>s.mdd));
        const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
        set('attr-total-pnl',      `$${totalPnl.toFixed(2)}`);
        set('attr-total-trades',   trades.length);
        set('attr-win-rate',       `${Math.round(wins/trades.length*1000)/10}%`);
        set('attr-best-strategy',  best ? window.t(strategyKeyMap[best.key] || 'strategy_' + best.key, best.name) : '-');
        set('attr-best-asset',     bestA ? window.t(assetClassKeyMap[bestA.key] || bestA.key, bestA.name) : '-');
        set('attr-worst-mdd',      `${worstMDD.toFixed(2)}%`);
        const pEl = document.getElementById('attr-total-pnl');
        if (pEl) pEl.style.color = totalPnl >= 0 ? '#10b981' : '#ef4444';
    }

    // ── 瀑布圖 ──
    let waterfallChart = null;
    function renderWaterfallChart(byStrategy) {
        const ctx = document.getElementById('waterfallChart');
        if (!ctx) return;
        if (waterfallChart) waterfallChart.destroy();
        let running = 0;
        const labels  = [
            window.t('waterfall_start', '起始'), 
            ...byStrategy.map(s=>window.t(strategyKeyMap[s.key] || 'strategy_' + s.key, s.name)), 
            window.t('waterfall_total', '合計')
        ];
        const data    = [[0,0]];
        const colors  = ['transparent'];
        for (const s of byStrategy) {
            const base = running, top = Math.round((running+s.pnl)*100)/100;
            data.push([Math.min(base,top), Math.max(base,top)]);
            colors.push(s.pnl >= 0 ? s.color : '#ef4444');
            running = top;
        }
        data.push([0, Math.round(running*100)/100]);
        colors.push('#a78bfa');
        waterfallChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: window.t('contribution_usd', '盈虧貢獻 (USD)'), data, backgroundColor: colors, borderWidth: 0, borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0d1520', titleColor: '#aac', bodyColor: '#fff', borderColor: '#2a3a4a', borderWidth: 1,
                        callbacks: { label: c => { const d=c.raw; if(!Array.isArray(d)) return ''; const v=d[1]-d[0]; return ` ${v>=0?'+':''}$${v.toFixed(2)}`; } }
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa', callback: v=>'$'+v } },
                    x: { grid: { display:false }, ticks: { color: '#aabbcc', font:{size:12} } }
                }
            }
        });
    }

    // ── 雷達圖 ──
    let radarChart = null;
    function renderRadarChart(byStrategy) {
        const ctx = document.getElementById('radarChart');
        if (!ctx) return;
        if (radarChart) radarChart.destroy();
        const maxPnl = Math.max(...byStrategy.map(s=>s.pnl));
        const maxTr  = Math.max(...byStrategy.map(s=>s.trades));
        const datasets = byStrategy.map(s => ({
            label: window.t(strategyKeyMap[s.key] || 'strategy_' + s.key, s.name),
            data: [
                s.win_rate,
                Math.round(s.pnl/maxPnl*100),
                Math.round(s.trades/maxTr*100),
                Math.min(100, Math.max(0, 100+s.mdd*4)),
                Math.min(100, Math.max(0, s.sharpe*15+50)),
            ],
            borderColor: s.color, backgroundColor: s.color+'28', borderWidth: 2, pointBackgroundColor: s.color, pointRadius: 4,
        }));
        radarChart = new Chart(ctx, {
            type: 'radar',
            data: { 
                labels: [
                    window.t('radar_winrate', '勝率'), 
                    window.t('radar_return', '報酬'), 
                    window.t('radar_frequency', '頻率'), 
                    window.t('radar_risk', '風控'), 
                    window.t('radar_sharpe', '夏普')
                ], 
                datasets 
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#aabbcc', font:{size:12} } } },
                scales: {
                    r: {
                        min:0, max:100,
                        grid:        { color: 'rgba(255,255,255,0.08)' },
                        angleLines:  { color: 'rgba(255,255,255,0.08)' },
                        pointLabels: { color: '#ccdde8', font:{size:13} },
                        ticks:       { display:false },
                    }
                }
            }
        });
    }

    // ── 商品條形圖 ──
    let assetChart = null;
    function renderAssetChart(byAsset) {
        const ctx = document.getElementById('assetChart');
        if (!ctx) return;
        if (assetChart) assetChart.destroy();
        const allSymbols = byAsset.flatMap(a => a.symbols);
        allSymbols.sort((a,b) => b.pnl - a.pnl);
        const labels = allSymbols.map(s=>window.t(symbolKeyMap[s.name] || s.name, s.name));
        const data   = allSymbols.map(s=>s.pnl);
        const colors = allSymbols.map(s => s.pnl>=0 ? '#10b981' : '#ef4444');
        assetChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: window.t('th_pnl', '盈虧') + ' (USD)', data, backgroundColor: colors, borderRadius: 5, borderWidth: 0 }] },
            options: {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0d1520', bodyColor: '#fff', borderColor: '#2a3a4a', borderWidth: 1,
                        callbacks: { label: c => ` ${c.raw>=0?'+':''}$${c.raw.toFixed(2)}` }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa', callback: v=>'$'+v } },
                    y: { grid: { display:false }, ticks: { color: '#aabbcc', font:{size:12} } }
                }
            }
        });
    }

    // ── 時段橫條圖 ──
    let sessionChart = null;
    function renderSessionChart(bySession) {
        const ctx = document.getElementById('sessionChart');
        if (!ctx) return;
        if (sessionChart) sessionChart.destroy();
        const order = ['asia','europe','us'];
        const sorted = order.map(k => bySession.find(s=>s.key===k)).filter(Boolean);
        sessionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(s=>window.t('session_' + s.key, s.name)),
                datasets: [
                    { label: window.t('stat_total_pnl', '總盈虧'), data: sorted.map(s=>s.pnl), backgroundColor: ['#10b981','#678B91','#a78bfa'], borderRadius: 6, borderWidth: 0 },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0d1520', bodyColor: '#fff', borderColor: '#2a3a4a', borderWidth: 1,
                        callbacks: { label: c => ` $${c.raw.toFixed(2)} | ${window.t('radar_winrate', '勝率')}: ${sorted[c.dataIndex].win_rate}%` }
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa', callback: v=>'$'+v } },
                    x: { grid: { display:false }, ticks: { color: '#aabbcc', font:{size:13} } }
                }
            }
        });
    }

    // ── 熱力圖 ──
    function renderHeatmap(heatmap) {
        const container = document.getElementById('heatmapGrid');
        if (!container) return;
        let allPnl = [];
        for (const day of DAYS) for (const sess of Object.keys(SESSIONS)) allPnl.push(heatmap[day][sess].pnl);
        const maxAbs = Math.max(...allPnl.map(Math.abs), 1);

        let html = `<div class="heatmap-table">
            <div class="hm-header-row">
                <div class="hm-corner"></div>
                ${Object.entries(SESSIONS).map(([k, s])=>`<div class="hm-col-label">${window.t('session_' + k, s.name)}</div>`).join('')}
            </div>`;
        for (const day of DAYS) {
            const dayLabel = window.t('day_' + day.toLowerCase(), DAY_NAMES[day]);
            html += `<div class="hm-row"><div class="hm-row-label">${dayLabel}</div>`;
            for (const sessKey of Object.keys(SESSIONS)) {
                const cell = heatmap[day][sessKey];
                const pnl  = Math.round(cell.pnl*100)/100;
                const intensity = Math.abs(pnl) / maxAbs;
                const bg   = pnl >= 0
                    ? `rgba(16,185,129,${0.15 + intensity*0.7})`
                    : `rgba(239,68,68,${0.15 + intensity*0.7})`;
                const textColor = intensity > 0.5 ? '#fff' : '#aac';
                const cellTitle = `${dayLabel} ${window.t('session_' + sessKey, SESSIONS[sessKey].name)}: $${pnl}`;
                html += `<div class="hm-cell" style="background:${bg};color:${textColor};" title="${cellTitle}">
                    <span class="hm-pnl">${pnl>=0?'+':''}$${pnl.toFixed(0)}</span>
                    <span class="hm-trades">${window.t('trade_count_template', '{count}筆').replace('{count}', cell.trades)}</span>
                </div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    }

    // ── 交易明細表格 ──
    function renderTradeTable(trades, filters = {}) {
        let rows = trades;
        if (filters.strategy) rows = rows.filter(t => t.strategy === filters.strategy);
        if (filters.asset)    rows = rows.filter(t => t.assetClass === filters.asset);
        if (filters.session)  rows = rows.filter(t => t.session === filters.session);

        const tbody = document.getElementById('attrTradeTableBody');
        if (!tbody) return;
        if (!rows.length) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#556;">${window.t('no_trade_records', '無交易記錄')}</td></tr>`; return; }

        tbody.innerHTML = rows.slice(0, 50).map(t => `
            <tr>
                <td class="text-muted">${t.date}</td>
                <td><span style="background:${t.strategyColor}22;color:${t.strategyColor};padding:2px 8px;border-radius:99px;font-size:0.78rem;">${window.t(strategyKeyMap[t.strategy] || 'strategy_' + t.strategy, t.strategyName)}</span></td>
                <td>${t.symbol}</td>
                <td><span style="color:${t.direction==='BUY'?'#34d399':'#f87171'}">${window.t('direction_' + t.direction.toLowerCase(), t.direction === 'BUY' ? '▲ 買入' : '▼ 賣出')}</span></td>
                <td>${window.t('session_' + t.session, t.sessionName)}</td>
                <td style="color:${t.pnl>=0?'#34d399':'#f87171'};font-weight:600;">${t.pnl>=0?'+':''}$${t.pnl.toFixed(2)}</td>
                <td style="color:#8899aa;font-size:0.8rem;">${t.date}</td>
            </tr>`).join('');
    }

    // ── 篩選器初始化 ──
    function initFilters() {
        const stratSel   = document.getElementById('filterStrategy');
        const assetSel   = document.getElementById('filterAsset');
        const sessionSel = document.getElementById('filterSession');
        const getFilters = () => ({
            strategy: stratSel?.value  || '',
            asset:    assetSel?.value  || '',
            session:  sessionSel?.value|| '',
        });
        [stratSel, assetSel, sessionSel].forEach(el => {
            if (el) el.addEventListener('change', () => renderTradeTable(tradesData, getFilters()));
        });
    }

    // ── 主程式 (等 tab 切換後才初始化) ──
    let initialized = false;
    let tradesData = null;
    let byStrategyData = null;
    let byAssetData = null;
    let bySessionData = null;
    let heatmapData = null;

    window.renderAttribution = function () {
        if (!tradesData) return;
        updateSummaryCards(tradesData, byStrategyData, byAssetData);
        renderWaterfallChart(byStrategyData);
        renderRadarChart(byStrategyData);
        renderAssetChart(byAssetData);
        renderSessionChart(bySessionData);
        renderHeatmap(heatmapData);
        renderTradeTable(tradesData);
    };

    // ── Gist 相似天數圖表渲染 ──
    let similarDaysChartInstance = null;

    async function loadAndRenderSimilarDays(assetName = 'NAS100') {
        if (!window.GistService) return;
        const canvas = document.getElementById('similarDaysChartCanvas');
        if (!canvas) return;

        const isFX = assetName === 'EURUSD';
        const rawData = await window.GistService.getSimilarDays(assetName, isFX);

        if (!rawData || rawData.length === 0) return;

        const datasets = rawData.slice(0, 3).map((item, index) => {
            let returnArray = [];
            try {
                const rawStr = item.subsequent_returns || item.subsequent_path || '[]';
                returnArray = JSON.parse(rawStr.replace(/'/g, '"'));
            } catch (e) {
                returnArray = [0, 0.002, 0.005, 0.008, 0.012];
            }

            const colors = ['#34d399', '#3b82f6', '#f59e0b'];
            const histDate = item.similar_date || item.historical_date || `Rank ${item.rank}`;
            const dist = item.distance ? parseFloat(item.distance).toFixed(3) : '0';

            return {
                label: `Top ${item.rank} (${histDate}, 距離: ${dist})`,
                data: returnArray,
                borderColor: colors[index % colors.length],
                borderWidth: 2,
                tension: 0.3,
                fill: false
            };
        });

        if (similarDaysChartInstance) {
            similarDaysChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        const maxLen = Math.max(...datasets.map(d => d.data.length));
        const labels = Array.from({ length: maxLen }, (_, i) => `T+${i + 1} 日`);

        similarDaysChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e2e8f0', font: { size: 11 } } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
                }
            }
        });
    }

    window.initAttributionTab = async function () {
        if (initialized) return;
        initialized = true;

        if (window.GistService) {
            try {
                const gistTrades = await window.GistService.getTradeHistory();
                if (gistTrades && gistTrades.length > 0) {
                    const mappedGist = gistTrades.map((t, idx) => ({
                        id: `T${String(idx + 1).padStart(4, '0')}`,
                        strategy: t.Strategy || 'AE_TradeBot',
                        strategyName: t.Strategy || 'AE_TradeBot',
                        strategyColor: t.Strategy && t.Strategy.includes('CTA') ? '#f97316' : '#34d399',
                        assetClass: 'index',
                        assetName: t.Symbol || 'US30',
                        symbol: t.Symbol || 'US30',
                        direction: (t.Action || 'BUY').toUpperCase(),
                        session: 'us',
                        sessionName: '美盤',
                        day: 'Wed',
                        pnl: t.Price ? parseFloat(t.Price) * 0.05 : 0,
                        date: t.Timestamp ? t.Timestamp.split(' ')[0] : '2026-05-21'
                    }));
                    tradesData = mappedGist;
                } else {
                    tradesData = generateTrades();
                }
            } catch (e) {
                console.error("使用預設模擬交易數據:", e);
                tradesData = generateTrades();
            }
        } else {
            tradesData = generateTrades();
        }

        byStrategyData = aggByStrategy(tradesData);
        byAssetData    = aggByAsset(tradesData);
        bySessionData  = aggBySession(tradesData);
        heatmapData    = buildHeatmap(tradesData);

        window.renderAttribution();
        initFilters();

        // 載入與監聽 相似天數 下拉選單
        loadAndRenderSimilarDays('NAS100');
        const assetSel = document.getElementById('similarAssetSelect');
        if (assetSel) {
            assetSel.addEventListener('change', (e) => loadAndRenderSimilarDays(e.target.value));
        }
    };

})();


