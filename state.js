/* js/state.js */
(function() {
    window.CryptoDash = window.CryptoDash || {};
    window.CryptoDash.currency = 'usd';
    // Add eur to rates
    window.CryptoDash.rates = { usd: 1, inr: 83.0, btc: 1, eur: 0.92 }; 
    window.CryptoDash.rawData = [];

    /* ── Supabase Initialization ── */
    var cfg = window.CryptoDashConfig || {};
    if (typeof supabase !== 'undefined' && cfg.SUPABASE_URL && cfg.SUPABASE_KEY) {
        window.CryptoDash.supabase = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    } else {
        console.warn("Supabase SDK not loaded or config missing. Database features will be disabled.");
    }

    // Formatter functions attached to global state for use in other modules
    window.CryptoDash.fmtPrice = function(usdValue, currency) {
        if (usdValue === null || usdValue === undefined) return '—';
        var v = usdValue * window.CryptoDash.rates[currency];
        if (currency === 'btc') return '₿' + v.toLocaleString('en-IN', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
        var sym = currency === 'inr' ? '₹' : currency === 'eur' ? '€' : '$';
        return sym + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    window.CryptoDash.fmtCompact = function(usdValue, currency) {
        if (usdValue === null || usdValue === undefined) return '—';
        var v = usdValue * window.CryptoDash.rates[currency];
        if (currency === 'btc') return v.toFixed(6) + ' ₿';
        var sym = currency === 'inr' ? '₹' : currency === 'eur' ? '€' : '$';
        if (v >= 1e12) return sym + (v / 1e12).toFixed(1) + 'T';
        if (v >= 1e9) return sym + (v / 1e9).toFixed(1) + 'B';
        if (v >= 1e6) return sym + (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e3) return sym + (v / 1e3).toFixed(1) + 'K';
        return sym + v.toFixed(2);
    };

    window.CryptoDash.fmtChange = function(val) {
        if (val === null || val === undefined) return '<td>—</td>';
        var cls = val >= 0 ? 'positive' : 'negative', pre = val >= 0 ? '+' : '';
        return '<td class="' + cls + '">' + pre + val.toFixed(2) + '%</td>';
    };

    window.CryptoDash.toUSD = function(val, cur) {
        if (cur === 'usd') return val;
        return val / window.CryptoDash.rates[cur];
    };

    window.reRenderTable = function () {
        var cur = window.CryptoDash.currency || 'usd';
        var labels = { usd: 'USD $', eur: 'EUR €', inr: 'INR ₹', btc: 'BTC ₿' };
        var priceHeader = document.getElementById('price-col-header');
        if (priceHeader) priceHeader.textContent = 'Price (' + (labels[cur] || cur.toUpperCase()) + ')';

        var data = window.CryptoDash.rawData || [];
        if (data.length) {
            var total = data.reduce(function (sum, coin) {
                return sum + (coin.current_price || 0);
            }, 0);
            var avg = document.getElementById('avg-price');
            if (avg) avg.textContent = window.CryptoDash.fmtPrice(total / data.length, cur);
        }

        document.querySelectorAll('#crypto-table-body tr[data-coin-id]').forEach(function (row) {
            var priceCell = row.querySelector('.price-cell');
            var mcapCell = row.querySelector('.mcap-cell');
            var volCell = row.querySelector('.vol-cell');
            if (priceCell) priceCell.textContent = window.CryptoDash.fmtPrice(parseFloat(priceCell.dataset.usd || '0'), cur);
            if (mcapCell) mcapCell.textContent = window.CryptoDash.fmtCompact(parseFloat(mcapCell.dataset.usd || '0'), cur);
            if (volCell) volCell.textContent = window.CryptoDash.fmtCompact(parseFloat(volCell.dataset.usd || '0'), cur);
        });

        document.querySelectorAll('#top-5-container .cap[data-usd]').forEach(function (cap) {
            cap.textContent = window.CryptoDash.fmtCompact(parseFloat(cap.dataset.usd || '0'), cur);
        });
    };

    /* Currency Toggle Logic */
    var btns = document.querySelectorAll('#currency-toggle .currency-btn');
    async function fetchRates() {
        try {
            var res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr,eur');
            var json = await res.json();
            if (json && json.bitcoin) {
                if (json.bitcoin.inr) window.CryptoDash.rates.inr = json.bitcoin.inr / json.bitcoin.usd;
                if (json.bitcoin.eur) window.CryptoDash.rates.eur = json.bitcoin.eur / json.bitcoin.usd;
                window.CryptoDash.rates.btc = 1 / json.bitcoin.usd;
                
                // Re-render table and portfolio when rates update
                if (typeof window.reRenderTable === 'function') window.reRenderTable();
                if (typeof window.CryptoDash._portfolioRender === 'function') window.CryptoDash._portfolioRender();
                if (typeof window.CryptoDash.renderAlerts === 'function') window.CryptoDash.renderAlerts();
            }
        } catch (e) {
            console.error("Failed to fetch exchange rates:", e);
        }
    }
    fetchRates();
    setInterval(fetchRates, 300000);

    btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            btns.forEach(function (b) { 
                b.classList.remove('active'); 
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            window.CryptoDash.currency = btn.dataset.cur;
            if (typeof window.reRenderTable === 'function') window.reRenderTable();
            if (typeof window.CryptoDash._portfolioRender === 'function') window.CryptoDash._portfolioRender();
            if (typeof window.CryptoDash.renderAlerts === 'function') window.CryptoDash.renderAlerts();
        });
    });

    /* ── Global Sync Engine ── */
    window.CryptoDash.saveAllToCloud = async function() {
        var sb = window.CryptoDash.supabase;
        if (!sb) return;
        
        try {
            var { data: { user } } = await sb.auth.getUser();
            if (!user) return;

            var profile = JSON.parse(localStorage.getItem('crypto_user_profile') || '{}');
            var payload = {
                user_id: user.id,
                wallet: parseFloat(localStorage.getItem('crypto_wallet_v3')) || 0,
                holdings: JSON.parse(localStorage.getItem('crypto_holdings_v3') || '{}'),
                transactions: JSON.parse(localStorage.getItem('crypto_tx_v3') || '[]'),
                demat: JSON.parse(localStorage.getItem('crypto_demat_demo_v1') || '{}'),
                alerts: JSON.parse(localStorage.getItem('crypto_alerts_v1') || '[]'),
                watchlist: JSON.parse(localStorage.getItem('crypto_watchlist') || '[]'),
                profile: profile,
                updated_at: new Date().toISOString()
            };

            // 1. Primary Save: Portfolios Table
            const { error: dbError } = await sb.from('portfolios').upsert(payload, { onConflict: 'user_id' });
            if (dbError) console.warn("Database sync error:", dbError.message);

            // 2. Secondary Save: Auth Metadata (Most reliable for profile)
            if (profile && Object.keys(profile).length > 0) {
                await sb.auth.updateUser({
                    data: {
                        full_name: profile.name || '',
                        phone: profile.phone || '',
                        gender: profile.gender || '',
                        dob: profile.dob || '',
                        occupation: profile.occupation || ''
                    }
                });
            }
        } catch (e) {
            console.warn("Cloud sync failed:", e.message);
        }
    };

    // Helper to clear errors
    window.CryptoDash.showSyncError = function(e) {
        if (window.CryptoDash.showToast) {
            window.CryptoDash.showToast("Sync Error: " + e.message, "error");
        }
    };

})();
