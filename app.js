(() => {
  const STORAGE_KEY = 'shike-quotation-v1';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const fields = $$('[data-field]');
  const choiceFields = $$('[data-choice-field]');
  const printingSelect = $('[data-choice-field="printingColors"]');
  const zipperPrintingSelect = $('[data-choice-field="zipperPrintingColors"]');
  const zipperPackagingSelect = $('[data-choice-field="zipperPackagingMethod"]');
  const printingFields = $$('[data-printing-field="slider"]');
  const zipperPrintingFields = $$('[data-printing-field="zipper"]');
  const money = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const percent = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const referenceSamples = [
    { name: '滑块袋 M号 · 40枚', price: 0.14530625, boxPackCost: 0.51, bagsPerBox: 40, cartonPrice: 4.3, boxesPerCarton: 24, materialCost: 0.08182 },
    { name: '滑块袋 L号 · 22枚', price: 0.2791666667, boxPackCost: 0.48, bagsPerBox: 22, cartonPrice: 4.0, boxesPerCarton: 24, materialCost: 0.14482 },
    { name: '滑块袋 M号 · 14枚', price: 0.1803616071, boxPackCost: 0.39, bagsPerBox: 14, cartonPrice: 4.6, boxesPerCarton: 80, materialCost: 0.0948751111 },
    { name: '滑块袋 L号 · 8枚', price: 0.29019375, boxPackCost: 0.42, bagsPerBox: 8, cartonPrice: 4.8, boxesPerCarton: 80, materialCost: 0.1613296444 },
  ].map((sample) => {
    const boxCost = sample.boxPackCost / sample.bagsPerBox;
    const cartonCost = sample.cartonPrice / sample.boxesPerCarton / sample.bagsPerBox;
    const totalCost = sample.materialCost + boxCost + cartonCost;
    return { ...sample, boxCost, cartonCost, totalCost, ratio: totalCost / sample.price };
  });

  let selectedProduct = 'slider';
  let selectedStrategy = 'reference';
  let lastCalculation = null;
  let toastTimer;

  const activeFields = () => fields.filter((input) => {
    const productPanel = input.closest('[data-product-panel]');
    return !productPanel || productPanel.dataset.productPanel === selectedProduct;
  });
  const readInputs = () => Object.fromEntries(activeFields().map((input) => [input.dataset.field, input.value.trim() === '' ? NaN : Number(input.value)]));
  const displayMoney = (value) => Number.isFinite(value) ? `¥${money.format(value)}` : '—';
  const displayNumber = (value) => Number.isFinite(value) ? money.format(value) : '—';
  const displayRatio = (value) => Number.isFinite(value) ? `${percent.format(value * 100)}%` : '—';
  const medianOf = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };

  function readStoredState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (['slider', 'opp', 'zipper'].includes(saved.product)) selectedProduct = saved.product;
      for (const input of fields) {
        const product = input.closest('[data-product-panel]')?.dataset.productPanel || 'shared';
        const value = saved.values?.[product]?.[input.dataset.field] ?? (product === 'slider' ? saved.values?.[input.dataset.field] : undefined);
        if (typeof value === 'string' && value !== '') input.value = value;
      }
      for (const input of choiceFields) {
        const product = input.closest('[data-product-panel]')?.dataset.productPanel;
        const value = saved.choices?.[product]?.[input.dataset.choiceField] ?? (product === 'slider' ? saved.choices?.[input.dataset.choiceField] : undefined);
        if (input.dataset.choiceField === 'printingColors' && !['0', '1', '2'].includes(value)) continue;
        if (input.dataset.choiceField === 'zipperPackagingMethod' && !['box', 'bag'].includes(value)) continue;
        if (typeof value === 'string') input.value = value;
      }
      if (saved.statistic === 'mean' || saved.statistic === 'median') $('#statisticSelect').value = saved.statistic;
      if (saved.strategy === 'reference' || saved.strategy === 'free') selectedStrategy = saved.strategy;
    } catch { /* Local storage can be unavailable for local files. */ }
  }

  function saveState() {
    try {
      const values = { slider: {}, opp: {}, zipper: {}, shared: {} };
      for (const input of fields) {
        const product = input.closest('[data-product-panel]')?.dataset.productPanel || 'shared';
        values[product][input.dataset.field] = input.value;
      }
      const choices = { slider: {}, opp: {}, zipper: {} };
      for (const input of choiceFields) choices[input.closest('[data-product-panel]')?.dataset.productPanel][input.dataset.choiceField] = input.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ product: selectedProduct, values, choices, statistic: $('#statisticSelect').value, strategy: selectedStrategy }));
    } catch { /* The calculator still works when storage is blocked. */ }
  }

  function updatePrintingControls() {
    const colorCount = ShikePrinting.getPrintingColorCount(printingSelect.value);
    ShikePrinting.setPrintingInputsDisabled(printingSelect.value, printingFields);
    const colorLabels = ['无', '一色', '二色'];
    const colorLabel = colorCount === null ? '' : colorLabels[colorCount];
    $('#printingCostLabel').textContent = colorCount === 0
      ? '印刷（无）'
      : `印刷（${colorLabel}：水墨 + 印刷版）`;
    $('#printingStatus').textContent = colorCount === 0
      ? '无印刷：不计水墨和印刷版费用，相关价格输入已禁用。'
      : colorCount === null
        ? '请选择印刷颜色数。'
        : `每色计一套水墨和印刷版费用；当前${colorLabel}。`;
  }

  function updateZipperPrintingControls() {
    const colorCount = ShikePrinting.getPrintingColorCount(zipperPrintingSelect.value);
    ShikePrinting.setPrintingInputsDisabled(zipperPrintingSelect.value, zipperPrintingFields);
    const labels = ['无', '一色', '二色'];
    $('#zipperPrintingStatus').textContent = colorCount === 0
      ? '无印刷：不计水墨和印刷版费用，相关价格输入已禁用。'
      : colorCount === null
        ? '请选择印刷颜色数。'
        : `每色计一套水墨和印刷版费用；当前${labels[colorCount]}。`;
  }

  function updateZipperPackagingControls() {
    const method = zipperPackagingSelect.value;
    $$('[data-packaging-field]').forEach((field) => {
      const active = field.dataset.packagingField === method;
      field.hidden = !active;
      field.querySelectorAll('input, select').forEach((input) => { input.disabled = !active; });
    });
    $('#zipperPackagingStatus').lastElementChild.textContent = method === 'box'
      ? '盒装按每盒入数分摊彩盒、热熔胶和纸箱成本。'
      : method === 'bag'
        ? '袋装按包装数量分摊包装袋、防尘袋和纸箱成本；请填写实际装箱数和单价。'
        : '请选择包装方式。';
  }

  function validate(inputs) {
    const issues = [];
    const printingColorCount = selectedProduct === 'slider'
      ? ShikePrinting.getPrintingColorCount(printingSelect.value)
      : selectedProduct === 'zipper'
        ? ShikePrinting.getPrintingColorCount(zipperPrintingSelect.value)
        : 0;
    if ((selectedProduct === 'slider' || selectedProduct === 'zipper') && printingColorCount === null) issues.unshift('请选择印刷颜色数');
    for (const input of activeFields()) {
      if (input.dataset.field === 'markupPercent' && selectedStrategy !== 'free') {
        input.setAttribute('aria-invalid', 'false');
        continue;
      }
      if (input.disabled) {
        input.setAttribute('aria-invalid', 'false');
        continue;
      }
      if (input.dataset.printingField !== undefined && printingColorCount === 0) {
        input.setAttribute('aria-invalid', 'false');
        continue;
      }
      const value = inputs[input.dataset.field];
      const min = input.min === '' ? -Infinity : Number(input.min);
      const max = input.max === '' ? Infinity : Number(input.max);
      const invalid = !Number.isFinite(value) || value < min || value > max;
      input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      if (invalid) issues.push(`${input.closest('.field')?.querySelector('span')?.textContent?.trim() || input.dataset.field}需填写有效数值`);
    }
    if (selectedProduct === 'slider') {
      const packagingMethod = $('[data-choice-field="packagingMethod"]').value.trim();
      if (packagingMethod !== '盒装') issues.unshift('当前成本公式按盒装分摊，其他包装方式暂不能计算报价');
      const bodyTotal = inputs.bodyLdpePercent + inputs.bodyLldpePercent;
      const ratioValid = Number.isFinite(bodyTotal) && Math.abs(bodyTotal - 100) <= 0.02;
      $('#bodyRatioStatus').textContent = Number.isFinite(bodyTotal) ? `合计 ${percent.format(bodyTotal)}%` : '请检查配比';
      $('#bodyRatioStatus').classList.toggle('ratio-invalid', !ratioValid);
      if (!ratioValid) issues.unshift('袋本体 LDPE 与 LLDPE 配比合计需为 100%');

      const zipperParts = inputs.zipperLdpeParts + inputs.zipperLldpeParts + inputs.zipperMlldpeParts + inputs.zipperHdpeParts;
      if (Number.isFinite(zipperParts) && zipperParts <= 0) issues.unshift('拉链条树脂份数合计需大于 0');
    } else if (selectedProduct === 'opp' && $('[data-choice-field="oppPackagingMethod"]').value.trim() !== '袋装') {
      issues.unshift('当前 OPP/CPP 成本公式按袋装分摊，其他包装方式暂不能计算报价');
    } else if (selectedProduct === 'zipper') {
      if (!['box', 'bag'].includes(zipperPackagingSelect.value)) issues.unshift('请选择盒装或袋装');
      const bodyWeightPercent = Number.isFinite(inputs.zipperWeightPercent)
        ? 100 - inputs.zipperWeightPercent
        : NaN;
      $('#zipperBodyWeightPercent').value = Number.isFinite(bodyWeightPercent)
        ? String(Number(bodyWeightPercent.toFixed(1)))
        : '';
      const ratios = [
        { total: inputs.bodyLdpePercent + inputs.bodyLldpePercent, selector: '#zipperBodyRatioStatus', label: '袋本体 LDPE 与 LLDPE 配比' },
        { total: inputs.zipperLdpePercent + inputs.zipperColorPercent, selector: '#zipperRatioStatus', label: '夹链 LDPE 与色母配比' },
      ];
      for (const ratio of ratios) {
        const valid = Number.isFinite(ratio.total) && Math.abs(ratio.total - 100) <= 0.02;
        if (ratio.selector) {
          const status = $(ratio.selector);
          status.textContent = Number.isFinite(ratio.total) ? `合计 ${percent.format(ratio.total)}%` : '请检查配比';
          status.classList.toggle('ratio-invalid', !valid);
        }
        if (!valid) issues.unshift(`${ratio.label}合计需为 100%`);
      }
      if (![1, 2].includes(Number($('[data-choice-field="trackCount"]').value))) issues.unshift('请选择单筋条或双筋条');
    }
    return issues;
  }

  function calculateSliderCosts(inputs) {
    const bodyBlendPrice = inputs.ldpePrice * inputs.bodyLdpePercent / 100 + inputs.lldpePrice * inputs.bodyLldpePercent / 100;
    const unfoldedLengthMm = inputs.lengthMm + inputs.bottomMm;
    const finishedBodyWeightG = unfoldedLengthMm * inputs.widthMm * inputs.thicknessMm * 2 * 0.00092;
    const blownBodyWeightG = finishedBodyWeightG * (unfoldedLengthMm + inputs.flyEdgeMm) / unfoldedLengthMm;
    const body = bodyBlendPrice * blownBodyWeightG / 1_000_000;

    const zipperParts = inputs.zipperLdpeParts + inputs.zipperLldpeParts + inputs.zipperMlldpeParts + inputs.zipperHdpeParts;
    const zipperResinBlendPrice = (
      inputs.ldpePrice * inputs.zipperLdpeParts +
      inputs.lldpePrice * inputs.zipperLldpeParts +
      inputs.mlldpePrice * inputs.zipperMlldpeParts +
      inputs.hdpePrice * inputs.zipperHdpeParts
    ) / zipperParts;
    const zipperBlendPrice = zipperResinBlendPrice * (1 - inputs.zipperColorPercent / 100) + inputs.colorMasterbatchPrice * inputs.zipperColorPercent / 100;
    const zipperWeightG = inputs.widthMm / 1000 * inputs.zipperGramsPerMeter;
    const zipper = zipperWeightG * zipperBlendPrice / 1_000_000;

    const zipperHead = inputs.zipperHeadPrice;
    const printCosts = ShikePrinting.calculatePrintingCosts(inputs, printingSelect.value);
    const { ink, plate, printing } = printCosts;
    const glue = 0.7 * inputs.gluePricePerKg / 1000 / inputs.bagsPerBox;
    const box = inputs.boxPrice / inputs.bagsPerBox;
    const carton = inputs.cartonPrice / inputs.bagsPerBox / inputs.boxesPerCarton;
    const total = body + zipper + zipperHead + printing + glue + box + carton;

    return { body, zipper, zipperHead, printing, glue, box, carton, total, ink, plate, printingColorCount: printCosts.colorCount, unfoldedLengthMm, finishedBodyWeightG, blownBodyWeightG, zipperWeightG };
  }

  function updateBenchmarks(inputs) {
    if (selectedProduct === 'slider') {
      $('#benchmarkTitle').textContent = '滑块袋历史报价成本占比';
      $('#benchmarkDescription').textContent = '按原始表中成本构成和单只报价重新计算，作为滑块袋参照报价样本。';
      $('#benchmarkTableHead').innerHTML = '<tr><th>历史产品</th><th>每袋报价</th><th>原料成本</th><th>彩盒分摊</th><th>外箱分摊</th><th>历史总成本</th><th class="ratio-heading">成本占比</th></tr>';
      $('#benchmarkNote').textContent = '历史成本占比 =（原料成本 + 彩盒分摊 + 外箱分摊）÷ 每袋报价。样本量较少，报价结果仅供参考。';
      $('#medianRatioLabel').textContent = '中位数';
      $('#meanRatioLabel').textContent = '平均值';
      $('#sliderStatisticControl').classList.remove('hidden');
      $('#oppReferenceMethod').classList.add('hidden');

      const rows = referenceSamples.map((sample) => `
        <tr>
          <td>${sample.name}</td>
          <td>${displayNumber(sample.price)}</td>
          <td>${displayNumber(sample.materialCost)}</td>
          <td>${displayNumber(sample.boxCost)}</td>
          <td>${displayNumber(sample.cartonCost)}</td>
          <td>${displayNumber(sample.totalCost)}</td>
          <td class="ratio-cell">${displayRatio(sample.ratio)}</td>
        </tr>`).join('');
      $('#benchmarkRows').innerHTML = rows;
      const ratios = referenceSamples.map((sample) => sample.ratio);
      const mean = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
      const median = medianOf(ratios);
      const min = Math.min(...ratios);
      const max = Math.max(...ratios);
      $('#sampleCount').innerHTML = `${ratios.length} <small>条</small>`;
      $('#medianRatio').textContent = displayRatio(median);
      $('#meanRatio').textContent = displayRatio(mean);
      $('#rangeRatio').textContent = `${percent.format(min * 100)}% – ${percent.format(max * 100)}%`;
      return { mean, median, min, max, referenceRatio: $('#statisticSelect').value === 'median' ? median : mean };
    }

    if (selectedProduct === 'opp') {
      $('#benchmarkTitle').textContent = 'OPP 供应商报价成本占比';
      $('#benchmarkDescription').textContent = '小尺寸袋的材料成本占比偏低；报价按厚度、胶条状态和袋尺寸匹配，不使用全部样本的统一中位数。';
      $('#benchmarkTableHead').innerHTML = '<tr><th>历史产品</th><th>厚度</th><th>尺寸（宽×长）</th><th>胶条</th><th>供应商报价（元/袋）</th><th>表中成本（元/袋）</th><th class="ratio-heading">成本占比</th></tr>';
      $('#benchmarkNote').textContent = '占比按表中成本（RMB）÷ 供应商报价（USD × 6.7）复算。参照报价使用相同胶条状态和最接近厚度的样本，并在相邻尺寸间插值；尺寸超出样本范围时采用边界样本占比。';
      $('#medianRatioLabel').textContent = '当前匹配占比';
      $('#meanRatioLabel').textContent = '全样本中位数';
      $('#sliderStatisticControl').classList.add('hidden');
      $('#oppReferenceMethod').classList.remove('hidden');
      $('#oppReferenceMethod').textContent = '按相同胶条状态、最接近厚度筛选，再按尺寸相邻样本插值；小规格占比低，会使用对应小规格比例。';

      const samples = ShikeOpp.referenceSamples;
      $('#benchmarkRows').innerHTML = samples.map((sample) => `
        <tr>
          <td>${sample.name}</td>
          <td>${Math.round(sample.thicknessMm * 1000)}μ</td>
          <td>${sample.widthMm}×${sample.lengthMm}</td>
          <td>${sample.hasTape ? '有' : '无'}</td>
          <td>${displayNumber(sample.priceRmb)}</td>
          <td>${displayNumber(sample.costRmb)}</td>
          <td class="ratio-cell">${displayRatio(sample.ratio)}</td>
        </tr>`).join('');
      const ratios = samples.map((sample) => sample.ratio);
      const mean = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
      const median = medianOf(ratios);
      const min = Math.min(...ratios);
      const max = Math.max(...ratios);
      const estimate = ShikeOpp.estimateReferenceRatio({
        ...inputs,
        filmType: $('[data-choice-field="filmType"]').value,
        hasTape: $('[data-choice-field="hasTape"]').value,
        hasBottom: $('[data-choice-field="hasBottom"]').value,
      });
      $('#sampleCount').innerHTML = `${ratios.length} <small>条</small>`;
      $('#medianRatio').textContent = displayRatio(estimate.ratio);
      $('#meanRatio').textContent = displayRatio(median);
      $('#rangeRatio').textContent = `${percent.format(min * 100)}% – ${percent.format(max * 100)}%`;
      return { mean, median, min, max, referenceRatio: estimate.ratio, estimate };
    }

    $('#benchmarkTitle').textContent = '夹链袋供应商报价成本占比';
    $('#benchmarkDescription').textContent = `按${zipperPackagingSelect.value === 'box' ? '盒装' : '袋装'}样本，并按筋条数、印刷色数、厚度和展开尺寸匹配历史报价；小规格使用对应尺寸占比。`;
    $('#benchmarkTableHead').innerHTML = '<tr><th>规格</th><th>厚度</th><th>筋条</th><th>印刷</th><th>包装规格</th><th>供应商报价（USD/包装单位）</th><th>表内成本（USD/包装单位）</th><th class="ratio-heading">成本占比</th></tr>';
    $('#benchmarkNote').textContent = '成本占比 = 表内成本 ÷ 供应商报价。仅使用所选包装方式的样本，再按筋条数、印刷色数、厚度及袋展开面积插值；尺寸或厚度超出样本范围时采用边界样本。';
    $('#medianRatioLabel').textContent = '当前匹配占比';
    $('#meanRatioLabel').textContent = zipperPackagingSelect.value === 'box' ? '盒装样本中位数' : '袋装样本中位数';
    $('#sliderStatisticControl').classList.add('hidden');
    $('#oppReferenceMethod').classList.remove('hidden');
    $('#oppReferenceMethod').textContent = '按当前包装方式、筋条数和印刷色数分组，再按袋面积及厚度插值；小规格使用对应小规格比例。';

    const packagingType = zipperPackagingSelect.value === 'box' ? '盒装' : '袋装';
    const samples = ShikeZipper.referenceSamples.filter((sample) => sample.packagingType === packagingType);
    $('#benchmarkRows').innerHTML = samples.map((sample) => {
      const totalLengthMm = sample.lengthBelowMm + sample.lengthAboveMm + sample.bottomMm;
      const trackLabel = sample.trackCount === 1 ? '单筋条' : '双筋条';
      const printingLabel = ['无', '一色', '二色'][sample.printingColorCount];
      return `
        <tr>
          <td>${sample.widthMm}×${totalLengthMm}mm（筋条上 ${sample.lengthAboveMm}mm）</td>
          <td>${Math.round(sample.thicknessMm * 1000)}μ</td>
          <td>${trackLabel}</td>
          <td>${printingLabel}</td>
          <td>${sample.packagingType} · ${sample.packageCount}只</td>
          <td>${displayNumber(sample.quoteUsd)}</td>
          <td>${displayNumber(sample.costUsd)}</td>
          <td class="ratio-cell">${displayRatio(sample.ratio)}</td>
        </tr>`;
    }).join('');
    const ratios = samples.map((sample) => sample.ratio);
    const mean = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
    const median = medianOf(ratios);
    const min = Math.min(...ratios);
    const max = Math.max(...ratios);
    const estimate = ShikeZipper.estimateReferenceRatio({
      ...inputs,
      trackCount: Number($('[data-choice-field="trackCount"]').value),
      printingColorCount: ShikePrinting.getPrintingColorCount(zipperPrintingSelect.value),
      packagingType,
    });
    $('#sampleCount').innerHTML = `${estimate.sampleCount} <small>条</small>`;
    $('#medianRatio').textContent = displayRatio(estimate.ratio);
    $('#meanRatio').textContent = displayRatio(median);
    $('#rangeRatio').textContent = `${percent.format(min * 100)}% – ${percent.format(max * 100)}%`;
    return { mean, median, min, max, referenceRatio: estimate.ratio, estimate };
  }

  function setCostRows(costs) {
    const sliderKeys = ['body', 'zipper', 'zipperHead', 'printing', 'glue', 'box', 'carton', 'total'];
    const oppKeys = ['body', 'zipper', 'box', 'carton', 'dustBag', 'total'];
    const zipperKeys = selectedProduct === 'zipper'
      ? ['body', 'zipper', 'printing', 'carton', 'total', ...(zipperPackagingSelect.value === 'box' ? ['glue', 'box'] : ['packagingBag', 'dustBag'])]
      : [];
    const visibleKeys = selectedProduct === 'slider' ? sliderKeys : selectedProduct === 'opp' ? oppKeys : zipperKeys;
    for (const key of [...new Set([...sliderKeys, ...oppKeys, ...zipperKeys])]) {
      const target = $(`[data-cost="${key}"]`);
      if (target) {
        target.textContent = displayNumber(costs?.[key]);
        target.closest('.cost-row').hidden = !visibleKeys.includes(key);
      }
    }
  }

  function setWeightRows(costs) {
    const slider = selectedProduct === 'slider';
    const zipper = selectedProduct === 'zipper';
    $('[data-weight-row="gross"]').hidden = !slider;
    $('[data-weight-row="total"]').hidden = !zipper;
    $('#weightNetLabel').textContent = slider ? '袋本体重量（不含飞边）' : zipper ? '袋本体重量估算' : 'OPP/CPP 膜单耗';
    $('#weightNetUnit').textContent = 'g';
    $('#weightZipperLabel').textContent = slider ? '拉链条重量' : zipper ? '夹链重量估算' : '胶条长度';
    $('#weightZipperUnit').textContent = slider || zipper ? 'g' : 'm';
    $('#bodyWeightNet').textContent = costs ? displayNumber(slider ? costs.finishedBodyWeightG : zipper ? costs.bodyWeightG : costs.filmWeightG) : '—';
    $('#bodyWeightGross').textContent = costs ? displayNumber(costs.blownBodyWeightG) : '—';
    $('#zipperWeight').textContent = costs ? displayNumber(slider || zipper ? costs.zipperWeightG : costs.tapeLengthM) : '—';
    $('#zipperTotalWeight').textContent = costs ? displayNumber(costs.totalWeightG) : '—';
  }

  function updateProductContext() {
    const slider = selectedProduct === 'slider';
    const opp = selectedProduct === 'opp';
    const zipper = selectedProduct === 'zipper';
    $('[data-product-panel="slider"]').hidden = !slider;
    $('[data-product-panel="opp"]').hidden = !opp;
    $('[data-product-panel="zipper"]').hidden = !zipper;
    $$('[data-product]').forEach((button) => {
      const active = button.dataset.product === selectedProduct;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $('#inputsTitle').textContent = slider ? '产品与物料参数' : opp ? 'OPP/CPP 产品与物料参数' : '夹链袋产品与物料参数';
    $('#productNotice').textContent = slider
      ? '当前成本根据已提供的滑块袋公式计算，包含原料、包装物、印刷和打胶成本；暂未计入人工、水电、房租及其他制造费用。'
      : opp
        ? 'OPP/CPP 按已提供的膜重、胶条及包装公式计算，包含材料与包装成本；暂未计入人工、水电、房租及其他制造费用。参照样本目前仅覆盖 OPP。'
        : '夹链袋重量按单筋条/双筋条实测统计样本拟合；夹链占比默认 10%，袋本体占比按剩余比例计算。包装成本按盒装或袋装方式分摊；暂未计入人工、水电、房租及其他制造费用。';
    $('#bodyCostLabel').textContent = opp ? 'OPP/CPP 膜原料' : '袋本体原料';
    $('#zipperCostLabel').textContent = slider ? '拉链条原料' : opp ? '胶条成本' : '夹链原料';
    $('#boxCostLabel').textContent = opp ? '包装袋分摊' : '彩盒分摊';
    $('#packagingBagCostLabel').textContent = '包装袋分摊';
    $('#dustBagCostLabel').textContent = '防尘袋分摊';
    $('#cartonCostLabel').textContent = opp || zipper ? '纸箱分摊' : '外箱分摊';
    if (zipper) {
      const colors = Number(zipperPrintingSelect.value);
      $('#printingCostLabel').textContent = colors === 0 ? '印刷（无）' : `印刷（${['', '一色', '二色'][colors]}：水墨 + 印刷版）`;
    } else if (!slider) {
      $('#printingCostLabel').textContent = '印刷';
    }
    $('#costFootText').textContent = slider
      ? '包含包装及加工辅料，不含制造费用'
      : opp
        ? '包含薄膜、胶条及包装分摊，不含制造费用'
        : `包含原料、印刷及${zipperPackagingSelect.value === 'box' ? '盒装' : '袋装'}分摊，不含制造费用`;
    if (opp) {
      $('#oppBottomLength').disabled = $('[data-choice-field="hasBottom"]').value !== 'yes';
      $('#oppLidLength').disabled = $('[data-choice-field="hasTape"]').value !== 'yes';
    }
  }

  function selectStrategy(strategy) {
    if (strategy === 'industry') {
      $('#industryMessage').classList.remove('hidden');
      showToast('行业报价所需的制造费用数据尚未提供');
      return;
    }
    selectedStrategy = strategy;
    $$('[data-strategy]').forEach((button) => {
      const active = button.dataset.strategy === strategy;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#referenceControl').classList.toggle('hidden', strategy !== 'reference');
    $('#freeControl').classList.toggle('hidden', strategy !== 'free');
    $('#industryMessage').classList.add('hidden');
    saveState();
    render();
  }

  function render() {
    updateProductContext();
    if (selectedProduct === 'slider') updatePrintingControls();
    if (selectedProduct === 'zipper') {
      updateZipperPrintingControls();
      updateZipperPackagingControls();
    }
    const inputs = readInputs();
    const statistics = updateBenchmarks(inputs);
    const issues = validate(inputs);
    const valid = issues.length === 0;
    const warning = $('#resultWarning');
    warning.classList.toggle('hidden', valid);
    warning.textContent = issues[0] || '';
    if (!valid) {
      setCostRows(null);
      setWeightRows(null);
      $('#quotePrice').textContent = '—';
      $('#totalCost').textContent = '—';
      $('#grossProfit').textContent = '—';
      $('#quoteCostRatio').textContent = '—';
      $('#quoteRule').textContent = '请先补全有效的产品与价格参数。';
      lastCalculation = null;
      return;
    }

    let costs;
    if (selectedProduct === 'slider') {
      costs = calculateSliderCosts(inputs);
    } else if (selectedProduct === 'opp') {
      const oppCosts = ShikeOpp.calculateCosts({
        ...inputs,
        filmType: $('[data-choice-field="filmType"]').value,
        hasTape: $('[data-choice-field="hasTape"]').value,
        hasBottom: $('[data-choice-field="hasBottom"]').value,
      });
      costs = {
        body: oppCosts.film,
        zipper: oppCosts.tape,
        zipperHead: 0,
        printing: 0,
        glue: 0,
        box: oppCosts.packagingBag,
        carton: oppCosts.carton,
        dustBag: oppCosts.dustBag,
        total: oppCosts.total,
        ...oppCosts,
      };
    } else {
      costs = ShikeZipper.calculateCosts({
        ...inputs,
        trackCount: Number($('[data-choice-field="trackCount"]').value),
        packagingMethod: zipperPackagingSelect.value,
      }, ShikePrinting.getPrintingColorCount(zipperPrintingSelect.value));
    }
    setCostRows(costs);
    setWeightRows(costs);
    $('#totalCost').textContent = displayMoney(costs.total);
    let quote = NaN;
    let rule = '';
    let referenceUnavailable = false;
    let referenceUnavailableMessage = '';
    if (selectedStrategy === 'reference') {
      const targetRatio = statistics.referenceRatio;
      if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
        referenceUnavailable = true;
        const filmType = selectedProduct === 'opp' ? $('[data-choice-field="filmType"]').value : '';
        if (filmType === 'CPP') {
          referenceUnavailableMessage = 'CPP 当前没有对应的供应商报价样本，参照报价暂不可用；可切换自由报价。';
          rule = 'CPP 暂无供应商报价样本，暂不能使用参照报价。';
        } else if (selectedProduct === 'zipper') {
          const packagingType = zipperPackagingSelect.value === 'box' ? '盒装' : '袋装';
          referenceUnavailableMessage = `当前${packagingType}、筋条数量或印刷色数组合没有匹配的供应商报价样本，参照报价暂不可用；可切换自由报价。`;
          rule = '当前夹链袋规格没有可用的匹配报价样本。';
        } else {
          referenceUnavailableMessage = '当前厚度或胶条状态没有匹配的供应商报价样本，参照报价暂不可用；可切换自由报价。';
          rule = '当前产品规格没有可用的匹配报价样本。';
        }
      } else if (selectedProduct === 'slider') {
        quote = costs.total / targetRatio;
        const statistic = $('#statisticSelect').value;
        rule = `报价 = 单袋总成本 ÷ 历史成本占比${statistic === 'median' ? '中位数' : '平均值'}（${displayRatio(targetRatio)}）`;
      } else {
        quote = costs.total / targetRatio;
        const estimate = statistics.estimate;
        const sizeNote = estimate.reason === 'below-size-range' || estimate.reason === 'above-size-range' ? '，尺寸超出样本范围按边界占比' : '';
        rule = `报价 = 单袋总成本 ÷ 尺寸匹配成本占比（${displayRatio(targetRatio)}${sizeNote}）`;
      }
    } else {
      const markup = inputs.markupPercent;
      quote = costs.total * (1 + markup / 100);
      rule = `报价 = 单袋总成本 ×（1 + 加价率 ${percent.format(markup)}%）`;
    }
    const grossProfit = quote - costs.total;
    $('#quotePrice').textContent = Number.isFinite(quote) ? money.format(quote) : '—';
    $('#grossProfit').textContent = Number.isFinite(grossProfit) ? displayMoney(grossProfit) : '—';
    $('#quoteCostRatio').textContent = displayRatio(quote > 0 ? costs.total / quote : NaN);
    $('#quoteRule').textContent = rule;
    warning.classList.toggle('hidden', !referenceUnavailable && !(quote > 0 && grossProfit < 0));
    if (referenceUnavailable) warning.textContent = referenceUnavailableMessage;
    else if (quote > 0 && grossProfit < 0) warning.textContent = '当前报价低于成本，请调整加价率或复核输入参数。';
    lastCalculation = { product: selectedProduct, inputs, costs, quote, grossProfit, reference: statistics.estimate };
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
  }

  async function copySummary() {
    if (!lastCalculation) {
      showToast('请先补全有效的产品与价格参数');
      return;
    }
    const { inputs, costs, quote, grossProfit } = lastCalculation;
    const strategyLabel = selectedStrategy === 'reference' ? '参照报价' : '自由报价';
    if (!Number.isFinite(quote)) {
      showToast('当前产品没有可用的参照报价，请切换自由报价');
      return;
    }
    const productDescription = selectedProduct === 'slider'
      ? `滑块袋 ${inputs.lengthMm}×${inputs.widthMm}mm · 插底 ${inputs.bottomMm}mm · ${$('[data-choice-field="packagingMethod"]').value} · ${$('[data-choice-field="zipperColor"]').value}`
      : selectedProduct === 'opp'
        ? `${$('[data-choice-field="filmType"]').value}袋 ${inputs.lengthMm}×${inputs.widthMm}mm · ${Math.round(inputs.thicknessMm * 1000)}μ · 插底${$('[data-choice-field="hasBottom"]').value === 'yes' ? `${inputs.bottomMm}mm` : '无'} · 胶条${$('[data-choice-field="hasTape"]').value === 'yes' ? '有' : '无'} · ${$('[data-choice-field="oppPackagingMethod"]').value}`
        : `夹链袋 ${inputs.widthMm}×${inputs.lengthBelowMm + inputs.lengthAboveMm + inputs.bottomMm}mm · 筋条${Number($('[data-choice-field="trackCount"]').value) === 1 ? '单' : '双'}条 · ${Math.round(inputs.thicknessMm * 1000)}μ · ${zipperPackagingSelect.value === 'box' ? '盒装' : '袋装'}`;
    const summary = [
      `世科报价 · ${productDescription}`,
      `策略：${strategyLabel}`,
      ...(['slider', 'zipper'].includes(selectedProduct) ? [`印刷：${(selectedProduct === 'slider' ? printingSelect : zipperPrintingSelect).selectedOptions[0]?.textContent || '—'}`] : []),
      `单袋总成本：¥${money.format(costs.total)}`,
      `建议单价：¥${money.format(quote)}/个`,
      `预估毛利：¥${money.format(grossProfit)}/个`,
      `成本占报价：${displayRatio(quote > 0 ? costs.total / quote : NaN)}`,
    ].join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const helper = document.createElement('textarea');
        helper.value = summary;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.append(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
      }
      showToast('报价摘要已复制');
    } catch {
      showToast('复制失败，请检查浏览器剪贴板权限');
    }
  }

  readStoredState();
  $$('[data-strategy]').forEach((button) => button.addEventListener('click', () => selectStrategy(button.dataset.strategy)));
  fields.forEach((input) => input.addEventListener('input', () => { saveState(); render(); }));
  choiceFields.forEach((input) => {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, () => {
      saveState();
      render();
    });
  });
  $('#statisticSelect').addEventListener('change', () => { saveState(); render(); });
  $('#copyButton').addEventListener('click', copySummary);
  $('#resetButton').addEventListener('click', () => {
    $('#quoteForm').reset();
    $('#markupInput').value = '20';
    selectedProduct = 'slider';
    $('#statisticSelect').value = 'median';
    selectedStrategy = 'reference';
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Reset the visible form even if storage is unavailable. */ }
    selectStrategy('reference');
    showToast('已恢复表格中的初始参数');
  });

  $$('[data-product]').forEach((button) => button.addEventListener('click', () => {
    selectedProduct = button.dataset.product;
    saveState();
    render();
  }));
  selectStrategy(selectedStrategy);
})();
