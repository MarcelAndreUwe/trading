/**
 * Altersvorsorge-Vergleichsrechner — Alpine.js Entry Point
 */
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3/dist/module.esm.js';
import * as TaxEngine from './tax-engine.js';
import * as RetirementEngine from './retirement-engine.js';
import * as fmt from './utils/formatters.js';
import * as storage from './utils/storage.js';
import { GLOSSARY } from './utils/glossary.js';
import { PROVIDERS, RUERUP_PROVIDERS, RIESTER_PROVIDERS } from './data/insurance-providers.js';
import { callGeminiAnalysis, hasApiKey, TEMPERATURE_BY_TEMPLATE, testConnection as aiTestConnection } from './ai-client.js';
import { buildPensionAnalysisPrompt } from './ai-prompts.js';
import { renderAiResult, renderAiError, renderAiLoading } from './ai-renderer.js';

window.aiTestConnection = aiTestConnection;

window.Alpine = Alpine;
window.fmt = fmt;
window.TaxEngine = TaxEngine;
window.GLOSSARY = GLOSSARY;
window.PROVIDERS = PROVIDERS;
window.RUERUP_PROVIDERS = RUERUP_PROVIDERS;
window.RIESTER_PROVIDERS = RIESTER_PROVIDERS;

const DEFAULT_INPUTS = {
  currentAge: 30,
  retirementAge: 67,
  monthlyAmount: 150,
  expectedReturn: 7.0,
  etfTer: 0.20,
  basiszins: 2.53,
  avdCostRate: 0.75,
  kirchensteuerRate: 0,
  bundeslandId: 'keine',
  personalTaxRateCurrent: 35,
  personalTaxRateRetirement: 25,
  sparerpauschbetragUsed: 0,
  numberOfChildren: 0,
  isCareerStarter: false,
  initialBalance: 0,
  selectedProviderId: 'alte-leipziger',
  // Rürup + Riester
  grossIncome: 0,
  employmentType: 'angestellt', // 'angestellt' | 'selbststaendig' | 'beamte'
  isMarried: false,
  enableRuerup: false,
  enableRiester: false,
  ruerupProviderId: 'alte-leipziger-ruerup',
  riesterProviderId: 'uniprofirente'
};

Alpine.store('av', {
  inputs: storage.load('av_inputs', { ...DEFAULT_INPUTS }),
  results: null,
  ui: {
    activeTab: 'vermoegen',
    showGlossary: false,
    showSettings: false
  },
  ai: {
    loading: false,
    result: null,
    error: null
  },
  providers: PROVIDERS,
  tabs: [
    { id: 'vermoegen', label: 'Vermögensentwicklung' },
    { id: 'kosten', label: 'Kostenvergleich' },
    { id: 'steuern', label: 'Steuervergleich' }
  ]
});

Alpine.data('altersvorsorgeRechner', () => ({
  init() {
    this.$watch('$store.av.inputs', (val) => {
      storage.save('av_inputs', val);
      // Kirchensteuer-Rate aktualisieren
      const bl = TaxEngine.BUNDESLAENDER.find(b => b.id === val.bundeslandId);
      if (bl) this.$store.av.inputs.kirchensteuerRate = bl.rate;
    });
  },

  recalculate() {
    const inp = this.$store.av.inputs;
    const provider = PROVIDERS.find(p => p.id === inp.selectedProviderId) || PROVIDERS[0];
    const ruerupProvider = RUERUP_PROVIDERS.find(p => p.id === inp.ruerupProviderId) || RUERUP_PROVIDERS[0];
    const riesterProvider = RIESTER_PROVIDERS.find(p => p.id === inp.riesterProviderId) || RIESTER_PROVIDERS[0];

    const results = RetirementEngine.compareProducts({
      currentAge: inp.currentAge,
      retirementAge: inp.retirementAge,
      monthlyAmount: inp.monthlyAmount,
      returnRate: inp.expectedReturn / 100,
      etfTer: inp.etfTer / 100,
      basiszins: inp.basiszins / 100,
      wrapperCostRate: provider.totalCostRate,
      etfTerIncluded: provider.etfTerIncluded,
      avdCostRate: inp.avdCostRate / 100,
      kirchensteuerRate: inp.kirchensteuerRate,
      sparerpauschbetragUsed: inp.sparerpauschbetragUsed,
      personalTaxRateCurrent: inp.personalTaxRateCurrent / 100,
      personalTaxRateRetirement: inp.personalTaxRateRetirement / 100,
      initialBalance: inp.initialBalance || 0,
      numberOfChildren: inp.numberOfChildren,
      isCareerStarter: inp.isCareerStarter,
      // Rürup + Riester
      grossIncome: inp.grossIncome || 0,
      employmentType: inp.employmentType || 'angestellt',
      isMarried: inp.isMarried || false,
      enableRuerup: !!inp.enableRuerup,
      enableRiester: !!inp.enableRiester,
      ruerupCostRate: ruerupProvider.totalCostRate,
      ruerupPensionFactor: ruerupProvider.guaranteedPensionFactor,
      riesterCostRate: riesterProvider.totalCostRate
    });

    this.$store.av.results = results;

    // Charts rendern
    this.$nextTick(() => {
      this.renderGrowthChart(results);
      this.renderCostChart(results);
      this.renderTaxChart(results);
    });
  },

  renderGrowthChart(results) {
    const el = document.getElementById('growthChart');
    if (!el || !results) return;

    const allProducts = [results.etf, results.rv, results.avd, results.ruerup, results.riester].filter(Boolean);
    const series = allProducts.map(p => ({
      name: p.product,
      data: (p.snapshots || []).map(s => ({ x: s.age, y: Math.round(s.portfolioValue) }))
    }));

    const options = {
      series,
      chart: { type: 'area', height: 380, background: 'transparent', foreColor: '#94A3B8', toolbar: { show: true, tools: { download: false } } },
      colors: allProducts.map(p => p.color),
      stroke: { width: 2.5, curve: 'smooth' },
      fill: { type: 'gradient', gradient: { shadeIntensity: 0.2, opacityFrom: 0.4, opacityTo: 0.05 } },
      grid: { borderColor: '#334155', strokeDashArray: 4 },
      xaxis: { title: { text: 'Alter', style: { color: '#64748B' } }, labels: { style: { colors: '#94A3B8' } } },
      yaxis: { title: { text: 'Vermögen (EUR)', style: { color: '#64748B' } }, labels: { formatter: v => v >= 1000 ? (v/1000).toFixed(0) + 'k' : v.toFixed(0), style: { colors: '#94A3B8' } } },
      tooltip: { theme: 'dark', y: { formatter: v => fmt.formatEur(v) } },
      legend: { position: 'top', labels: { colors: '#94A3B8' } },
      annotations: { xaxis: [{ x: this.$store.av.inputs.retirementAge, borderColor: '#F59E0B', strokeDashArray: 4, label: { text: 'Renteneintritt', style: { color: '#F59E0B', background: '#1E293B' } } }] }
    };

    if (this._growthChart) { this._growthChart.updateOptions(options, true, true); }
    else { this._growthChart = new ApexCharts(el, options); this._growthChart.render(); }
  },

  renderCostChart(results) {
    const el = document.getElementById('costChart');
    if (!el || !results) return;

    const products = [results.etf, results.rv, results.avd, results.ruerup, results.riester].filter(Boolean);
    const options = {
      series: [{ name: 'Gesamtkosten', data: products.map(p => Math.round(p.totalCosts)) }],
      chart: { type: 'bar', height: 300, background: 'transparent', foreColor: '#94A3B8', toolbar: { show: false } },
      colors: products.map(p => p.color),
      plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '50%' } },
      grid: { borderColor: '#334155', strokeDashArray: 4 },
      xaxis: { categories: products.map(p => p.productShort), labels: { style: { colors: '#94A3B8' } } },
      yaxis: { labels: { formatter: v => fmt.formatEur(v), style: { colors: '#94A3B8' } } },
      tooltip: { theme: 'dark', y: { formatter: v => fmt.formatEur(v) } },
      legend: { show: false }
    };

    if (this._costChart) { this._costChart.updateOptions(options, true, true); }
    else { this._costChart = new ApexCharts(el, options); this._costChart.render(); }
  },

  renderTaxChart(results) {
    const el = document.getElementById('taxChart');
    if (!el || !results) return;

    const products = [results.etf, results.rv, results.avd, results.ruerup, results.riester].filter(Boolean);
    const options = {
      series: [
        { name: 'Steuer Ansparphase', data: products.map(p => Math.round(p.totalVorabpauschaleTax || 0)) },
        { name: 'Steuer Auszahlung', data: products.map(p => Math.round(p.payoutTax)) }
      ],
      chart: { type: 'bar', height: 300, stacked: true, background: 'transparent', foreColor: '#94A3B8', toolbar: { show: false } },
      colors: ['#F59E0B', '#A855F7'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
      grid: { borderColor: '#334155', strokeDashArray: 4 },
      xaxis: { categories: products.map(p => p.productShort), labels: { style: { colors: '#94A3B8' } } },
      yaxis: { labels: { formatter: v => fmt.formatEur(v), style: { colors: '#94A3B8' } } },
      tooltip: { theme: 'dark', y: { formatter: v => fmt.formatEur(v) } },
      legend: { position: 'top', labels: { colors: '#94A3B8' } }
    };

    if (this._taxChart) { this._taxChart.updateOptions(options, true, true); }
    else { this._taxChart = new ApexCharts(el, options); this._taxChart.render(); }
  },

  hasApiKey() { return hasApiKey(); },

  async runAiAnalysis() {
    const store = this.$store.av;
    if (!store.results) { this.recalculate(); }
    if (!hasApiKey()) {
      store.ai.error = 'Kein API-Key konfiguriert. Trage einen Gemini API-Key in den Einstellungen ein.';
      store.ai.result = null;
      return;
    }
    store.ai.loading = true;
    store.ai.error = null;
    store.ai.result = null;
    try {
      const prompt = buildPensionAnalysisPrompt(store, PROVIDERS);
      const result = await callGeminiAnalysis({
        userPrompt: prompt,
        useGrounding: false,
        temperature: TEMPERATURE_BY_TEMPLATE.E,
        analysisType: 'pension_individual'
      });
      store.ai.result = result;
    } catch (e) {
      store.ai.error = e.message || String(e);
    } finally {
      store.ai.loading = false;
    }
  },

  renderAiHtml() {
    const store = this.$store.av;
    if (store.ai.loading) return renderAiLoading();
    if (store.ai.error) return renderAiError(store.ai.error);
    if (store.ai.result) return renderAiResult(store.ai.result);
    return '';
  },

  formatEur: fmt.formatEur,
  formatPercent: fmt.formatPercent,
  formatEurSigned: fmt.formatEurSigned
}));

Alpine.start();
