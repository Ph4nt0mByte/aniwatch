import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { request as httpRequest } from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use('/api/anikoto', (req, res) => {
  const target = 'anikotoapi.site';
  const path = req.originalUrl.replace('/api/anikoto', '') || '/';

  const options = {
    hostname: target,
    port: 443,
    path,
    method: req.method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AniWatch/1.0)',
      'Accept': 'application/json',
    },
  };

  const proxyReq = httpRequest(options, (proxyRes) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.set('Content-Type', 'application/json');
    res.status(proxyRes.statusCode || 200);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ ok: false, error: 'Proxy error' });
  });

  proxyReq.end();
});

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
