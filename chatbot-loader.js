/* js/chatbot-loader.js */
(function() {
    var cbBtn = document.getElementById('chatbot-fab');
    var isLoaded = false;

    if (!cbBtn) return;

    cbBtn.addEventListener('click', function() {
        if (isLoaded) return;
        
        // Load the actual chatbot script
        var script = document.createElement('script');
        script.src = 'js/chatbot.js';
        script.onload = function() {
            isLoaded = true;
            // The chatbot.js will automatically initialize and open the panel
            // because we'll modify it to trigger the open event on load if needed.
            // For now, we'll just let it run its IIFE.
        };
        document.body.appendChild(script);
    }, { once: true });
})();
