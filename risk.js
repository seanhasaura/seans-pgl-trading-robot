
(function () {
    'use strict';

    // ── 歷史資產大類相關性矩陣 ─────────────────────────────────────────
    const CORRELATION_MATRIX = {
        labels: ['美股', '債券', '不動產', '大宗商品', '數位資產', '現金'],
        data: [
            [1.00, -0.15, 0.45, 0.25, 0.55, 0.00],   // 美股
            [-0.15, 1.00, 0.10, -0.05, -0.10, 0.05],  // 債券
            [0.45, 0.10, 1.00, 0.15, 0.20, -0.02],   // 不動產
            [0.25, -0.05, 0.15, 1.00, 0.18, 0.05],   // 大宗商品
            [0.55, -0.10, 0.20, 0.18, 1.00, -0.05],  // 數位資產
            [0.00, 0.05, -0.02, 0.05, -0.05, 1.00]   // 現金
        ]
    };

    // ── 壓力測試情境設定 (各資產類別衝擊 %) ─────────────────────────────
    const STRESS_SCENARIOS = [
        {
            name: '2008 金融海嘯 (Subprime Crisis)',
            shocks: { equity: -35, bond: +5, realestate: -25, commodity: +10, digital: -55, cash: 0 },
            desc: '全球股市暴跌，房市泡沫，黃金上漲避險，加密資產（模擬）深跌。'
        },
        {
            name: '2020 新冠疫情崩盤 (COVID-19 Crash)',
            shocks: { equity: -20, bond: +2, realestate: -15, commodity: +15, digital: -35, cash: 0 },
            desc: '流動性危機引發股債雙殺，黃金大漲，數位資產快速下跌後反彈。'
        },
        {
            name: '2022 加密冬眠 (Crypto Winter)',
            shocks: { equity: -5, bond: 0, realestate: -2, commodity: +5, digital: -70, cash: 0 },
            desc: '數位資產雪崩，美股科技股修正，避險資金流入大宗商品。'
        },
        {
            name: '滯脹與高利率 (Stagflation)',
            shocks: { equity: -15, bond: -8, realestate: -10, commodity: +15, digital: -15, cash: 0 },
            desc: '通膨加劇、利率攀升，股債雙輸，大宗商品（黃金原油）表現優異。'
        }
    ];

    // ── 數字格式化 ────────────────────────────────────────────────
    function fmt(n) {
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
        return '$' + n.toFixed(0);
    }

    // ── 計算風險指標 (波動度, Sharpe, VaR 等) ────────────────────────
    function calculateRiskMetrics(portfolio) {
        const total = portfolio.totalAUM;
        
        // 1. 年化波動度與夏普比率 (根據資產比重加權粗估)
        // 模擬波動度權重：equity: 18%, bond: 4%, realestate: 8%, commodity: 15%, digital: 55%, cash: 0.5%
        const volWeights = { equity: 0.18, bond: 0.04, realestate: 0.08, commodity: 0.15, digital: 0.55, cash: 0.005 };
        let weightedVol = 0;
        portfolio.assetClasses.forEach(ac => {
            const w = ac.pct / 100;
            const v = volWeights[ac.key] || 0.15;
            weightedVol += w * v;
        });
        
        // 年化波動度
        const volPct = parseFloat((weightedVol * 100).toFixed(2));
        document.getElementById('risk-volatility').textContent = volPct + '%';

        // Sharpe Ratio (無風險利率假設 4.0%)
        const dayReturnAnn = portfolio.dayChangePct * 252;
    // ── Mappings ──
    const labelKeyMap = {
        '美股': 'class_equity',
        '債券': 'class_bond',
        '不動產': 'class_realestate',
        '大宗商品': 'class_commodity',
        '數位資產': 'class_digital',
        '現金': 'class_cash'
    };
    const scenarioKeyMap = {
        '2008 金融海嘯 (Subprime Crisis)': { name: 'stress_scenario_subprime_name', desc: 'stress_scenario_subprime_desc' },
        '2020 新冠疫情崩盤 (COVID-19 Crash)': { name: 'stress_scenario_covid_name', desc: 'stress_scenario_covid_desc' },
        '2022 加密冬眠 (Crypto Winter)': { name: 'stress_scenario_crypto_name', desc: 'stress_scenario_crypto_desc' },
        '滯脹與高利率 (Stagflation)': { name: 'stress_scenario_stagflation_name', desc: 'stress_scenario_stagflation_desc' }
    };

    // ── 執行壓力測試模擬 ──────────────────────────────────────────
    function runStressTesting(portfolio) {
        const tbody = document.getElementById('stressTestTableBody');
        if (!tbody) return;

        const holdings = portfolio.holdings;
        const totalAum = portfolio.totalAUM;

        tbody.innerHTML = STRESS_SCENARIOS.map(sc => {
            let impactSum = 0;
            
            holdings.forEach(h => {
                const shockPct = sc.shocks[h.class] || 0;
                const impact = h.aum * (shockPct / 100);
                impactSum += impact;
            });

            const impactPct = (impactSum / totalAum * 100).toFixed(2);
            const postAum = totalAum + impactSum;
            
            let statusText = '🟢 ' + window.t('status_safe', '安全');
            let statusColor = '#34d399';
            if (impactPct < -20) {
                statusText = '🚨 ' + window.t('status_danger', '危險');
                statusColor = '#f87171';
            } else if (impactPct < -10) {
                statusText = '⚠️ ' + window.t('status_warning', '警告');
                statusColor = '#fbbf24';
            }

            const trans = scenarioKeyMap[sc.name] || { name: sc.name, desc: sc.desc };
            const scName = window.t(trans.name, sc.name);
            const scDesc = window.t(trans.desc, sc.desc);

            const shockList = Object.entries(sc.shocks)
                .filter(([_, v]) => v !== 0)
                .map(([k, v]) => `${window.t('class_' + k, k === 'equity' ? '股票' : k === 'bond' ? '債券' : k === 'digital' ? '數位' : '商品')}${v > 0 ? '+' : ''}${v}%`)
                .join(', ');

            return `<tr>
                <td style="font-weight:600;">
                    <div>${scName}</div>
                    <div style="font-size:0.75rem; color:#8899aa; font-weight:400; margin-top:2px;">${scDesc}</div>
                </td>
                <td style="color:#a78bfa;">
                    ${shockList}
                </td>
                <td style="color:${impactSum >= 0 ? '#34d399' : '#f87171'}; font-weight:600;">
                    ${impactSum >= 0 ? '+' : ''}${fmt(impactSum)} (${impactSum >= 0 ? '+' : ''}${impactPct}%)
                </td>
                <td style="font-weight:600;">${fmt(postAum)}</td>
                <td style="color:${statusColor}; font-weight:600;">${statusText}</td>
            </tr>`;
        }).join('');
    }

    // ── 檢查集中度警報 ────────────────────────────────────────────
    function checkConcentrationAlerts(portfolio) {
        const container = document.getElementById('riskAlertsList');
        if (!container) return;

        const alerts = [];
        const holdings = portfolio.holdings;
        const total = portfolio.totalAUM;

        // 1. 檢查數位資產配置 (上限 15%)
        const digitalAum = holdings.filter(h => h.class === 'digital').reduce((sum, h) => sum + h.aum, 0);
        const digitalPct = (digitalAum / total * 100);
        if (digitalPct > 15) {
            alerts.push({
                type: 'warning',
                title: window.t('alert_digital_overlimit_title', '數位資產曝險超限'),
                message: window.t('alert_digital_overlimit_msg', '目前數位資產佔比 <strong>{pct}%</strong>，已超過家辦建議上限 15%。建議調撥至高流動性國債。').replace('{pct}', digitalPct.toFixed(1))
            });
        } else {
            alerts.push({
                type: 'safe',
                title: window.t('alert_digital_safe_title', '數位資產佔比合規'),
                message: window.t('alert_digital_safe_msg', '目前數位資產佔比 <strong>{pct}%</strong>，低於 15% 警示線。').replace('{pct}', digitalPct.toFixed(1))
            });
        }

        // 2. 檢查單一標的曝險 (上限 10%)
        holdings.forEach(h => {
            if (h.pct > 10) {
                alerts.push({
                    type: 'warning',
                    title: window.t('alert_single_overlimit_title', '單一標的曝險過高 - {name}').replace('{name}', h.name),
                    message: window.t('alert_single_overlimit_msg', '標的 <strong>{name}</strong> 佔比高達 <strong>{pct}%</strong>，已突破 10% 集中度限額。建議分流套現。').replace('{name}', h.name).replace('{pct}', h.pct)
                });
            }
        });

        // 3. 檢查即時流動性 (T+0 + T+2 需高於 50%)
        const liquidAum = holdings.filter(h => ['T+0', 'T+2'].includes(h.liquidity)).reduce((sum, h) => sum + h.aum, 0);
        const liquidPct = (liquidAum / total * 100);
        if (liquidPct < 50) {
            alerts.push({
                type: 'danger',
                title: window.t('alert_liq_insufficient_title', '流動性儲備不足'),
                message: window.t('alert_liq_insufficient_msg', '即日/兩日內可變現資產佔比僅 <strong>{pct}%</strong>，低於下限 50%。將影響大額資金提領需求！').replace('{pct}', liquidPct.toFixed(1))
            });
        } else {
            alerts.push({
                type: 'safe',
                title: window.t('alert_liq_safe_title', '流動性儲備充足'),
                message: window.t('alert_liq_safe_msg', '二日內可變現流動資產佔比達 <strong>{pct}%</strong>，高於 50% 安全標準。').replace('{pct}', liquidPct.toFixed(1))
            });
        }

        container.innerHTML = alerts.map(a => {
            const color = a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#10b981';
            const bg = a.type === 'danger' ? 'rgba(239, 68, 68, 0.08)' : a.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)';
            const border = a.type === 'danger' ? 'rgba(239, 68, 68, 0.3)' : a.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)';
            const icon = a.type === 'safe' ? '✅' : a.type === 'warning' ? '⚠️' : '🚨';
            return `
            <div class="risk-alert-item" style="background:${bg}; border: 1px solid ${border}; padding: 0.8rem; border-radius: 8px; margin-bottom: 0.8rem; border-left: 4px solid ${color};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:${color}; font-size: 0.88rem; display:flex; align-items:center; gap: 4px;">
                        <span>${icon}</span> <span>${a.title}</span>
                    </strong>
                </div>
                <div style="font-size:0.8rem; color:#aabbcc; line-height: 1.4;">${a.message}</div>
            </div>`;
        }).join('');
    }

    // ── 繪製相關性熱力圖 ──────────────────────────────────────────
    function renderCorrelationHeatmap() {
        const container = document.getElementById('correlationHeatmap');
        if (!container) return;

        const m = CORRELATION_MATRIX;
        let html = '<div class="heatmap-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 0.78rem;">';

        // 標題行
        html += '<div></div>'; // 左上角空白
        m.labels.forEach(l => {
            html += `<div style="font-weight:600; color:#8899aa; padding: 6px 0;">${window.t(labelKeyMap[l] || l, l)}</div>`;
        });

        // 每一列
        m.labels.forEach((rowLabel, rIdx) => {
            html += `<div style="font-weight:600; color:#8899aa; display:flex; align-items:center; justify-content:flex-end; padding-right: 8px;">${window.t(labelKeyMap[rowLabel] || rowLabel, rowLabel)}</div>`;
            m.data[rIdx].forEach((val, cIdx) => {
                // 相關性顏色深度
                let bg = 'transparent';
                let color = '#fff';
                if (val > 0) {
                    bg = `rgba(16, 185, 129, ${val * 0.7 + 0.1})`; // 綠色
                } else {
                    bg = `rgba(239, 68, 68, ${Math.abs(val) * 0.7 + 0.1})`; // 紅色
                }
                
                // 對角線強調
                const border = rIdx === cIdx ? '1px solid rgba(255,255,255,0.4)' : 'none';
                
                html += `<div style="background:${bg}; border:${border}; border-radius:4px; padding: 10px 0; font-weight:700; color:${color};" title="${window.t(labelKeyMap[rowLabel] || rowLabel, rowLabel)} vs ${window.t(labelKeyMap[m.labels[cIdx]] || m.labels[cIdx], m.labels[cIdx])} = ${val.toFixed(2)}">
                    ${val === 1 ? '1.00' : val.toFixed(2)}
                </div>`;
            });
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // ── 風險儀錶板初始化與同步 ──────────────────────────────────────
    let initialized = false;
    window.initRiskTab = function () {
        if (initialized) return;
        initialized = true;
        
        // 繪製靜態熱力圖
        renderCorrelationHeatmap();

        // 拿取目前 portfolio 資料計算
        if (window.PORTFOLIO_DATA) {
            calculateRiskMetrics(window.PORTFOLIO_DATA);
            runStressTesting(window.PORTFOLIO_DATA);
            checkConcentrationAlerts(window.PORTFOLIO_DATA);
        }
    };

    // 監聽 portfolio.js 的更新，自動重新計算
    window.onPortfolioUpdated = function (portfolio) {
        if (!portfolio) return;
        
        // Ensure static correlation heatmap is re-rendered to apply correct language
        renderCorrelationHeatmap();

        calculateRiskMetrics(portfolio);
        runStressTesting(portfolio);
        checkConcentrationAlerts(portfolio);
        
        // 若數位資產模組的更新鉤子存在，也同步呼叫
        if (typeof window.syncDigitalAssetQuotes === 'function') {
            window.syncDigitalAssetQuotes(portfolio);
        }
    };

})();


