
// ================================================================
// PGL 家族辦公室 — PDF 報告產生器 v3
// 使用瀏覽器原生列印 + 系統中文字型（無 CDN 依賴，解決亂碼）
// ================================================================
(function () {
    'use strict';

    // 系統中文字型優先順序：Windows → macOS → Linux
    const CJK_FONT = [
        '"Microsoft JhengHei"',   // Windows 繁體中文
        '"Microsoft YaHei"',      // Windows 簡體中文
        '"PingFang TC"',          // macOS 繁體
        '"Heiti TC"',             // macOS 舊版
        '"Noto Sans CJK TC"',     // Linux
        '"WenQuanYi Micro Hei"',  // Linux fallback
        'sans-serif',
    ].join(', ');

    function fmt(n) {
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
        return '$' + n.toFixed(0);
    }

    function getChartImg(id) {
        const el = document.getElementById(id);
        if (!el) return '';
        try { return el.toDataURL('image/png', 1.0); } catch (e) { return ''; }
    }

    function buildHTML(userName, today) {
        // 擷取圖表圖片（必須在 portfolio tab 已初始化後）
        const allocImg   = getChartImg('allocChart');
        const geoImg     = getChartImg('geoChart');
        const currImg    = getChartImg('currencyChart');

        // logo 路徑（同源）
        const logoSrc = window.location.origin + '/logo.png';

        return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>PGL 家族辦公室投資報告 ${today}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:   #0a0f18;
    --brand:  #678B91;
    --brandL: #8cb1b7;
    --green:  #10b981;
    --red:    #ef4444;
    --purple: #818cf8;
    --amber:  #f59e0b;
    --muted:  #64748b;
    --border: #e2e8f0;
    --bg:     #f8fafc;
    --font:   ${CJK_FONT};
  }

  body {
    font-family: var(--font);
    font-size: 10pt;
    color: var(--navy);
    background: white;
    line-height: 1.55;
  }

  /* ── 工具列（列印時隱藏）────────────────────── */
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: var(--navy); color: white;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .toolbar h2 { font-size: 14px; font-weight: 600; flex: 1; }
  .btn-print {
    background: var(--brand); color: white; border: none;
    padding: 8px 20px; border-radius: 6px; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit;
    transition: opacity 0.2s;
  }
  .btn-print:hover { opacity: 0.85; }
  .btn-close {
    background: transparent; color: #aaa; border: 1px solid #444;
    padding: 8px 14px; border-radius: 6px; font-size: 13px;
    cursor: pointer; font-family: inherit;
  }
  .report-wrap { margin-top: 52px; }

  /* ── 頁面共用 ────────────────────────────────── */
  .page {
    width: 210mm; min-height: 297mm;
    margin: 0 auto 8mm;
    position: relative;
    background: white;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  }

  /* ── 封面 ───────────────────────────────────── */
  .cover {
    background: var(--navy);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 297mm; padding: 40mm 20mm;
    position: relative; overflow: hidden;
    page-break-after: always;
  }
  .cover::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: var(--brand);
  }
  .cover::after {
    content: '';
    position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
    background: var(--brand);
  }
  .cover-glow {
    position: absolute; width: 300px; height: 300px;
    border-radius: 50%; background: rgba(103,139,145,0.12);
    filter: blur(60px); top: 10%; right: -5%;
  }
  .cover-logo-wrap {
    width: 100px; height: 100px; border-radius: 50%;
    background: rgba(103,139,145,0.15);
    border: 2px solid rgba(103,139,145,0.4);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 28px; overflow: hidden;
  }
  .cover-logo-wrap img { width: 80px; height: 80px; object-fit: contain; border-radius: 50%; }
  .cover h1 {
    font-size: 26pt; font-weight: 900; color: white;
    letter-spacing: -0.5px; text-align: center; margin-bottom: 8px;
  }
  .cover-sub {
    font-size: 11pt; font-weight: 300; color: var(--brandL);
    letter-spacing: 3px; text-align: center; margin-bottom: 36px;
  }
  .cover-divider {
    width: 60mm; height: 1px; background: var(--brand);
    opacity: 0.5; margin: 0 auto 32px;
  }
  .cover-meta { text-align: center; }
  .cover-meta p { color: #b0c4cc; margin-bottom: 8px; font-size: 10pt; }
  .cover-meta strong { color: white; }
  .cover-disclaimer {
    position: absolute; bottom: 18mm; left: 20mm; right: 20mm;
    text-align: center; font-size: 7pt; color: #4a6070;
    line-height: 1.6;
  }

  /* ── 內頁共用 ───────────────────────────────── */
  .page-header {
    background: var(--navy); color: white;
    padding: 14px 18px 12px; display: flex;
    align-items: center; gap: 12px;
  }
  .page-header-logo {
    width: 28px; height: 28px; border-radius: 50%; overflow: hidden;
  }
  .page-header-logo img { width: 100%; height: 100%; object-fit: contain; }
  .page-header h2 { font-size: 13pt; font-weight: 700; flex: 1; }
  .page-header .header-meta { font-size: 8pt; color: var(--brandL); text-align: right; }
  .page-body { padding: 14px 18px 16px; }

  .section-title {
    font-size: 11pt; font-weight: 700; color: var(--navy);
    margin: 14px 0 8px;
    display: flex; align-items: center; gap: 8px;
  }
  .section-title::before {
    content: ''; width: 4px; height: 16px;
    background: var(--brand); border-radius: 2px; flex-shrink: 0;
  }

  /* ── 指標卡片 ───────────────────────────────── */
  .metrics-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 8px; margin-bottom: 14px;
  }
  .metric-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px; text-align: center;
  }
  .metric-label { font-size: 7.5pt; color: var(--muted); margin-bottom: 4px; }
  .metric-value { font-size: 14pt; font-weight: 800; }
  .col-purple { color: var(--purple); }
  .col-green  { color: var(--green); }
  .col-brand  { color: var(--brand); }
  .col-navy   { color: var(--navy); }
  .col-red    { color: var(--red); }
  .col-amber  { color: var(--amber); }

  /* ── 表格 ───────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  thead th {
    background: var(--navy); color: white;
    padding: 6px 8px; text-align: left; font-weight: 600;
  }
  tbody td { padding: 5px 8px; border-bottom: 1px solid var(--border); }
  tbody tr:nth-child(even) td { background: var(--bg); }
  tbody tr:last-child td { font-weight: 700; border-top: 2px solid var(--brand); }
  .ta-r { text-align: right; }
  .td-green { color: var(--green); font-weight: 600; }
  .td-red   { color: var(--red); font-weight: 600; }
  .badge {
    display: inline-block; padding: 2px 7px; border-radius: 99px;
    font-size: 7.5pt; font-weight: 600;
  }
  .badge-t0  { background: #d1fae5; color: #065f46; }
  .badge-t2  { background: #dcfce7; color: #166534; }
  .badge-30  { background: #fef3c7; color: #92400e; }
  .badge-90  { background: #fee2e2; color: #991b1b; }

  /* ── 圖表區 ─────────────────────────────────── */
  .charts-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;
  }
  .chart-box { text-align: center; }
  .chart-box img { width: 100%; max-height: 80mm; object-fit: contain; }
  .chart-full img { width: 100%; max-height: 55mm; object-fit: contain; }

  /* ── 流動性階梯 ─────────────────────────────── */
  .liq-table { width: 100%; border-collapse: collapse; }
  .liq-table td { padding: 4px 6px; vertical-align: middle; }
  .liq-bar-bg { background: #eee; border-radius: 4px; height: 12px; overflow: hidden; }
  .liq-bar-fill { height: 100%; border-radius: 4px; }

  /* ── 頁尾 ───────────────────────────────────── */
  .page-footer {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 8px 18px; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
    font-size: 7pt; color: var(--muted);
  }
  .page-footer .brand { color: var(--brand); font-weight: 600; }

  /* ── 列印設定 ───────────────────────────────── */
  @media print {
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; }
    .toolbar { display: none !important; }
    .report-wrap { margin-top: 0; }
    .page {
      width: 210mm; min-height: 297mm; margin: 0;
      box-shadow: none; page-break-after: always;
    }
    .cover { page-break-after: always; }
  }
</style>
</head>
<body>

<!-- 工具列 -->
<div class="toolbar no-print">
  <div class="cover-logo-wrap" style="width:32px;height:32px;margin:0;">
    <img src="${logoSrc}" alt="PGL">
  </div>
  <h2>PGL 家族辦公室投資報告 — ${today}</h2>
  <button class="btn-close" onclick="window.close()">✕ 關閉</button>
  <button class="btn-print" onclick="window.print()">🖨️ 列印 / 儲存 PDF</button>
</div>

<div class="report-wrap">

<!-- ════════════════════════════════════════════ -->
<!-- PAGE 1：封面                                  -->
<!-- ════════════════════════════════════════════ -->
<div class="page cover">
  <div class="cover-glow"></div>
  <div class="cover-logo-wrap">
    <img src="${logoSrc}" alt="PGL Logo">
  </div>
  <h1>家族辦公室投資報告</h1>
  <p class="cover-sub">FAMILY OFFICE INVESTMENT REPORT</p>
  <div class="cover-divider"></div>
  <div class="cover-meta">
    <p>報告日期：<strong>${today}</strong></p>
    <p>受益人：<strong>${userName}</strong></p>
    <p>資料基準貨幣：<strong>USD</strong></p>
    <p style="margin-top:16px;color:#6a8a9a;">總資產規模 (AUM)</p>
    <p style="font-size:28pt;font-weight:900;color:#818cf8;margin-top:4px;">$4.27M</p>
    <p style="color:#10b981;font-size:11pt;margin-top:4px;">今日 +$12,480 (+0.29%)</p>
  </div>
  <div class="cover-disclaimer">
    本報告所載資料僅供參考，不構成任何投資建議。過去績效不代表未來表現。<br>
    本文件為機密文件，僅供受益人本人閱覽，未經授權請勿轉發。
  </div>
</div>

<!-- ════════════════════════════════════════════ -->
<!-- PAGE 2：執行摘要                              -->
<!-- ════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo"><img src="${logoSrc}" alt="PGL"></div>
    <h2>執行摘要 / Executive Summary</h2>
    <div class="header-meta">PGL Family Office<br>${today}</div>
  </div>
  <div class="page-body">

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">總資產規模 (AUM)</div>
        <div class="metric-value col-purple">$4.27M</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">今日損益</div>
        <div class="metric-value col-green">+$12,480</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">今日報酬率</div>
        <div class="metric-value col-green">+0.29%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">持倉標的數</div>
        <div class="metric-value col-navy">16 標的</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">資產類別</div>
        <div class="metric-value col-navy">6 類</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">可動用流動性 (T+2)</div>
        <div class="metric-value col-brand">$2.77M</div>
      </div>
    </div>

    <p class="section-title">資產類別配置</p>
    <table>
      <thead><tr><th>資產類別</th><th class="ta-r">市值 (USD)</th><th class="ta-r">佔比</th><th>流動性</th></tr></thead>
      <tbody>
        <tr><td>美股 / 全球股票</td><td class="ta-r">$1,620,000</td><td class="ta-r">37.9%</td><td>T+2</td></tr>
        <tr><td>債券</td><td class="ta-r">$856,000</td><td class="ta-r">20.0%</td><td>T+2 / 30日</td></tr>
        <tr><td>不動產</td><td class="ta-r">$640,000</td><td class="ta-r">15.0%</td><td>90日+</td></tr>
        <tr><td>大宗商品</td><td class="ta-r">$428,000</td><td class="ta-r">10.0%</td><td>30日</td></tr>
        <tr><td>數位資產</td><td class="ta-r">$513,600</td><td class="ta-r">12.0%</td><td>T+0</td></tr>
        <tr><td>現金 / 類現金</td><td class="ta-r">$214,000</td><td class="ta-r">5.0%</td><td>T+0</td></tr>
        <tr><td><strong>合計</strong></td><td class="ta-r"><strong>$4,271,600</strong></td><td class="ta-r"><strong>100.0%</strong></td><td>—</td></tr>
      </tbody>
    </table>

    <p class="section-title" style="margin-top:16px;">地理分布</p>
    <table>
      <thead><tr><th>地區</th><th class="ta-r">佔比</th><th>主要資產</th></tr></thead>
      <tbody>
        <tr><td>北美</td><td class="ta-r">45%</td><td>NVDA, AAPL, SPY, 美國國債, REITs</td></tr>
        <tr><td>亞太</td><td class="ta-r">25%</td><td>台北商辦, Nikkei ETF, NTD存款, 黃金</td></tr>
        <tr><td>數位 / 全球</td><td class="ta-r">14%</td><td>Bitcoin, Ethereum, SOL, 原油期貨</td></tr>
        <tr><td>歐洲</td><td class="ta-r">10%</td><td>歐元資產, FTSE ETF</td></tr>
        <tr><td>其他</td><td class="ta-r">6%</td><td>新興市場</td></tr>
      </tbody>
    </table>

    <p class="section-title" style="margin-top:16px;">幣別曝險</p>
    <table>
      <thead><tr><th>幣別</th><th class="ta-r">曝險佔比</th><th class="ta-r">約當市值 (USD)</th></tr></thead>
      <tbody>
        <tr><td>USD 美元</td><td class="ta-r">58%</td><td class="ta-r">$2,477,528</td></tr>
        <tr><td>NTD 新台幣</td><td class="ta-r">15%</td><td class="ta-r">$640,740</td></tr>
        <tr><td>BTC / ETH 數位貨幣</td><td class="ta-r">12%</td><td class="ta-r">$512,592</td></tr>
        <tr><td>JPY 日圓</td><td class="ta-r">9%</td><td class="ta-r">$384,444</td></tr>
        <tr><td>EUR 歐元</td><td class="ta-r">6%</td><td class="ta-r">$256,296</td></tr>
      </tbody>
    </table>

  </div>
  <div class="page-footer">
    <span class="brand">PGL Family Office</span>
    <span>執行摘要</span>
    <span>第 2 頁 / 共 4 頁</span>
  </div>
</div>

<!-- ════════════════════════════════════════════ -->
<!-- PAGE 3：圖表分析                              -->
<!-- ════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo"><img src="${logoSrc}" alt="PGL"></div>
    <h2>資產配置圖表分析</h2>
    <div class="header-meta">PGL Family Office<br>${today}</div>
  </div>
  <div class="page-body">

    ${(allocImg || geoImg) ? `
    <p class="section-title">資產類別配置 ／ 地理分布</p>
    <div class="charts-row">
      ${allocImg ? `<div class="chart-box"><img src="${allocImg}" alt="資產配置"></div>` : ''}
      ${geoImg   ? `<div class="chart-box"><img src="${geoImg}"   alt="地理分布"></div>` : ''}
    </div>` : ''}

    ${currImg ? `
    <p class="section-title">幣別曝險分布</p>
    <div class="chart-full"><img src="${currImg}" alt="幣別曝險"></div>` : ''}

    <p class="section-title" style="margin-top:14px;">流動性分析</p>
    <table class="liq-table">
      <thead><tr><th style="width:90px;">期限</th><th>分布</th><th class="ta-r" style="width:80px;">市值</th><th class="ta-r" style="width:50px;">佔比</th><th style="width:130px;">主要資產</th></tr></thead>
      <tbody>
        <tr>
          <td><span class="badge badge-t0">T+0 即日</span></td>
          <td><div class="liq-bar-bg"><div class="liq-bar-fill" style="width:17%;background:#10b981;"></div></div></td>
          <td class="ta-r td-green">$727,600</td><td class="ta-r">17%</td><td style="font-size:7.5pt;color:#64748b;">數位資產、現金</td>
        </tr>
        <tr>
          <td><span class="badge badge-t2">T+2 兩日</span></td>
          <td><div class="liq-bar-bg"><div class="liq-bar-fill" style="width:48%;background:#34d399;"></div></div></td>
          <td class="ta-r td-green">$2,040,000</td><td class="ta-r">48%</td><td style="font-size:7.5pt;color:#64748b;">美股、ETF</td>
        </tr>
        <tr>
          <td><span class="badge badge-30">30 日內</span></td>
          <td><div class="liq-bar-bg"><div class="liq-bar-fill" style="width:20%;background:#f59e0b;"></div></div></td>
          <td class="ta-r" style="color:#f59e0b;font-weight:600;">$856,000</td><td class="ta-r">20%</td><td style="font-size:7.5pt;color:#64748b;">債券基金、商品期貨</td>
        </tr>
        <tr>
          <td><span class="badge badge-90">90 日以上</span></td>
          <td><div class="liq-bar-bg"><div class="liq-bar-fill" style="width:15%;background:#ef4444;"></div></div></td>
          <td class="ta-r td-red">$648,000</td><td class="ta-r">15%</td><td style="font-size:7.5pt;color:#64748b;">不動產、私募基金</td>
        </tr>
      </tbody>
    </table>

  </div>
  <div class="page-footer">
    <span class="brand">PGL Family Office</span>
    <span>圖表分析</span>
    <span>第 3 頁 / 共 4 頁</span>
  </div>
</div>

<!-- ════════════════════════════════════════════ -->
<!-- PAGE 4：持倉明細                              -->
<!-- ════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="page-header-logo"><img src="${logoSrc}" alt="PGL"></div>
    <h2>持倉明細 / Holdings Detail</h2>
    <div class="header-meta">PGL Family Office<br>${today}</div>
  </div>
  <div class="page-body">
    <p class="section-title">完整持倉一覽</p>
    <table>
      <thead>
        <tr>
          <th>標的</th><th>類別</th><th>地區</th><th>幣別</th>
          <th class="ta-r">市值 (USD)</th><th class="ta-r">佔比</th>
          <th class="ta-r">今日漲跌</th><th>流動性</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>NVDA</td><td>股票</td><td>北美</td><td>USD</td><td class="ta-r">$320,000</td><td class="ta-r">7.5%</td><td class="ta-r td-green">+3.2%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>AAPL</td><td>股票</td><td>北美</td><td>USD</td><td class="ta-r">$280,000</td><td class="ta-r">6.6%</td><td class="ta-r td-green">+0.8%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>SPY ETF</td><td>股票</td><td>北美</td><td>USD</td><td class="ta-r">$480,000</td><td class="ta-r">11.2%</td><td class="ta-r td-green">+0.5%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>QQQ ETF</td><td>股票</td><td>北美</td><td>USD</td><td class="ta-r">$300,000</td><td class="ta-r">7.0%</td><td class="ta-r td-green">+1.1%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>MSFT</td><td>股票</td><td>北美</td><td>USD</td><td class="ta-r">$240,000</td><td class="ta-r">5.6%</td><td class="ta-r td-green">+0.3%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>美國國債 10Y</td><td>債券</td><td>北美</td><td>USD</td><td class="ta-r">$456,000</td><td class="ta-r">10.7%</td><td class="ta-r td-red">-0.1%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>投資級公司債</td><td>債券</td><td>北美</td><td>USD</td><td class="ta-r">$400,000</td><td class="ta-r">9.4%</td><td class="ta-r">0.0%</td><td><span class="badge badge-30">30日</span></td></tr>
        <tr><td>台北商辦</td><td>不動產</td><td>亞太</td><td>NTD</td><td class="ta-r">$400,000</td><td class="ta-r">9.4%</td><td class="ta-r">0.0%</td><td><span class="badge badge-90">90日+</span></td></tr>
        <tr><td>美國 REITs</td><td>不動產</td><td>北美</td><td>USD</td><td class="ta-r">$240,000</td><td class="ta-r">5.6%</td><td class="ta-r td-green">+0.7%</td><td><span class="badge badge-t2">T+2</span></td></tr>
        <tr><td>黃金實物</td><td>商品</td><td>亞太</td><td>USD</td><td class="ta-r">$280,000</td><td class="ta-r">6.6%</td><td class="ta-r td-green">+0.4%</td><td><span class="badge badge-30">30日</span></td></tr>
        <tr><td>原油期貨</td><td>商品</td><td>全球</td><td>USD</td><td class="ta-r">$148,000</td><td class="ta-r">3.5%</td><td class="ta-r td-red">-1.3%</td><td><span class="badge badge-30">30日</span></td></tr>
        <tr><td>Bitcoin</td><td>數位</td><td>全球</td><td>BTC</td><td class="ta-r">$280,000</td><td class="ta-r">6.6%</td><td class="ta-r td-green">+2.4%</td><td><span class="badge badge-t0">T+0</span></td></tr>
        <tr><td>Ethereum</td><td>數位</td><td>全球</td><td>ETH</td><td class="ta-r">$160,000</td><td class="ta-r">3.7%</td><td class="ta-r td-green">+3.8%</td><td><span class="badge badge-t0">T+0</span></td></tr>
        <tr><td>SOL</td><td>數位</td><td>全球</td><td>SOL</td><td class="ta-r">$73,600</td><td class="ta-r">1.7%</td><td class="ta-r td-green">+5.1%</td><td><span class="badge badge-t0">T+0</span></td></tr>
        <tr><td>USD Cash</td><td>現金</td><td>北美</td><td>USD</td><td class="ta-r">$140,000</td><td class="ta-r">3.3%</td><td class="ta-r">0.0%</td><td><span class="badge badge-t0">T+0</span></td></tr>
        <tr><td>NTD 存款</td><td>現金</td><td>亞太</td><td>NTD</td><td class="ta-r">$74,000</td><td class="ta-r">1.7%</td><td class="ta-r">0.0%</td><td><span class="badge badge-t0">T+0</span></td></tr>
        <tr>
          <td><strong>合計</strong></td><td></td><td></td><td></td>
          <td class="ta-r"><strong>$4,271,600</strong></td>
          <td class="ta-r"><strong>100.0%</strong></td>
          <td class="ta-r td-green"><strong>+0.29%</strong></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <p style="font-size:7pt;color:#94a3b8;margin-top:12px;line-height:1.7;">
      * 市值以 USD 計，數位資產依報告日收盤價換算。匯率參考當日銀行牌告匯率。<br>
      * 不動產估值依最近一次評估報告，非即時市場報價。<br>
      * 本報告資料截至 ${today}，如有任何疑問請聯繫您的 PGL 投資顧問。
    </p>
  </div>
  <div class="page-footer">
    <span class="brand">PGL Family Office — Confidential</span>
    <span>持倉明細</span>
    <span>第 4 頁 / 共 4 頁</span>
  </div>
</div>

</div><!-- end report-wrap -->
</body></html>`;
    }

    window.generateReport = function () {
        const btn = document.getElementById('exportReportBtn');
        if (btn) { btn.textContent = '⏳ 產生中...'; btn.disabled = true; }

        const userName = localStorage.getItem('user_name') || 'Family Office';
        const today    = new Date().toLocaleDateString('zh-TW');

        const html = buildHTML(userName, today);
        const win  = window.open('', '_blank', 'width=900,height=800');
        if (!win) { alert('請允許彈出視窗以產生報告'); if (btn) { btn.textContent = '📄 匯出 PDF 報告'; btn.disabled = false; } return; }
        win.document.open();
        win.document.write(html);
        win.document.close();

        if (btn) { btn.textContent = '📄 匯出 PDF 報告'; btn.disabled = false; }
    };

})();


