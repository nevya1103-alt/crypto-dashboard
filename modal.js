/* js/modal.js */
(function () {
    var overlay = document.getElementById('coin-detail-overlay');
    var closeBtn = document.getElementById('modal-close-btn');
    var tabs = document.querySelectorAll('#chart-tabs .chart-tab');
    var chartInst = null, currentCoinId = null, currentDays = 7;

    function openModal(coin) {
        currentCoinId = coin.id;
        var currency = window.CryptoDash.currency || 'usd';
        document.getElementById('modal-coin-logo').src = coin.image || '';
        document.getElementById('modal-coin-logo').alt = coin.name;
        document.getElementById('modal-coin-name').textContent = coin.name;
        document.getElementById('modal-coin-symbol').textContent = (coin.symbol || '').toUpperCase();
        document.getElementById('modal-coin-rank').textContent = 'Rank #' + (coin.market_cap_rank || '?');
        var stats = [
            { label: 'Price', value: window.CryptoDash.fmtPrice(coin.current_price, currency) },
            { label: 'Market Cap', value: window.CryptoDash.fmtCompact(coin.market_cap, currency) },
            { label: '24h Volume', value: window.CryptoDash.fmtCompact(coin.total_volume, currency) },
            { label: '1h Change', value: fmt1c(coin.price_change_percentage_1h_in_currency) },
            { label: '24h Change', value: fmt1c(coin.price_change_percentage_24h) },
            { label: '7d Change', value: fmt1c(coin.price_change_percentage_7d_in_currency) }
        ];
        document.getElementById('modal-stats').innerHTML = stats.map(function (s) {
            return '<div class="modal-stat-card"><div class="label">' + s.label + '</div><div class="value">' + s.value + '</div></div>';
        }).join('');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        if (tabs.length > 0) tabs[0].classList.add('active');
        currentDays = 7;
        if (typeof window.CryptoDash._setTradeCoin === 'function') window.CryptoDash._setTradeCoin(coin);
        if (overlay) {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        loadChart(coin.id, 7);
    }
    
    // Expose openModal so watchlist or row clicks can use it
    window.CryptoDash._openModal = openModal;

    function fmt1c(v) {
        var val = v || 0, col = val >= 0 ? '#10b981' : '#ef4444', pre = val >= 0 ? '+' : '';
        return '<span style="color:' + col + '">' + pre + val.toFixed(2) + '%</span>';
    }

    function closeModal() {
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        if (chartInst) { chartInst.destroy(); chartInst = null; }
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
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
    
    if (setAlertBtn && alertPriceInput) {
        setAlertBtn.addEventListener('click', function () {
            var targetPrice = parseFloat(alertPriceInput.value);
            if (isNaN(targetPrice) || targetPrice <= 0) { alert('Enter a valid target price.'); return; }
            if (typeof window.CryptoDash.addAlert === 'function') {
                window.CryptoDash.addAlert(
                    currentCoinId, 
                    document.getElementById('modal-coin-name').textContent, 
                    document.getElementById('modal-coin-symbol').textContent, 
                    targetPrice, 
                    currentAlertDir
                );
                alertPriceInput.value = '';
                var ogText = setAlertBtn.textContent;
                setAlertBtn.textContent = '✓ Set';
                setTimeout(function () { setAlertBtn.textContent = ogText; }, 1500);
            }
        });
    }

    async function loadChart(coinId, days) {
        var loadEl = document.getElementById('chart-loading'), canvas = document.getElementById('detail-chart');
        if (!loadEl || !canvas) return;
        loadEl.style.display = 'flex'; canvas.style.display = 'none';
        try {
            var res = await fetch('https://api.coingecko.com/api/v3/coins/' + coinId + '/market_chart?vs_currency=usd&days=' + days + '&interval=' + (days <= 30 ? 'daily' : 'weekly'));
            var json = await res.json();
            var prices = json.prices || [];
            var labels = prices.map(function (p) { return new Date(p[0]).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }); });
            var currency = window.CryptoDash.currency || 'usd';
            var rate = window.CryptoDash.rates[currency] || 1;
            var values = prices.map(function (p) { return p[1] * rate; });
            var isUp = values.length > 0 && values[values.length - 1] >= values[0];
            var grad = canvas.getContext('2d').createLinearGradient(0, 0, 0, 280);
            var col = isUp ? '16,185,129' : '239,68,68';
            grad.addColorStop(0, 'rgba(' + col + ',0.35)'); grad.addColorStop(1, 'rgba(' + col + ',0)');
            if (chartInst) chartInst.destroy();
            chartInst = new Chart(canvas, {
                type: 'line',
                data: { labels: labels, datasets: [{ data: values, fill: true, backgroundColor: grad, borderColor: isUp ? '#10b981' : '#ef4444', borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
                options: {
                    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return window.CryptoDash.fmtPrice(ctx.raw / rate, currency); } } } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#94a3b8', maxTicksLimit: 8, font: { family: 'Outfit' } } },
                        y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#94a3b8', font: { family: 'Outfit' }, callback: function (v) { return window.CryptoDash.fmtPrice(v / rate, currency); } } }
                    }
                }
            });
            loadEl.style.display = 'none'; canvas.style.display = 'block';
        } catch (e) { loadEl.textContent = 'Failed to load chart data.'; }
    }

    // Attach click listener to table body, waiting for DOM content to be ready
    document.addEventListener('DOMContentLoaded', function() {
        var attachTableListener = function() {
            var tbody = document.getElementById('crypto-table-body');
            if (tbody && !tbody.dataset.hasListener) {
                tbody.addEventListener('click', function (e) {
                    if (e.target.closest('.star-btn')) return;
                    var row = e.target.closest('tr.clickable-row');
                    if (!row) return;
                    var rawData = window.CryptoDash.rawData;
                    if (!rawData || !rawData.length) return;
                    for (var i = 0; i < rawData.length; i++) { 
                        if (rawData[i].id === row.dataset.coinId) { 
                            openModal(rawData[i]); 
                            break; 
                        } 
                    }
                });
                tbody.dataset.hasListener = 'true';
            }
        };
        
        attachTableListener();
        
        // PyScript might re-render, so let's observe changes on the table
        var tb = document.getElementById('crypto-table-body');
        if (tb) {
            new MutationObserver(attachTableListener).observe(tb, { childList: true });
        }
    });

})();
