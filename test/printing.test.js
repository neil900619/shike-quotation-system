const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const {
  calculatePrintingCosts,
  getPrintingColorCount,
  setPrintingInputsDisabled,
} = require('../printing.js');

const html = readFileSync(join(__dirname, '../index.html'), 'utf8');
const app = readFileSync(join(__dirname, '../app.js'), 'utf8');

const sampleInputs = {
  inkPricePerKg: 45,
  inkBagsPerDrum: 160_000,
  platePrice: 300,
  widthMm: 350,
};

test('no printing disables ink and plate price inputs and charges zero', () => {
  const controls = [{ disabled: false }, { disabled: false }];

  assert.equal(setPrintingInputsDisabled('0', controls), true);
  assert.deepEqual(controls.map((control) => control.disabled), [true, true]);
  assert.deepEqual(calculatePrintingCosts(sampleInputs, '0'), {
    ink: 0,
    plate: 0,
    printing: 0,
    colorCount: 0,
  });
});

test('one color charges one set of ink and plate costs', () => {
  const costs = calculatePrintingCosts(sampleInputs, '1');

  assert.equal(setPrintingInputsDisabled('1', [{ disabled: true }]), false);
  assert.equal(costs.ink, 0.0050625);
  assert.equal(costs.plate, 0.00105);
  assert.equal(costs.printing, 0.0061125);
  assert.equal(costs.colorCount, 1);
});

test('two colors charge two sets of ink and plate costs', () => {
  const oneColor = calculatePrintingCosts(sampleInputs, '1');
  const twoColors = calculatePrintingCosts(sampleInputs, '2');

  assert.equal(setPrintingInputsDisabled('2', [{ disabled: true }]), false);
  assert.equal(twoColors.ink, oneColor.ink * 2);
  assert.equal(twoColors.plate, oneColor.plate * 2);
  assert.equal(twoColors.printing, oneColor.printing * 2);
  assert.equal(twoColors.colorCount, 2);
});

test('invalid printing color selections are rejected', () => {
  assert.equal(getPrintingColorCount('3'), null);
  assert.throws(() => calculatePrintingCosts(sampleInputs, '3'), RangeError);
});

test('the UI offers all printing choices and connects the price fields to disable behavior', () => {
  assert.match(html, /data-choice-field="printingColors"/);
  assert.match(html, /<option value="0">无<\/option>/);
  assert.match(html, /<option value="1" selected>一色<\/option>/);
  assert.match(html, /<option value="2">二色<\/option>/);
  assert.equal((html.match(/data-printing-field="slider"/g) || []).length, 2);
  assert.equal((html.match(/data-printing-field="zipper"/g) || []).length, 2);
  assert.match(app, /setPrintingInputsDisabled\(printingSelect\.value, printingFields\)/);
  assert.match(app, /input\.addEventListener\(eventName, \(\) => \{[\s\S]*?render\(\);[\s\S]*?\}\);/);
});
