# HABULAN: The Curse of the Fifth Bell (official website)

A static, single-page promotional site for HABULAN, the multiplayer 3D tag game. It has no backend, no database and no
accounts, and needs no `npm install`: the dev server, build and checks are small Node scripts with no dependencies.

## Run it

You need Node.js 18 or newer.

```powershell
npm run dev       # http://localhost:5173, the project as you edit it
npm run build     # the production site in dist/
npm run preview   # http://localhost:4173, dist/ exactly as it will be hosted
npm test          # checks the built-in QR code generator against reference values
```

`npm run build` copies `public/` to the root of `dist/`, adds the page, minifies the stylesheet, and stops with an error
if the page, stylesheet or scripts point at a file that doesn't exist.

## Deploy

Upload the contents of `dist/` to any static host (GitHub Pages, Netlify, Cloudflare Pages). All paths are relative, so it
also works from a sub-folder such as `username.github.io/habulan/`.

- **Netlify / Cloudflare Pages:** build command `npm run build`, output folder `dist`.
- **GitHub Pages:** run `npm run build` and publish `dist/` (for example from a `gh-pages` branch).

## Add the real links: `src/config.js`

Every link lives in one file. Empty values show as "Coming soon" on the page; nothing is invented. Set now: the trailer
(`assets/videos/trailer.mp4`), the download (the release build's Google Drive folder), Windows PC, and Android as planned.
Still empty: `siteUrl`, `gameplayVideoUrl`, `socials` and `team`.

| Setting | What it does |
|---|---|
| `siteUrl` | The site's address. The build uses it to make the social-preview tags absolute. |
| `trailerUrl` | The official trailer: a YouTube or Vimeo link, or a video file such as `assets/videos/trailer.mp4`. |
| `gameplayVideoUrl` | A gameplay video, in the same forms. |
| `downloadUrl`, `downloadLabel` | The download or store page, and the button's words. |
| `platforms` | The platforms it's out on, e.g. `['Windows PC']`. |
| `plannedPlatforms` | Platforms in the works, shown as "Planned", e.g. `['Android']`. |
| `trailerPoster` | The picture a local trailer file shows before it plays. |
| `qrUrl` | Where the QR code points. Empty means `downloadUrl`; with neither, no code is drawn. |
| `socials` | Official accounts: `{ label: 'Facebook', url: 'https://...' }`. |
| `team` | Names for the footer: `{ name: '...', role: '...' }`. |
| `copyrightHolder` | The name after the © in the footer. |

Videos load only when someone presses play. YouTube links play from `youtube-nocookie.com`. A link to any other
page (a Facebook or TikTok video, for example) opens in a new tab instead of playing on the page.

The QR code is drawn in the browser by `src/qr.js` (no library, no outside service) from the real URL in the
settings. Scan it with a phone once you set the link.

## What's in it

1. **Hero:** Baryo Sawi at the curse's dusk, slow drift, fog and rising embers, the logo and both taglines.
2. **About:** what HABULAN is and how a match works: 3 to 8 players, 5:00 on every clock online, most time left wins.
3. **Gameplay:** four chapters (The Chase, Become the Taya, Pass the Curse, Survive the Fifth Bell) with real captures.
4. **Features:** only what the game has today. Then the roster (12 characters and the Ghost of the 5th Bell, with each
   ability as the game describes it), the nine powerups, and the modes, with five marked as coming soon.
5. **The world:** Baryo Sawi only. A day/dusk slider of the same view, and a rail of places around the village.
6. **The lore:** five chapters from the game's Lore Journal, with the game's own fiction note.
7. **Media:** a filterable gallery with a full-screen viewer (keyboard and swipe).
8. **Trailer:** a cinematic player that shows "coming soon" until `trailerUrl` is set.
9. **Play:** the download button, the platforms, the QR code, and the gameplay video and trailer.
10. **Footer:** logo, subtitle, links, optional socials and team, credits and copyright.

### Animation

- **Loading in:** the hero's logo, title and taglines rise in turn, over a slow drift of the picture, fog and embers.
- **While scrolling:**
  - a gold progress line runs along the top;
  - the header slides away going down and comes back going up;
  - the hero lifts and fades as you leave it;
  - headings rise word by word, and eyebrow lines draw themselves;
  - chapter pictures and their numerals drift at different speeds;
  - cards, tiles and places rise in staggered order;
  - the five bells light up one after another, and the fifth rings;
  - the day/dusk picture sweeps to dusk and back once, by itself (unless you've already touched it);
  - two bands of giant type ("Takbo", "Ikaw naman ang taya") slide sideways with the scroll;
  - the lore's timeline draws down to where you're reading, lighting each chapter as you pass it;
  - the trailer screen grows into place.

All of it respects `prefers-reduced-motion`: with it on, everything is shown in place and nothing moves. The embers also
pause when the hero is off screen or the tab is hidden.

### The trailer

`public/assets/videos/trailer.mp4` is a web copy of the 1-minute trailer: 1080p at 60 fps, about 46 MB, set up to start
playing before it has fully downloaded. The original was 230 MB, over GitHub Pages' 100 MB per-file limit. To replace it,
re-encode the new file the same way:

```powershell
ffmpeg -i new_trailer.mp4 -c:v libx264 -preset slow -crf 23 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart public/assets/videos/trailer.mp4
```

The cover image (`trailer-poster-*.webp`) is the trailer's opening frame.

## Where the pictures come from

Every picture is real, from the HABULAN Unity project. The originals are only read, never changed.

- **Baryo Sawi scenery** (day and the curse's dusk, 2560 x 1440): the game's editor tool
  `Habulan.EditorTools.WebsiteCaptureTool.CaptureBaryoSawi`, written to `Screenshots/Website/`.
- **Match shots** (a real practice match in Baryo Sawi with the game's HUD): the game's explicit PlayMode test
  `Habulan.Tests.WebsiteCaptureTests`, written to `Screenshots/web_match_*.jpg`.
- **Portraits, logo, icon, powerup icons and fonts:** from `Assets/Habulan/Art` and `Assets/Habulan/UI/Fonts`.

To rebuild them all after new captures (it needs ffmpeg with WebP support):

```powershell
$env:FFMPEG = "C:\path\to\ffmpeg.exe"; npm run assets
```

## Structure

```text
Habulan_Website/
├── index.html              the page
├── src/
│   ├── config.js           links and settings (edit this)
│   ├── main.js             navigation, reveals, parallax, embers, gallery, videos, QR, footer
│   ├── qr.js               the QR code generator
│   └── styles/main.css     the design system and every section
├── public/                 copied to the root of dist/
│   ├── assets/
│   │   ├── logo/  characters/  environments/  screenshots/
│   │   ├── icons/powerups/  fonts/  og/  favicon/
│   │   ├── posters/        empty: for promotional posters
│   │   └── videos/         empty: for a local trailer file
│   ├── site.webmanifest
│   └── robots.txt
├── scripts/
│   ├── serve.mjs  build.mjs  prepare-assets.mjs  test-qr.mjs
└── package.json
```

## Credits shown on the site

The footer carries the credits the game itself shows: the Meshy CC BY 4.0 notice for the character and Baryo Sawi
models, Quaternius and Kenney (CC0), and the fonts (SIL Open Font License; the licence files are in
`public/assets/fonts/`).
