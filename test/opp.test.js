const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { calculateCosts, estimateReferenceRatio, referenceSamples } = require('../opp.js');

const defaultInputs = {
  filmType: 'OPP',
  lengthMm: 430,
  widthMm: 310,
  thicknessMm: 0.025,
  hasBottom: 'no',
  bottomMm: 0,
  hasTape: 'no',
  lidMm: 40,
  bagsPerPack: 100,
  packsPerCarton: 20,
  filmPricePerTon: 13700,
  tapePricePer10kMeters: 400,
  packagingBagPrice: 0.07,
  dustBagPrice: 0.2,
  cartonPrice: 4.5,
};

test('OPP/CPP costs reproduce the supplied workbook defaults', () => {
  const costs = calculateCosts(defaultInputs);

  assert.equal(costs.filmWeightG, 6.06515);
  assert.equal(costs.tapeLengthM, 0);
  assert.equal(costs.film, 0.08309255500000001);
  assert.equal(costs.tape, 0);
  assert.ok(Math.abs(costs.packagingBag - 0.0007) < 1e-12);
  assert.equal(costs.dustBag, 0.0001);
  assert.equal(costs.carton, 0.00225);
  assert.equal(costs.total, 0.08614255500000002);
});

test('insert bottom adds its length to the unfolded OPP/CPP film area', () => {
  const costs = calculateCosts({ ...defaultInputs, hasBottom: 'yes', bottomMm: 20 });

  assert.equal(costs.unfoldedLengthMm, 450);
  assert.equal(costs.filmWeightG, 6.34725);
});

test('adhesive strip adds lid film usage and tape length and cost', () => {
  const costs = calculateCosts({ ...defaultInputs, hasTape: 'yes' });
  const tapeFilmWeight = defaultInputs.lidMm * defaultInputs.widthMm * defaultInputs.thicknessMm * 0.00091;

  assert.equal(costs.filmWeightG, 6.06515 + tapeFilmWeight);
  assert.equal(costs.tapeLengthM, 0.31);
  assert.equal(costs.tape, 0.0124);
});

test('small OPP bags use a size-matched low raw cost share instead of the overall sample median', () => {
  const small = estimateReferenceRatio({ ...defaultInputs, widthMm: 110, lengthMm: 160, thicknessMm: 0.025 });
  const large = estimateReferenceRatio({ ...defaultInputs, widthMm: 310, lengthMm: 430, thicknessMm: 0.025 });
  const smallSource = referenceSamples.find((sample) => sample.widthMm === 110 && sample.lengthMm === 160 && sample.thicknessMm === 0.025 && !sample.hasTape);

  assert.equal(small.reason, 'exact-size');
  assert.equal(small.ratio, smallSource.ratio);
  assert.ok(small.ratio < large.ratio);
  assert.equal(smallSource.ratio, 0.6323566761673278);
});

test('all 42 supplier quote rows are available and undersized quotes use the smallest matching sample', () => {
  const belowRange = estimateReferenceRatio({ ...defaultInputs, widthMm: 30, lengthMm: 50, thicknessMm: 0.03 });
  const smallestSample = referenceSamples
    .filter((sample) => sample.thicknessMm === 0.03 && !sample.hasTape)
    .sort((a, b) => a.widthMm * a.lengthMm - b.widthMm * b.lengthMm)[0];

  assert.equal(referenceSamples.length, 42);
  assert.equal(belowRange.reason, 'below-size-range');
  assert.equal(belowRange.ratio, smallestSample.ratio);
});

test('reference ratio interpolates between size samples with matching thickness and tape state', () => {
  const small = estimateReferenceRatio({ ...defaultInputs, widthMm: 110, lengthMm: 160 });
  const between = estimateReferenceRatio({ ...defaultInputs, widthMm: 115, lengthMm: 190 });
  const large = estimateReferenceRatio({ ...defaultInputs, widthMm: 120, lengthMm: 230 });

  assert.equal(between.reason, 'interpolated-by-size');
  assert.ok(between.ratio > small.ratio && between.ratio < large.ratio);
  assert.equal(between.samples.length, 2);
});

test('tape status and film thickness select a separate reference group', () => {
  const noTape = estimateReferenceRatio({ ...defaultInputs, widthMm: 110, lengthMm: 160, thicknessMm: 0.025, hasTape: 'no' });
  const tape = estimateReferenceRatio({ ...defaultInputs, widthMm: 110, lengthMm: 160, thicknessMm: 0.025, hasTape: 'yes' });

  assert.ok(tape.ratio > noTape.ratio);
  assert.equal(tape.samples[0].hasTape, true);
  assert.equal(tape.samples[0].thicknessMm, 0.025);
});

test('CPP has no benchmark quote until CPP samples are provided', () => {
  const result = estimateReferenceRatio({ ...defaultInputs, filmType: 'CPP' });

  assert.equal(result.ratio, null);
  assert.equal(result.reason, 'cpp-no-samples');
});

test('the UI loads the OPP calculation and reference logic', () => {
  const html = readFileSync(join(__dirname, '../index.html'), 'utf8');

  assert.match(html, /<script src="opp\.js" defer><\/script>/);
  assert.match(html, /data-product="opp"/);
  assert.match(html, /data-choice-field="oppPackagingMethod"/);
});
