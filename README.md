# Trading Cockpit & Altersvorsorge-Vergleichsrechner

Interaktives Finanz-Tool für deutsche Anleger mit zwei Hauptseiten:

- **Trading Cockpit** — Steuerberechnung, Break-Even, Zielkurs, Volatilität & Sparplan-Vergleich für Aktienpositionen
- **Altersvorsorge-Vergleichsrechner** — seriöser Vergleich von fünf Altersvorsorge-Konzepten für den deutschen Markt (Stand 2025/2026)

Optional: **Google Gemini KI-Analysen** für individualisierte Empfehlungen jenseits der statischen Regelwerke.

---

## Seite 1: Trading Cockpit

Analysiert eine einzelne Aktienposition ganzheitlich — für mäßig erfahrene deutsche Trader.

### Features

- **Steuer-Kalkulator**: Abgeltungssteuer (25 %), Solidaritätszuschlag (5,5 %), Kirchensteuer (8 % / 9 %), Sparerpauschbetrag (1.000 €)
- **Tax-Drag Visualisierung**: zeigt grafisch, wie stark die Steuer den Gewinn bremst
- **Break-Even Rebuy**: der Kurs, auf den die Aktie fallen muss, damit man nach Verkauf und Steuern dieselbe Stückzahl wieder kaufen kann
- **Netto-Profit Zielkurs**: Rückwärtsrechnung vom Wunsch­gewinn zum nötigen Verkaufskurs — inkl. Stop-Loss-Empfehlungen
- **Kurslevel Dashboard**: 6-Monate-Candlestick-Chart mit eingezeichneten Levels (Kaufkurs, Stop-Loss, Break-Even-Rebuy, Zielkurs) — Toggle zum Ein-/Ausblenden
- **Volatilitäts-Check**: prüft mit Ampelsystem, ob Kurserwartungen statistisch realistisch sind (Standardabweichung + ATR)
- **Sparplan-Vergleich**: simuliert, was ein monatlicher DCA-Sparplan über denselben Zeitraum gebracht hätte — Opportunitätskosten-Analyse
- **Smart Advisory**: 12 regelbasierte Empfehlungen mit verständlichen Fließtext-Erklärungen (keine Platzhalter-Phrasen, konkrete Euro-Beträge, fachliche Bewertungen)
- **Rechenweg-Tooltips**: über jeder berechneten Zahl (KPI-Karten, Break-Even-Rebuy, Zielkurs, R:R-Verhältnis, Volatilitätskennzahlen, Sparplan-Vergleich) erscheint beim Hovern ein detaillierter Tooltip mit symbolischer Formel, Formel mit eingesetzten Werten als nachvollziehbare Rechnung (`x × y = z`), Ergebnis und fachlicher Erklärung — immer aktiv, kein Toggle nötig

### Aktien-Datenquellen

- **Yahoo Finance** (Standard, kein API-Key nötig) — via CORS-Proxy mit zwei Fallbacks (`allorigins.win`, `corsproxy.io`)
- **Financial Modeling Prep** (optional, kostenloser Key) — zuverlässiger, mehr europäische Daten
- **Lokale Symbolliste** mit 129 Aktien + ETFs (DAX, MDAX, US-Tech, US-Finanz, US-Rohstoffe, Europa, Welt-ETFs) — funktioniert offline

---

## Seite 2: Altersvorsorge-Vergleichsrechner

Vergleicht **fünf** deutsche Altersvorsorge-Konzepte (plus eine Kombi-Strategie) präzise nach Kosten, Steuern und Netto-Auszahlung — auf Basis von Verbraucherzentrale, Stiftung Warentest, Finanztip und BMF.

### Verglichene Produkte

| Produkt | Schicht | Kurzbeschreibung | Wann sinnvoll? |
|---|---|---|---|
| **ETF-Sparplan** | 3 | Selbstverwaltet bei Neobroker | Flexibilität, niedrige Kosten |
| **ETF-Rentenversicherung** | 3 | Versicherungsmantel um ETFs | Ab 20 Jahren Laufzeit, niedriger Steuersatz im Alter |
| **Altersvorsorgedepot** | Neu ab 2027 | Staatlich gefördertes ETF-Depot | Familien mit Kindern, Berufseinsteiger |
| **Rürup-Rente** | 1 | Basisrente, 100 % absetzbar | Selbstständige, Grenzsteuersatz ≥ 42 % |
| **Riester-Rente** | 2 | Zulagen-geförderte Privatvorsorge | Nur noch Bestandsverträge — VZ rät vom Neuabschluss ab |
| **Kombi-Strategie** | — | Automatisch bei Sparrate > 150 €/Monat | AVD (gefördert) + bestes Zweitprodukt parallel |

### Berechnungsgrundlagen (alle Formeln dokumentiert in `retirement-engine.js`)

**ETF-Sparplan**
- Vorabpauschale: Fondswert × Basiszins (2,53 %) × 0,7, gedeckelt auf Jahresgewinn
- Teilfreistellung 30 % für Aktienfonds → effektiv 18,46 % Steuerlast
- Sparerpauschbetrag 1.000 €/Jahr angewendet
- VP-Anrechnungstopf beim Verkauf

**ETF-Rentenversicherung (Schicht 3)**
- Keine Vorabpauschale in Ansparphase (Steuerstundung!)
- 12/62-Regel: Halbeinkünfteverfahren + 15 % Teilfreistellung → nur 42,5 % der Erträge steuerpflichtig mit persönlichem Einkommensteuersatz

**Altersvorsorgedepot (ab 01.01.2027)**
- Grundzulage: 50 % auf erste 360 € + 25 % auf nächste 1.440 € = max. 540 €/Jahr
- Kinderzulage: 300 €/Kind/Jahr
- Berufseinsteigerbonus: 200 € einmalig (< 25 Jahre)
- Beiträge absetzbar, aber 100 % nachgelagerte Besteuerung bei Auszahlung

**Rürup-Rente (Schicht 1)**
- 100 % Sonderausgabenabzug (bis 29.344 €/Single bzw. 58.688 €/Paare in 2025)
- Bei Angestellten: GRV-Beitrag (18,6 %) reduziert absetzbaren Betrag
- Nachgelagerte Besteuerung: 83,5 % in 2025, + 0,5 pp/Jahr bis 100 % in 2058
- Rentenfaktor-basierte Auszahlung (28–31 € pro 10.000 € Kapital)

**Riester-Rente (Schicht 2)**
- Grundzulage 175 €/Jahr + Kinderzulage 300 €/Kind + Berufseinsteigerbonus
- Mindesteigenbeitrag: max(60 €, 4 % × Brutto − Zulagen), max. 2.100 €/Jahr
- Günstigerprüfung (Sonderausgabenabzug vs. Zulagen) automatisch berücksichtigt
- 100 % nachgelagerte Besteuerung

### Features

- **KPI-Karten** für alle aktivierten Produkte mit Netto-Auszahlung, Kosten, Zulagen
- **Vermögensentwicklungs-Chart** (ApexCharts, 30–40 Jahre) mit allen Produkten parallel
- **Kostenvergleichs-Chart** als Balkendiagramm
- **Steuervergleichs-Chart** (Steuern Ansparphase vs. Auszahlung)
- **Jahresübersicht-Tabellen** für ETF-Sparplan, Rentenversicherung und Altersvorsorgedepot (scrollbar, mit Vorabpauschale-Details)
- **Rechenweg-Tooltips** (immer aktiv): über jeder berechneten Zahl (KPI-Karten, alle Jahrestabellen, Kostenvergleich, Netto-Auszahlung, Kombi-Strategie) erscheint beim Hovern ein strukturierter Tooltip mit vier Sektionen — symbolische Formel, Formel mit eingesetzten Werten in der Form `… = Ergebnis`, Ergebnis als Highlight und fachliche Herleitung (Vorabpauschale, Halbeinkünfteverfahren, Steuerstundung, Zulagenstaffel). Funktioniert tastatur-, maus- und touch-freundlich (Tap öffnet, Tap außerhalb schließt)
- **Fachliche Einschätzung**: 9–11 substantielle Advisory-Karten pro Situation mit Zitaten/Einordnung der Verbraucherzentrale
- **Verbraucherzentrale-Warnung** für Riester-Neuabschlüsse
- **Grenzsteuersatz-Analyse** für Rürup (ab 42 % lohnend)
- **Anbieter-Auswahl**: je 3 reale Anbieter pro Produkt (Alte Leipziger, LV1871, growLife, myPension, Uniprofirente etc.) mit echten Kostenquoten aus Stiftung-Warentest-Tests 2025

---

## KI-Analysen (Google Gemini, optional)

Wenn in den Einstellungen ein **Google Gemini API-Key** hinterlegt wird, kann der Nutzer per Knopfdruck individualisierte KI-Analysen anfordern — zusätzlich zu den statischen Advisory-Karten.

### Verfügbare KI-Features

- **KI-Gesamteinschätzung (Trading Cockpit)**: ganzheitliche Positionsanalyse mit Risiko-, Steuer- und Psychologie-Einordnung
- **Aktien-Prognose (Trading Cockpit, mit Grounding)**: live-recherchierte Aktienanalyse mit aktuellen News, Analysten-Konsens und Makro-Kontext — inkl. Quellenangaben
- **KI-Beratung (Altersvorsorge)**: persönliche Lebenssituations-Analyse mit Steuer-Hebel, Kosten-Kritik, Lebensphase-Risiken und Gesetzes-Unsicherheit

### Architektur

- **Modell-Auswahl**: Gemini 2.5 Flash (Standard), 2.5 Pro, 2.0 Flash
- **Strukturiertes JSON** (`responseSchema`) erzwingt konsistente Antworten mit Headline, Verdict, Insights (severity + category), Sources und Disclaimern
- **Google Search Grounding** für Aktien-Prognosen (aktuelle News + Quellenlinks)
- **System-Prompt** verpflichtet die KI auf Verbraucherzentrale, Stiftung Warentest, Finanztip und BMF als Primärquellen
- **Automatischer Retry** mit exponential backoff bei 503/overloaded
- **LocalStorage-Cache** (1h TTL) spart Kosten bei Doppel-Abfragen
- **Hybride Strategie**: statische Advisories bleiben immer aktiv — KI ergänzt, ersetzt nicht. Bei API-Fehler Fallback auf statische Hinweise.

### Datenschutz bei KI-Nutzung

- Der API-Key wird nur im LocalStorage gespeichert, nie an Dritte weitergegeben
- Bei KI-Analysen werden Eingaben (Alter, Sparrate, Steuerdaten, Position) an Google in den USA übertragen — prominenter DSGVO-Hinweis in den Einstellungen
- Namen, Adressen oder Bankdaten werden niemals übertragen

### Kostenabschätzung

Bei realistischer Nutzung (~10 Analysen/Tag) liegen die Kosten je nach Modell zwischen ca. 0,15 €/Monat (Flash, ohne Grounding) und ~5 €/Monat (Pro mit Grounding). API-Key ist kostenlos auf [aistudio.google.com/apikey](https://aistudio.google.com/apikey) erhältlich.

---

## Technologie

Rein **statische Webapp** — kein Backend, kein Build-Step, GitHub-Pages-kompatibel.

| Komponente | Technologie |
|---|---|
| UI-Framework | [Alpine.js 3](https://alpinejs.dev/) (ES-Modul vom CDN, manuell gestartet) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) (CDN) mit Dark-Mode-Default |
| Charts | [ApexCharts](https://apexcharts.com/) (CDN) |
| Kursdaten | Yahoo Finance (CORS-Proxy) oder [FMP](https://financialmodelingprep.com/) (kostenloser Key) |
| KI-Analyse | [Google Gemini API](https://ai.google.dev/) (optional, kostenloser Key) |
| Persistenz | Browser LocalStorage |
| Offline | Service Worker (PWA-fähig) |
| Responsive | Mobile-Layout mit Burger-Menü + Overlay |

---

## Installation & Nutzung

### Lokal testen

```bash
cd trading-cockpit
python -m http.server 8080
# Öffne http://localhost:8080/index.html           (Trading Cockpit)
# Öffne http://localhost:8080/altersvorsorge.html  (Altersvorsorge)
```

### Deployment auf GitHub Pages

1. Repository auf GitHub erstellen
2. Alle Dateien aus dem `trading-cockpit/`-Ordner ins Repository pushen
3. Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → Ordner: `/ (root)`
4. Die Seite ist unter `https://<username>.github.io/<repo-name>/` verfügbar

### Datenquellen einrichten

**Aktienkurse (Trading Cockpit)**
- **Yahoo Finance** (Standard): funktioniert sofort ohne Konfiguration
- **FMP** (mehr Daten, CORS-freundlich):
  1. Kostenlos registrieren auf [financialmodelingprep.com](https://financialmodelingprep.com/register)
  2. Einstellungen (Zahnrad) → Datenquelle auf "FMP" umschalten → API-Key eintragen

**KI-Analysen (beide Seiten, optional)**
1. Kostenlosen Key erstellen auf [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Einstellungen → Gemini API-Key einfügen → Modell wählen → "Verbindung testen"
3. Für Aktien-Prognose: Grounding (Web-Recherche) aktivieren

---

## Steuerberechnung — Grundlagen

Alle Berechnungen basieren auf dem deutschen Steuerrecht mit Stand 2025/2026.

| Steuer | Satz | Auf Basis von |
|---|---|---|
| Abgeltungssteuer | 25 % | Kapitalertrag |
| Solidaritätszuschlag | 5,5 % | Abgeltungssteuer |
| Kirchensteuer (BY/BW) | 8 % | Abgeltungssteuer |
| Kirchensteuer (andere) | 9 % | Abgeltungssteuer |

**Effektive Gesamtsteuersätze:**
- Ohne Kirchensteuer: **26,375 %**
- Mit 8 % KiSt (Bayern/BaWü): **27,82 %**
- Mit 9 % KiSt (alle anderen): **27,99 %**

Der Sparerpauschbetrag von 1.000 €/Person (2.000 € bei Ehepaaren) wird in allen Berechnungen berücksichtigt.

### Weitere berücksichtigte Steuer-Details

- **Teilfreistellung** 30 % für Aktienfonds, 15 % für fondsgebundene Rentenversicherungen
- **Halbeinkünfteverfahren** bei Rentenversicherungen (12+ Jahre Laufzeit, Auszahlung ab 62)
- **Nachgelagerte Besteuerung** bei Rürup, Riester und Altersvorsorgedepot
- **Vorabpauschale** bei ETF-Sparplänen (jährlich, mit Anrechnungstopf beim Verkauf)
- **Rentenbeginn-spezifischer Besteuerungsanteil** bei Rürup (83,5 % ab 2025, + 0,5 pp/Jahr)

---

## Datenschutz

- **Alle Berechnungen laufen lokal im Browser** — kein Backend, keine Datenbank, kein Tracking
- Eingaben und Einstellungen werden nur im **LocalStorage** des Browsers gespeichert
- API-Keys werden nur lokal gespeichert und nie an Dritte weitergegeben
- **Bei KI-Analysen**: Eingabedaten werden an Google in den USA übertragen (prominenter DSGVO-Hinweis in den Einstellungen)
- Kursdaten werden über öffentliche APIs abgerufen (Yahoo Finance / FMP)

---

## Projektstruktur

```
trading-cockpit/
├── index.html                    # Trading Cockpit (Hauptseite)
├── altersvorsorge.html           # Altersvorsorge-Vergleichsrechner
├── manifest.json                 # PWA Manifest
├── sw.js                         # Service Worker
├── css/custom.css                # Dark-Mode-Styles, Tooltip-System
├── js/
│   ├── app.js                    # Alpine.js Hauptlogik Trading Cockpit
│   ├── altersvorsorge-app.js     # Alpine.js Logik Altersvorsorge
│   ├── tax-engine.js             # Deutsche Steuerberechnungen
│   ├── retirement-engine.js      # Altersvorsorge-Berechnungen (5 Produkte)
│   ├── api-client.js             # Yahoo/FMP-Client mit Caching + Proxy-Fallback
│   ├── ai-client.js              # Gemini-API-Client mit Retry + Schema
│   ├── ai-prompts.js             # KI-Prompt-Bibliothek (Trading, Altersvorsorge, Aktien-Prognose)
│   ├── ai-renderer.js            # Einheitliches HTML-Rendering für KI-Antworten
│   ├── chart-manager.js          # ApexCharts Konfiguration (Tax-Drag)
│   ├── tooltip.js                # Globales Tooltip-System (positionsstabil, Begriffe + Rechenweg)
│   ├── calc-explanations.js      # Rechenweg-Bibliothek: Formel/Werte/Erklärung pro Kennzahl
│   ├── modules/                  # Trading-Module
│   │   ├── advisory.js           # 12 regelbasierte Trading-Empfehlungen
│   │   ├── break-even.js
│   │   ├── dca-comparison.js     # Sparplan vs. Timing
│   │   ├── net-profit.js
│   │   ├── price-levels.js       # Kurslevel-Chart
│   │   ├── tax-drag.js           # Steuervisualisierung
│   │   └── volatility-check.js   # Volatilitätsanalyse
│   ├── utils/
│   │   ├── formatters.js         # de-DE Zahlenformatierung
│   │   ├── glossary.js           # Fachbegriff-Erklärungen
│   │   └── storage.js            # LocalStorage-Abstraktion
│   └── data/
│       ├── german-stocks.js      # 129 vorkonfigurierte Aktien + ETFs
│       └── insurance-providers.js # RV-, Rürup- und Riester-Anbieter
└── assets/icons/                 # PWA-Icons
```

---

## Haftungsausschluss

Dieses Tool dient ausschließlich der Information und Orientierung. Es ist **keine Anlageberatung** im Sinne des WpHG und **keine Steuerberatung** im Sinne des StBerG. Berechnungen enthalten Vereinfachungen (progressive Einkommensteuer, Soli-Freigrenze, Inflation u.a.). Für verbindliche Entscheidungen konsultiere einen unabhängigen Honorarberater oder die Verbraucherzentrale.

**Quellen der Berechnungsgrundlagen:** Verbraucherzentrale, Stiftung Warentest (05/2025), Finanztip, Bundesfinanzministerium, Bundesverband deutscher Investment-Manager (BVI), Deutsche Bundesbank.

---

## Lizenz

Privates Projekt.
