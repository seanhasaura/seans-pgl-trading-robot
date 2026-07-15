
/* admin.js — PGL 後台管理 */
const PERM_META = {
    view_dashboard:   { label: '查看儀表板',     icon: '📊' },
    view_trading:     { label: '查看交易數據',   icon: '📈' },
    view_attribution: { label: '歸因分析',       icon: '🔬' },
    use_bot:          { label: '使用交易機器人', icon: '🤖' },
    bind_api_keys:    { label: '綁定 API 金鑰',  icon: '🔑' },
    view_vip:         { label: 'VIP 專屬功能',   icon: '⭐' },
    export_data:      { label: '匯出資料',       icon: '📥' },
    view_company_accounts: { label: '觀看同公司帳戶', icon: '🏢' },
};
const VIP_LABELS = ['一般', '銀牌', '金牌', '鑽石'];
const VIP_ICONS  = ['👤',  '🥉',   '🥇',   '💎'];
const ROLE_ICONS = { admin:'🔑', vip:'⭐', member:'👤', trial:'🔓', disabled:'🚫' };

var allUsers = [], filteredUsers = [], allCompanies = [], selectedIds = new Set();
var currentUserId = null, searchTimer = null;

const $ = id => document.getElementById(id);
const userTableBody = $('userTableBody'), emptyState = $('emptyState'), loadingState = $('loadingState');
const searchInput = $('searchInput'), filterStatus = $('filterStatus'), filterCompany = $('filterCompany'), filterRole = $('filterRole');
const resultCount = $('resultCount'), selectAll = $('selectAll'), selectionBar = $('selectionBar'), selectionCount = $('selectionCount');
const notifCount = $('notifCount'), bulkApproveBtn = $('bulkApproveBtn'), bulkRoleBtn = $('bulkRoleBtn'), bulkRejectBtn = $('bulkRejectBtn');
const modalOverlay = $('modalOverlay'), modalTitle = $('modalTitle'), modalUserInfo = $('modalUserInfo');
const permsGrid = $('permsGrid'), noteTextarea = $('noteTextarea');

var _confirmResolve = null;
function showConfirm(msg, title) {
    return new Promise(resolve => {
        _confirmResolve = resolve;
        $('confirmTitle').textContent = title || '確認操作';
        $('confirmMessage').textContent = msg;
        $('confirmModal').classList.add('open');
    });
}
function _closeConfirm(result) {
    $('confirmModal').classList.remove('open');
    if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}
$('confirmOkBtn').addEventListener('click', () => _closeConfirm(true));
$('confirmCancelBtn').addEventListener('click', () => _closeConfirm(false));
$('confirmCloseBtn').addEventListener('click', () => _closeConfirm(false));

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function roleLabel(r) { return {admin:'管理員',vip:'VIP',member:'一般',trial:'試用',disabled:'停用'}[r]||r; }
function roleBadge(r) { return `<span class="role-badge role-${r}">${ROLE_ICONS[r]||'?'} ${roleLabel(r)}</span>`; }
function vipStars(l) { return !l?'<span class="vip-stars" style="color:var(--text-muted)">—</span>':`<span class="vip-stars">${VIP_ICONS[l]||'?'} ${VIP_LABELS[l]}</span>`; }

function showToast(msg, type='info') {
    const tc=$('toastContainer'), t=document.createElement('div');
    t.className=`toast ${type}`;
    t.innerHTML=`<span>${{success:'✅',error:'❌',info:'ℹ️'}[type]}</span> ${msg}`;
    tc.appendChild(t);
    setTimeout(()=>{t.classList.add('hide');t.addEventListener('animationend',()=>t.remove());},3000);
}

function updateSelectionUI() {
    const c=selectedIds.size, h=c>0;
    selectionBar.style.display=h?'flex':'none';
    selectionCount.textContent=`已選 ${c} 位使用者`;
    [bulkApproveBtn,bulkRoleBtn,bulkRejectBtn].forEach(b=>b.disabled=!h);
    selectAll.indeterminate=h&&c<filteredUsers.length;
    selectAll.checked=h&&c===filteredUsers.length;
}

async function loadStats() {
    try {
        const s=await(await fetch('/api/stats')).json();
        $('statTotalVal').textContent=s.total; $('statPendingVal').textContent=s.pending;
        $('statApprovedVal').textContent=s.approved; $('statVipVal').textContent=s.vips;
        $('statAdminVal').textContent=s.admins;

        // 模擬 AUM（已開通會員 × 平均 $10,000）
        const aumVal = s.approved * 10000;
        const aumDisplay = aumVal >= 1000000
            ? `$${(aumVal/1000000).toFixed(1)}M`
            : aumVal >= 1000 ? `$${(aumVal/1000).toFixed(0)}K` : `$${aumVal}`;
        if($('statAumVal')) $('statAumVal').textContent = aumDisplay || '$0';

        // 模擬活躍機器人（已開通會員中約 60% 啟動）
        const activeBots = Math.round(s.approved * 0.6);
        if($('statBotVal')) $('statBotVal').textContent = activeBots;

        // 模擬異常警示（隨機 0-3 個）
        const alerts = s.approved > 0 ? Math.min(Math.floor(Math.random() * 4), 3) : 0;
        if($('statAlertVal')) $('statAlertVal').textContent = alerts;
        const alertChip = $('alertChip');
        if(alertChip) {
            alertChip.classList.toggle('has-alerts', alerts > 0);
        }

        if(s.pending>0){notifCount.textContent=s.pending;notifCount.classList.remove('hidden');}
        else{notifCount.classList.add('hidden');}
    } catch(e){console.warn('Stats error:',e);}
}

async function loadUsers() {
    loadingState.style.display='flex'; emptyState.style.display='none'; userTableBody.innerHTML='';
    const p=new URLSearchParams();
    if(searchInput.value.trim()) p.set('search',searchInput.value.trim());
    if(filterStatus.value) p.set('status',filterStatus.value);
    if(filterCompany.value) p.set('company_id',filterCompany.value);
    if(filterRole.value) p.set('role',filterRole.value);
    try {
        allUsers=await(await fetch(`/api/users?${p}`)).json();
        filteredUsers=allUsers; renderTable();
    } catch(e){console.error(e);showToast('載入使用者失敗','error');}
    finally{loadingState.style.display='none';}
}

function renderTable() {
    userTableBody.innerHTML=''; selectedIds.clear(); updateSelectionUI();
    if(!filteredUsers.length){emptyState.style.display='block';resultCount.textContent='0 筆結果';return;}
    emptyState.style.display='none'; resultCount.textContent=`共 ${filteredUsers.length} 筆`;
    filteredUsers.forEach(u=>{
        const sb=u.status==='approved'?'<span class="badge badge-approved">✅ 已開通</span>':'<span class="badge badge-pending">⏳ 待審核</span>';
        let ab=`<button class="btn-icon" onclick="openModal('${u.id}')" title="詳情/權限">🔐 權限</button>`;
        if(u.status==='pending'){
            ab+=`<button class="btn-icon" style="color:#34d399;border-color:rgba(16,185,129,.3)" onclick="approveUser('${u.id}')">✅</button>`;
            ab+=`<button class="btn-icon" style="color:#f87171;border-color:rgba(239,68,68,.3)" onclick="rejectUser('${u.id}')">❌</button>`;
        }
        const tr=document.createElement('tr'); tr.dataset.id=u.id; tr.classList.add(`row-role-${u.role}`);
        tr.innerHTML=`<td><input type="checkbox" class="row-check" data-id="${u.id}"></td>
            <td style="font-family:monospace;font-size:0.8rem;color:var(--text-muted)">#${u.id.slice(-6)}</td>
            <td style="font-weight:600">${escHtml(u.name)}</td><td style="color:var(--text-muted);font-size:0.85rem">${escHtml(u.email)}</td>
            <td><span class="badge" style="background:rgba(255,255,255,0.05);">${escHtml(u.company_name ? `${u.company_name} (${u.company_city || '—'})` : '—')}</span></td>
            <td>${roleBadge(u.role)}</td><td>${vipStars(u.vip_level)}</td><td>${sb}</td>
            <td style="color:var(--text-muted);font-size:0.8rem">${u.created_at}</td>
            <td><div class="action-group">${ab}</div></td>`;
        userTableBody.appendChild(tr);
    });
    document.querySelectorAll('.row-check').forEach(cb=>{
        cb.addEventListener('change',()=>{if(cb.checked)selectedIds.add(cb.dataset.id);else selectedIds.delete(cb.dataset.id);updateSelectionUI();});
    });
}

window.approveUser=async function(id){try{const r=await fetch(`/api/users/${id}/approve`,{method:'POST'});if(r.ok){showToast('會員已核准開通','success');await Promise.all([loadStats(),loadUsers()]);}else showToast('核准失敗','error');}catch(e){showToast('網路錯誤','error');}};
window.rejectUser=async function(id){const ok=await showConfirm('確定要拒絕並刪除這筆申請嗎？','拒絕申請');if(!ok)return;try{const r=await fetch(`/api/users/${id}/reject`,{method:'DELETE'});if(r.ok){showToast('已拒絕並刪除','success');await Promise.all([loadStats(),loadUsers()]);}else showToast('拒絕操作失敗','error');}catch(e){showToast('網路錯誤','error');}};

window.openModal=function(userId){
    const u=allUsers.find(x=>x.id===userId); if(!u)return; currentUserId=userId;
    modalTitle.textContent=`詳情：${u.name}`;
    let co=`<option value="">未指派</option>`;
    allCompanies.forEach(c=>{co+=`<option value="${c.id}" ${u.company_id===c.id?'selected':''}>${escHtml(c.name)} (${escHtml(c.city||'—')})</option>`;});
    modalUserInfo.innerHTML=`<div class="modal-user-avatar">${u.name.trim().charAt(0).toUpperCase()}</div>
        <div class="modal-user-meta"><strong>${escHtml(u.name)}</strong><small>${escHtml(u.email)} | 加入：${u.created_at}</small>
        <div style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap">${roleBadge(u.role)} ${vipStars(u.vip_level)}
        ${u.status==='approved'?'<span class="badge badge-approved">已開通</span>':'<span class="badge badge-pending">待審核</span>'}</div>
        <div style="margin-top:8px"><label style="font-size:0.8rem;color:var(--text-muted)">所屬公司：</label>
        <select id="userCompanySelect" style="padding:4px;border-radius:4px;background:rgba(0,0,0,0.3);color:white;border:1px solid var(--border-color);">${co}</select>
        <button class="btn btn-secondary btn-sm" id="saveCompanyBtn" style="padding:4px 8px;font-size:0.75rem;">儲存</button></div></div>`;
    $('saveCompanyBtn').addEventListener('click',async()=>{
        const cid=$('userCompanySelect').value;
        try{const r=await fetch(`/api/users/${currentUserId}/company`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_id:cid||null})});
        if(r.ok){showToast('公司歸屬已更新','success');await loadUsers();}else showToast('更新失敗','error');}catch(e){showToast('網路錯誤','error');}
    });
    buildPermsGrid(u.permissions||[]);
    document.querySelectorAll('.role-card').forEach(c=>{c.classList.toggle('selected',c.dataset.role===u.role);const r=c.querySelector('input[type=radio]');if(r)r.checked=c.dataset.role===u.role;});
    document.querySelectorAll('.vip-option').forEach(o=>{o.classList.toggle('selected',parseInt(o.dataset.vip)===u.vip_level);const r=o.querySelector('input[type=radio]');if(r)r.checked=parseInt(o.dataset.vip)===u.vip_level;});
    noteTextarea.value=u.note||'';
    loadUserShares(userId); switchModalTab('perms'); modalOverlay.classList.add('open');
};

function buildPermsGrid(active){
    permsGrid.innerHTML='';
    Object.entries(PERM_META).forEach(([k,m])=>{
        const a=active.includes(k), d=document.createElement('label');
        d.className=`perm-item${a?' active':''}`; d.innerHTML=`<input type="checkbox" name="perm_${k}" ${a?'checked':''}><span class="perm-icon">${m.icon}</span><div><div class="perm-label">${m.label}</div><div class="perm-key">${k}</div></div>`;
        d.querySelector('input').addEventListener('change',e=>d.classList.toggle('active',e.target.checked));
        permsGrid.appendChild(d);
    });
}

function switchModalTab(t){document.querySelectorAll('.modal-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));document.querySelectorAll('.modal-tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${t}`));}
document.querySelectorAll('.modal-tab').forEach(t=>t.addEventListener('click',()=>switchModalTab(t.dataset.tab)));
$('modalClose').addEventListener('click',closeModal);
modalOverlay.addEventListener('click',e=>{if(e.target===modalOverlay)closeModal();});
function closeModal(){modalOverlay.classList.remove('open');currentUserId=null;}

$('savePermsBtn').addEventListener('click',async()=>{
    if(!currentUserId)return;
    const checked=[...permsGrid.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.name.replace('perm_',''));
    try{const r=await fetch(`/api/users/${currentUserId}/permissions`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({permissions:checked})});
    if(r.ok){showToast('權限已儲存','success');await loadUsers();const u=allUsers.find(x=>x.id===currentUserId);if(u)u.permissions=checked;}else showToast('儲存失敗','error');}catch(e){showToast('網路錯誤','error');}
});

$('resetPermBtn').addEventListener('click',()=>{
    const u=allUsers.find(x=>x.id===currentUserId);if(!u)return;
    const sr=document.querySelector('input[name=roleSelect]:checked')?.value||u.role;
    const rd={admin:Object.keys(PERM_META),vip:['view_dashboard','view_trading','view_attribution','use_bot','bind_api_keys','view_vip','export_data'],member:['view_dashboard','view_trading','use_bot','bind_api_keys'],trial:['view_dashboard'],disabled:[]};
    buildPermsGrid(rd[sr]||[]);showToast(`已依「${roleLabel(sr)}」重設預覽（尚未儲存）`,'info');
});

$('saveRoleBtn').addEventListener('click',async()=>{
    if(!currentUserId)return;const radio=document.querySelector('input[name=roleSelect]:checked');if(!radio){showToast('請選擇角色','error');return;}
    try{const r=await fetch(`/api/users/${currentUserId}/role`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:radio.value})});
    if(r.ok){const d=await r.json();showToast(`角色已更新：${roleLabel(radio.value)}`,'success');const u=allUsers.find(x=>x.id===currentUserId);if(u){u.role=radio.value;u.permissions=d.permissions;}buildPermsGrid(d.permissions);await loadUsers();}else showToast('更新失敗','error');}catch(e){showToast('網路錯誤','error');}
});

document.querySelectorAll('.role-card').forEach(c=>c.addEventListener('click',()=>{document.querySelectorAll('.role-card').forEach(x=>x.classList.remove('selected'));c.classList.add('selected');const r=c.querySelector('input[type=radio]');if(r)r.checked=true;}));

$('saveVipBtn').addEventListener('click',async()=>{
    if(!currentUserId)return;const radio=document.querySelector('input[name=vipSelect]:checked');if(!radio){showToast('請選擇 VIP 等級','error');return;}
    try{const r=await fetch(`/api/users/${currentUserId}/vip`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({vip_level:parseInt(radio.value)})});
    if(r.ok){showToast(`VIP 等級已更新：${VIP_LABELS[parseInt(radio.value)]}`,'success');const u=allUsers.find(x=>x.id===currentUserId);if(u)u.vip_level=parseInt(radio.value);await loadUsers();}else showToast('更新失敗','error');}catch(e){showToast('網路錯誤','error');}
});

document.querySelectorAll('.vip-option').forEach(o=>o.addEventListener('click',()=>{document.querySelectorAll('.vip-option').forEach(x=>x.classList.remove('selected'));o.classList.add('selected');const r=o.querySelector('input[type=radio]');if(r)r.checked=true;}));

$('saveNoteBtn').addEventListener('click',async()=>{
    if(!currentUserId)return;
    try{const r=await fetch(`/api/users/${currentUserId}/note`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:noteTextarea.value})});
    if(r.ok)showToast('備註已儲存','success');else showToast('儲存失敗','error');}catch(e){showToast('網路錯誤','error');}
});

async function loadUserShares(userId){
    const tbody=$('sharesTableBody');if(!tbody)return;
    tbody.innerHTML='<tr><td colspan="4" style="text-align:center;">載入中...</td></tr>';
    try{const shares=await(await fetch(`/api/users/${userId}/shares`)).json();
    if(!shares.length){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">目前沒有授權給其他帳號</td></tr>';return;}
    tbody.innerHTML='';shares.forEach(s=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${escHtml(s.member_email)}<br><small class="text-muted">${escHtml(s.member_name)}</small></td><td>${s.access_role==='operator'?'🔧 操作者':'👁️ 觀看者'}</td><td style="color:var(--text-muted);font-size:0.8rem;">${s.granted_at}</td><td><button class="btn-icon" style="color:#f87171" onclick="deleteShare('${s.id}')">❌</button></td>`;
    tbody.appendChild(tr);});}catch(e){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:#f87171;">載入失敗</td></tr>';}
}

$('addShareBtn')?.addEventListener('click',async()=>{
    if(!currentUserId)return;const email=$('shareMemberEmail').value.trim(),role=$('shareAccessRole').value;
    if(!email){showToast('請輸入 Email','error');return;}
    try{const r=await fetch(`/api/users/${currentUserId}/shares`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({member_email:email,access_role:role})});
    const d=await r.json();if(r.ok){showToast('授權成功','success');$('shareMemberEmail').value='';loadUserShares(currentUserId);}else showToast(d.detail||'授權失敗','error');}catch(e){showToast('網路錯誤','error');}
});

window.deleteShare=async function(shareId){const ok=await showConfirm('確定要移除此授權嗎？','移除授權');if(!ok)return;try{const r=await fetch(`/api/shares/${shareId}`,{method:'DELETE'});if(r.ok){showToast('授權已移除','success');if(currentUserId)loadUserShares(currentUserId);}else showToast('移除失敗','error');}catch(e){showToast('網路錯誤','error');}};

selectAll.addEventListener('change',()=>{document.querySelectorAll('.row-check').forEach(cb=>{cb.checked=selectAll.checked;if(selectAll.checked)selectedIds.add(cb.dataset.id);else selectedIds.delete(cb.dataset.id);});updateSelectionUI();});
$('deselectAllBtn').addEventListener('click',()=>{document.querySelectorAll('.row-check').forEach(cb=>cb.checked=false);selectedIds.clear();selectAll.checked=false;updateSelectionUI();});

bulkApproveBtn.addEventListener('click',async()=>{if(!selectedIds.size)return;const ok=await showConfirm(`確定要批次核准 ${selectedIds.size} 位使用者嗎？`,'批次核准');if(!ok)return;try{const d=await(await fetch('/api/users/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_ids:[...selectedIds],action:'approve'})})).json();showToast(d.message,'success');selectedIds.clear();await Promise.all([loadStats(),loadUsers()]);}catch(e){showToast('批次操作失敗','error');}});
bulkRejectBtn.addEventListener('click',async()=>{if(!selectedIds.size)return;const ok=await showConfirm(`確定要刪除 ${selectedIds.size} 位使用者嗎？此操作不可還原！`,'批次刪除');if(!ok)return;try{const d=await(await fetch('/api/users/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_ids:[...selectedIds],action:'reject'})})).json();showToast(d.message,'success');selectedIds.clear();await Promise.all([loadStats(),loadUsers()]);}catch(e){showToast('批次操作失敗','error');}});
bulkRoleBtn.addEventListener('click',()=>{$('bulkRoleModal').classList.add('open');});
$('bulkRoleClose').addEventListener('click',()=>{$('bulkRoleModal').classList.remove('open');});
$('bulkRoleCancelBtn').addEventListener('click',()=>{$('bulkRoleModal').classList.remove('open');});
$('bulkRoleConfirmBtn').addEventListener('click',async()=>{const role=$('bulkRoleSelect').value;if(!role)return;try{const d=await(await fetch('/api/users/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_ids:[...selectedIds],action:'set_role',value:role})})).json();showToast(d.message,'success');$('bulkRoleModal').classList.remove('open');selectedIds.clear();await loadUsers();}catch(e){showToast('批次設定失敗','error');}});

$('exportCsvBtn').addEventListener('click',()=>{
    if(!filteredUsers.length){showToast('沒有可匯出的資料','error');return;}
    const h=['ID','姓名','Email','所屬公司','角色','VIP等級','狀態','註冊時間'];
    const rows=filteredUsers.map(u=>[u.id,u.name,u.email,u.company_name ? `${u.company_name} (${u.company_city || '—'})` : '—',u.role,u.vip_level,u.status==='approved'?'已開通':'待審核',u.created_at]);
    const csv=[h,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`pgl_users_${Date.now()}.csv`;a.click();URL.revokeObjectURL(a.href);showToast('CSV 已匯出','success');
});

searchInput.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadUsers,350);});
filterStatus.addEventListener('change',loadUsers);
filterCompany.addEventListener('change',loadUsers);
filterRole.addEventListener('change',loadUsers);
$('refreshBtn').addEventListener('click',async()=>{await Promise.all([loadStats(),loadUsers()]);showToast('已重新整理','info');});
$('sidebarToggle').addEventListener('click',()=>{$('sidebar').classList.toggle('open');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('bulkRoleModal').classList.remove('open');}});

async function loadCompanies(){
    try{const r=await fetch('/api/companies');if(r.ok){allCompanies=await r.json();if(filterCompany){filterCompany.innerHTML='<option value="">全部公司</option><option value="__none__">未指派公司</option>';allCompanies.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.name} (${c.city||'未指定'})`;filterCompany.appendChild(o);});}}}catch(e){console.warn('Companies error:',e);}
}

(async function init(){await loadCompanies();await Promise.all([loadStats(),loadUsers()]);setInterval(loadStats,60000);})();


