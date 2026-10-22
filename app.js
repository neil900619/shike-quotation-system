(() => {
  const STORAGE_KEY = 'shike-quotation-v1';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const fields = $$('[data-field]');
  const choiceFields = $$('[data-choice-field]');
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

  let selectedStrategy = 'reference';
  let lastCalculation = null;
  let toastTimer;

  const readInputs = () => Object.fromEntries(fields.map((input) => [input.dataset.field, input.value.trim() === '' ? NaN : Number(input.value)]));
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
      for (const input of fields) {
        const value = saved.values?.[input.dataset.field];
        if (typeof value === 'string' && value !== '') input.value = value;
      }
      for (const input of choiceFields) {
        const value = saved.choices?.[input.dataset.choiceField];
        if (typeof value === 'string') input.value = value;
      }
      if (saved.statistic === 'mean' || saved.statistic === 'median') $('#statisticSelect').value = saved.statistic;
      if (saved.strategy === 'reference' || saved.strategy === 'free') selectedStrategy = saved.strategy;
    } catch { /* Local storage can be unavailable for local files. */ }
  }

  function saveState() {
    try {
      const values = Object.fromEntries(fields.map((input) => [input.dataset.field, input.value]));
      const choices = Object.fromEntries(choiceFields.map((input) => [input.dataset.choiceField, input.value]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ values, choices, statistic: $('#statisticSelect').value, strategy: selectedStrategy }));
    } catch { /* The calculator still works when storage is blocked. */ }
  }

  function validate(inputs) {
    const issues = [];
    for (const input of fields) {
      const value = inputs[input.dataset.field];
      const min = input.min === '' ? -Infinity : Number(input.min);
      const max = input.max === '' ? Infinity : Number(input.max);
      const invalid = !Number.isFinite(value) || value < min || value > max;
      input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      if (invalid) issues.push(`${input.closest('.field')?.querySelector('span')?.textContent?.trim() || input.dataset.field}需填写有效数值`);
    }
    const packagingMethod = $('[data-choice-field="packagingMethod"]').value.trim();
    if (packagingMethod !== '盒装') issues.unshift('当前成本公式按盒装分摊，其他包装方式暂不能计算报价');
    const bodyTotal = inputs.bodyLdpePercent + inputs.bodyLldpePercent;
    const ratioValid = Number.isFinite(bodyTotal) && Math.abs(bodyTotal - 100) <= 0.02;
    $('#bodyRatioStatus').textContent = Number.isFinite(bodyTotal) ? `合计 ${percent.format(bodyTotal)}%` : '请检查配比';
    $('#bodyRatioStatus').classList.toggle('ratio-invalid', !ratioValid);
    if (!ratioValid) issues.unshift('袋本体 LDPE 与 LLDPE 配比合计需为 100%');

    const zipperParts = inputs.zipperLdpeParts + inputs.zipperLldpeParts + inputs.zipperMlldpeParts + inputs.zipperHdpeParts;
    if (Number.isFinite(zipperParts) && zipperParts <= 0) issues.unshift('拉链条树脂份数合计需大于 0');
    return issues;
  }

  function calculateCosts(inputs) {
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
    const ink = 18 * inputs.inkPricePerKg / inputs.inkBagsPerDrum;
    const plate = inputs.platePrice / (100_000 / (inputs.widthMm / 1000));
    const glue = 0.7 * inputs.gluePricePerKg / 1000 / inputs.bagsPerBox;
    const box = inputs.boxPrice / inputs.bagsPerBox;
    const carton = inputs.cartonPrice / inputs.bagsPerBox / inputs.boxesPerCarton;
    const printing = ink + plate;
    const total = body + zipper + zipperHead + printing + glue + box + carton;

    return { body, zipper, zipperHead, printing, glue, box, carton, total, ink, plate, unfoldedLengthMm, finishedBodyWeightG, blownBodyWeightG, zipperWeightG };
  }

  function updateBenchmarks() {
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
    return { mean, median, min, max };
  }

  function setCostRows(costs) {
    for (const key of ['body', 'zipper', 'zipperHead', 'printing', 'glue', 'box', 'carton', 'total']) {
      const target = $(`[data-cost="${key}"]`);
      if (target) target.textContent = displayNumber(costs?.[key]);
    }
  }

  function setWeightRows(costs) {
    $('#bodyWeightNet').textContent = costs ? displayNumber(costs.finishedBodyWeightG) : '—';
    $('#bodyWeightGross').textContent = costs ? displayNumber(costs.blownBodyWeightG) : '—';
    $('#zipperWeight').textContent = costs ? displayNumber(costs.zipperWeightG) : '—';
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
    const inputs = readInputs();
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
      lastCalculation = null;
      return;
    }

    const costs = calculateCosts(inputs);
    setCostRows(costs);
    setWeightRows(costs);
    $('#totalCost').textContent = displayMoney(costs.total);
    const statistics = updateBenchmarks();
    let quote = NaN;
    let rule = '';
    if (selectedStrategy === 'reference') {
      const statistic = $('#statisticSelect').value;
      const targetRatio = statistics[statistic];
      quote = costs.total / targetRatio;
      rule = `报价 = 单袋总成本 ÷ 历史成本占比${statistic === 'median' ? '中位数' : '平均值'}（${displayRatio(targetRatio)}）`;
    } else {
      const markup = inputs.markupPercent;
      quote = costs.total * (1 + markup / 100);
      rule = `报价 = 单袋总成本 ×（1 + 加价率 ${percent.format(markup)}%）`;
    }
    const grossProfit = quote - costs.total;
    $('#quotePrice').textContent = Number.isFinite(quote) ? money.format(quote) : '—';
    $('#grossProfit').textContent = displayMoney(grossProfit);
    $('#quoteCostRatio').textContent = displayRatio(quote > 0 ? costs.total / quote : NaN);
    $('#quoteRule').textContent = rule;
    warning.classList.toggle('hidden', !(quote > 0 && grossProfit < 0));
    if (quote > 0 && grossProfit < 0) warning.textContent = '当前报价低于成本，请调整加价率或复核输入参数。';
    lastCalculation = { inputs, costs, quote, grossProfit };
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
    const summary = [
      `世科报价 · 滑块袋 ${inputs.lengthMm}×${inputs.widthMm}mm · 插底 ${inputs.bottomMm}mm · ${$('[data-choice-field="packagingMethod"]').value} · ${$('[data-choice-field="zipperColor"]').value}`,
      `策略：${strategyLabel}`,
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
  updateBenchmarks();
  $$('[data-strategy]').forEach((button) => button.addEventListener('click', () => selectStrategy(button.dataset.strategy)));
  fields.forEach((input) => input.addEventListener('input', () => { saveState(); render(); }));
  choiceFields.forEach((input) => input.addEventListener('input', saveState));
  $('#statisticSelect').addEventListener('change', () => { saveState(); render(); });
  $('#copyButton').addEventListener('click', copySummary);
  $('#resetButton').addEventListener('click', () => {
    $('#quoteForm').reset();
    $('#statisticSelect').value = 'median';
    selectedStrategy = 'reference';
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Reset the visible form even if storage is unavailable. */ }
    selectStrategy('reference');
    showToast('已恢复表格中的初始参数');
  });

  $$('[data-product="slider"]').forEach((button) => button.addEventListener('click', () => showToast('当前产品为滑块袋')));
  render();
})();
