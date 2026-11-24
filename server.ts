import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { lookupFreeFireUid } from './src/utils/ffUidLookup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/robots.txt', (req, res) => {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host');
    const origin = host ? `${proto}://${host}` : '';
    const lines = ['User-agent: *', 'Allow: /'];
    if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`);
    res.type('text/plain').send(`${lines.join('\n')}\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('host');
    const origin = host ? `${proto}://${host}` : 'http://localhost:3000';
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n` +
        `    <loc>${origin}/</loc>\n` +
        `    <changefreq>daily</changefreq>\n` +
        `    <priority>1.0</priority>\n` +
        `  </url>\n` +
        `</urlset>\n`,
    );
  });

  app.get('/api/ff-uid-lookup', async (req, res) => {
    const rawUid = typeof req.query.uid === 'string' ? req.query.uid : '';
    const result = await lookupFreeFireUid(rawUid);
    res.status(result.status).json(result.body);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Diamond Store server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
