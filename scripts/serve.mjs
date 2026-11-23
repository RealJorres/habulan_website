// A tiny static server with no dependencies.
//   npm run dev       serves the project: files from the root, then from public/ (as the build lays them out)
//   npm run preview   serves dist/ exactly as it will be hosted
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = process.argv[2];
const roots = target ? [resolve(project, target)] : [project, join(project, 'public')];
const port = Number(process.env.PORT) || (target ? 4173 : 5173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function find(pathname) {
  for (const root of roots) {
    const file = normalize(join(root, pathname));
    if (file !== root && !file.startsWith(root + sep)) continue; // never outside the root
    try {
      const info = await stat(file);
      if (info.isDirectory()) {
        const index = join(file, 'index.html');
        await stat(index);
        return index;
      }
      return file;
    } catch {
      // try the next root
    }
  }
  return null;
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = await find(pathname);
    if (!file) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(String(error));
  }
}).listen(port, () => {
  console.log(`HABULAN site: http://localhost:${port}/  (serving ${roots.map((r) => r.replace(project, '.') || '.').join(' + ')})`);
});
