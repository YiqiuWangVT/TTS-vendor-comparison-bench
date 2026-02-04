const http = require('http');
const { chromium } = require('playwright');

function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', (err) => {
        if (Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(check, 500);
      });
      req.setTimeout(2000, () => {
        req.abort();
      });
    })();
  });
}

(async () => {
  const base = 'http://localhost:3000/';
  console.log('Waiting for dev server at', base);
  try {
    await waitForServer(base, 60000);
  } catch (e) {
    console.error('Server did not respond in time:', e.message);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // take a screenshot
  await page.screenshot({ path: 'playwright-screenshot.png', fullPage: true });

  // find candidate elements with long text and check overflow
  const results = await page.evaluate(() => {
    function isVisible(el) {
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity) === 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    const nodes = Array.from(document.querySelectorAll('body *'));
    const candidates = [];
    for (const el of nodes) {
      if (!isVisible(el)) continue;
      const text = el.innerText || el.textContent || '';
      if (!text) continue;
      const trimmed = text.trim();
      if (trimmed.length < 20) continue; // only inspect long texts

      const cs = window.getComputedStyle(el);
      const clientW = el.clientWidth;
      const scrollW = el.scrollWidth;
      const bb = el.getBoundingClientRect();

      const overflowing = scrollW > clientW + 1;

      candidates.push({
        tag: el.tagName,
        text: trimmed.slice(0, 200),
        clientWidth: clientW,
        scrollWidth: scrollW,
        boundingWidth: Math.round(bb.width),
        overflow: overflowing,
        css: {
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          whiteSpace: cs.whiteSpace,
          textOverflow: cs.textOverflow,
          display: cs.display,
          minWidth: cs.minWidth,
        },
        selector: (() => {
          let s = el.tagName.toLowerCase();
          if (el.id) s += '#' + el.id;
          if (el.className && typeof el.className === 'string') s += '.' + el.className.split(' ').filter(Boolean).join('.');
          return s;
        })(),
      });
    }
    return candidates.sort((a,b)=> (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth));
  });

  console.log('Found', results.length, 'candidate elements (long text).');
  const overflowing = results.filter(r => r.overflow);
  console.log('Overflowing elements count:', overflowing.length);
  console.log(JSON.stringify({ results: results.slice(0, 60), overflowing }, null, 2));

  await browser.close();
  console.log('Screenshot written to playwright-screenshot.png');
})();
