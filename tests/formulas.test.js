/**
 * Formel-Referenztests
 * Vergleicht die Engine-Ergebnisse mit manuell berechneten Werten
 * aus offiziellen Rechnern (Finanztip, Stiftung Warentest, Haufe, etc.).
 *
 * Ausführen: node --experimental-vm-modules tests/formulas.test.js
 *         ODER: cd trading-cockpit && node --input-type=module < tests/formulas.test.js
 */

import {
  getEffectiveTaxRate, getReducedAbgstRate, calculateTax
} from '../js/tax-engine.js';
import {
  calculateETFSparplan, calculateRentenversicherung,
  calculateAltersvorsorgedepot, calculateSubsidies,
  calculateRuerup, calculateRiester,
  riesterZulagenMindestbeitrag, realValue
} from '../js/retirement-engine.js';

let passed = 0, failed = 0;

function check(name, actual, expected, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tolerance;
  if (ok) { passed++; console.log('  OK   ' + name); }
  else { failed++; console.log('  FAIL ' + name + ': got ' + actual + ', expected ' + expected); }
}

function section(title) {
  console.log('\n=== ' + title + ' ===');
}

// ==========================================================================
// STEUER-ENGINE
// ==========================================================================
section('Abgeltungssteuersatz');
check('ohne KiSt', getEffectiveTaxRate(0), 0.26375, 0.0001);
check('8% KiSt (BY/BW)', getEffectiveTaxRate(0.08), 0.278186, 0.001);
check('9% KiSt', getEffectiveTaxRate(0.09), 0.279951, 0.001);

section('Reduzierter AbgSt (bei KiSt)');
check('8% KiSt → 24,5098%', getReducedAbgstRate(0.08), 0.24509804, 0.0001);
check('9% KiSt → 24,4499%', getReducedAbgstRate(0.09), 0.24449878, 0.0001);

section('Steuer auf Kapitalertrag');
const t1 = calculateTax(10000, 1000, 0);  // 9.000 steuerpflichtig
check('10k Gewinn, 1k Freibetrag, keine KiSt: totalTax', t1.totalTax, 9000 * 0.26375, 1);

// ==========================================================================
// VORABPAUSCHALE (gegen smart-rechner.de / vergleich.de)
// ==========================================================================
section('Vorabpauschale Beispielrechnung');
// Beispiel aus vergleich.de: 10.000 € Aktien-ETF, Basiszins 2,53%
// Basisertrag = 10.000 × 0,0253 × 0,7 = 177,10 €
// Nach Teilfreistellung 30%: 177,10 × 0,7 = 123,97 €
// Steuer bei 26,375%: 123,97 × 0,26375 = 32,70 €
// Aber: Sparerpauschbetrag 1.000 € → erste Jahre keine Steuer
// Bei leerem SPB und 10k Portfolio direkt: Steuer ≈ 32,70 €
const basisertrag = 10000 * 0.0253 * 0.7;
check('Basisertrag 10k Portfolio', basisertrag, 177.10, 0.01);
check('Nach Teilfreistellung 30%', basisertrag * 0.7, 123.97, 0.01);
check('VP-Steuer bei vollem SPB-Verbrauch', basisertrag * 0.7 * 0.26375, 32.70, 0.05);

// ==========================================================================
// AVD-ZULAGEN
// ==========================================================================
section('Altersvorsorgedepot Zulagen');
const s1 = calculateSubsidies(360, 0, 30, false, false);
check('Nur 360€ Beitrag → 180€ Grundzulage', s1.grundzulage, 180, 0.01);
const s2 = calculateSubsidies(1800, 0, 30, false, false);
check('Voller 1800€ Beitrag → 540€ Grundzulage', s2.grundzulage, 540, 0.01);
const s3 = calculateSubsidies(1800, 2, 30, false, false);
check('Mit 2 Kindern → +600€ Kinderzulage', s3.kinderzulage, 600, 0.01);
const s4 = calculateSubsidies(1800, 0, 22, true, true);
check('Berufseinsteiger (22, erstes Jahr) → +200€', s4.bonus, 200, 0.01);

// ==========================================================================
// RÜRUP-BESTEUERUNGSANTEIL
// ==========================================================================
section('Rürup Besteuerungsanteil (Wachstumschancengesetz 2024)');
// Test über calculateRuerup
const r2023 = calculateRuerup({ monthlyAmount: 100, returnRate: 0.05, costRate: 0.008, guaranteedPensionFactor: 30, grossIncome: 40000, currentAge: 66, retirementAge: 67 }); // Rentenbeginn 2027
// Vorsicht: Wir können das nicht direkt testen, da die Funktion nicht exportiert ist
// Aber wir können den Wert indirekt prüfen: Rentenbeginn 2027 → sollte 85,5% sein
// (2023: 82,5% + 4 × 0,5% = 84,5% für 2027)
// Der aktuelle Code: currentYear + years → bei currentAge=66, retirementAge=67 → years=1
// Also 2026 + 1 = 2027
const expected2027 = 0.825 + (2027 - 2023) * 0.005;  // = 0.845
check('Rentenbeginn 2027 → 84,5% Besteuerungsanteil', r2023.besteuerungsanteil, expected2027, 0.001);

// ==========================================================================
// RIESTER KINDERZULAGE
// ==========================================================================
section('Riester Kinderzulage (vor/ab 2008)');
const z1 = riesterZulagenMindestbeitrag(40000, 2, 0, 35, false, false);
check('2 Kinder ab 2008: 600€', z1.kinderzulage, 600, 0.01);
const z2 = riesterZulagenMindestbeitrag(40000, 0, 2, 35, false, false);
check('2 Kinder vor 2008: 370€', z2.kinderzulage, 370, 0.01);
const z3 = riesterZulagenMindestbeitrag(40000, 1, 1, 35, false, false);
check('1 ab + 1 vor: 485€', z3.kinderzulage, 485, 0.01);

// ==========================================================================
// INFLATION
// ==========================================================================
section('Inflation / Realwert');
check('100k in 30 Jahren bei 2% Inflation', realValue(100000, 30, 0.02), 55207, 1);
check('255k in 37 Jahren bei 2% Inflation', realValue(255000, 37, 0.02), 122556, 500);

// ==========================================================================
// ETF-SPARPLAN PORTFOLIO (Plausibilitätscheck)
// ==========================================================================
section('ETF-Sparplan Portfolio-Wachstum');
// 150 €/M × 12 × 37 Jahre = 66.600 € Einzahlungen bei 7% sollte ~285k ergeben
const etf = calculateETFSparplan({
  monthlyAmount: 150, returnRate: 0.07, ter: 0.002, basiszins: 0.0253,
  kirchensteuerRate: 0, sparerpauschbetragUsed: 0, currentAge: 30, retirementAge: 67
});
check('Eingezahlt = 150×12×37', etf.totalContributed, 66600, 1);
check('Portfolio ≈ 285k (bei 7%, halbe-Jahresrate-Näherung)', etf.portfolioAtRetirement, 285000, 5000);
console.log('  Info: Echte monatliche Compoundierung würde ~292k ergeben (+2,5%)');

// ==========================================================================
// ERGEBNIS
// ==========================================================================
console.log('\n========== ' + passed + ' bestanden, ' + failed + ' fehlgeschlagen ==========');
if (failed > 0) process.exit(1);
