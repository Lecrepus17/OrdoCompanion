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
  const asciiSafeName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${asciiSafeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range && range.startsWith('bytes=')) {
    const rangeValue = range.replace(/bytes=/, '').trim();
    let start, end;

    if (rangeValue.startsWith('-')) {
      // Suffix range: bytes=-65536 (últimos N bytes, muito comum em leitores PDF.js e mobile)
      const suffixLength = parseInt(rangeValue.slice(1), 10);
      if (isNaN(suffixLength) || suffixLength <= 0) {
        res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        res.end();
        return;
      }
      start = Math.max(0, totalSize - suffixLength);
      end = totalSize - 1;
    } else {
      const parts = rangeValue.split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] && parts[1].length > 0 ? parseInt(parts[1], 10) : totalSize - 1;
    }

    if (isNaN(start) || isNaN(end) || start < 0 || start >= totalSize || end >= totalSize || start > end) {
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
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
            res.writeHead(204);
            res.end();
            return;
          }

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
          let responded = false;
          const sendErrorJson = (status, message, extra = {}) => {
            if (responded || res.headersSent) return;
            responded = true;
            res.writeHead(status, {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            });
            res.end(
              JSON.stringify({
                ok: false,
                error: message,
                ...extra,
              })
            );
          };

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

          pyProc.on('error', (err) => {
            sendErrorJson(500, `Python indisponível no servidor local: ${String(err)}`);
          });

          pyProc.on('close', (code) => {
            if (responded || res.headersSent) return;
            try {
              const trimmed = stdoutData.trim();
              const result = trimmed ? JSON.parse(trimmed) : { ok: false };
              if (!result.ok || code !== 0) {
                sendErrorJson(
                  500,
                  result.error || stderrData.trim() || 'Erro ao renderizar página'
                );
                return;
              }

              if (format === 'json') {
                responded = true;
                res.writeHead(200, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify(result));
                return;
              }

              const outPath = result.cachePath;
              const stat = fs.statSync(outPath);
              responded = true;
              res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'image/jpeg',
                'Content-Length': stat.size,
                'Cache-Control': 'public, max-age=86400',
              });
              fs.createReadStream(outPath).pipe(res);
            } catch (err) {
              sendErrorJson(500, String(err), { stderr: stderrData.trim() });
            }
          });
          return;
        }

        // 4. Upload de PDF do usuário e extração via Python (/api/upload-pdf?fileName=...)
        if (pathname === '/api/upload-pdf') {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.writeHead(204);
            res.end();
            return;
          }

          if (req.method === 'POST') {
            const rawName = String(parsedUrl.searchParams.get('fileName') || 'upload.pdf');
            const safeName = path.basename(decodeURIComponent(rawName)).replace(/[^\w\s.-]/g, '_');
            const finalName = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;

            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                if (!fs.existsSync(PDFS_DIR)) {
                  fs.mkdirSync(PDFS_DIR, { recursive: true });
                }
                const savedPath = path.join(PDFS_DIR, finalName);
                fs.writeFileSync(savedPath, buffer);

                const pubPdfsDir = path.join(ROOT_DIR, 'public', 'pdfs');
                if (!fs.existsSync(pubPdfsDir)) {
                  fs.mkdirSync(pubPdfsDir, { recursive: true });
                }
                try {
                  fs.copyFileSync(savedPath, path.join(pubPdfsDir, finalName));
                } catch {}

                const scriptPath = path.join(ROOT_DIR, 'scripts', 'process_single_pdf.py');
                const pyProc = spawn('python', [scriptPath, '--file', savedPath]);

                let stdoutData = '';
                let stderrData = '';
                pyProc.stdout.on('data', (c) => {
                  stdoutData += c.toString();
                });
                pyProc.stderr.on('data', (c) => {
                  stderrData += c.toString();
                });
                pyProc.on('error', () => {
                  res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                  });
                  res.end(
                    JSON.stringify({
                      ok: false,
                      savedFile: finalName,
                      error: 'Python CLI indisponível no host; usando extrator integrado.',
                    })
                  );
                });
                pyProc.on('close', (code) => {
                  try {
                    const lines = stdoutData.trim().split(/\r?\n/);
                    const lastJsonLine = lines[lines.length - 1] || '{}';
                    const parsed = JSON.parse(lastJsonLine);
                    res.writeHead(200, {
                      'Access-Control-Allow-Origin': '*',
                      'Content-Type': 'application/json',
                    });
                    res.end(JSON.stringify(parsed));
                  } catch {
                    res.writeHead(200, {
                      'Access-Control-Allow-Origin': '*',
                      'Content-Type': 'application/json',
                    });
                    res.end(
                      JSON.stringify({
                        ok: false,
                        savedFile: finalName,
                        code,
                        stderr: stderrData,
                      })
                    );
                  }
                });
              } catch (err) {
                res.writeHead(500, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ ok: false, error: String(err) }));
              }
            });
            return;
          }
        }

        // 5. Envio de código de liberação para pedro.eduardo1777@gmail.com (/api/send-unlock-code)
        if (pathname === '/api/send-unlock-code') {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.writeHead(204);
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (c) => {
              bodyStr += c.toString();
            });
            req.on('end', () => {
              try {
                const payload = JSON.parse(bodyStr || '{}');
                const code = payload.code || '000000';
                const targetEmail = 'pedro.eduardo1777@gmail.com';
                console.log(
                  `\n============================================================\n` +
                    `[ORDO COMPANION - CÓDIGO DE LIBERAÇÃO DE ACERVO]\n` +
                    `Enviado para: ${targetEmail}\n` +
                    `Código de 6 dígitos: ${code}\n` +
                    `============================================================\n`
                );
                res.writeHead(200, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ ok: true, targetEmail }));
              } catch (err) {
                res.writeHead(400, {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ ok: false, error: String(err) }));
              }
            });
            return;
          }
        }
      } catch (err) {
        console.error('[PDF Middleware Error]:', err);
      }

      return baseMiddleware(req, res, next);
    };
  },
};

module.exports = config;
