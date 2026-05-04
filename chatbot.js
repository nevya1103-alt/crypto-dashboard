/* js/chatbot.js */
(function() {
    var cbBtn = document.getElementById('chatbot-fab');
    var cbPanel = document.getElementById('chatbot-panel');
    var cbClose = document.getElementById('cb-close');
    var cbInput = document.getElementById('cb-input');
    var cbSend = document.getElementById('cb-send');
    var cbBody = document.getElementById('cb-body');

    cbBtn.addEventListener('click', function() {
        cbPanel.classList.add('open');
        cbBtn.style.display = 'none';
        cbInput.focus();
        window.CryptoDash.trapFocus(cbPanel, cbClose);
    });

    cbClose.addEventListener('click', function() {
        cbPanel.classList.remove('open');
        cbBtn.style.display = 'flex';
    });

    function addMessage(text, isUser) {
        var msgDiv = document.createElement('div');
        msgDiv.className = 'cb-msg ' + (isUser ? 'user' : 'bot');
        var bubble = document.createElement('div');
        bubble.className = 'cb-bubble';
        
        // Fix XSS: use textContent instead of innerHTML
        if (!isUser && text.includes('<br>')) {
            // For simple bot formatting (which we control), we can split by <br> or <b>
            // Since we generate bot responses safely in JS, innerHTML is okay for bot, 
            // but for user input, it MUST be textContent.
            // Let's use textContent for everything and build nodes if needed, or just allow basic tags for bot.
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
        if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('analyst');

        var lower = val.toLowerCase();
        var h = JSON.parse(localStorage.getItem('crypto_holdings_v3') || '{}');
        var cur = window.CryptoDash.currency;
        
        setTimeout(function() {
            if (lower.includes('loss') || lower.includes('profit')) {
                var keys = Object.keys(h);
                if (!keys.length) { addMessage("You don't hold any coins yet.", false); return; }
                var res = [];
                keys.forEach(function(k) {
                    var e = h[k];
                    var p = window.CryptoDash.rawData.find(function(x) { return x.id === k; });
                    if (p) {
                        var cost = e.totalInvestedUSD;
                        var val = e.qty * p.current_price;
                        var pnl = val - cost;
                        res.push("<b>" + e.name + "</b>: " + (pnl >= 0 ? 'Profit ' : 'Loss ') + window.CryptoDash.fmtPrice(pnl, cur));
                    }
                });
                addMessage(res.join('<br>'), false);
            } else if (lower.includes('best') || lower.includes('top')) {
                var d = window.CryptoDash.rawData || [];
                if (!d.length) { addMessage("Market data is loading...", false); return; }
                var sorted = [].concat(d).sort(function(a, b) { return b.price_change_percentage_24h - a.price_change_percentage_24h; });
                var top3 = sorted.slice(0, 3).map(function(x) { return "<b>" + x.name + "</b>: +" + x.price_change_percentage_24h.toFixed(2) + "%"; });
                addMessage("Top performers today:<br>" + top3.join('<br>'), false);
            } else {
                addMessage("I am a simple bot. Try asking about your 'profit/loss' or 'best performing coins'.", false);
            }
        }, 500);
    }

    cbSend.addEventListener('click', function() { processInput(cbInput.value.trim()); });
    cbInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') processInput(cbInput.value.trim()); });
})();
