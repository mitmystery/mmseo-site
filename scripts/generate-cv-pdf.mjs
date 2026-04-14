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
    await page.setViewport({ width: 1200, height: 900 });

    console.log('Loading CV…');
    await page.goto(cvUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Bypass gate + strip navigation chrome for a clean PDF
    await page.evaluate(() => {
      document.getElementById('cv-gate')?.remove();
      document.getElementById('nav-overlay')?.remove();
      document.getElementById('site-nav')?.remove();
      document.getElementById('cookie-banner')?.remove();

      const content     = document.getElementById('cv-content');
      const downloadBtn = document.getElementById('download-cv');
      const siteFooter  = document.querySelector('footer');

      if (content)     content.style.display     = 'block';
      if (downloadBtn) downloadBtn.style.display  = 'none';
      if (siteFooter)  siteFooter.style.display   = 'none';
    });

    // Allow fonts + layout to settle
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Generating PDF…');
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
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
