(function (root) {
  const EXCHANGE_RATE_RMB_PER_USD = 6.7;
  const FILM_DENSITY = 0.00091;

  const sourceRows = [
    [0.03, 70, 100, false, 0.006016366666666667, 0.002056, '渠道1'],
    [0.03, 80, 120, false, 0.00801116, 0.0022935, '渠道1'],
    [0.03, 105, 155, false, 0.013087969166666666, 0.00356, '渠道1'],
    [0.03, 140, 200, false, 0.02201022857142857, 0.004962857142857143, '渠道1'],
    [0.03, 160, 225, false, 0.0281756, 0.005566, '渠道1'],
    [0.03, 195, 270, false, 0.040683315000000005, 0.00757, '渠道1'],
    [0.03, 225, 310, false, 0.053679391666666666, 0.009923333333333333, '渠道1'],
    [0.03, 270, 380, false, 0.07867646000000002, 0.014060000000000001, '渠道1'],
    [0.03, 300, 450, false, 0.10334183333333334, 0.01787333333333333, '渠道1'],
    [0.03, 310, 435, false, 0.10323126833333333, 0.018026666666666667, '渠道1'],
    [0.03, 360, 540, false, 0.14634224, 0.026390000000000004, '渠道1'],
    [0.03, 380, 600, false, 0.1711088, 0.03137, '渠道1'],
    [0.03, 500, 700, false, 0.263385, 0.047259999999999996, '渠道1'],
    [0.03, 650, 800, false, 0.38986699999999996, 0.0688, '渠道1'],
    [0.02, 110, 160, true, 0.015660079999999996, 0.00297639536047084, '渠道2'],
    [0.02, 120, 230, true, 0.021258, 0.00398058177337283, '渠道2'],
    [0.02, 160, 220, true, 0.027608639999999997, 0.00485892968579781, '渠道2'],
    [0.02, 195, 270, true, 0.038257879999999994, 0.0066532131158562905, '渠道2'],
    [0.02, 225, 310, true, 0.04871280000000001, 0.00842525594989998, '渠道2'],
    [0.02, 270, 370, true, 0.06672754666666668, 0.0115279799440735, '渠道2'],
    [0.02, 310, 430, true, 0.0865392, 0.0149487758004001, '渠道2'],
    [0.025, 110, 160, true, 0.017912329999999997, 0.00311749237578858, '渠道2'],
    [0.025, 120, 230, true, 0.024670499999999995, 0.00429023343041237, '渠道2'],
    [0.025, 160, 220, true, 0.031976639999999994, 0.00524126224734574, '渠道2'],
    [0.025, 195, 270, true, 0.0446904425, 0.00729933044101015, '渠道2'],
    [0.025, 225, 310, true, 0.05715873750000001, 0.00933707067319972, '渠道2'],
    [0.025, 270, 370, true, 0.07870542166666669, 0.0129215439303867, '渠道2'],
    [0.025, 310, 430, true, 0.10240732500000001, 0.0168926495572011, '渠道2'],
    [0.02, 110, 160, false, 0.01013896, 0.00282043162289495, '渠道2'],
    [0.02, 120, 230, false, 0.01523496, 0.00350486574301739, '渠道2'],
    [0.02, 160, 220, false, 0.01957792, 0.00422525609547314, '渠道2'],
    [0.02, 195, 270, false, 0.028470440000000003, 0.00591453474637944, '渠道2'],
    [0.02, 225, 310, false, 0.0374196, 0.007534901324625321, '渠道2'],
    [0.02, 270, 370, false, 0.05317570666666667, 0.0104599230638334, '渠道2'],
    [0.02, 310, 430, false, 0.07097968000000002, 0.0137176257631759, '渠道2'],
    [0.025, 110, 160, false, 0.012140959999999998, 0.002865603622741, '渠道2'],
    [0.025, 120, 230, false, 0.018374459999999995, 0.0040131580746114795, '渠道2'],
    [0.025, 160, 220, false, 0.023581919999999996, 0.00487590020627788, '渠道2'],
    [0.025, 195, 270, false, 0.0344593775, 0.00685427186982997, '渠道2'],
    [0.025, 225, 310, false, 0.0453536625, 0.00882912268228573, '渠道2'],
    [0.025, 270, 370, false, 0.06453933166666669, 0.0123112322744243, '渠道2'],
    [0.025, 310, 430, false, 0.08614255500000002, 0.0161851583689568, '渠道2'],
  ];

  const referenceSamples = sourceRows.map(([thicknessMm, widthMm, lengthMm, hasTape, costRmb, priceUsd, channel], index) => ({
    name: `${channel} · OPP ${widthMm}×${lengthMm} mm · ${Math.round(thicknessMm * 1000)}μ${hasTape ? '有胶条' : '无胶条'}`,
    thicknessMm,
    widthMm,
    lengthMm,
    hasTape,
    costRmb,
    priceUsd,
    priceRmb: priceUsd * EXCHANGE_RATE_RMB_PER_USD,
    ratio: costRmb / (priceUsd * EXCHANGE_RATE_RMB_PER_USD),
    sourceIndex: index,
  }));

  const medianOf = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };

  function calculateCosts(inputs) {
    const hasBottom = inputs.hasBottom === true || inputs.hasBottom === 'yes';
    const hasTape = inputs.hasTape === true || inputs.hasTape === 'yes';
    const unfoldedLengthMm = inputs.lengthMm + (hasBottom ? inputs.bottomMm : 0);
    const filmWeightG = inputs.widthMm * unfoldedLengthMm * inputs.thicknessMm * 2 * FILM_DENSITY +
      (hasTape ? inputs.lidMm * inputs.widthMm * inputs.thicknessMm * FILM_DENSITY : 0);
    const tapeLengthM = hasTape ? inputs.widthMm / 1000 : 0;
    const film = filmWeightG * inputs.filmPricePerTon / 1_000_000;
    const tape = inputs.tapePricePer10kMeters / 10_000 * tapeLengthM;
    const packagingBag = inputs.packagingBagPrice / inputs.bagsPerPack;
    const dustBag = inputs.dustBagPrice / inputs.bagsPerPack / inputs.packsPerCarton;
    const carton = inputs.cartonPrice / inputs.bagsPerPack / inputs.packsPerCarton;
    const total = film + tape + packagingBag + dustBag + carton;

    return { filmWeightG, tapeLengthM, film, tape, packagingBag, dustBag, carton, total, material: film + tape, unfoldedLengthMm };
  }

  function estimateReferenceRatio(inputs, samples = referenceSamples) {
    if (inputs.filmType === 'CPP') return { ratio: null, reason: 'cpp-no-samples', samples: [] };

    const hasTape = inputs.hasTape === true || inputs.hasTape === 'yes';
    const sameStructure = samples.filter((sample) => sample.hasTape === hasTape);
    if (sameStructure.length === 0) return { ratio: null, reason: 'no-structure-samples', samples: [] };

    const nearestThicknessDelta = Math.min(...sameStructure.map((sample) => Math.abs(sample.thicknessMm - inputs.thicknessMm)));
    if (nearestThicknessDelta > 0.005000001) return { ratio: null, reason: 'no-close-thickness-samples', samples: [] };
    const thicknessSamples = sameStructure.filter((sample) => Math.abs(Math.abs(sample.thicknessMm - inputs.thicknessMm) - nearestThicknessDelta) < 1e-9);
    const byArea = new Map();
    for (const sample of thicknessSamples) {
      const area = sample.widthMm * sample.lengthMm;
      if (!byArea.has(area)) byArea.set(area, []);
      byArea.get(area).push(sample);
    }
    const points = [...byArea.entries()].map(([area, items]) => ({
      area,
      ratio: medianOf(items.map((item) => item.ratio)),
      samples: items,
    })).sort((a, b) => a.area - b.area);

    const hasBottom = inputs.hasBottom === true || inputs.hasBottom === 'yes';
    const targetArea = inputs.widthMm * (inputs.lengthMm + (hasBottom ? inputs.bottomMm : 0));
    if (!Number.isFinite(targetArea) || targetArea <= 0) return { ratio: null, reason: 'invalid-size', samples: [] };

    if (targetArea <= points[0].area) {
      return { ratio: points[0].ratio, reason: targetArea < points[0].area ? 'below-size-range' : 'exact-size', samples: points[0].samples, thicknessMm: points[0].samples[0].thicknessMm };
    }
    const last = points.at(-1);
    if (targetArea >= last.area) {
      return { ratio: last.ratio, reason: targetArea > last.area ? 'above-size-range' : 'exact-size', samples: last.samples, thicknessMm: last.samples[0].thicknessMm };
    }

    const upperIndex = points.findIndex((point) => point.area >= targetArea);
    const lower = points[upperIndex - 1];
    const upper = points[upperIndex];
    if (targetArea === upper.area) {
      return { ratio: upper.ratio, reason: 'exact-size', samples: upper.samples, thicknessMm: upper.samples[0].thicknessMm };
    }
    const fraction = (Math.log(targetArea) - Math.log(lower.area)) / (Math.log(upper.area) - Math.log(lower.area));
    const ratio = lower.ratio + (upper.ratio - lower.ratio) * fraction;
    return {
      ratio,
      reason: 'interpolated-by-size',
      samples: [...lower.samples, ...upper.samples],
      thicknessMm: lower.samples[0].thicknessMm,
      lowerArea: lower.area,
      upperArea: upper.area,
    };
  }

  const api = { EXCHANGE_RATE_RMB_PER_USD, referenceSamples, calculateCosts, estimateReferenceRatio };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ShikeOpp = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
