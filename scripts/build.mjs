// Production build with no dependencies: copies public/ to the root of dist/, adds the page and its scripts and
// styles, makes the social-preview URLs absolute when config.siteUrl is set, and fails on any missing asset.
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(project, 'dist');
const { config } = await import(pathToFileURL(join(project, 'src', 'config.js')).href);

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(full)));
    else out.push(full);
  }
  return out;
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(project, 'public'), dist, { recursive: true });

// Scripts as they are (small, readable ES modules); the stylesheet minified.
for (const file of await files(join(project, 'src'))) {
  const out = join(dist, relative(project, file));
  await mkdir(dirname(out), { recursive: true });
  if (file.endsWith('.css')) await writeFile(out, minifyCss(await readFile(file, 'utf8')));
  else await cp(file, out);
}

let html = await readFile(join(project, 'index.html'), 'utf8');
const siteUrl = (config.siteUrl || '').replace(/\/+$/, '');
if (siteUrl) {
  html = html
    .replace(/(<meta (?:property|name)="(?:og:image|twitter:image)" content=")(assets\/[^"]+)"/g, `$1${siteUrl}/$2"`)
    .replace(/(<meta property="og:url" content=")\.\/"/, `$1${siteUrl}/"`)
    .replace(/(<link rel="canonical" href=")\.\/"/, `$1${siteUrl}/"`);
} else {
  console.warn('note: config.siteUrl is empty, so the social-preview image stays relative (set it before deploying).');
}
await writeFile(join(dist, 'index.html'), html);

// Every local reference in the page, the stylesheet and the scripts must exist in dist/.
const sources = [
  ['index.html', html],
  ...(await Promise.all((await files(join(dist, 'src'))).map(async (f) => [relative(dist, f), await readFile(f, 'utf8')]))),
];
const missing = [];
for (const [name, text] of sources) {
  const base = dirname(join(dist, name));
  const refs = new Set();
  for (const m of text.matchAll(/(?:src|href|content|srcset|imagesrcset)="([^"]+)"/g)) {
    m[1].split(',').forEach((part) => refs.add(part.trim().split(/\s+/)[0]));
  }
  for (const m of text.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) refs.add(m[2]);
  for (const m of text.matchAll(/from '(\.[^']+)'/g)) refs.add(m[1]);
  for (const ref of refs) {
    if (!ref || /^(https?:|data:|#|mailto:|\.\/$)/.test(ref) || ref.startsWith('//')) continue;
    if (!/\.[a-z0-9]+$/i.test(ref)) continue;
    const local = ref.startsWith('assets/') || ref.startsWith('src/') || ref === 'site.webmanifest' ? join(dist, ref) : join(base, ref);
    try {
      await stat(local);
    } catch {
      missing.push(`${name}: ${ref}`);
    }
  }
}
if (missing.length) {
  console.error(`Missing files:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const all = await files(dist);
let bytes = 0;
for (const f of all) bytes += (await stat(f)).size;
console.log(`Built dist/: ${all.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB. Every referenced file is present.`);
