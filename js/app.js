/**
 * Trading Cockpit - Alpine.js Hauptanwendung
 * Alpine wird als ES-Modul importiert und manuell gestartet,
 * damit alle Stores/Components registriert sind bevor Alpine initialisiert.
 */
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3/dist/module.esm.js';
import * as TaxEngine from './tax-engine.js';
import * as fmt from './utils/formatters.js';
import * as storage from './utils/storage.js';
import { GLOSSARY } from './utils/glossary.js';
import { GERMAN_STOCKS } from './data/german-stocks.js';
import { renderTaxDragChart } from './chart-manager.js';
import { renderPriceLevelChart } from './modules/price-levels.js';
import { calculateVolatility } from './modules/volatility-check.js';
import { compareDcaVsTiming } from './modules/dca-comparison.js';
import { evaluateAdvisory } from './modules/advisory.js';
import * as api from './api-client.js';

// Globals fuer Alpine-Templates
window.Alpine = Alpine;
window.fmt = fmt;
window.TaxEngine = TaxEngine;
window.GLOSSARY = GLOSSARY;

// Standard-Position
const DEFAULT_POSITION = {
  ticker: '',
  companyName: '',
  shares: 0,
  buyPrice: 0,
  currentPrice: 0,
  brokerFee: 1.00,
  sellPrice: 0,
  stopLoss: 0,
  targetPrice: 0,
  desiredNetProfit: 0
};

const DEFAULT_SETTINGS = {
  kirchensteuer: false,
  bundeslandId: 'keine',
  kirchensteuerRate: 0,
  freistellungTotal: 1000,
  freistellungUsed: 0,
  apiSource: 'yahoo',
  apiKey: ''
};

// ===== Alpine Store registrieren =====
Alpine.store('app', {
  position: storage.load('position', { ...DEFAULT_POSITION }),
  settings: storage.load('settings', { ...DEFAULT_SETTINGS }),
  market: {
    quote: null,
    historicalData: [],
    lastFetch: null,
    loading: false,
    error: null
  },
  computed: {
    effectiveTaxRate: 0,
    grossGain: 0,
    totalTax: 0,
    netGain: 0,
    taxDragPercent: 0,
    breakEvenSell: 0,
    breakEvenRebuy: null,
    targetCalc: null,
    taxDragCurve: [],
    pnl: null,
    volatility: null,
    dcaResult: null,
    advisories: []
  },
  ui: {
    activeTab: 'steuerlast',
    sidebarOpen: true,
    showSettings: false,
    showApiKeyModal: false,
    showSaveModal: false,
    showGlossary: false,
    mobileMenuOpen: false,
    showLevels: true
  },
  search: {
    query: '',
    results: [],
    loading: false,
    show: false
  },
  sparplan: {
    monthlyAmount: 100,
    startMonth: 1,
    startYear: 2024
  },
  get effectiveTaxRate() {
    return TaxEngine.getEffectiveTaxRate(this.settings.kirchensteuerRate);
  },
  get freistellungRemaining() {
    return Math.max(0, this.settings.freistellungTotal - this.settings.freistellungUsed);
  },
  tabs: [
    { id: 'steuerlast', label: 'Steuerlast', icon: 'chart-pie' },
    { id: 'rebuy', label: 'Wiedereinstieg', icon: 'arrow-path' },
    { id: 'zielkurs', label: 'Zielkurs', icon: 'flag' },
    { id: 'kurschart', label: 'Kurslevel', icon: 'chart-bar' },
    { id: 'volatilitaet', label: 'Volatilitaet', icon: 'bolt' },
    { id: 'sparplan', label: 'Sparplan', icon: 'banknotes' }
  ]
});

// ===== Alpine Hauptkomponente registrieren =====
Alpine.data('tradingCockpit', () => ({
  init() {
    this.recalculate();

    this.$watch('$store.app.position', (val) => {
      storage.save('position', val);
      this.recalculate();
    });

    this.$watch('$store.app.settings', (val) => {
      storage.save('settings', val);
      const bl = TaxEngine.BUNDESLAENDER.find(b => b.id === val.bundeslandId);
      if (bl) {
        this.$store.app.settings.kirchensteuerRate = bl.rate;
      }
      this.recalculate();
    });

    // Auto-Load: Historische Daten laden wenn Kurslevel-Tab geöffnet wird
    this.$watch('$store.app.ui.activeTab', (tab) => {
      if (tab === 'kurschart') {
        // Historische Daten laden falls nötig
        if (this.$store.app.position.ticker && this.$store.app.market.historicalData.length === 0) {
          this.fetchHistorical(this.$store.app.position.ticker);
        }
        // Berechneten Zielkurs automatisch übernehmen (falls kein manueller gesetzt)
        const tc = this.$store.app.computed.targetCalc;
        if (tc && tc.valid && !this.$store.app.position.targetPrice) {
          this.$store.app.position.targetPrice = tc.targetSellPrice;
        }
      }
    });

    // Kein automatischer Sparplan-Watch — wird über Button "Berechnen" getriggert
  },

  recalculate() {
    const pos = this.$store.app.position;
    const settings = this.$store.app.settings;
    const bl = TaxEngine.BUNDESLAENDER.find(b => b.id === settings.bundeslandId);
    const kistRate = bl ? bl.rate : 0;
    const frei = Math.max(0, settings.freistellungTotal - settings.freistellungUsed);
    const effectiveTaxRate = TaxEngine.getEffectiveTaxRate(kistRate);

    const currentPrice = pos.currentPrice || pos.sellPrice || 0;

    let pnl = null;
    if (pos.shares > 0 && pos.buyPrice > 0 && currentPrice > 0) {
      pnl = TaxEngine.calculateNetProfit(
        pos.buyPrice, currentPrice, pos.shares,
        pos.brokerFee, pos.brokerFee,
        frei, kistRate
      );
    }

    const breakEvenSell = TaxEngine.calculateBreakEvenSellPrice(
      pos.buyPrice, pos.shares, pos.brokerFee, pos.brokerFee
    );

    let breakEvenRebuy = null;
    if (pos.shares > 0 && currentPrice > pos.buyPrice) {
      breakEvenRebuy = TaxEngine.calculateBreakEvenRebuy(
        pos.buyPrice, currentPrice, pos.shares,
        pos.brokerFee, pos.brokerFee,
        frei, kistRate
      );
    }

    let targetCalc = null;
    if (pos.shares > 0 && pos.desiredNetProfit > 0) {
      targetCalc = TaxEngine.calculateTargetSellPrice(
        pos.buyPrice, pos.shares, pos.desiredNetProfit,
        pos.brokerFee, pos.brokerFee,
        frei, kistRate
      );
    }

    let taxDragCurve = [];
    if (pos.shares > 0 && pos.buyPrice > 0) {
      taxDragCurve = TaxEngine.calculateTaxDragCurve(
        pos.buyPrice, pos.shares,
        pos.brokerFee, pos.brokerFee,
        frei, kistRate,
        0.85, 1.8, 80
      );
    }

    const historicalData = this.$store.app.market.historicalData;
    const volatility = historicalData.length > 0 ? calculateVolatility(historicalData) : null;

    let dcaResult = null;
    if (historicalData.length > 5 && pos.shares > 0 && pos.buyPrice > 0 && currentPrice > 0) {
      const sp = this.$store.app.sparplan;
      const startDate = sp.startYear + '-' + String(sp.startMonth).padStart(2, '0') + '-01';
      dcaResult = compareDcaVsTiming(historicalData, sp.monthlyAmount, startDate, currentPrice, pos.shares, pos.buyPrice);
    }

    const grossGain = pnl ? pnl.grossGain : 0;
    const totalTax = pnl ? pnl.totalTax : 0;
    const netGain = pnl ? pnl.netProfit : 0;
    const taxDragPercent = pnl && pnl.grossGain > 0 ? (pnl.totalTax / pnl.grossGain) * 100 : 0;

    const advisories = evaluateAdvisory({
      shares: pos.shares,
      buyPrice: pos.buyPrice,
      currentPrice,
      stopLoss: pos.stopLoss,
      targetPrice: pos.targetPrice,
      brokerFee: pos.brokerFee,
      grossGain,
      totalTax,
      netGain,
      taxDragPercent,
      breakEvenRebuy,
      freistellungRemaining: frei,
      volatility,
      dcaResult
    });

    this.$store.app.computed = {
      effectiveTaxRate,
      grossGain,
      totalTax,
      netGain,
      taxDragPercent,
      breakEvenSell,
      breakEvenRebuy,
      targetCalc,
      taxDragCurve,
      pnl,
      volatility,
      dcaResult,
      advisories
    };

    if (taxDragCurve.length > 0) {
      requestAnimationFrame(() => {
        renderTaxDragChart(
          taxDragCurve,
          pos.buyPrice,
          currentPrice,
          breakEvenSell,
          frei
        );
      });
    }
  },

  searchStocks(query) {
    const store = this.$store.app;
    if (!query || query.length < 2) {
      store.search.results = [];
      store.search.show = false;
      return;
    }

    const q = query.toLowerCase();
    const localResults = GERMAN_STOCKS.filter(s =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    ).slice(0, 8);

    store.search.results = localResults.map(s => ({ ...s, exchange: s.index }));
    store.search.show = localResults.length > 0;

    if (store.settings.apiKey && query.length >= 2) {
      store.search.loading = true;
      api.searchStocks(query).then(apiResults => {
        if (apiResults && apiResults.length > 0) {
          const existingSymbols = new Set(store.search.results.map(r => r.symbol));
          const newResults = apiResults.filter(r => !existingSymbols.has(r.symbol));
          store.search.results = [...store.search.results, ...newResults].slice(0, 10);
          store.search.show = true;
        }
      }).catch(e => {
        console.warn('API search error:', e);
      }).finally(() => {
        store.search.loading = false;
      });
    }
  },

  selectStock(stock) {
    // Bei Tickerwechsel: historische Daten löschen (andere Aktie)
    if (this.$store.app.position.ticker !== stock.symbol) {
      this.$store.app.market.historicalData = [];
    }
    this.$store.app.position.ticker = stock.symbol;
    this.$store.app.position.companyName = stock.name;
    this.$store.app.search.show = false;
    this.$store.app.search.query = stock.symbol + ' - ' + stock.name;
    this.fetchQuote(stock.symbol);
  },

  async fetchQuote(symbol) {
    if (!symbol) return;
    const store = this.$store.app;
    store.market.loading = true;
    store.market.error = null;

    try {
      const quote = await api.getQuote(symbol);
      if (quote && quote.price) {
        store.market.quote = quote;
        store.position.currentPrice = quote.price;
        store.position.companyName = quote.name || store.position.companyName;
        store.market.lastFetch = new Date().toISOString();
      }
    } catch (e) {
      store.market.error = e.message;
      console.warn('Quote fetch error:', e);
    } finally {
      store.market.loading = false;
    }
  },

  async fetchHistorical(symbol, customFromDate) {
    if (!symbol) return;
    const store = this.$store.app;
    store.market.loading = true;

    try {
      const to = new Date();
      let from;
      if (customFromDate) {
        from = new Date(customFromDate);
      } else {
        // Standard: 6 Monate, aber Sparplan-Start berücksichtigen
        from = new Date();
        from.setMonth(from.getMonth() - 6);
        const sp = store.sparplan;
        const sparplanStart = new Date(sp.startYear, sp.startMonth - 1, 1);
        if (sparplanStart < from) {
          from = sparplanStart;
        }
      }

      const data = await api.getHistoricalPrices(symbol, from, to);
      if (data && data.length > 0) {
        // Merge: neue Daten mit vorhandenen zusammenführen, deduplizieren, sortieren
        const existing = store.market.historicalData || [];
        const byDate = new Map();
        for (const d of existing) byDate.set(d.date, d);
        for (const d of data) byDate.set(d.date, d); // neue überschreiben alte
        store.market.historicalData = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
        this.recalculate();
        requestAnimationFrame(() => this.updatePriceLevelChart());
      }
    } catch (e) {
      console.warn('Historical fetch error:', e);
    } finally {
      store.market.loading = false;
    }
  },

  updatePriceLevelChart() {
    const store = this.$store.app;
    if (store.market.historicalData.length === 0) return;

    renderPriceLevelChart('priceLevelChart', store.market.historicalData, {
      buyPrice: store.position.buyPrice,
      currentPrice: store.position.currentPrice,
      stopLoss: store.position.stopLoss,
      targetPrice: store.position.targetPrice,
      breakEvenRebuy: store.computed.breakEvenRebuy?.breakEvenRebuyPrice || 0,
      showLevels: store.ui.showLevels
    });
  },

  resetPosition() {
    this.$store.app.position = { ...DEFAULT_POSITION };
    this.$store.app.market = { quote: null, historicalData: [], lastFetch: null, loading: false, error: null };
    this.$store.app.search.query = '';
  },

  formatEur: fmt.formatEur,
  formatPercent: fmt.formatPercent,
  formatEurSigned: fmt.formatEurSigned,
  formatPercentSigned: fmt.formatPercentSigned,
  profitColorClass: fmt.profitColorClass
}));

// ===== Alpine manuell starten =====
Alpine.start();
