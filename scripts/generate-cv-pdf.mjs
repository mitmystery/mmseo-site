/**
 * generate-cv-pdf.mjs
 *
 * Serves the built dist/ via a local HTTP server so all assets (fonts, CSS,
 * /_astro/* bundles) resolve correctly — file:// breaks absolute paths.
 *
 * Run via: npm run generate-cv  (builds site first, then runs this)
 */

import puppeteer from 'puppeteer';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir   = path.join(__dirname, '../dist');

// ── Minimal static file server ──────────────────────────────────────────────
const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.webp':  'image/webp',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.xml':   'application/xml',
  '.txt':   'text/plain',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath  = req.url.split('?')[0];
      let filePath = path.join(distDir, urlPath);

      // Directory → index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    // Port 0 = OS picks a free port
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function generateCVPdf() {
  const cvHtmlPath = path.join(distDir, 'cv/index.html');
  const outputPath = path.join(__dirname, '../public/mithul-mistry-cv.pdf');

  if (!fs.existsSync(cvHtmlPath)) {
    console.error('❌  Built CV not found. Run npm run build first.');
    console.error('    Expected:', cvHtmlPath);
    process.exit(1);
  }

  // Serve dist/ so absolute paths (/fonts/, /_astro/, etc.) all resolve
  const server = await startServer();
  const { port } = server.address();
  const cvUrl = `http://127.0.0.1:${port}/cv/`;
  console.log(`Serving dist/ on :${port}`);

  console.log('Launching browser…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 900 });

    console.log('Loading CV…');
    await page.goto(cvUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Allow fonts to load
    await new Promise(resolve => setTimeout(resolve, 800));

    // 1. Show content, strip chrome elements, replace Building with AI cards with compact text
    await page.evaluate(() => {
      document.getElementById('cv-gate')?.remove();
      document.getElementById('site-nav')?.remove();
      document.getElementById('nav-overlay')?.remove();
      document.getElementById('cookie-banner')?.remove();

      const content = document.getElementById('cv-content');
      if (content) content.style.display = 'block';

      document.getElementById('download-cv')?.remove();

      // Remove Building with AI section — covered in profile; full version on website.
      document.querySelector('.cv-building-section')?.remove();

      // Hide 3rd profile paragraph (AI work — covered by Building with AI on website)
      const profileParas = document.querySelectorAll('.cv-profile-text');
      if (profileParas.length >= 3) profileParas[2].remove();

      // Keep 4 cards (2x2 grid): Gulf, Witter, Number1Plates, Illuminated Mirrors
      // Remove Kingsmead (index 2) — "Full" and "Clear" metric values look weak in print
      const resultCards = document.querySelectorAll('.cv-result-card');
      resultCards[2]?.remove();
    });

    // 2. Inject compact layout styles
    await page.addStyleTag({ content: `
      /* ── Page break controls ── */
      .cv-experience-item  { page-break-inside: avoid; }
      .cv-result-card      { page-break-inside: avoid; }
      .cv-building-section { page-break-inside: avoid; }
      .cv-edu-grid         { page-break-inside: avoid; }

      /* ── Hero ── */
      .cv-hero-section {
        padding-top:    0.75rem !important;
        padding-bottom: 0.5rem !important;
      }
      .cv-name         { font-size: 2rem !important;      margin-bottom: 0.15rem !important; }
      .cv-job-title    { font-size: 1.25rem !important;   margin-bottom: 0.15rem !important; }
      .cv-subtitle     { font-size: 0.9375rem !important; margin-bottom: 0.4rem !important; }
      .cv-contact-row  { font-size: 0.8125rem !important; gap: 0.15rem 0.875rem !important; }
      .cv-download-btn { display: none !important; }

      /* ── All section-pad sections ── */
      .section-pad {
        padding-top:    0.625rem !important;
        padding-bottom: 0.625rem !important;
      }

      /* ── Stats strip ── */
      .cv-stats-strip { padding-block: 0.375rem !important; }
      .cv-stats-grid  { gap: 0.5rem !important; }
      .cv-stat-number { font-size: 1.75rem !important; }
      .cv-stat-label  { font-size: 0.75rem !important; white-space: nowrap !important; }

      /* ── Profile ── */
      .cv-profile-grid {
        grid-template-columns: 5fr 4fr !important;
        gap: 1.25rem !important;
      }
      .cv-profile-text {
        font-size:   0.9rem !important;
        line-height: 1.45 !important;
        margin-top:  0.2rem !important;
      }
      .cv-pill-group   { margin-bottom: 0.5rem !important; }
      .cv-pill-heading { margin-bottom: 0.35rem !important; }
      .cv-pills        { gap: 0.2rem !important; }
      .cv-pill         { padding: 0.15rem 0.45rem !important; font-size: 0.75rem !important; }

      /* ── Selected Results ── */
      .cv-results-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap:        0.5rem !important;
        margin-top: 0.5rem !important;
      }
      .cv-result-card    { padding: 0.625rem !important; gap: 0.3rem !important; }
      .cv-result-metrics { padding-top: 0.375rem !important; gap: 0.375rem !important; }
      .cv-result-value   { font-size: 1.125rem !important; }
      .cv-result-summary { font-size: 0.8125rem !important; line-height: 1.4 !important; }
      .cv-result-label   { font-size: 0.7rem !important; }

      /* ── Experience ── */
      .cv-timeline    { margin-top: 0.5rem !important; }
      .cv-rule        { margin-block: 0.375rem !important; }
      .cv-role-header { margin-bottom: 0.25rem !important; }
      .cv-role-title  { font-size: 1rem !important;      margin-bottom: 0.1rem !important; }
      .cv-company     { font-size: 0.7rem !important;    margin-bottom: 0.05rem !important; }
      .cv-dates       { font-size: 0.75rem !important; }
      .cv-bullets     { gap: 0.1rem !important; }
      .cv-bullets li  {
        font-size:    0.8125rem !important;
        line-height:  1.35 !important;
        padding-left: 1rem !important;
      }


      /* ── Education ── */
      .cv-edu-grid {
        grid-template-columns: 1fr 1fr !important;
        gap: 0.75rem !important;
      }
      .cv-edu-heading  { font-size: 0.875rem !important; margin-bottom: 0.35rem !important; }
      .cv-edu-degree   { font-size: 0.875rem !important; }
      .cv-edu-uni      { font-size: 0.8rem !important; }

      /* ── Eyebrow labels ── */
      .eyebrow { margin-bottom: 0.375rem !important; }

      /* ── CV footer ── */
      .cv-footer { padding-block: 0.375rem !important; }
    `});

    // Allow layout to reflow after style injection
    await new Promise(resolve => setTimeout(resolve, 600));

    console.log('Generating PDF…');
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      scale: 0.88,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      displayHeaderFooter: false,
    });

    const size = (fs.statSync(outputPath).size / 1024).toFixed(0);
    console.log(`✓ PDF generated: public/mithul-mistry-cv.pdf  (${size} KB)`);
    if (parseInt(size, 10) > 500) {
      console.warn('⚠  PDF is larger than 500 KB — check for large embedded images.');
    }

  } finally {
    await browser.close();
    server.close();
  }
}

generateCVPdf().catch((err) => {
  console.error('❌  PDF generation failed:', err.message);
  process.exit(1);
});
