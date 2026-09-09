import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:4175/";
const output = process.argv[3] || "output/PrizeSkout-Landing-Preview.html";
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(2_000);
await page.evaluate(async () => {
  document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("seen"));
  for (const image of document.querySelectorAll("img")) {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      image.src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {}
  }
  let css = "";
  for (const sheet of document.styleSheets) {
    try { css += [...sheet.cssRules].map((rule) => rule.cssText).join("\n"); } catch {}
  }
  const style = document.createElement("style");
  style.textContent = css + "\nhtml{scroll-behavior:smooth} [data-reveal]{opacity:1!important;transform:none!important}";
  document.head.append(style);
  document.querySelectorAll('link[rel="stylesheet"],script').forEach((node) => node.remove());
  const demo = document.createElement("script");
  demo.textContent = `(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const costs = [['Channel commission','4.02',54],['Payment fees','0.61',12],['Delivery share','2.44',34],['Promotion dilution','2.90',40],['Payout shortfall','0.72',14],['Landed cost','7.48',100]];
    let found = 0;
    const costRows = [...document.querySelectorAll('.et-cost-stream > div')];
    const sourceRows = [...document.querySelectorAll('.et-source-rail > div')];
    const evidenceRows = [...document.querySelectorAll('.et-order-table > div')];
    const renderEvidence = () => {
      costRows.forEach((row, index) => {
        const arrived = index < found;
        row.classList.toggle('found', arrived); row.classList.toggle('waiting', !arrived);
        const bar = row.querySelector('i b'), value = row.querySelector('strong');
        if (bar) bar.style.width = arrived ? costs[index][2] + '%' : '0%';
        if (value) value.textContent = arrived ? costs[index][1] : 'Checking';
      });
      sourceRows.forEach((row, index) => {
        const arrived = index < found; row.classList.toggle('active', arrived);
        const status = row.querySelector('small'); if (status) status.textContent = arrived ? 'Synced' : 'Waiting';
      });
      evidenceRows.forEach((row, index) => {
        const arrived = index < found; row.classList.toggle('arrived', arrived);
        const cells = row.querySelectorAll('span');
        if (cells[1]) cells[1].textContent = arrived ? 'Matched to order 8745123' : 'Reading source';
        const confidence = row.querySelector('strong'); if (confidence) confidence.textContent = arrived ? 99 - index * 2 + '%' : '';
      });
      const margin = document.querySelector('.et-margin-compare .actual b');
      const progress = document.querySelector('.et-order-line strong');
      const label = document.querySelector('.et-live-result span');
      const value = document.querySelector('.et-live-result b');
      if (margin) margin.textContent = (31.4 - found * 2.12).toFixed(1) + '%';
      if (progress) progress.textContent = found === 6 ? 'Complete' : Math.round(found / 6 * 100) + '%';
      if (label) label.textContent = found === 6 ? 'True contribution verified' : 'Reconstructing contribution';
      if (value) value.textContent = 'SAR ' + (found === 6 ? '4.18' : (22.35 - found * 3.03).toFixed(2));
    };
    setInterval(() => { found = found === 6 ? 0 : found + 1; renderEvidence(); }, 430);

    let loop = 0;
    const loopCopy = ['Talabat promotion signal received.','Expected margin falls to 12.6%.','Your 18% floor blocks automatic execution.','Fahad approved a 15% discount cap.','SAR 21,900 in margin protection was recorded.'];
    const loopButtons = [...document.querySelectorAll('.et-loop-track button')];
    const renderLoop = () => {
      loopButtons.forEach((button, index) => { button.classList.toggle('active', index === loop); button.classList.toggle('done', index < loop); });
      const text = document.querySelector('.et-loop-action p'); if (text) text.textContent = loopCopy[loop];
      const orb = document.querySelector('.et-action-orb');
      if (orb) { orb.className = 'et-action-orb state-' + loop; orb.querySelector('span').textContent = loop === 4 ? 'SAR 21.9K' : loop + 1 + ' of 5'; orb.querySelector('small').textContent = loop === 4 ? 'Protected' : 'Processing'; }
    };
    loopButtons.forEach((button, index) => button.addEventListener('click', () => { loop = index; renderLoop(); }));
    setInterval(() => { loop = (loop + 1) % 5; renderLoop(); }, 850);

    const flows = [
      ['True Margin Intelligence','What did I actually keep from Talabat order 8745123?','After commission, fees, delivery share, promotion dilution, payout variance, and landed cost, you kept SAR 4.18.','18.7% true margin','Open order evidence'],
      ['Payout Recovery','Check my latest Talabat settlement for missing money.','The settlement is SAR 96,000 below the expected payout. The agreement and statement support a recovery case.','SAR 96K recoverable','Prepare evidence pack'],
      ['Promotion Simulator','What happens if I run a 20% discount for fourteen days?','The promotion lifts demand but misses your protected margin floor. A 15% cap keeps the campaign profitable.','SAR 74K net impact','Compare safe scenarios'],
      ['Defend Loop','Can the weekend offer go live safely?','The current discount would cross your margin floor. PrizeSkout stopped it and prepared a safer version for approval.','SAR 21.9K protected','Review protected action'],
      ['AI Store Manager','Find catalog work that needs my approval.','Twenty seven updates are ready. Eight require approval. No protected store change has been published.','8 approvals waiting','Open approval queue'],
      ['CFO Copilot','Why did margin fall last week?','Payout discrepancy was the largest driver. Commission and promotion spend added pressure. Lower fees recovered part of the loss.','SAR 134K impact','Open action plan']
    ];
    let flow = 5, stage = 0;
    const flowButtons = [...document.querySelectorAll('.et-app-nav button')];
    const renderFlow = () => {
      const current = flows[flow];
      flowButtons.forEach((button, index) => button.classList.toggle('active', index === flow));
      const title = document.querySelector('.et-copilot-window .et-dashboard-chrome > span'); if (title) title.textContent = current[0];
      const prompt = document.querySelector('.et-prompt-box > span'); if (prompt) { prompt.textContent = stage === 0 ? current[1].slice(0, 16) : current[1]; prompt.classList.toggle('typing', stage === 0); }
      const thinking = document.querySelector('.et-thinking'); if (thinking) thinking.classList.toggle('show', stage > 0 && stage < 3);
      const answer = document.querySelector('.et-answer-card'); if (answer) answer.classList.toggle('show', stage >= 3);
      const answerText = document.querySelector('.et-answer-card p'); if (answerText) answerText.textContent = current[2];
      const answerMetric = document.querySelector('.et-answer-card > strong'); if (answerMetric) answerMetric.textContent = current[3];
      const drivers = document.querySelector('.et-result-drivers'); if (drivers) drivers.classList.toggle('show', stage >= 4);
      const action = document.querySelector('.et-next-action'); if (action) { action.classList.toggle('show', stage >= 5); action.childNodes[0].textContent = current[4]; }
    };
    flowButtons.forEach((button, index) => button.addEventListener('click', () => { flow = index; stage = 0; renderFlow(); }));
    setInterval(() => { stage = stage === 5 ? 0 : stage + 1; renderFlow(); }, 620);
    renderEvidence(); renderLoop(); renderFlow();
  })();`;
  document.body.append(demo);
});
const html = "<!doctype html>\n" + await page.content();
await writeFile(output, html, "utf8");
await browser.close();
console.log(output);
