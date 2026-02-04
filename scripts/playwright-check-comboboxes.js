const { chromium } = require('playwright');

(async () => {
  const base = 'http://localhost:3000/';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const results = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button[role="combobox"]'));
    return els.map(el => {
      const cs = window.getComputedStyle(el);
      const textEl = el.querySelector('[data-slot=select-value]') || el.querySelector('span') || el;
      const csText = window.getComputedStyle(textEl);
      const parent = el.parentElement;
      const csParent = parent ? window.getComputedStyle(parent) : null;
      return {
        selector: (() => {
          let s = el.tagName.toLowerCase();
          if (el.id) s += '#' + el.id;
          if (el.className && typeof el.className === 'string') s += '.' + el.className.split(' ').filter(Boolean).join('.');
          return s;
        })(),
        text: (el.innerText || el.textContent || '').trim().slice(0,300),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        boundingWidth: Math.round(el.getBoundingClientRect().width),
        computed: {
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          whiteSpace: cs.whiteSpace,
          textOverflow: cs.textOverflow,
          display: cs.display,
          minWidth: cs.minWidth,
        },
        textComputed: {
          overflow: csText.overflow,
          whiteSpace: csText.whiteSpace,
          textOverflow: csText.textOverflow,
          display: csText.display,
          minWidth: csText.minWidth,
        },
        parentComputed: csParent ? {
          overflow: csParent.overflow,
          whiteSpace: csParent.whiteSpace,
          display: csParent.display,
        } : null,
        overflowing: el.scrollWidth > el.clientWidth + 1
      };
    });
  });

  console.log(JSON.stringify(results, null, 2));
  await page.screenshot({ path: 'playwright-comboboxes.png', fullPage: true });
  await browser.close();
  console.log('screenshot saved to playwright-comboboxes.png');
})();