const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const url = 'https://www.volcengine.com/docs/6561/1257584';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

  // Give a short pause for dynamic content
  await page.waitForTimeout(1000);

  // Save full HTML for inspection
  const html = await page.content();
  const safeHtml = html.slice(0, 500000);
  fs.writeFileSync('tmp/volcengine_page.html', safeHtml, 'utf8');

  // Extract visible text robustly
  const content = await page.evaluate(() => {
    function visibleText(el) {
      if (!el) return '';
      // prefer main/article containers
      const sel = ['main', '.article', '.doc-content', '#content', '.container', '.markdown-body', '.docs-content', '.doc-main'];
      for (const s of sel) {
        const e = document.querySelector(s);
        if (e && e.innerText && e.innerText.length > 100) return e.innerText;
      }
      return document.body.innerText || '';
    }
    return visibleText(document);
  });

  const keywords = ['签名', 'Signature', 'Authorization', 'HMAC', 'timestamp', 'secret', '签署', '签名规则', 'Authorization:', 'X-Sign', '签名示例', '签名方式'];
  const lines = content.split('\n');
  const matches = lines.filter(line => keywords.some(k => line.toLowerCase().includes(k.toLowerCase())));

  const outputSnippet = content.slice(0, 200000);
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync('tmp/volcengine_doc.txt', outputSnippet, 'utf8');
  fs.writeFileSync('tmp/volcengine_matches.txt', matches.join('\n'), 'utf8');

  console.log('Saved tmp/volcengine_doc.txt and tmp/volcengine_matches.txt');
  if (matches.length) {
    console.log('--- Matched lines ---');
    console.log(matches.join('\n'));
  } else {
    console.log('No matched lines for keywords.');
  }

  await browser.close();
})();
