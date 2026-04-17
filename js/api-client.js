/**
 * Trading Cockpit - API Client
 * Financial Modeling Prep (FMP) + Yahoo Finance Fallback
 * Mit mehrstufigem Caching und Rate-Limiting
 */

const FMP_BASE = 'https://financialmodelingprep.com';
const YAHOO_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url='
];
let currentProxyIndex = 0;

function getYahooProxyUrl(yahooUrl) {
  return YAHOO_PROXIES[currentProxyIndex] + encodeURIComponent(yahooUrl);
}
const YAHOO_BASE = 'https://query1.finance.yahoo.com';

// In-Memory Cache
const memoryCache = new Map();

// Rate Limiter State
let apiCallsToday = 0;
let apiCallsDate = new Date().toDateString();
const MAX_DAILY_CALLS = 250;

// Inflight Request Deduplication
const inflightRequests = new Map();

/**
 * Holt den API-Key aus dem LocalStorage.
 */
function getApiKey() {
  try {
    const stored = localStorage.getItem('tc_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return settings.apiKey || '';
    }
  } catch (e) { /* ignore */ }
  return '';
}

/**
 * Gibt die gewählte API-Quelle zurück ('yahoo' oder 'fmp').
 */
function getApiSource() {
  try {
    const stored = localStorage.getItem('tc_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return settings.apiSource || 'yahoo';
    }
  } catch (e) { /* ignore */ }
  return 'yahoo';
}

/**
 * Prueft und aktualisiert den Rate Limiter.
 */
function checkRateLimit() {
  const today = new Date().toDateString();
  if (today !== apiCallsDate) {
    apiCallsToday = 0;
    apiCallsDate = today;
  }
  if (apiCallsToday >= MAX_DAILY_CALLS) {
    throw new Error('API-Tageslimit erreicht (' + MAX_DAILY_CALLS + ' Calls). Daten werden aus dem Cache geladen.');
  }
  apiCallsToday++;
}

/**
 * Liest aus dem LocalStorage Cache.
 */
function getFromStorageCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem('tc_cache_' + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > maxAgeMs) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Schreibt in den LocalStorage Cache.
 */
function setStorageCache(key, data) {
  try {
    localStorage.setItem('tc_cache_' + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) { /* ignore quota errors */ }
}

/**
 * Generischer Fetch mit Caching und Deduplication.
 */
async function cachedFetch(url, cacheKey, memoryTtlMs, storageTtlMs) {
  // 1. Memory Cache
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() - memEntry.timestamp < memoryTtlMs) {
    return memEntry.data;
  }

  // 2. Storage Cache
  const storageData = getFromStorageCache(cacheKey, storageTtlMs);
  if (storageData) {
    memoryCache.set(cacheKey, { data: storageData, timestamp: Date.now() });
    return storageData;
  }

  // 3. Deduplication
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  // 4. Fetch
  const fetchPromise = (async () => {
    try {
      checkRateLimit();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      const data = await response.json();

      // Cache
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      setStorageCache(cacheKey, data);

      return data;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// ===== FMP API =====

/**
 * Sucht Aktien nach Name oder Symbol.
 * @returns {Array} [{symbol, name, currency, stockExchange, exchangeShortName}]
 */
export async function searchStocks(query) {
  const source = getApiSource();
  const apiKey = getApiKey();
  if (source === 'yahoo' || !apiKey) return searchStocksYahoo(query);

  const url = FMP_BASE + '/api/v3/search?query=' + encodeURIComponent(query) + '&limit=10&apikey=' + apiKey;
  const cacheKey = 'search_' + query.toLowerCase();

  try {
    const data = await cachedFetch(url, cacheKey, 5 * 60 * 1000, 5 * 60 * 1000);
    return (data || []).map(item => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchangeShortName || item.stockExchange || '',
      currency: item.currency || 'EUR'
    }));
  } catch (e) {
    console.warn('FMP search failed, trying Yahoo:', e.message);
    return searchStocksYahoo(query);
  }
}

/**
 * Holt den aktuellen Kurs einer Aktie.
 * @returns {Object} {price, change, changePercent, dayHigh, dayLow, volume, name}
 */
export async function getQuote(symbol) {
  const source = getApiSource();
  const apiKey = getApiKey();
  if (source === 'yahoo' || !apiKey) return getQuoteYahoo(symbol);

  const url = FMP_BASE + '/api/v3/quote/' + encodeURIComponent(symbol) + '?apikey=' + apiKey;
  const cacheKey = 'quote_' + symbol;

  try {
    const data = await cachedFetch(url, cacheKey, 60 * 1000, 5 * 60 * 1000);
    if (!data || data.length === 0) throw new Error('Keine Daten');

    const q = data[0];
    return {
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changesPercentage,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      yearHigh: q.yearHigh,
      yearLow: q.yearLow,
      volume: q.volume,
      marketCap: q.marketCap,
      pe: q.pe,
      timestamp: q.timestamp
    };
  } catch (e) {
    console.warn('FMP quote failed, trying Yahoo:', e.message);
    return getQuoteYahoo(symbol);
  }
}

/**
 * Holt historische Tageskurse.
 * @returns {Array} [{date, open, high, low, close, volume}]
 */
export async function getHistoricalPrices(symbol, fromDate, toDate) {
  const source = getApiSource();
  const apiKey = getApiKey();
  if (source === 'yahoo' || !apiKey) return getHistoricalYahoo(symbol, fromDate, toDate);

  const from = formatDate(fromDate);
  const to = formatDate(toDate);
  const url = FMP_BASE + '/api/v3/historical-price-full/' + encodeURIComponent(symbol) + '?from=' + from + '&to=' + to + '&apikey=' + apiKey;
  const cacheKey = 'hist_' + symbol + '_' + from + '_' + to;

  try {
    const data = await cachedFetch(url, cacheKey, 60 * 60 * 1000, 24 * 60 * 60 * 1000);
    if (!data || !data.historical) throw new Error('Keine historischen Daten');

    return data.historical
      .map(d => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (e) {
    console.warn('FMP historical failed, trying Yahoo:', e.message);
    return getHistoricalYahoo(symbol, fromDate, toDate);
  }
}

// ===== YAHOO FINANCE FALLBACK =====

async function searchStocksYahoo(query) {
  if (!query || query.length < 1) return [];
  try {
    // Yahoo Finance Search-Endpoint — liefert Symbole, Kurznamen, Exchange
    const yahooUrl = 'https://query2.finance.yahoo.com/v1/finance/search?q=' +
                     encodeURIComponent(query) + '&quotesCount=10&newsCount=0';
    const cacheKey = 'ysearch_' + query.toLowerCase();
    let data = null;

    for (let i = 0; i < YAHOO_PROXIES.length; i++) {
      try {
        const proxyUrl = YAHOO_PROXIES[(currentProxyIndex + i) % YAHOO_PROXIES.length] + encodeURIComponent(yahooUrl);
        data = await cachedFetch(proxyUrl, cacheKey, 5 * 60 * 1000, 60 * 60 * 1000);
        if (data?.quotes) {
          currentProxyIndex = (currentProxyIndex + i) % YAHOO_PROXIES.length;
          break;
        }
      } catch (proxyErr) {
        console.warn('Yahoo-Search Proxy ' + i + ' failed:', proxyErr.message);
      }
    }
    if (!data?.quotes) return [];

    return data.quotes
      .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || !q.quoteType))
      .slice(0, 10)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        currency: q.currency || 'USD'
      }));
  } catch (e) {
    console.warn('Yahoo search failed:', e.message);
    return [];
  }
}

async function getQuoteYahoo(symbol) {
  try {
    const yahooUrl = YAHOO_BASE + '/v8/finance/chart/' + encodeURIComponent(symbol) + '?range=1d&interval=1m';
    const cacheKey = 'yquote_' + symbol;
    let data = null;

    // Versuche alle Proxies
    for (let i = 0; i < YAHOO_PROXIES.length; i++) {
      try {
        const proxyUrl = YAHOO_PROXIES[(currentProxyIndex + i) % YAHOO_PROXIES.length] + encodeURIComponent(yahooUrl);
        data = await cachedFetch(proxyUrl, cacheKey, 60 * 1000, 5 * 60 * 1000);
        if (data?.chart?.result?.[0]) {
          currentProxyIndex = (currentProxyIndex + i) % YAHOO_PROXIES.length;
          break;
        }
      } catch (proxyErr) {
        console.warn('Proxy ' + i + ' failed:', proxyErr.message);
      }
    }
    if (!data?.chart?.result?.[0]) throw new Error('Yahoo: Keine Daten über alle Proxies');

    const result = data.chart.result[0];
    const meta = result.meta;

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      yearHigh: meta.fiftyTwoWeekHigh,
      yearLow: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      marketCap: null,
      pe: null,
      timestamp: meta.regularMarketTime
    };
  } catch (e) {
    console.warn('Yahoo quote failed:', e.message);
    return null;
  }
}

async function getHistoricalYahoo(symbol, fromDate, toDate) {
  try {
    const period1 = Math.floor(new Date(fromDate).getTime() / 1000);
    const period2 = Math.floor(new Date(toDate).getTime() / 1000);
    const yahooUrl = YAHOO_BASE + '/v8/finance/chart/' + encodeURIComponent(symbol) +
      '?period1=' + period1 + '&period2=' + period2 + '&interval=1d';
    const cacheKey = 'yhist_' + symbol + '_' + formatDate(fromDate) + '_' + formatDate(toDate);
    let data = null;

    for (let i = 0; i < YAHOO_PROXIES.length; i++) {
      try {
        const proxyUrl = YAHOO_PROXIES[(currentProxyIndex + i) % YAHOO_PROXIES.length] + encodeURIComponent(yahooUrl);
        data = await cachedFetch(proxyUrl, cacheKey, 60 * 60 * 1000, 24 * 60 * 60 * 1000);
        if (data?.chart?.result?.[0]) break;
      } catch (proxyErr) {
        console.warn('Hist proxy ' + i + ' failed:', proxyErr.message);
      }
    }
    if (!data?.chart?.result?.[0]) throw new Error('Yahoo: Keine historischen Daten');

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i]
    })).filter(d => d.close != null);
  } catch (e) {
    console.warn('Yahoo historical failed:', e.message);
    return [];
  }
}

// ===== HILFSFUNKTIONEN =====

function formatDate(date) {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
}

/**
 * Gibt den aktuellen API-Status zurueck.
 */
export function getApiStatus() {
  const today = new Date().toDateString();
  if (today !== apiCallsDate) {
    apiCallsToday = 0;
    apiCallsDate = today;
  }
  return {
    hasKey: !!getApiKey(),
    callsToday: apiCallsToday,
    callsRemaining: MAX_DAILY_CALLS - apiCallsToday,
    maxDaily: MAX_DAILY_CALLS
  };
}

/**
 * Leert den gesamten Cache.
 */
export function clearCache() {
  memoryCache.clear();
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('tc_cache_'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
}
