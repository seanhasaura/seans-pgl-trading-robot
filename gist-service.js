/**
 * gist-service.js - PGL Trading Bot Gist Data Service
 * 負責非同步讀取 GitHub Secret Gists 中的實時交易數據並進行解析
 */

window.GIST_CONFIG = {
    EQUITY_ID: 'e2e63d2c3c4b7d2e8a0e3d79ac3a1a6b',
    TRADE_HISTORY_ID: '2ce3f9f343563e7a079cf816f1aee314',
    SIMILAR_DAYS_ID: '9c1075c5aea0e37e716ecad7919338da'
};

/**
 * 從 GitHub Gist API 擷取內容
 * @param {string} gistId 
 * @param {string|null} targetFileName 
 * @returns {Promise<string|null>}
 */
async function fetchGistContent(gistId, targetFileName = null) {
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.files || Object.keys(data.files).length === 0) {
            return null;
        }

        let fileObj = null;
        if (targetFileName && data.files[targetFileName]) {
            fileObj = data.files[targetFileName];
        } else {
            const firstFileKey = Object.keys(data.files)[0];
            fileObj = data.files[firstFileKey];
        }

        // 若檔案較大被 GitHub API 截斷，自動使用 raw_url 抓取完整內容
        if (fileObj.truncated && fileObj.raw_url) {
            const rawRes = await fetch(fileObj.raw_url, { cache: 'no-store' });
            return await rawRes.text();
        }

        return fileObj.content;
    } catch (error) {
        console.error(`[GistService] 抓取 Gist [${gistId}] 失敗:`, error);
        return null;
    }
}

/**
 * 簡易 CSV 解析器
 * @param {string} csvText 
 * @returns {Array<Object>}
 */
function parseCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];
    
    // 清除不可見字元與 Windows 換行符
    const lines = csvText.replace(/\r/g, '').trim().split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        return row;
    });
}

window.GistService = {
    /**
     * 讀取歷史淨值資料 (JSON 格式)
     * 預設讀取 equity_Portfolio_TradeBot_6346149.json
     * [{ "timestamp": "...", "equity": 31700.35 }]
     */
    async getAccountEquity(targetFileName = 'equity_Portfolio_TradeBot_6346149.json') {
        const rawContent = await fetchGistContent(window.GIST_CONFIG.EQUITY_ID, targetFileName);
        if (!rawContent) return [];
        try {
            return JSON.parse(rawContent);
        } catch (e) {
            console.error('[GistService] 解析 Account Equity JSON 失敗:', e);
            return [];
        }
    },

    /**
     * 讀取統一交易明細資料 (CSV 格式)
     * unified_trade_history.csv
     */
    async getTradeHistory() {
        const rawContent = await fetchGistContent(window.GIST_CONFIG.TRADE_HISTORY_ID, 'unified_trade_history.csv');
        return parseCSV(rawContent);
    },

    /**
     * 讀取相似天數資料 (CSV 格式)
     * 例如 NAS100_daily_similar_days.csv 或 EURUSD_daily_similar_details.csv
     */
    async getSimilarDays(assetName = 'NAS100', isFX = false) {
        const fileName = isFX 
            ? `${assetName}_daily_similar_details.csv`
            : `${assetName}_daily_similar_days.csv`;

        const rawContent = await fetchGistContent(window.GIST_CONFIG.SIMILAR_DAYS_ID, fileName);
        return parseCSV(rawContent);
    }
};
