// Rebuilds the site's images, icons and fonts from the HABULAN Unity project (read only: nothing there is changed).
//   GAME_PROJECT  the Unity project folder (default below)
//   FFMPEG        the ffmpeg program (default: ffmpeg on the PATH)
// Usage: npm run assets
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const game = process.env.GAME_PROJECT || 'C:/Users/relat/UnityEngineProjects/Habulan';
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const out = join(project, 'public', 'assets');
const shots = join(game, 'Screenshots');
const site = join(shots, 'Website'); // written by the game's WebsiteCaptureTool (Baryo Sawi, day and dusk)
const art = join(game, 'Assets', 'Habulan', 'Art');

function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}\n${result.stderr || result.error}`);
}

async function webp(src, dest, width, { quality = 80, alpha = false, filter = null } = {}) {
  await mkdir(dirname(dest), { recursive: true });
  const scale = `scale=${width}:-2:flags=lanczos`;
  run(['-i', src, '-vf', filter ? `${filter},${scale}` : scale, '-c:v', 'libwebp', '-quality', String(quality),
    '-compression_level', '6', ...(alpha ? ['-pix_fmt', 'yuva420p'] : []), dest]);
}

async function sizes(src, base, widths, options) {
  for (const w of widths) await webp(src, `${base}-${w}.webp`, w, options);
}

async function png(src, dest, size) {
  await mkdir(dirname(dest), { recursive: true });
  run(['-i', src, '-vf', `scale=${size}:${size}:flags=lanczos`, dest]);
}

const env = (name) => join(out, 'environments', name);
const shot = (name) => join(out, 'screenshots', name);

// The hero, the day / dusk comparison and the places around Baryo Sawi.
const HERO = 'dusk_wide_church_low.jpg';
const COMPARE = { day: 'day_03_plaza_hero.jpg', dusk: 'dusk_03_plaza_hero.jpg' };
const DISTRICTS = {
  'arch-dusk': 'dusk_04_arch.jpg',
  'market-dusk': 'dusk_06_market.jpg',
  'market-day': 'day_12_arcade_top.jpg',
  'church-day': 'day_05_church.jpg',
  'church-dusk': 'dusk_05_church.jpg',
  'court-day': 'day_08_court.jpg',
  'sari-day': 'day_14_store_front.jpg',
  'sari-dusk': 'dusk_14_store_front.jpg',
  'bahay-dusk': 'dusk_10_bahay.jpg',
  'pantalan-dusk': 'dusk_wide_harbour.jpg',
  'gate-dusk': 'dusk_13_gate.jpg',
};
// A real practice match in Baryo Sawi (the game's WebsiteCaptureTests).
const MATCH = {
  'match-day-runner': 'web_match_01_day_runner.jpg',
  'match-day-third': 'web_match_02_day_third.jpg',
  'match-dusk-third': 'web_match_03_dusk_third.jpg',
  'match-dusk-runner': 'web_match_04_dusk_runner.jpg',
  'match-you-are-taya': 'web_match_05_dusk_you_are_taya.jpg',
  'match-taya-third': 'web_match_06_dusk_taya_third.jpg',
};
const CHARACTERS = {
  'kenz-kenz': 'KenzKenz', 'the-melvz': 'TheMelvz', jie: 'Jie', vdg: 'VDG', 'doc-ry': 'DocRy', 'fr-xenoj': 'FrXenoj',
  'nining-joan': 'NiningJoan', caloy: 'Caloy', jorress: 'Jorress', 'jun-jun': 'JunJun', 'madam-donna': 'MadamDonna',
  jetto: 'Jetto', 'ghost-of-the-fifth-bell': 'Bellwraith',
};
const POWERUPS = ['speed_burst', 'stamina_burst', 'dash', 'tracker', 'tag_boost', 'shield', 'decoy', 'hunter_pulse', 'smoke_bomb'];
const FONTS = ['Cinzel-Bold.ttf', 'Cinzel_OFL.txt', 'Barlow-SemiBold.ttf', 'Barlow-Italic.ttf', 'BarlowCondensed-Bold.ttf', 'Barlow_OFL.txt'];

console.log(`From ${game}`);

await sizes(join(site, HERO), env('hero'), [960, 1600, 2560], { quality: 78 });
await sizes(join(site, COMPARE.day), env('baryo-day'), [960, 1920]);
await sizes(join(site, COMPARE.dusk), env('baryo-dusk'), [960, 1920]);
for (const [name, file] of Object.entries(DISTRICTS)) await sizes(join(site, file), env(`district-${name}`), [600, 1200, 1920]);
for (const [name, file] of Object.entries(MATCH)) await sizes(join(shots, file), shot(name), [800, 1600, 2560]);
console.log('environments and screenshots: done');

for (const [slug, key] of Object.entries(CHARACTERS)) {
  await webp(join(art, 'Characters', 'Presets', key, `${key}_Portrait.png`), join(out, 'characters', `${slug}.webp`), 400, { quality: 84 });
}
console.log('characters: done');

await webp(join(art, 'UI', 'Habulan_Wordmark.png'), join(out, 'logo', 'habulan-wordmark.webp'), 1200, { quality: 90, alpha: true });
await webp(join(art, 'UI', 'Habulan_Wordmark.png'), join(out, 'logo', 'habulan-wordmark-sm.webp'), 400, { quality: 90, alpha: true });
const icon = join(art, 'UI', 'Habulan_Icon.png');
await png(icon, join(out, 'favicon', 'favicon-32.png'), 32);
await png(icon, join(out, 'favicon', 'apple-touch-icon.png'), 180);
await png(icon, join(out, 'favicon', 'icon-192.png'), 192);
await png(icon, join(out, 'favicon', 'icon-512.png'), 512);
console.log('logo and icons: done');

for (const id of POWERUPS) {
  await mkdir(join(out, 'icons', 'powerups'), { recursive: true });
  await copyFile(join(art, 'Icons', `Icon_${id}.png`), join(out, 'icons', 'powerups', `${id.replace(/_/g, '-')}.png`));
}
for (const font of FONTS) {
  await mkdir(join(out, 'fonts'), { recursive: true });
  await copyFile(join(game, 'Assets', 'Habulan', 'UI', 'Fonts', font), join(out, 'fonts', font));
}
console.log('powerup icons and fonts: done');

// The social preview: 1200 x 630.
await mkdir(join(out, 'og'), { recursive: true });
run(['-i', join(site, HERO), '-vf', 'scale=1200:630:force_original_aspect_ratio=increase:flags=lanczos,crop=1200:630', '-q:v', '3', join(out, 'og', 'og-image.jpg')]);
console.log('social preview: done');
