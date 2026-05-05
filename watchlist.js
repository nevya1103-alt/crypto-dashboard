/* js/watchlist.js */
(function() {
    function getWatchlist() { try { return JSON.parse(localStorage.getItem('crypto_watchlist')) || []; } catch(e) { return []; } }
    function saveWatchlist(w) { localStorage.setItem('crypto_watchlist', JSON.stringify(w)); syncToCloud(); }

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

        const { data, error } = await sb.from('portfolios').select('watchlist').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') return;
        if (data && data.watchlist) {
            localStorage.setItem('crypto_watchlist', JSON.stringify(data.watchlist));
        } else {
            localStorage.removeItem('crypto_watchlist');
        }
        if (typeof window.reRenderTable === 'function') window.reRenderTable();
        if (window.CryptoDash && window.CryptoDash.renderWatchlistPanel) window.CryptoDash.renderWatchlistPanel();
    }

    window.CryptoDash.toggleWatchlist = function(e, coinId) {
        if (e) { e.stopPropagation(); }
        var w = getWatchlist();
        var idx = w.indexOf(coinId);
        if (idx === -1) { 
            w.push(coinId); 
            if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('watchlist_start'); 
        } else { 
            w.splice(idx, 1); 
        }
        saveWatchlist(w);
        if (typeof window.reRenderTable === 'function') window.reRenderTable();
        window.CryptoDash.renderWatchlistPanel();
    };

    var prevPrices = {};
    window.CryptoDash.checkWatchlistRises = function () {
        var data = window.CryptoDash.rawData || [];
        var watchlist = getWatchlist();
        if (!watchlist.length || !data.length) { data.forEach(function (c) { prevPrices[c.id] = c.current_price; }); return; }
        data.forEach(function (c) {
            if (watchlist.indexOf(c.id) !== -1 && prevPrices[c.id] && c.current_price > prevPrices[c.id]) {
                if (window.CryptoDash.sounds) window.CryptoDash.sounds.rise();
            }
            prevPrices[c.id] = c.current_price;
        });
    };

    window.CryptoDash.renderWatchlistPanel = function() {
        var p = document.getElementById('watchlist-panel-body'), c = document.getElementById('watchlist-panel-count');
        if (!p) return;
        var w = getWatchlist(), data = window.CryptoDash.rawData || [], cur = window.CryptoDash.currency;
        if (c) c.textContent = w.length + ' coins';
        p.innerHTML = '';
        if (!w.length) {
            var empty = document.createElement('div');
            empty.className = 'alerts-empty';
            empty.innerHTML = 'Watchlist is empty.<br>Click the ⭐ next to a coin to add it.';
            p.appendChild(empty);
            return;
        }
        var coins = data.filter(function(x) { return w.indexOf(x.id) !== -1; });
        coins.forEach(function (coin) {
            var row = document.createElement('div');
            row.className = 'wl-item';
            row.addEventListener('click', function() { if (typeof window.CryptoDash._openModal === 'function') window.CryptoDash._openModal(coin); });
            
            var left = document.createElement('div');
            left.className = 'wl-item-left';
            if (coin.image) {
                var img = document.createElement('img'); img.src = coin.image;
                left.appendChild(img);
            }
            var textDiv = document.createElement('div');
            var nameDiv = document.createElement('div'); nameDiv.className = 'wl-item-name'; nameDiv.textContent = coin.name;
            var symDiv = document.createElement('div'); symDiv.className = 'wl-item-symbol'; symDiv.textContent = (coin.symbol || '').toUpperCase();
            textDiv.appendChild(nameDiv); textDiv.appendChild(symDiv);
            left.appendChild(textDiv);
            
            var right = document.createElement('div');
            right.className = 'wl-item-right';
            var pDiv = document.createElement('div'); pDiv.className = 'wl-item-price'; pDiv.textContent = window.CryptoDash.fmtPrice(coin.current_price, cur);
            var pctDiv = document.createElement('div'); pctDiv.className = 'wl-item-change ' + (coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative');
            pctDiv.textContent = (coin.price_change_percentage_24h >= 0 ? '+' : '') + (coin.price_change_percentage_24h || 0).toFixed(2) + '%';
            right.appendChild(pDiv); right.appendChild(pctDiv);
            
            var btn = document.createElement('button');
            btn.className = 'wl-item-remove';
            btn.textContent = '✕';
            btn.title = 'Remove from watchlist';
            btn.addEventListener('click', function(e) { window.CryptoDash.toggleWatchlist(e, coin.id); });
            
            row.appendChild(left); row.appendChild(right); row.appendChild(btn);
            p.appendChild(row);
        });
    };

    var wp = document.getElementById('watchlist-panel'), wo = document.getElementById('watchlist-overlay');
    document.getElementById('watchlist-btn').addEventListener('click', function () {
        window.CryptoDash.renderWatchlistPanel();
        wp.classList.add('open'); wo.classList.add('open');
        window.CryptoDash.trapFocus(wp, document.getElementById('watchlist-close-btn'));
    });
    function closeWl() { wp.classList.remove('open'); wo.classList.remove('open'); }
    document.getElementById('watchlist-close-btn').addEventListener('click', closeWl);
    wo.addEventListener('click', closeWl);
    loadFromCloud();
})();
