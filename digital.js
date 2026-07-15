
(function () {
    'use strict';

    // ── 錢包地址初始資料庫 ──────────────────────────────────────────
    const WALLETS = [
        { name: 'Ledger Cold Wallet-01',  chain: 'Bitcoin',  type: '硬體冷錢包', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', balance: 3.82,  value: 280478 },
        { name: 'Gnosis Safe Multi-sig',  chain: 'Ethereum', type: '機構託管',   address: '0x19d936384C7BfB0492E124fefD5dE8e8e8E40798', balance: 80.57, value: 160000 },
        { name: 'Phantom Staking Wallet', chain: 'Solana',   type: '熱錢包',     address: 'Sol12vK9d7h72vK9K9d7h7h73nFk9d7h73Fk9d7h',    balance: 908.08,value: 73600 },
        { name: 'Coinbase Prime Custody', chain: 'Ethereum', type: '機構託管',   address: '0xbc61c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', balance: 100000, value: 100000, isUSDC: true },
    ];

    // ── DeFi 質押初始資料 ──────────────────────────────────────────
    const DEFI_STAKES = [
        { protocol: 'Lido Finance', asset: 'stETH', amount: 50.0,  apy: 3.4,  lockup: 'T+1',  earned: 1845,  risk: 'L1 低風險' },
        { protocol: 'Aave V3 Lending',  asset: 'USDC',  amount: 80000, apy: 5.2,  lockup: 'T+0',  earned: 3120,  risk: 'L1 低風險' },
        { protocol: 'Uniswap V3 LP',    asset: 'ETH/USDC', amount: 35000, apy: 18.5, lockup: 'T+0',  earned: 2850,  risk: 'L2 中風險' },
        { protocol: 'Solana Liquid Stake', asset: 'mSOL', amount: 350.0, apy: 6.8,  lockup: 'T+3',  earned: 540,   risk: 'L2 中風險' }
    ];

    // ── 近期鏈上大額交易日誌 ────────────────────────────────────────
    const TRANSACTIONS = [
        { hash: '0x7f3a...b8c2', chain: 'Ethereum', type: 'DeFi 質押 (Lido)', value: '15.0 ETH', status: '成功', time: '10 分鐘前' },
        { hash: 'bc1q...99ef', chain: 'Bitcoin',  type: '冷錢包轉出',       value: '0.45 BTC', status: '成功', time: '1 小時前' },
        { hash: '0x18e9...d9a2', chain: 'Ethereum', type: 'Swap (Uniswap)',  value: '20,000 USDC', status: '成功', time: '4 小時前' },
        { hash: 'Sol9...44a1', chain: 'Solana',   type: '領取 Staking 收益', value: '12.4 SOL',  status: '成功', time: '1 天前' },
        { hash: '0x29f1...88c4', chain: 'Ethereum', type: '大額歸集',       value: '50,000 USDC', status: '成功', time: '3 天前' }
    ];

    function fmt(n) {
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
        return '$' + n.toFixed(0);
    }

    // ── 根據即時報價更新數位資產估值 ──────────────────────────────────
    function updateDigitalValuations() {
        // 從全域 PORTFOLIO_DATA 取得最新報價
        let ethPrice = 1985.82;
        let btcPrice = 73422;
        let solPrice = 81.05;

        if (window.PORTFOLIO_DATA) {
            const btcHold = window.PORTFOLIO_DATA.holdings.find(h => h.name === 'Bitcoin');
            const ethHold = window.PORTFOLIO_DATA.holdings.find(h => h.name === 'Ethereum');
            const solHold = window.PORTFOLIO_DATA.holdings.find(h => h.name === 'SOL');

            if (btcHold && btcHold.price > 1) btcPrice = btcHold.price;
            if (ethHold && ethHold.price > 1) ethPrice = ethHold.price;
            if (solHold && solHold.price > 1) solPrice = solHold.price;
        }

        let totalValue = 0;
        WALLETS.forEach(w => {
            if (w.isUSDC) {
                w.value = w.balance; // Stablecoin
            } else if (w.chain === 'Ethereum') {
                w.value = w.balance * ethPrice;
            } else if (w.chain === 'Bitcoin') {
                w.value = w.balance * btcPrice;
            } else if (w.chain === 'Solana') {
                w.value = w.balance * solPrice;
            }
            totalValue += w.value;
        });

        // 重新繪製錢包與摘要資訊
        renderWalletsTable();
        updateSummaryCards(totalValue);
    }

    // ── Mappings ──
    const walletTypeMap = {
        '硬體冷錢包': 'type_cold',
        '機構託管': 'type_custody',
        '熱錢包': 'type_hot'
    };
    const riskKeyMap = {
        'L1 低風險': 'risk_l1',
        'L2 中風險': 'risk_l2'
    };
    const txTypeMap = {
        'DeFi 質押 (Lido)': 'tx_defi_staking_lido',
        '冷錢包轉出': 'tx_cold_withdrawal',
        'Swap (Uniswap)': 'tx_swap_uniswap',
        '領取 Staking 收益': 'tx_claim_staking',
        '大額歸集': 'tx_large_consolidation',
        '錢包連結 & 同步': 'tx_wallet_sync'
    };
    const txTimeMap = {
        '10 分鐘前': 'time_10m_ago',
        '1 小時前': 'time_1h_ago',
        '4 小時前': 'time_4h_ago',
        '1 天前': 'time_1d_ago',
        '3 天前': 'time_3d_ago',
        '剛剛': 'time_just_now'
    };

    // ── 更新摘要面板資訊 ──────────────────────────────────────────
    function updateSummaryCards(totalValue) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        
        // 總規模
        set('dig-total-aum', fmt(totalValue));
        
        // 今日波動（隨機或基於 portfolio.js 的波動）
        let pct = 2.49;
        let chgAmt = totalValue * (pct / 100);
        if (window.PORTFOLIO_DATA) {
            pct = window.PORTFOLIO_DATA.dayChangePct;
            chgAmt = totalValue * (pct / 100);
        }
        set('dig-day-change', `${chgAmt >= 0 ? '+' : ''}${fmt(chgAmt)} (${pct >= 0 ? '+' : ''}${pct}%)`);
        const changeEl = document.getElementById('dig-day-change');
        if (changeEl) changeEl.style.color = pct >= 0 ? '#10b981' : '#ef4444';

        // 錢包個數
        set('dig-wallet-count', window.t('wallet_count_template', '{count} 個').replace('{count}', WALLETS.length));

        // 質押佔比
        let stakedVal = 0;
        DEFI_STAKES.forEach(s => {
            let pPrice = 1.0;
            if (window.PORTFOLIO_DATA) {
                const btc = window.PORTFOLIO_DATA.holdings.find(h => h.name === 'Bitcoin');
                const eth = window.PORTFOLIO_DATA.holdings.find(h => h.name === 'Ethereum');
                const sol = window.PORTFOLIO_DATA.holdings.find(h => h.name === 'SOL');

                if (s.asset === 'stETH' && eth) pPrice = eth.price;
                else if (s.asset === 'mSOL' && sol) pPrice = sol.price;
                else if (s.asset === 'USDC') pPrice = 1.0;
                else pPrice = eth ? eth.price : 1.0; // Default LP
            }
            stakedVal += s.amount * pPrice;
        });
        const stakePct = (stakedVal / totalValue * 100).toFixed(1);
        set('dig-staked-ratio', stakePct + '%');

        // 冷錢包保管佔比
        const coldVal = WALLETS.filter(w => w.type === '硬體冷錢包').reduce((sum, w) => sum + w.value, 0);
        const coldPct = Math.round(coldVal / totalValue * 100);
        set('dig-custody-cold', coldPct + '%');
    }

    // ── 渲染錢包列表 ──────────────────────────────────────────────
    function renderWalletsTable() {
        const tbody = document.getElementById('digWalletsTableBody');
        if (!tbody) return;

        tbody.innerHTML = WALLETS.map((w, idx) => {
            const shortAddr = w.address.slice(0, 6) + '...' + w.address.slice(-6);
            const wType = window.t(walletTypeMap[w.type] || w.type, w.type);
            const wChain = window.t('chain_' + w.chain.toLowerCase().slice(0, 3), w.chain);
            return `<tr>
                <td style="font-weight:600;">${w.name}</td>
                <td>
                    <span class="chain-badge badge-${w.chain.toLowerCase().slice(0, 3)}">${wChain}</span>
                </td>
                <td class="text-muted">${wType}</td>
                <td style="font-family: monospace; color: #a0aec0;">
                    <span>${shortAddr}</span>
                    <button class="btn-copy" onclick="navigator.clipboard.writeText('${w.address}'); alert('${window.t('alert_address_copied', '地址已複製！')}')" style="background:none; border:none; color:var(--brand-primary-light); cursor:pointer; margin-left:6px;" title="${window.t('th_wallet_address', '錢包地址')}">📋</button>
                </td>
                <td style="font-weight:600; color: #cbd5e0;">${w.balance.toLocaleString()} ${w.isUSDC ? 'USDC' : w.chain === 'Bitcoin' ? 'BTC' : w.chain === 'Ethereum' ? 'ETH' : 'SOL'}</td>
                <td style="font-weight:600; color: #10b981;">${fmt(w.value)}</td>
                <td>
                    <button class="btn btn-secondary" onclick="window.removeWallet(${idx})" style="padding: 2px 8px; font-size: 0.72rem; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25);">
                        ${window.t('btn_remove', '移除')}
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    // ── 移除錢包 ──────────────────────────────────────────────────
    window.removeWallet = function (idx) {
        if (confirm(window.t('confirm_remove_wallet', '確定要移除錢包 "{name}" 嗎？').replace('{name}', WALLETS[idx].name))) {
            WALLETS.splice(idx, 1);
            updateDigitalValuations();
        }
    };

    // ── 渲染 DeFi 質押列表 ─────────────────────────────────────────
    function renderDefiTable() {
        const tbody = document.getElementById('digDefiTableBody');
        if (!tbody) return;

        tbody.innerHTML = DEFI_STAKES.map(s => {
            const rColor = s.risk.includes('低') ? '#10b981' : '#f59e0b';
            const riskText = window.t(riskKeyMap[s.risk] || s.risk, s.risk);
            return `<tr>
                <td style="font-weight:600;">${s.protocol}</td>
                <td class="text-muted">${s.asset}</td>
                <td style="font-weight:600; color:#e2e8f0;">${s.amount.toLocaleString()} ${s.asset}</td>
                <td style="color:#34d399; font-weight:700;">${s.apy.toFixed(1)}%</td>
                <td class="text-muted">${s.lockup}</td>
                <td style="color:#10b981; font-weight:600;">$${s.earned.toLocaleString()}</td>
                <td>
                    <span style="background:${rColor}22; color:${rColor}; padding:2px 8px; border-radius:99px; font-size:0.75rem; font-weight:600;">${riskText}</span>
                </td>
            </tr>`;
        }).join('');
    }

    // ── 渲染交易歷史日誌 ───────────────────────────────────────────
    function renderTxTable() {
        const tbody = document.getElementById('digTxTableBody');
        if (!tbody) return;

        tbody.innerHTML = TRANSACTIONS.map(tx => {
            const txType = window.t(txTypeMap[tx.type] || tx.type, tx.type);
            const txChain = window.t('chain_' + tx.chain.toLowerCase().slice(0,3), tx.chain);
            const txTime = window.t(txTimeMap[tx.time] || tx.time, tx.time);
            return `<tr>
                <td style="font-family: monospace; color:#a0aec0;">${tx.hash}</td>
                <td>
                    <span class="chain-badge badge-${tx.chain.toLowerCase().slice(0,3)}">${txChain}</span>
                </td>
                <td style="font-weight:600;">${txType}</td>
                <td style="color:#cbd5e0; font-weight:600;">${tx.value}</td>
                <td style="color:#10b981; font-weight:600;">🟢 ${window.t('status_success', tx.status)}</td>
                <td class="text-muted">${txTime}</td>
            </tr>`;
        }).join('');
    }

    // ── 模擬 Gas Price 與 Network TPS 波動 (加強動態 micro-animations) ──
    function startGasSimulation() {
        const ethVal = document.getElementById('gas-eth-val');
        const ethFast = document.getElementById('gas-eth-fast');
        const ethNormal = document.getElementById('gas-eth-normal');
        const ethSlow = document.getElementById('gas-eth-slow');
        const ethGasCardVal = document.getElementById('dig-gas-price');

        const solVal = document.getElementById('gas-sol-val');
        const arbVal = document.getElementById('gas-arb-val');

        setInterval(() => {
            // Ethereum Mainnet Gas Fluctuation
            const ethBase = Math.floor(22 + Math.random() * 15);
            if (ethVal) ethVal.textContent = ethBase + ' Gwei';
            if (ethGasCardVal) ethGasCardVal.textContent = ethBase + ' Gwei';
            if (ethNormal) ethNormal.textContent = ethBase;
            if (ethFast) ethFast.textContent = Math.round(ethBase * 1.15);
            if (ethSlow) ethSlow.textContent = Math.round(ethBase * 0.8);

            // Solana Gas Fluctuation (TPS based micro fee)
            const solBase = (0.00004 + Math.random() * 0.00003).toFixed(5);
            if (solVal) solVal.textContent = solBase + ' SOL';

            // Arbitrum Gas Fluctuation
            const arbBase = (0.10 + Math.random() * 0.08).toFixed(2);
            if (arbVal) arbVal.textContent = arbBase + ' Gwei';

        }, 4000);
    }

    // ── 連結新錢包彈窗邏輯與事件綁定 ──────────────────────────────────
    function setupWalletModal() {
        const modal = document.getElementById('connectWalletModal');
        const openBtn = document.getElementById('connectWalletBtn');
        const closeBtn = document.getElementById('closeWalletModalBtn');
        const form = document.getElementById('connectWalletForm');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                if (modal) modal.style.display = 'flex';
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        }

        // 點擊背影關閉彈窗
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('walletName').value;
                const chain = document.getElementById('walletChain').value;
                const type = document.getElementById('walletType').value;
                const address = document.getElementById('walletAddress').value;
                const balance = parseFloat(document.getElementById('walletBalance').value);

                // 新增錢包
                WALLETS.push({
                    name,
                    chain,
                    type,
                    address,
                    balance,
                    value: 0 // 將經由重新計算得出
                });

                // 新增鏈上日誌
                TRANSACTIONS.unshift({
                    hash: '0x' + Math.random().toString(16).slice(2, 6) + '...' + Math.random().toString(16).slice(2, 6),
                    chain,
                    type: `錢包連結 & 同步`,
                    value: `${balance.toLocaleString()} ${chain === 'Bitcoin' ? 'BTC' : chain === 'Ethereum' ? 'ETH' : 'SOL'}`,
                    status: '成功',
                    time: '剛剛'
                });

                // 重置表單並關閉
                form.reset();
                if (modal) modal.style.display = 'none';

                // 重新計算與渲染
                updateDigitalValuations();
                renderTxTable();
                alert(`✅ ${window.t('alert_wallet_connected', '錢包已成功連結，鏈上資產同步完成！').replace('{name}', name)}`);
            });
        }
    }

    // ── 暴露的渲染函數 ──
    window.renderDigital = function() {
        renderWalletsTable();
        renderDefiTable();
        renderTxTable();
        updateDigitalValuations();
    };

    // ── 數位資產管理初始化 ──────────────────────────────────────────
    let initialized = false;
    window.initDigitalTab = function () {
        if (initialized) return;
        initialized = true;

        setupWalletModal();
        window.renderDigital();
        startGasSimulation();
    };

    // 被 portfolio.js 用於更新的掛接鉤子
    window.syncDigitalAssetQuotes = function (portfolio) {
        updateDigitalValuations();
    };

})();


