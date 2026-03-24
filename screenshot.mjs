import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function takeScreenshot() {
  const url = process.argv[2];
  const label = process.argv[3] || '';

  if (!url) {
    console.error('Usage: node screenshot.mjs <url> [label]');
    console.error('Example: node screenshot.mjs http://localhost:3000');
    console.error('Example: node screenshot.mjs http://localhost:3000 my-label');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait for CSS animations (curtain reveal, etc.) to complete
    await new Promise(r => setTimeout(r, 2000));
    // Trigger all scroll-reveal elements so they're visible in screenshots
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    });
    const screenshotDir = path.join(__dirname, 'temporary screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Auto-increment screenshot number
    const files = fs.readdirSync(screenshotDir).filter(f => f.startsWith('screenshot-'));
    const numbers = files.map(f => {
      const match = f.match(/screenshot-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextNum = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;

    const filename = label
      ? `screenshot-${nextNum}-${label}.png`
      : `screenshot-${nextNum}.png`;
    const filepath = path.join(screenshotDir, filename);

    const fullPage = process.argv[4] === 'full';
    // Optional clip offset (5th arg) — captures a viewport-sized region at given Y
    const clipY = parseInt(process.argv[5] || '0', 10);
    let screenshotOpts;
    if (fullPage) {
      screenshotOpts = { path: filepath, fullPage: true };
    } else if (clipY > 0) {
      // Remove overflow:hidden so scroll works, then scroll to position
      await page.evaluate((y) => {
        document.body.style.overflowX = 'visible';
        document.documentElement.style.overflowX = 'visible';
        document.documentElement.scrollTop = y;
        window.scrollTo(0, y);
      }, clipY);
      await new Promise(r => setTimeout(r, 300));
      screenshotOpts = { path: filepath, fullPage: false };
    } else {
      screenshotOpts = { path: filepath, fullPage: false };
    }
    await page.screenshot(screenshotOpts);
    console.log(`Screenshot saved: ${filepath}`);
  } finally {
    await browser.close();
  }
}

takeScreenshot().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
