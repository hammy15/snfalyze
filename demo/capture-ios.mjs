import { chromium } from 'playwright';

const dir = '/Users/hammy/snfalyze/demo';
const dealId = '7c97b5d2-904d-4283-9721-a1696ee74ba8';
const base = 'https://snfalyze.ai';

const hideOverlays = `
  .fixed.inset-0, div[class*="fixed"][class*="inset"],
  div[class*="fixed"][class*="z-50"], div[class*="fixed"][class*="z-40"] {
    display: none !important;
  }
`;

async function main() {
  // Launch Playwright's bundled Chromium (not system Chrome)
  const browser = await chromium.launch({
    headless: true,
    channel: undefined // Force bundled Chromium, not system Chrome
  });

  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  const pages = [
    { url: `${base}/app`, name: 'ios-dashboard', wait: 4000 },
    { url: `${base}/app/deals`, name: 'ios-deals', wait: 3000 },
    { url: `${base}/app/deals/${dealId}`, name: 'ios-deal-details', wait: 3000 },
    { url: `${base}/app/deals/${dealId}/workspace`, name: 'ios-workspace', wait: 5000 },
  ];

  for (const p of pages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(p.wait);
    await page.addStyleTag({ content: hideOverlays });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${dir}/${p.name}.png` });
    console.log(`  Saved ${p.name}.png`);
  }

  // Now click through workspace stages
  const stages = [
    { name: 'Risk Score', file: 'ios-risk-score' },
    { name: 'Investment Memo', file: 'ios-memo' },
    { name: 'Comp Pull', file: 'ios-comps' },
  ];

  for (const stage of stages) {
    console.log(`Capturing ${stage.file}...`);
    const btn = page.getByRole('button', { name: new RegExp(stage.name, 'i') });
    if (await btn.count() > 0) {
      await btn.first().click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${dir}/${stage.file}.png` });
      console.log(`  Saved ${stage.file}.png`);
    } else {
      console.log(`  Button "${stage.name}" not found, skipping`);
    }
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
