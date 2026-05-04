/* js/ui.js */
(function() {
    /* ── Theme Toggle ── */
    var themeBtn = document.getElementById('theme-toggle-btn');
    var themeIcon = document.getElementById('theme-icon');
    var dark = localStorage.getItem('crypto_theme') !== 'light';
    if (!dark) {
        document.documentElement.classList.add('light-theme');
        themeIcon.textContent = '☀️';
        themeBtn.setAttribute('aria-pressed', 'false');
    } else {
        document.documentElement.classList.remove('light-theme');
        themeBtn.setAttribute('aria-pressed', 'true');
    }
    themeBtn.addEventListener('click', function () {
        dark = !dark;
        if (dark) {
            document.documentElement.classList.remove('light-theme');
            themeIcon.textContent = '🌙';
            localStorage.setItem('crypto_theme', 'dark');
            themeBtn.setAttribute('aria-pressed', 'true');
        } else {
            document.documentElement.classList.add('light-theme');
            themeIcon.textContent = '☀️';
            localStorage.setItem('crypto_theme', 'light');
            themeBtn.setAttribute('aria-pressed', 'false');
        }
    });

    /* ── Sound Effects Engine ── */
    var ctx = null;
    var muted = localStorage.getItem('crypto_muted') === 'true';
    var muteBtn = document.getElementById('mute-toggle-btn');

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
        } catch (e) {}
    }

    window.CryptoDash.sounds = {
        buy: function () {
            if (muted) return;
            try { var a = new Audio('https://actions.google.com/sounds/v1/foley/coin_drop_on_wood.ogg'); a.volume = 0.6; a.play(); } 
            catch(e) { playTone(800, 0.12, 'sine', 0.15, 1200); setTimeout(function () { playTone(1200, 0.15, 'sine', 0.12, 1400); }, 100); }
        },
        sell: function () {
            if (muted) return;
            try { var a = new Audio('https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg'); a.volume = 0.6; a.play(); }
            catch(e) { playTone(600, 0.08, 'square', 0.08); setTimeout(function () { playTone(800, 0.08, 'square', 0.08); }, 80); setTimeout(function () { playTone(1100, 0.15, 'sine', 0.12); }, 160); }
        },
        alert: function () {
            if (muted) return;
            try { var a = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'); a.volume = 0.6; a.play(); }
            catch(e) { playTone(880, 0.15, 'sine', 0.15); setTimeout(function () { playTone(660, 0.15, 'sine', 0.12); }, 150); setTimeout(function () { playTone(440, 0.2, 'sine', 0.1); }, 300); }
        },
        rise: function () {
            if (muted) return;
            try { var a = new Audio('https://actions.google.com/sounds/v1/water/water_drop.ogg'); a.volume = 0.4; a.play(); }
            catch(e) { playTone(523, 0.1, 'sine', 0.08); setTimeout(function () { playTone(659, 0.12, 'sine', 0.08); }, 100); }
        }
    };

    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    muteBtn.addEventListener('click', function () {
        muted = !muted;
        localStorage.setItem('crypto_muted', muted);
        muteBtn.textContent = muted ? '🔇' : '🔊';
        muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        if (!muted) { getCtx(); playTone(800, 0.1, 'sine', 0.1); }
    });

    /* ── Search UI ── */
    var searchInput = document.getElementById('crypto-search');
    var clearBtn = document.getElementById('search-clear-btn');
    var countEl = document.getElementById('search-results-count');
    
    function filterTable() {
        var term = searchInput.value.toLowerCase().trim();
        var rows = document.querySelectorAll('#crypto-table-body tr');
        var vis = 0;
        rows.forEach(function (r) {
            if (r.classList.contains('skeleton-row')) return;
            var text = r.textContent.toLowerCase();
            if (text.includes(term)) { r.style.display = ''; vis++; } 
            else { r.style.display = 'none'; }
        });
        clearBtn.style.display = term ? 'flex' : 'none';
        if (!term) { countEl.textContent = ''; }
        else { countEl.textContent = vis + (vis === 1 ? ' result' : ' results') + ' found'; }
    }
    
    searchInput.addEventListener('input', filterTable);
    clearBtn.addEventListener('click', function () { searchInput.value = ''; filterTable(); searchInput.focus(); });
    
    var obs = new MutationObserver(function () { if (searchInput.value.trim()) filterTable(); });
    var tb = document.getElementById('crypto-table-body');
    if (tb) obs.observe(tb, { childList: true, subtree: true });

    /* ── Focus Trap Utility ── */
    window.CryptoDash.trapFocus = function(modalEl, closeBtnEl) {
        var focusableEls = modalEl.querySelectorAll('a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], input[type="number"], select, [tabindex]:not([tabindex="-1"])');
        var first = focusableEls[0];
        var last = focusableEls[focusableEls.length - 1];
        
        modalEl.addEventListener('keydown', function(e) {
            var isTab = (e.key === 'Tab' || e.keyCode === 9);
            if (!isTab) return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        // Initial focus
        if (first) setTimeout(function() { first.focus(); }, 100);
    };

    /* Handle accessible row clicks */
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            if (e.target && e.target.classList.contains('clickable-row')) {
                e.preventDefault();
                e.target.click();
            }
            if (e.target && e.target.classList.contains('star-btn')) {
                e.preventDefault();
                e.target.click();
            }
        }
    });

})();
