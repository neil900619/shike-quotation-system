const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const {
  calculateBagWeight,
  calculateBagWeightModel,
  calculateCosts,
  estimateReferenceRatio,
  referenceSamples,
  weightSamples,
} = require('../zipper.js');

const defaultInputs = {
  trackCount: 2,
  lengthBelowMm: 280,
  lengthAboveMm: 30,
  widthMm: 270,
  thicknessMm: 0.06,
  bottomMm: 0,
  zipperWeightPercent: 10,
  bodyLdpePercent: 70,
  bodyLldpePercent: 30,
  zipperLdpePercent: 98,
  zipperColorPercent: 2,
  ldpePrice: 13500,
  lldpePrice: 10500,
  colorMasterbatchPrice: 20000,
  inkPricePerKg: 45,
  inkBagsPerDrum: 250000,
  platePrice: 300,
  gluePricePerKg: 23,
  bagsPerBox: 30,
  boxPrice: 0.41,
  cartonPrice: 3.1,
  boxesPerCarton: 24,
};

test('the default double-track zipper bag matches its measured 11.5 g sample', () => {
  const weight = calculateBagWeight(defaultInputs);

  assert.equal(weight.totalWeightG, 11.5);
  assert.equal(weight.bodyWeightPercent, 90);
  assert.equal(weight.zipperWeightPercent, 10);
  assert.equal(weight.bodyWeightG, 10.35);
  assert.equal(weight.zipperWeightG, 1.15);
  assert.equal(weight.developedLengthMm, 310);
  assert.equal(weight.source, 'measured-sample');
});

test('changing zipper share derives body share and uses both shares for material costs', () => {
  const inputs = { ...defaultInputs, zipperWeightPercent: 25 };
  const weight = calculateBagWeight(inputs);
  const costs = calculateCosts(inputs, 1);

  assert.equal(weight.totalWeightG, 11.5);
  assert.equal(weight.bodyWeightPercent, 75);
  assert.equal(weight.zipperWeightPercent, 25);
  assert.equal(weight.bodyWeightG, 8.625);
  assert.equal(weight.zipperWeightG, 2.875);
  assert.ok(Math.abs(costs.body - 8.625 * 12600 / 1_000_000) < 1e-12);
  assert.ok(Math.abs(costs.zipper - 2.875 * 13630 / 1_000_000) < 1e-12);
});

test('zipper share must be between 0 and 100 percent', () => {
  assert.throws(() => calculateBagWeight({ ...defaultInputs, zipperWeightPercent: -1 }), RangeError);
  assert.throws(() => calculateBagWeight({ ...defaultInputs, zipperWeightPercent: 100.1 }), RangeError);
});

test('the sample-fitted model estimates single and double track weights within the observed error range', () => {
  for (const trackCount of [1, 2]) {
    const samples = weightSamples.filter((sample) => sample.trackCount === trackCount);
    const meanAbsoluteError = samples.reduce((sum, sample) => sum + Math.abs(calculateBagWeightModel(sample) - sample.weightG), 0) / samples.length;

    assert.ok(samples.length > 0);
    assert.ok(meanAbsoluteError < 0.25, `${trackCount} tracks mean absolute error was ${meanAbsoluteError} g`);
  }
});

test('insert bottom increases developed area and the estimated body weight', () => {
  const withoutBottom = calculateBagWeightModel({ ...defaultInputs, widthMm: 271 });
  const withBottom = calculateBagWeightModel({ ...defaultInputs, widthMm: 271, bottomMm: 20 });

  assert.ok(withBottom > withoutBottom);
  assert.ok(Math.abs(withBottom - withoutBottom - 0.0010495003707077703 * 2 * 271 * 20 * 0.06) < 1e-12);
});

test('zipper bag costs reproduce the supplied formula defaults', () => {
  const costs = calculateCosts(defaultInputs, 1);

  assert.equal(costs.totalWeightG, 11.5);
  assert.equal(costs.body, 0.13041);
  assert.ok(Math.abs(costs.zipper - 0.0156745) < 1e-12);
  assert.equal(costs.ink, 0.00324);
  assert.equal(costs.plate, 0.00081);
  assert.equal(costs.glue, 0.0005366666666666665);
  assert.equal(costs.box, 0.013666666666666666);
  assert.equal(costs.carton, 0.0043055555555555555);
  assert.ok(Math.abs(costs.total - 0.16864338888888888) < 1e-12);
});

test('printing cost is zero with no printing and doubles for two colors', () => {
  const noPrint = calculateCosts(defaultInputs, 0);
  const oneColor = calculateCosts(defaultInputs, 1);
  const twoColors = calculateCosts(defaultInputs, 2);

  assert.equal(noPrint.printing, 0);
  assert.equal(noPrint.ink, 0);
  assert.equal(noPrint.plate, 0);
  assert.equal(twoColors.ink, oneColor.ink * 2);
  assert.equal(twoColors.plate, oneColor.plate * 2);
});

test('size-matched zipper references keep small-bag cost share lower than large-bag share', () => {
  const small = estimateReferenceRatio({
    trackCount: 1, printingColorCount: 0, widthMm: 50, lengthBelowMm: 70,
    lengthAboveMm: 20, bottomMm: 0, thicknessMm: 0.04,
  });
  const large = estimateReferenceRatio({
    trackCount: 1, printingColorCount: 0, widthMm: 400, lengthBelowMm: 560,
    lengthAboveMm: 20, bottomMm: 0, thicknessMm: 0.04,
  });

  assert.equal(small.reason, 'exact-size');
  assert.ok(small.ratio < large.ratio);
  assert.ok(Math.abs(small.ratio - 0.5710051270365729) < 1e-5);
  assert.equal(weightSamples.length, 37);
  assert.equal(referenceSamples.length, 46);
});

test('reference estimates interpolate by size and thickness and do not borrow another color count', () => {
  const between = estimateReferenceRatio({
    trackCount: 1, printingColorCount: 0, widthMm: 115, lengthBelowMm: 160,
    lengthAboveMm: 20, bottomMm: 0, thicknessMm: 0.06,
  });
  const unsupported = estimateReferenceRatio({
    trackCount: 2, printingColorCount: 2, widthMm: 270, lengthBelowMm: 280,
    lengthAboveMm: 30, bottomMm: 0, thicknessMm: 0.06,
  });

  assert.equal(between.reason, 'interpolated-by-size-and-thickness');
  assert.ok(between.ratio > 0 && between.samples.length > 0);
  assert.equal(unsupported.ratio, null);
  assert.equal(unsupported.reason, 'no-matching-samples');
});

test('the UI loads the zipper module and provides a single/double track selector', () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  const app = readFileSync(join(__dirname, '../app.js'), 'utf8');

  assert.match(html, /<script src="zipper\.js" defer><\/script>/);
  assert.match(html, /data-product="zipper"/);
  assert.match(html, /data-product-panel="zipper"/);
  assert.match(html, /data-choice-field="trackCount"/);
  assert.match(html, /id="zipperBodyWeightPercent"[^>]*readonly/);
  assert.match(html, /data-field="zipperWeightPercent"/);
  assert.doesNotMatch(html, /data-field="bodyWeightPercent"/);
  assert.match(app, /ShikeZipper\.calculateCosts/);
  assert.match(app, /ShikeZipper\.estimateReferenceRatio/);
  assert.match(app, /const values = \{ slider: \{\}, opp: \{\}, zipper: \{\}, shared: \{\} \}/);
  assert.match(app, /function updateZipperPrintingControls\(\) \{[\s\S]*?setPrintingInputsDisabled\(zipperPrintingSelect\.value, zipperPrintingFields\)/);
  assert.match(app, /const bodyWeightPercent = Number\.isFinite\(inputs\.zipperWeightPercent\)[\s\S]*?100 - inputs\.zipperWeightPercent/);
});
