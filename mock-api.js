(function() {
    const originalFetch = window.fetch;
    
    // Initialize localStorage with mock default data if empty
    if (!localStorage.getItem('mock_initialized')) {
        localStorage.setItem('mock_initialized', 'true');
        const defaultCompanies = [
            { id: "co-1", name: "PGL Group", code: "PGL", color: "#678B91", city: "台北市", note: "創始公司", member_count: 2 },
            { id: "co-2", name: "Vertex Capital", code: "VTX", color: "#10b981", city: "新北市", note: "策略合夥人", member_count: 1 },
            { id: "co-3", name: "Quantum Trading", code: "QTM", color: "#0ea5e9", city: "台中市", note: "專業量化團隊", member_count: 1 }
        ];
        const defaultUsers = [
            { id: "usr_admin", name: "Admin", email: "admin@pgl.com", role: "admin", vip_level: 3, status: "approved", permissions: ["view_dashboard", "view_trading", "view_attribution", "use_bot", "bind_api_keys", "view_vip", "export_data", "view_company_accounts"], note: "系統管理員", company_id: "co-1" },
            { id: "usr-wang", name: "王小明", email: "wang@example.com", role: "member", vip_level: 0, status: "approved", permissions: ["view_dashboard", "view_trading", "use_bot", "bind_api_keys"], note: "正式會員", company_id: "co-1" },
            { id: "usr-lee", name: "李斯", email: "lee@example.com", role: "trial", vip_level: 0, status: "pending", permissions: ["view_dashboard"], note: "待審核的試用會員", company_id: "co-2" },
            { id: "usr-chang", name: "張華", email: "chang@example.com", role: "vip", vip_level: 2, status: "approved", permissions: ["view_dashboard", "view_trading", "view_attribution", "use_bot", "bind_api_keys", "view_vip", "export_data"], note: "金牌 VIP 會員", company_id: "co-3" }
        ];
        localStorage.setItem('mock_companies', JSON.stringify(defaultCompanies));
        localStorage.setItem('mock_users', JSON.stringify(defaultUsers));
        localStorage.setItem('mock_bots', JSON.stringify([]));
        localStorage.setItem('mock_shares', JSON.stringify([]));
    }
    
    // Helper to fluctuate quotes
    const BASELINE_PRICES = {
        'NVDA': 120.0, 'AAPL': 180.0, 'SPY': 520.0, 'QQQ': 440.0, 'MSFT': 420.0,
        'TLT': 95.0, 'LQD': 105.0, 'VNQ': 80.0, 'GLD': 2300.0, 'USO': 78.0,
        'bitcoin': 65000.0, 'ethereum': 3200.0, 'solana': 150.0
    };
    
    window.fetch = async function(url, options) {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        const method = (options && options.method || 'GET').toUpperCase();
        
        let body = {};
        if (options && options.body) {
            try { body = JSON.parse(options.body); } catch(e) {}
        }
        
        const getJSONResponse = (data, status = 200) => {
            return Promise.resolve({
                ok: status >= 200 && status < 300,
                status: status,
                json: () => Promise.resolve(data),
                text: () => Promise.resolve(JSON.stringify(data))
            });
        };
        
        const getErrorResponse = (msg, status = 400) => {
            return Promise.resolve({
                ok: false,
                status: status,
                json: () => Promise.resolve({ detail: msg }),
                text: () => Promise.resolve(JSON.stringify({ detail: msg }))
            });
        };
        
        // --- ROUTING ---
        if (path === '/api/config') {
            return getJSONResponse({ google_client_id: "" });
        }
        
        if (path === '/api/auth/google') {
            const users = JSON.parse(localStorage.getItem('mock_users'));
            let u = users.find(x => x.email === 'google_user@gmail.com');
            if (!u) {
                u = { id: "usr_google", name: "Google User", email: "google_user@gmail.com", role: "member", vip_level: 0, status: "approved", permissions: ["view_dashboard", "view_trading", "use_bot", "bind_api_keys"], note: "Google Login", company_id: null };
                users.push(u);
                localStorage.setItem('mock_users', JSON.stringify(users));
            }
            return getJSONResponse(u);
        }
        
        if (path === '/api/register') {
            const users = JSON.parse(localStorage.getItem('mock_users'));
            if (users.find(x => x.email === body.email)) {
                return getErrorResponse("電子郵件已被註冊！");
            }
            const newUser = {
                id: "usr_" + Math.random().toString(36).slice(2, 10),
                name: body.name,
                email: body.email,
                role: "member",
                vip_level: 0,
                status: "pending",
                permissions: ["view_dashboard", "view_trading", "use_bot", "bind_api_keys"],
                note: "",
                company_id: body.company_id
            };
            users.push(newUser);
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "註冊成功，請等待管理員核准開通。" });
        }
        
        if (path === '/api/login') {
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.email === body.email);
            if (!u) return getErrorResponse("帳號不存在！");
            if (u.status !== 'approved') return getErrorResponse("您的帳號目前為「待審核」狀態，請等待管理員開通。");
            return getJSONResponse(u);
        }
        
        if (path === '/api/user_info') {
            const email = urlObj.searchParams.get('email');
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.email === email);
            if (!u) return getErrorResponse("User not found", 404);
            return getJSONResponse({ id: u.id, role: u.role, vip_level: u.vip_level });
        }
        
        if (path === '/api/bind_keys') {
            return getJSONResponse({ message: `成功綁定 ${body.exchange} 金鑰。` });
        }
        
        if (path === '/api/users') {
            const search = urlObj.searchParams.get('search') || '';
            const status = urlObj.searchParams.get('status') || '';
            const role = urlObj.searchParams.get('role') || '';
            const company_id = urlObj.searchParams.get('company_id') || '';
            
            let users = JSON.parse(localStorage.getItem('mock_users'));
            const cos = JSON.parse(localStorage.getItem('mock_companies'));
            
            users = users.map(u => {
                const c = cos.find(co => co.id === u.company_id);
                return {
                    ...u,
                    company_name: c ? c.name : null,
                    company_city: c ? c.city : null
                };
            });
            
            if (search) {
                users = users.filter(x => x.name.includes(search) || x.email.includes(search));
            }
            if (status) {
                users = users.filter(x => x.status === status);
            }
            if (role) {
                users = users.filter(x => x.role === role);
            }
            if (company_id) {
                if (company_id === '__none__') {
                    users = users.filter(x => !x.company_id);
                } else {
                    users = users.filter(x => x.company_id === company_id);
                }
            }
            return getJSONResponse(users);
        }
        
        if (path === '/api/stats') {
            const users = JSON.parse(localStorage.getItem('mock_users'));
            return getJSONResponse({
                total: users.length,
                pending: users.filter(x => x.status === 'pending').length,
                approved: users.filter(x => x.status === 'approved').length,
                vips: users.filter(x => x.role === 'vip').length,
                admins: users.filter(x => x.role === 'admin').length
            });
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/approve/)) {
            const uid = path.split('/')[3];
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.id === uid);
            if (u) u.status = 'approved';
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "會員已核准開通。" });
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/reject/)) {
            const uid = path.split('/')[3];
            let users = JSON.parse(localStorage.getItem('mock_users'));
            users = users.filter(x => x.id !== uid);
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "申請已拒絕並刪除。" });
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/role/)) {
            const uid = path.split('/')[3];
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.id === uid);
            if (u) {
                u.role = body.role;
                const perms = {
                    admin: ["view_dashboard", "view_trading", "view_attribution", "use_bot", "bind_api_keys", "view_vip", "export_data", "view_company_accounts"],
                    vip: ["view_dashboard", "view_trading", "view_attribution", "use_bot", "bind_api_keys", "view_vip", "export_data"],
                    member: ["view_dashboard", "view_trading", "use_bot", "bind_api_keys"],
                    trial: ["view_dashboard"],
                    disabled: []
                }[body.role] || ["view_dashboard"];
                u.permissions = perms;
                localStorage.setItem('mock_users', JSON.stringify(users));
                return getJSONResponse({ permissions: perms });
            }
            return getErrorResponse("User not found");
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/vip/)) {
            const uid = path.split('/')[3];
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.id === uid);
            if (u) u.vip_level = body.vip_level;
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "VIP等級更新成功。" });
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/permissions/)) {
            const uid = path.split('/')[3];
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.id === uid);
            if (u) u.permissions = body.permissions;
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "權限修改成功。" });
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/note/)) {
            const uid = path.split('/')[3];
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.id === uid);
            if (u) u.note = body.note;
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "備註已更新。" });
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/company/)) {
            const uid = path.split('/')[3];
            const users = JSON.parse(localStorage.getItem('mock_users'));
            const u = users.find(x => x.id === uid);
            if (u) u.company_id = body.company_id;
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "公司歸屬已更新。" });
        }
        
        if (path === '/api/users/bulk') {
            const users = JSON.parse(localStorage.getItem('mock_users'));
            if (body.action === 'approve') {
                body.user_ids.forEach(uid => {
                    const u = users.find(x => x.id === uid);
                    if (u) u.status = 'approved';
                });
            } else if (body.action === 'reject') {
                localStorage.setItem('mock_users', JSON.stringify(users.filter(x => !body.user_ids.includes(x.id))));
                return getJSONResponse({ message: `成功批次刪除 ${body.user_ids.length} 位使用者！` });
            } else if (body.action === 'set_role') {
                body.user_ids.forEach(uid => {
                    const u = users.find(x => x.id === uid);
                    if (u) {
                        u.role = body.value;
                        u.permissions = {
                            admin: ["view_dashboard", "view_trading", "view_attribution", "use_bot", "bind_api_keys", "view_vip", "export_data", "view_company_accounts"],
                            vip: ["view_dashboard", "view_trading", "view_attribution", "use_bot", "bind_api_keys", "view_vip", "export_data"],
                            member: ["view_dashboard", "view_trading", "use_bot", "bind_api_keys"],
                            trial: ["view_dashboard"],
                            disabled: []
                        }[body.value] || ["view_dashboard"];
                    }
                });
            }
            localStorage.setItem('mock_users', JSON.stringify(users));
            return getJSONResponse({ message: "批次操作完成。" });
        }
        
        if (path === '/api/permissions/list') {
            return getJSONResponse({
                "view_dashboard": "查看儀表板",
                "view_trading": "查看交易數據",
                "view_attribution": "歸因分析",
                "use_bot": "使用交易機器人",
                "bind_api_keys": "綁定 API 金鑰",
                "view_vip": "VIP 專屬功能",
                "export_data": "匯出資料",
                "view_company_accounts": "觀看同公司帳戶"
            });
        }
        
        if (path === '/api/companies') {
            if (method === 'POST') {
                const cos = JSON.parse(localStorage.getItem('mock_companies'));
                if (cos.find(x => x.code === body.code)) return getErrorResponse("公司代碼已被使用！");
                const newCo = { id: "co-" + Math.random().toString(36).slice(2,10), name: body.name, code: body.code, color: body.color, city: body.city, note: body.note, member_count: 0 };
                cos.push(newCo);
                localStorage.setItem('mock_companies', JSON.stringify(cos));
                return getJSONResponse({ message: "公司建立成功！" });
            }
            const cos = JSON.parse(localStorage.getItem('mock_companies'));
            const users = JSON.parse(localStorage.getItem('mock_users'));
            cos.forEach(co => {
                co.member_count = users.filter(u => u.company_id === co.id).length;
            });
            localStorage.setItem('mock_companies', JSON.stringify(cos));
            return getJSONResponse(cos);
        }
        
        if (path.match(/\/api\/companies\/([^\/]+)/)) {
            const cid = path.split('/')[3];
            if (method === 'DELETE') {
                let cos = JSON.parse(localStorage.getItem('mock_companies'));
                const users = JSON.parse(localStorage.getItem('mock_users'));
                if (users.some(u => u.company_id === cid)) return getErrorResponse("該公司底下仍有會員，無法刪除！");
                cos = cos.filter(x => x.id !== cid);
                localStorage.setItem('mock_companies', JSON.stringify(cos));
                return getJSONResponse({ message: "公司已刪除。" });
            }
            if (method === 'PUT') {
                const cos = JSON.parse(localStorage.getItem('mock_companies'));
                const co = cos.find(x => x.id === cid);
                if (co) {
                    if (body.name) co.name = body.name;
                    if (body.code) co.code = body.code;
                    if (body.color) co.color = body.color;
                    if (body.city) co.city = body.city;
                    if (body.note) co.note = body.note;
                    localStorage.setItem('mock_companies', JSON.stringify(cos));
                    return getJSONResponse({ message: "公司資料修改成功！" });
                }
            }
        }
        
        if (path.match(/\/api\/users\/([^\/]+)\/shares/)) {
            const uid = path.split('/')[3];
            if (method === 'POST') {
                const shares = JSON.parse(localStorage.getItem('mock_shares'));
                const users = JSON.parse(localStorage.getItem('mock_users'));
                const target = users.find(x => x.email === body.member_email);
                if (!target) return getErrorResponse("該 Email 尚未註冊！");
                if (shares.some(x => x.owner_id === uid && x.member_email === body.member_email)) return getErrorResponse("已授權過此帳號，無須重複新增！");
                const newShare = { id: "sh-" + Math.random().toString(36).slice(2,10), owner_id: uid, member_email: body.member_email, member_name: target.name, access_role: body.access_role, granted_at: new Date().toISOString() };
                shares.push(newShare);
                localStorage.setItem('mock_shares', JSON.stringify(shares));
                return getJSONResponse({ message: "授權成功！" });
            }
            const shares = JSON.parse(localStorage.getItem('mock_shares')).filter(x => x.owner_id === uid);
            return getJSONResponse(shares);
        }
        
        if (path.match(/\/api\/shares\/([^\/]+)/)) {
            const sid = path.split('/')[3];
            if (method === 'DELETE') {
                let shares = JSON.parse(localStorage.getItem('mock_shares'));
                shares = shares.filter(x => x.id !== sid);
                localStorage.setItem('mock_shares', JSON.stringify(shares));
                return getJSONResponse({ message: "授權已移除。" });
            }
        }
        
        if (path === '/api/bots') {
            const uid = urlObj.searchParams.get('user_id');
            const bots = JSON.parse(localStorage.getItem('mock_bots')).filter(x => x.user_id === uid);
            return getJSONResponse(bots);
        }
        
        if (path.match(/\/api\/bots\/([^\/]+)/)) {
            const bid = path.split('/')[3];
            if (method === 'DELETE') {
                let bots = JSON.parse(localStorage.getItem('mock_bots'));
                bots = bots.filter(x => x.id !== bid);
                localStorage.setItem('mock_bots', JSON.stringify(bots));
                return getJSONResponse({ message: "機器人已刪除。" });
            }
            if (method === 'PUT') {
                const bots = JSON.parse(localStorage.getItem('mock_bots'));
                const b = bots.find(x => x.id === bid);
                if (b) {
                    if (body.name) b.name = body.name;
                    if (body.strategy) b.strategy = body.strategy;
                    if (body.max_pos) b.max_pos = body.max_pos;
                    if (body.stop_loss) b.stop_loss = body.stop_loss;
                    if (body.take_profit) b.take_profit = body.take_profit;
                    if (body.symbol) b.symbol = body.symbol;
                    localStorage.setItem('mock_bots', JSON.stringify(bots));
                    return getJSONResponse({ message: "參數調整成功！" });
                }
            }
        }
        
        if (path === '/api/bots') {
            if (method === 'POST') {
                const bots = JSON.parse(localStorage.getItem('mock_bots'));
                const users = JSON.parse(localStorage.getItem('mock_users'));
                const u = users.find(x => x.id === body.user_id);
                if (!u) return getErrorResponse("User not found");
                const limit = { member: 1, vip: 3, admin: 999, trial: 0, disabled: 0 }[u.role] || 1;
                const count = bots.filter(x => x.user_id === body.user_id).length;
                if (count >= limit) return getErrorResponse("已達到機器人建立上限！");
                
                const newBot = { id: "bot-" + Math.random().toString(36).slice(2,10), user_id: body.user_id, name: body.name, exchange: body.exchange, api_key: body.api_key, secret_key: body.secret_key, strategy: body.strategy, max_pos: body.max_pos, stop_loss: body.stop_loss, take_profit: body.take_profit, symbol: body.symbol, status: "stopped", cum_pnl: 0, trades: 0 };
                bots.push(newBot);
                localStorage.setItem('mock_bots', JSON.stringify(bots));
                return getJSONResponse({ message: "機器人建立成功！" });
            }
        }
        
        if (path.match(/\/api\/bots\/([^\/]+)\/start/)) {
            const bid = path.split('/')[3];
            const bots = JSON.parse(localStorage.getItem('mock_bots'));
            const b = bots.find(x => x.id === bid);
            if (b) b.status = 'running';
            localStorage.setItem('mock_bots', JSON.stringify(bots));
            return getJSONResponse({ message: "機器人已啟動。" });
        }
        
        if (path.match(/\/api\/bots\/([^\/]+)\/stop/)) {
            const bid = path.split('/')[3];
            const bots = JSON.parse(localStorage.getItem('mock_bots'));
            const b = bots.find(x => x.id === bid);
            if (b) b.status = 'stopped';
            localStorage.setItem('mock_bots', JSON.stringify(bots));
            return getJSONResponse({ message: "機器人已停止。" });
        }
        
        if (path.match(/\/api\/bots\/([^\/]+)\/pnl/)) {
            const bid = path.split('/')[3];
            const bots = JSON.parse(localStorage.getItem('mock_bots'));
            const b = bots.find(x => x.id === bid);
            if (b) {
                b.cum_pnl = body.cum_pnl;
                b.trades = body.trades;
            }
            localStorage.setItem('mock_bots', JSON.stringify(bots));
            return getJSONResponse({ message: "損益已同步。" });
        }
        
        if (path === '/api/quotes') {
            const quotesResp = {};
            for (const k in BASELINE_PRICES) {
                const fluc = (Math.random() - 0.5) * 0.004; // -0.2% ~ +0.2%
                quotesResp[k] = {
                    price: +(BASELINE_PRICES[k] * (1 + fluc)).toFixed(2),
                    changePct: +(fluc * 100).toFixed(2)
                };
            }
            return getJSONResponse({
                last_updated: new Date().toLocaleTimeString(),
                quotes: quotesResp
            });
        }
        
        return originalFetch(url, options);
    };
})();
