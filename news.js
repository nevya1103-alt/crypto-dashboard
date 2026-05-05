/* js/news.js */
(function() {
    // Using a public RSS-to-JSON converter for CoinTelegraph (No API Key needed)
    var NEWS_API = "https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss";
    var container = document.getElementById('news-container');
    var newsBtn = document.getElementById('news-btn');
    var newsPanel = document.getElementById('news-panel');
    var newsOverlay = document.getElementById('news-overlay');
    var newsClose = document.getElementById('news-close-btn');

    async function fetchNews() {
        if (!container) return;
        
        try {
            var res = await fetch(NEWS_API);
            var json = await res.json();
            
            if (json && json.status === 'ok' && Array.isArray(json.items)) {
                renderNews(json.items.slice(0, 10)); // Show 10 items in the panel
            } else {
                throw new Error("Invalid news data structure");
            }
        } catch (e) {
            console.error("Failed to fetch news:", e);
            if (container) container.innerHTML = '<div class="news-error">Unable to load news at this time.</div>';
        }
    }

    function renderNews(news) {
        if (!container) return;
        container.innerHTML = '';
        
        news.forEach(function(item) {
            var card = document.createElement('a');
            card.href = item.link;
            card.target = "_blank";
            card.className = "news-card";
            card.rel = "noopener noreferrer";

            // Extract image from description if thumbnail is missing
            var imgUrl = item.thumbnail || '';
            if (!imgUrl && item.description) {
                var match = item.description.match(/src="([^"]+)"/);
                if (match) imgUrl = match[1];
            }
            if (!imgUrl) imgUrl = 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=400&auto=format&fit=crop';

            var timeAgo = getTimeAgo(new Date(item.pubDate).getTime() / 1000);
            
            card.innerHTML = `
                <img class="news-image" src="${imgUrl}" alt="" loading="lazy">
                <div class="news-content">
                    <div class="news-source">CoinTelegraph</div>
                    <div class="news-title">${item.title}</div>
                    <div class="news-meta">${timeAgo}</div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function getTimeAgo(timestamp) {
        var now = Math.floor(Date.now() / 1000);
        var diff = now - timestamp;
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    /* ── Panel Control ── */
    function openNewsPanel() {
        if (newsPanel && newsOverlay) {
            newsPanel.classList.add('open');
            newsOverlay.classList.add('open');
            fetchNews(); // Refresh news when opening
            if (window.CryptoDash && window.CryptoDash.trapFocus) {
                window.CryptoDash.trapFocus(newsPanel, newsClose);
            }
        }
    }

    function closeNewsPanel() {
        if (newsPanel && newsOverlay) {
            newsPanel.classList.remove('open');
            newsOverlay.classList.remove('open');
        }
    }

    if (newsBtn) {
        newsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openNewsPanel();
        });
    }

    if (newsClose) newsClose.addEventListener('click', closeNewsPanel);
    if (newsOverlay) newsOverlay.addEventListener('click', closeNewsPanel);

    // Initial fetch
    fetchNews();

    // Refresh every 10 minutes
    setInterval(fetchNews, 600000);

})();
