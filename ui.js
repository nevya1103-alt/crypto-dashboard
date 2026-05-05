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

    /* ── Main Navigation Dropdown (Top Left) ── */
    var navTriggerBtn = document.getElementById('nav-trigger-btn');
    var navDropdown = document.getElementById('nav-dropdown');

    if (navTriggerBtn && navDropdown) {
        navTriggerBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            navDropdown.classList.toggle('open');
            if (userDropdown) userDropdown.classList.remove('open'); // Close other if open
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function () {
            navDropdown.classList.remove('open');
        });

        navDropdown.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent closing when clicking inside
        });
    }

    // Load User Info
    async function loadUserInfo() {
        var sb = window.CryptoDash.supabase;
        if (!sb) return;
        var { data: { user } } = await sb.auth.getUser();
        if (user) {
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            
            // Fallback: If local profile is empty, try to restore from Auth Metadata
            var localProfile = localStorage.getItem('crypto_user_profile');
            var localIsEmpty = !localProfile || localProfile === '{}' || localProfile === 'null';

            if (localIsEmpty) {
                var meta = user.user_metadata || {};
                if (meta.full_name || meta.phone || meta.occupation) {
                    var restored = {
                        name: meta.full_name || '',
                        phone: meta.phone || '',
                        gender: meta.gender || '',
                        dob: meta.dob || '',
                        occupation: meta.occupation || ''
                    };
                    localStorage.setItem('crypto_user_profile', JSON.stringify(restored));
                    if (window.CryptoDash && window.CryptoDash.loadProfile) {
                        window.CryptoDash.loadProfile();
                    }
                }
            }
        }
    }
    loadUserInfo();

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            var sb = window.CryptoDash.supabase;
            if (sb) {
                // Final sync before logout
                if (window.CryptoDash.saveAllToCloud) {
                    await window.CryptoDash.saveAllToCloud();
                }
                await sb.auth.signOut();
            }
            
            // Clear all user-specific localStorage data
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('crypto_')) {
                    localStorage.removeItem(key);
                }
            });

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

    // Profile Management
    var profileView = document.getElementById('profile-view-mode');
    var profileEdit = document.getElementById('profile-edit-mode');
    var editBtn = document.getElementById('profile-edit-btn');
    var saveBtn = document.getElementById('profile-save-btn');
    var cancelBtn = document.getElementById('profile-cancel-btn');

    var profileFields = ['name', 'phone', 'gender', 'dob', 'occupation'];

    function loadProfile() {
        var data = {};
        try { data = JSON.parse(localStorage.getItem('crypto_user_profile')) || {}; } catch(e) {}
        
        // Populate personal info fields
        profileFields.forEach(function(f) {
            var val = data[f] || '—';
            var viewEl = document.getElementById('view-' + f);
            var editEl = document.getElementById('edit-' + f);
            if (viewEl) viewEl.textContent = val;
            if (editEl) editEl.value = (val === '—') ? '' : val;
        });

        // Also set email in the personal info section
        var sb = window.CryptoDash.supabase;
        if (sb) {
            sb.auth.getUser().then(function(res) {
                if (res.data && res.data.user) {
                    var emailView = document.getElementById('view-email');
                    if (emailView) emailView.textContent = res.data.user.email;
                    if (userEmailDisplay) userEmailDisplay.textContent = res.data.user.email;
                }
            });
        }
    }

    async function saveProfile() {
        var saveBtn = document.getElementById('profile-save-btn');
        var ogText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        var data = {};
        profileFields.forEach(function(f) {
            var el = document.getElementById('edit-' + f);
            if (el) data[f] = el.value;
        });
        localStorage.setItem('crypto_user_profile', JSON.stringify(data));
        
        // Sync to cloud
        if (window.CryptoDash && window.CryptoDash.saveAllToCloud) {
            await window.CryptoDash.saveAllToCloud();
        }

        loadProfile();
        toggleEditMode(false);
        saveBtn.textContent = ogText;
        saveBtn.disabled = false;

        if (window.CryptoDash && window.CryptoDash.showToast) {
            window.CryptoDash.showToast('Profile updated successfully!', 'success');
        }
    }

    function toggleEditMode(editing) {
        if (!profileView || !profileEdit) return;
        profileView.style.display = editing ? 'none' : 'block';
        profileEdit.style.display = editing ? 'block' : 'none';
    }

    if (editBtn) editBtn.addEventListener('click', function() { toggleEditMode(true); });
    if (cancelBtn) cancelBtn.addEventListener('click', function() { toggleEditMode(false); });
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);

    loadProfile();
    window.CryptoDash.loadProfile = loadProfile;

})();
