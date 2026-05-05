/* js/analytics.js */
(function() {
    var HK = 'crypto_networth_history';
    var chart = null;

    function getHistory() {
        try { return JSON.parse(localStorage.getItem(HK)) || []; } 
        catch(e) { return []; }
    }

    function saveHistory(h) {
        localStorage.setItem(HK, JSON.stringify(h));
    }

    // Capture current net worth (Wallet + Holdings Value)
    window.CryptoDash.recordSnapshot = function() {
        var wallet = parseFloat(localStorage.getItem('crypto_wallet_v3')) || 0;
        var holdings = JSON.parse(localStorage.getItem('crypto_holdings_v3') || '{}');
        var data = window.CryptoDash.rawData || [];
        
        var holdingsValue = 0;
        if (data.length > 0) {
            Object.values(holdings).forEach(function(h) {
                var coin = data.find(c => c.id === h.id);
                if (coin) holdingsValue += h.qty * coin.current_price;
            });
        }

        var total = wallet + holdingsValue;
        var history = getHistory();
        var now = new Date();
        
        // Only record if it's the first snapshot or if 1 hour has passed since last
        // Or if triggered by a trade (handled by calling this directly)
        var last = history[history.length - 1];
        if (!last || (now - new Date(last.date)) > 3600000 || total !== last.value) {
            history.push({ date: now.toISOString(), value: total });
            // Keep last 50 data points
            if (history.length > 50) history.shift();
            saveHistory(history);
            if (chart) window.CryptoDash.renderPerformanceChart();
        }
    };

    window.CryptoDash.renderPerformanceChart = function() {
        var ctx = document.getElementById('performance-chart');
        if (!ctx) return;
        
        var history = getHistory();
        if (history.length === 0) {
            // Seed with initial data if empty
            history = [{ date: new Date(Date.now() - 86400000).toISOString(), value: 0 }];
        }

        var labels = history.map(h => {
            var d = new Date(h.date);
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        var values = history.map(h => h.value);

        if (chart) chart.destroy();

        var isDark = !document.documentElement.classList.contains('light-theme');
        var color = isDark ? '#3b82f6' : '#2563eb';

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Net Worth (USD)',
                    data: values,
                    borderColor: color,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: color,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return 'Net Worth: ' + window.CryptoDash.fmtPrice(context.parsed.y, 'usd');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        grid: {
                            color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: isDark ? '#94a3b8' : '#475569',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    };

    // Auto-record snapshot on load if data exists
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(window.CryptoDash.recordSnapshot, 2000);
    });

})();
