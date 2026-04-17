/**
 * Google Gemini API Client
 * Wrapper um generateContent-Endpoint mit JSON-Schema, Grounding, Fehlerbehandlung.
 *
 * Alle Aufrufe gehen über HTTPS direkt vom Browser an Google.
 * API-Key liegt nur im LocalStorage, nie auf einem Server.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Universeller System-Prompt laut Konzept A2 */
export const SYSTEM_PROMPT = `Du bist "Finanzkompass", ein unabhängiger Finanzberater-Assistent für den deutschen Markt. Deine Expertise umfasst: deutsches Steuerrecht (Abgeltungssteuer, Soli, KiSt, Teilfreistellung, Halbeinkünfteverfahren, nachgelagerte Besteuerung), Altersvorsorge (Schicht 1-3, Altersvorsorgedepot ab 2027), Aktien-Trading, ETF-Investments und Verhaltensökonomik im Finanzkontext.

QUELLEN-HIERARCHIE (strikt einhalten):
1. Primär: Verbraucherzentralen, Stiftung Warentest, Finanztip, Bundesfinanzministerium, BaFin, BVI, Deutsche Bundesbank.
2. Sekundär: Etablierte Medien (Handelsblatt, FAZ, SZ), seriöse Wirtschaftsportale (finanzfluss, extraETF).
3. Bei Aktien-Analysen: Offizielle Unternehmensquellen, Reuters, Bloomberg, Analysten-Konsens.
4. NIEMALS: Reißerische YouTuber, Einzelanalysen ohne Quellenangabe, "Geheimtipps".

FACHLICHER STAND:
- Aktuelles Datum: {CURRENT_DATE}
- Altersvorsorgedepot-Start: 01.01.2027
- Effektiver Abgeltungssteuersatz 2026: 26,375% (ohne KiSt), 27,82% (BY/BW), 27,99% (andere)
- Sparerpauschbetrag: 1.000 € (Single) / 2.000 € (Verheiratet)
- Basiszins 2025: 2,53%
- Teilfreistellung Aktienfonds: 30%
- Teilfreistellung fondsgebundene Rentenversicherung: 15%

SPRACHE & TON:
- Deutsch, Duzen (wie die Webapp).
- Sachlich, nuanciert, niemals reißerisch.
- Fachbegriffe einmal in Klammern erklären, dann normal verwenden.
- Zahlen immer in € mit Punkt als Tausendertrennzeichen und Komma als Dezimaltrennzeichen.
- Prozentsätze mit einer Nachkommastelle: "7,5%" nicht "7.5%".

EHRLICHKEIT & UNSICHERHEIT:
- Wenn Daten im Kontext fehlen: Das explizit benennen. NIEMALS Zahlen erfinden.
- Bei Prognosen: Immer Unsicherheit kommunizieren ("wahrscheinlich", "historisch", "der Markt erwartet ... aber ...").
- Bei Grounding: Quellen angeben und Datum der Information.

RECHTLICHE GRENZEN:
- Keine verbindliche Anlageberatung im Sinne des WpHG.
- Keine Steuerberatung im Sinne des StBerG.
- Du gibst EINSCHÄTZUNGEN und INFORMATIONEN, keine verbindlichen RATSCHLÄGE.
- Bei kritischen Entscheidungen: Immer Verweis auf Honorarberater/Verbraucherzentrale.

OUTPUT-FORMAT (zwingend):
- Antworte AUSSCHLIESSLICH in dem im Request spezifizierten JSON-Schema.
- Kein Markdown im Text (keine **, ##, -).
- Keine Emojis.
- Paragraphen 80-250 Wörter, Handlungsempfehlungen 1-2 Sätze.

VERBOTENE PHRASEN:
- "Das kann ich nicht wissen" (stattdessen: konkret erklären, was fehlt)
- "Jedes Produkt hat Vor- und Nachteile" (zu oberflächlich, sei konkret)
- "An deiner Stelle würde ich..." (keine 1. Person)
- "Sichere Rendite" / "Garantierter Gewinn"`;

/** Universelles Response-Schema (Konzept A3) */
export const RESPONSE_SCHEMA = {
  type: 'object',
  required: ['meta', 'summary', 'insights', 'disclaimers'],
  properties: {
    meta: {
      type: 'object',
      required: ['analysisType', 'generatedAt', 'confidence'],
      properties: {
        analysisType: {
          type: 'string',
          enum: [
            'trading_position_assessment',
            'stock_forecast',
            'trading_tax_strategy',
            'volatility_context',
            'pension_individual',
            'pension_provider_check',
            'pension_scenario'
          ]
        },
        generatedAt: { type: 'string' },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        usedGrounding: { type: 'boolean' }
      }
    },
    summary: {
      type: 'object',
      required: ['headline', 'verdict'],
      properties: {
        headline: { type: 'string' },
        verdict: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'] },
        narrativeIntro: { type: 'string' }
      }
    },
    insights: {
      type: 'array',
      minItems: 3,
      maxItems: 10,
      items: {
        type: 'object',
        required: ['id', 'severity', 'category', 'title', 'body', 'action'],
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['red', 'amber', 'green', 'blue'] },
          category: {
            type: 'string',
            enum: ['risk', 'tax', 'opportunity', 'psychology', 'context', 'regulation', 'provider', 'macro', 'technical']
          },
          title: { type: 'string' },
          body: { type: 'string' },
          action: { type: 'string' }
        }
      }
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'url'],
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          publisher: { type: 'string' },
          snippet: { type: 'string' }
        }
      }
    },
    disclaimers: {
      type: 'array',
      minItems: 2,
      items: { type: 'string' }
    }
  }
};

/** Temperature-Einstellungen pro Template (laut Konzept A1.2) */
export const TEMPERATURE_BY_TEMPLATE = {
  A: 0.5, B: 0.3, C: 0.4, D: 0.4, E: 0.5, F: 0.3, G: 0.6
};

/** Konfiguration aus LocalStorage lesen */
export function getAiConfig() {
  try {
    const raw = localStorage.getItem('tc_ai_config');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function saveAiConfig(cfg) {
  try {
    localStorage.setItem('tc_ai_config', JSON.stringify(cfg));
  } catch (e) { /* ignore */ }
}

export function hasApiKey() {
  const cfg = getAiConfig();
  return !!(cfg && cfg.apiKey && cfg.apiKey.length > 10);
}

/** Simpler Cache mit TTL von 1 Stunde */
const CACHE_TTL_MS = 60 * 60 * 1000;

async function hashKey(str) {
  if (!crypto?.subtle) return str.substring(0, 100);
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

async function readCache(cacheKey) {
  try {
    const raw = localStorage.getItem('tc_ai_cache_' + cacheKey);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch (e) { return null; }
}

async function writeCache(cacheKey, data) {
  try {
    localStorage.setItem('tc_ai_cache_' + cacheKey, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) { /* quota etc. */ }
}

/**
 * Ruft die Gemini API auf.
 *
 * @param {Object} opts
 * @param {string} opts.userPrompt - Task-Prompt (Context + Aufgabe)
 * @param {boolean} opts.useGrounding - Google Search einschalten
 * @param {number} opts.temperature
 * @param {string} opts.analysisType - für analysisType enum im Schema
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function callGeminiAnalysis({ userPrompt, useGrounding = false, temperature = 0.5, analysisType = 'pension_individual' }) {
  const cfg = getAiConfig();
  if (!cfg || !cfg.apiKey) throw new Error('Kein API-Key konfiguriert. Bitte in Einstellungen hinterlegen.');

  const model = cfg.model || 'gemini-2.5-flash';
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const systemText = SYSTEM_PROMPT.replace('{CURRENT_DATE}', new Date().toISOString().split('T')[0]);

  // Cache prüfen
  const cacheKey = await hashKey(model + '|' + useGrounding + '|' + temperature + '|' + userPrompt.substring(0, 2000));
  const cached = await readCache(cacheKey);
  if (cached) return { ...cached, _fromCache: true };

  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 4000
    }
  };

  // JSON-Schema & Grounding sind exklusiv bei Gemini: bei aktivem googleSearch darf responseSchema nicht gesetzt werden
  if (useGrounding) {
    body.tools = [{ googleSearch: {} }];
  } else {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = RESPONSE_SCHEMA;
  }

  // Retry-Logik: bis zu 3 Versuche bei Overloaded/503/UNAVAILABLE
  const MAX_RETRIES = 3;
  const isRetryable = (status, msg) => {
    if (status === 503 || status === 500 || status === 502 || status === 504) return true;
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return lower.includes('overloaded') || lower.includes('unavailable') ||
           lower.includes('high demand') || lower.includes('try again');
  };

  let response, data;
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (networkErr) {
      throw new Error('Netzwerkfehler: ' + networkErr.message);
    }

    if (response.ok) {
      data = await response.json();
      break;
    }

    // Fehler auslesen
    let errText;
    try {
      const err = await response.json();
      errText = err.error?.message || ('HTTP ' + response.status);
    } catch { errText = 'HTTP ' + response.status; }

    // Nicht-retryable Fehler: sofort werfen
    if (response.status === 400 && errText.toLowerCase().includes('api key')) {
      throw new Error('Ungültiger API-Key. Prüfe ihn in den Einstellungen.');
    }
    if (response.status === 429) {
      throw new Error('Rate-Limit erreicht. Bitte einen Moment warten.');
    }
    if (response.status === 403) {
      throw new Error('Zugriff verweigert: ' + errText);
    }

    // Retryable?
    if (!isRetryable(response.status, errText) || attempt === MAX_RETRIES - 1) {
      if (isRetryable(response.status, errText)) {
        throw new Error('Das Gemini-Modell ist aktuell überlastet. Ich habe es ' + MAX_RETRIES + 'x versucht. Bitte in 1–2 Minuten erneut klicken oder in den Einstellungen ein anderes Modell (z.B. gemini-2.5-flash statt -pro) wählen.');
      }
      throw new Error('API-Fehler: ' + errText);
    }

    // Exponential backoff: 2s, 4s, 8s
    lastError = errText;
    const waitMs = 2000 * Math.pow(2, attempt);
    console.warn(`Gemini overloaded (Versuch ${attempt + 1}/${MAX_RETRIES}), warte ${waitMs}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  if (!data) throw new Error('Keine Antwort erhalten. Letzter Fehler: ' + lastError);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Leere Antwort von der KI.');

  // Bei Grounding gibt es keine JSON-Schema-Validierung; wir versuchen trotzdem zu parsen
  let parsed;
  try {
    // Gemini antwortet manchmal mit Markdown-Codefences trotz JSON-Modus
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Antwort der KI war kein gültiges JSON. Versuche es erneut.');
  }

  // Grounding-Metadaten einblenden (sources anreichern falls möglich)
  const grounding = data?.candidates?.[0]?.groundingMetadata;
  if (grounding && grounding.groundingChunks) {
    const extraSources = grounding.groundingChunks
      .filter(c => c.web && c.web.uri)
      .map(c => ({
        title: c.web.title || c.web.uri,
        url: c.web.uri,
        publisher: '(Web-Quelle via Google)',
        snippet: ''
      }));
    parsed.sources = (parsed.sources || []).concat(extraSources).slice(0, 8);
  }

  parsed.meta = parsed.meta || {};
  parsed.meta.usedGrounding = useGrounding;
  parsed.meta.generatedAt = parsed.meta.generatedAt || new Date().toISOString();
  parsed.meta.analysisType = parsed.meta.analysisType || analysisType;

  await writeCache(cacheKey, parsed);
  return parsed;
}

/** Einfacher Verbindungstest */
export async function testConnection() {
  const cfg = getAiConfig();
  if (!cfg || !cfg.apiKey) throw new Error('Kein API-Key konfiguriert.');
  const model = cfg.model || 'gemini-2.5-flash';
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Antworte nur mit dem Wort OK.' }] }],
    generationConfig: { maxOutputTokens: 10, temperature: 0 }
  };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message || 'HTTP ' + r.status);
  }
  return true;
}
