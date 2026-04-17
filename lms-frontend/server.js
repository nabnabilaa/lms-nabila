import Fastify from 'fastify';
import cors from '@fastify/cors';
import puppeteer from 'puppeteer';

const fastify = Fastify({
  logger: true
});

const PORT = 3001;

// Register CORS
await fastify.register(cors, {
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

fastify.post('/generate-pdf', async (request, reply) => {
  const { url, token, filename } = request.body || {};
  let browser;

  if (!url) {
    fastify.log.error('Missing URL in request body');
    return reply.code(400).send({ error: 'URL is required', receivedBody: request.body });
  }
  
  const downloadName = filename || 'certificate.pdf';

  try {
    fastify.log.info(`Generating PDF for: ${url}`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Set Viewport A4 Landscape
    await page.setViewport({
      width: 1123, // 297mm * 96dpi / 25.4 ~= 1123px
      height: 794,
      deviceScaleFactor: 2
    });

    // 2. Set Token for Auth if provided
    if (token) {
      await page.goto(new URL(url).origin, { waitUntil: 'networkidle0' });
      await page.evaluate((t) => {
        localStorage.setItem('token', t);
      }, token);
    }

    // 3. Go to actual page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 4. Wait for certificate wrapper
    await page.waitForSelector('.certificate-wrapper', { timeout: 10000 });

    // 5. Generate PDF
    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: 'A4',
      landscape: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    // 6. Send response
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', pdfBuffer.length)
      .header('Content-Disposition', `attachment; filename="${downloadName}"`)
      .send(pdfBuffer);

  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Failed to generate PDF', details: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Fastify PDF Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
