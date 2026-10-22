(function exposePrinting(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShikePrinting = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function createPrintingHelpers() {
  function getPrintingColorCount(value) {
    const normalized = String(value);
    return ['0', '1', '2'].includes(normalized) ? Number(normalized) : null;
  }

  function setPrintingInputsDisabled(value, inputs) {
    const disabled = getPrintingColorCount(value) === 0;
    for (const input of inputs) input.disabled = disabled;
    return disabled;
  }

  function calculatePrintingCosts(inputs, colorValue) {
    const colorCount = getPrintingColorCount(colorValue);
    if (colorCount === null) throw new RangeError('Printing color count must be 0, 1, or 2.');
    if (colorCount === 0) return { ink: 0, plate: 0, printing: 0, colorCount };

    const ink = 18 * inputs.inkPricePerKg / inputs.inkBagsPerDrum * colorCount;
    const plate = inputs.platePrice / (100_000 / (inputs.widthMm / 1000)) * colorCount;
    return { ink, plate, printing: ink + plate, colorCount };
  }

  return { getPrintingColorCount, setPrintingInputsDisabled, calculatePrintingCosts };
});
