(function exposeZipper(root) {
  const weightRows = [
    [1,50,70,13,0,0.04,0.44],[1,60,85,13,0,0.04,0.58],[1,70,100,15,0,0.04,0.76],[1,85,120,15,0,0.04,1.07],
    [1,100,140,15,0,0.04,1.46],[1,120,170,17,0,0.04,2.1],[1,140,200,17,0,0.04,2.89],[1,170,240,17,0,0.04,4.16],
    [1,200,280,17,0,0.04,5.66],[1,240,340,21,0,0.04,7.9],[1,280,400,21,0,0.04,10.81],[1,340,480,21,0,0.04,15.64],
    [1,50,70,13,0,0.08,0.84],[1,60,85,13,0,0.08,1.18],[1,70,100,15,0,0.08,1.53],[1,85,120,15,0,0.08,2.12],
    [1,100,140,15,0,0.08,2.91],[1,120,170,17,0,0.08,4.02],[1,140,200,17,0,0.08,5.4],[1,170,240,17,0,0.08,7.63],
    [1,200,280,17,0,0.08,9.8],[1,240,340,21,0,0.08,14.46],[1,280,400,21,0,0.08,21.4],[1,340,480,21,0,0.08,28.9],
    [2,145,165,30,0,0.06,3.83],[2,160,170,30,0,0.06,4.61],[2,230,150,27,30,0.06,7.2],[2,180,200,30,0,0.06,5.9],
    [2,180,200,30,0,0.045,4.6],[2,270,180,33,20,0.06,9],[2,170,225,30,0,0.06,6.11],[2,200,230,30,0,0.06,7.45],
    [2,315,260,30,0,0.06,12.44],[2,270,280,30,0,0.06,11.5],[2,270,280,30,0,0.045,8.6],[2,270,300,30,0,0.06,11.78],
    [2,240,315,30,0,0.06,11.87],
  ];

  // [筋条数, 袋宽, 筋条以下长, 筋条以上长, 插底, 厚度, 印刷色数, 包装方式, 每包装数量, 样本重量g, 报价USD, 表内成本USD]
  const referenceRows = [
    [1,50,70,20,0,.04,0,'袋装',300,.44,.467857,.267149],[1,60,85,20,0,.04,0,'袋装',300,.58,.547,.355116],
    [1,70,100,20,0,.04,0,'袋装',200,.76,.463846,.304922],[1,85,120,20,0,.04,0,'袋装',200,1.07,.6138,.425087],
    [1,100,140,20,0,.04,0,'袋装',200,1.46,.783,.574215],[1,120,170,20,0,.04,0,'袋装',100,2.1,.551667,.409632],
    [1,140,200,20,0,.04,0,'袋装',100,2.89,.7068,.556281],[1,170,240,20,0,.04,0,'袋装',100,4.16,1.012,.800184],
    [1,200,280,20,0,.04,0,'袋装',100,5.66,1.358,1.09157],[1,240,340,20,0,.04,0,'袋装',100,7.9,1.94,1.551065],
    [1,280,400,20,0,.04,0,'袋装',100,10.81,2.605333,2.060098],[1,340,480,20,0,.04,0,'袋装',100,15.64,3.733,2.989564],
    [1,400,560,20,0,.04,0,'袋装',100,21.5,5.126,4.268358],
    [1,50,70,20,0,.04,1,'袋装',300,.44,.505857,.318306],[1,60,85,20,0,.04,1,'袋装',300,.58,.596,.407437],
    [1,70,100,20,0,.04,1,'袋装',200,.76,.506462,.344897],[1,85,120,20,0,.04,1,'袋装',200,1.07,.6708,.471982],
    [1,100,140,20,0,.04,1,'袋装',200,1.46,.85675,.630334],[1,120,170,20,0,.04,1,'袋装',100,2.1,.602667,.444512],
    [1,140,200,20,0,.04,1,'袋装',100,2.89,.7726,.602012],[1,170,240,20,0,.04,1,'袋装',100,4.16,1.070286,.855139],
    [1,200,280,20,0,.04,1,'袋装',100,5.66,1.496,1.160973],[1,240,340,20,0,.04,1,'袋装',100,7.9,2.133333,1.631841],
    [1,280,400,20,0,.04,1,'袋装',100,10.81,2.83,2.152374],[1,340,480,20,0,.04,1,'袋装',100,15.64,4.055,3.097232],
    [1,400,560,20,0,.04,1,'袋装',100,21.5,5.564,4.395373],
    [1,50,70,20,0,.08,0,'袋装',100,.84,.291615,.166455],[1,60,85,20,0,.08,0,'袋装',100,1.18,.343556,.234604],
    [1,70,100,20,0,.08,0,'袋装',100,1.53,.434571,.303883],[1,85,120,20,0,.08,0,'袋装',100,2.12,.5825,.41313],
    [1,100,140,20,0,.08,0,'袋装',100,2.91,.74125,.572466],[1,120,170,20,0,.08,0,'袋装',100,4.02,1.025667,.787777],
    [1,140,200,20,0,.08,0,'袋装',100,5.4,1.3792,1.04609],[1,170,240,20,0,.08,0,'袋装',100,7.63,1.920556,1.475642],
    [1,200,280,20,0,.08,0,'袋装',100,9.8,2.655833,1.925711],[1,240,340,20,0,.08,0,'袋装',100,14.46,3.78,2.846585],
    [1,280,400,20,0,.08,0,'袋装',100,21.4,5.087143,4.105877],[1,340,480,20,0,.08,0,'袋装',100,28.9,7.362,5.562806],
    [1,400,560,20,0,.08,0,'袋装',50,39.5,5.025,3.877662],
    [2,270,280,30,0,.065,1,'盒装',15,12.5,.545,.438088],[2,270,280,30,0,.065,1,'盒装',50,12.5,1.738,1.289813],
    [2,180,210,30,0,.065,1,'盒装',25,6.6,.532,.411271],[2,180,210,30,0,.065,1,'盒装',80,6.6,1.668,1.117063],
    [2,160,170,30,0,.06,1,'盒装',25,4.6,.329759,.24756],[2,180,200,30,0,.06,1,'盒装',20,5.9,.338217,.253453],
    [2,270,280,30,0,.06,1,'盒装',10,11.5,.332581,.251184],
  ];

  const weightModels = {
    1: { areaCoefficient: 0.0010360422618967777, trackGramsPerMeter: 3.0632901174051894 },
    2: { areaCoefficient: 0.0010495003707077703, trackGramsPerMeter: 1.8160910037963225 },
  };

  const weightSamples = weightRowsToObjects(weightRows);
  const referenceSamples = referenceRows.map(([trackCount, widthMm, lengthBelowMm, lengthAboveMm, bottomMm, thicknessMm, printingColorCount, packagingType, packageCount, weightG, quoteUsd, costUsd], index) => ({
    id: `zip-${index + 1}`,
    trackCount: Number(trackCount), widthMm: Number(widthMm), lengthBelowMm: Number(lengthBelowMm),
    lengthAboveMm: Number(lengthAboveMm), bottomMm: Number(bottomMm), thicknessMm: Number(thicknessMm),
    printingColorCount: Number(printingColorCount), packagingType, packageCount: Number(packageCount),
    weightG: Number(weightG), quoteUsd: Number(quoteUsd), costUsd: Number(costUsd),
    ratio: Number(costUsd) / Number(quoteUsd),
    areaMm2: Number(widthMm) * (Number(lengthBelowMm) + Number(lengthAboveMm) + Number(bottomMm)),
  }));

  function weightRowsToObjects(rows) {
    return rows.map(([trackCount, widthMm, lengthBelowMm, lengthAboveMm, bottomMm, thicknessMm, weightG], index) => ({
      id: `weight-${index + 1}`, trackCount, widthMm, lengthBelowMm, lengthAboveMm, bottomMm, thicknessMm, weightG,
    }));
  }

  function bagVolumeMm3(inputs) {
    const developedLengthMm = inputs.lengthBelowMm + inputs.lengthAboveMm + inputs.bottomMm;
    return 2 * inputs.widthMm * developedLengthMm * inputs.thicknessMm;
  }

  function calculateBagWeightModel(inputs) {
    const model = weightModels[inputs.trackCount];
    if (!model) throw new RangeError('Track count must be 1 or 2.');
    if (![inputs.widthMm, inputs.lengthBelowMm, inputs.lengthAboveMm, inputs.bottomMm, inputs.thicknessMm].every(Number.isFinite) ||
        inputs.widthMm <= 0 || inputs.lengthBelowMm <= 0 || inputs.lengthAboveMm < 0 || inputs.bottomMm < 0 || inputs.thicknessMm <= 0) {
      throw new RangeError('Bag dimensions and thickness must be valid positive values.');
    }
    const volumeWeightG = model.areaCoefficient * bagVolumeMm3(inputs);
    const trackCorrectionG = model.trackGramsPerMeter * inputs.trackCount * inputs.widthMm / 1000;
    return volumeWeightG + trackCorrectionG;
  }

  function calculateBagWeight(inputs) {
    if (!Number.isFinite(inputs.zipperWeightPercent) || inputs.zipperWeightPercent < 0 || inputs.zipperWeightPercent > 100) {
      throw new RangeError('Zipper weight share must be between 0 and 100 percent.');
    }
    const exact = weightSamples.find((sample) =>
      sample.trackCount === inputs.trackCount && sample.widthMm === inputs.widthMm &&
      sample.lengthBelowMm === inputs.lengthBelowMm && sample.lengthAboveMm === inputs.lengthAboveMm &&
      sample.bottomMm === inputs.bottomMm && sample.thicknessMm === inputs.thicknessMm);
    const totalWeightG = exact ? exact.weightG : calculateBagWeightModel(inputs);
    const bodyWeightPercent = 100 - inputs.zipperWeightPercent;
    return {
      totalWeightG,
      bodyWeightPercent,
      zipperWeightPercent: inputs.zipperWeightPercent,
      bodyWeightG: totalWeightG * bodyWeightPercent / 100,
      zipperWeightG: totalWeightG * inputs.zipperWeightPercent / 100,
      developedLengthMm: inputs.lengthBelowMm + inputs.lengthAboveMm + inputs.bottomMm,
      source: exact ? 'measured-sample' : 'size-model',
    };
  }

  function calculateCosts(inputs, printingColorCount) {
    if (![0, 1, 2].includes(printingColorCount)) throw new RangeError('Printing color count must be 0, 1, or 2.');
    const packagingMethod = inputs.packagingMethod ?? 'box';
    if (!['box', 'bag'].includes(packagingMethod)) throw new RangeError('Packaging method must be box or bag.');
    const weight = calculateBagWeight(inputs);
    const bodyBlendPrice = inputs.ldpePrice * inputs.bodyLdpePercent / 100 + inputs.lldpePrice * inputs.bodyLldpePercent / 100;
    const zipperBlendPrice = inputs.ldpePrice * inputs.zipperLdpePercent / 100 + inputs.colorMasterbatchPrice * inputs.zipperColorPercent / 100;
    const body = weight.bodyWeightG * bodyBlendPrice / 1_000_000;
    const zipper = weight.zipperWeightG * zipperBlendPrice / 1_000_000;
    const ink = printingColorCount === 0 ? 0 : 18 * inputs.inkPricePerKg / inputs.inkBagsPerDrum * printingColorCount;
    const plate = printingColorCount === 0 ? 0 : inputs.platePrice * inputs.widthMm / 100_000_000 * printingColorCount;
    const printing = ink + plate;
    let glue = 0;
    let box = 0;
    let packagingBag = 0;
    let dustBag = 0;
    let carton;
    if (packagingMethod === 'box') {
      if (![inputs.bagsPerBox, inputs.boxesPerCarton].every((value) => Number.isFinite(value) && value > 0)) {
        throw new RangeError('Box packaging quantities must be positive.');
      }
      glue = 0.7 * inputs.gluePricePerKg / 1000 / inputs.bagsPerBox;
      box = inputs.boxPrice / inputs.bagsPerBox;
      carton = inputs.cartonPrice / inputs.bagsPerBox / inputs.boxesPerCarton;
    } else {
      if (![inputs.bagsPerPackage, inputs.packagesPerCarton].every((value) => Number.isFinite(value) && value > 0)) {
        throw new RangeError('Bag packaging quantities must be positive.');
      }
      packagingBag = inputs.packagingBagPrice / inputs.bagsPerPackage;
      dustBag = inputs.dustBagPrice / inputs.bagsPerPackage / inputs.packagesPerCarton;
      carton = inputs.cartonPrice / inputs.bagsPerPackage / inputs.packagesPerCarton;
    }
    const total = body + zipper + printing + glue + box + packagingBag + dustBag + carton;
    return { ...weight, body, zipper, printing, ink, plate, glue, box, packagingBag, dustBag, carton, total, printingColorCount, packagingMethod, bodyBlendPrice, zipperBlendPrice };
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function interpolateSize(samples, targetAreaMm2) {
    const grouped = new Map();
    for (const sample of samples) {
      if (!grouped.has(sample.areaMm2)) grouped.set(sample.areaMm2, []);
      grouped.get(sample.areaMm2).push(sample);
    }
    const points = [...grouped.entries()].map(([areaMm2, items]) => ({ areaMm2, ratio: median(items.map((item) => item.ratio)), samples: items }))
      .sort((a, b) => a.areaMm2 - b.areaMm2);
    if (targetAreaMm2 <= points[0].areaMm2) return { ...points[0], reason: targetAreaMm2 < points[0].areaMm2 ? 'below-size-range' : 'exact-size' };
    const last = points.at(-1);
    if (targetAreaMm2 >= last.areaMm2) return { ...last, reason: targetAreaMm2 > last.areaMm2 ? 'above-size-range' : 'exact-size' };
    const upperIndex = points.findIndex((point) => point.areaMm2 >= targetAreaMm2);
    const lower = points[upperIndex - 1];
    const upper = points[upperIndex];
    if (targetAreaMm2 === upper.areaMm2) return { ...upper, reason: 'exact-size' };
    const fraction = (Math.log(targetAreaMm2) - Math.log(lower.areaMm2)) / (Math.log(upper.areaMm2) - Math.log(lower.areaMm2));
    return {
      ratio: lower.ratio + (upper.ratio - lower.ratio) * fraction,
      reason: 'interpolated-by-size', samples: [...lower.samples, ...upper.samples],
      lowerAreaMm2: lower.areaMm2, upperAreaMm2: upper.areaMm2,
    };
  }

  function estimateReferenceRatio(inputs) {
    const candidates = referenceSamples.filter((sample) =>
      sample.trackCount === inputs.trackCount && sample.printingColorCount === inputs.printingColorCount &&
      (!inputs.packagingType || sample.packagingType === inputs.packagingType));
    if (candidates.length === 0) return { ratio: null, reason: 'no-matching-samples', samples: [], sampleCount: 0 };
    const areaMm2 = inputs.widthMm * (inputs.lengthBelowMm + inputs.lengthAboveMm + inputs.bottomMm);
    if (!Number.isFinite(areaMm2) || areaMm2 <= 0) return { ratio: null, reason: 'invalid-size', samples: [], sampleCount: candidates.length };
    const byThickness = new Map();
    for (const sample of candidates) {
      if (!byThickness.has(sample.thicknessMm)) byThickness.set(sample.thicknessMm, []);
      byThickness.get(sample.thicknessMm).push(sample);
    }
    const thicknesses = [...byThickness.keys()].sort((a, b) => a - b);
    const estimates = thicknesses.map((thicknessMm) => ({
      thicknessMm,
      ...interpolateSize(byThickness.get(thicknessMm), areaMm2),
    }));
    const exactIndex = estimates.findIndex((estimate) => estimate.thicknessMm === inputs.thicknessMm);
    if (exactIndex >= 0) {
      const selected = estimates[exactIndex];
      return { ...selected, sampleCount: candidates.length, thicknessMode: 'exact' };
    }
    let lower = estimates.filter((estimate) => estimate.thicknessMm < inputs.thicknessMm).at(-1);
    let upper = estimates.find((estimate) => estimate.thicknessMm > inputs.thicknessMm);
    if (!lower) return { ...estimates[0], sampleCount: candidates.length, thicknessMode: 'below-range' };
    if (!upper) return { ...estimates.at(-1), sampleCount: candidates.length, thicknessMode: 'above-range' };
    const fraction = (inputs.thicknessMm - lower.thicknessMm) / (upper.thicknessMm - lower.thicknessMm);
    return {
      ratio: lower.ratio + (upper.ratio - lower.ratio) * fraction,
      reason: lower.reason === 'exact-size' && upper.reason === 'exact-size' ? 'interpolated-by-thickness' : 'interpolated-by-size-and-thickness',
      samples: [...lower.samples, ...upper.samples], sampleCount: candidates.length, thicknessMode: 'interpolated',
      lowerThicknessMm: lower.thicknessMm, upperThicknessMm: upper.thicknessMm,
    };
  }

  const api = { weightSamples, referenceSamples, weightModels, calculateBagWeight, calculateBagWeightModel, calculateCosts, estimateReferenceRatio };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ShikeZipper = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
