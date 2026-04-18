/**
 * Zentrale Steuer- und Rechtsquellen-Konstanten
 * Stand: 2025/2026
 *
 * Alle in Formeln verwendeten Zahlenwerte mit Quellenangabe.
 * Änderungen zentral hier, nicht in den Engine-Dateien.
 */

// ==========================================================================
// KAPITALERTRAGSTEUER (§32d EStG)
// ==========================================================================
export const ABGELTUNGSSTEUER_RATE = 0.25;            // §32d Abs. 1 EStG
export const SOLI_RATE_ON_ABGST = 0.055;              // 5,5% Solidaritätszuschlag
export const KIRCHENSTEUER_BAYERN_BW = 0.08;          // 8% in BY/BW
export const KIRCHENSTEUER_SONST = 0.09;              // 9% sonst

// Soli-Freigrenze (Einkommensteuer, nicht Abgeltungssteuer)
// SolZG §3 — bei EkSt unter Freigrenze kein Soli
export const SOLI_FREIGRENZE_SINGLE_2025 = 19950;     // €/Jahr 2025
export const SOLI_FREIGRENZE_SINGLE_2026 = 20350;     // €/Jahr 2026 (prognostiziert)

// ==========================================================================
// SPARERPAUSCHBETRAG (§20 Abs. 9 EStG)
// ==========================================================================
export const SPARERPAUSCHBETRAG_SINGLE = 1000;        // €/Jahr seit 2023
export const SPARERPAUSCHBETRAG_MARRIED = 2000;

// ==========================================================================
// INVESTMENTSTEUERGESETZ (InvStG)
// ==========================================================================
// Teilfreistellung (§20 InvStG)
export const TEILFREISTELLUNG_AKTIENFONDS = 0.30;     // ≥ 51% Aktienquote
export const TEILFREISTELLUNG_MISCHFONDS = 0.15;      // ≥ 25% Aktienquote
export const TEILFREISTELLUNG_IMMO_INLAND = 0.60;
export const TEILFREISTELLUNG_IMMO_AUSLAND = 0.80;

// Vorabpauschale (§18 InvStG)
export const VORABPAUSCHALE_FAKTOR = 0.7;             // 70% des Basiszinses
// Basiszins jährlich von Bundesbank / BZSt festgelegt:
export const BASISZINS_HISTORY = {
  2018: 0.0087, 2019: 0.0052, 2020: 0.0007,
  2021: -0.0045, 2022: -0.0005,
  2023: 0.0255, 2024: 0.0229, 2025: 0.0253
};
export const BASISZINS_CURRENT = 0.0253;              // 2025 = 2,53%

// ==========================================================================
// HALBEINKÜNFTEVERFAHREN (§20 Abs. 1 Nr. 6 EStG)
// Fondsgebundene Rentenversicherung (Schicht 3)
// ==========================================================================
export const HALBEINKUENFTE_FAKTOR = 0.5;             // 50% der Erträge
export const RV_TEILFREISTELLUNG = 0.15;              // 15% zusätzlich steuerfrei
export const HALBEINKUENFTE_MIN_LAUFZEIT = 12;        // Jahre
export const HALBEINKUENFTE_MIN_ALTER = 62;           // ab VJ 2012 abgeschlossen

// Effektiv steuerpflichtig: 0,85 × 0,5 = 42,5% der Erträge

// ==========================================================================
// RÜRUP-RENTE / BASISRENTE (§10 Abs. 1 Nr. 2 EStG + §22 EStG)
// ==========================================================================
// Höchstbetrag = Beitragsbemessungsgrenze knappschaftl. RV × Beitragssatz
// 2025: 118.800 € × 24,7% = 29.343,60 €
export const RUERUP_HOECHSTBETRAG_SINGLE_2025 = 29344;
export const RUERUP_HOECHSTBETRAG_MARRIED_2025 = 58688;
// Fortschreibungsfaktor für Folgejahre (konservative Prognose +2% p.a.)
export const RUERUP_HOECHSTBETRAG_WACHSTUM = 1.02;

// Seit 2023: 100% abzugsfähig (ab 2023 durch Wachstumschancengesetz)
export const RUERUP_ABSETZBAR_ANTEIL = 1.0;

// Besteuerungsanteil bei Rentenbeginn (§22 Nr. 1 Satz 3 EStG)
// Seit Wachstumschancengesetz (März 2024, rückwirkend ab 2023):
// +0,5 Prozentpunkte pro Jahr (vorher +1 Pp). 2023: 82,5% → 2058: 100%
export const RUERUP_BESTEUERUNGSANTEIL_START_JAHR = 2023;
export const RUERUP_BESTEUERUNGSANTEIL_START_WERT = 0.825;
export const RUERUP_BESTEUERUNGSANTEIL_END_JAHR = 2058;
export const RUERUP_BESTEUERUNGSANTEIL_STEIGERUNG = 0.005;  // pro Jahr

// GRV-Beitragssätze (für Rürup-Höchstbetrag-Berechnung bei Angestellten)
export const GRV_BEITRAGSSATZ_GESAMT = 0.186;         // 18,6% AN+AG
export const GRV_BEITRAGSSATZ_AN_ANTEIL = 0.093;      // 9,3% nur AN
// HINWEIS: Das Finanzamt rechnet GESAMTEN GRV-Beitrag gegen Höchstbetrag
// (AG-Anteil wird erst bei den Sonderausgaben hinzugerechnet und wieder abgezogen)

// ==========================================================================
// RIESTER-RENTE (§10a, §79 ff. EStG)
// ==========================================================================
export const RIESTER_GRUNDZULAGE = 175;               // €/Jahr seit 2018
export const RIESTER_KINDERZULAGE_AB_2008 = 300;      // Kinder Geburtsjahr ≥ 2008
export const RIESTER_KINDERZULAGE_VOR_2008 = 185;     // Kinder Geburtsjahr < 2008
export const RIESTER_BERUFSEINSTEIGERBONUS = 200;     // einmalig, Alter < 25
export const RIESTER_MAX_BEITRAG = 2100;              // €/Jahr inkl. Zulagen
export const RIESTER_MINDESTEIGENBEITRAG = 60;        // Sockelbetrag
export const RIESTER_MINDESTQUOTE = 0.04;             // 4% des Vorjahreseinkommens

// ==========================================================================
// ALTERSVORSORGEDEPOT (Altersvorsorgereformgesetz vom 26.03.2026, gültig ab 2027)
// Drucksache 21/4088 i.V.m. Drucksache 21/4996
// ==========================================================================
export const AVD_START_JAHR = 2027;
export const AVD_MAX_EIGENBEITRAG = 1800;             // €/Jahr
export const AVD_ZULAGE_STUFE1_OBERGRENZE = 360;      // €
export const AVD_ZULAGE_STUFE1_SATZ = 0.50;           // 50% auf 1. Stufe
export const AVD_ZULAGE_STUFE2_OBERGRENZE = 1440;     // € (bis 1.800 gesamt)
export const AVD_ZULAGE_STUFE2_SATZ = 0.25;           // 25% auf 2. Stufe
export const AVD_KINDERZULAGE = 300;                  // €/Kind/Jahr
export const AVD_BERUFSEINSTEIGERBONUS = 200;         // einmalig, Alter < 25
export const AVD_MIN_AUSZAHLUNGSALTER = 65;

// ==========================================================================
// INFLATION (für reale Kaufkraftberechnung)
// ==========================================================================
export const INFLATION_DEFAULT = 0.02;                // EZB-Ziel 2%

// ==========================================================================
// SONSTIGES
// ==========================================================================
export const HANDELSTAGE_JAHR = 252;                  // für Vol-Annualisierung
export const LEBENSERWARTUNG_RENTE_JAHRE = 20;        // Annahme Rentenbezugsdauer
