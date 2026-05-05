/* js/chatbot.js */
(function() {
    var cbBtn = document.getElementById('chatbot-fab');
    var cbPanel = document.getElementById('chatbot-panel');
    var cbClose = document.getElementById('chatbot-close');
    var cbInput = document.getElementById('chatbot-input');
    var cbSend = document.getElementById('chatbot-send');
    var cbBody = document.getElementById('chatbot-body');

    if (!cbBtn || !cbPanel) return;

    cbBtn.addEventListener('click', function() {
        cbPanel.classList.add('open');
        cbBtn.style.display = 'none';
        cbInput.focus();
        if (window.CryptoDash.trapFocus) window.CryptoDash.trapFocus(cbPanel, cbClose);
        if (cbBody.children.length === 0) {
            addMessage("Hello! I'm CryptoBot AI. How can I help you today?", false);
        }
    });

    // Auto-open on first load (since lazy-loaded on click)
    cbBtn.click();

    cbClose.addEventListener('click', function() {
        cbPanel.classList.remove('open');
        cbBtn.style.display = 'flex';
    });

    function addMessage(text, isUser) {
        var msgDiv = document.createElement('div');
        msgDiv.className = 'cb-msg ' + (isUser ? 'user' : 'bot');
        var bubble = document.createElement('div');
        bubble.className = 'cb-bubble';
        
        if (!isUser) {
            bubble.innerHTML = text; 
        } else {
            bubble.textContent = text;
        }
        
        msgDiv.appendChild(bubble);
        cbBody.appendChild(msgDiv);
        cbBody.scrollTop = cbBody.scrollHeight;
    }

    function processInput(val) {
        if (!val) return;
        addMessage(val, true);
        cbInput.value = '';
        
        var lower = val.toLowerCase();
        var h = JSON.parse(localStorage.getItem('crypto_holdings_v3') || '{}');
        var cur = window.CryptoDash.currency;
        
        setTimeout(function() {
            if (lower.includes('p&l') || lower.includes('profit') || lower.includes('loss') || lower.includes('portfolio')) {
                var keys = Object.keys(h);
                if (!keys.length) { addMessage("You don't hold any coins yet.", false); return; }
                var res = ["<b>Current Portfolio Status:</b>"];
                keys.forEach(function(k) {
                    var e = h[k];
                    var p = (window.CryptoDash.rawData || []).find(function(x) { return x.id === k; });
                    if (p) {
                        var pnl = (e.qty * p.current_price) - e.totalInvestedUSD;
                        res.push("• " + e.name + ": " + (pnl >= 0 ? '🟢 +' : '🔴 ') + window.CryptoDash.fmtPrice(pnl, cur));
                    }
                });
                addMessage(res.join('<br>'), false);
            } else if (lower.includes('gainer') || lower.includes('best') || lower.includes('trending')) {
                var d = window.CryptoDash.rawData || [];
                var sorted = [].concat(d).sort(function(a, b) { return b.price_change_percentage_24h - a.price_change_percentage_24h; });
                var top3 = sorted.slice(0, 3).map(function(x) { return "• <b>" + x.name + "</b>: +" + x.price_change_percentage_24h.toFixed(2) + "%"; });
                addMessage("<b>Top Gainers (24h):</b><br>" + top3.join('<br>'), false);
            } else if (lower.includes('loser') || lower.includes('worst')) {
                var d = window.CryptoDash.rawData || [];
                var sorted = [].concat(d).sort(function(a, b) { return a.price_change_percentage_24h - b.price_change_percentage_24h; });
                var bottom3 = sorted.slice(0, 3).map(function(x) { return "• <b>" + x.name + "</b>: " + x.price_change_percentage_24h.toFixed(2) + "%"; });
                addMessage("<b>Top Losers (24h):</b><br>" + bottom3.join('<br>'), false);
            } else if (lower.includes('mood') || lower.includes('summary')) {
                addMessage("The market seems <b>neutral to bullish</b> today. BTC is showing strength. Check individual coin charts for precise signals.", false);
            } else {
                addMessage("I'm still learning! Try asking about 'gainers', 'losers', 'mood', or your 'P&L'.", false);
            }
        }, 600);
    }

    cbSend.addEventListener('click', function() { processInput(cbInput.value.trim()); });
    cbInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') processInput(cbInput.value.trim()); });

    // Chips support
    document.querySelectorAll('.chip-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            processInput(btn.getAttribute('data-cmd'));
        });
    });
})();
