/* js/portfolio.js */
(function() {
    var WK = 'crypto_wallet_v3', HK = 'crypto_holdings_v3', TK = 'crypto_tx_v3', DK = 'crypto_demat_demo_v1';
    function loadW() { var w = localStorage.getItem(WK); return w ? parseFloat(w) : 0; }
    function saveW(v) { localStorage.setItem(WK, v); syncToCloud(); }
    function loadH() { try { return JSON.parse(localStorage.getItem(HK)) || {}; } catch (e) { return {}; } }
    function saveH(h) { localStorage.setItem(HK, JSON.stringify(h)); syncToCloud(); }
    function loadT() { try { return JSON.parse(localStorage.getItem(TK)) || []; } catch (e) { return []; } }
    function saveT(t) { localStorage.setItem(TK, JSON.stringify(t)); syncToCloud(); }
    function loadD() { try { return JSON.parse(localStorage.getItem(DK)) || {}; } catch (e) { return {}; } }
    function saveD(d) { localStorage.setItem(DK, JSON.stringify(d)); syncToCloud(); }

    /* ── Global Sync Proxy ── */
    function syncToCloud() {
        if (window.CryptoDash && window.CryptoDash.saveAllToCloud) {
            window.CryptoDash.saveAllToCloud();
        }
    }

    async function loadFromCloud() {
        var sb = window.CryptoDash.supabase;
        if (!sb) return;
        var { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        const { data, error } = await sb.from('portfolios').select('*').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            console.error("Cloud load error:", error.message);
            return;
        }

        if (data) {
            localStorage.setItem(WK, data.wallet);
            localStorage.setItem(HK, JSON.stringify(data.holdings));
            localStorage.setItem(TK, JSON.stringify(data.transactions));
            localStorage.setItem(DK, JSON.stringify(data.demat));
            if (data.profile && Object.keys(data.profile).length > 0) {
                localStorage.setItem('crypto_user_profile', JSON.stringify(data.profile));
            }
            
            refreshAll(); updateBadge();
            if (window.CryptoDash && window.CryptoDash.loadProfile) window.CryptoDash.loadProfile();
        } else {
            // New user or no cloud data – reset but trigger a sync to create the record
            // We don't clear everything IF it's the very first session (signup data might be in local)
            // But to be safe, if there's no cloud data, we ensure the cloud gets whatever we have
            if (window.CryptoDash && window.CryptoDash.saveAllToCloud) {
                await window.CryptoDash.saveAllToCloud();
            }
            refreshAll(); updateBadge();
        }
    }
    
    function getPriceUSD(id) {
        var rd = window.CryptoDash.rawData;
        if (!rd) return null;
        for (var i = 0; i < rd.length; i++) { if (rd[i].id === id) return rd[i].current_price; }
        return null;
    }

    function executeBuy(coinMeta, qty, priceUSD) {
        if (priceUSD <= 0) return { ok: false, msg: 'Invalid price. Price must be > 0.' };
        var total = qty * priceUSD, wallet = loadW();
        if (wallet < total) return { ok: false, msg: 'Insufficient funds.' };
        saveW(wallet - total);
        var h = loadH();
        if (!h[coinMeta.id]) h[coinMeta.id] = { id: coinMeta.id, name: coinMeta.name, symbol: coinMeta.symbol, image: coinMeta.image, qty: 0, avgBuyPriceUSD: 0, totalInvestedUSD: 0 };
        var e = h[coinMeta.id];
        e.totalInvestedUSD += total; e.qty += qty; e.avgBuyPriceUSD = e.totalInvestedUSD / e.qty;
        saveH(h);
        var t = loadT(); t.unshift({ type: 'BUY', coinId: coinMeta.id, coinName: coinMeta.name, symbol: coinMeta.symbol, image: coinMeta.image, qty: qty, priceUSD: priceUSD, totalUSD: total, date: new Date().toISOString() }); saveT(t);
        refreshAll(); updateBadge();
        return { ok: true };
    }

    function executeSell(coinId, qty) {
        var h = loadH(), e = h[coinId];
        if (!e || e.qty < qty - 1e-10) return { ok: false, msg: 'Not enough holdings.' };
        var price = getPriceUSD(coinId);
        if (price === null) return { ok: false, msg: 'Price unavailable — try again shortly.' };
        if (price <= 0) return { ok: false, msg: 'Invalid price.' };
        var proceeds = qty * price, cost = qty * e.avgBuyPriceUSD, pnl = proceeds - cost;
        saveW(loadW() + proceeds);
        e.totalInvestedUSD -= cost; e.qty -= qty;
        if (e.qty <= 1e-10) delete h[coinId]; else e.avgBuyPriceUSD = e.totalInvestedUSD / e.qty;
        saveH(h);
        var ename = e.name, esym = e.symbol, eimg = e.image;
        var t = loadT(); t.unshift({ type: 'SELL', coinId: coinId, coinName: ename, symbol: esym, image: eimg, qty: qty, priceUSD: price, totalUSD: proceeds, pnlUSD: pnl, date: new Date().toISOString() }); saveT(t);
        refreshAll(); updateBadge();
        return { ok: true, pnl: pnl };
    }

    function refreshSummary() {
        var cur = window.CryptoDash.currency, wallet = loadW(), h = loadH();
        var totalVal = 0, totalCost = 0;
        Object.values(h).forEach(function (e) { var p = getPriceUSD(e.id); if (p !== null) totalVal += e.qty * p; totalCost += e.totalInvestedUSD; });
        var pnl = totalVal - totalCost, pc = pnl >= 0 ? '#10b981' : '#ef4444', ps = pnl >= 0 ? '+' : '';
        var b = document.getElementById('pt-balance'); if (b) b.textContent = window.CryptoDash.fmtPrice(wallet, cur);
        b = document.getElementById('pt-total-value'); if (b) b.textContent = window.CryptoDash.fmtPrice(totalVal, cur);
        b = document.getElementById('pt-total-pnl'); 
        if (b) {
            b.textContent = ps + window.CryptoDash.fmtPrice(pnl, cur);
            b.style.color = pc;
        }
        b = document.getElementById('wallet-bal-val'); if (b) b.textContent = window.CryptoDash.fmtPrice(wallet, cur);
    }

    function renderHoldings() {
        var body = document.getElementById('pt-body-holdings'); if (!body) return;
        var h = loadH(), cur = window.CryptoDash.currency, coins = Object.values(h);
        body.innerHTML = '';
        if (!coins.length) {
            var empty = document.createElement('div'); empty.className = 'holdings-empty';
            empty.innerHTML = '<span class="holdings-empty-icon">📭</span><p class="font-semibold">No holdings yet.</p><p class="text-sm mt-1">Click a coin → Trade → Buy to start.</p>';
            body.appendChild(empty);
            return;
        }
        coins.forEach(function (e) {
            var price = getPriceUSD(e.id), has = price !== null;
            var cv = has ? e.qty * price : null, cost = e.totalInvestedUSD;
            var pnl = cv !== null ? cv - cost : null, pct = (pnl !== null && cost > 0) ? (pnl / cost) * 100 : null;
            
            var card = document.createElement('div'); card.className = 'history-item';
            
            var info = document.createElement('div'); info.className = 'history-item-info';
            if (e.image) {
                var img = document.createElement('img'); img.src = e.image; img.className = 'history-item-icon';
                info.appendChild(img);
            } else {
                var div = document.createElement('div'); div.className = 'history-item-icon-placeholder'; div.textContent = (e.symbol || '?')[0].toUpperCase();
                info.appendChild(div);
            }
            var textDiv = document.createElement('div');
            var nameDiv = document.createElement('div'); nameDiv.className = 'history-item-name'; nameDiv.textContent = e.name;
            var subDiv = document.createElement('div'); subDiv.className = 'history-item-sub'; subDiv.textContent = e.qty.toLocaleString() + ' ' + (e.symbol || '').toUpperCase() + ' · Avg ' + window.CryptoDash.fmtPrice(e.avgBuyPriceUSD, cur);
            textDiv.appendChild(nameDiv); textDiv.appendChild(subDiv);
            info.appendChild(textDiv);
            
            var right = document.createElement('div'); right.style.textAlign = 'right';
            var valDiv = document.createElement('div'); valDiv.className = 'history-item-val'; valDiv.textContent = has ? window.CryptoDash.fmtPrice(cv, cur) : 'N/A';
            var pnlDiv = document.createElement('div'); pnlDiv.className = 'history-item-pnl ' + (pnl >= 0 ? 'positive' : 'negative');
            pnlDiv.textContent = (pnl >= 0 ? '+' : '') + window.CryptoDash.fmtPrice(pnl, cur) + ' (' + (pct !== null ? pct.toFixed(2) : '0.00') + '%)';
            right.appendChild(valDiv); right.appendChild(pnlDiv);
            
            var btnDiv = document.createElement('div'); btnDiv.style.marginTop = '0.4rem';
            var sellBtn = document.createElement('button'); sellBtn.className = 'trade-type-btn sell'; sellBtn.style.padding = '0.2rem 0.6rem'; sellBtn.style.fontSize = '0.7rem'; sellBtn.textContent = 'Sell';
            sellBtn.addEventListener('click', function() { openSellModal(e); });
            btnDiv.appendChild(sellBtn);
            right.appendChild(btnDiv);
            
            card.appendChild(info); card.appendChild(right);
            body.appendChild(card);
        });
    }

    function renderHistory() {
        var body = document.getElementById('pt-body-history'); if (!body) return;
        var t = loadT(), cur = window.CryptoDash.currency;
        body.innerHTML = '';
        if (!t.length) {
            var empty = document.createElement('div'); empty.className = 'holdings-empty';
            empty.innerHTML = '<span class="holdings-empty-icon">⏳</span><p class="font-semibold">No transaction history.</p>';
            body.appendChild(empty);
            return;
        }
        t.forEach(function (tx) {
            var card = document.createElement('div'); card.className = 'history-item';
            
            var info = document.createElement('div'); info.className = 'history-item-info';
            var badge = document.createElement('div'); badge.className = 'history-item-type ' + tx.type.toLowerCase(); badge.textContent = tx.type;
            var textDiv = document.createElement('div');
            var nameDiv = document.createElement('div'); nameDiv.className = 'history-item-name'; nameDiv.textContent = tx.qty.toLocaleString() + ' ' + (tx.symbol || '').toUpperCase() + ' (' + tx.coinName + ')';
            var dateDiv = document.createElement('div'); dateDiv.className = 'history-item-sub'; dateDiv.textContent = new Date(tx.date).toLocaleString();
            textDiv.appendChild(nameDiv); textDiv.appendChild(dateDiv);
            info.appendChild(badge); info.appendChild(textDiv);
            
            var right = document.createElement('div'); right.style.textAlign = 'right';
            var valDiv = document.createElement('div'); valDiv.className = 'history-item-val'; valDiv.textContent = window.CryptoDash.fmtPrice(tx.totalUSD, cur);
            var priceDiv = document.createElement('div'); priceDiv.className = 'history-item-sub'; priceDiv.textContent = '@ ' + window.CryptoDash.fmtPrice(tx.priceUSD, cur);
            right.appendChild(valDiv); right.appendChild(priceDiv);
            
            if (tx.type === 'SELL' && tx.pnlUSD !== undefined) {
                var pnlDiv = document.createElement('div'); pnlDiv.className = 'history-item-pnl ' + (tx.pnlUSD >= 0 ? 'positive' : 'negative');
                pnlDiv.style.marginTop = '0.2rem';
                pnlDiv.textContent = 'P&L: ' + (tx.pnlUSD >= 0 ? '+' : '') + window.CryptoDash.fmtPrice(tx.pnlUSD, cur);
                right.appendChild(pnlDiv);
            }
            
            card.appendChild(info); card.appendChild(right);
            body.appendChild(card);
        });
    }

    function renderDemat() {
        var d = loadD();
        var broker = document.getElementById('demat-broker');
        var clientId = document.getElementById('demat-client-id');
        var nickname = document.getElementById('demat-nickname');
        var panLast4 = document.getElementById('demat-pan-last4');
        var sync = document.getElementById('demat-sync-watchlist');
        var status = document.getElementById('demat-status-text');
        var badge = document.getElementById('demat-status-badge');
        var note = document.getElementById('demat-note');
        var title = document.querySelector('.portfolio-panel-title');
        if (!broker || !clientId || !nickname || !panLast4 || !sync || !status || !badge || !note) return;

        broker.value = d.broker || '';
        clientId.value = d.clientId || '';
        nickname.value = d.nickname || '';
        panLast4.value = d.panLast4 || '';
        sync.checked = !!d.showBadge;

        badge.classList.toggle('linked', !!d.linkedAt);
        badge.textContent = d.linkedAt ? 'Demo linked' : 'Demo only';
        status.textContent = d.linkedAt
            ? (d.nickname || d.broker || 'Demat profile') + ' linked for display only.'
            : 'No demo Demat profile linked.';
        note.className = 'demat-note';
        note.textContent = 'Demo profile only. Do not enter passwords, OTPs, full PAN, or access tokens.';
        if (title) title.textContent = d.linkedAt && d.showBadge ? 'My Portfolio - Demat linked' : 'My Portfolio';
    }

    function saveDematFromForm() {
        var broker = document.getElementById('demat-broker');
        var clientId = document.getElementById('demat-client-id');
        var nickname = document.getElementById('demat-nickname');
        var panLast4 = document.getElementById('demat-pan-last4');
        var sync = document.getElementById('demat-sync-watchlist');
        var note = document.getElementById('demat-note');
        if (!broker || !clientId || !nickname || !panLast4 || !sync || !note) return;

        var cleanedPan = (panLast4.value || '').replace(/\D/g, '').slice(0, 4);
        panLast4.value = cleanedPan;
        if (!broker.value || !(clientId.value || '').trim()) {
            note.className = 'demat-note error';
            note.textContent = 'Select a broker and enter a demo client ID.';
            return;
        }
        if (cleanedPan && cleanedPan.length !== 4) {
            note.className = 'demat-note error';
            note.textContent = 'PAN field accepts only the last 4 digits, or leave it blank.';
            return;
        }

        saveD({
            broker: broker.value,
            clientId: clientId.value.trim().slice(0, 24),
            nickname: nickname.value.trim().slice(0, 40),
            panLast4: cleanedPan,
            showBadge: !!sync.checked,
            linkedAt: new Date().toISOString()
        });
        renderDemat();
        note.className = 'demat-note success';
        note.textContent = 'Demo Demat profile saved locally.';
    }

    function clearDemat() {
        localStorage.removeItem(DK);
        renderDemat();
    }

    function refreshAll() { refreshSummary(); renderHoldings(); renderHistory(); renderDemat(); }

    function updateBadge() {
        var h = loadH(), count = Object.keys(h).length, b = document.getElementById('portfolio-badge');
        if (b) { b.textContent = count; b.classList.toggle('hidden', count === 0); }
    }

    window.CryptoDash._portfolioRender = function () { refreshAll(); };

    /* Sell Modal */
    var sellMod = document.getElementById('sell-modal-overlay');
    var _sellId = null;
    function openSellModal(e) {
        _sellId = e.id;
        document.getElementById('sell-modal-logo').src = e.image || '';
        document.getElementById('sell-modal-logo').style.display = e.image ? 'block' : 'none';
        document.getElementById('sell-modal-title').textContent = 'Sell ' + e.name;
        document.getElementById('sell-modal-sub').textContent = e.qty.toLocaleString() + ' ' + (e.symbol || '').toUpperCase() + ' available';
        document.getElementById('sell-qty-input').value = e.qty;
        document.getElementById('sell-avail-qty').textContent = e.qty.toLocaleString();
        document.getElementById('sell-avg-buy').textContent = window.CryptoDash.fmtPrice(e.avgBuyPriceUSD, window.CryptoDash.currency);
        var cp = getPriceUSD(e.id);
        document.getElementById('sell-cur-price').textContent = cp !== null ? window.CryptoDash.fmtPrice(cp, window.CryptoDash.currency) : 'N/A';
        document.getElementById('sell-toast').className = 'sell-toast'; document.getElementById('sell-toast').textContent = '';
        updateSellPreview();
        sellMod.style.display = 'flex';
        window.CryptoDash.trapFocus(document.getElementById('sell-modal'), document.getElementById('sell-modal-close'));
    }
    function closeSellModal() { sellMod.style.display = 'none'; _sellId = null; }
    document.getElementById('sell-modal-close').addEventListener('click', closeSellModal);
    sellMod.addEventListener('click', function(e) { if(e.target===sellMod) closeSellModal(); });

    function updateSellPreview() {
        if (!_sellId) return;
        var h = loadH(), e = h[_sellId], qty = parseFloat(document.getElementById('sell-qty-input').value);
        var cp = getPriceUSD(_sellId), cur = window.CryptoDash.currency;
        if (isNaN(qty) || qty <= 0 || !e || cp === null) {
            document.getElementById('sell-proceeds').textContent = '—';
            document.getElementById('sell-est-pnl').textContent = '—';
            return;
        }
        var pro = qty * cp, cost = qty * e.avgBuyPriceUSD, pnl = pro - cost;
        document.getElementById('sell-proceeds').textContent = window.CryptoDash.fmtPrice(pro, cur);
        var pnlEl = document.getElementById('sell-est-pnl');
        pnlEl.textContent = (pnl >= 0 ? '+' : '') + window.CryptoDash.fmtPrice(pnl, cur);
        pnlEl.style.color = pnl >= 0 ? '#10b981' : '#ef4444';
    }
    document.getElementById('sell-qty-input').addEventListener('input', updateSellPreview);
    document.getElementById('sell-execute-btn').addEventListener('click', function() {
        var qty = parseFloat(document.getElementById('sell-qty-input').value);
        var toast = document.getElementById('sell-toast');
        if (isNaN(qty) || qty <= 0) { toast.className = 'sell-toast error'; toast.textContent = 'Enter a valid quantity > 0.'; return; }
        var h = loadH(), e = h[_sellId];
        if (e && qty > e.qty + 1e-10) { toast.className = 'sell-toast error'; toast.textContent = 'Quantity exceeds holdings.'; return; }
        var res = executeSell(_sellId, qty);
        if (!res.ok) { toast.className = 'sell-toast error'; toast.textContent = res.msg; return; }
        var ps = res.pnl >= 0 ? '+' : '';
        toast.className = 'sell-toast success';
        toast.textContent = '✓ Sold! P&L: ' + ps + window.CryptoDash.fmtPrice(res.pnl, window.CryptoDash.currency);
        if (window.CryptoDash.sounds) window.CryptoDash.sounds.sell();
        if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_sell');
        renderHoldings();
        setTimeout(closeSellModal, 2000);
    });

    /* Wallet Modal */
    var wallMod = document.getElementById('wallet-modal-overlay');
    var walletBtn = document.getElementById('wallet-btn');
    var walletClose = document.getElementById('wallet-modal-close');
    if (wallMod && walletBtn && walletClose) {
        walletBtn.addEventListener('click', function() {
            document.getElementById('wallet-bal-val').textContent = window.CryptoDash.fmtPrice(loadW(), window.CryptoDash.currency);
            wallMod.style.display = 'flex';
            window.CryptoDash.trapFocus(document.getElementById('wallet-modal'), walletClose);
        });
        function closeWallModal() { wallMod.style.display = 'none'; }
        walletClose.addEventListener('click', closeWallModal);
        wallMod.addEventListener('click', function(e) { if(e.target===wallMod) closeWallModal(); });
    }

    var _walletCur = 'usd';
    document.querySelectorAll('.wallet-cur-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.wallet-cur-btn').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
            _walletCur = btn.dataset.cur;
        });
    });
    document.getElementById('wallet-deposit-btn').addEventListener('click', function () {
        var amt = parseFloat(document.getElementById('wallet-amount').value);
        if (isNaN(amt) || amt <= 0) { alert('Enter a valid amount > 0.'); return; }
        saveW(loadW() + window.CryptoDash.toUSD(amt, _walletCur));
        document.getElementById('wallet-amount').value = '';
        refreshSummary();
        if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_deposit');
        alert('Deposit successful!');
    });

    /* Trade Modal functionality */
    var _tradeCoin = null, _tradeType = 'buy', _tradeCur = 'usd';
    document.querySelectorAll('.trade-type-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#modal-trade-section .trade-type-btn').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
            _tradeType = btn.dataset.type; updateTradeUI();
        });
    });
    document.querySelectorAll('.trade-cur-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.trade-cur-btn').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
            _tradeCur = btn.dataset.cur; updateTradeUI();
        });
    });
    
    function updateTradeUI() {
        if (!_tradeCoin) return;
        var pLoc = _tradeCoin.current_price * window.CryptoDash.rates[_tradeCur];
        var CS = { usd: '$', inr: '₹', btc: '₿', eur: '€' };
        document.getElementById('trade-price-label').textContent = CS[_tradeCur] + pLoc.toLocaleString(undefined, { maximumFractionDigits: 6 });
        var h = loadH(), avail = h[_tradeCoin.id] ? h[_tradeCoin.id].qty : 0;
        var availEl = document.getElementById('trade-avail-val');
        if (availEl) availEl.textContent = avail.toLocaleString() + ' ' + (_tradeCoin.symbol || '').toUpperCase();
        var qty = parseFloat(document.getElementById('trade-qty').value);
        var totEl = document.getElementById('trade-total-cost');
        if (!totEl) return;
        if (isNaN(qty) || qty <= 0) { totEl.textContent = CS[_tradeCur] + '0.00'; return; }
        totEl.textContent = CS[_tradeCur] + (qty * pLoc).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    
    window.CryptoDash._setTradeCoin = function(c) {
        _tradeCoin = c;
        document.getElementById('trade-qty').value = '';
        var tToast = document.getElementById('trade-toast');
        if (tToast) { tToast.className = 'trade-toast'; tToast.textContent = ''; }
        updateTradeUI();
    };

    document.getElementById('trade-qty').addEventListener('input', updateTradeUI);
    document.getElementById('trade-execute-btn').addEventListener('click', function () {
        var qty = parseFloat(document.getElementById('trade-qty').value);
        var toast = document.getElementById('trade-toast');
        var pLoc = _tradeCoin.current_price * window.CryptoDash.rates[_tradeCur];
        var CS = { usd: '$', inr: '₹', btc: '₿', eur: '€' };
        if (isNaN(qty) || qty <= 0) { toast.className = 'trade-toast error'; toast.textContent = 'Enter a valid quantity > 0.'; return; }
        if (isNaN(pLoc) || pLoc <= 0) { toast.className = 'trade-toast error'; toast.textContent = 'Invalid price. Cannot execute.'; return; }
        var priceUSD = window.CryptoDash.toUSD(pLoc, _tradeCur);
        if (_tradeType === 'buy') {
            var res = executeBuy(_tradeCoin, qty, priceUSD);
            if (!res.ok) { toast.className = 'trade-toast error'; toast.textContent = res.msg; return; }
            toast.className = 'trade-toast success';
            toast.textContent = '✓ Bought ' + qty + ' ' + (_tradeCoin.symbol || '').toUpperCase() + ' @ ' + CS[_tradeCur] + pLoc.toLocaleString();
            if (window.CryptoDash.sounds) window.CryptoDash.sounds.buy();
            if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_buy');
        } else {
            var res2 = executeSell(_tradeCoin.id, qty);
            if (!res2.ok) { toast.className = 'trade-toast error'; toast.textContent = res2.msg; return; }
            var ps = res2.pnl >= 0 ? '+' : '';
            toast.className = 'trade-toast success';
            toast.textContent = '✓ Sold ' + qty + ' ' + (_tradeCoin.symbol || '').toUpperCase() + ' · P&L: ' + ps + window.CryptoDash.fmtPrice(res2.pnl, window.CryptoDash.currency);
            if (window.CryptoDash.sounds) window.CryptoDash.sounds.sell();
            if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_sell');
        }
        document.getElementById('trade-qty').value = ''; 
        updateTradeUI();
        if (window.CryptoDash && window.CryptoDash.recordSnapshot) {
            window.CryptoDash.recordSnapshot();
        }
    });

    /* Tab switching */
    document.querySelectorAll('.pt-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.pt-tab').forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-pressed', 'false'); });
            tab.classList.add('active'); tab.setAttribute('aria-pressed', 'true');
            document.querySelectorAll('.pt-body').forEach(function (b) { b.classList.remove('active'); });
            document.getElementById('pt-body-' + tab.dataset.tab).classList.add('active');
            
            if (tab.dataset.tab === 'demat') renderDemat();
            if (tab.dataset.tab === 'analytics' && window.CryptoDash.renderPerformanceChart) {
                window.CryptoDash.renderPerformanceChart();
            }
        });
    });

    var dematSave = document.getElementById('demat-save-btn');
    var dematClear = document.getElementById('demat-clear-btn');
    var dematPan = document.getElementById('demat-pan-last4');
    if (dematSave) dematSave.addEventListener('click', saveDematFromForm);
    if (dematClear) dematClear.addEventListener('click', clearDemat);
    if (dematPan) {
        dematPan.addEventListener('input', function () {
            dematPan.value = (dematPan.value || '').replace(/\D/g, '').slice(0, 4);
        });
    }

    var pPanel = document.getElementById('portfolio-panel'), pOverlay = document.getElementById('portfolio-overlay');
    document.getElementById('portfolio-btn').addEventListener('click', function () {
        refreshAll(); updateBadge();
        pPanel.classList.add('open'); pOverlay.classList.add('open');
        window.CryptoDash.trapFocus(pPanel, document.getElementById('portfolio-close-btn'));
    });
    function closePort() { pPanel.classList.remove('open'); pOverlay.classList.remove('open'); }
    document.getElementById('portfolio-close-btn').addEventListener('click', closePort);
    pOverlay.addEventListener('click', closePort);

    updateBadge(); refreshSummary();
    loadFromCloud();

})();
