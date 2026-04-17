# KI-Integration: Konzept für Template-Prompting & Structured Prompt Augmentation

**Projekt:** Trading Cockpit + Altersvorsorge-Vergleichsrechner
**Ziel:** Ersetzen/Ergänzen statischer Hinweistexte durch echte KI-basierte Analysen
**API:** Google Gemini API (generativelanguage.googleapis.com)
**Stand:** April 2026

---

## 1. Überblick & Strategische Ziele

Die Webapp enthält aktuell an vielen Stellen **hardcodierte Advisory-Texte** (in `advisory.js`, `altersvorsorge.html` Advisory-Panel, Steuerlast-Zusammenfassung, Volatilitäts-Einschätzung, etc.). Diese sind regelbasiert und statisch — sie können zwar konkrete Zahlen einblenden, aber sie können nicht:

- Individuelle Situationen ganzheitlich einordnen
- Geopolitische oder aktuelle Marktkontexte berücksichtigen
- Zwischen den Zeilen lesen (z.B. "User ist 58 Jahre alt, hat nur 10 Jahre Anspardauer — für ihn ist Aktienquote X riskant")
- Aktuelle Recherche im Web betreiben (News, Fachmeinungen, Verbraucherzentrale-Updates)
- Fachliche Einschätzungen mit Nuancen geben

Durch Gemini-Integration wird die Webapp zu einem **hybriden System**:

- **Ohne API-Key:** regelbasierte, statische Hinweise (Status quo)
- **Mit API-Key:** KI-gestützte, individualisierte Analysen mit optionaler Web-Recherche

---

## 2. Technische Architektur

### 2.1 Model-Auswahl (User wählt in Settings)

| Modell | Stärken | Schwächen | Kosten (Stand 04/2026) | Wann wählen? |
|---|---|---|---|---|
| **gemini-2.5-flash** | Schnell, Grounding, günstig | Weniger Tiefe | ~$0.30 /1M Output | **Default** — beste UX |
| **gemini-2.5-pro** | Höchste Qualität, lange Kontexte | Teurer, langsamer | ~$10 /1M Output | Für umfassende Jahresanalysen |
| **gemini-2.0-flash** | Sehr günstig | Kein Grounding, älter | ~$0.075 /1M Output | Nur Interpretation, keine Recherche |

Settings-UI: Dropdown "KI-Modell" direkt neben dem API-Key-Feld.

### 2.2 API-Endpoints

```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
     ?key={USER_API_KEY}
```

**Wichtige Parameter im Request:**
- `contents`: Der eigentliche Prompt (user-Rolle)
- `systemInstruction`: Rollendefinition (Experte, Ton, Grenzen)
- `generationConfig.responseMimeType`: `"application/json"` → erzwingt JSON
- `generationConfig.responseSchema`: Strukturvorgabe (wird unten definiert)
- `generationConfig.temperature`: 0.3 für Faktenanalysen, 0.7 für Beratung
- `tools`: `[{googleSearch: {}}]` bei Bedarf für Web-Recherche

### 2.3 Trigger & UX

**Entschieden:** Keine automatischen Calls — alle KI-Analysen werden per expliziten Button ausgelöst.

Für jede KI-Funktion gibt es:
1. Einen **prominenten Button** im jeweiligen Panel (z.B. "KI-Analyse anfordern")
2. Während API-Call: **Loading-Indikator** mit Hinweis auf ca. Dauer
3. **Fehlerbehandlung**: API-Key falsch / Rate-Limit / Network → Fallback auf statische Regel-Hinweise
4. **Token-Counter** (optional): zeigt nach jedem Call die ungefähren Kosten

### 2.4 Datenfluss

```
User Input (Sidebar)
   │
   ▼
Lokale Berechnung (tax-engine, retirement-engine)
   │
   ▼
Statische Advisory-Regeln (wie bisher, immer aktiv)
   │
   ▼
[wenn API-Key vorhanden + Button geklickt]
   │
   ▼
Prompt-Builder kombiniert:
  • System-Prompt (Rolle)
  • Kontext (berechnete Werte + User-Inputs)
  • Task-Spezifischer Prompt
  • Response-Schema (JSON)
   │
   ▼
Google Gemini API
   │
   ▼
JSON-Parsing + Validierung
   │
   ▼
Rendering in dedicated "KI-Analyse" Sektion
(mit Disclaimer + Timestamp)
```

---

## 3. Welche statischen Hinweise werden durch KI ersetzt / ergänzt?

### 3.1 Trading Cockpit — aktuelle statische Komponenten

| Datei / Komponente | Aktueller Stand | KI-Potenzial | Priorität |
|---|---|---|---|
| `advisory.js` — 10+ Rule-based Advisories | Schwellwert-basiert (R:R < 2, Tax-Drag > 30%, etc.) | Ganzheitliche, kontextuelle Gesamteinschätzung | Hoch |
| Steuerlast-Tab "Was bedeutet das für dich?" | Statischer Text mit Zahlen | Individualisierte Steuerstrategie-Empfehlung | Hoch |
| Volatilitäts-Tab Ampel-System | Green/Amber/Red basierend auf Sigma-Vergleich | Einschätzung mit Marktkontext (warum ist Vola hoch?) | Mittel |
| Break-Even Rebuy Zone | Rechnerische Einschätzung | Realitätscheck mit historischem Kontext für diese Aktie | Mittel |
| Sparplan-Vergleich Winner-Label | "Sparplan war besser" | Erklärung WARUM & was das bedeutet | Niedrig |
| **NEU:** Aktien-Prognose | Nicht vorhanden | Chartanalyse, News, Geopolitik (mit Grounding) | Hoch |

### 3.2 Altersvorsorge — aktuelle statische Komponenten

| Datei / Komponente | Aktueller Stand | KI-Potenzial | Priorität |
|---|---|---|---|
| Advisory-Panel mit 9 festen Texten | Template-basiert, hardgecodete Fliesstexte | Individualisierte Lebenssituations-Analyse | Hoch |
| KPI-Karten ohne Erklärung | Nur Zahlen | Kontextuelle Interpretation pro Produkt | Mittel |
| Steuervergleich-Tab | Statischer Lehrtext | Auf User-Situation zugeschnittene Steuerlogik | Hoch |
| Kostenvergleich-Tabelle | Pure Zahlen | "Versteckte Kosten"-Einordnung, Anbieter-Kommentar | Mittel |

---

## 4. Neue KI-Analyse-Typen

### 4.1 Trading Cockpit

#### A) **Positions-Gesamteinschätzung** (ersetzt Advisory-Panel)
- Input: Position, alle berechneten Werte, Volatilität, DCA-Resultat
- Output: 3-Paragraph-Analyse:
  1. Aktuelle Lage (Gewinn/Verlust, Psychologie)
  2. Empfehlung (Halten/Verkaufen/Nachkaufen mit Begründung)
  3. Risiken & was zu beobachten ist

#### B) **Aktien-Zukunftsanalyse** (NEU, benötigt Grounding)
- Input: Ticker, aktueller Kurs, Branche
- KI recherchiert live:
  - Aktuelle News (Q-Zahlen, M&A, Skandale)
  - Geopolitischer Kontext (Zölle, Sanktionen, Regulierung)
  - Fachanalysen (Analysten-Ratings, Konsens-Kursziele)
  - Chart-Muster (ATH/ATL-Nähe, Trend)
- Output: 
  - Kurzfristiger Ausblick (1-4 Wochen)
  - Mittelfristiger Ausblick (6-12 Monate)
  - Hauptrisiken
  - Hauptchancen
  - Quellen-Links

#### C) **Steuerstrategie-Assistent**
- Input: Steuersituation (Kirchensteuer, Freibetrag, Jahresgewinn)
- Output: Konkrete Handlungsempfehlungen zur Steueroptimierung
  - Z.B. "Du hast noch 650 € Freibetrag → realisiere Gewinne bis 31.12."
  - Kombiniert mit: "In deinem Bundesland wäre ein Umzug nach BaWü steuerlich X € vorteilhafter über 10 Jahre" (übertrieben, aber kontextuell)

#### D) **Volatilitäts-Kontextanalyse**
- Input: Volatilitätswerte, Branche, aktuelle Marktphase
- Output: Ist die Vola hoch/niedrig verglichen mit:
  - Sektor-Durchschnitt
  - Historischem Mittel dieser Aktie
  - Welche Events erklären die aktuelle Vola?

### 4.2 Altersvorsorge

#### E) **Individuelle Lebenssituations-Analyse**
- Input: Alter, Kinder, Steuersatz, Sparrate, Berufseinsteiger
- Output: Umfassende persönliche Empfehlung:
  - Welches Produkt PASST zu dieser Situation (nicht nur welches gewinnt)
  - Warum die Standard-Berechnung ggf. irreführt
  - Alternative Szenarien (Krankheit, Jobwechsel, Kinderplanung)
  - Hinweis auf Verbraucherzentrale-Empfehlungen

#### F) **Anbieter-Deep-Dive** (mit Grounding)
- Input: Gewählter RV-Anbieter (z.B. Alte Leipziger)
- KI recherchiert:
  - Aktuelle Stiftung-Warentest-Bewertungen
  - Kundenbewertungen / Beschwerden
  - Finanzielle Solidität (Solvency II)
- Output: Objektive Einschätzung des Anbieters

#### G) **Was-wäre-wenn-Berater**
- Input: Aktuelle Parameter + Auswahlmenü für Szenarien
- Szenarien: "Was, wenn Steuersätze sich um 5% erhöhen?", "Was, wenn ich 5 Jahre früher in Rente gehe?", "Was, wenn Basiszins auf 4% steigt?"
- Output: Narrative Analyse mit neuen Zahlen

#### H) **Split-Strategie-Optimierung**
- Input: Kombi-Ergebnis
- Output: Verfeinerte Empfehlung zur Aufteilung jenseits des 150€-Schemas

---

## 5. Response-Format: Warum JSON, nicht Text

**Freier Text hat Probleme:**
- Kein zuverlässiges Rendering (Markdown-Parsing schwierig)
- Schwer zu strukturieren in UI-Kacheln
- Inkonsistente Qualität (mal kurz, mal lang)

**Strukturiertes JSON mit Schema erzwingt:**
- Konsistente Felder (title, severity, body, action, sources)
- Mehrere Hinweise als Array → in UI-Karten renderbar
- Typisierte Werte (severity: "red" | "amber" | "green" | "blue")
- Optionale Tags/Kategorien für Filterung

### 5.1 Response-Schema — Standardformat für alle KI-Hinweise

```
{
  "meta": {
    "analysisType": "position_assessment" | "stock_forecast" | "pension_advice" | ...,
    "generatedAt": ISO-Timestamp,
    "confidence": "low" | "medium" | "high",
    "modelUsed": "gemini-2.5-flash",
    "usedGrounding": boolean
  },
  "summary": {
    "headline": "1-Satz-Kernbotschaft",
    "verdict": "positive" | "neutral" | "negative" | "mixed"
  },
  "insights": [
    {
      "id": "unique_id",
      "severity": "red" | "amber" | "green" | "blue",
      "category": "risk" | "tax" | "opportunity" | "psychology" | "context",
      "title": "Kurzer Titel (max 60 Zeichen)",
      "body": "Ausführlicher Fließtext (100-300 Wörter)",
      "dataPoints": {
        "keyEuro": 12345.67,
        "keyPercent": 6.7
      },
      "action": "Konkrete Handlungsempfehlung (1-2 Sätze)"
    }
  ],
  "sources": [
    {
      "title": "Quelle-Titel",
      "url": "https://...",
      "snippet": "Kurzes Zitat",
      "accessedAt": ISO-Timestamp
    }
  ],
  "disclaimers": [
    "Keine Anlageberatung...",
    "Stand: DATUM, Gesetze können sich ändern"
  ]
}
```

### 5.2 Warum dieses Schema?
- `insights[]`: Mehrere Hinweis-Kacheln, beliebig viele
- `severity/category`: Farbcodierung + Filterung in UI
- `dataPoints`: Strukturierte Zahlen für Highlighting
- `sources`: Nur bei Grounding gefüllt, als Link-Liste darstellbar
- `disclaimers`: Rechtliche Hinweise immer präsent

---

## 6. Prompt-Bibliothek

Alle Prompts folgen dem Muster: **System-Prompt (Rolle)** + **Context (Daten)** + **Task** + **Output-Spec**.

### 6.1 Globaler System-Prompt (Basis für ALLE Calls)

```
Du bist ein erfahrener, unabhängiger Finanzberater für den deutschen Markt
mit Expertise in Steuerrecht, Altersvorsorge und Aktien-Trading. Du berätst
seriös, präzise und ohne Verkaufsinteresse.

Grundsätze:
- Quellen: Du richtest dich nach Verbraucherzentrale, Stiftung Warentest,
  Finanztip, BMF, BVI. Reisserische Finanz-YouTuber zitierst du nicht.
- Sprache: Deutsch, sachlich, verständlich. Erkläre Fachbegriffe kurz.
- Ehrlichkeit: Wenn Daten unklar sind, sagst du das. Du erfindest keine Zahlen.
- Keine Anlageberatung: Du gibst Einschätzungen, keine verbindlichen Empfehlungen.
- Keine Garantien: Bei Prognosen kommunizierst du Unsicherheit klar.
- Steuerstand: April 2026. Altersvorsorgedepot ab 01.01.2027.
- Format: Antworte IMMER im vorgegebenen JSON-Schema. Kein Markdown im Text.
- Länge: Paragraphen mindestens 100 Wörter, Handlungsempfehlungen 1-2 Sätze.
```

Dieser System-Prompt wird in `systemInstruction` gesetzt und bei jedem API-Call mitgesendet.

---

### 6.2 Prompt-Template A: Positions-Gesamteinschätzung (Trading)

**Zweck:** Ersetzt das Advisory-Panel im Trading Cockpit.

**Context (wird dynamisch eingefügt):**

```
## Position
- Aktie: {ticker} ({companyName})
- Anzahl: {shares}
- Kaufkurs: {buyPrice} €
- Aktueller Kurs: {currentPrice} €
- Gebühr pro Trade: {brokerFee} €

## Kursverlauf & Volatilität
- Unverzinste Rendite seit Kauf: {gainPct} %
- Tägliche Volatilität (30T): {dailyVol} %
- Wöchentliche Volatilität: {weeklyVol} %
- ATR (14): {atrPct} %
- Max Drawdown 6M: {maxDrawdown} %

## Steuerliche Rahmendaten
- Kirchensteuer: {kirchensteuerRate} %
- Sparerpauschbetrag verbraucht: {freistellungUsed} von 1000 €
- Effektiver Steuersatz: {effectiveTaxRate} %

## User-Zielwerte
- Stop-Loss: {stopLoss} €
- Zielkurs: {targetPrice} €
- Gewünschter Netto-Gewinn: {desiredNetProfit} €

## Berechnete Ergebnisse
- Brutto-Gewinn bei Verkauf jetzt: {grossGain} €
- Steuerbelastung: {totalTax} € ({taxDragPercent} % Tax Drag)
- Netto-Gewinn: {netGain} €
- Break-Even Rebuy: {breakEvenRebuy} €
- Benötigter Kursrückgang für Rebuy: {requiredDropPercent} %
- Risk/Reward-Verhältnis: 1 : {riskRewardRatio}
- Sparplan-Vergleich: {dcaWinner} hätte {dcaDifference} € mehr/weniger gebracht
```

**Task-Prompt:**

```
Erstelle eine ganzheitliche Einschätzung dieser Trading-Position.
Identifiziere 4-6 Kerneinsichten (insights), die der Trader wissen muss.
Jede Einsicht umfasst:
- Was ist die Situation? (mit konkreten Zahlen aus dem Kontext)
- Warum ist das relevant? (Einordnung, Vergleich, Kontext)
- Was sollte der Trader tun? (konkrete Handlung)

Berücksichtige:
1. Die Chance-Risiko-Bewertung unter Einbeziehung der Volatilität
2. Die Steuerlast und ob Timing für Jahresende relevant ist
3. Psychologische Fallen (Gewinnmitnahme zu früh, Verlustaversion)
4. Ob Break-Even-Rebuy realistisch ist gegeben der Volatilität
5. Was die Sparplan-Alternative über die Timing-Entscheidung aussagt
6. Kostenbelastung durch Gebühren vs. Gewinn

Gewichte die Severity: Kritisches (red) zuerst, Chancen (green), Info (blue).
```

---

### 6.3 Prompt-Template B: Aktien-Zukunftsanalyse (Trading, MIT Grounding)

**Zweck:** Völlig neues Feature. KI recherchiert live im Web.

**Context:**

```
## Aktie
- Ticker: {ticker}
- Name: {companyName}
- Aktueller Kurs: {currentPrice} €
- 52W-Hoch: {yearHigh} €
- 52W-Tief: {yearLow} €
- Branche: {sector} (falls bekannt)

## Technische Daten (aus der Webapp berechnet)
- Trend letzte 6 Monate: {trend} (up/down/sideways)
- Volatilität (ann.): {annualVol} %
- Abstand zum 52W-Hoch: {distanceToHigh} %
- Position relativ zu Kaufkurs: {gainPct} %

## User-Kontext
- Einstiegspreis: {buyPrice} €
- Haltedauer bisher: {holdingPeriod} Monate
```

**Task-Prompt:**

```
Führe eine fundierte, aktuelle Analyse der Aktie {ticker} durch.
Nutze Google Search, um zu recherchieren:

1. AKTUELLE NACHRICHTEN (letzte 4 Wochen):
   - Quartalsberichte / Guidance-Änderungen
   - M&A-Aktivitäten
   - Management-Wechsel, Skandale
   - Produktankündigungen

2. GEOPOLITISCHE / MAKROÖKONOMISCHE EINFLÜSSE:
   - Relevante Regulierungen (EU AI Act, Zölle, Sanktionen)
   - Währungseffekte (EUR/USD bei US-Aktien)
   - Branchen-Megatrends (KI, Energiewende, Demographie)

3. ANALYSTEN-KONSENS:
   - Aktuelle Kursziele (durchschnittlich, min, max)
   - Buy/Hold/Sell-Verteilung
   - Jüngste Up-/Downgrades

4. CHART-EINSCHÄTZUNG:
   - Position relativ zu ATH und Support-Leveln
   - Momentum und Trend-Muster
   - Saisonalität (wenn relevant)

Gib zurück:
- 2-3 Insights zum KURZFRISTIGEN Ausblick (1-4 Wochen)
- 2-3 Insights zum MITTELFRISTIGEN Ausblick (6-12 Monate)
- 1-2 HAUPTRISIKEN
- 1-2 HAUPTCHANCEN
- Quellenangaben im sources[]-Array (URL, Titel, Zugriffsdatum)

WICHTIG:
- Kein Hype, keine Kursziel-Versprechen
- Klar kommunizieren, dass dies KEINE Kaufempfehlung ist
- Unsicherheiten explizit benennen ("Der Markt erwartet..., aber es gibt Unsicherheit bei...")
- Falls keine aktuellen Infos gefunden: ehrlich sagen
```

---

### 6.4 Prompt-Template C: Steuerstrategie-Assistent (Trading)

**Zweck:** Konkrete Steueroptimierungs-Tipps basierend auf aktueller Situation.

**Context:**

```
## Steuerliche Situation
- Kirchensteuer: {kirchensteuerYes|No} ({kirchensteuerRate} %)
- Bundesland: {bundesland}
- Sparerpauschbetrag 2026: 1000 €, verbraucht: {freistellungUsed} €
- Effektiver Steuersatz: {effectiveTaxRate} %

## Aktuelle Position
- Unrealisierter Gewinn: {unrealizedGain} €
- Davon steuerpflichtig (nach Teilfreistellung 30%): {taxableGain} €
- Potenzielle Steuer: {potentialTax} €

## Kontext
- Aktuelles Datum: {currentDate}
- Tage bis Jahresende: {daysUntilYearEnd}
```

**Task-Prompt:**

```
Analysiere die steuerliche Situation und gib 3-5 konkrete, umsetzbare
Optimierungsempfehlungen.

Berücksichtige:
1. **Freibetrag-Ausnutzung:** Wenn noch Freibetrag übrig + Gewinn vorhanden
   und Jahr fortgeschritten → Tax-Loss-Harvesting oder Gewinnrealisierung
   vor 31.12.
2. **Kirchensteuer-Effekt:** Quantifiziere, was der Wechsel aus der Kirche
   in €/Jahr bringen würde (über die Restlaufzeit).
3. **Verlustverrechnungstopf:** Wenn Position aktuell im Minus, Hinweis auf
   Verlustbescheinigung oder Verlustverrechnung.
4. **Teilfreistellung-Nutzung:** Aktienfonds-ETFs (30% Teilfreistellung)
   vs. Rentenfonds-ETFs — erkläre den Unterschied.
5. **Multi-Depot-Strategie:** FIFO-Umgehung durch 2 Depots (legal).
6. **Realisierungs-Timing:** Vorteile eines Verkaufs vor/nach Jahreswechsel.

Rege AUSSCHLIESSLICH zu legalen Gestaltungen an, keine Steuertricks.
```

---

### 6.5 Prompt-Template D: Volatilitäts-Kontextanalyse (Trading)

**Context:**

```
## Volatilitäts-Metriken
- Tägliche Vola: {dailyVol} %
- Wöchentliche Vola: {weeklyVol} %
- Annualisierte Vola: {annualVol} %
- ATR(14): {atrPct} %

## Aktien-Info
- Ticker: {ticker}
- Branche: {sector}
- Marktkapitalisierung: {marketCap}

## User-Erwartung
- Geplanter Kursrückgang für Rebuy: {requiredDropPercent} %
- Erwartete Kurssteigerung zum Ziel: {expectedUpsidePercent} %
```

**Task-Prompt:**

```
Ordne die Volatilität dieser Aktie für den Trader ein. Nutze Grounding,
um aktuelle Branchen-Volatilität zu vergleichen.

Erkläre:
1. Wie hoch ist die Vola verglichen mit:
   - Dem DAX / S&P 500 (typisch 15-20% annualisiert)
   - Dem Sektor-Durchschnitt
   - Dem historischen Mittel dieser Aktie (wenn bekannt)

2. Was treibt die aktuelle Vola?
   - Aktuelle Nachrichten
   - Branchen-Unsicherheit
   - Earnings-Season?

3. Sind die User-Erwartungen realistisch?
   - Vergleich mit 1-Sigma, 2-Sigma Bewegung
   - Historische Häufigkeit solcher Ausschläge

4. Welche Positionsgrösse passt zur Vola?
   - Kelly-Criterion-artiger Hinweis (nicht Formel, sondern Prinzip)
```

---

### 6.6 Prompt-Template E: Individuelle Altersvorsorge-Analyse

**Zweck:** Ersetzt das statische Advisory-Panel auf der Altersvorsorge-Seite.

**Context:**

```
## Persönliche Situation
- Alter: {currentAge}
- Geplantes Rentenalter: {retirementAge}
- Anzahl Kinder: {numberOfChildren}
- Berufseinsteiger unter 25: {isCareerStarter}

## Sparverhalten
- Monatliche Sparrate: {monthlyAmount} €
- Startkapital: {initialBalance} €
- Anspardauer: {years} Jahre

## Steuerliche Situation
- Persönlicher Steuersatz heute: {personalTaxRateCurrent} %
- Erwarteter Steuersatz im Alter: {personalTaxRateRetirement} %
- Kirchensteuer: {kirchensteuerRate} %
- Bundesland: {bundesland}

## Berechnete Ergebnisse (Netto-Auszahlung nach allen Kosten & Steuern)
- ETF-Sparplan: {etfNet} € (Gesamtkosten: {etfCosts} €, Steuer: {etfTax} €)
- Rentenversicherung ({providerName}, {providerCostRate} % p.a.): {rvNet} €
- Altersvorsorgedepot: {avdNet} € (Zulagen gesamt: {avdSubsidies} €)
- Kombi-Strategie: {kombiNet} €

## Beste Option
- Gewinner: {bestProduct} mit {bestNet} €
```

**Task-Prompt:**

```
Erstelle eine umfassende, individualisierte Altersvorsorge-Analyse für
diese Person. Gib 6-8 fundierte Insights zurück.

Verpflichtende Themen:
1. **Hauptempfehlung mit Begründung:** Warum das rechnerisch beste Produkt
   in DIESER konkreten Lebenssituation tatsächlich passt (oder nicht).
   Berücksichtige: Flexibilität, Lebensumstände, Steuersituation heute vs. Alter.

2. **Verbraucherzentrale-Perspektive:** Was sagt die Verbraucherzentrale
   typischerweise zu dieser Konstellation? Welche bekannten Warnungen gelten?
   Für die Rentenversicherung konkret: ab welcher Kostenquote lohnt es sich NICHT mehr?

3. **Steueroptimierung:** Ist der heutige Steuersatz ({personalTaxRateCurrent} %)
   im Verhältnis zum erwarteten Rentenalter-Satz ({personalTaxRateRetirement} %)
   günstig für nachgelagerte Besteuerung (AVD) oder nicht?

4. **Lebensphase-Risiken:** 
   - Bei Alter {currentAge}: typische Risiken in den nächsten 10 Jahren
     (Jobwechsel, Kinder, Krankheit, Immobilienkauf)
   - Wie robust sind die 3 Produkte gegen vorzeitige Entnahme?

5. **Kinder-Aspekt:** Wenn numberOfChildren > 0: Quantifiziere, wie stark die
   Kinderzulage die AVD-Rendite über die Laufzeit hebelt.

6. **Berufseinsteiger-Bonus:** Wenn zutreffend, erkläre den 200€-Bonus und
   dessen Compound-Effekt über {years} Jahre.

7. **Kombi-Strategie:** Wenn monatlich > 150€: Ist die vorgeschlagene
   Aufteilung sinnvoll? Alternativen?

8. **Gesetzes-Unsicherheit:** Über {years} Jahre können sich Zulagen,
   Steuersätze und Regeln ändern. Welche Ereignisse würden die Rechnung
   sprengen?

Nutze KEINE Phrasen wie "Jedes Produkt hat seine Vor- und Nachteile".
Sei konkret und zahlen-basiert.
```

---

### 6.7 Prompt-Template F: Anbieter-Deep-Dive (Altersvorsorge, MIT Grounding)

**Context:**

```
## Geprüfter Anbieter
- Name: {providerName}
- Produkt: {productName}
- Angegebene Kosten: {totalCostRate} % p.a.
- Typ: {type} (netto/provisionsbasiert/digital)
```

**Task-Prompt:**

```
Recherchiere live über Google Search zu {providerName} ({productName}).

Suche nach:
1. Aktuelle Stiftung-Warentest-Bewertungen (2024/2025/2026)
2. Finanztip-Empfehlungen
3. Solvency-II-Quote des Versicherers
4. Bekannte Beschwerden (BaFin-Beschwerdestatistik, Verbraucherzentrale)
5. Kostenvergleich mit Wettbewerbern

Gib zurück:
- 2-3 Insights zu Kosten & Transparenz
- 1-2 Insights zu Finanzieller Solidität
- 1-2 Insights zu Servicequalität / Reputation
- EMPFEHLUNG: "Prüfen", "Alternativen anschauen", "Solide Wahl"
- Quellen-Links

WICHTIG: Keine Werbeaussagen der Anbieter übernehmen. Fokus auf
unabhängige Quellen.
```

---

### 6.8 Prompt-Template G: Was-wäre-wenn-Szenarien (Altersvorsorge)

**Zweck:** Simuliert Auswirkungen von unsicheren Zukunftsfaktoren.

**Context:**

```
## Aktuelle Berechnung
- [alle berechneten Werte wie in Template E]

## User-Szenario
- Was-wäre-wenn: {scenarioDescription}
  (z.B. "Steuersatz im Alter steigt auf 35% statt 25%")
  (z.B. "Ich gehe 5 Jahre früher in Rente")
  (z.B. "Basiszins steigt auf 4%")
  (z.B. "Nächste Finanzkrise: 40% Drawdown in Jahr 15")
```

**Task-Prompt:**

```
Analysiere das Szenario "{scenarioDescription}" und erkläre detailliert:

1. Welches der drei Produkte ist am stärksten betroffen? Warum?
2. Welches ist am robustesten? Warum?
3. Quantifiziere grob die Auswirkung auf die Nettoauszahlung
   (Prozent oder Euro, mit Unsicherheitsbandbreite)
4. Welche Anpassungen der Strategie würden das Risiko mildern?

Ordne das Szenario historisch ein (wie wahrscheinlich ist es? wann ist
so etwas zuletzt passiert?).
```

---

## 7. Web-Recherche (Google Search Grounding)

### 7.1 Wann einsetzen?

**MIT Grounding:**
- Aktien-Zukunftsanalyse (Template B) — Live-News zwingend nötig
- Anbieter-Deep-Dive (Template F) — aktuelle Bewertungen
- Volatilitäts-Kontextanalyse (Template D) — Marktkontext
- Was-wäre-wenn historisch (Template G) — historische Precedents

**OHNE Grounding:**
- Positions-Gesamteinschätzung (Template A) — interne Zahlen reichen
- Steuerstrategie (Template C) — Steuergesetz ist trainiert
- Individuelle Altersvorsorge (Template E) — interne Berechnung

Grounding ist teurer (ca. $35 pro 1000 Queries zusätzlich zum Token-Preis). Daher nur gezielt einsetzen.

### 7.2 Konfiguration

```
tools: [
  { googleSearch: {} }
]
```

Antwort enthält dann zusätzlich:
- `groundingMetadata.searchEntryPoint` (Such-Widget)
- `groundingMetadata.groundingChunks[]` (Quellen-Chunks)
- `groundingMetadata.groundingSupports[]` (Welche Textstelle von welcher Quelle stammt)

Die Quellen müssen per Schema in `sources[]` übernommen werden.

---

## 8. Settings-UI-Konzept

Neue Sektion in den Einstellungen der Webapp:

```
╔═══════════════════════════════════════════╗
║  KI-Analyse (optional)                    ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Google Gemini API-Key                    ║
║  [Eingabefeld________________]            ║
║  Kostenlos erstellen bei ai.google.dev    ║
║                                           ║
║  Modell                                   ║
║  [Dropdown ▼]                             ║
║   • Gemini 2.5 Flash (empfohlen, ~0,1¢/Analyse)║
║   • Gemini 2.5 Pro (höchste Qualität, ~2¢)║
║   • Gemini 2.0 Flash (günstigst, ~0,02¢)  ║
║                                           ║
║  Grounding (Web-Recherche)                ║
║  [x] Aktivieren (empfohlen, ca. 2-4¢/Call)║
║                                           ║
║  Datenschutz-Hinweis:                     ║
║  Bei aktiver KI-Analyse werden deine      ║
║  eingegebenen Daten an Google übermittelt.║
║  Trage keine besonders sensitiven Infor-  ║
║  mationen ein. Google kann die Daten zum  ║
║  Modell-Training verwenden (abhängig vom  ║
║  Account-Typ).                            ║
║                                           ║
║  [KI-Verbindung testen]                   ║
╚═══════════════════════════════════════════╝
```

Persistenz: LocalStorage (`tc_settings.aiApiKey`, `tc_settings.aiModel`, `tc_settings.aiGrounding`).

### 8.1 Test-Button

Sendet einen trivialen Prompt ("Antworte mit OK") und zeigt grünes Häkchen bei Erfolg oder rote Fehlermeldung.

---

## 9. UI-Integration pro Feature

### 9.1 Trading Cockpit

| Ort | Button | Panel |
|---|---|---|
| Advisory-Panel (unten) | "KI-Gesamteinschätzung" | Ersetzt/ergänzt statische Hinweise |
| Kurs-Chart-Tab | "KI-Aktienanalyse (mit Web-Recherche)" | Neue Sektion unter dem Chart |
| Steuerlast-Tab | "KI-Steuerstrategie" | Neue Sektion unter der Summary |
| Volatilitäts-Tab | "KI-Volatilitäts-Kontext" | Neue Sektion |

### 9.2 Altersvorsorge

| Ort | Button | Panel |
|---|---|---|
| Advisory-Panel | "KI-Beratung anfordern" | Ersetzt die 9 statischen Hinweise |
| Anbieter-Dropdown | "KI-Anbieter-Check" | Modal |
| Tab "Steuervergleich" | "KI-Steueranalyse" | Neue Sektion |
| Neuer Tab | "Was-wäre-wenn?" | Szenario-Dropdown + Analyse |

### 9.3 Loading- und Fehler-States

- **Während API-Call:** Spinner + "KI analysiert deine Situation... (ca. 5-15 Sek.)"
- **Fehler (Rate Limit, Netzwerk, Key):** Rote Box "KI nicht erreichbar. [Fallback auf statische Hinweise aktiv]. Details: {error}"
- **Ohne API-Key:** Info-Box "Für tiefere Analysen: API-Key in Settings eintragen"

---

## 10. Hybride Strategie: Statisch + KI

**Die Regel-basierten Advisories bleiben IMMER erhalten** (auch mit API-Key):

1. Ohne API-Key → nur statische Hinweise (Status quo)
2. Mit API-Key → statische Hinweise + zusätzlich KI-Button
3. Nach KI-Klick → KI-Analyse ERGÄNZT die statischen Hinweise (nicht ersetzt)
4. KI-Analyse landet in eigener Sektion "KI-Einschätzung", klar getrennt

**Vorteile:**
- Zuverlässigkeit: Webapp funktioniert auch ohne KI vollständig
- Verifikation: User kann KI-Empfehlung mit regelbasiertem Advisor abgleichen
- Kostenkontrolle: KI nur wenn explizit angefordert

---

## 11. Kostenabschätzung

**Beispiel-Szenarien (Gemini 2.5 Flash, April 2026):**

| Prompt-Template | Input Tokens (geschätzt) | Output Tokens | Grounding | Kosten pro Call |
|---|---|---|---|---|
| A: Positions-Gesamt | 800 | 1500 | nein | ~0.05 ¢ |
| B: Aktien-Prognose | 600 | 2000 | JA | ~4 ¢ |
| C: Steuerstrategie | 500 | 1200 | nein | ~0.04 ¢ |
| D: Volatilitäts-Kontext | 600 | 1000 | JA | ~3.5 ¢ |
| E: Altersvorsorge-Analyse | 1000 | 2500 | nein | ~0.09 ¢ |
| F: Anbieter-Deep-Dive | 400 | 1500 | JA | ~3.7 ¢ |
| G: Was-wäre-wenn | 1200 | 1800 | nein | ~0.06 ¢ |

**Realistischer Monats-User (10 Analysen/Tag):**
- Ohne Grounding: ~15 ¢/Monat
- Mit Grounding gemischt (50/50): ~5 €/Monat

Das ist für den User verträglich, sollte aber im UI transparent kommuniziert werden.

---

## 12. Rechtliche & Datenschutz-Aspekte

### 12.1 Disclaimer in jeder KI-Antwort

Fest ins Schema eingebaut (`disclaimers[]`), vom System-Prompt erzwungen:

- "Dies ist keine Anlageberatung im Sinne des WpHG."
- "Kapitalmarktanlagen unterliegen dem Risiko des Totalverlusts."
- "Die Analyse basiert auf dem Kenntnisstand [DATUM] und kann veraltet sein."
- "Bei komplexen Entscheidungen konsultieren Sie einen Honorarberater oder die Verbraucherzentrale."

### 12.2 DSGVO-Hinweis bei API-Key-Eingabe

Modal beim ersten Setzen des API-Keys:

> **Wichtiger Datenschutz-Hinweis**
> 
> Wenn du die KI-Analyse nutzt, werden deine Eingaben (Alter, Bundesland,
> Steuersatz, Sparrate, Kinderanzahl, Anlagen) an Google in den USA übertragen.
> 
> - Google Gemini API verarbeitet diese Daten gemäß Google Cloud AGB
> - Bei kostenpflichtigen Accounts (pay-as-you-go) werden Daten NICHT fürs
>   Modelltraining verwendet (Opt-out by default)
> - Bei kostenlosen API-Keys (Free Tier) kann Google die Daten zu
>   Trainingszwecken nutzen (Opt-out by default ab 2024)
> 
> Es werden keine Namen, Adressen oder Bankdaten übertragen. Diese Webapp
> speichert deinen API-Key nur lokal im Browser (LocalStorage).
> 
> [Verstanden, fortfahren]   [Abbrechen]

### 12.3 Keine Speicherung von Ergebnissen in der Cloud

Alle KI-Ergebnisse bleiben im Browser. Kein Backend, kein Logging.

---

## 13. Implementierungs-Reihenfolge (Empfehlung für den Code-Schritt)

Wenn es später an die Umsetzung geht, empfohlene Reihenfolge:

1. **Infrastruktur** (~200 LOC):
   - `ai-client.js`: Wrapper um Gemini API (generateContent, Error Handling)
   - `ai-prompts.js`: Alle Prompt-Templates als Funktionen `buildPromptX(context)`
   - Settings-UI erweitern (Key-Input, Model-Dropdown, Grounding-Checkbox, Test-Button)

2. **Response-Renderer**:
   - `ai-renderer.js`: Nimmt JSON-Response, rendert als Alpine-kompatible HTML-Cards
   - Konsistente Styling mit bestehenden Advisory-Cards

3. **Feature-Rollout** (pro Prompt-Template ein Commit):
   - Template A (Trading Advisory) — einfachster Start
   - Template E (Altersvorsorge Advisory)
   - Template C (Steuerstrategie)
   - Template D (Volatilitäts-Kontext)
   - Template B (Aktien-Prognose, MIT Grounding) — komplexer
   - Template F (Anbieter-Deep-Dive, MIT Grounding)
   - Template G (Was-wäre-wenn)

4. **Politur**:
   - Kosten-Counter im Settings-Panel
   - Cache-Layer für wiederkehrende Prompts (SHA-Hash des Contexts)
   - Optional: "Offline speichern" für KI-Resultate

---

## 14. Offene Fragen / Zu klären

Diese Punkte müssen vor der Implementierung finalisiert werden:

1. **Response-Sprache:** Soll der User die Ausgabesprache wählen können (DE/EN)? 
   Aktuell: fester System-Prompt auf Deutsch.

2. **Speichern alter Analysen:** Soll der User alte KI-Analysen im LocalStorage
   speichern können (z.B. "Snapshot Juni 2026: Analyse von AAPL")?

3. **Grounding-Transparenz:** Sollen Quellen im UI immer anklickbar sein?
   (Empfehlung: ja, als unterstrichener Link)

4. **Kosten-Counter:** Soll nach jedem Call eine kleine Info "Kosten: ~0,04 ¢"
   angezeigt werden? (Empfehlung: ja, schafft Vertrauen)

5. **Rate-Limiting im Frontend:** Soll pro Tab/Feature nur 1 Call pro Minute
   möglich sein, um versehentliches Spammen zu verhindern?

6. **Comparison-Feature:** Soll der User zwei Modelle parallel abfragen
   können, um Antworten zu vergleichen? (Wahrscheinlich nicht nötig, overkill)

7. **Temperature-Einstellung für Power-User:** Soll es einen Advanced-Mode
   geben, in dem der User die Temperatur steuern kann?
   (Empfehlung: nein, zu fehleranfällig)

---

## 15. Zusammenfassung

Dieses Konzept beschreibt eine **hybride, optionale KI-Integration**:

- Die Webapp funktioniert weiter wie gehabt ohne API-Key
- User mit Key erhalten auf Knopfdruck tief individualisierte Analysen
- Alle KI-Antworten sind strukturiert (JSON), gerendert in konsistente UI-Karten
- 7 spezialisierte Prompt-Templates decken Altersvorsorge, Trading-Advisory und Aktien-Prognose ab
- Google Search Grounding wird gezielt eingesetzt (Aktien-News, Anbieter-Bewertungen)
- Klare Datenschutz-Kommunikation und rechtliche Disclaimer sind Pflicht
- Kosten liegen bei realistischer Nutzung unter 5 €/Monat

Der Aufwand für die Implementation ist moderat (~800-1200 LOC neu, verteilt auf 3-5 neue JS-Module + HTML-Erweiterungen), weil die statische Infrastruktur (Advisory-Cards, Tabs, Berechnung) bereits existiert und die KI-Integration diese nur **ergänzt**, nicht **ersetzt**.

---

# ANHANG: Detailliertes Prompt-Engineering

Dieser Anhang enthält die ausformulierten, umsetzungsreifen Prompts inklusive JSON-Schemas, Few-Shot-Beispielen und Robustheits-Hinweisen. Er ergänzt Kapitel 6 um die konkret einsetzbaren Texte.

---

## A1. Prompt-Engineering Grundsätze für diese Webapp

### A1.1 Verwendete Techniken

| Technik | Wo eingesetzt | Wirkung |
|---|---|---|
| **System-Prompt (Persona)** | Alle Calls | Konsistente Rolle, Ton, fachliche Grenzen |
| **Structured Output (JSON Schema)** | Alle Calls | Zuverlässiges Parsing, konsistente UI |
| **Chain-of-Thought (CoT) implizit** | Analyse-Prompts | Bessere Qualität durch strukturiertes Denken |
| **Few-Shot Prompting** | Kritische Templates (A, E, F) | Klartext-Beispiele erhöhen Konsistenz |
| **Grounding** | Templates B, D, F | Aktualität + Quellenangaben |
| **Input-Validation / Guardrails** | Im Prompt | Verhindert Halluzinationen bei fehlenden Daten |
| **Constraint-Specification** | Überall | Länge, Ton, Verbote klar formulieren |
| **Role-Playing mit Expertise** | System-Prompt | Stiftung Warentest, Verbraucherzentrale als Autoritäten |

### A1.2 Generationsparameter pro Template

| Template | temperature | topP | maxOutputTokens | thinkingConfig |
|---|---|---|---|---|
| A (Trading Advisory) | 0.5 | 0.95 | 3000 | budget: 1024 |
| B (Aktien-Prognose, Grounding) | 0.3 | 0.9 | 4000 | budget: 2048 |
| C (Steuerstrategie) | 0.4 | 0.92 | 2500 | budget: 1024 |
| D (Volatilität, Grounding) | 0.4 | 0.92 | 2000 | budget: 512 |
| E (Altersvorsorge) | 0.5 | 0.95 | 4000 | budget: 2048 |
| F (Anbieter-Deep-Dive, Grounding) | 0.3 | 0.9 | 3000 | budget: 1024 |
| G (Was-wäre-wenn) | 0.6 | 0.95 | 3000 | budget: 1024 |

**Faustregel:** Niedrigere Temperatur bei Faktenanalyse (B, C, F), höhere Temperatur bei szenarischer Beratung (G).

### A1.3 Warum Google-spezifische Features nutzen

- **`responseMimeType: "application/json"`** (Gemini-spezifisch): Erzwingt valides JSON. Unterscheidet sich von OpenAI, wo man "JSON mode" separat aktivieren muss.
- **`responseSchema`** (Gemini 1.5+): Liefert strikteres JSON als reines Prompt-Engineering. Validiert Struktur und Enum-Werte direkt im Modell.
- **`tools.googleSearch`**: Nur bei 2.5-Modellen. Alternativ: `googleSearchRetrieval` (älter, 1.5).
- **`thinkingConfig`** (Gemini 2.5): Gibt dem Modell mehr "Denkzeit" für komplexe Analysen. Führt zu besserer Qualität bei schwierigen Fragen (Trading-Prognosen) ohne dass der User sichtbaren Thinking-Output sieht.

---

## A2. Der universelle System-Prompt (vollständig ausformuliert)

Dieser Text wird in `systemInstruction.parts[0].text` übergeben. Er gilt für ALLE Calls.

```
Du bist "Finanzkompass", ein unabhängiger Finanzberater-Assistent für den deutschen
Markt. Deine Expertise umfasst: deutsches Steuerrecht (Abgeltungssteuer, Soli, KiSt,
Teilfreistellung, Halbeinkünfteverfahren, nachgelagerte Besteuerung), Altersvorsorge
(Schicht 1-3, Altersvorsorgedepot ab 2027), Aktien-Trading, ETF-Investments und
Verhaltensökonomik im Finanzkontext.

QUELLEN-HIERARCHIE (strikt einhalten):
1. Primär: Verbraucherzentralen, Stiftung Warentest, Finanztip, Bundesfinanzministerium,
   BaFin, BVI, Deutsche Bundesbank.
2. Sekundär: Etablierte Medien (Handelsblatt, FAZ, SZ), seriöse Wirtschaftsportale
   (finanzfluss, extraETF).
3. Bei Aktien-Analysen: Offizielle Unternehmensquellen, Reuters, Bloomberg,
   Analysten-Konsens.
4. NIEMALS: Reißerische YouTuber, Einzelanalysen ohne Quellenangabe, "Geheimtipps".

FACHLICHER STAND:
- Aktuelles Datum: {AKTUELLES_DATUM}
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
- Bei Prognosen: Immer Unsicherheit kommunizieren ("wahrscheinlich", "historisch",
  "der Markt erwartet ... aber ...").
- Bei Grounding: Quellen angeben und Datum der Information.
- Kontroverse Themen: Beide Seiten benennen, keine Partei ergreifen.

RECHTLICHE GRENZEN:
- Keine verbindliche Anlageberatung im Sinne des WpHG.
- Keine Steuerberatung im Sinne des StBerG.
- Keine Empfehlung einzelner Produkte mit Kaufanweisung.
- Du gibst EINSCHÄTZUNGEN und INFORMATIONEN, keine verbindlichen RATSCHLÄGE.
- Bei kritischen Entscheidungen: Immer Verweis auf Honorarberater/Verbraucherzentrale.

OUTPUT-FORMAT (zwingend):
- Antworte AUSSCHLIESSLICH in dem im Request spezifizierten JSON-Schema.
- Kein Markdown im Text (keine **, ##, -).
- Keine Emojis.
- Kein "Hier ist deine Analyse:" Einleitungstext — direkt das JSON.
- Paragraphen haben mindestens 80 Wörter, maximal 250 Wörter.
- Handlungsempfehlungen (action): 1-2 präzise Sätze.

VERBOTENE PHRASEN:
- "Das kann ich nicht wissen" (stattdessen: konkret erklären, was fehlt)
- "Jedes Produkt hat Vor- und Nachteile" (zu oberflächlich, sei konkret)
- "An deiner Stelle würde ich..." (keine 1. Person im Empfehlungskontext)
- "Sichere Rendite" / "Garantierter Gewinn" (nichts ist am Aktienmarkt garantiert)
```

---

## A3. Das universelle Response-Schema (vollständig spezifiziert)

Dieses Schema wird in `generationConfig.responseSchema` übergeben. Gemini validiert das Output-JSON dagegen.

```
{
  "type": "object",
  "required": ["meta", "summary", "insights", "disclaimers"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["analysisType", "generatedAt", "confidence"],
      "properties": {
        "analysisType": {
          "type": "string",
          "enum": [
            "trading_position_assessment",
            "stock_forecast",
            "trading_tax_strategy",
            "volatility_context",
            "pension_individual",
            "pension_provider_check",
            "pension_scenario"
          ]
        },
        "generatedAt": { "type": "string", "description": "ISO-8601 Timestamp" },
        "confidence": {
          "type": "string",
          "enum": ["low", "medium", "high"],
          "description": "Confidence der Analyse insgesamt. Niedrig bei fehlenden Daten oder Prognosen, hoch bei faktenbasierten Einschätzungen."
        },
        "usedGrounding": { "type": "boolean" }
      }
    },
    "summary": {
      "type": "object",
      "required": ["headline", "verdict"],
      "properties": {
        "headline": {
          "type": "string",
          "description": "Ein einzelner Satz, max 140 Zeichen, fasst die Kernbotschaft zusammen."
        },
        "verdict": {
          "type": "string",
          "enum": ["positive", "neutral", "negative", "mixed"],
          "description": "Gesamttendenz der Analyse."
        },
        "narrativeIntro": {
          "type": "string",
          "description": "2-3 Sätze Einleitungsparagraph, der die Analyse kontextuell einordnet (100-180 Wörter)."
        }
      }
    },
    "insights": {
      "type": "array",
      "minItems": 3,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["id", "severity", "category", "title", "body", "action"],
        "properties": {
          "id": { "type": "string", "description": "snake_case eindeutig" },
          "severity": { "type": "string", "enum": ["red", "amber", "green", "blue"] },
          "category": {
            "type": "string",
            "enum": ["risk", "tax", "opportunity", "psychology", "context",
                     "regulation", "provider", "macro", "technical"]
          },
          "title": { "type": "string", "description": "Max 70 Zeichen, prägnant, ohne Emoji." },
          "body": {
            "type": "string",
            "description": "Fließtext 80-250 Wörter. Nennt konkrete Zahlen aus dem Kontext. Kein Markdown."
          },
          "dataPoints": {
            "type": "object",
            "description": "Strukturierte Zahlen für UI-Highlighting. Keys sind semantische Identifier.",
            "additionalProperties": {
              "type": "object",
              "properties": {
                "value": { "type": "number" },
                "unit": { "type": "string", "enum": ["EUR", "percent", "years", "ratio", "count"] },
                "label": { "type": "string" }
              }
            }
          },
          "action": {
            "type": "string",
            "description": "1-2 Sätze konkrete Handlungsempfehlung. Imperativ-Form ('Prüfe...', 'Setze...')."
          },
          "sourceIndexes": {
            "type": "array",
            "items": { "type": "integer" },
            "description": "Indexe ins sources[]-Array, falls Aussagen quellenbasiert."
          }
        }
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "url"],
        "properties": {
          "title": { "type": "string" },
          "url": { "type": "string" },
          "publisher": { "type": "string", "description": "z.B. 'Stiftung Warentest', 'Verbraucherzentrale'" },
          "publishedAt": { "type": "string", "description": "ISO-Datum, falls bekannt" },
          "snippet": { "type": "string", "description": "Max 200 Zeichen Zitat/Zusammenfassung" }
        }
      }
    },
    "disclaimers": {
      "type": "array",
      "minItems": 2,
      "items": { "type": "string" },
      "description": "Mindestens: Keine Anlageberatung + Stand/Unsicherheit."
    },
    "followUpQuestions": {
      "type": "array",
      "maxItems": 3,
      "items": { "type": "string" },
      "description": "Optionale, vom Modell vorgeschlagene Folgefragen für Deep-Dives."
    }
  }
}
```

**Hinweis zur Schema-Abdeckung:** Gemini validiert das Schema beim Output. Bei Verstößen wird ein Retry gemacht. Optional: Im Frontend nochmal mit JSON Schema Validator prüfen und bei Fehlern auf statische Hinweise zurückfallen.

---

## A4. Prompt A — Trading Positions-Gesamteinschätzung (vollständig)

### A4.1 Context-Block (dynamisch gefüllt)

```
### KONTEXT FÜR DIESE ANALYSE

[POSITIONSDATEN]
- Aktie: SAP SE (Ticker: SAP.DE)
- Gehaltene Anzahl: 12 Stück
- Durchschnittlicher Kaufkurs: 142,30 €
- Aktueller Kurs: 168,50 €
- Gebühr pro Trade: 1,00 €
- Gehalten seit (Monate): 8

[KURSVERLAUF & VOLATILITÄT - LETZTE 6 MONATE]
- Trend: Aufwärts (+18,4%)
- Tägliche Volatilität: 1,32%
- Wöchentliche Volatilität: 2,95%
- Annualisierte Volatilität: 21,0%
- ATR(14) absolut: 2,12 €
- ATR(14) relativ zum Kurs: 1,26%
- Max Drawdown 6M: -7,8%
- Abstand zum 52-Wochen-Hoch: -4,2%
- Abstand zum 52-Wochen-Tief: +22,1%

[STEUERLICHE RAHMENDATEN DES USERS]
- Kirchensteuer: Nein (0%)
- Effektiver Steuersatz auf Kapitalerträge: 26,375%
- Sparerpauschbetrag: 1.000 €, davon bereits verbraucht: 280 €
- Verbleibender Freibetrag für dieses Jahr: 720 €

[USER-ZIELWERTE]
- Stop-Loss aktuell gesetzt bei: 155,00 €
- Zielkurs aktuell gesetzt bei: 195,00 €
- Gewünschter Netto-Gewinn: 500 €

[BERECHNETE ERGEBNISSE BEI VERKAUF ZUM AKTUELLEN KURS]
- Brutto-Gewinn: 312,40 €
- Teilfreistellung 30% angewendet auf: 218,68 €
- Nach Sparerpauschbetrag steuerpflichtig: 0,00 €
- Steuerbelastung gesamt: 0,00 €
- Tax Drag: 0,0%
- Netto-Gewinn: 312,40 €
- Break-Even Rebuy-Kurs: 166,90 € (1,0% unter aktuellem Kurs)
- Benötigter Kursrückgang für gewinnbringenden Rebuy: 1,0%
- Risk/Reward-Verhältnis (vom aktuellen Kurs): 1 : 1,95
- Maximaler Verlust bei SL-Auslösung: 162,12 € (nach Kosten)
- Maximaler Gewinn bei Zielkurs: 319,76 € (netto)

[SPARPLAN-VERGLEICH]
- Hypothetischer Sparplan (50 €/Monat) hätte nach 8 Monaten ergeben: 378,20 €
- Dein Timing-Ergebnis: 402,00 € aktueller Wert
- Differenz: +23,80 € zugunsten deines Timings

[KONTEXT]
- Aktuelles Datum: 2026-04-15
- Tage bis Jahresende: 261
```

### A4.2 Task-Prompt

```
AUFGABE:
Erstelle eine umfassende Einschätzung dieser Trading-Position für einen maessig
erfahrenen Trader. Gib 5-7 Insights zurück, gewichtet nach Wichtigkeit
(rot/amber zuerst, grün/blau danach).

VERPFLICHTENDE THEMEN (jedes MUSS ein Insight werden, wenn Daten vorhanden):

1. RISIKO-CHANCEN-BEWERTUNG:
   Bewerte das R:R-Verhältnis von 1:1,95 unter Einbeziehung der Volatilität
   (ATR 1,26%). Ist der Stop-Loss sinnvoll gesetzt oder riskiert der User
   einen Auslöser durch normales Marktrauschen?

2. STEUER-SITUATION:
   Der User ist aktuell steuerfrei (Freibetrag reicht). Erkläre warum und
   was das für die Entscheidung bedeutet. Beachte: wenn er bis Jahresende
   auf mehr Gewinn wartet, kann er den Freibetrag nicht mehr voll nutzen.

3. BREAK-EVEN-REBUY REALISMUS:
   Benötigter Rückgang: 1,0%. Tägliche Vola: 1,32%. Das ist sehr gut machbar.
   Ordne das ein: Ist "verkaufen und billiger zurückkaufen" hier eine sinnvolle
   Strategie? Was sind die Gegenargumente (Timing-Risiko, Transaktionskosten)?

4. PSYCHOLOGISCHE FALLEN:
   Bei +18,4% Gewinn und Nähe zum 52W-Hoch: Warnen vor
   Disposition-Effekt (Gewinner zu früh verkaufen) vs. Verankerungs-Effekt
   (am Kaufkurs kleben bleiben).

5. SPARPLAN-ALTERNATIVE:
   Das Timing war bisher marginal besser (+23,80 €). Was sagt das aus?
   Ist das Zufall oder ein robustes Timing-Signal?

6. STOP-LOSS-STRATEGIE:
   SL bei 155 € ist 8,0% unter aktuellem Kurs. Das ist ca. 6x ATR. Das ist
   konservativ. Bewerte ob eher Trailing-Stop sinnvoll wäre zur Absicherung
   bereits angesammelter Gewinne.

7. OPTIONAL - AKTUELLE HANDLUNGSOPTIONEN:
   Drei klare Szenarien: (a) Halten+Ziel hochziehen, (b) Teilverkauf zur
   Gewinnsicherung, (c) Halten+Trailing-Stop. Bewerte welches am besten passt.

WICHTIGE REGELN:
- Nenne konkrete Zahlen aus dem Kontext in JEDEM Insight.
- Der User soll nach dem Lesen EINE klare nächste Handlung haben.
- Wenn Daten fehlen (z.B. Branche nicht angegeben): sag es explizit, spekuliere nicht.
- Keine Kursprognose — dafür gibt es ein eigenes Feature.
- Confidence-Wert in meta: "high" wenn alle Daten da sind, "medium" wenn einige fehlen.
```

### A4.3 Few-Shot Beispiel (ideale Ausgabe, in den Prompt einfügbar für Konsistenz)

```
BEISPIEL FÜR EIN GUTES INSIGHT:

{
  "id": "stop_loss_too_tight_vs_atr",
  "severity": "amber",
  "category": "risk",
  "title": "Stop-Loss 6× ATR entfernt — konservativ, aber bewusst wählen",
  "body": "Dein Stop-Loss von 155,00 € liegt 13,50 € unter dem aktuellen Kurs von 168,50 €, was etwa dem 6-fachen der durchschnittlichen Tagesschwankung (ATR 2,12 €) entspricht. Das ist ein defensiver Wert: Die Wahrscheinlichkeit, durch normales Marktrauschen ausgestoppt zu werden, ist gering. Gleichzeitig bedeutet dieser Puffer aber auch, dass du im Fall eines echten Trendbruchs einen größeren Verlust akzeptierst (bis zu 13,50 € pro Aktie × 12 = 162 € nach Gebühren). Bei einer Aktie, die aktuell 4,2% unter ihrem 52-Wochen-Hoch notiert, wäre ein engerer Trailing-Stop zur Gewinnsicherung eine Alternative — er zieht automatisch mit, wenn der Kurs weiter steigt.",
  "dataPoints": {
    "stopLoss": { "value": 155.00, "unit": "EUR", "label": "Stop-Loss Kurs" },
    "atrAbsolute": { "value": 2.12, "unit": "EUR", "label": "ATR (14)" },
    "slDistanceInATR": { "value": 6.3, "unit": "ratio", "label": "SL-Abstand in ATR" },
    "maxLossEur": { "value": 162.00, "unit": "EUR", "label": "Max Verlust" }
  },
  "action": "Ziehe einen Trailing-Stop bei 3-4× ATR unter aktuellem Kurs (ca. 161-163 €) in Betracht. Er sichert bisherige Gewinne und bleibt außerhalb normaler Schwankungen.",
  "sourceIndexes": []
}
```

---

## A5. Prompt B — Aktien-Zukunftsanalyse (mit Grounding)

### A5.1 Context-Block

```
### KONTEXT

[AKTIE]
- Ticker-Symbol: {symbol}
- Unternehmen: {companyName}
- Börse: {exchange}
- Aktueller Kurs: {currentPrice} €
- 52W-Hoch: {yearHigh} €
- 52W-Tief: {yearLow} €
- Position relativ zum 52W-Hoch: {distanceToHigh}%

[USER-POSITION]
- Gehalten seit: {holdingPeriod} Monate
- Durchschnittlicher Einstiegspreis: {buyPrice} €
- Aktuelle Performance: {gainPct}%

[TECHNISCHE DATEN]
- Trend (6 Monate): {trend}
- Annualisierte Volatilität: {annualVol}%
- Max Drawdown letzte 6 Monate: {maxDrawdown}%

[ZEITLICHER KONTEXT]
- Analyse-Datum: {currentDate}
- Relevanter Nachrichtenzeitraum: letzte 4 Wochen ({fourWeeksAgo} bis {currentDate})
```

### A5.2 Task-Prompt

```
AUFGABE:
Führe eine fundierte, aktuelle Analyse der Aktie {symbol} ({companyName}) durch.
Nutze die Google-Suche AKTIV, um aktuelle Informationen zu recherchieren.

RECHERCHE-AGENDA (in dieser Reihenfolge):

SCHRITT 1 — UNTERNEHMENSSPEZIFISCHE NEWS (priorität 1):
Suche nach:
- "{companyName} aktuell Nachrichten {aktuellesJahr}"
- "{companyName} Quartalsbericht"
- "{companyName} Analyst rating"
- "{ticker} news last 30 days"
Identifiziere 2-3 wichtigste Events der letzten 4 Wochen.

SCHRITT 2 — BRANCHEN- UND MAKRO-KONTEXT:
Suche nach:
- Branche von {companyName}: aktuelle Trends
- Relevante Regulierung (EU, US): Zölle, AI Act, Emissionsvorgaben etc.
- Währung, falls nicht-EUR: aktuelle Entwicklung

SCHRITT 3 — ANALYSTEN-KONSENS:
Suche nach:
- "{ticker} analyst price target consensus"
- "{ticker} buy hold sell rating"
Finde: durchschnittliches Kursziel, neueste Up/Downgrades, Ratio Kaufen/Halten/Verkaufen.

SCHRITT 4 — CHART-KONTEXT:
Ordne den aktuellen Kurs ({currentPrice} €) in den Verlauf ein:
- Nähe zum 52W-Hoch ({distanceToHigh}% unter)
- Vergleich mit historischem Durchschnitts-Kursniveau (falls bekannt)
- Relevante technische Marken (z.B. 200-Tage-Linie)

RISIKEN & CHANCEN (insight-Generierung):

Generiere folgende Insights:
- 1-2 Insights "Kurzfristig (1-4 Wochen)" — was erwartet der Markt in den nächsten Wochen?
- 1-2 Insights "Mittelfristig (6-12 Monate)" — strategische Positionierung
- 1-2 Insights "Hauptrisiken" — was könnte den Kurs deutlich drücken?
- 1-2 Insights "Hauptchancen" — was könnte positiv überraschen?

KRITISCHE FORDERUNGEN:
1. JEDE Aussage über aktuelle Ereignisse MUSS einen sourceIndex haben.
2. Wenn du eine Zahl nennst (Kursziel, Marktanteil, etc.), MUSS eine Quelle dahinter sein.
3. KEINE erfundenen Zahlen. Wenn du etwas nicht findest: "Aktuelle Daten dazu
   waren nicht verfügbar."
4. KEINE Kursprognose mit konkretem Wert ("Wird auf 200 € steigen"). Stattdessen:
   "Analysten-Konsens sieht 12-Monats-Kursziel bei Ø 195 €, Range 170-220 €."
5. Verdict im summary: "positive" nur bei klar überwiegenden Chancen, "negative"
   nur bei klaren Warnzeichen, ansonsten "mixed" oder "neutral".
6. Confidence-Wert: "high" nur wenn alle 4 Recherche-Schritte erfolgreich waren
   UND aktuelle Informationen (< 4 Wochen alt) gefunden wurden.
7. Kurze Snippets in sources[].snippet als Belege.
8. Disclaimer: Explizit erwähnen, dass vergangene Ergebnisse keine zukünftigen
   Renditen garantieren.
```

### A5.3 Anti-Halluzinations-Guard

Dieser Block wird am Ende des Prompts angehängt:

```
SELBSTPRÜFUNG VOR DER ANTWORT:
1. Habe ich für JEDE spezifische Zahl eine Quelle?
2. Stammen die Quellen aus den letzten 30 Tagen? (wenn nein: Confidence "medium")
3. Habe ich keine Versprechen über zukünftige Kurse gemacht?
4. Habe ich Unsicherheiten klar kommuniziert?

Wenn eine Antwort "nein" ist: die betreffende Aussage umformulieren oder weglassen.
```

---

## A6. Prompt C — Steuerstrategie-Assistent

### A6.1 Context & Task (kombiniert)

```
### KONTEXT

[STEUER-SITUATION]
- Bundesland: {bundesland}
- Kirchensteuer: {kirchensteuerJaNein} ({kirchensteuerRate}%)
- Effektiver Gesamtsteuersatz (Abgeltung + Soli + ggf. KiSt): {effectiveTaxRate}%
- Sparerpauschbetrag Jahresbudget: 1.000 €
- Bereits verbraucht in diesem Jahr: {freistellungUsed} €
- Verbleibender Freibetrag: {freistellungRemaining} €

[POSITION]
- Unrealisierter Gewinn (aktuell): {unrealizedGain} €
- Nach Teilfreistellung 30% steuerpflichtig: {taxableGain} €
- Nach Freibetrag steuerpflichtig: {afterSPB} €
- Potenzielle Steuer bei heutigem Verkauf: {potentialTax} €

[ZEIT-KONTEXT]
- Heute: {currentDate}
- Tage bis Jahresende: {daysUntilYearEnd}
- Aktuelles Quartal: Q{quarter}

### AUFGABE

Gib 4-6 konkrete, umsetzbare Steueroptimierungs-Empfehlungen für diese
Situation. Jede Empfehlung MUSS:
- Mit einer konkreten Zahl aus dem Kontext rechnen
- Eine klare Handlung benennen (VERKAUFEN bis wann, AUFTEILEN wie, etc.)
- Rechtlich sauber sein (nur legale Gestaltung, keine Tricks)

THEMEN-CHECKLISTE (wähle die relevanten):

A. FREIBETRAG-AUSNUTZUNG VOR JAHRESENDE
   Wenn: freistellungRemaining > 0 UND unrealizedGain > 0 UND daysUntilYearEnd < 120
   Aktion: Teilweise Gewinnrealisierung zum Füllen des Freibetrags.
   Quantifiziere: "Du könntest {X} € Gewinn steuerfrei realisieren, Ersparnis {Y} €."

B. VERLUSTVERRECHNUNGSTOPF (wenn unrealizedGain < 0)
   Verluste können mit anderen Kapitalgewinnen verrechnet werden.
   Hinweis auf Verlustbescheinigung bei Depotwechsel.

C. KIRCHENSTEUER-IMPACT (wenn kirchensteuerRate > 0)
   Über X Jahre bei Y € Gewinn/Jahr: Z € Kirchensteuer. 
   (Keine "tritt aus der Kirche aus"-Empfehlung, nur sachliche Einordnung.)

D. TEILFREISTELLUNG 30% BEI AKTIENFONDS
   Erkläre warum nur 70% des Gewinns steuerpflichtig sind und wie das
   wirkt. Unterschied zu Rentenfonds-ETFs (0% Teilfreistellung).

E. FIFO-STRATEGIE UND MULTI-DEPOT
   Bei stark gewachsener Position: Aufteilung auf 2 Depots ermöglicht
   selektiven Verkauf junger Tranchen (niedrigerer Gewinn, weniger Steuer).
   Rechtlich sauber, von Finanztip dokumentiert.

F. TIMING: VERKAUF VOR/NACH JAHRESWECHSEL
   Wenn aktuell bereits hoher Gewinn + voller Freibetrag verbraucht:
   Jahreswechsel abwarten kann sinnvoll sein (neuer Freibetrag).

G. STEUEREINBEHALT BEI NEOBROKERN
   Hinweis: Wird automatisch von TR/Scalable abgeführt, nichts zu tun.

WICHTIG:
- NIE empfehlen, aus der Kirche auszutreten oder Steuerhinterziehung nahelegen.
- Keine "dogmatische" Empfehlung (z.B. "Immer verkaufen vor Jahresende") —
  stets abhängig von der Situation.
- Bei hoher Komplexität: Verweis auf Steuerberater empfehlen.
```

---

## A7. Prompt E — Individuelle Altersvorsorge-Analyse (das wichtigste Prompt)

### A7.1 Context-Block (umfangreich)

```
### KONTEXT

[PERSÖNLICHE SITUATION]
- Aktuelles Alter: {currentAge} Jahre
- Geplantes Rentenalter: {retirementAge} Jahre
- Anspardauer: {years} Jahre
- Anzahl Kinder: {numberOfChildren}
- Berufseinsteiger unter 25: {isCareerStarter}

[SPARVERHALTEN]
- Monatliche Sparrate: {monthlyAmount} €
- Startkapital (bereits angespart): {initialBalance} €
- Jährliche Einzahlung: {yearlyAmount} €
- Gesamt-Einzahlung über Laufzeit: {totalLifetimeContribution} €

[STEUERSITUATION]
- Persönlicher Steuersatz heute: {personalTaxRateCurrent}%
- Erwarteter Steuersatz im Rentenalter: {personalTaxRateRetirement}%
- Steuersatz-Differenz (je größer, desto besser für AVD): {taxRateDiff} Prozentpunkte
- Kirchensteuer: {kirchensteuerJaNein}
- Bundesland: {bundesland}

[ANBIETERDATEN RENTENVERSICHERUNG]
- Gewählt: {providerName}
- Kostenquote p.a.: {providerCostRate}%
- Typ: {providerType} (netto/provisionsbasiert/digital)

[BERECHNETE ERGEBNISSE NACH ALLEN KOSTEN & STEUERN]

ETF-Sparplan:
- Portfolio bei Renteneintritt: {etfPortfolio} €
- Gesamtkosten über Laufzeit: {etfCosts} €
- Vorabpauschale-Steuern kumuliert: {etfVPTax} €
- Auszahlungssteuer: {etfPayoutTax} €
- NETTO nach Verkauf: {etfNet} €
- Effektive Rendite p.a.: {etfEffReturn}%

Rentenversicherung:
- Portfolio bei Renteneintritt: {rvPortfolio} €
- Gesamtkosten über Laufzeit: {rvCosts} €
- Halbeinkünfte-Regel erfüllt: {rvMeets12_62}
- Auszahlungssteuer: {rvPayoutTax} €
- NETTO nach Verkauf: {rvNet} €
- Effektive Rendite p.a.: {rvEffReturn}%

Altersvorsorgedepot:
- Portfolio bei Renteneintritt: {avdPortfolio} €
- Eingezahlt (eigen): {avdOwnContribution} €
- Zulagen kumuliert: {avdSubsidies} €
  davon Grundzulage: {grundzulageTotal} €
  davon Kinderzulage: {kinderzulageTotal} €
  davon Berufseinsteigerbonus: {bonusTotal} €
- Steuerersparnis durch Sonderausgabenabzug: {avdTaxDeduction} €
- Gesamtkosten: {avdCosts} €
- Auszahlungssteuer (nachgelagert): {avdPayoutTax} €
- NETTO: {avdNet} €
- NETTO inkl. Steuerersparnis heute: {avdNetInclDeduction} €

Kombi-Strategie (wenn Sparrate > 150 €):
- Aufteilung: {kombiSplit}
- NETTO gesamt: {kombiNet} €

[RANGFOLGE NACH NETTO-AUSZAHLUNG]
1. {firstPlace}: {firstNet} €
2. {secondPlace}: {secondNet} €
3. {thirdPlace}: {thirdNet} €
4. {fourthPlace}: {fourthNet} €  (optional wenn Kombi)
```

### A7.2 Task-Prompt

```
AUFGABE:
Erstelle eine umfassende, PERSÖNLICHE Altersvorsorge-Analyse für diese
konkrete Person. NICHT nur Zahlen wiederholen — interpretiere, ordne ein,
warne, empfehle.

PFLICHT-INSIGHTS (mindestens diese Themen werden abgedeckt):

1. HAUPTEMPFEHLUNG MIT FACHLICHER BEGRÜNDUNG
   Das rechnerisch beste Produkt ist {firstPlace}. Aber: passt es WIRKLICH
   zu dieser Lebenssituation? Beziehe ein:
   - Alter und Anspardauer: {years} Jahre — reicht das für 12/62-Regel bei RV?
   - Flexibilitätsbedarf bei {currentAge}-jährigen (Jobwechsel, Umzug, Immobilie)
   - Verbraucherzentrale-Position: Was sagt sie zur Hauptempfehlung?
   - Ist die Differenz zum Zweitplatzierten signifikant ({firstNet} vs {secondNet})
     oder marginal?

2. STEUER-HEBEL-ANALYSE
   Der Steuersatz-Unterschied (heute {personalTaxRateCurrent}% vs. Rente
   {personalTaxRateRetirement}%) ist der KRITISCHE Faktor für das AVD.
   - Wenn Differenz > 10 Prozentpunkte: AVD-Zulagen + Sonderausgabenabzug
     extrem attraktiv. Erkläre den Hebel mit Zahlen.
   - Wenn Differenz < 5 Prozentpunkte: nachgelagerte Besteuerung frisst
     Zulagen-Vorteil teilweise auf. AVD evtl. überschätzt.

3. KOSTEN-KRITIK NACH VERBRAUCHERZENTRALE
   Die Kosten der {providerName} betragen {providerCostRate}% p.a.
   Das bedeutet über {years} Jahre: {rvCosts} € absolut.
   - Verbraucherzentrale-Schwelle: Kostenquote > 1,5% p.a. gilt als
     kritisch für passive Strategien.
   - Vergleich: ETF-Sparplan hat nur {etfCosts} € Kosten — das sind
     {costDifferenceEur} € weniger. Diese Differenz MUSS durch Steuervorteil
     aufgewogen werden, damit RV lohnt.
   - Fazit: Ist die RV mit diesem Anbieter kostenmäßig gerechtfertigt?

4. LEBENSPHASE-RISIKEN
   In den nächsten 10 Jahren typische Ereignisse:
   - Jobwechsel / Gehaltssprung / Arbeitslosigkeit
   - Kinderplanung / Scheidung
   - Immobilienkauf mit Kapitalbedarf
   - Krankheit mit Einkommensausfall
   Analysiere: Welches Produkt ist AM FLEXIBELSTEN bei vorzeitigem
   Kapitalbedarf? Welches am starrsten?

5. KINDER-ZULAGEN-HEBEL (wenn numberOfChildren > 0)
   Über die Laufzeit: {kinderzulageTotal} € nur von den Kindern.
   Das entspricht {kinderPercentage}% der Gesamtzulagen.
   Bewerte: Ohne Kinder wäre der Vergleich anders — ist AVD für diese
   Familiensituation besonders attraktiv?

6. BERUFSEINSTEIGERBONUS (wenn isCareerStarter)
   Einmal 200 €, aber: über {years} Jahre mit {expectedReturn}% Rendite
   wachsen diese 200 € auf etwa {growthOfBonus} € an. Rechne das vor.

7. KOMBI-STRATEGIE ODER PUREr-ANSATZ (wenn monthlyAmount > 150)
   Aufteilung {kombiSplit} erzielt {kombiNet} €.
   - Ist das signifikant besser als "alles in {firstPlace}"?
   - Nachteile: Zwei Produkte parallel verwalten.
   - Empfehlung: Lohnt sich der Aufwand?

8. GESETZES-UNSICHERHEIT & SZENARIEN
   Über {years} Jahre können sich ändern:
   - Steuersätze (historisch: erhöht sich die Abgeltungssteuer nie, aber
     Einkommensteuer schon)
   - Zulagenhöhe (Altersvorsorgedepot ist NEU, politisch verwundbar)
   - Vorabpauschale-Basiszins
   - Halbeinkünfte-Regel könnte reformiert werden
   Welche Produkt-Wahl ist am ROBUSTEN gegen solche Änderungen?

WICHTIGE STILE-VORGABEN:

- Schreibe wie ein Honorarberater zu einem Klienten: konkret, beziffert,
  abwägend, nicht belehrend.
- Verwende KEINE Standard-Phrasen wie "Diese Entscheidung sollte gut
  überlegt sein" oder "Alles hat Vor- und Nachteile". STATTDESSEN:
  konkrete Vor- und Nachteile benennen mit Zahlen.
- Wenn ein Produkt schlecht abschneidet: nicht verteufeln, sondern
  erklären WARUM und in welcher Situation es besser wäre.
- Wenn ein Produkt gut abschneidet: nicht hypen, sondern auch auf
  Risiken hinweisen.

CONFIDENCE-REGEL für meta.confidence:
- "high": Alle Daten vollständig, Steuersatz-Differenz >= 8pp, Anspardauer
  >= 20 Jahre
- "medium": Daten lückenhaft oder kurze Anspardauer
- "low": Widersprüchliche Daten oder Alter nahe Rentenalter
```

---

## A8. Prompt F — Anbieter-Deep-Dive (mit Grounding)

### A8.1 Context & Task

```
### KONTEXT

Geprüfter Anbieter:
- Name: {providerName}
- Produkt: {productName}
- Angegebene Gesamtkosten (vom User ausgewählt): {totalCostRate}% p.a.
- Typ laut Anbieter: {type} (netto/provision/digital)
- In unserem internen Datensatz hinterlegt: {notes}

Aktuelles Datum: {currentDate}

### AUFGABE

Recherchiere aktuelle, unabhängige Informationen zu {providerName} und
bewerte sie für den User.

SUCHSTRATEGIE:
1. "{providerName} Stiftung Warentest" — neueste Testberichte (letzte 2 Jahre)
2. "{providerName} Finanztip Empfehlung"
3. "{providerName} Verbraucherzentrale"
4. "{providerName} Solvency II Quote" — finanzielle Solidität
5. "{providerName} Beschwerden BaFin"
6. "{providerName} Kundenbewertung" — Trustpilot, Google Reviews

GENERIERE INSIGHTS:

A. KOSTEN-TRANSPARENZ (category: "provider")
   - Sind die angegebenen {totalCostRate}% mit den Recherche-Funden konsistent?
   - Gibt es versteckte Zusatzkosten (z.B. Abschlusskosten bei Provisionstarifen)?
   - Wie schneidet der Anbieter im Preisvergleich ab?

B. UNABHÄNGIGE BEWERTUNGEN (category: "provider")
   - Was sagt Stiftung Warentest? (Note, Testsieger-Status)
   - Was sagt Finanztip? (Empfehlung, Warnung)
   - Was sagt Verbraucherzentrale?
   Zitiere konkret und gib Quellen.

C. FINANZIELLE SOLIDITÄT (category: "risk")
   - Solvency-II-Quote des Versicherers (empfohlen: > 200%)
   - Insolvenzrisiko laut Ratings (Moody's, S&P falls verfügbar)
   - Protektor-Mitgliedschaft (sollte bei deutschen Lebensversicherern
     Standard sein)

D. KUNDENZUFRIEDENHEIT (category: "provider")
   - Beschwerden bei BaFin (Beschwerdestatistik)
   - Kunden-Reviews: häufige Lobpunkte und Kritikpunkte
   - Service-Qualität, Abwicklung von Rentenauszahlungen

E. EMPFEHLUNG (category: "opportunity" oder "risk")
   - Klare Einordnung: "Solide Wahl", "Prüfen - Alternativen vergleichen",
     "Von Abschluss abraten - Kosten zu hoch / Qualität mangelhaft"
   - Konkrete Alternativen nennen, wenn anderer Anbieter besser wäre

VERBOTEN:
- Werbetexte des Anbieters wiedergeben
- Unkritisch positive Anbieter-Aussagen übernehmen
- Bewertungsportale ohne Verifikation zitieren

QUELLEN-PFLICHT:
Jede faktische Aussage muss per sourceIndex einer Quelle zuordenbar sein.
Wenn keine seriöse Quelle gefunden wird: "Konnte dazu keine unabhängigen
Informationen finden" — nicht spekulieren.
```

---

## A9. Prompt G — Was-wäre-wenn Szenario-Analyse

### A9.1 Vordefinierte Szenarien

Der User wählt aus einer Liste (oder definiert frei):

1. "Steuersatz im Alter steigt um 10 Prozentpunkte"
2. "Altersvorsorgedepot-Zulagen werden ab 2030 halbiert"
3. "Finanzkrise in Jahr {N}: Portfolio-Wert halbiert, erholt sich in 5 Jahren"
4. "Frührentner: Auszahlung 5 Jahre früher als geplant"
5. "Basiszins steigt dauerhaft auf 4,5% (Vorabpauschale-Explosion)"
6. "Halbeinkünfteverfahren wird 2030 abgeschafft"
7. "Freier Szenariotext des Users"

### A9.2 Context & Task

```
### KONTEXT

Basis-Berechnung (aus der Webapp):
- ETF-Sparplan NETTO: {etfNet} €
- Rentenversicherung NETTO: {rvNet} €
- Altersvorsorgedepot NETTO: {avdNet} €
- Laufzeit: {years} Jahre

Angenommenes Szenario:
"{scenarioDescription}"

Parameter-Modifikationen (falls vorberechnet):
{scenarioParamChanges}

### AUFGABE

Analysiere das Szenario "{scenarioDescription}" detailliert:

1. BETROFFENHEITS-ANALYSE
   Für jedes der 3 Produkte:
   - Wie stark reagiert es auf diese Veränderung? (Hoch / Mittel / Gering)
   - Warum? (Mechanismus erklären)
   - Grobe Quantifizierung der Auswirkung (Prozent oder Euro-Range)

2. RELATIVE GEWINNER UND VERLIERER
   - Welches Produkt ist am stärksten negativ betroffen?
   - Welches ist am ROBUSTESTEN?
   - Ändert sich die Rangfolge im Vergleich zum Basisszenario?

3. HISTORISCHE EINORDNUNG
   Wie oft kam so ein Szenario in den letzten 50 Jahren vor?
   (Bei "Finanzkrise": 2008, 2020; bei "Steuererhöhung": historische Präzedenzfälle)

4. MITIGATION
   Welche konkreten Maßnahmen könnte der User JETZT treffen, um sich
   gegen dieses Szenario abzusichern?
   - Produktwechsel?
   - Diversifikation?
   - Reservebildung außerhalb dieser Produkte?
   - Risk-Monitoring (was beobachten, um rechtzeitig zu reagieren)?

5. KOMMUNIKATION DER UNSICHERHEIT
   WICHTIG: Dieses Szenario ist hypothetisch. Gib ehrlich an:
   - Wie wahrscheinlich ist es (qualitativ)?
   - Was sind die Annahmen?
   - Was könnte die Analyse ungültig machen?

Für freien Szenariotext vom User:
- Interpretiere den Szenariotext sorgfältig.
- Frage nicht nach Details (das ist One-Shot).
- Mache explizite Annahmen, wenn das Szenario mehrdeutig ist ("Ich nehme
  an, du meinst ... — falls du etwas anderes gemeint hast, berücksichtige ...")
```

---

## A10. Prompt-Robustheit & Edge Cases

### A10.1 Fehlende Daten im Kontext

In JEDEM Prompt-Template wird folgender Passus eingefügt:

```
UMGANG MIT FEHLENDEN DATEN:
Wenn ein Feld im Kontext leer, null, 0 (wo > 0 erwartet) oder "unknown"
ist, behandle es so:
- NIEMALS Zahlen erfinden oder aus anderen ableiten.
- In der Antwort explizit erwähnen: "Daten zu [X] liegen nicht vor —
  Analyse zu diesem Aspekt daher eingeschränkt."
- Das Insight für diesen Aspekt ENTFÄLLT oder wird als category="context"
  mit severity="blue" markiert.
- Senke confidence auf "medium" wenn > 2 wichtige Felder fehlen, auf "low"
  wenn > 5.
```

### A10.2 Extreme / unsinnige Eingaben

```
VALIDITÄTS-CHECK:
Wenn Eingabewerte außerhalb plausibler Ranges liegen:
- Alter > 70 oder < 18: "Die eingegebene Altersangabe ist ungewöhnlich,
  die Analyse könnte nicht zutreffend sein."
- Monatliche Sparrate > 5.000 €: In der Realität selten, Prüfung nahelegen.
- Erwartete Rendite > 15% p.a. dauerhaft: Historisch unrealistisch,
  Hinweis aussprechen.
- Kaufkurs = 0, Anzahl = 0: Analyse nicht sinnvoll, entsprechend antworten.

Gib in diesen Fällen ein "context"-Insight mit severity "amber" aus, das
die Plausibilitäts-Warnung enthält. confidence = "low".
```

### A10.3 Anti-Halluzinations-Absicherungen

Jeder Prompt endet mit:

```
ABSCHLUSS-PRÜFUNG:
Bevor du antwortest, prüfe:
- ✓ Alle Zahlen in deiner Antwort stammen entweder aus dem Kontext oder
  sind durch Quellen (bei Grounding) belegt.
- ✓ Du hast keine Behauptungen zu Ereignissen aufgestellt, die du nicht
  verifizieren konntest.
- ✓ Alle Insights haben konkrete Handlungsempfehlungen.
- ✓ disclaimers[] enthält mindestens: "Keine Anlageberatung/Steuerberatung"
  UND "Stand: {heute}, Gesetze/Daten können sich ändern".
- ✓ Bei Prognosen hast du Unsicherheit sprachlich markiert.
- ✓ Output ist valides JSON gemäß Schema (kein Markdown, keine Emojis).
```

---

## A11. Implementation-Hinweise für die Prompt-Builder-Funktion

### A11.1 Prompt-Assembly Reihenfolge

```
Finaler Prompt besteht aus (in dieser Reihenfolge):

1. [systemInstruction] — Universeller System-Prompt (A2)
2. [user content] Start:
   a) "### KONTEXT" Block mit dynamisch eingesetzten Werten
   b) "### AUFGABE" Block mit Template-spezifischem Task
   c) "### FEW-SHOT BEISPIEL" (optional, nur bei A, E)
   d) "### OUTPUT-SCHEMA" mit kurzer Referenz auf das Schema
   e) "### ABSCHLUSS-PRÜFUNG" mit den Guards aus A10.3
3. [tools] — nur bei B, D, F: googleSearch
4. [generationConfig] — responseMimeType, responseSchema, temperature
```

### A11.2 Sprach-Variablen (i18n-ready, falls später multi-language)

Aktuell alles Deutsch. Falls Erweiterung: sprachspezifische System-Prompts
als separate Konstanten ablegen (`SYSTEM_PROMPT_DE`, `SYSTEM_PROMPT_EN`).

### A11.3 Prompt-Versionierung

Jeder Prompt-Template hat eine Versionsnummer (z.B. `PROMPT_A_V2`).
Bei Änderungen: Version hochzählen, alten Prompt im Git-History bewahren.
Das hilft bei A/B-Testing und Debugging.

### A11.4 Caching-Strategie

Ein SHA-256-Hash aus `(model + systemPrompt + contextBlock + task)` kann
als Cache-Key dienen. Wenn User bei identischem Input erneut Analyse
anfordert (z.B. nach Navigationswechsel): serviere aus LocalStorage-Cache
mit TTL von 1 Stunde. Das spart Kosten und verbessert UX.

---

## A12. Prompt-Evaluation: Wie testet man die Qualität?

### A12.1 Test-Suite-Szenarien (manuell durchspielen)

Definiere 10 Test-Cases pro Template mit bekannter "richtiger" Antwort:

| Nr | Template | Szenario | Erwartete Kern-Aussage |
|---|---|---|---|
| 1 | A | Starker Gewinn +30%, eng gesetzter SL | Warnung SL zu eng, Trailing-Stop Vorschlag |
| 2 | A | Verlust -15%, kein SL gesetzt | Warnung "kein SL" + Verlustbegrenzungs-Dringlichkeit |
| 3 | C | Q4, 800 € Freibetrag übrig, 600 € Gewinn | Empfehlung: Gewinn vor Jahresende realisieren |
| 4 | E | 25 Jahre alt, 150 €/Monat, 2 Kinder | AVD klar empfohlen, Kinder-Hebel hervorgehoben |
| 5 | E | 55 Jahre alt, 12 Jahre Anspardauer, kein Partner | RV + Kosten-Kritik, wenn AL nicht unter 12 Jahren |
| 6 | B | Tesla im Moment großer Anti-Trend | Grounding findet News, Analyse ausgewogen |
| 7 | F | Provisionstarif-Anbieter mit 2,5% Kosten | Warnung, Nettotarif-Alternative |
| 8 | G | Szenario "Börsencrash in Jahr 15" | RV am robustesten (Steuerstundung), AVD am verwundbarsten |
| 9 | A | Sehr kleine Position (< 100 €) | Fee-Impact-Warnung als dominantes Insight |
| 10 | E | Fast identische Netto-Werte aller 3 Produkte | Fokus auf Flexibilität/Lebenssituation statt nur Zahlen |

### A12.2 Automatisierte Qualitätsprüfungen

Die Webapp kann nach jeder KI-Antwort automatisch prüfen:
- ✓ JSON valide & schema-konform
- ✓ Mindestens 3 insights
- ✓ Jedes insight hat body.length > 80 Wörter
- ✓ disclaimers vorhanden
- ✓ Keine Emojis im Text
- ✓ Währungsformat korrekt (€ mit Punkt/Komma)

Bei Fehlschlag: Retry (max 1x) mit verschärftem Prompt, sonst Fallback
auf statische Hinweise.

---

## A13. Finale Prompt-Checkliste (für die spätere Implementation)

Vor jedem API-Call ist sicherzustellen:

- [ ] System-Prompt aus A2 ist gesetzt
- [ ] Kontext-Block ist vollständig aus aktuellen Store-Werten gefüllt
- [ ] Nullwerte/leere Felder sind als "n/a" oder "unknown" markiert
- [ ] responseSchema aus A3 ist übergeben
- [ ] responseMimeType = "application/json"
- [ ] temperature entspricht A1.2
- [ ] Bei Templates B, D, F: tools enthält googleSearch
- [ ] maxOutputTokens ist gesetzt (nicht unendlich)
- [ ] Der resultierende Prompt ist < 10k Tokens (Kostenkontrolle)
- [ ] Anti-Halluzinations-Block aus A10.3 ist angehängt
- [ ] Cache-Key wurde berechnet und geprüft
- [ ] User-API-Key ist vorhanden (sonst: Fallback)
- [ ] Datum in System-Prompt ist auf heutiges Datum ersetzt
- [ ] Disclaimer-Hinweis wurde einmal dem User gezeigt (DSGVO)

---

## A14. Glossar für dieses Konzept

| Begriff | Bedeutung |
|---|---|
| **Prompt Augmentation** | Anreichern eines nutzer-initiierten Prompts mit Kontext (Systemzustand, berechnete Werte) |
| **System-Prompt** | Rollendefinition & universelle Regeln, die bei jedem Call mitgeschickt werden |
| **Few-Shot** | Beispielhafte Input/Output-Paare im Prompt, die das Modell "anlernen" |
| **Grounding** | Aktive Web-Recherche durch Google Search, verbunden mit Quellenangabe |
| **Temperature** | Zufälligkeit der Antworten; niedrig = deterministisch, hoch = kreativ |
| **Response Schema** | JSON-Schema, das die Struktur der Antwort erzwingt |
| **Halluzination** | Modell erfindet Fakten, die nicht im Kontext/in Quellen stehen |
| **Thinking Budget** | Wie viel interne "Denk"-Tokens das Modell sich nehmen darf (Gemini 2.5) |
| **Token** | Einheit für Text-Länge; ~0,75 Wörter deutsch = 1 Token |

---

**Ende des Anhangs.**

Dieser Anhang macht das Konzept implementierungsfertig: Die konkreten Prompts
in A4-A9 können nahezu 1:1 in `ai-prompts.js` als Template-Literal-Funktionen
überführt werden. Die Schemas in A3 werden direkt der Gemini API übergeben.
Die Robustheits-Guards in A10 sind essentiell für verlässliche Produktions-
qualität.
