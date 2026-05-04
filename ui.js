/* js/ui.js */
(function() {
    /* ── Theme Toggle ── */
    var themeBtn = document.getElementById('theme-toggle-menu-btn');
    var themeIcon = document.getElementById('theme-icon-menu');
    var dark = localStorage.getItem('crypto_theme') !== 'light';
    
    function updateThemeUI() {
        if (!themeBtn || !themeIcon) return;
        if (!dark) {
            document.documentElement.classList.add('light-theme');
            themeIcon.textContent = '☀️';
            themeBtn.setAttribute('aria-pressed', 'false');
        } else {
            document.documentElement.classList.remove('light-theme');
            themeIcon.textContent = '🌙';
            themeBtn.setAttribute('aria-pressed', 'true');
        }
    }
    updateThemeUI();

    if (themeBtn) {
        themeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            dark = !dark;
            localStorage.setItem('crypto_theme', dark ? 'dark' : 'light');
            updateThemeUI();
        });
    }

    /* ── User Profile Menu ── */
    var userProfileBtn = document.getElementById('user-profile-btn');
    var userDropdown = document.getElementById('user-dropdown');
    var userEmailDisplay = document.getElementById('user-email-display');
    var logoutBtn = document.getElementById('logout-btn');

    if (userProfileBtn && userDropdown) {
        userProfileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function () {
            userDropdown.classList.remove('open');
        });

        userDropdown.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent closing when clicking inside
        });
    }

    // Load User Info
    async function loadUserInfo() {
        var sb = window.CryptoDash.supabase;
        if (!sb) return;
        var { data: { user } } = await sb.auth.getUser();
        if (user && userEmailDisplay) {
            userEmailDisplay.textContent = user.email;
        }
    }
    loadUserInfo();

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            var sb = window.CryptoDash.supabase;
            if (sb) await sb.auth.signOut();
            sessionStorage.removeItem('crypto_logged_in');
            window.location.href = 'login.html';
        });
    }

    /* ── Sound Effects Engine ── */
    var ctx = null;
    var muted = localStorage.getItem('crypto_muted') === 'true';
    var muteBtn = document.getElementById('mute-toggle-menu-btn');
    var muteIcon = document.getElementById('mute-icon-menu');

    function getCtx() { 
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        if (ctx.state === 'suspended') ctx.resume();
        return ctx; 
    }

    // Unlock audio on any click
    document.addEventListener('click', function() { getCtx(); }, { once: true });

    function playTone(freq, dur, type, vol, ramp) {
        if (muted) return;
        try {
            var ac = getCtx(), o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ac.currentTime);
            if (ramp) o.frequency.linearRampToValueAtTime(ramp, ac.currentTime + dur);
            g.gain.setValueAtTime(vol || 0.1, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
            o.connect(g); g.connect(ac.destination);
            o.start(); o.stop(ac.currentTime + dur);
        } catch (e) {}
    }

    window.CryptoDash.sounds = {
        buy: function () {
            if (muted) return;
            // Play a synthetic "cha-ching" sound
            playTone(800, 0.1, 'sine', 0.1, 1200);
            setTimeout(function() { playTone(1200, 0.2, 'sine', 0.08, 1400); }, 80);
        },
        sell: function () {
            if (muted) return;
            // Play a synthetic "success" chime
            playTone(600, 0.08, 'square', 0.05);
            setTimeout(function () { playTone(800, 0.08, 'square', 0.05); }, 80);
            setTimeout(function () { playTone(1100, 0.15, 'sine', 0.08); }, 160);
        },
        alert: function () {
            if (muted) return;
            playTone(880, 0.15, 'sine', 0.1);
            setTimeout(function () { playTone(660, 0.15, 'sine', 0.08); }, 150);
        },
        rise: function () {
            if (muted) return;
            playTone(523, 0.1, 'sine', 0.05);
            setTimeout(function () { playTone(659, 0.12, 'sine', 0.05); }, 100);
        }
    };

    function updateMuteUI() {
        if (!muteBtn || !muteIcon) return;
        muteIcon.textContent = muted ? '🔇' : '🔊';
        muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    }
    updateMuteUI();

    if (muteBtn) {
        muteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            muted = !muted;
            localStorage.setItem('crypto_muted', muted);
            updateMuteUI();
            if (!muted) { getCtx(); playTone(800, 0.1, 'sine', 0.1); }
        });
    }

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
