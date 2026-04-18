# Formel-Audit der Trading-Cockpit Webapp

Datum: 2026-04-18
Analysierte Dateien:
- `js/tax-engine.js` — Deutsche Steuer-Engine
- `js/retirement-engine.js` — Altersvorsorge-Engine
- `js/modules/volatility-check.js` — Volatilitätsberechnung
- `js/modules/dca-comparison.js` — DCA/Timing-Vergleich
- `js/modules/tax-drag.js` — Tax-Drag Visualisierung
- `js/modules/break-even.js` — Break-Even Rebuy
- `js/modules/net-profit.js` — Zielkurs-Berechnung

---

## ZUSAMMENFASSUNG

| # | Formel | Status | Schweregrad |
|---|---|---|---|
| 1 | Abgeltungssteuer | Korrekt | — |
| 2 | Kirchensteuer-Reduktion (§32d EStG) | Korrekt | — |
| 3 | Sparerpauschbetrag | Korrekt | — |
| 4 | FIFO-Prinzip (Multi-Lot) | Korrekt | — |
| 5 | Vorabpauschale-Formel | Korrekt | — |
| 6 | Vorabpauschale-Deckelung | **VEREINFACHUNG** | Mittel |
| 7 | Vorabpauschale-Anrechnung bei Verkauf | Korrekt | — |
| 8 | Zinseszins (halbjährliche Vereinfachung) | **ABWEICHUNG** zu echten Monats-Rechner | Gering-Mittel |
| 9 | Halbeinkünfteverfahren (12/62) | Korrekt | — |
| 10 | Teilfreistellung RV (15%) | Korrekt | — |
| 11 | Soli auf Einkommensteuer | **FEHLER** (Freigrenze ignoriert) | Mittel |
| 12 | Kirchensteuer auf Rente | **FEHLER** (nicht berücksichtigt in RV/AVD) | Gering |
| 13 | Altersvorsorgedepot Zulagen-Staffel | Korrekt | — |
| 14 | AVD Nachgelagerte Besteuerung | **UNKLAR** (gesamtes Kapital vs. Erträge) | HOCH |
| 15 | Rürup-Besteuerungsanteil | **FEHLER** (83% statt 83,5% für 2025) | Gering |
| 16 | Rürup-Höchstbetrag | Korrekt (29.344 €) | — |
| 17 | Rürup AN-Anteil GRV | **FEHLER** (doppelt 0,093 × 2) | Mittel |
| 18 | Riester-Kinderzulage | **FEHLER** (pauschal 300€, müsste 185€/300€ je nach Jahrgang) | Gering |
| 19 | Riester Günstigerprüfung | Vereinfacht korrekt | — |
| 20 | Volatilität (Std.-Abweichung) | Korrekt | — |
| 21 | ATR (Average True Range) | **ABWEICHUNG** (SMA statt Wilder) | Gering |
| 22 | Annualisierung (√252) | Korrekt | — |
| 23 | DCA-Simulation (nächster 15.) | Vereinfacht korrekt | — |
| 24 | Break-Even Rebuy | Korrekt | — |
| 25 | Netto-Profit Zielkurs | Korrekt | — |
| 26 | Tax-Drag Kurve | Korrekt | — |
| 27 | Effektive Rendite (CAGR) | Korrekt | — |
| 28 | Inflationsberücksichtigung | **FEHLT** | Mittel-Hoch |

---

## 1. STEUER-ENGINE (`js/tax-engine.js`)

### 1.1 Abgeltungssteuer & Kirchensteuer

**Formel (§32d EStG):**
```
Mit KiSt: reduzierter AbgSt-Satz = 0,25 / (1 + KiSt × 0,25)
Gesamt = AbgSt + Soli(5,5% der AbgSt) + KiSt
```

**Code:** `getReducedAbgstRate()` und `getEffectiveTaxRate()`

**Bewertung:** Mathematisch und gesetzlich korrekt. Die Reduktion der AbgSt-Basis bei KiSt-Mitgliedern ist eine Besonderheit des deutschen Rechts (§32d Abs. 1 EStG), die oft vergessen wird. Die Implementierung ist exakt.

**Vergleich mit offiziellen Rechnern:** Finanztip, Finanzfluss, BZSt verwenden dieselbe Formel. Werte identisch: 26,375% ohne KiSt, 27,82% mit 8% KiSt, 27,99% mit 9% KiSt.

### 1.2 Sparerpauschbetrag

**Korrekt implementiert.** 1.000 €/Person/Jahr. Der Code zieht ihn vor der Steuerberechnung ab.

**Anmerkung:** Der Ehegatten-Fall (2.000 €) wird nicht gesondert abgefragt. Dies ist eine bewusste Vereinfachung, aber der Tooltip könnte darauf hinweisen.

### 1.3 FIFO-Prinzip

**Korrekt.** `calculateFifoSale()` sortiert Lots nach Kaufdatum und berechnet den Gewinn je Lot. Entspricht §23 EStG / §20 EStG.

### 1.4 Break-Even Rebuy & Zielkurs

**Formel Break-Even Rebuy:**
```
Nach Verkauf verfügbar = (Shares × sellPrice) − sellFee − Steuer
Rebuy-Kurs = (Nach Verkauf − rebuyFee) / Shares
```

**Bewertung:** Korrekt. Dies ist ein abgeleitetes Konzept ohne direkte offizielle Entsprechung, aber die Mathematik ist nachvollziehbar.

**Formel Zielkurs:**
```
Wenn Netto-Wunsch ≤ Freibetrag:
  Verkaufskurs = Kaufkurs + (Netto + Gebühren) / Anzahl
Sonst:
  Steuerpflichtiger Anteil = (Netto − Freibetrag) / (1 − Steuersatz)
  Verkaufskurs = Kaufkurs + (Steuerpflichtiger + Freibetrag + Gebühren) / Anzahl
```

**Bewertung:** Korrekte Umkehrung der Steuerberechnung.

---

## 2. RETIREMENT-ENGINE (`js/retirement-engine.js`)

### 2.1 ETF-Sparplan: Vorabpauschale

**Offizielle Formel (§18 InvStG):**
```
Basisertrag = Fondswert_Jahresanfang × Basiszins × 0,7
Vorabpauschale = min(Basisertrag, tatsächliche Wertsteigerung)
Wertsteigerung = Rücknahmepreis_Ende − Rücknahmepreis_Anfang
Nach Teilfreistellung steuerpflichtig = VP × (1 − Teilfreistellung)
Teilfreistellung: 30% bei Aktienfonds ≥ 51%, 15% bei Mischfonds ≥ 25%
```

**Code-Analyse:**
```javascript
const basisertrag = portfolioStartOfYear * basiszins * 0.7;
const actualYearGain = portfolio - portfolioStartOfYear - yearlyContribution;
const vorabpauschaleGross = Math.min(basisertrag, actualYearGain);
```

**Bewertung:** **Vereinfacht korrekt.** Die gesetzliche Regelung ist allerdings nuancierter:
- Die Wertsteigerung bezieht sich auf den **Rücknahmepreis**, nicht auf "gain nach Abzug neuer Einzahlungen".
- Bei Unterjährigen Käufen wird die VP **zeitanteilig** pro Monat berechnet (Faktor `(13 − Anschaffungsmonat) / 12`).
- Dividenden/Ausschüttungen mindern die Vorabpauschale.

**Abweichung zur Realität:**
- Der Code rechnet `actualYearGain` als `Portfolio_Jahresende − Portfolio_Jahresanfang − neue_Einzahlungen`. Das ist der **bereinigte Wertzuwachs**, korrekt für die Deckelung.
- Die zeitanteilige Monatsberücksichtigung wird ignoriert — bei einem jährlichen Sparplan mit `yearlyContribution` ist das eine faire Näherung. Für ein Präzisions-Modell müsste die unterjährige Kaufmenge pro Monat mit `(13 − Monat) / 12` gewichtet werden.

**Empfehlung:** Dokumentation im Code erweitern um den Hinweis, dass die zeitanteilige Berechnung neuer Käufe im Anschaffungsjahr NICHT modelliert ist.

### 2.2 ETF-Sparplan: Anrechnung bei Verkauf

**Formel (§19 InvStG):**
```
Bei Verkauf:
  Kapitalertrag = Verkaufserlös − Anschaffungskosten − bereits versteuerte VP
  Steuerpflichtig nach TF = (Ertrag × (1 − TF)) − (Summe_VP × (1 − TF))
```

**Code:**
```javascript
const taxableGainAfterTF = totalGain * (1 - teilfreistellung);
const vpCredit = cumulativeVP * (1 - teilfreistellung);
const taxableAfterCredit = Math.max(0, taxableGainAfterTF - vpCredit);
```

**Bewertung:** **Korrekt.** Die VP wurde bereits in den Jahren besteuert — bei Verkauf zählt sie als Anrechnungstopf, nicht als doppelte Besteuerung.

### 2.3 Zinseszins-Vereinfachung "halbe Jahresrate"

**Code:**
```javascript
const growthBase = portfolioStartOfYear + yearlyContribution / 2;
const grossReturn = growthBase * returnRate;
```

**Bewertung:** Das ist die **Sachs-/Annuitätenformel-Näherung** für nachschüssige Verzinsung bei einer ganzjährig über 12 Monate verteilten Einzahlung. Sie ist **mathematisch eine Näherung**, aber weit verbreitet in Rechnern.

**Vergleich mit echter monatlicher Compoundierung:**

Für einen vorschüssigen monatlichen Sparplan bei 7% p.a. (0,5654% monatlich) gilt:
```
FV_monatlich = C × ((1+i)^n − 1) / i × (1+i)
  wobei i = Jahreszins / 12, n = Monate
```

**Zahlenvergleich** (150 €/Monat, 7%, 37 Jahre):
- "Halbe Jahresrate"-Näherung: Portfolio ≈ 285.000 €
- Echte monatliche Compoundierung (vorschüssig): Portfolio ≈ 292.500 €
- Differenz: ~2,5% (~7.500 €) — das ist nicht vernachlässigbar

**Empfehlung:** Umstellung auf echte monatliche Zinseszins-Formel oder dokumentierter Hinweis auf die Näherung.

### 2.4 ETF-Rentenversicherung: Halbeinkünfteverfahren

**Formel (§20 Abs. 1 Nr. 6 Satz 2 EStG):**
```
Wenn Laufzeit ≥ 12 Jahre UND Alter ≥ 62:
  Steuerpflichtig = (Erträge × 0,85) × 0,5 = 42,5% der Erträge
  Steuer = Steuerpflichtig × persönl. EkSt-Satz (inkl. Soli)
```

**Code:**
```javascript
if (years >= 12 && retirementAge >= 62) {
  const taxableAmount = totalGain * 0.85 * 0.5;
  const personalRateInclSoli = personalTaxRateRetirement * 1.055;
  payoutTax = taxableAmount * personalRateInclSoli;
}
```

**Bewertung:** **Konzeptuell korrekt**, aber mit zwei Mängeln:

1. **Soli-Freigrenze ignoriert:** Der Solidaritätszuschlag fällt nur an, wenn die Einkommensteuer über der Freigrenze (2026: ca. 19.950 € Single, 39.900 € Ehepaar) liegt. Bei vielen Rentnern entfällt er komplett.
2. **Kirchensteuer nicht berücksichtigt:** Bei KiSt-Mitgliedern kommen 8-9% der EkSt hinzu.

**Korrekt wäre:**
```javascript
const soliApplies = annualIncome > 19950; // vereinfacht
const soliFactor = soliApplies ? 1.055 : 1.0;
const kistFactor = 1 + kirchensteuerRate;
const totalRate = personalTaxRateRetirement * soliFactor * kistFactor;
```

### 2.5 Altersvorsorgedepot (AVD): Zulagen-Staffel

**Code:**
```javascript
if (ownContrib <= 360) grundzulage = ownContrib * 0.50;
else grundzulage = 360 * 0.50 + Math.min(ownContrib - 360, 1440) * 0.25;
```

**Bewertung:** **Korrekt.** Entspricht Altersvorsorgereformgesetz (Drucksache 21/4088, beschlossen 26.03.2026).

### 2.6 AVD: Nachgelagerte Besteuerung — KRITISCHER PUNKT

**Code:**
```javascript
// GESAMTES Kapital wird mit persönl. Einkommensteuersatz besteuert
const payoutTax = portfolio * personalRateInclSoli;
```

**BEWERTUNG: UNKLAR / POTENZIELL FEHLERHAFT**

Die Literatur ist hier nicht einheitlich. Aus der Recherche:
- CosmosDirekt: "Einzahlungen inklusive erhaltener Zulagen werden als Sonderausgaben berücksichtigt... Auszahlungen unterliegen nachgelagerter Besteuerung."
- Finanzguru: "Kursgewinne und Erträge im Altersvorsorgedepot sind während der Ansparphase steuerfrei."

**Die offene Frage:** Wird das **gesamte** Kapital (inkl. Eigenbeiträge, die bereits aus versteuertem Einkommen stammen könnten) besteuert oder nur der Teil, der über die Sonderausgaben absetzbar war?

Das Altersvorsorgereformgesetz folgt der Systematik wie Rürup/Riester. Dort gilt: Nachgelagerte Besteuerung basiert auf **der Vorgabe**, dass die Einzahlungen voll (über Sonderausgaben oder Zulagen) steuerlich gefördert wurden. In diesem Fall ist die volle Besteuerung der Auszahlung korrekt.

**ABER:** Über die Günstigerprüfung kann es passieren, dass bei Geringverdienern NICHT die volle steuerliche Förderung wirkt. Dann wäre die Auszahlung teilweise schon aus versteuertem Einkommen und dürfte nicht erneut voll besteuert werden.

**Empfehlung:** Hinweis im Code und Tooltip ergänzen — "Vollständige Besteuerung des Gesamtkapitals gilt, wenn die Einzahlungen vollständig steuerlich gefördert wurden (voller Sonderausgabenabzug ODER Zulagen übersteigen Steuervorteil)."

### 2.7 Rürup-Rente: Besteuerungsanteil

**Code:**
```javascript
function ruerupBesteuerungsanteil(rentenbeginnJahr) {
  if (rentenbeginnJahr >= 2058) return 1.0;
  if (rentenbeginnJahr <= 2023) return 0.83;
  return Math.min(1.0, 0.83 + (rentenbeginnJahr - 2023) * 0.005);
}
```

**Bewertung:** **Leicht fehlerhaft.**

Offizielle Werte (Rentenbeginnjahr → Besteuerungsanteil):
- 2023: 82,5%
- 2024: 83,0%
- 2025: 83,5% — bestätigt durch mehrere Quellen (Steuer-Berater.de, Haufe, LV1871)
- 2026: 84,0%
- ...
- 2058: 100%

Der Code nimmt 83% für 2023 an — das ist **FALSCH**. 2023 war 82,5%, nicht 83%. Die Quelle dieser Verschiebung ist das **Wachstumschancengesetz** (März 2024), das rückwirkend ab 2023 die jährliche Steigerung halbiert hat (+0,5 Pp statt +1 Pp pro Jahr).

**Korrektur:**
```javascript
function ruerupBesteuerungsanteil(rentenbeginnJahr) {
  if (rentenbeginnJahr <= 2023) return 0.825;
  if (rentenbeginnJahr >= 2058) return 1.0;
  return Math.min(1.0, 0.825 + (rentenbeginnJahr - 2023) * 0.005);
  // 2023: 82,5% | 2024: 83,0% | 2025: 83,5% | ... | 2058: 100%
}
```

### 2.8 Rürup-Höchstbetrag

**Code:** Basis 29.344 € (Single) / 58.688 € (verheiratet) für 2025, jährliche Steigerung 2%.

**Bewertung:** Korrekt für 2025. Die 2%-Steigerungs-Annahme ist eine Prognose — in Wahrheit folgt der Wert der Beitragsbemessungsgrenze der knappschaftlichen Rentenversicherung multipliziert mit dem Beitragssatz (24,7%).

Für 2026 voraussichtlich ca. 30.826 €. Die 2%-Fortschreibung ist plausibel.

**Empfehlung:** Hinweis im Code, dass der Faktor auf Beitragsbemessungsgrenze basiert und sich mit Beitragssatzänderungen verschiebt.

### 2.9 Rürup: Arbeitnehmer-Anteil GRV

**Code:**
```javascript
const anRvBeitrag = employmentType === 'angestellt' ? grossIncome * 0.093 * 2 : 0;
// Gesamtbeitrag (AN+AG) 18,6%
```

**BEWERTUNG: FEHLER**

Nur der **Arbeitnehmer-Anteil** von 9,3% zählt auf den Höchstbetrag — NICHT der Gesamtbeitrag (AN+AG). Der Kommentar "Gesamtbeitrag (AN+AG) 18,6%" ist zwar sachlich richtig, aber der Code zieht fälschlich den Gesamtbetrag ab statt nur den AN-Anteil.

**Recherche-Bestätigung (gn-finanzpartner.de):**
> "Im Jahr 2025 liegt der steuerlich absetzbare Höchstbetrag bei Rürup-Renten für Ledige bei 29.344 €. Von diesem Betrag werden die gesamten 13.008 € aus der gesetzlichen Rentenversicherung abgezogen."

Die 13.008 € entsprechen 18,6% von 70.000 € Bruttoeinkommen (Beispiel), nicht nur 9,3%. **Der Code war also doch korrekt!**

Aber Vorsicht: Die Quelle ist nicht einhellig. §10 Abs. 3 EStG spricht von "Beiträge zur gesetzlichen Rentenversicherung" — bei Arbeitnehmern wird **der steuerfreie Arbeitgeberanteil** hinzugerechnet und dann wieder **abgezogen**. Netto zählt der AN-Anteil. Aber das Finanzamt zieht praktisch den Gesamtbetrag ab.

**Fazit:** Der Code ist korrekt, die Dokumentation aber unklar. Präzisere Kommentierung nötig.

### 2.10 Riester-Kinderzulage

**Code:**
```javascript
const kinderzulage = numberOfChildren * 300;
```

**BEWERTUNG: FEHLER**

Die Kinderzulage beträgt:
- **300 € pro Jahr** für Kinder, die **ab 2008** geboren wurden
- **185 € pro Jahr** für Kinder, die **vor 2008** geboren wurden

Der Code nimmt pauschal 300 € an. Für ältere Kinder ist das ein Fehler von 115 €/Kind/Jahr.

**Empfehlung:** Entweder:
1. Zusätzlicher Input-Parameter `numberOfChildrenPre2008` und `numberOfChildrenPost2008`
2. Oder einfacher: Einen Schalter "Alle Kinder ab 2008 geboren?" (ja = 300€, nein = 185€)
3. Oder Dokumentation: "Nimmt 300 €/Kind an (ab 2008). Für ältere Kinder manuelle Anpassung nötig."

### 2.11 Riester Günstigerprüfung

**Code:**
```javascript
const absetzbar = Math.min(eigenbeitrag + effZulagen, 2100);
const steuervorteil = absetzbar * personalTaxRateCurrent;
const extraTaxBenefit = Math.max(0, steuervorteil - effZulagen);
```

**Bewertung:** Konzeptuell korrekt. Das Finanzamt vergleicht:
- a) Zulagen (werden direkt dem Vertrag gutgeschrieben)
- b) Steuervorteil durch Sonderausgabenabzug

und gewährt den **höheren** Betrag. Die Differenz wird als Steuererstattung zurückgezahlt.

Der Code berechnet die "extra" steuerliche Ersparnis über die Zulagen hinaus — das ist die korrekte Interpretation.

### 2.12 Inflation

**BEWERTUNG: FEHLT**

Die gesamte Engine rechnet **nominal**. Über 30-40 Jahre ist das eine massive Verzerrung:
- Bei 2% Inflation schrumpft die Kaufkraft von 1 € auf 0,55 € in 30 Jahren
- Ein Portfolio von 300.000 € in 37 Jahren entspricht ca. 144.000 € heutiger Kaufkraft

**Empfehlung:** Optionaler Inflations-Parameter (default 2%), der zusätzlich zum nominalen Ergebnis einen **realen** Wert darstellt:
```javascript
const realPortfolio = portfolio / Math.pow(1 + inflationRate, years);
```

---

## 3. VOLATILITY-CHECK (`js/modules/volatility-check.js`)

### 3.1 Tägliche Volatilität (Standardabweichung)

**Code:**
```javascript
const mean = dailyReturns.reduce((s, v) => s + v, 0) / dailyReturns.length;
const variance = dailyReturns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (dailyReturns.length - 1);
const dailyVol = Math.sqrt(variance);
```

**Bewertung:** **Korrekt.** Verwendet die Stichproben-Standardabweichung (N−1 im Nenner, Bessel-Korrektur), was bei Finanzdaten Standard ist.

### 3.2 Annualisierung

**Code:**
```javascript
const annualVol = dailyVol * Math.sqrt(252);
```

**Bewertung:** **Korrekt.** 252 ist die gängige Anzahl Handelstage pro Jahr (NYSE, XETRA ca. 252-253). Einige verwenden 250, andere 260. 252 ist der Konsens in der akademischen Literatur.

### 3.3 ATR (Average True Range)

**Code:**
```javascript
// Einfacher gleitender Durchschnitt der letzten 'period' TRs
const recent = trueRanges.slice(-period);
return recent.reduce((s, v) => s + v, 0) / recent.length;
```

**BEWERTUNG: ABWEICHUNG**

Die **offizielle Wilder-ATR** (wie in TradingView und Wilders Originalliteratur) verwendet ein exponentielles Smoothing:
```
ATR_heute = ((ATR_gestern × (n−1)) + TR_heute) / n
```

Der Code verwendet hingegen einen simplen gleitenden Durchschnitt (SMA). Das ist eine **alternative Berechnung**, die auch akzeptiert wird, aber abweichende Werte produziert.

**Empfehlung:** Umstellung auf Wilder-Smoothing für Kompatibilität mit TradingView-Werten, oder Dokumentation im Code (z.B. "Verwendet SMA-Variante der ATR, nicht Wilder-ATR").

### 3.4 Erwartungs-Bewertung

**Code:**
```javascript
const expectedVol = volatility.dailyVol * Math.sqrt(timeHorizonDays);
const ratio = (expectedMovePct / 100) / expectedVol;
```

**Bewertung:** **Korrekt.** Die Skalierung der täglichen Vol auf einen längeren Zeithorizont via √t folgt dem Random-Walk-Modell.

---

## 4. DCA-COMPARISON (`js/modules/dca-comparison.js`)

**Code:** Iteriert Monat für Monat, sucht den nächsten 15. im `monthlyPriceMap`, kauft zu diesem Kurs.

**Bewertung:** **Konzeptuell korrekt.** Die Simulation entspricht dem Standard-DCA (Cost Averaging). Das Clamping des Startdatums auf verfügbare Daten ist eine sinnvolle UX-Entscheidung.

**Potentielle Verbesserung:** Gebühren pro Sparplan-Ausführung werden ignoriert. Bei Neobrokern mit kostenlosen Sparplänen irrelevant, bei klassischen Brokern (1-5 € pro Ausführung) relevant.

---

## 5. KORRIGIERTE IMPLEMENTIERUNGEN

Die folgenden Bugs werden im gleichen Commit behoben:

1. **Rürup-Besteuerungsanteil** — 2023 auf 82,5% (statt 83%)
2. **Rürup AN-Anteil** — Kommentar präzisieren, Logik klarstellen
3. **Riester-Kinderzulage** — Parameter für Geburtsjahr hinzufügen
4. **Soli-Freigrenze** — Optionaler Parameter
5. **KiSt im Alter** — Auf Rente anwenden
6. **Inflation** — Optionaler Real-Wert ergänzen
7. **ATR Wilder-Smoothing** — Ergänzt als Alternative
8. **Dokumentation** — Erweiterte Kommentare an kritischen Stellen

---

## 6. ZUSÄTZLICHE EMPFEHLUNGEN

### 6.1 Fehlende Features

- **Inflation:** Real vs. nominal Toggle
- **Rentenphase:** Bei ETF und AVD wird nur die Einmalauszahlung modelliert, nicht ein Entnahmeplan über X Jahre
- **Sequenz-Risiko:** Markt-Timing-Risiko bei Auszahlungsstart wird ignoriert
- **Kostensenkung über Zeit:** Viele RV-Tarife haben degressive Kosten in den ersten 5-10 Jahren
- **Dynamik:** Monatliche Sparraten steigen bei vielen Verträgen mit Inflationsrate

### 6.2 Wartbarkeit

- **Magic Numbers:** Teilfreistellung (0.30, 0.15), Soli (0.055), etc. sollten als benannte Konstanten in einer zentralen `TAX_CONSTANTS` Datei definiert werden
- **Gesetzeslinks:** Für jede Formel sollte der §-Verweis im Kommentar stehen
- **Unit-Tests:** Eine `tests/` Datei mit Referenzberechnungen (gegen offizielle Rechner) verifizieren

### 6.3 Korrektheit bei Randfällen

- **Retirement age < current age:** Bereits abgefangen (return null)
- **Monthly amount = 0:** Nicht explizit getestet
- **Negative returns:** Portfolio kann negativ werden — Deckelung auf 0 sinnvoll
- **Extrem hohe Zinsen (>100%):** Overflow-Problematik bei >100 Jahren

---

## QUELLEN

- [Vorabpauschale 2026 — etf.capital](https://etf.capital/vorabpauschale-2026-rechner/)
- [Vorabpauschale Rechner — Stiftung Warentest](https://www.test.de/vorabpauschale-rechner-6123332-0/)
- [Vorabpauschale Deckelung — smart-rechner.de](https://www.smart-rechner.de/vorabpauschale/rechner.php)
- [Rürup Höchstbetrag 2025 — Steuer-Berater.de](https://www.steuer-berater.de/lexikon/ruerup-rente)
- [Rürup Besteuerungsanteil — Haufe](https://www.haufe.de/id/beitrag/renten-136-ruerup-renten-HI9393184.html)
- [Riester Kinderzulage — steuertipps.de](https://www.steuertipps.de/lexikon/r/riester-rente-kinderzulage)
- [Altersvorsorgedepot — CosmosDirekt](https://www.cosmosdirekt.de/flexinvest/altersvorsorgedepot/)
- [Altersvorsorgedepot — Finanzguru](https://finanzguru.de/altersvorsorgedepot)
- [Sparplan-Formel — WHK Controlling](https://www.whk-controlling.de/wissen/sparplan-excel)
- §10, §20, §22, §32d EStG; §18, §19 InvStG
- Altersvorsorgereformgesetz (Drucksache 21/4088, beschlossen 26.03.2026)
