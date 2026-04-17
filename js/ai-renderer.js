/**
 * AI-Response-Renderer
 * Nimmt das strukturierte JSON aus der KI und produziert HTML-Strings, die in
 * eine KI-Sektion injiziert werden. Konsistent im Look mit den statischen
 * Advisory-Cards.
 */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function severityClasses(sev) {
  const map = {
    red:   { bg: 'bg-red-500/5',   border: 'border-red-500',   text: 'text-red-400'   },
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500', text: 'text-amber-400' },
    green: { bg: 'bg-green-500/5', border: 'border-green-500', text: 'text-green-400' },
    blue:  { bg: 'bg-blue-500/5',  border: 'border-blue-500',  text: 'text-blue-400'  }
  };
  return map[sev] || map.blue;
}

function verdictBadge(verdict) {
  const m = {
    positive: { label: 'Positiv',    cls: 'bg-green-500/15 text-green-400' },
    neutral:  { label: 'Neutral',    cls: 'bg-slate-500/15 text-slate-300' },
    negative: { label: 'Kritisch',   cls: 'bg-red-500/15 text-red-400' },
    mixed:    { label: 'Gemischt',   cls: 'bg-amber-500/15 text-amber-400' }
  };
  const cfg = m[verdict] || m.neutral;
  return `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}">${cfg.label}</span>`;
}

function confidenceLabel(c) {
  const m = { high: 'hohe Sicherheit', medium: 'mittlere Sicherheit', low: 'geringe Sicherheit' };
  return m[c] || c || '';
}

/**
 * Rendert das komplette Ergebnis. Gibt ein HTML-Fragment zurück.
 */
export function renderAiResult(result) {
  if (!result) return '';

  const meta = result.meta || {};
  const summary = result.summary || {};
  const insights = Array.isArray(result.insights) ? result.insights : [];
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const disclaimers = Array.isArray(result.disclaimers) ? result.disclaimers : [];

  const cacheNote = result._fromCache
    ? '<span class="ml-2 text-xs text-slate-500">(aus Cache)</span>'
    : '';

  const summaryHtml = `
    <div class="bg-surface-900 border border-surface-700 rounded-xl p-4 mb-3">
      <div class="flex items-center gap-2 flex-wrap mb-2">
        ${verdictBadge(summary.verdict)}
        <span class="text-xs text-slate-500">${escapeHtml(confidenceLabel(meta.confidence))}</span>
        ${meta.usedGrounding ? '<span class="text-xs text-brand">🔍 mit Web-Recherche</span>' : ''}
        ${cacheNote}
      </div>
      <div class="text-base font-semibold text-slate-100 mb-2">${escapeHtml(summary.headline || '')}</div>
      ${summary.narrativeIntro ? `<p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(summary.narrativeIntro)}</p>` : ''}
    </div>`;

  const insightsHtml = insights.map(ins => {
    const s = severityClasses(ins.severity);
    return `
      <div class="${s.bg} border-l-4 ${s.border} rounded-lg p-4">
        <div class="flex items-start justify-between gap-3 mb-1">
          <div class="text-sm font-medium ${s.text}">${escapeHtml(ins.title || '')}</div>
          <span class="text-xs text-slate-500 shrink-0">${escapeHtml(ins.category || '')}</span>
        </div>
        <div class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">${escapeHtml(ins.body || '')}</div>
        ${ins.action ? `<div class="mt-2 text-sm text-slate-400 italic">↳ ${escapeHtml(ins.action)}</div>` : ''}
      </div>`;
  }).join('');

  const sourcesHtml = sources.length > 0 ? `
    <div class="mt-4 bg-surface-900 border border-surface-700 rounded-xl p-4">
      <div class="text-xs font-semibold text-slate-400 mb-2">Quellen</div>
      <ul class="space-y-1 text-xs">
        ${sources.map(src => `
          <li>
            <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer"
               class="text-brand hover:underline break-all">${escapeHtml(src.title || src.url)}</a>
            ${src.publisher ? `<span class="text-slate-500 ml-1">– ${escapeHtml(src.publisher)}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>` : '';

  const disclaimersHtml = disclaimers.length > 0 ? `
    <div class="mt-3 text-xs text-slate-500 space-y-1">
      ${disclaimers.map(d => `<p>· ${escapeHtml(d)}</p>`).join('')}
    </div>` : '';

  const genAt = meta.generatedAt ? `<div class="text-xs text-slate-600 mt-2">Analyse erstellt: ${new Date(meta.generatedAt).toLocaleString('de-DE')}</div>` : '';

  return `
    ${summaryHtml}
    <div class="space-y-2">${insightsHtml}</div>
    ${sourcesHtml}
    ${disclaimersHtml}
    ${genAt}
  `;
}

/** Rendert einen Fehler-State */
export function renderAiError(message) {
  return `
    <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
      <div class="text-sm font-medium text-red-400 mb-1">KI-Analyse fehlgeschlagen</div>
      <div class="text-sm text-slate-300">${escapeHtml(message)}</div>
      <div class="text-xs text-slate-500 mt-2">Die statischen Hinweise oben gelten weiterhin. Versuche es später erneut oder prüfe den API-Key in den Einstellungen.</div>
    </div>`;
}

/** Loading-State */
export function renderAiLoading() {
  return `
    <div class="bg-surface-900 border border-surface-700 rounded-xl p-6 text-center">
      <svg class="w-8 h-8 text-brand animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-20"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"/>
      </svg>
      <div class="text-sm text-slate-300">KI analysiert deine Situation…</div>
      <div class="text-xs text-slate-500 mt-1">ca. 5–20 Sekunden, bei Web-Recherche länger</div>
    </div>`;
}
