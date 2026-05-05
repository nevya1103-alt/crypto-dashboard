/* js/alerts.js */
(function() {
    var AK = 'crypto_alerts_v1';
    var SMSK = 'crypto_sms_alert_settings_v1';
    var SMS_OUTBOX = 'crypto_sms_alert_outbox_v1';
    function loadAlerts() { try { return JSON.parse(localStorage.getItem(AK)) || []; } catch (e) { return []; } }
    function saveAlerts(a) { localStorage.setItem(AK, JSON.stringify(a)); syncToCloud(); }

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

        const { data, error } = await sb.from('portfolios').select('alerts').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') return;
        if (data && data.alerts) {
            localStorage.setItem(AK, JSON.stringify(data.alerts));
            window.CryptoDash.renderAlerts();
        } else {
            localStorage.removeItem(AK);
            window.CryptoDash.renderAlerts();
        }
    }
    function loadSmsSettings() {
        try { return JSON.parse(localStorage.getItem(SMSK)) || { enabled: false, phone: '' }; }
        catch (e) { return { enabled: false, phone: '' }; }
    }
    function saveSmsSettings(settings) {
        localStorage.setItem(SMSK, JSON.stringify({
            enabled: !!settings.enabled,
            phone: (settings.phone || '').trim()
        }));
    }
    function normalizePhone(phone) {
        return (phone || '').replace(/[^\d+]/g, '');
    }
    function isValidPhone(phone) {
        var normalized = normalizePhone(phone);
        var digits = normalized.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }
    function queueSms(payload) {
        var outbox = [];
        try { outbox = JSON.parse(localStorage.getItem(SMS_OUTBOX)) || []; } catch (e) {}
        outbox.unshift(payload);
        localStorage.setItem(SMS_OUTBOX, JSON.stringify(outbox.slice(0, 25)));
    }

    var badge = document.getElementById('alerts-badge');
    var list = document.getElementById('alerts-list');
    var smsEnabled = document.getElementById('sms-alerts-enabled');
    var smsPhone = document.getElementById('sms-phone-input');
    var smsNote = document.getElementById('sms-settings-note');

    function updateSmsNote(text, cls) {
        if (!smsNote) return;
        smsNote.className = 'sms-settings-note' + (cls ? ' ' + cls : '');
        smsNote.textContent = text;
    }

    function renderSmsSettings() {
        var settings = loadSmsSettings();
        if (smsEnabled) smsEnabled.checked = !!settings.enabled;
        if (smsPhone) smsPhone.value = settings.phone || '';
        if (!settings.enabled) {
            updateSmsNote('Saved locally. A backend is needed to send real SMS.');
        } else if (!isValidPhone(settings.phone)) {
            updateSmsNote('Enter a valid phone number with country code before enabling real SMS.', 'error');
        } else {
            updateSmsNote('SMS alerts are locally queued for ' + settings.phone + '. Connect a backend to send them.', 'ready');
        }
    }

    function persistSmsSettings() {
        saveSmsSettings({
            enabled: smsEnabled ? smsEnabled.checked : false,
            phone: smsPhone ? smsPhone.value : ''
        });
        renderSmsSettings();
    }

    if (smsEnabled) smsEnabled.addEventListener('change', persistSmsSettings);
    if (smsPhone) smsPhone.addEventListener('input', persistSmsSettings);

    window.CryptoDash.sendSmsAlert = async function (triggeredAlerts, message) {
        var settings = loadSmsSettings();
        if (!settings.enabled) return false;
        if (!isValidPhone(settings.phone)) {
            updateSmsNote('SMS alert skipped: phone number is invalid.', 'error');
            return false;
        }

        var payload = {
            id: Date.now(),
            phone: normalizePhone(settings.phone),
            message: message,
            alerts: triggeredAlerts,
            status: 'attempting-send',
            createdAt: new Date().toISOString()
        };
        queueSms(payload);

        // Attempting to send via free gateway (Textbelt - 1/day limit)
        updateSmsNote('Sending real SMS alert...', 'ready');
        
        try {
            var res = await fetch('https://textbelt.com/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: payload.phone,
                    message: "🔔 CryptoDash: " + message,
                    key: 'textbelt' // Free tier
                })
            });
            var data = await res.json();
            
            if (data.success) {
                updateSmsNote('✅ SMS sent successfully via Textbelt!', 'ready');
                console.info('SMS Success:', data);
            } else {
                var reason = data.error || 'limit reached';
                updateSmsNote('Queued locally. Cloud delivery skipped: ' + reason, 'warning');
            }
        } catch (e) {
            updateSmsNote('Queued locally. Network error connecting to SMS gateway.', 'error');
        }

        return true;
    };

    window.CryptoDash.renderAlerts = function () {
        var alerts = loadAlerts();
        var cur = window.CryptoDash.currency;
        if (badge) {
            badge.textContent = alerts.length;
            badge.style.display = alerts.length ? 'flex' : 'none';
        }
        if (!list) return;
        list.innerHTML = '';
        if (!alerts.length) {
            var empty = document.createElement('div');
            empty.className = 'alerts-empty';
            empty.innerHTML = 'No alerts set yet.<br>Open a coin and set a price target!';
            list.appendChild(empty);
            return;
        }
        alerts.forEach(function (a, i) {
            var item = document.createElement('div');
            item.className = 'alert-item';
            
            var info = document.createElement('div');
            info.className = 'alert-item-info';
            
            var coin = document.createElement('div');
            coin.className = 'alert-item-coin';
            coin.textContent = a.coinName + ' (' + (a.symbol || '').toUpperCase() + ')';
            
            var target = document.createElement('div');
            target.className = 'alert-item-target';
            // Convert target USD price to current currency for display
            var dispPrice = window.CryptoDash.toUSD(a.targetPriceUSD, cur);
            target.textContent = (a.direction === 'above' ? '📈 Above ' : '📉 Below ') + window.CryptoDash.fmtPrice(a.targetPriceUSD, cur);
            
            info.appendChild(coin);
            info.appendChild(target);
            
            var delBtn = document.createElement('button');
            delBtn.className = 'alert-item-delete';
            delBtn.title = 'Delete alert';
            delBtn.textContent = '🗑';
            delBtn.addEventListener('click', function() {
                var currentAlerts = loadAlerts();
                currentAlerts.splice(i, 1);
                saveAlerts(currentAlerts);
                window.CryptoDash.renderAlerts();
            });
            
            item.appendChild(info);
            item.appendChild(delBtn);
            list.appendChild(item);
        });
    };

    var panel = document.getElementById('alerts-panel'), overlay = document.getElementById('alerts-panel-overlay');
    document.getElementById('alerts-btn').addEventListener('click', function () {
        window.CryptoDash.renderAlerts();
        panel.classList.add('open'); overlay.classList.add('open');
        window.CryptoDash.trapFocus(panel, document.getElementById('alerts-panel-close'));
    });
    function closeAlertsPanel() { panel.classList.remove('open'); overlay.classList.remove('open'); }
    document.getElementById('alerts-panel-close').addEventListener('click', closeAlertsPanel);
    overlay.addEventListener('click', closeAlertsPanel);

    window.CryptoDash.addAlert = function (coinId, coinName, symbol, targetPriceLocalStr, direction) {
        // Request Notification permission only when they set their first alert
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
        
        var alerts = loadAlerts();
        var cur = window.CryptoDash.currency;
        // Convert the input local currency price back to USD for absolute tracking
        var targetPriceUSD = window.CryptoDash.toUSD(parseFloat(targetPriceLocalStr), 'usd'); 
        if (cur !== 'usd') {
            targetPriceUSD = parseFloat(targetPriceLocalStr) / window.CryptoDash.rates[cur];
        }
        
        alerts.push({ id: Date.now(), coinId: coinId, coinName: coinName, symbol: symbol, targetPriceUSD: targetPriceUSD, direction: direction, createdAt: new Date().toISOString() });
        saveAlerts(alerts);
        if (typeof window.CryptoDash.checkAchievement === 'function') window.CryptoDash.checkAchievement('alert_setter');
        window.CryptoDash.renderAlerts();
    };

    window.CryptoDash.checkAlerts = function () {
        var alerts = loadAlerts();
        if (!alerts.length) return;
        var data = window.CryptoDash.rawData || [];
        var priceMap = {};
        data.forEach(function (c) { priceMap[c.id] = c.current_price; }); // API returns current_price in USD (base logic of python script)

        var triggered = [];
        var remaining = [];
        alerts.forEach(function (a) {
            var curPrice = priceMap[a.coinId];
            if (curPrice === undefined) { remaining.push(a); return; }
            var hit = false;
            if (a.direction === 'above' && curPrice >= a.targetPriceUSD) hit = true;
            if (a.direction === 'below' && curPrice <= a.targetPriceUSD) hit = true;
            if (hit) {
                triggered.push(a);
            } else {
                remaining.push(a);
            }
        });

        if (triggered.length > 0) {
            saveAlerts(remaining);
            window.CryptoDash.renderAlerts();
            if (window.CryptoDash.sounds) window.CryptoDash.sounds.alert();
            
            var msg = triggered.map(function(t) { return t.coinName + ' crossed ' + window.CryptoDash.fmtPrice(t.targetPriceUSD, window.CryptoDash.currency); }).join('\n');
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Crypto Price Alert!", { body: msg, icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968260.png' });
            } else {
                alert("🔔 PRICE ALERTS TRIGGERED:\n\n" + msg);
            }
            if (typeof window.CryptoDash.sendSmsAlert === 'function') {
                window.CryptoDash.sendSmsAlert(triggered, msg);
            }
        }
    };

    renderSmsSettings();
    window.CryptoDash.renderAlerts();
    loadFromCloud();
})();
