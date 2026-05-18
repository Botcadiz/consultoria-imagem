import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const HTML_PATH  = resolve('./carrossel-claude-code.html');
const OUTPUT_DIR = resolve('./slides_export');
const TOTAL      = 7;
const VIEW_W     = 420;
const VIEW_H     = 525;
const SCALE      = 1080 / 420;

mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage({
  viewport: { width: VIEW_W, height: VIEW_H },
  deviceScaleFactor: SCALE,
});

const html = readFileSync(HTML_PATH, 'utf-8');
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Strip IG frame chrome, expose only the slide viewport
await page.evaluate(() => {
  document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption')
    .forEach(el => el.style.display = 'none');

  const frame = document.querySelector('.ig-frame');
  frame.style.cssText = 'width:420px;height:525px;max-width:none;border-radius:0;box-shadow:none;overflow:hidden;margin:0;';

  const vp = document.querySelector('.carousel-viewport');
  vp.style.cssText = 'width:420px;height:525px;aspect-ratio:unset;overflow:hidden;cursor:default;';

  document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;background:#000;';
});
await page.waitForTimeout(500);

for (let i = 0; i < TOTAL; i++) {
  await page.evaluate((idx) => {
    const track = document.querySelector('.carousel-track');
    track.style.transition = 'none';
    track.style.transform  = `translateX(${-idx * 420}px)`;
  }, i);
  await page.waitForTimeout(400);

  await page.screenshot({
    path: `${OUTPUT_DIR}/slide_${i + 1}.png`,
    clip: { x: 0, y: 0, width: VIEW_W, height: VIEW_H },
  });
  console.log(`✓ Slide ${i + 1}/${TOTAL}`);
}

await browser.close();
console.log(`\nExportados em: ${OUTPUT_DIR}`);
