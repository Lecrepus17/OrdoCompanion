const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = __dirname;
const PDFS_DIR = path.join(ROOT_DIR, 'pdfs');
const RENDER_CACHE_DIR = path.join(ROOT_DIR, 'data', 'cache', 'rendered_pages');
const PDFJS_BUILD_DIR = path.join(ROOT_DIR, 'node_modules', 'pdfjs-dist', 'build');

function slugifyName(name) {
  let stem = path.parse(name).name;
  stem = stem.replace(/[-_\s]+v\d+$/i, '');
  stem = stem.replace(/\.+/g, '-');
  return stem
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function resolvePdfFile(fileParam) {
  if (!fileParam) return null;
  const decoded = decodeURIComponent(fileParam).trim();
  const safeBase = path.basename(decoded);

  const candidateDirs = [
    PDFS_DIR,
    ROOT_DIR,
    path.join(ROOT_DIR, 'public', 'pdfs'),
  ];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;

    const directPath = path.join(dir, safeBase);
    if (
      fs.existsSync(directPath) &&
      fs.statSync(directPath).isFile() &&
      directPath.toLowerCase().endsWith('.pdf')
    ) {
      return directPath;
    }

    const targetLower = safeBase.toLowerCase();
    const targetSlug = slugifyName(safeBase);
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith('.pdf')) continue;
      if (entry.toLowerCase() === targetLower || slugifyName(entry) === targetSlug) {
        return path.join(dir, entry);
      }
    }
  }

  return null;
}

function servePdfWithRange(req, res, pdfPath) {
  const stat = fs.statSync(pdfPath);
  const totalSize = stat.size;
  const fileName = path.basename(pdfPath);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(fileName)}"`
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || isNaN(end) || start >= totalSize || end >= totalSize || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
      res.end();
      return;
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Content-Length': chunkSize,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(pdfPath, { start, end });
    stream.on('error', () => res.end());
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': totalSize,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(pdfPath);
    stream.on('error', () => res.end());
    stream.pipe(res);
  }
}

const config = getDefaultConfig(ROOT_DIR);
const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, metroServer) => {
    const baseMiddleware = defaultEnhanceMiddleware
      ? defaultEnhanceMiddleware(metroMiddleware, metroServer)
      : metroMiddleware;

    return (req, res, next) => {
      try {
        const parsedUrl = new URL(req.url || '/', 'http://localhost');
        const pathname = parsedUrl.pathname || '';

        // 1. Serve PDF.js static engine & Web Worker (/pdfjs/pdf.min.js, /pdfjs/pdf.worker.min.js)
        if (pathname.startsWith('/pdfjs/')) {
          const assetName = path.basename(pathname);
          const allowedAssets = [
            'pdf.min.js',
            'pdf.worker.min.js',
            'pdf.js',
            'pdf.worker.js',
          ];
          if (allowedAssets.includes(assetName)) {
            const assetPath = path.join(PDFJS_BUILD_DIR, assetName);
            if (fs.existsSync(assetPath)) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.setHeader('Cache-Control', 'public, max-age=86400');
              fs.createReadStream(assetPath).pipe(res);
              return;
            }
          }
        }

        // 2. Serve raw PDF files with HTTP Range Request support (/pdfs/<fileName>)
        if (pathname.startsWith('/pdfs/')) {
          const rawFile = pathname.slice('/pdfs/'.length);
          const pdfPath = resolvePdfFile(rawFile);
          if (!pdfPath) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'PDF não encontrado', file: rawFile }));
            return;
          }
          servePdfWithRange(req, res, pdfPath);
          return;
        }

        // 3. On-demand high-DPI PDF page renderer (/api/pdf-page?file=...&page=...&dpi=...)
        if (pathname === '/api/pdf-page') {
          const fileParam = String(parsedUrl.searchParams.get('file') || '');
          const pageNum = Math.max(
            1,
            parseInt(String(parsedUrl.searchParams.get('page') || '1'), 10) || 1
          );
          const dpi = Math.max(
            72,
            Math.min(
              260,
              parseInt(String(parsedUrl.searchParams.get('dpi') || '150'), 10) || 150
            )
          );
          const format = String(parsedUrl.searchParams.get('format') || 'image');

          const pdfPath = resolvePdfFile(fileParam);
          if (!pdfPath) {
            res.writeHead(404, {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ ok: false, error: 'PDF não encontrado' }));
            return;
          }

          const bookSlug = slugifyName(path.basename(pdfPath));
          const cacheFileName = `${bookSlug}_p${String(pageNum).padStart(4, '0')}_dpi${dpi}.jpg`;
          const cachedFilePath = path.join(RENDER_CACHE_DIR, cacheFileName);

          // Fast path: already rendered in disk cache
          if (format !== 'json' && fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 0) {
            const stat = fs.statSync(cachedFilePath);
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'image/jpeg',
              'Content-Length': stat.size,
              'Cache-Control': 'public, max-age=86400',
            });
            fs.createReadStream(cachedFilePath).pipe(res);
            return;
          }

          // Render via PyMuPDF script
          const scriptPath = path.join(ROOT_DIR, 'scripts', 'render_pdf_page.py');
          const pyProc = spawn('python', [
            scriptPath,
            '--file',
            pdfPath,
            '--page',
            String(pageNum),
            '--dpi',
            String(dpi),
          ]);

          let stdoutData = '';
          let stderrData = '';
          pyProc.stdout.on('data', (chunk) => {
            stdoutData += chunk.toString();
          });
          pyProc.stderr.on('data', (chunk) => {
            stderrData += chunk.toString();
          });

          pyProc.on('close', (code) => {
            try {
              const result = JSON.parse(stdoutData.trim());
              if (!result.ok || code !== 0) {
                res.writeHead(500, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json',
                });
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: result.error || stderrData || 'Erro ao renderizar página',
                  })
                );
                return;
              }

              if (format === 'json') {
                res.writeHead(200, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify(result));
                return;
              }

              const outPath = result.cachePath;
              const stat = fs.statSync(outPath);
              res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'image/jpeg',
                'Content-Length': stat.size,
                'Cache-Control': 'public, max-age=86400',
              });
              fs.createReadStream(outPath).pipe(res);
            } catch (err) {
              res.writeHead(500, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              });
              res.end(
                JSON.stringify({
                  ok: false,
                  error: String(err),
                  stderr: stderrData,
                })
              );
            }
          });
          return;
        }
      } catch (err) {
        console.error('[PDF Middleware Error]:', err);
      }

      return baseMiddleware(req, res, next);
    };
  },
};

module.exports = config;
