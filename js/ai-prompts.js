/**
 * Prompt-Bibliothek für alle KI-Analysen.
 * Jede Funktion baut den User-Prompt (Context + Task + Guards) aus dem aktuellen
 * App-Zustand und gibt den fertigen String zurück.
 */

function fmtEur(v) {
  if (v == null || isNaN(v)) return 'n/a';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
}
function fmtPct(v) {
  if (v == null || isNaN(v)) return 'n/a';
  return v.toFixed(2).replace('.', ',') + ' %';
}

const SELF_CHECK = `

ABSCHLUSS-PRÜFUNG:
- Alle Zahlen in deiner Antwort stammen aus dem Kontext oder sind durch Quellen belegt.
- Keine Zahlen erfunden.
- Alle Insights haben konkrete Handlungsempfehlungen.
- disclaimers[] enthält mindestens: "Keine Anlageberatung/Steuerberatung" UND "Stand: {heute}".
- Bei Prognosen ist Unsicherheit sprachlich markiert.
- Output ist valides JSON (kein Markdown, keine Emojis).`;

// ===== Prompt A: Trading Positions-Gesamteinschätzung =====
export function buildTradingAssessmentPrompt(store) {
  const pos = store.position || {};
  const c = store.computed || {};
  const m = store.market || {};
  const vola = c.volatility || {};
  const dca = c.dcaResult || {};

  const currentPrice = pos.currentPrice || 0;
  const holdingPeriod = '?'; // nicht explizit getracked

  const ctx = `### KONTEXT

[POSITIONSDATEN]
- Aktie: ${pos.companyName || pos.ticker || 'unbekannt'} (Ticker: ${pos.ticker || 'n/a'})
- Gehaltene Anzahl: ${pos.shares || 0}
- Durchschnittlicher Kaufkurs: ${fmtEur(pos.buyPrice)}
- Aktueller Kurs: ${fmtEur(currentPrice)}
- Gebühr pro Trade: ${fmtEur(pos.brokerFee)}

[KURSVERLAUF & VOLATILITÄT (letzte 6 Monate, falls verfügbar)]
- Tägliche Volatilität: ${vola.dailyVol != null ? fmtPct(vola.dailyVol * 100) : 'n/a'}
- Wöchentliche Volatilität: ${vola.weeklyVol != null ? fmtPct(vola.weeklyVol * 100) : 'n/a'}
- Annualisierte Volatilität: ${vola.annualVol != null ? fmtPct(vola.annualVol * 100) : 'n/a'}
- ATR (14): ${vola.atrPercent != null ? fmtPct(vola.atrPercent) : 'n/a'}
- Datenpunkte: ${vola.dataPoints || 0}

[STEUERLICHE RAHMENDATEN]
- Kirchensteuer-Rate: ${((store.settings?.kirchensteuerRate || 0) * 100).toFixed(1)} %
- Sparerpauschbetrag verbraucht: ${fmtEur(store.settings?.freistellungUsed)} von 1.000 €
- Effektiver Abgeltungssteuersatz: ${fmtPct((c.effectiveTaxRate || 0.26375) * 100)}

[USER-ZIELWERTE]
- Stop-Loss: ${fmtEur(pos.stopLoss)}
- Zielkurs: ${fmtEur(pos.targetPrice)}
- Gewünschter Netto-Gewinn: ${fmtEur(pos.desiredNetProfit)}

[BERECHNETE ERGEBNISSE bei Verkauf zum aktuellen Kurs]
- Brutto-Gewinn: ${fmtEur(c.grossGain)}
- Steuerbelastung: ${fmtEur(c.totalTax)} (Tax Drag: ${fmtPct(c.taxDragPercent)})
- Netto-Gewinn: ${fmtEur(c.netGain)}
- Break-Even Rebuy: ${c.breakEvenRebuy ? fmtEur(c.breakEvenRebuy.breakEvenRebuyPrice) : 'n/a'}
- Benötigter Kursrückgang für Rebuy: ${c.breakEvenRebuy ? fmtPct(c.breakEvenRebuy.requiredDropPercent) : 'n/a'}

[SPARPLAN-VERGLEICH]
${dca && dca.winner ? `- Gewinner: ${dca.winner === 'sparplan' ? 'Sparplan' : 'Dein Timing'}
- Differenz: ${fmtEur(dca.opportunityCost)}` : '- Keine Daten verfügbar'}

[KONTEXT]
- Aktuelles Datum: ${new Date().toISOString().split('T')[0]}`;

  const task = `

### AUFGABE

Erstelle eine umfassende Einschätzung dieser Trading-Position für einen mäßig erfahrenen Trader. Gib 5-7 Insights zurück, gewichtet nach Wichtigkeit (rot/amber zuerst, grün/blau danach).

VERPFLICHTENDE THEMEN (jedes MUSS ein Insight werden, wenn Daten vorhanden):

1. RISIKO-CHANCEN-BEWERTUNG: Bewerte das Risk/Reward-Verhältnis unter Einbeziehung der Volatilität. Ist der Stop-Loss sinnvoll gesetzt oder riskiert der User einen Auslöser durch normales Marktrauschen (ATR-Vergleich)?

2. STEUER-SITUATION: Analysiere Tax Drag und Freibetrag-Situation. Wenn der User noch Freibetrag hat und das Jahr fortgeschritten ist: Hinweis auf Jahresende-Timing.

3. BREAK-EVEN-REBUY REALISMUS: Ist "verkaufen und billiger zurückkaufen" hier eine sinnvolle Strategie? Vergleiche benötigten Rückgang mit Wochenvolatilität.

4. PSYCHOLOGISCHE FALLEN: Disposition-Effekt (Gewinner zu früh verkaufen), Verlustaversion, Verankerungs-Effekt. Nenne konkrete Prozentwerte.

5. SPARPLAN-ALTERNATIVE: Was sagt der DCA-Vergleich aus?

6. STOP-LOSS-STRATEGIE: Bewerte den gesetzten SL gegen ATR. Trailing-Stop sinnvoll?

7. OPTIONAL: KLARE HANDLUNGSOPTIONEN (Halten, Teilverkauf, SL-Anpassung).

WICHTIGE REGELN:
- Nenne konkrete Zahlen aus dem Kontext in JEDEM Insight.
- Der User soll nach dem Lesen EINE klare nächste Handlung haben.
- Wenn Daten fehlen: explizit benennen, nicht spekulieren.
- Keine Kursprognose (dafür gibt es ein eigenes Feature).
- analysisType: "trading_position_assessment".
- Mindestens 2 disclaimers (keine Anlageberatung, Stand-Hinweis).`;

  return ctx + task + SELF_CHECK;
}

// ===== Prompt E: Individuelle Altersvorsorge-Analyse =====
export function buildPensionAnalysisPrompt(store, providers) {
  const inp = store.inputs || {};
  const r = store.results || {};
  const prov = (providers || []).find(p => p.id === inp.selectedProviderId) || {};
  const years = (inp.retirementAge || 0) - (inp.currentAge || 0);

  const ranking = [];
  if (r.etf) ranking.push({ name: 'ETF-Sparplan', net: r.etf.netPayout });
  if (r.rv) ranking.push({ name: 'Rentenversicherung', net: r.rv.netPayout });
  if (r.avd) ranking.push({ name: 'Altersvorsorgedepot', net: r.avd.netPayoutInclDeductions || r.avd.netPayout });
  if (r.kombi) ranking.push({ name: 'Kombi-Strategie', net: r.kombi.netPayout });
  if (r.ruerup) ranking.push({ name: 'Rürup-Rente', net: r.ruerup.netPayout });
  if (r.riester) ranking.push({ name: 'Riester-Rente', net: r.riester.netPayout });
  ranking.sort((a, b) => b.net - a.net);

  const taxRateDiff = (inp.personalTaxRateCurrent || 0) - (inp.personalTaxRateRetirement || 0);

  const ctx = `### KONTEXT

[PERSÖNLICHE SITUATION]
- Aktuelles Alter: ${inp.currentAge || 'n/a'}
- Geplantes Rentenalter: ${inp.retirementAge || 'n/a'}
- Anspardauer: ${years} Jahre
- Anzahl Kinder: ${inp.numberOfChildren || 0}
- Berufseinsteiger (<25): ${inp.isCareerStarter ? 'Ja' : 'Nein'}

[SPARVERHALTEN]
- Monatliche Sparrate: ${fmtEur(inp.monthlyAmount)}
- Startkapital: ${fmtEur(inp.initialBalance || 0)}

[STEUERSITUATION]
- Steuersatz heute: ${fmtPct(inp.personalTaxRateCurrent)}
- Steuersatz im Rentenalter: ${fmtPct(inp.personalTaxRateRetirement)}
- Steuersatz-Differenz: ${taxRateDiff.toFixed(1)} Prozentpunkte
- Kirchensteuer-Rate: ${((inp.kirchensteuerRate || 0) * 100).toFixed(1)} %
- Bundesland: ${inp.bundeslandId || 'n/a'}

[ANBIETER-RV]
- Name: ${prov.name || 'n/a'}
- Kostenquote p.a.: ${prov.totalCostRate ? fmtPct(prov.totalCostRate * 100) : 'n/a'}
- Typ: ${prov.type || 'n/a'}

[BERECHNETE ERGEBNISSE (netto nach Kosten + Steuern)]
${r.etf ? `
ETF-Sparplan:
  - Portfolio: ${fmtEur(r.etf.portfolioAtRetirement)}
  - Gesamtkosten: ${fmtEur(r.etf.totalCosts)}
  - Vorabpauschale-Steuern kumuliert: ${fmtEur(r.etf.totalVorabpauschaleTax)}
  - Auszahlungssteuer: ${fmtEur(r.etf.payoutTax)}
  - NETTO: ${fmtEur(r.etf.netPayout)}
  - Effektive Rendite p.a.: ${fmtPct(r.etf.effectiveReturnRate)}` : ''}
${r.rv ? `
Rentenversicherung:
  - Portfolio: ${fmtEur(r.rv.portfolioAtRetirement)}
  - Gesamtkosten: ${fmtEur(r.rv.totalCosts)}
  - Halbeinkünfte-Regel erfüllt (12 Jahre + Alter 62): ${r.rv.meetsHalbeinkuenfte ? 'Ja' : 'Nein'}
  - Auszahlungssteuer: ${fmtEur(r.rv.payoutTax)}
  - NETTO: ${fmtEur(r.rv.netPayout)}
  - Effektive Rendite p.a.: ${fmtPct(r.rv.effectiveReturnRate)}` : ''}
${r.avd ? `
Altersvorsorgedepot:
  - Portfolio: ${fmtEur(r.avd.portfolioAtRetirement)}
  - Eigenbeiträge: ${fmtEur(r.avd.totalContributed)}
  - Zulagen kumuliert: ${fmtEur(r.avd.totalSubsidies)}
  - Steuerersparnis durch Sonderausgabenabzug: ${fmtEur(r.avd.totalTaxDeduction)}
  - Gesamtkosten: ${fmtEur(r.avd.totalCosts)}
  - Auszahlungssteuer (nachgelagert): ${fmtEur(r.avd.payoutTax)}
  - NETTO: ${fmtEur(r.avd.netPayout)}
  - NETTO inkl. Steuerersparnis: ${fmtEur(r.avd.netPayoutInclDeductions)}` : ''}
${r.kombi ? `
Kombi-Strategie:
  - Aufteilung: ${r.kombi.splitInfo}
  - NETTO: ${fmtEur(r.kombi.netPayout)}` : ''}
${r.ruerup ? `
Rürup-Rente (Schicht 1, Basisrente):
  - Portfolio: ${fmtEur(r.ruerup.portfolioAtRetirement)}
  - Eigenbeiträge: ${fmtEur(r.ruerup.totalContributed)}
  - Steuerersparnis Ansparphase (100% absetzbar): ${fmtEur(r.ruerup.totalTaxDeduction)}
  - Monatliche Brutto-Rente: ${fmtEur(r.ruerup.monthlyPensionGross)}
  - Jahres-Rente netto: ${fmtEur(r.ruerup.yearlyPensionNet)}
  - Besteuerungsanteil bei Rentenbeginn ${r.ruerup.rentenbeginnJahr}: ${(r.ruerup.besteuerungsanteil * 100).toFixed(1)}%
  - Gesamt-Netto (20 Jahre Rente + Steuerersparnis): ${fmtEur(r.ruerup.netPayout)}
  - Erwerbsstatus User: ${inp.employmentType || 'n/a'}
  - Brutto-Jahreseinkommen: ${fmtEur(inp.grossIncome)}` : ''}
${r.riester ? `
Riester-Rente (Schicht 2):
  - Portfolio: ${fmtEur(r.riester.portfolioAtRetirement)}
  - Eigenbeiträge: ${fmtEur(r.riester.totalContributed)}
  - Zulagen kumuliert (Grund + Kinder + ggf. Bonus): ${fmtEur(r.riester.totalSubsidies)}
  - Zusätzlicher Steuervorteil (Günstigerprüfung): ${fmtEur(r.riester.totalTaxDeduction)}
  - Auszahlungssteuer (100% nachgelagert): ${fmtEur(r.riester.payoutTax)}
  - NETTO: ${fmtEur(r.riester.netPayout)}
  - WICHTIGER HINWEIS: Verbraucherzentrale/Finanztip 2026: Vom Neuabschluss wird abgeraten. Riester wird ab 01.01.2027 durch Altersvorsorgedepot ersetzt.` : ''}

[RANGFOLGE NACH NETTO-AUSZAHLUNG]
${ranking.map((p, i) => `${i + 1}. ${p.name}: ${fmtEur(p.net)}`).join('\n')}

[KONTEXT]
- Aktuelles Datum: ${new Date().toISOString().split('T')[0]}
- Altersvorsorgedepot-Start: 01.01.2027`;

  const task = `

### AUFGABE

Erstelle eine umfassende, PERSÖNLICHE Altersvorsorge-Analyse. NICHT nur Zahlen wiederholen — interpretiere, ordne ein, warne, empfehle. Gib 6-8 Insights zurück.

PFLICHT-THEMEN:

1. HAUPTEMPFEHLUNG MIT FACHLICHER BEGRÜNDUNG
   Passt das rechnerisch beste Produkt zur Lebenssituation? Beziehe ein: Alter, Anspardauer, Flexibilitätsbedarf, Verbraucherzentrale-Position.

2. STEUER-HEBEL-ANALYSE
   Die Steuersatz-Differenz (heute ${fmtPct(inp.personalTaxRateCurrent)} vs. Rente ${fmtPct(inp.personalTaxRateRetirement)}) ist der KRITISCHE Faktor für das AVD.
   - Bei Differenz > 10 pp: AVD extrem attraktiv, mit Zahlen erklären.
   - Bei Differenz < 5 pp: nachgelagerte Besteuerung kann Zulagen-Vorteil auffressen.

3. KOSTEN-KRITIK NACH VERBRAUCHERZENTRALE
   ${prov.name ? `Die Kosten von ${prov.name} betragen ${fmtPct((prov.totalCostRate || 0) * 100)} p.a. über ${years} Jahre = ${fmtEur(r.rv?.totalCosts)} absolut. Verbraucherzentrale-Schwelle: > 1,5% gilt als kritisch. Vergleiche mit ETF-Kosten ${fmtEur(r.etf?.totalCosts)}. Wiegt der Steuervorteil das auf?` : ''}

4. LEBENSPHASE-RISIKEN
   Bei Alter ${inp.currentAge || 'n/a'}: typische Ereignisse (Jobwechsel, Kinder, Immobilie, Krankheit). Welches Produkt ist am flexibelsten bei vorzeitigem Kapitalbedarf?

5. KINDER-ZULAGEN-HEBEL (wenn Kinder > 0)
   Quantifiziere den Einfluss der Kinderzulage (300 €/Kind/Jahr).

6. BERUFSEINSTEIGER-BONUS (wenn zutreffend)
   Einmalige 200 € wachsen über die Laufzeit. Zeige den Compound-Effekt.

7. KOMBI-STRATEGIE (wenn Sparrate > 150 €)
   Lohnt sich der Aufwand gegenüber einem Einzelprodukt?

8. GESETZES-UNSICHERHEIT
   Was könnte sich über die Anspardauer ändern (Steuersätze, Zulagenhöhe, Vorabpauschale-Basiszins, Halbeinkünfte-Regel)? Welches Produkt ist am robustesten?

9. RÜRUP-RENTE (nur falls im Kontext vorhanden)
   Die Rürup-Rente ist 100% steuerlich absetzbar (bis 29.344 € Single 2025, 58.688 € Paare), dafür nur lebenslange Rente, keine Kapitalauszahlung, keine Vererbung (außer Ehepartner).
   - Bewerte die Eignung für die konkrete Situation (Grenzsteuersatz, Erwerbsstatus).
   - Verbraucherzentrale: "Nur in wenigen Einzelfällen erste Wahl" — bezieh das ein.
   - Break-Even: Rürup lohnt meist erst ab 35% Grenzsteuersatz, optimal ab 42%.
   - Bei Angestellten: Höchstbetrag um 18,6% des Brutto (GRV-Beitrag) reduziert.
   - Nachgelagerte Besteuerung bei Rentenbeginn nach gesetzlichem Prozentsatz (83,5% in 2025, steigend um 0,5 pp/Jahr bis 100% in 2058).

10. RIESTER-RENTE (nur falls im Kontext vorhanden) — KRITISCH
    WICHTIG: Verbraucherzentrale & Finanztip (2026): "Vom Neuabschluss wird abgeraten." Versicherer sind aus dem Markt. Ab 2027 durch Altersvorsorgedepot ersetzt.
    - Bei Kindern: quantifiziere den Zulagen-Hebel (300 €/Kind/Jahr bei ab 2008 geboren).
    - Bei Bestandsverträgen: Beitragsfrei stellen empfehlen (Finanztip), auf Reform-Transfer warten.
    - Bei Neuabschluss: NUR noch Uniprofirente Select (Union Investment) empfohlen — und auch nur bei Familien mit 2+ Kindern oder Alleinerziehenden.
    - 100% nachgelagerte Besteuerung: Im Alter ist der volle Betrag zu versteuern.
    - Wenn Riester nicht die beste Option ist: klar sagen, Alternative empfehlen (ETF oder Altersvorsorgedepot).

STILE-VORGABEN:
- Schreibe wie ein Honorarberater zu einem Klienten: konkret, beziffert, abwägend.
- KEINE Standard-Phrasen wie "Jedes Produkt hat Vor- und Nachteile".
- Wenn ein Produkt schlecht abschneidet: nicht verteufeln, WARUM erklären.
- analysisType: "pension_individual".

CONFIDENCE-REGEL:
- "high": alle Daten vollständig, Differenz ≥ 8 pp, Anspardauer ≥ 20 Jahre.
- "medium": Daten lückenhaft oder kurze Anspardauer.
- "low": widersprüchliche Daten oder Alter nahe Rentenalter.

Mindestens 2 disclaimers (keine Anlageberatung, Stand-Hinweis mit Datum).`;

  return ctx + task + SELF_CHECK;
}

// ===== Prompt B: Aktien-Zukunftsanalyse (MIT Grounding) =====
export function buildStockForecastPrompt(store) {
  const pos = store.position || {};
  const m = store.market || {};
  const vola = store.computed?.volatility || {};
  const quote = m.quote || {};

  const ctx = `### KONTEXT

[AKTIE]
- Ticker: ${pos.ticker || 'n/a'}
- Name: ${pos.companyName || quote.name || 'n/a'}
- Aktueller Kurs: ${fmtEur(pos.currentPrice)}
- 52W-Hoch: ${fmtEur(quote.yearHigh)}
- 52W-Tief: ${fmtEur(quote.yearLow)}

[USER-POSITION]
- Einstiegspreis: ${fmtEur(pos.buyPrice)}
- Aktien gehalten: ${pos.shares || 0}
- Performance: ${pos.buyPrice > 0 ? fmtPct(((pos.currentPrice - pos.buyPrice) / pos.buyPrice) * 100) : 'n/a'}

[TECHNISCHE DATEN]
- Annualisierte Volatilität: ${vola.annualVol != null ? fmtPct(vola.annualVol * 100) : 'n/a'}
- Datenpunkte (historisch): ${vola.dataPoints || 0}

[ZEITLICHER KONTEXT]
- Analyse-Datum: ${new Date().toISOString().split('T')[0]}`;

  const task = `

### AUFGABE

Führe eine fundierte Analyse der Aktie ${pos.ticker || pos.companyName || ''} durch. Nutze Google-Suche AKTIV, um aktuelle Informationen zu recherchieren.

RECHERCHE:
1. AKTUELLE NACHRICHTEN (letzte 4 Wochen): Quartalsberichte, Guidance-Änderungen, M&A, Management-Wechsel, Produktankündigungen.
2. BRANCHEN- & MAKRO-KONTEXT: Regulierung, Zölle, Währungseffekte, Branchen-Megatrends.
3. ANALYSTEN-KONSENS: Durchschnittliches Kursziel, Buy/Hold/Sell-Verteilung, jüngste Up-/Downgrades.
4. CHART-EINSCHÄTZUNG: Position relativ zu 52W-Hoch, Momentum, saisonale Muster.

GENERIERE INSIGHTS:
- 1-2 Insights "Kurzfristig (1-4 Wochen)"
- 1-2 Insights "Mittelfristig (6-12 Monate)"
- 1-2 Insights "Hauptrisiken"
- 1-2 Insights "Hauptchancen"

ZWINGEND:
- KEINE Kursprognose mit konkretem Wert ("wird auf 200 € steigen"). Stattdessen: "Analysten-Konsens sieht Kursziel bei Ø 195 €, Range 170-220 €".
- Jede Zahl MUSS eine Quelle haben. Fehlt eine: "Aktuelle Daten dazu waren nicht verfügbar."
- Bei Quellen: Titel + URL + Publisher + kurzes Snippet.
- verdict: nur "positive" bei klar überwiegenden Chancen, "negative" bei klaren Warnzeichen, sonst "mixed" / "neutral".
- confidence: "high" nur wenn aktuelle Infos (< 4 Wochen) gefunden wurden.
- analysisType: "stock_forecast".
- usedGrounding: true.

WICHTIG: Das Schema ist JSON. Antworte ausschließlich mit einem JSON-Objekt mit den Feldern meta, summary, insights, sources, disclaimers. Kein Markdown, keine Codefences.

JSON-STRUKTUR:
{
  "meta": { "analysisType": "stock_forecast", "generatedAt": "ISO-Date", "confidence": "low|medium|high", "usedGrounding": true },
  "summary": { "headline": "1-Satz", "verdict": "positive|neutral|negative|mixed", "narrativeIntro": "2-3 Sätze Einleitung" },
  "insights": [
    { "id": "string", "severity": "red|amber|green|blue", "category": "risk|opportunity|context|macro|technical",
      "title": "max 70 Zeichen", "body": "Fließtext 80-250 Wörter mit konkreten Zahlen", "action": "1-2 Sätze Handlungsempfehlung" }
  ],
  "sources": [ { "title": "...", "url": "https://...", "publisher": "...", "snippet": "..." } ],
  "disclaimers": ["...", "..."]
}

Mindestens 4 insights, mindestens 2 disclaimers.`;

  return ctx + task + SELF_CHECK;
}
