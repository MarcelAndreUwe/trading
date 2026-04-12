# Trading Cockpit

Interaktives Steuer- und Analyse-Tool für deutsche Aktienhändler. Berechnet präzise die deutsche Abgeltungssteuer, Break-Even-Kurse, Zielkurse und vergleicht Timing-Strategien mit Sparplänen.

## Features

- **Steuer-Kalkulator**: Abgeltungssteuer (25%), Solidaritätszuschlag (5,5%), Kirchensteuer (8%/9%), Sparerpauschbetrag (1.000 €)
- **Tax-Drag Visualisierung**: Zeigt grafisch, wie stark die Steuer den Gewinn bremst
- **Break-Even Rebuy**: Berechnet den Kurs für gewinnbringenden Wiedereinstieg nach Steuern
- **Netto-Profit Zielkurs**: Rückwärtsrechnung vom Wunschgewinn zum nötigen Verkaufskurs
- **Kurslevel Dashboard**: Historischer Kursverlauf mit eingezeichneten Levels (Stop-Loss, Ziel, Break-Even)
- **Volatilitäts-Check**: Prüft ob Kurserwartungen realistisch sind (Ampelsystem)
- **Sparplan-Vergleich**: Was wäre wenn — DCA vs. Einmalkauf mit echten Kursdaten
- **Smart Advisory**: 12 regelbasierte Empfehlungen mit verständlichen Erklärungen

## Technologie

Rein statische Webapp — kein Backend, kein Build-Step.

| Komponente | Technologie |
|---|---|
| UI-Framework | [Alpine.js](https://alpinejs.dev/) (CDN) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) (CDN) |
| Charts | [ApexCharts](https://apexcharts.com/) (CDN) |
| Kursdaten | Yahoo Finance (CORS-Proxy) oder [FMP](https://financialmodelingprep.com/) (kostenloser Key) |
| Persistenz | Browser LocalStorage |
| Offline | Service Worker (PWA) |

## Installation & Nutzung

### Lokal testen

```bash
cd trading-cockpit
python -m http.server 8080
# Öffne http://localhost:8080/index.html
```

### GitHub Pages

1. Repository auf GitHub erstellen
2. Alle Dateien aus dem `trading-cockpit/`-Ordner ins Repository pushen
3. Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → Ordner: `/ (root)`
4. Die Seite ist verfügbar unter `https://<username>.github.io/<repo-name>/`

### Kursdaten einrichten

**Option 1 — Yahoo Finance (Standard, kein Key nötig):**
Funktioniert sofort. Kursdaten werden über einen kostenlosen CORS-Proxy geladen.

**Option 2 — Financial Modeling Prep (mehr Daten):**
1. Kostenlos registrieren auf [financialmodelingprep.com](https://financialmodelingprep.com/register)
2. In der App: Einstellungen (Zahnrad) → Datenquelle auf "FMP" umschalten → API-Key eintragen

## Steuerberechnung

Die App rechnet mit den aktuellen deutschen Steuersätzen (2025/2026):

| Steuer | Satz | Auf Basis von |
|---|---|---|
| Abgeltungssteuer | 25% | Kapitalertrag |
| Solidaritätszuschlag | 5,5% | Abgeltungssteuer |
| Kirchensteuer (BY/BW) | 8% | Abgeltungssteuer |
| Kirchensteuer (andere) | 9% | Abgeltungssteuer |

**Effektive Gesamtsteuersätze:**
- Ohne Kirchensteuer: **26,375%**
- Mit 8% KiSt (Bayern/BaWü): **27,82%**
- Mit 9% KiSt (alle anderen): **27,99%**

Der Sparerpauschbetrag von 1.000 €/Person wird berücksichtigt.

## Datenschutz

- Alle Berechnungen laufen lokal im Browser
- Kein Backend, keine Datenbank, kein Tracking
- Einstellungen werden nur im LocalStorage des Browsers gespeichert
- API-Keys werden nur lokal gespeichert und nie an Dritte übermittelt
- Kursdaten werden über öffentliche APIs abgerufen (Yahoo Finance / FMP)

## Projektstruktur

```
trading-cockpit/
├── index.html              # Single-Page App
├── manifest.json           # PWA Manifest
├── sw.js                   # Service Worker
├── css/custom.css          # Eigene Styles
├── js/
│   ├── app.js              # Alpine.js Hauptlogik
│   ├── tax-engine.js       # Steuerberechnungen
│   ├── api-client.js       # API-Client mit Caching
│   ├── chart-manager.js    # ApexCharts Konfiguration
│   ├── modules/            # Feature-Module
│   │   ├── advisory.js     # Regelbasierte Empfehlungen
│   │   ├── break-even.js   # Break-Even Analyse
│   │   ├── dca-comparison.js # Sparplan-Vergleich
│   │   ├── net-profit.js   # Zielkurs-Rechner
│   │   ├── price-levels.js # Kurslevel-Chart
│   │   ├── tax-drag.js     # Steuervisualisierung
│   │   └── volatility-check.js # Volatilitätsanalyse
│   ├── utils/              # Hilfsfunktionen
│   │   ├── formatters.js   # Zahlenformatierung (de-DE)
│   │   ├── glossary.js     # Fachbegriff-Erklärungen
│   │   └── storage.js      # LocalStorage-Abstraktion
│   └── data/
│       └── german-stocks.js # DAX/MDAX Aktien für Offline-Suche
└── assets/icons/           # PWA Icons
```

## Lizenz

Privates Projekt.
