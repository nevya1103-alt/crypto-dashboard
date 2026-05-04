import asyncio
import json
from html import escape
from js import document, fetch, window

API_URL = (
    "https://api.coingecko.com/api/v3/coins/markets"
    "?vs_currency=usd&order=market_cap_desc&per_page=50&page=1"
    "&sparkline=false&price_change_percentage=1h,24h,7d"
)

# ── Formatters (USD baseline) ─────────────────────────────────────────────

def format_currency(value):
    value = value or 0
    if value >= 0.01:
        return f"${value:,.2f}"
    return f"${value:,.6f}"

def format_compact(value):
    value = value or 0
    if value >= 1_000_000_000:
        return f"${value / 1_000_000_000:.1f}B"
    elif value >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif value >= 1_000:
        return f"${value / 1_000:.1f}K"
    return f"${value}"

def format_change(value):
    v = value or 0
    css = "positive" if v >= 0 else "negative"
    prefix = "+" if v >= 0 else ""
    return f'<td class="{css}">{prefix}{v:.2f}%</td>'

def safe_text(value):
    return escape(str(value or ""), quote=False)

def safe_attr(value):
    return escape(str(value or ""), quote=True)

# ── Main render ───────────────────────────────────────────────────────────

def analyze_and_render(data):
    if not data:
        return

    # 1. Store raw data as proper JSON string, then parse in JS
    #    (PyScript proxy objects don't behave as real JS arrays)
    data_json = json.dumps(data)
    window.eval(f"window.CryptoDash.rawData = {data_json};")

    # 2. Analyze
    top_5 = sorted(data, key=lambda x: x.get('market_cap') or 0, reverse=True)[:5]
    total_price  = sum(coin.get('current_price') or 0 for coin in data)
    avg_price    = total_price / len(data)

    highest_change = max(data, key=lambda x: x.get('price_change_percentage_24h') or 0)
    lowest_change  = min(data, key=lambda x: x.get('price_change_percentage_24h') or 0)

    # 3. Overview cards
    document.getElementById('avg-price').innerText = format_currency(avg_price)

    high_val = highest_change.get('price_change_percentage_24h') or 0
    document.getElementById('highest-change').innerHTML = (
        f"{safe_text(highest_change.get('name'))} <span class='positive'>(+{high_val:.2f}%)</span>"
    )
    low_val = lowest_change.get('price_change_percentage_24h') or 0
    document.getElementById('lowest-change').innerHTML = (
        f"{safe_text(lowest_change.get('name'))} <span class='negative'>({low_val:.2f}%)</span>"
    )

    # 4. Top-5 grid
    top5_rows = []
    for coin in top_5:
        sym  = safe_text(str(coin.get('symbol') or '').upper())
        name = safe_text(coin.get('name'))
        mcap_usd = coin.get('market_cap') or 0
        mcap = format_compact(mcap_usd)
        top5_rows.append(
            f'<div class="top-5-card">'
            f'<span class="symbol">{sym}</span>'
            f'<div class="name">{name}</div>'
            f'<div class="cap" data-usd="{mcap_usd}">{mcap}</div>'
            f'</div>'
        )
    document.getElementById('top-5-container').innerHTML = "".join(top5_rows)

    # 5. Table rows — clickable, data attributes carry coin metadata for JS
    table_rows = []
    for idx, coin in enumerate(data):
        rank      = idx + 1
        coin_id   = safe_attr(coin.get('id'))
        name      = safe_text(coin.get('name'))
        name_attr = safe_attr(coin.get('name'))
        image     = safe_attr(coin.get('image'))
        raw_sym   = str(coin.get('symbol') or '').upper()
        sym       = safe_text(raw_sym)
        sym_attr  = safe_attr(raw_sym)
        price     = format_currency(coin.get('current_price') or 0)
        mcap      = format_compact(coin.get('market_cap') or 0)
        vol       = format_compact(coin.get('total_volume') or 0)
        change_1h  = coin.get('price_change_percentage_1h_in_currency') or 0
        change_24h = coin.get('price_change_percentage_24h') or 0
        change_7d  = coin.get('price_change_percentage_7d_in_currency') or 0

        row  = (f'<tr class="clickable-row" tabindex="0" role="button" '
                f'data-coin-id="{coin_id}" '
                f'data-coin-name="{name_attr}" '
                f'data-coin-symbol="{sym_attr}" '
                f'data-coin-image="{image}">')
        row += f'<td>#{rank}</td>'
        row += (f'<td><div class="coin-name-cell">'
                f'<img src="{image}" alt="{name_attr} logo">'
                f'<span>{name}</span></div></td>')
        row += f'<td><span class="badge">{sym}</span></td>'
        row += f'<td class="price-cell" data-usd="{coin.get("current_price") or 0}">{price}</td>'
        row += f'<td class="mcap-cell" data-usd="{coin.get("market_cap") or 0}">{mcap}</td>'
        row += f'<td class="vol-cell"  data-usd="{coin.get("total_volume") or 0}">{vol}</td>'
        row += format_change(change_1h)
        row += format_change(change_24h)
        row += format_change(change_7d)
        row += '</tr>'
        table_rows.append(row)

    document.getElementById('crypto-table-body').innerHTML = "".join(table_rows)

    # 6. Trigger JS currency re-render after table is populated
    window.eval("if(typeof reRenderTable==='function') reRenderTable();")

    # 7. Dismiss the loading overlay
    window.eval("""
        var lo = document.getElementById('loading-overlay');
        if (lo && !lo.classList.contains('hidden')) {
            lo.classList.add('hidden');
            setTimeout(function() { lo.remove(); }, 600);
        }
    """)

    # 8. Trigger alert, watchlist, and achievement checks
    window.eval("""
        if (typeof window.CryptoDash.checkAlerts === 'function') window.CryptoDash.checkAlerts();
        if (typeof window.CryptoDash.checkWatchlistRises === 'function') window.CryptoDash.checkWatchlistRises();
        if (typeof window.CryptoDash.checkPortfolioAchievements === 'function') window.CryptoDash.checkPortfolioAchievements();
    """)

# ── Fetch loop ────────────────────────────────────────────────────────────

async def fetch_crypto_data(*args):
    try:
        response = await fetch(API_URL)
        text     = await response.text()
        data     = json.loads(text)
        analyze_and_render(data)
    except Exception as e:
        print(f"Error fetching crypto data: {e}")

async def main():
    await fetch_crypto_data()
    while True:
        await asyncio.sleep(300)
        await fetch_crypto_data()

asyncio.ensure_future(main())
