
(function () {
    'use strict';

    // ── Demo AUM 資料 ──────────────────────────────────────────────
    const PORTFOLIO = {
        baseCurrency: 'USD',
        totalAUM: 4271600,
        dayChange: 12480,
        dayChangePct: 0.29,
        asOf: '2026-05-29',

        assetClasses: [
            { key: 'equity',    name: '美股 / 全球股票', color: '#818cf8', aum: 1620000, pct: 37.9 },
            { key: 'bond',      name: '債券',           color: '#34d399', aum:  856000, pct: 20.0 },
            { key: 'realestate',name: '不動產',          color: '#f59e0b', aum:  640000, pct: 15.0 },
            { key: 'commodity', name: '大宗商品',        color: '#f87171', aum:  428000, pct: 10.0 },
            { key: 'digital',   name: '數位資產',        color: '#a78bfa', aum:  513600, pct: 12.0 },
            { key: 'cash',      name: '現金 / 類現金',   color: '#678B91', aum:  214000, pct:  5.0 },
        ],

        geography: [
            { name: '北美',   pct: 45, color: '#818cf8' },
            { name: '亞太',   pct: 25, color: '#34d399' },
            { name: '數位/全球', pct: 14, color: '#a78bfa' },
            { name: '歐洲',   pct: 10, color: '#f59e0b' },
            { name: '其他',   pct:  6, color: '#678B91' },
        ],

        currencies: [
            { name: 'USD', pct: 58, aum: 2477528, color: '#818cf8' },
            { name: 'NTD', pct: 15, aum:  640740, color: '#34d399' },
            { name: 'BTC/ETH', pct: 12, aum:  512592, color: '#f59e0b' },
            { name: 'JPY', pct:  9, aum:  384444, color: '#f87171' },
            { name: 'EUR', pct:  6, aum:  256296, color: '#a78bfa' },
        ],

        liquidity: [
            { label: 'T+0 即日',    aum:  727600, color: '#10b981', items: '數位資產、現金' },
            { label: 'T+2 兩日',    aum: 2040000, color: '#34d399', items: '美股、ETF' },
            { label: '30 日內',     aum:  856000, color: '#f59e0b', items: '債券基金、商品期貨' },
            { label: '90 日以上',   aum:  648000, color: '#f87171', items: '不動產、私募基金' },
        ],

        holdings: [
            // 美股
            { name: 'NVDA',        class: 'equity',     region: '北美', currency: 'USD', aum: 320000, pct: 7.5,  dayChg: +3.2,  liquidity: 'T+2' },
            { name: 'AAPL',        class: 'equity',     region: '北美', currency: 'USD', aum: 280000, pct: 6.6,  dayChg: +0.8,  liquidity: 'T+2' },
            { name: 'SPY ETF',     class: 'equity',     region: '北美', currency: 'USD', aum: 480000, pct: 11.2, dayChg: +0.5,  liquidity: 'T+2' },
            { name: 'QQQ ETF',     class: 'equity',     region: '北美', currency: 'USD', aum: 300000, pct: 7.0,  dayChg: +1.1,  liquidity: 'T+2' },
            { name: 'MSFT',        class: 'equity',     region: '北美', currency: 'USD', aum: 240000, pct: 5.6,  dayChg: +0.3,  liquidity: 'T+2' },
            // 債券
            { name: '美國國債 10Y', class: 'bond',      region: '北美', currency: 'USD', aum: 456000, pct: 10.7, dayChg: -0.1,  liquidity: 'T+2' },
            { name: '投資級公司債', class: 'bond',       region: '北美', currency: 'USD', aum: 400000, pct: 9.4,  dayChg: +0.0,  liquidity: '30日' },
            // 不動產
            { name: '台北商辦',    class: 'realestate', region: '亞太', currency: 'NTD', aum: 400000, pct: 9.4,  dayChg:  0.0,  liquidity: '90日+' },
            { name: '美國 REITs',  class: 'realestate', region: '北美', currency: 'USD', aum: 240000, pct: 5.6,  dayChg: +0.7,  liquidity: 'T+2' },
            // 大宗商品
            { name: '黃金實物',    class: 'commodity',  region: '亞太', currency: 'USD', aum: 280000, pct: 6.6,  dayChg: +0.4,  liquidity: '30日' },
            { name: '原油期貨',    class: 'commodity',  region: '全球', currency: 'USD', aum: 148000, pct: 3.5,  dayChg: -1.3,  liquidity: '30日' },
            // 數位資產
            { name: 'Bitcoin',     class: 'digital',    region: '全球', currency: 'BTC', aum: 280000, pct: 6.6,  dayChg: +2.4,  liquidity: 'T+0' },
            { name: 'Ethereum',    class: 'digital',    region: '全球', currency: 'ETH', aum: 160000, pct: 3.7,  dayChg: +3.8,  liquidity: 'T+0' },
            { name: 'SOL',         class: 'digital',    region: '全球', currency: 'SOL', aum:  73600, pct: 1.7,  dayChg: +5.1,  liquidity: 'T+0' },
            // 現金
            { name: 'USD Cash',    class: 'cash',       region: '北美', currency: 'USD', aum: 140000, pct: 3.3,  dayChg:  0.0,  liquidity: 'T+0' },
            { name: 'NTD 存款',   class: 'cash',        region: '亞太', currency: 'NTD', aum:  74000, pct: 1.7,  dayChg:  0.0,  liquidity: 'T+0' },
        ],
    };

    // ── 報價 Ticker 對照 ──────────────────────────────────────────
    const TICKER_MAP = {
        'NVDA': 'NVDA',
        'AAPL': 'AAPL',
        'SPY ETF': 'SPY',
        'QQQ ETF': 'QQQ',
        'MSFT': 'MSFT',
        '美國國債 10Y': 'TLT',
        '投資級公司債': 'LQD',
        '美國 REITs': 'VNQ',
        '黃金實物': 'GLD',
        '原油期貨': 'USO',
        'Bitcoin': 'bitcoin',
        'Ethereum': 'ethereum',
        'SOL': 'solana'
    };

    const BASELINE_PRICES = {
        'NVDA': 120.0,
        'AAPL': 180.0,
        'SPY': 520.0,
        'QQQ': 440.0,
        'MSFT': 420.0,
        'TLT': 95.0,
        'LQD': 105.0,
        'VNQ': 80.0,
        'GLD': 2300.0,
        'USO': 78.0,
        'bitcoin': 65000.0,
        'ethereum': 3200.0,
        'solana': 150.0
    };

    const CLASS_MAP = {
        equity:     { name: '股票', color: '#818cf8' },
        bond:       { name: '債券', color: '#34d399' },
        realestate: { name: '不動產', color: '#f59e0b' },
        commodity:  { name: '商品', color: '#f87171' },
        digital:    { name: '數位', color: '#a78bfa' },
        cash:       { name: '現金', color: '#678B91' },
    };

    function fmt(n) {
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
        return '$' + n.toFixed(0);
    }

    // ── 初始化各標的股數與初始價格 ──────────────────────────────────
    function initializeHoldings() {
        PORTFOLIO.holdings.forEach(h => {
            h.initialAum = h.aum;
            const ticker = TICKER_MAP[h.name];
            h.ticker = ticker || null;
            if (ticker && BASELINE_PRICES[ticker]) {
                h.initialPrice = BASELINE_PRICES[ticker];
                h.shares = h.initialAum / h.initialPrice;
                h.price = h.initialPrice;
            } else {
                h.initialPrice = 1.0;
                h.shares = h.initialAum;
                h.price = 1.0;
            }
        });
    }

    // ── 重新計算所有投資組合比重與統計 ────────────────────────────────
    function recalculatePortfolio() {
        const holdings = PORTFOLIO.holdings;
        let total = 0;
        holdings.forEach(h => {
            total += h.aum;
        });
        PORTFOLIO.totalAUM = total;

        holdings.forEach(h => {
            h.pct = parseFloat((h.aum / total * 100).toFixed(1));
        });

        let totalDayChange = 0;
        holdings.forEach(h => {
            const prevVal = h.aum / (1 + h.dayChg / 100);
            totalDayChange += (h.aum - prevVal);
        });
        PORTFOLIO.dayChange = totalDayChange;
        PORTFOLIO.dayChangePct = parseFloat((totalDayChange / (total - totalDayChange) * 100).toFixed(2));

        PORTFOLIO.assetClasses.forEach(ac => {
            ac.aum = holdings.filter(h => h.class === ac.key).reduce((sum, h) => sum + h.aum, 0);
            ac.pct = parseFloat((ac.aum / total * 100).toFixed(1));
        });

        PORTFOLIO.geography.forEach(geo => {
            const geoAum = holdings.filter(h => h.region === geo.name).reduce((sum, h) => sum + h.aum, 0);
            geo.pct = parseFloat((geoAum / total * 100).toFixed(1));
        });

        PORTFOLIO.currencies.forEach(curr => {
            let currAum = 0;
            if (curr.name === 'BTC/ETH') {
                currAum = holdings.filter(h => ['BTC', 'ETH', 'SOL'].includes(h.currency)).reduce((sum, h) => sum + h.aum, 0);
            } else {
                currAum = holdings.filter(h => h.currency === curr.name).reduce((sum, h) => sum + h.aum, 0);
            }
            curr.aum = currAum;
            curr.pct = parseFloat((currAum / total * 100).toFixed(1));
        });

        PORTFOLIO.liquidity.forEach(liq => {
            let liqAum = 0;
            if (liq.label.includes('T+0')) {
                liqAum = holdings.filter(h => h.liquidity === 'T+0').reduce((sum, h) => sum + h.aum, 0);
            } else if (liq.label.includes('T+2')) {
                liqAum = holdings.filter(h => h.liquidity === 'T+2').reduce((sum, h) => sum + h.aum, 0);
            } else if (liq.label.includes('30')) {
                liqAum = holdings.filter(h => h.liquidity === '30日').reduce((sum, h) => sum + h.aum, 0);
            } else {
                liqAum = holdings.filter(h => h.liquidity === '90日+').reduce((sum, h) => sum + h.aum, 0);
            }
            liq.aum = liqAum;
        });
    }

    // ── Mappings ──
    const regionKeyMap = {
        '北美': 'region_na',
        '亞太': 'region_ap',
        '歐洲': 'region_eu',
        '全球': 'region_global',
        '數位/全球': 'region_global',
        '其他': 'region_other'
    };
    const liqTableKeyMap = {
        'T+0': 'liq_t0',
        'T+2': 'liq_t2',
        '30日': 'liq_30d',
        '90日+': 'liq_90d'
    };
    const holdingNameKeyMap = {
        'NVDA': 'holding_nvda',
        'AAPL': 'holding_aapl',
        'SPY ETF': 'holding_spy',
        'QQQ ETF': 'holding_qqq',
        'MSFT': 'holding_msft',
        '美國國債 10Y': 'holding_us_treasury',
        '投資級公司債': 'holding_ig_bond',
        '台北商辦': 'holding_taipei_prop',
        '美國 REITs': 'holding_us_reits',
        '黃金實物': 'holding_gold',
        '原油期貨': 'holding_oil',
        'Bitcoin': 'holding_btc',
        'Ethereum': 'holding_eth',
        'SOL': 'holding_sol',
        'USD Cash': 'holding_usd_cash',
        'NTD 存款': 'holding_ntd_deposit'
    };

    // ── 摘要卡片 ──────────────────────────────────────────────────
    function updateSummaryCards() {
        const d = PORTFOLIO;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('pf-total-aum',   fmt(d.totalAUM));
        set('pf-day-change',  `${d.dayChange >= 0 ? '+' : ''}${fmt(d.dayChange)} (${d.dayChange >= 0 ? '+' : ''}${d.dayChangePct}%)`);
        set('pf-asset-count', window.t('asset_count_template', '{count} 類').replace('{count}', d.assetClasses.length));
        set('pf-holding-count', window.t('holding_count_template', '{count} 標的').replace('{count}', d.holdings.length));
        const biggest = [...d.assetClasses].sort((a, b) => b.pct - a.pct)[0];
        set('pf-max-exposure', `${window.t('class_' + biggest.key, biggest.name)} ${biggest.pct}%`);
        const liquid = d.liquidity.filter(l => l.label.includes('T+0') || l.label.includes('T+2'))
                                   .reduce((s, l) => s + l.aum, 0);
        set('pf-liquidity', fmt(liquid));

        const dayEl = document.getElementById('pf-day-change');
        if (dayEl) dayEl.style.color = d.dayChange >= 0 ? '#10b981' : '#ef4444';
    }

    // ── 資產配置環圈圖 ────────────────────────────────────────────
    let allocChart = null;
    function renderAllocChart() {
        const ctx = document.getElementById('allocChart');
        if (!ctx) return;
        if (allocChart) allocChart.destroy();
        const d = PORTFOLIO.assetClasses;
        allocChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: d.map(a => window.t('class_' + a.key, a.name)),
                datasets: [{
                    data: d.map(a => a.pct),
                    backgroundColor: d.map(a => a.color),
                    borderColor: '#0d1520',
                    borderWidth: 3,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { color: '#aabbcc', font: { size: 12 }, padding: 14 } },
                    tooltip: {
                        backgroundColor: '#0d1520', borderColor: '#2a3a4a', borderWidth: 1,
                        titleColor: '#aac', bodyColor: '#fff',
                        callbacks: { label: c => ` ${c.label}: ${c.raw}%  ${fmt(PORTFOLIO.assetClasses[c.dataIndex].aum)}` }
                    }
                }
            }
        });
    }

    // ── 地理分布環圈圖 ────────────────────────────────────────────
    let geoChart = null;
    function renderGeoChart() {
        const ctx = document.getElementById('geoChart');
        if (!ctx) return;
        if (geoChart) geoChart.destroy();
        const d = PORTFOLIO.geography;
        geoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: d.map(g => window.t(regionKeyMap[g.name] || g.name, g.name)),
                datasets: [{
                    data: d.map(g => g.pct),
                    backgroundColor: d.map(g => g.color),
                    borderColor: '#0d1520', borderWidth: 3, hoverOffset: 8,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { color: '#aabbcc', font: { size: 12 }, padding: 14 } },
                    tooltip: {
                        backgroundColor: '#0d1520', borderColor: '#2a3a4a', borderWidth: 1,
                        titleColor: '#aac', bodyColor: '#fff',
                        callbacks: { label: c => ` ${c.label}: ${c.raw}%` }
                    }
                }
            }
        });
    }

    // ── 幣別曝險橫條圖 ────────────────────────────────────────────
    let currChart = null;
    function renderCurrencyChart() {
        const ctx = document.getElementById('currencyChart');
        if (!ctx) return;
        if (currChart) currChart.destroy();
        const d = PORTFOLIO.currencies;
        currChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: d.map(c => c.name),
                datasets: [{
                    label: window.t('th_holding_pct', '佔比') + ' %',
                    data: d.map(c => c.pct),
                    backgroundColor: d.map(c => c.color),
                    borderWidth: 0, borderRadius: 6,
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0d1520', borderColor: '#2a3a4a', borderWidth: 1,
                        bodyColor: '#fff',
                        callbacks: { label: c => ` ${c.raw}%  ≈ ${fmt(PORTFOLIO.currencies[c.dataIndex].aum)}` }
                    }
                },
                scales: {
                    x: { max: 70, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8899aa', callback: v => v + '%' } },
                    y: { grid: { display: false }, ticks: { color: '#aabbcc', font: { size: 13 } } }
                }
            }
        });
    }

    // ── 流動性階梯 ────────────────────────────────────────────────
    function renderLiquidityLadder() {
        const container = document.getElementById('liquidityLadder');
        if (!container) return;
        const total = PORTFOLIO.liquidity.reduce((s, l) => s + l.aum, 0);
        container.innerHTML = PORTFOLIO.liquidity.map(l => {
            const pct = (l.aum / total * 100).toFixed(1);
            const barW = Math.max((l.aum / total * 100), 4);
            const key = l.label.includes('T+0') ? 'liq_t0' : l.label.includes('T+2') ? 'liq_t2' : l.label.includes('30') ? 'liq_30d' : 'liq_90d';
            const labelText = window.t(key, l.label);
            const itemsText = window.t('liq_items_' + key.split('_')[1], l.items);
            return `
            <div class="liq-row">
                <div class="liq-label">
                    <span class="liq-dot" style="background:${l.color};"></span>
                    <span>${labelText}</span>
                </div>
                <div class="liq-bar-wrap">
                    <div class="liq-bar" style="width:${barW}%;background:${l.color}22;border:1px solid ${l.color}44;">
                        <div class="liq-fill" style="width:100%;background:${l.color};opacity:0.7;height:100%;border-radius:inherit;"></div>
                    </div>
                </div>
                <div class="liq-meta">
                    <span class="liq-aum">${fmt(l.aum)}</span>
                    <span class="liq-pct text-muted">${pct}%</span>
                </div>
                <div class="liq-items text-muted">${itemsText}</div>
            </div>`;
        }).join('');
    }

    // ── 持倉明細表 ────────────────────────────────────────────────
    function renderHoldingsTable(holdings) {
        const tbody = document.getElementById('holdingsTableBody');
        if (!tbody) return;
        if (!holdings.length) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#556;">${window.t('no_holdings_data', '無持倉資料')}</td></tr>`;
            return;
        }
        tbody.innerHTML = holdings.map(h => {
            const cls = CLASS_MAP[h.class] || { name: h.class, color: '#888' };
            const chgColor = h.dayChg > 0 ? '#34d399' : h.dayChg < 0 ? '#f87171' : '#8899aa';
            const liqColor = h.liquidity === 'T+0' ? '#10b981' : h.liquidity === 'T+2' ? '#34d399' : h.liquidity === '30日' ? '#f59e0b' : '#f87171';
            
            let priceStr = '-';
            if (h.price && h.class !== 'cash' && h.name !== '台北商辦') {
                priceStr = h.price >= 1000 ? '$' + h.price.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '$' + h.price.toFixed(2);
            }
 
            const clsName = window.t('class_' + h.class, cls.name);
            const regName = window.t(regionKeyMap[h.region] || h.region, h.region);
            const liqText = window.t(liqTableKeyMap[h.liquidity] || h.liquidity, h.liquidity);
            const hName = window.t(holdingNameKeyMap[h.name] || h.name, h.name);

            return `<tr>
                <td style="font-weight:600;">${hName}</td>
                <td><span style="background:${cls.color}22;color:${cls.color};padding:2px 8px;border-radius:99px;font-size:0.78rem;">${clsName}</span></td>
                <td class="text-muted">${regName}</td>
                <td class="text-muted">${h.currency}</td>
                <td style="font-weight:600;color:#e2e8f0;">${priceStr}</td>
                <td style="font-weight:600;">${fmt(h.aum)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <div style="flex:1;background:rgba(255,255,255,0.07);border-radius:99px;height:5px;">
                            <div style="width:${Math.min(h.pct*3,100)}%;background:#818cf8;height:100%;border-radius:99px;"></div>
                        </div>
                        <span style="font-size:0.82rem;color:#aac;">${h.pct}%</span>
                    </div>
                </td>
                <td style="color:${chgColor};font-weight:600;">${h.dayChg > 0 ? '+' : ''}${h.dayChg.toFixed(1)}%</td>
                <td><span style="background:${liqColor}22;color:${liqColor};padding:2px 8px;border-radius:99px;font-size:0.75rem;">${liqText}</span></td>
            </tr>`;
        }).join('');
    }

    // ── 抓取即時報價 ──────────────────────────────────────────────
    async function fetchRealTimeQuotes() {
        const btn = document.getElementById('refreshQuotesBtn');
        const spinner = document.getElementById('quoteSpinner');
        const statusText = document.getElementById('quoteUpdateStatus');

        if (btn) btn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        if (statusText) statusText.textContent = window.t('quote_updating', '讀取即時報價中...');

        try {
            const res = await fetch('/api/quotes');
            if (!res.ok) throw new Error('API 回傳錯誤');
            const data = await res.json();
            const quotes = data.quotes;

            PORTFOLIO.holdings.forEach(h => {
                if (h.ticker && quotes[h.ticker]) {
                    const q = quotes[h.ticker];
                    h.price = q.price;
                    h.dayChg = q.changePct;
                    h.aum = h.shares * q.price;
                }
            });

            recalculatePortfolio();
            window.renderPortfolio();

            if (statusText) statusText.textContent = `${window.t('quote_updated_at', '報價更新於 {time}').replace('{time}', data.last_updated.split(' ')[1])}`;

            // 觸發外部事件監聽，以便同步更新其他模組的值 (風險儀錶板與數位資產模組)
            if (typeof window.onPortfolioUpdated === 'function') {
                window.onPortfolioUpdated(PORTFOLIO);
            }
        } catch (err) {
            console.error('更新報價失敗:', err);
            if (statusText) statusText.textContent = window.t('quote_update_failed', '更新失敗，使用快照資料');
        } finally {
            if (btn) btn.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    }

    // 將資料與主要拉取函數暴露出去
    window.PORTFOLIO_DATA = PORTFOLIO;
    window.fetchRealTimeQuotes = fetchRealTimeQuotes;

    // ── 篩選器 ────────────────────────────────────────────────────
    function initHoldingsFilter() {
        const classF  = document.getElementById('pfFilterClass');
        const regionF = document.getElementById('pfFilterRegion');
        const liqF    = document.getElementById('pfFilterLiq');
        const getFiltered = () => {
            let rows = PORTFOLIO.holdings;
            if (classF?.value)  rows = rows.filter(h => h.class    === classF.value);
            if (regionF?.value) rows = rows.filter(h => h.region   === regionF.value);
            if (liqF?.value)    rows = rows.filter(h => h.liquidity === liqF.value);
            return rows;
        };
        [classF, regionF, liqF].forEach(el => {
            if (el) el.addEventListener('change', () => renderHoldingsTable(getFiltered()));
        });
    }

    // ── 暴露的渲染函數 ──
    window.renderPortfolio = function() {
        updateSummaryCards();
        renderAllocChart();
        renderGeoChart();
        renderCurrencyChart();
        renderLiquidityLadder();
        
        const classF  = document.getElementById('pfFilterClass');
        const regionF = document.getElementById('pfFilterRegion');
        const liqF    = document.getElementById('pfFilterLiq');
        let rows = PORTFOLIO.holdings;
        if (classF?.value)  rows = rows.filter(h => h.class    === classF.value);
        if (regionF?.value) rows = rows.filter(h => h.region   === regionF.value);
        if (liqF?.value)    rows = rows.filter(h => h.liquidity === liqF.value);
        renderHoldingsTable(rows);
    };

    // ── 主程式（只初始化一次）────────────────────────────────────
    let initialized = false;
    window.initPortfolioTab = function () {
        if (initialized) return;
        initialized = true;
        
        initializeHoldings();
        window.renderPortfolio();
        initHoldingsFilter();

        const refreshBtn = document.getElementById('refreshQuotesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', fetchRealTimeQuotes);
        }

        // 自動執行第一次更新
        setTimeout(fetchRealTimeQuotes, 500);
    };

})();


