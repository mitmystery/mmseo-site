/**
 * generate-cv-pdf.mjs
 *
 * Pre-generates /public/mithul-mistry-cv.pdf from the built CV page.
 * Run via: npm run generate-cv  (builds site first, then runs this)
 *
 * The PDF is static — regenerate whenever CV content changes.
 * Committed to /public/ so it deploys with the site.
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateCVPdf() {
  const cvPath    = path.join(__dirname, '../dist/cv/index.html');
  const outputPath = path.join(__dirname, '../public/mithul-mistry-cv.pdf');

  if (!fs.existsSync(cvPath)) {
    console.error('❌  Built CV not found. Run npm run build first.');
    console.error('    Expected:', cvPath);
    process.exit(1);
  }

  console.log('Launching browser…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set a large viewport so nothing is clipped
  await page.setViewport({ width: 1200, height: 900 });

  console.log('Loading CV…');
  await page.goto(`file://${cvPath}`, { waitUntil: 'networkidle0' });

  // Bypass the gate and strip chrome elements for a clean PDF
  await page.evaluate(() => {
    const gate        = document.getElementById('cv-gate');
    const content     = document.getElementById('cv-content');
    const downloadBtn = document.getElementById('download-cv');
    const siteNav     = document.getElementById('site-nav');
    const mobileOverlay = document.getElementById('nav-overlay');
    const siteFooter  = document.querySelector('footer');
    const cookieBanner = document.getElementById('cookie-banner');

    if (gate)         gate.remove();
    if (content)      content.style.display = 'block';
    if (downloadBtn)  downloadBtn.style.display = 'none';
    if (siteNav)      siteNav.remove();
    if (mobileOverlay) mobileOverlay.remove();
    if (siteFooter)   siteFooter.remove();
    if (cookieBanner) cookieBanner.remove();
  });

  // Allow fonts to render
  await new Promise(resolve => setTimeout(resolve, 1200));

  console.log('Generating PDF…');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: false,
  });

  await browser.close();

  const size = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`✓ PDF generated: public/mithul-mistry-cv.pdf  (${size} KB)`);

  if (parseInt(size, 10) > 500) {
    console.warn('⚠  PDF is larger than 500 KB. Check for embedded images.');
  }
}

generateCVPdf().catch((err) => {
  console.error('❌  PDF generation failed:', err.message);
  process.exit(1);
});
