/* js/toast.js */
(function() {
    window.CryptoDash = window.CryptoDash || {};

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {string} type - 'success', 'error', or 'info'.
     * @param {number} duration - How long to show in ms.
     */
    window.CryptoDash.showToast = function(message, type = 'info', duration = 4000) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.className = 'cd-toast ' + type;
        
        var icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = '<span>' + icon + '</span> ' + message;
        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, duration);
    };

    // Global helper for sync errors
    window.CryptoDash.showSyncError = function(error) {
        console.error("Cloud Sync Error:", error);
        window.CryptoDash.showToast("Cloud sync failed. Data saved locally.", 'error');
    };
})();
