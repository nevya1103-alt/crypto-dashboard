        /* ── Global State ── */
        window.CryptoDash = {
            rawData: [],
            currency: 'usd',
            rates: { usd: 1, inr: 83.5, btc: 1 / 65000, eur: 0.92 }
        };

        /* ── Formatters ── */
        function fmtPrice(usdValue, currency) {
            var v = (usdValue || 0) * window.CryptoDash.rates[currency];
            if (currency === 'btc') return v.toFixed(8) + ' ₿';
            var sym = currency === 'inr' ? '₹' : currency === 'eur' ? '€' : '$';
            if (Math.abs(v) >= 0.01) return sym + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return sym + v.toLocaleString('en-IN', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
        }
        function fmtCompact(usdValue, currency) {
            var v = (usdValue || 0) * window.CryptoDash.rates[currency];
            if (currency === 'btc') return v.toFixed(6) + ' ₿';
            var sym = currency === 'inr' ? '₹' : currency === 'eur' ? '€' : '$';
            if (v >= 1e12) return sym + (v / 1e12).toFixed(1) + 'T';
            if (v >= 1e9) return sym + (v / 1e9).toFixed(1) + 'B';
            if (v >= 1e6) return sym + (v / 1e6).toFixed(1) + 'M';
            if (v >= 1e3) return sym + (v / 1e3).toFixed(1) + 'K';
            return sym + v.toFixed(2);
        }
        function fmtChange(v) {
            var val = v || 0, cls = val >= 0 ? 'positive' : 'negative', pre = val >= 0 ? '+' : '';
            return '<td class="' + cls + '">' + pre + val.toFixed(2) + '%</td>';
        }

        /* ── Re-render Table ── */
        function reRenderTable() {
            var currency = window.CryptoDash.currency;
            var labels = { usd: 'USD $', inr: 'INR ₹', btc: 'BTC ₿' };
            document.getElementById('price-col-header').textContent = 'Price (' + (labels[currency] || currency.toUpperCase()) + ')';
            var data = window.CryptoDash.rawData;
            if (data && data.length) {
                var tot = data.reduce(function (a, c) { return a + (c.current_price || 0); }, 0);
                document.getElementById('avg-price').textContent = fmtPrice(tot / data.length, currency);
            }
            var tbody = document.getElementById('crypto-table-body');
            if (tbody) {
                Array.from(tbody.querySelectorAll('tr[data-coin-id]')).forEach(function (row) {
                    var pc = row.querySelector('.price-cell'), mc = row.querySelector('.mcap-cell'), vc = row.querySelector('.vol-cell');
                    if (pc) pc.textContent = fmtPrice(parseFloat(pc.dataset.usd || 0), currency);
                    if (mc) mc.textContent = fmtCompact(parseFloat(mc.dataset.usd || 0), currency);
                    if (vc) vc.textContent = fmtCompact(parseFloat(vc.dataset.usd || 0), currency);
                });
            }
            if (typeof window.CryptoDash._portfolioRender === 'function') window.CryptoDash._portfolioRender();
        }

        /* ═══════════════════════════════════════════
           SOUND EFFECTS ENGINE (Web Audio API)
        ═══════════════════════════════════════════ */
        (function () {
            var ctx = null;
            var muted = localStorage.getItem('crypto_muted') === 'true';
            var btn = document.getElementById('mute-toggle-btn');

            function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

            function playTone(freq, dur, type, vol, ramp) {
                if (muted) return;
                try {
                    var ac = getCtx(), o = ac.createOscillator(), g = ac.createGain();
                    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ac.currentTime);
                    if (ramp) o.frequency.linearRampToValueAtTime(ramp, ac.currentTime + dur);
                    g.gain.setValueAtTime(vol || 0.15, ac.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
                    o.connect(g); g.connect(ac.destination);
                    o.start(); o.stop(ac.currentTime + dur);
                } catch (e) { }
            }

            window.CryptoDash.sounds = {
                buy: function () {
                    if (muted) return;
                    try {
                        var a = new Audio('https://actions.google.com/sounds/v1/foley/coin_drop_on_wood.ogg');
                        a.volume = 0.6;
                        a.play();
                    } catch (e) {
                        playTone(800, 0.12, 'sine', 0.15, 1200);
                        setTimeout(function () { playTone(1200, 0.15, 'sine', 0.12, 1400); }, 100);
                    }
                },
                sell: function () {
                    if (muted) return;
                    try {
                        var a = new Audio('https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg');
                        a.volume = 0.6;
                        a.play();
                    } catch (e) {
                        playTone(600, 0.08, 'square', 0.08);
                        setTimeout(function () { playTone(800, 0.08, 'square', 0.08); }, 80);
                        setTimeout(function () { playTone(1100, 0.15, 'sine', 0.12); }, 160);
                    }
                },
                alert: function () {
                    if (muted) return;
                    try {
                        var a = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
                        a.volume = 0.6;
                        a.play();
                    } catch (e) {
                        playTone(880, 0.15, 'sine', 0.15);
                        setTimeout(function () { playTone(660, 0.15, 'sine', 0.12); }, 150);
                        setTimeout(function () { playTone(440, 0.2, 'sine', 0.1); }, 300);
                    }
                },
                rise: function () {
                    if (muted) return;
                    try {
                        var a = new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg');
                        a.volume = 0.4;
                        a.play();
                    } catch (e) {
                        playTone(523, 0.1, 'sine', 0.08);
                        setTimeout(function () { playTone(659, 0.12, 'sine', 0.08); }, 100);
                    }
                },
                achieve: function () {
                    if (muted) return;
                    try {
                        var a = new Audio('https://actions.google.com/sounds/v1/cartoon/concussive_hit_gong.ogg');
                        a.volume = 0.6;
                        a.play();
                    } catch (e) {
                        playTone(523, 0.12, 'sine', 0.15);
                        setTimeout(function () { playTone(659, 0.12, 'sine', 0.15); }, 120);
                        setTimeout(function () { playTone(784, 0.2, 'sine', 0.18); }, 240);
                    }
                }
            };

            btn.textContent = muted ? '🔇' : '🔊';
            btn.addEventListener('click', function () {
                muted = !muted;
                localStorage.setItem('crypto_muted', muted);
                btn.textContent = muted ? '🔇' : '🔊';
                if (!muted) { getCtx(); playTone(800, 0.1, 'sine', 0.1); }
            });
        })();

        /* ═══════════════════════════════════════════
           PRICE ALERTS ENGINE
        ═══════════════════════════════════════════ */
        (function () {
            var AK = 'crypto_alerts_v1';
            function loadAlerts() { try { return JSON.parse(localStorage.getItem(AK)) || []; } catch (e) { return []; } }
            function saveAlerts(a) { localStorage.setItem(AK, JSON.stringify(a)); updateBadge(); }

            function updateBadge() {
                var alerts = loadAlerts(), badge = document.getElementById('alerts-badge');
                if (alerts.length) { badge.textContent = alerts.length; badge.classList.remove('hidden'); }
                else badge.classList.add('hidden');
            }

            function renderAlerts() {
                var alerts = loadAlerts(), list = document.getElementById('alerts-list');
                if (!alerts.length) { list.innerHTML = '<div class="alerts-empty">No alerts set yet.<br>Open a coin and set a price target!</div>'; return; }
                var html = '';
                alerts.forEach(function (a, i) {
                    html += '<div class="alert-item" data-idx="' + i + '">' +
                        '<div class="alert-item-info">' +
                        '<div class="alert-item-coin">' + a.coinName + ' (' + (a.symbol || '').toUpperCase() + ')</div>' +
                        '<div class="alert-item-target">' + (a.direction === 'above' ? '📈 Above' : '📉 Below') + ' $' + parseFloat(a.targetPrice).toLocaleString() + '</div>' +
                        '</div>' +
                        '<button class="alert-item-delete" data-idx="' + i + '" title="Delete alert">🗑</button>' +
                        '</div>';
                });
                list.innerHTML = html;
                list.querySelectorAll('.alert-item-delete').forEach(function (b) {
                    b.addEventListener('click', function () {
                        var alerts = loadAlerts();
                        alerts.splice(parseInt(b.dataset.idx), 1);
                        saveAlerts(alerts);
                        renderAlerts();
                    });
                });
            }

            /* Panel open/close */
            var panel = document.getElementById('alerts-panel'), overlay = document.getElementById('alerts-panel-overlay');
            document.getElementById('alerts-btn').addEventListener('click', function () {
                renderAlerts();
                panel.classList.add('open'); overlay.classList.add('open');
            });
            document.getElementById('alerts-panel-close').addEventListener('click', closeAlertsPanel);
            overlay.addEventListener('click', closeAlertsPanel);
            function closeAlertsPanel() { panel.classList.remove('open'); overlay.classList.remove('open'); }

            /* Add alert from coin modal */
            window.CryptoDash.addAlert = function (coinId, coinName, symbol, targetPrice, direction) {
                var alerts = loadAlerts();
                alerts.push({ id: Date.now(), coinId: coinId, coinName: coinName, symbol: symbol, targetPrice: targetPrice, direction: direction, createdAt: new Date().toISOString() });
                saveAlerts(alerts);
                if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('alert_setter');
            };

            /* Check alerts against current prices */
            window.CryptoDash.checkAlerts = function () {
                var alerts = loadAlerts(), data = window.CryptoDash.rawData || [], triggered = [];
                if (!data.length || !alerts.length) return;
                var remaining = [];
                alerts.forEach(function (a) {
                    var coin = null;
                    for (var i = 0; i < data.length; i++) { if (data[i].id === a.coinId) { coin = data[i]; break; } }
                    if (!coin) { remaining.push(a); return; }
                    var price = coin.current_price || 0;
                    var hit = (a.direction === 'above' && price >= a.targetPrice) || (a.direction === 'below' && price <= a.targetPrice);
                    if (hit) {
                        triggered.push(a);
                        if (window.CryptoDash.sounds) window.CryptoDash.sounds.alert();
                        /* Browser notification */
                        if (Notification.permission === 'granted') {
                            new Notification('🔔 Price Alert: ' + a.coinName, {
                                body: (a.direction === 'above' ? '📈 Rose above' : '📉 Fell below') + ' $' + parseFloat(a.targetPrice).toLocaleString() + '\nCurrent: $' + price.toLocaleString(),
                                icon: coin.image || ''
                            });
                        }
                    } else { remaining.push(a); }
                });
                if (triggered.length) saveAlerts(remaining);
            };

            /* Request notification permission */
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

            /* Check watchlist rises */
            var prevPrices = {};
            window.CryptoDash.checkWatchlistRises = function () {
                var data = window.CryptoDash.rawData || [];
                var watchlist = [];
                try { watchlist = JSON.parse(localStorage.getItem('crypto_watchlist')) || []; } catch (e) { }
                if (!watchlist.length || !data.length) { data.forEach(function (c) { prevPrices[c.id] = c.current_price; }); return; }
                data.forEach(function (c) {
                    if (watchlist.indexOf(c.id) !== -1 && prevPrices[c.id] && c.current_price > prevPrices[c.id]) {
                        if (window.CryptoDash.sounds) window.CryptoDash.sounds.rise();
                    }
                    prevPrices[c.id] = c.current_price;
                });
            };

            updateBadge();
        })();

        /* ═══════════════════════════════════════════
           ACHIEVEMENTS ENGINE
        ═══════════════════════════════════════════ */
        (function () {
            var SK = 'crypto_achievements_v1';
            var DEFS = [
                { id: 'first_deposit', icon: '🏁', name: 'First Steps', desc: 'Make your first deposit' },
                { id: 'first_buy', icon: '🛒', name: 'First Trade', desc: 'Execute your first buy' },
                { id: 'first_sell', icon: '💸', name: 'First Sale', desc: 'Execute your first sell' },
                { id: 'watchlist_start', icon: '🌟', name: 'Watchlist Starter', desc: 'Add a coin to watchlist' },
                { id: 'analyst', icon: '📊', name: 'Analyst', desc: 'Use CryptoBot' },
                { id: 'high_roller', icon: '💰', name: 'High Roller', desc: 'Portfolio value > $10,000' },
                { id: 'alert_setter', icon: '🎯', name: 'Alert Setter', desc: 'Set your first price alert' },
                { id: 'in_profit', icon: '📈', name: 'In Profit', desc: 'Total P&L is positive' },
                { id: 'diversified', icon: '🗂️', name: 'Diversified', desc: 'Hold 5+ different coins' },
                { id: 'crypto_king', icon: '👑', name: 'Crypto King', desc: 'Unlock all other badges' }
            ];

            function load() { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch (e) { return {}; } }
            function save(d) { localStorage.setItem(SK, JSON.stringify(d)); }

            function updateBadge() {
                var u = load(), count = Object.keys(u).length;
                document.getElementById('trophy-badge').textContent = count + '/' + DEFS.length;
            }

            function showToast(def) {
                var t = document.getElementById('achieve-toast');
                t.querySelector('.achieve-toast-icon').textContent = def.icon;
                t.querySelector('.achieve-toast-text').textContent = 'Achievement Unlocked: ' + def.name + '!';
                t.classList.add('show');
                if (window.CryptoDash.sounds) window.CryptoDash.sounds.achieve();
                setTimeout(function () { t.classList.remove('show'); }, 3500);
            }

            window.CryptoDash.checkAchievement = function (id) {
                var data = load();
                if (data[id]) return; /* Already unlocked */
                data[id] = { unlockedAt: new Date().toISOString() };
                save(data);
                updateBadge();
                var def = DEFS.find(function (d) { return d.id === id; });
                if (def) showToast(def);
                /* Check crypto_king */
                if (id !== 'crypto_king' && Object.keys(data).length >= DEFS.length - 1) {
                    setTimeout(function () { window.CryptoDash.checkAchievement('crypto_king'); }, 1500);
                }
            };

            /* Auto-check portfolio-based achievements */
            window.CryptoDash.checkPortfolioAchievements = function () {
                var h = {}, data = load();
                try { h = JSON.parse(localStorage.getItem('crypto_holdings_v3')) || {}; } catch (e) { }
                var coins = Object.values(h);
                if (coins.length >= 5 && !data.diversified) window.CryptoDash.checkAchievement('diversified');
                if (coins.length) {
                    var rawData = window.CryptoDash.rawData || [];
                    var totalVal = 0, totalCost = 0;
                    coins.forEach(function (e) {
                        var price = 0;
                        for (var i = 0; i < rawData.length; i++) { if (rawData[i].id === e.id) { price = rawData[i].current_price || 0; break; } }
                        totalVal += e.qty * price;
                        totalCost += e.totalInvestedUSD || 0;
                    });
                    if (totalVal > 10000 && !data.high_roller) window.CryptoDash.checkAchievement('high_roller');
                    if (totalVal > totalCost && totalCost > 0 && !data.in_profit) window.CryptoDash.checkAchievement('in_profit');
                }
            };

            function renderGrid() {
                var unlocked = load(), grid = document.getElementById('achieve-grid'), html = '';
                DEFS.forEach(function (d) {
                    var u = unlocked[d.id], cls = u ? 'unlocked' : 'locked';
                    html += '<div class="achieve-card ' + cls + '">' +
                        '<div class="achieve-icon">' + d.icon + '</div>' +
                        '<div class="achieve-name">' + d.name + '</div>' +
                        '<div class="achieve-desc">' + d.desc + '</div>' +
                        (u ? '<div class="achieve-date">✓ ' + new Date(u.unlockedAt).toLocaleDateString() + '</div>' : '') +
                        '</div>';
                });
                grid.innerHTML = html;
            }

            /* Panel */
            document.getElementById('trophy-btn').addEventListener('click', function () {
                renderGrid();
                document.getElementById('achieve-panel').classList.add('open');
                document.getElementById('achieve-panel-overlay').classList.add('open');
            });
            document.getElementById('achieve-close').addEventListener('click', closeAchieve);
            document.getElementById('achieve-panel-overlay').addEventListener('click', closeAchieve);
            function closeAchieve() {
                document.getElementById('achieve-panel').classList.remove('open');
                document.getElementById('achieve-panel-overlay').classList.remove('open');
            }

            updateBadge();
        })();

        /* ── Currency Toggle ── */
        (function () {
            var btns = document.querySelectorAll('#currency-toggle .currency-btn');
            async function fetchRates() {
                try {
                    var res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr');
                    var json = await res.json();
                    var btcUsd = json.bitcoin.usd;
                    window.CryptoDash.rates.inr = json.bitcoin.inr / btcUsd;
                    window.CryptoDash.rates.btc = 1 / btcUsd;
                } catch (e) { window.CryptoDash.rates.inr = 83.5; window.CryptoDash.rates.btc = 1 / 65000; }
            }
            fetchRates();
            btns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    btns.forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    window.CryptoDash.currency = btn.dataset.currency;
                    reRenderTable();
                });
            });
        })();

        /* ── Coin Detail Modal ── */
        (function () {
            var overlay = document.getElementById('coin-detail-overlay');
            var closeBtn = document.getElementById('modal-close-btn');
            var tabs = document.querySelectorAll('#chart-tabs .chart-tab');
            var chartInst = null, currentCoinId = null, currentDays = 7;

            function openModal(coin) {
                currentCoinId = coin.id;
                var currency = window.CryptoDash.currency;
                document.getElementById('modal-coin-logo').src = coin.image || '';
                document.getElementById('modal-coin-logo').alt = coin.name;
                document.getElementById('modal-coin-name').textContent = coin.name;
                document.getElementById('modal-coin-symbol').textContent = (coin.symbol || '').toUpperCase();
                document.getElementById('modal-coin-rank').textContent = 'Rank #' + (coin.market_cap_rank || '?');
                var stats = [
                    { label: 'Price', value: fmtPrice(coin.current_price, currency) },
                    { label: 'Market Cap', value: fmtCompact(coin.market_cap, currency) },
                    { label: '24h Volume', value: fmtCompact(coin.total_volume, currency) },
                    { label: '1h Change', value: fmt1c(coin.price_change_percentage_1h_in_currency) },
                    { label: '24h Change', value: fmt1c(coin.price_change_percentage_24h) },
                    { label: '7d Change', value: fmt1c(coin.price_change_percentage_7d_in_currency) }
                ];
                document.getElementById('modal-stats').innerHTML = stats.map(function (s) {
                    return '<div class="modal-stat-card"><div class="label">' + s.label + '</div><div class="value">' + s.value + '</div></div>';
                }).join('');
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tabs[0].classList.add('active');
                currentDays = 7;
                if (typeof window.CryptoDash._setTradeCoin === 'function') window.CryptoDash._setTradeCoin(coin);
                overlay.classList.add('open');
                document.body.style.overflow = 'hidden';
                loadChart(coin.id, 7);
            }
            function fmt1c(v) {
                var val = v || 0, col = val >= 0 ? '#10b981' : '#ef4444', pre = val >= 0 ? '+' : '';
                return '<span style="color:' + col + '">' + pre + val.toFixed(2) + '%</span>';
            }
            function closeModal() {
                overlay.classList.remove('open');
                document.body.style.overflow = '';
                if (chartInst) { chartInst.destroy(); chartInst = null; }
            }
            closeBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
            tabs.forEach(function (tab) {
                tab.addEventListener('click', function () {
                    tabs.forEach(function (t) { t.classList.remove('active'); });
                    tab.classList.add('active');
                    currentDays = parseInt(tab.dataset.days);
                    if (chartInst) { chartInst.destroy(); chartInst = null; }
                    loadChart(currentCoinId, currentDays);
                });
            });

            /* Alert Form Logic */
            var setAlertBtn = document.getElementById('alert-set-btn');
            var alertPriceInput = document.getElementById('alert-price-input');
            var alertDirBtns = document.querySelectorAll('.alert-dir-btn');
            var currentAlertDir = 'above';
            alertDirBtns.forEach(function (b) {
                b.addEventListener('click', function () {
                    alertDirBtns.forEach(function (x) { x.classList.remove('active'); });
                    b.classList.add('active');
                    currentAlertDir = b.dataset.dir;
                });
            });
            setAlertBtn.addEventListener('click', function () {
                var targetPrice = parseFloat(alertPriceInput.value);
                if (isNaN(targetPrice) || targetPrice <= 0) { alert('Enter a valid target price.'); return; }
                if (typeof window.CryptoDash.addAlert === 'function') {
                    window.CryptoDash.addAlert(currentCoinId, document.getElementById('modal-coin-name').textContent, document.getElementById('modal-coin-symbol').textContent, targetPrice, currentAlertDir);
                    alertPriceInput.value = '';
                    var ogText = setAlertBtn.textContent;
                    setAlertBtn.textContent = '✓ Set';
                    setTimeout(function () { setAlertBtn.textContent = ogText; }, 1500);
                }
            });
            async function loadChart(coinId, days) {
                var loadEl = document.getElementById('chart-loading'), canvas = document.getElementById('detail-chart');
                loadEl.style.display = 'flex'; canvas.style.display = 'none';
                try {
                    var res = await fetch('https://api.coingecko.com/api/v3/coins/' + coinId + '/market_chart?vs_currency=usd&days=' + days + '&interval=' + (days <= 30 ? 'daily' : 'weekly'));
                    var json = await res.json();
                    var prices = json.prices || [];
                    var labels = prices.map(function (p) { return new Date(p[0]).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); });
                    var values = prices.map(function (p) { return p[1] * window.CryptoDash.rates[window.CryptoDash.currency]; });
                    var isUp = values[values.length - 1] >= values[0];
                    var grad = canvas.getContext('2d').createLinearGradient(0, 0, 0, 280);
                    var col = isUp ? '16,185,129' : '239,68,68';
                    grad.addColorStop(0, 'rgba(' + col + ',0.35)'); grad.addColorStop(1, 'rgba(' + col + ',0)');
                    if (chartInst) chartInst.destroy();
                    chartInst = new Chart(canvas, {
                        type: 'line',
                        data: { labels, datasets: [{ data: values, fill: true, backgroundColor: grad, borderColor: isUp ? '#10b981' : '#ef4444', borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
                        options: {
                            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return fmtPrice(ctx.raw / window.CryptoDash.rates[window.CryptoDash.currency], window.CryptoDash.currency); } } } },
                            scales: {
                                x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#94a3b8', maxTicksLimit: 8, font: { family: 'Outfit' } } },
                                y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#94a3b8', font: { family: 'Outfit' }, callback: function (v) { return fmtPrice(v / window.CryptoDash.rates[window.CryptoDash.currency], window.CryptoDash.currency); } } }
                            }
                        }
                    });
                    loadEl.style.display = 'none'; canvas.style.display = 'block';
                } catch (e) { loadEl.textContent = 'Failed to load chart data.'; }
            }
            document.getElementById('crypto-table-body').addEventListener('click', function (e) {
                if (e.target.closest('.star-btn')) return;
                var row = e.target.closest('tr.clickable-row');
                if (!row) return;
                var rawData = window.CryptoDash.rawData;
                if (!rawData || !rawData.length) return;
                for (var i = 0; i < rawData.length; i++) { if (rawData[i].id === row.dataset.coinId) { openModal(rawData[i]); break; } }
            });
        })();

        /* ── Search ── */
        (function () {
            var si = document.getElementById('crypto-search'), cb = document.getElementById('search-clear-btn'), ce = document.getElementById('search-results-count');
            function filter() {
                var q = si.value.trim().toLowerCase(), tbody = document.getElementById('crypto-table-body');
                if (!tbody) return;
                var enr = tbody.querySelector('.no-results-row'); if (enr) enr.remove();
                var rows = Array.from(tbody.querySelectorAll('tr:not(.no-results-row)')), vis = 0;
                rows.forEach(function (r) { var m = !q || r.textContent.toLowerCase().includes(q); r.style.display = m ? '' : 'none'; if (m) vis++; });
                cb.classList.toggle('visible', q.length > 0);
                if (!q) { ce.textContent = ''; }
                else if (vis === 0) { ce.textContent = 'No results found.'; var nr = document.createElement('tr'); nr.className = 'no-results-row'; nr.innerHTML = '<td colspan="10"><span class="no-results-emoji">🔍</span>No match for "' + si.value.trim() + '"</td>'; tbody.appendChild(nr); }
                else { ce.textContent = vis + (vis === 1 ? ' result' : ' results') + ' found'; }
            }
            si.addEventListener('input', filter);
            cb.addEventListener('click', function () { si.value = ''; filter(); si.focus(); });
            var obs = new MutationObserver(function () { if (si.value.trim()) filter(); });
            var tb = document.getElementById('crypto-table-body'); if (tb) obs.observe(tb, { childList: true, subtree: true });
        })();

        /* ── Watchlist ── */
        (function () {
            var SK = 'crypto_watchlist';
            function load() { try { return JSON.parse(localStorage.getItem(SK)) || []; } catch (e) { return []; } }
            function save(l) { localStorage.setItem(SK, JSON.stringify(l)); }
            var openBtn = document.getElementById('watchlist-btn'), badge = document.getElementById('watchlist-badge'),
                overlay = document.getElementById('watchlist-overlay'), panel = document.getElementById('watchlist-panel'),
                closeBtn = document.getElementById('watchlist-close-btn'), body = document.getElementById('watchlist-panel-body'),
                count = document.getElementById('watchlist-panel-count');
            function updateBadge() { var l = load(); badge.textContent = l.length; badge.classList.toggle('hidden', l.length === 0); count.textContent = l.length + (l.length === 1 ? ' coin' : ' coins'); }
            function render() {
                var l = load(); body.innerHTML = '';
                if (!l.length) { body.innerHTML = '<div class="watchlist-empty"><span class="watchlist-empty-icon">⭐</span><p>No coins watchlisted yet.</p><p style="font-size:.85rem;margin-top:.4rem">Click ⭐ next to any coin.</p></div>'; return; }
                l.forEach(function (c) {
                    var d = document.createElement('div'); d.className = 'watchlist-item'; d.dataset.coinId = c.id;
                    var ico = c.image ? '<img class="watchlist-item-icon" src="' + c.image + '" alt="' + c.name + '" onerror="this.style.display=\'none\'">' : '<div class="watchlist-item-icon-placeholder">⭐</div>';
                    d.innerHTML = '<div class="watchlist-item-info">' + ico + '<div><div class="watchlist-item-name">' + c.name + '</div><div class="watchlist-item-symbol">' + c.symbol + '</div></div></div><button class="watchlist-item-remove" data-coin-id="' + c.id + '">✕</button>';
                    body.appendChild(d);
                });
                body.querySelectorAll('.watchlist-item-remove').forEach(function (b) { b.addEventListener('click', function () { remove(b.dataset.coinId); }); });
            }
            function add(c) { var l = load(); if (!l.find(function (x) { return x.id === c.id; })) { l.push(c); save(l); } updateBadge(); render(); if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('watchlist_start'); }
            function remove(id) {
                save(load().filter(function (c) { return c.id !== id; })); updateBadge(); render();
                var s = document.querySelector('.star-btn[data-coin-id="' + id + '"]'); if (s) { s.classList.remove('starred'); s.title = 'Add to Watchlist'; }
            }
            function attachStars() {
                var tbody = document.getElementById('crypto-table-body'); if (!tbody) return;
                var wids = load().map(function (c) { return c.id; });
                Array.from(tbody.querySelectorAll('tr[data-coin-id]')).forEach(function (row) {
                    if (row.querySelector('.star-btn')) return;
                    var id = row.dataset.coinId, nm = row.dataset.coinName, sym = row.dataset.coinSymbol, img = row.dataset.coinImage, starred = wids.includes(id);
                    var td = document.createElement('td'); td.style.width = '40px';
                    var btn = document.createElement('button'); btn.className = 'star-btn' + (starred ? ' starred' : ''); btn.textContent = '⭐'; btn.title = starred ? 'Remove from Watchlist' : 'Add to Watchlist'; btn.dataset.coinId = id;
                    td.appendChild(btn); row.insertBefore(td, row.firstChild);
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (btn.classList.contains('starred')) { btn.classList.remove('starred'); btn.title = 'Add to Watchlist'; remove(id); }
                        else { btn.classList.add('starred'); btn.title = 'Remove from Watchlist'; add({ id, name: nm, symbol: sym, image: img }); }
                    });
                });
            }
            function openPanel() { render(); panel.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
            function closePanel() { panel.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; }
            openBtn.addEventListener('click', openPanel); closeBtn.addEventListener('click', closePanel); overlay.addEventListener('click', closePanel);
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
            var obs = new MutationObserver(function () { attachStars(); updateBadge(); });
            var tb = document.getElementById('crypto-table-body'); if (tb) obs.observe(tb, { childList: true, subtree: false });
            document.addEventListener('DOMContentLoaded', function () { var t = document.getElementById('crypto-table-body'); if (t) obs.observe(t, { childList: true, subtree: false }); });
            updateBadge();
        })();

        /* ═══════════════════════════════════════════
           TRADING PORTFOLIO ENGINE
        ═══════════════════════════════════════════ */
        (function () {
            var WK = 'crypto_wallet_v3', HK = 'crypto_holdings_v3', TK = 'crypto_tx_v3';
            function loadW() { return parseFloat(localStorage.getItem(WK) || '0') || 0; }
            function saveW(v) { localStorage.setItem(WK, String(v)); }
            function loadH() { try { return JSON.parse(localStorage.getItem(HK)) || {}; } catch (e) { return {}; } }
            function saveH(h) { localStorage.setItem(HK, JSON.stringify(h)); }
            function loadT() { try { return JSON.parse(localStorage.getItem(TK)) || []; } catch (e) { return []; } }
            function saveT(t) { localStorage.setItem(TK, JSON.stringify(t)); }

            /* Conversion */
            function toUSD(amt, cur) {
                var r = window.CryptoDash.rates;
                if (cur === 'usd') return amt;
                if (cur === 'inr') return amt / (r.inr || 83.5);
                if (cur === 'eur') return amt / (r.eur || 0.92);
                if (cur === 'btc') return amt / (r.btc || 1 / 65000);
                return amt;
            }
            function fromUSD(usd, cur) {
                var r = window.CryptoDash.rates;
                if (cur === 'usd') return usd;
                if (cur === 'inr') return usd * (r.inr || 83.5);
                if (cur === 'eur') return usd * (r.eur || 0.92);
                if (cur === 'btc') return usd * (r.btc || 1 / 65000);
                return usd;
            }
            var CL = { usd: 'USD $', inr: 'INR ₹', eur: 'EUR €', btc: 'BTC ₿' };
            var CS = { usd: '$', inr: '₹', eur: '€', btc: '₿' };

            /* Fetch EUR rate */
            fetch('https://api.exchangerate-api.com/v4/latest/USD')
                .then(function (r) { return r.json(); })
                .then(function (j) { if (j.rates && j.rates.EUR) window.CryptoDash.rates.eur = j.rates.EUR; })
                .catch(function () { });

            /* Live price */
            function getPriceUSD(coinId) {
                var d = window.CryptoDash.rawData; if (!d) return null;
                for (var i = 0; i < d.length; i++) { if (d[i].id === coinId) return d[i].current_price || 0; }
                return null;
            }

            /* Badge */
            function updateBadge() {
                var n = Object.keys(loadH()).length, b = document.getElementById('portfolio-badge');
                if (b) { b.textContent = n; b.classList.toggle('hidden', n === 0); }
            }

            /* BUY */
            function executeBuy(coinMeta, qty, priceUSD) {
                var total = qty * priceUSD, wallet = loadW();
                if (total > wallet + 1e-8) return { ok: false, msg: 'Insufficient balance. Need ' + fmtPrice(total, 'usd') + ', have ' + fmtPrice(wallet, 'usd') + '.' };
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

            /* SELL */
            function executeSell(coinId, qty) {
                var h = loadH(), e = h[coinId];
                if (!e || e.qty < qty - 1e-10) return { ok: false, msg: 'Not enough holdings.' };
                var price = getPriceUSD(coinId);
                if (price === null) return { ok: false, msg: 'Price unavailable — try again shortly.' };
                var proceeds = qty * price, cost = qty * e.avgBuyPriceUSD, pnl = proceeds - cost;
                saveW(loadW() + proceeds);
                e.totalInvestedUSD -= cost; e.qty -= qty;
                if (e.qty <= 1e-10) delete h[coinId]; else e.avgBuyPriceUSD = e.totalInvestedUSD / e.qty;
                saveH(h);
                var ename = e.name, esym = e.symbol, eimg = e.image; // capture before possible delete
                var t = loadT(); t.unshift({ type: 'SELL', coinId: coinId, coinName: ename, symbol: esym, image: eimg, qty: qty, priceUSD: price, totalUSD: proceeds, pnlUSD: pnl, date: new Date().toISOString() }); saveT(t);
                refreshAll(); updateBadge();
                return { ok: true, pnl: pnl };
            }

            /* Summary */
            function refreshSummary() {
                var cur = window.CryptoDash.currency, wallet = loadW(), h = loadH();
                var totalVal = 0, totalCost = 0;
                Object.values(h).forEach(function (e) { var p = getPriceUSD(e.id); if (p !== null) totalVal += e.qty * p; totalCost += e.totalInvestedUSD; });
                var pnl = totalVal - totalCost, pc = pnl >= 0 ? '#10b981' : '#ef4444', ps = pnl >= 0 ? '+' : '';
                var b;
                b = document.getElementById('pt-balance'); if (b) b.textContent = fmtPrice(wallet, cur);
                b = document.getElementById('pt-total-value'); if (b) b.textContent = fmtPrice(totalVal, cur);
                b = document.getElementById('pt-total-pnl'); if (b) b.innerHTML = '<span style="color:' + pc + '">' + ps + fmtPrice(pnl, cur) + '</span>';
                b = document.getElementById('wallet-bal-val'); if (b) b.textContent = fmtPrice(wallet, cur);
            }

            /* Holdings Tab */
            function renderHoldings() {
                var body = document.getElementById('pt-body-holdings'); if (!body) return;
                var h = loadH(), cur = window.CryptoDash.currency, coins = Object.values(h);
                if (!coins.length) { body.innerHTML = '<div class="holdings-empty"><span class="holdings-empty-icon">📭</span><p style="font-weight:600">No holdings yet.</p><p style="font-size:.85rem;margin-top:.4rem">Click a coin → Trade → Buy to start.</p></div>'; return; }
                var html = '';
                coins.forEach(function (e) {
                    var price = getPriceUSD(e.id), has = price !== null;
                    var cv = has ? e.qty * price : null, cost = e.totalInvestedUSD;
                    var pnl = cv !== null ? cv - cost : null, pct = (pnl !== null && cost > 0) ? (pnl / cost) * 100 : null;
                    var pc = (pnl !== null && pnl >= 0) ? '#10b981' : '#ef4444', ps = (pnl !== null && pnl >= 0) ? '+' : '';
                    var qs = parseFloat(e.qty.toFixed(8)).toString();
                    var ph = pnl !== null ? '<span style="color:' + pc + '">' + ps + fmtPrice(pnl, cur) + (pct !== null ? ' (' + ps + pct.toFixed(2) + '%)' : '') + '</span>' : '<span style="color:var(--text-secondary)">—</span>';
                    html += '<div class="holding-card"><div class="holding-card-header"><div class="holding-coin-info">';
                    if (e.image) html += '<img class="holding-coin-logo" src="' + e.image + '" alt="' + e.name + '">';
                    html += '<div><div class="holding-coin-name">' + e.name + '</div><div class="holding-coin-qty">' + qs + ' ' + (e.symbol || '').toUpperCase() + '</div></div></div>';
                    html += '<button class="holding-sell-btn" data-coin-id="' + e.id + '">Sell</button></div>';
                    html += '<div class="holding-metrics">';
                    html += '<div class="holding-metric"><span class="hm-label">Avg Buy</span><span class="hm-val">' + fmtPrice(e.avgBuyPriceUSD, cur) + '</span></div>';
                    html += '<div class="holding-metric"><span class="hm-label">Current</span><span class="hm-val">' + (has ? fmtPrice(price, cur) : '—') + '</span></div>';
                    html += '<div class="holding-metric"><span class="hm-label">Invested</span><span class="hm-val">' + fmtPrice(cost, cur) + '</span></div>';
                    html += '<div class="holding-metric"><span class="hm-label">Value</span><span class="hm-val">' + (cv !== null ? fmtPrice(cv, cur) : '—') + '</span></div>';
                    html += '</div><div class="holding-pnl-row"><span>P&amp;L</span>' + ph + '</div></div>';
                });
                body.innerHTML = html;
                body.querySelectorAll('.holding-sell-btn').forEach(function (btn) {
                    btn.addEventListener('click', function (e) { e.stopPropagation(); openSellModal(btn.dataset.coinId); });
                });
            }

            /* History Tab */
            function renderHistory() {
                var body = document.getElementById('pt-body-history'); if (!body) return;
                var hist = loadT(), cur = window.CryptoDash.currency;
                if (!hist.length) { body.innerHTML = '<div class="history-empty"><span class="history-empty-icon">📭</span><p>No transactions yet.</p></div>'; return; }
                var html = '<button id="export-csv-btn" style="margin-bottom: 1rem; width: 100%; padding: 0.6rem; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-family: \'Outfit\', sans-serif; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.06)\'">📥 Download CSV</button>';
                hist.forEach(function (tx) {
                    var ds = new Date(tx.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    var ph = '';
                    if (tx.type === 'SELL' && tx.pnlUSD !== undefined) {
                        var pc = tx.pnlUSD >= 0 ? '#10b981' : '#ef4444', ps = tx.pnlUSD >= 0 ? '+' : '';
                        ph = ' <span style="color:' + pc + ';font-size:.72rem">(' + ps + fmtPrice(tx.pnlUSD, cur) + ')</span>';
                    }
                    var qs = parseFloat((tx.qty || 0).toFixed(8)).toString();
                    html += '<div class="tx-item"><span class="tx-badge ' + tx.type.toLowerCase() + '">' + tx.type + '</span>';
                    html += '<div class="tx-info"><div class="tx-coin-name">' + tx.coinName + ' <span style="font-size:.74rem;color:var(--text-secondary)">' + (tx.symbol || '').toUpperCase() + '</span></div>';
                    html += '<div class="tx-details">' + qs + ' @ ' + fmtPrice(tx.priceUSD, cur) + '</div></div>';
                    html += '<div><div class="tx-value">' + fmtPrice(tx.totalUSD, cur) + ph + '</div><div class="tx-date">' + ds + '</div></div></div>';
                });
                body.innerHTML = html;

                document.getElementById('export-csv-btn').addEventListener('click', function () {
                    var csv = 'Date,Type,Coin,Symbol,Quantity,Price (USD),Total (USD),P&L (USD)\n';
                    hist.forEach(function (t) {
                        csv += [
                            '"' + new Date(t.date).toLocaleString() + '"',
                            t.type,
                            '"' + t.coinName + '"',
                            (t.symbol || '').toUpperCase(),
                            t.qty,
                            t.priceUSD,
                            t.totalUSD,
                            t.pnlUSD || 0
                        ].join(',') + '\n';
                    });
                    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a'); a.href = url; a.download = 'portfolio_history.csv';
                    a.click(); URL.revokeObjectURL(url);
                });
            }

            function refreshAll() { refreshSummary(); renderHoldings(); renderHistory(); }

            /* Sell Modal */
            var _sellId = null;
            function openSellModal(coinId) {
                var h = loadH(), e = h[coinId]; if (!e) return;
                _sellId = coinId;
                var cur = window.CryptoDash.currency, price = getPriceUSD(coinId) || 0, qs = parseFloat(e.qty.toFixed(8)).toString();
                var logo = document.getElementById('sell-modal-logo');
                if (e.image) { logo.src = e.image; logo.style.display = ''; } else logo.style.display = 'none';
                document.getElementById('sell-modal-title').textContent = 'Sell ' + e.name;
                document.getElementById('sell-modal-sub').textContent = (e.symbol || '').toUpperCase() + ' · Holding: ' + qs + ' units';
                document.getElementById('sell-avail-qty').textContent = qs + ' ' + (e.symbol || '').toUpperCase();
                document.getElementById('sell-avg-buy').textContent = fmtPrice(e.avgBuyPriceUSD, cur);
                document.getElementById('sell-cur-price').textContent = fmtPrice(price, cur);
                document.getElementById('sell-proceeds').textContent = '—';
                document.getElementById('sell-est-pnl').innerHTML = '—';
                document.getElementById('sell-qty-input').value = '';
                document.getElementById('sell-toast').className = 'sell-toast';
                document.getElementById('sell-toast').textContent = '';
                document.getElementById('sell-modal-overlay').classList.add('open');
                document.body.style.overflow = 'hidden';
            }
            function closeSellModal() {
                document.getElementById('sell-modal-overlay').classList.remove('open');
                document.body.style.overflow = ''; _sellId = null;
            }
            document.getElementById('sell-modal-close').addEventListener('click', closeSellModal);
            document.getElementById('sell-modal-overlay').addEventListener('click', function (e) { if (e.target === this) closeSellModal(); });
            document.getElementById('sell-qty-input').addEventListener('input', function () {
                if (!_sellId) return;
                var h = loadH(), e = h[_sellId]; if (!e) return;
                var qty = parseFloat(this.value) || 0, price = getPriceUSD(_sellId) || 0, cur = window.CryptoDash.currency;
                var proceeds = qty * price, cost = qty * e.avgBuyPriceUSD, pnl = proceeds - cost;
                var pc = pnl >= 0 ? '#10b981' : '#ef4444', ps = pnl >= 0 ? '+' : '';
                document.getElementById('sell-proceeds').textContent = fmtPrice(proceeds, cur);
                document.getElementById('sell-est-pnl').innerHTML = '<span style="color:' + pc + '">' + ps + fmtPrice(pnl, cur) + '</span>';
            });
            document.getElementById('sell-execute-btn').addEventListener('click', function () {
                var toast = document.getElementById('sell-toast'), qty = parseFloat(document.getElementById('sell-qty-input').value);
                toast.className = 'sell-toast';
                if (!_sellId) return;
                if (isNaN(qty) || qty <= 0) { toast.className = 'sell-toast error'; toast.textContent = 'Enter a valid quantity > 0.'; return; }
                var h = loadH(), e = h[_sellId];
                if (e && qty > e.qty + 1e-10) { toast.className = 'sell-toast error'; toast.textContent = 'Quantity exceeds holdings.'; return; }
                var res = executeSell(_sellId, qty);
                if (!res.ok) { toast.className = 'sell-toast error'; toast.textContent = res.msg; return; }
                var ps = res.pnl >= 0 ? '+' : '';
                toast.className = 'sell-toast success';
                toast.textContent = '✓ Sold! P&L: ' + ps + fmtPrice(res.pnl, window.CryptoDash.currency);
                if (window.CryptoDash.sounds) window.CryptoDash.sounds.sell();
                if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_sell');
                renderHoldings();
                setTimeout(closeSellModal, 2000);
            });

            /* Tab switching */
            document.querySelectorAll('.pt-tab').forEach(function (tab) {
                tab.addEventListener('click', function () {
                    document.querySelectorAll('.pt-tab').forEach(function (t) { t.classList.remove('active'); });
                    document.querySelectorAll('.pt-body').forEach(function (b) { b.classList.remove('active'); });
                    tab.classList.add('active');
                    var body = document.getElementById('pt-body-' + tab.dataset.tab); if (body) body.classList.add('active');
                    if (tab.dataset.tab === 'holdings') renderHoldings();
                    if (tab.dataset.tab === 'history') renderHistory();
                });
            });

            /* Panel open/close */
            function openPanel() { refreshAll(); document.getElementById('portfolio-panel').classList.add('open'); document.getElementById('portfolio-overlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
            function closePanel() { document.getElementById('portfolio-panel').classList.remove('open'); document.getElementById('portfolio-overlay').classList.remove('open'); document.body.style.overflow = ''; }
            document.getElementById('portfolio-btn').addEventListener('click', openPanel);
            document.getElementById('portfolio-close-btn').addEventListener('click', closePanel);
            document.getElementById('portfolio-overlay').addEventListener('click', closePanel);

            /* Wallet Tab */
            var _walletCur = 'usd';
            document.querySelectorAll('#wallet-cur-pills .wallet-cur-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('#wallet-cur-pills .wallet-cur-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active'); _walletCur = btn.dataset.cur;
                });
            });
            document.getElementById('wallet-deposit-btn').addEventListener('click', function () {
                var amt = parseFloat(document.getElementById('wallet-amount').value);
                if (isNaN(amt) || amt <= 0) { alert('Enter a valid amount > 0.'); return; }
                saveW(loadW() + toUSD(amt, _walletCur));
                document.getElementById('wallet-amount').value = '';
                refreshSummary();
                if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_deposit');
            });

            /* Modal Trade Section */
            var _tradeCoin = null, _tradeType = 'buy', _tradeCur = 'usd';

            document.querySelectorAll('.trade-type-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('.trade-type-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active'); _tradeType = btn.dataset.type; updateTradeUI();
                });
            });
            document.querySelectorAll('#trade-cur-pills .trade-cur-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('#trade-cur-pills .trade-cur-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active'); _tradeCur = btn.dataset.cur;
                    document.getElementById('trade-price-label').textContent = 'Price (' + CL[_tradeCur] + ')';
                    if (_tradeCoin) {
                        var conv = fromUSD(_tradeCoin.current_price || 0, _tradeCur);
                        document.getElementById('trade-price').value = _tradeCur === 'btc' ? conv.toFixed(8) : conv.toFixed(2);
                    }
                    updateTradeTotal(); updateTradeUI();
                });
            });
            ['trade-qty', 'trade-price'].forEach(function (id) { document.getElementById(id).addEventListener('input', updateTradeTotal); });

            document.getElementById('trade-execute-btn').addEventListener('click', function () {
                var toast = document.getElementById('trade-toast'); toast.className = 'trade-toast';
                if (!_tradeCoin) return;
                var qty = parseFloat(document.getElementById('trade-qty').value);
                var priceLoc = parseFloat(document.getElementById('trade-price').value);
                if (isNaN(qty) || qty <= 0) { toast.className = 'trade-toast error'; toast.textContent = 'Enter a valid quantity > 0.'; return; }
                if (isNaN(priceLoc) || priceLoc < 0) { toast.className = 'trade-toast error'; toast.textContent = 'Enter a valid price.'; return; }
                var priceUSD = toUSD(priceLoc, _tradeCur);
                if (_tradeType === 'buy') {
                    var res = executeBuy(_tradeCoin, qty, priceUSD);
                    if (!res.ok) { toast.className = 'trade-toast error'; toast.textContent = res.msg; return; }
                    toast.className = 'trade-toast success';
                    toast.textContent = '✓ Bought ' + qty + ' ' + (_tradeCoin.symbol || '').toUpperCase() + ' @ ' + CS[_tradeCur] + priceLoc.toLocaleString();
                    if (window.CryptoDash.sounds) window.CryptoDash.sounds.buy();
                    if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_buy');
                } else {
                    var res2 = executeSell(_tradeCoin.id, qty);
                    if (!res2.ok) { toast.className = 'trade-toast error'; toast.textContent = res2.msg; return; }
                    var ps = res2.pnl >= 0 ? '+' : '';
                    toast.className = 'trade-toast success';
                    toast.textContent = '✓ Sold ' + qty + ' ' + (_tradeCoin.symbol || '').toUpperCase() + ' · P&L: ' + ps + fmtPrice(res2.pnl, window.CryptoDash.currency);
                    if (window.CryptoDash.sounds) window.CryptoDash.sounds.sell();
                    if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('first_sell');
                }
                document.getElementById('trade-qty').value = ''; updateTradeUI();
            });

            function updateTradeTotal() {
                var qty = parseFloat(document.getElementById('trade-qty').value) || 0;
                var pl = parseFloat(document.getElementById('trade-price').value) || 0;
                document.getElementById('trade-total-cost').textContent = fmtPrice(qty * toUSD(pl, _tradeCur), window.CryptoDash.currency);
            }
            function updateTradeUI() {
                if (!_tradeCoin) return;
                var cur = window.CryptoDash.currency;
                var eb = document.getElementById('trade-execute-btn'), al = document.getElementById('trade-avail-label'), av = document.getElementById('trade-avail-val');
                if (_tradeType === 'buy') {
                    eb.className = 'trade-execute-btn buy'; eb.textContent = '📈 Buy ' + (_tradeCoin.symbol || '').toUpperCase();
                    al.textContent = 'Available Balance'; av.textContent = fmtPrice(loadW(), cur);
                } else {
                    eb.className = 'trade-execute-btn sell'; eb.textContent = '📉 Sell ' + (_tradeCoin.symbol || '').toUpperCase();
                    al.textContent = 'Held Quantity';
                    var e = loadH()[_tradeCoin.id]; av.textContent = e ? parseFloat(e.qty.toFixed(8)).toString() + ' ' + (_tradeCoin.symbol || '').toUpperCase() : '0';
                }
                updateTradeTotal();
            }

            window.CryptoDash._setTradeCoin = function (coin) {
                _tradeCoin = coin; _tradeType = 'buy'; _tradeCur = 'usd';
                document.querySelectorAll('.trade-type-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.type === 'buy'); });
                document.querySelectorAll('#trade-cur-pills .trade-cur-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.cur === 'usd'); });
                document.getElementById('trade-price-label').textContent = 'Price (USD $)';
                document.getElementById('trade-price').value = (coin.current_price || '').toString();
                document.getElementById('trade-qty').value = '';
                document.getElementById('trade-toast').className = 'trade-toast';
                document.getElementById('trade-toast').textContent = '';
                updateTradeUI();
            };

            window.CryptoDash._portfolioRender = function () { refreshSummary(); renderHoldings(); renderHistory(); };

            updateBadge(); refreshSummary();
        })();

        /* ── Theme Toggle ── */
        (function () {
            var html = document.documentElement;
            var btn = document.getElementById('theme-toggle-btn');
            var icon = document.getElementById('theme-icon');
            var SK = 'crypto_theme';

            function applyTheme(theme) {
                if (theme === 'light') {
                    html.classList.add('light-theme');
                    icon.textContent = '☀️';
                } else {
                    html.classList.remove('light-theme');
                    icon.textContent = '🌙';
                }
            }

            /* Restore saved preference (or respect OS preference) */
            var saved = localStorage.getItem(SK);
            if (saved) {
                applyTheme(saved);
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                applyTheme('light');
            }

            btn.addEventListener('click', function () {
                /* Spin the icon */
                icon.classList.add('spinning');
                setTimeout(function () { icon.classList.remove('spinning'); }, 500);

                /* Toggle */
                var isLight = html.classList.contains('light-theme');
                var next = isLight ? 'dark' : 'light';
                applyTheme(next);
                localStorage.setItem(SK, next);
            });

            /* Listen for OS-level theme changes */
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
                    if (!localStorage.getItem(SK)) applyTheme(e.matches ? 'light' : 'dark');
                });
            }
        })();

        /* ═══════════════════════════════════════════
           AI CHATBOT – CryptoBot Analyst
        ═══════════════════════════════════════════ */
        (function () {
            var fab = document.getElementById('chatbot-fab');
            var panel = document.getElementById('chatbot-panel');
            var closeBtn = document.getElementById('chatbot-close');
            var body = document.getElementById('chatbot-body');
            var input = document.getElementById('chatbot-input');
            var sendBtn = document.getElementById('chatbot-send');

            /* Open / Close */
            fab.addEventListener('click', function () {
                panel.classList.add('open');
                fab.classList.add('hidden');
                input.focus();
            });
            closeBtn.addEventListener('click', closeChat);
            function closeChat() {
                panel.classList.remove('open');
                fab.classList.remove('hidden');
            }

            /* Chips */
            document.querySelectorAll('.chip-btn').forEach(function (c) {
                c.addEventListener('click', function () { processInput(c.dataset.cmd); });
            });

            /* Send */
            sendBtn.addEventListener('click', function () { sendUserMsg(); });
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendUserMsg(); });

            function sendUserMsg() {
                var txt = input.value.trim();
                if (!txt) return;
                input.value = '';
                processInput(txt);
            }

            function processInput(txt) {
                if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('analyst');
                addMsg('user', txt);
                showTyping();
                setTimeout(function () {
                    removeTyping();
                    var reply = generateReply(txt);
                    addMsg('bot', reply);
                }, 700 + Math.random() * 500);
            }

            function addMsg(role, html) {
                var d = document.createElement('div');
                d.className = 'chat-msg ' + role;
                d.innerHTML = html;
                body.appendChild(d);
                body.scrollTop = body.scrollHeight;
            }

            function showTyping() {
                var d = document.createElement('div');
                d.className = 'typing-indicator';
                d.id = 'typing-ind';
                d.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
                body.appendChild(d);
                body.scrollTop = body.scrollHeight;
            }

            function removeTyping() {
                var t = document.getElementById('typing-ind');
                if (t) t.remove();
            }

            /* ── Helpers ── */
            function getData() { return window.CryptoDash.rawData || []; }
            function getCur() { return window.CryptoDash.currency || 'usd'; }
            function getHoldings() { try { return JSON.parse(localStorage.getItem('crypto_holdings_v3')) || {}; } catch (e) { return {}; } }
            function getWallet() { return parseFloat(localStorage.getItem('crypto_wallet_v3') || '0') || 0; }
            function getTx() { try { return JSON.parse(localStorage.getItem('crypto_tx_v3')) || []; } catch (e) { return []; } }
            function fp(v) { return fmtPrice(v, getCur()); }
            function pct(v) { var val = v || 0; return (val >= 0 ? '<span class="positive">+' : '<span class="negative">') + val.toFixed(2) + '%</span>'; }

            /* ── Command Router ── */
            function generateReply(input) {
                var q = input.toLowerCase();
                var data = getData();

                if (!data.length && !q.includes('help')) return '⏳ Market data is still loading. Please try again in a moment!';

                /* Help */
                if (match(q, ['help', 'command', 'what can'])) return cmdHelp();
                /* Market Summary */
                if (match(q, ['market summary', 'summary', 'overview', 'market overview', 'how.*market'])) return cmdMarketSummary(data);
                /* Top Gainers */
                if (match(q, ['gainer', 'top gain', 'biggest gain', 'who.*up', 'what.*up', 'green'])) return cmdTopGainers(data);
                /* Top Losers */
                if (match(q, ['loser', 'top lose', 'biggest lose', 'who.*down', 'what.*down', 'red', 'worst.*coin'])) return cmdTopLosers(data);
                /* Trending */
                if (match(q, ['trend', 'hot', 'popular', 'most.*volume'])) return cmdTrending(data);
                /* Market Mood */
                if (match(q, ['mood', 'sentiment', 'bull', 'bear', 'fear'])) return cmdMarketMood(data);
                /* Portfolio */
                if (match(q, ['portfolio', 'my holding', 'my coin', 'my asset'])) return cmdPortfolio(data);
                /* P&L */
                if (match(q, ['p&l', 'pnl', 'profit', 'loss', 'my gain', 'my return'])) return cmdPnL(data);
                /* Best Performer */
                if (match(q, ['best performer', 'best hold', 'top hold', 'most profit'])) return cmdBestPerformer(data);
                /* Worst Performer */
                if (match(q, ['worst performer', 'worst hold', 'most loss', 'biggest loss hold'])) return cmdWorstPerformer(data);
                /* Should I buy */
                if (match(q, ['should i buy', 'buy.*\\?', 'good time', 'recommend'])) return cmdShouldBuy(q, data);
                /* Analyze coin */
                if (match(q, ['analyze', 'analyse', 'tell me about', 'info about', 'price of', 'how.*is'])) return cmdAnalyzeCoin(q, data);

                return "🤔 I'm not sure I understand. Try asking about <strong>market summary</strong>, <strong>top gainers</strong>, <strong>portfolio</strong>, or type <strong>help</strong> for all commands!";
            }

            function match(q, patterns) {
                for (var i = 0; i < patterns.length; i++) {
                    if (new RegExp(patterns[i], 'i').test(q)) return true;
                }
                return false;
            }

            /* ── Commands ── */

            function cmdHelp() {
                return '🤖 <strong>CryptoBot Commands:</strong><br><br>' +
                    '📊 <strong>market summary</strong> – Overall snapshot<br>' +
                    '🟢 <strong>top gainers</strong> – Best performing coins<br>' +
                    '🔴 <strong>top losers</strong> – Worst performing coins<br>' +
                    '🔥 <strong>trending</strong> – Highest volume coins<br>' +
                    '🧠 <strong>market mood</strong> – Bullish or bearish?<br>' +
                    '📁 <strong>portfolio</strong> – Your holdings overview<br>' +
                    '💰 <strong>my p&l</strong> – Profit & loss breakdown<br>' +
                    '🏆 <strong>best performer</strong> – Top holding by return<br>' +
                    '📉 <strong>worst performer</strong> – Weakest holding<br>' +
                    '🔍 <strong>analyze [coin]</strong> – Coin deep-dive<br>' +
                    '💡 <strong>should i buy [coin]</strong> – Momentum check<br>';
            }

            function cmdMarketSummary(data) {
                var tot = 0, up = 0, down = 0, totalMcap = 0;
                data.forEach(function (c) {
                    tot += c.current_price || 0;
                    totalMcap += c.market_cap || 0;
                    if ((c.price_change_percentage_24h || 0) >= 0) up++; else down++;
                });
                var avg = tot / data.length;
                var best = data.reduce(function (a, b) { return (a.price_change_percentage_24h || 0) > (b.price_change_percentage_24h || 0) ? a : b; });
                var worst = data.reduce(function (a, b) { return (a.price_change_percentage_24h || 0) < (b.price_change_percentage_24h || 0) ? a : b; });
                return '📊 <strong>Market Summary</strong><br><br>' +
                    '🪙 Tracking: <strong>' + data.length + ' coins</strong><br>' +
                    '💵 Avg Price: <strong>' + fp(avg) + '</strong><br>' +
                    '🏦 Total Market Cap: <strong>' + fmtCompact(totalMcap, getCur()) + '</strong><br>' +
                    '🟢 Coins Up: <strong>' + up + '</strong> | 🔴 Down: <strong>' + down + '</strong><br><br>' +
                    '🏆 Best: <strong>' + best.name + '</strong> ' + pct(best.price_change_percentage_24h) + '<br>' +
                    '💀 Worst: <strong>' + worst.name + '</strong> ' + pct(worst.price_change_percentage_24h);
            }

            function cmdTopGainers(data) {
                var sorted = data.slice().sort(function (a, b) { return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0); });
                var top = sorted.slice(0, 5);
                var html = '🟢 <strong>Top 5 Gainers (24h)</strong><br><br>';
                top.forEach(function (c, i) {
                    html += (i + 1) + '. <strong>' + c.name + '</strong> (' + (c.symbol || '').toUpperCase() + ') – ' + fp(c.current_price) + ' ' + pct(c.price_change_percentage_24h) + '<br>';
                });
                return html;
            }

            function cmdTopLosers(data) {
                var sorted = data.slice().sort(function (a, b) { return (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0); });
                var top = sorted.slice(0, 5);
                var html = '🔴 <strong>Top 5 Losers (24h)</strong><br><br>';
                top.forEach(function (c, i) {
                    html += (i + 1) + '. <strong>' + c.name + '</strong> (' + (c.symbol || '').toUpperCase() + ') – ' + fp(c.current_price) + ' ' + pct(c.price_change_percentage_24h) + '<br>';
                });
                return html;
            }

            function cmdTrending(data) {
                var sorted = data.slice().sort(function (a, b) { return (b.total_volume || 0) - (a.total_volume || 0); });
                var top = sorted.slice(0, 5);
                var html = '🔥 <strong>Trending by Volume</strong><br><br>';
                top.forEach(function (c, i) {
                    html += (i + 1) + '. <strong>' + c.name + '</strong> – Vol: ' + fmtCompact(c.total_volume, getCur()) + ' ' + pct(c.price_change_percentage_24h) + '<br>';
                });
                return html;
            }

            function cmdMarketMood(data) {
                var up = 0, down = 0, totalChange = 0;
                data.forEach(function (c) {
                    var ch = c.price_change_percentage_24h || 0;
                    totalChange += ch;
                    if (ch >= 0) up++; else down++;
                });
                var avg = totalChange / data.length;
                var ratio = up / data.length;
                var mood, emoji, desc;
                if (ratio >= 0.7) { mood = 'Very Bullish'; emoji = '🚀'; desc = 'The market is on fire! Most coins are surging.'; }
                else if (ratio >= 0.55) { mood = 'Bullish'; emoji = '📈'; desc = 'Positive momentum. More coins are gaining than losing.'; }
                else if (ratio >= 0.45) { mood = 'Neutral'; emoji = '😐'; desc = 'Market is mixed. No clear direction.'; }
                else if (ratio >= 0.3) { mood = 'Bearish'; emoji = '📉'; desc = 'Negative sentiment. Most coins are declining.'; }
                else { mood = 'Very Bearish'; emoji = '💀'; desc = 'Heavy selling pressure across the board.'; }

                return '🧠 <strong>Market Mood: ' + emoji + ' ' + mood + '</strong><br><br>' +
                    desc + '<br><br>' +
                    '🟢 Up: <strong>' + up + ' coins</strong> (' + (ratio * 100).toFixed(0) + '%)<br>' +
                    '🔴 Down: <strong>' + down + ' coins</strong> (' + ((1 - ratio) * 100).toFixed(0) + '%)<br>' +
                    '📊 Avg 24h change: ' + pct(avg);
            }

            function cmdPortfolio(data) {
                var h = getHoldings(), wallet = getWallet();
                var coins = Object.values(h);
                if (!coins.length) return '📁 You have no holdings yet. Open a coin → Trade → Buy to start!';
                var html = '📁 <strong>Portfolio Overview</strong><br><br>';
                html += '💰 Wallet Balance: <strong>' + fp(wallet) + '</strong><br>';
                var totalVal = 0, totalCost = 0;
                coins.forEach(function (e) {
                    var price = findPrice(data, e.id);
                    var val = price !== null ? e.qty * price : 0;
                    var pnl = val - e.totalInvestedUSD;
                    totalVal += val;
                    totalCost += e.totalInvestedUSD;
                    var qs = parseFloat(e.qty.toFixed(6)).toString();
                    html += '<br>• <strong>' + e.name + '</strong> – ' + qs + ' ' + (e.symbol || '').toUpperCase();
                    html += '<br>&nbsp;&nbsp;Value: ' + fp(val) + ' | P&L: ' + pct2(pnl);
                });
                var totalPnl = totalVal - totalCost;
                html += '<br><br>📊 Total Value: <strong>' + fp(totalVal) + '</strong>';
                html += '<br>💵 Total Invested: <strong>' + fp(totalCost) + '</strong>';
                html += '<br>📈 Net P&L: <strong>' + pct2(totalPnl) + '</strong>';
                return html;
            }

            function cmdPnL(data) {
                var h = getHoldings();
                var coins = Object.values(h);
                if (!coins.length) return '💰 No holdings to analyze. Start trading first!';
                var html = '💰 <strong>Profit & Loss Breakdown</strong><br><br>';
                var totalPnl = 0;
                coins.forEach(function (e) {
                    var price = findPrice(data, e.id);
                    var val = price !== null ? e.qty * price : 0;
                    var pnl = val - e.totalInvestedUSD;
                    var pctVal = e.totalInvestedUSD > 0 ? (pnl / e.totalInvestedUSD) * 100 : 0;
                    totalPnl += pnl;
                    html += (pnl >= 0 ? '🟢' : '🔴') + ' <strong>' + e.name + '</strong>: ' + pct2(pnl) + ' (' + (pnl >= 0 ? '+' : '') + pctVal.toFixed(1) + '%)<br>';
                });
                html += '<br>📊 <strong>Total P&L: ' + pct2(totalPnl) + '</strong>';
                return html;
            }

            function cmdBestPerformer(data) {
                var h = getHoldings();
                var coins = Object.values(h);
                if (!coins.length) return '🏆 No holdings yet!';
                var best = null, bestPct = -Infinity;
                coins.forEach(function (e) {
                    var price = findPrice(data, e.id);
                    if (price === null) return;
                    var pnlPct = e.totalInvestedUSD > 0 ? ((e.qty * price - e.totalInvestedUSD) / e.totalInvestedUSD) * 100 : 0;
                    if (pnlPct > bestPct) { bestPct = pnlPct; best = e; }
                });
                if (!best) return '🏆 Could not determine best performer.';
                var price = findPrice(data, best.id);
                var val = best.qty * price;
                var pnl = val - best.totalInvestedUSD;
                return '🏆 <strong>Best Performer: ' + best.name + '</strong><br><br>' +
                    'Return: ' + pct(bestPct) + '<br>' +
                    'Value: <strong>' + fp(val) + '</strong><br>' +
                    'P&L: ' + pct2(pnl);
            }

            function cmdWorstPerformer(data) {
                var h = getHoldings();
                var coins = Object.values(h);
                if (!coins.length) return '📉 No holdings yet!';
                var worst = null, worstPct = Infinity;
                coins.forEach(function (e) {
                    var price = findPrice(data, e.id);
                    if (price === null) return;
                    var pnlPct = e.totalInvestedUSD > 0 ? ((e.qty * price - e.totalInvestedUSD) / e.totalInvestedUSD) * 100 : 0;
                    if (pnlPct < worstPct) { worstPct = pnlPct; worst = e; }
                });
                if (!worst) return '📉 Could not determine worst performer.';
                var price = findPrice(data, worst.id);
                var val = worst.qty * price;
                var pnl = val - worst.totalInvestedUSD;
                return '📉 <strong>Worst Performer: ' + worst.name + '</strong><br><br>' +
                    'Return: ' + pct(worstPct) + '<br>' +
                    'Value: <strong>' + fp(val) + '</strong><br>' +
                    'P&L: ' + pct2(pnl);
            }

            function cmdShouldBuy(q, data) {
                var coin = findCoinFromQuery(q, data, ['should i buy', 'buy', 'good time', 'recommend']);
                if (!coin) return '🔍 Please specify a coin! e.g., "Should I buy Bitcoin?"';

                var h1 = coin.price_change_percentage_1h_in_currency || 0;
                var h24 = coin.price_change_percentage_24h || 0;
                var d7 = coin.price_change_percentage_7d_in_currency || 0;

                var signals = 0;
                if (h1 > 0) signals++; if (h24 > 0) signals++; if (d7 > 0) signals++;

                var verdict, emoji;
                if (signals === 3) { verdict = 'Strong upward momentum across all timeframes. Could be a good entry if you believe in the project.'; emoji = '🟢'; }
                else if (signals === 2) { verdict = 'Mostly positive momentum. Consider buying on a small dip.'; emoji = '🟡'; }
                else if (signals === 1) { verdict = 'Mixed signals. Might want to wait for clearer direction.'; emoji = '🟠'; }
                else { verdict = 'All timeframes negative. Could be a buying opportunity for long-term, but risky short-term.'; emoji = '🔴'; }

                return emoji + ' <strong>' + coin.name + ' Analysis</strong><br><br>' +
                    '💵 Price: <strong>' + fp(coin.current_price) + '</strong><br>' +
                    '1h: ' + pct(h1) + ' | 24h: ' + pct(h24) + ' | 7d: ' + pct(d7) + '<br><br>' +
                    '💡 <strong>Verdict:</strong> ' + verdict + '<br><br>' +
                    '<em style="font-size:0.75rem;opacity:0.7">⚠️ This is not financial advice. Always DYOR.</em>';
            }

            function cmdAnalyzeCoin(q, data) {
                var coin = findCoinFromQuery(q, data, ['analyze', 'analyse', 'tell me about', 'info about', 'price of', "how's", 'how is']);
                if (!coin) return '🔍 Please specify a coin! e.g., "Analyze Ethereum"';

                return '🔍 <strong>' + coin.name + ' (' + (coin.symbol || '').toUpperCase() + ')</strong><br><br>' +
                    '📊 Rank: <strong>#' + (coin.market_cap_rank || '?') + '</strong><br>' +
                    '💵 Price: <strong>' + fp(coin.current_price) + '</strong><br>' +
                    '🏦 Market Cap: <strong>' + fmtCompact(coin.market_cap, getCur()) + '</strong><br>' +
                    '📦 24h Volume: <strong>' + fmtCompact(coin.total_volume, getCur()) + '</strong><br><br>' +
                    '⏱️ 1h: ' + pct(coin.price_change_percentage_1h_in_currency) + '<br>' +
                    '📅 24h: ' + pct(coin.price_change_percentage_24h) + '<br>' +
                    '📆 7d: ' + pct(coin.price_change_percentage_7d_in_currency);
            }

            /* ── Utility ── */
            function findPrice(data, coinId) {
                for (var i = 0; i < data.length; i++) { if (data[i].id === coinId) return data[i].current_price || 0; }
                return null;
            }

            function pct2(v) {
                return (v >= 0 ? '<span class="positive">+' + fp(v) + '</span>' : '<span class="negative">' + fp(v) + '</span>');
            }

            function findCoinFromQuery(q, data, prefixes) {
                var cleaned = q.toLowerCase();
                prefixes.forEach(function (p) { cleaned = cleaned.replace(new RegExp(p, 'gi'), ''); });
                cleaned = cleaned.replace(/[?.,!]/g, '').trim();
                if (!cleaned) return null;
                /* Exact match by name or symbol */
                for (var i = 0; i < data.length; i++) {
                    if (data[i].name.toLowerCase() === cleaned || (data[i].symbol || '').toLowerCase() === cleaned) return data[i];
                }
                /* Partial match */
                for (var j = 0; j < data.length; j++) {
                    if (data[j].name.toLowerCase().includes(cleaned) || (data[j].symbol || '').toLowerCase().includes(cleaned)) return data[j];
                }
                return null;
            }

            /* Welcome message */
            addMsg('bot', '👋 Hey! I\'m <strong>CryptoBot AI</strong> — your market analyst.<br><br>I can analyze <strong>live prices</strong>, your <strong>portfolio</strong>, find <strong>top gainers/losers</strong>, and more!<br><br>Try a command or click a chip below. Type <strong>help</strong> for all commands.');
        })();
    </script>
</body>
