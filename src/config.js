/*
 * HABULAN website settings: the one file to edit when real links are ready.
 * Anything left empty shows as "coming soon" on the page. Nothing here is invented: fill in only real, public URLs.
 */
export const config = {
  /*
   * The address the site will live at, e.g. 'https://habulan.example.com' (no trailing slash).
   * `npm run build` uses it to make the social-preview tags absolute (Facebook, X and Discord need absolute URLs).
   */
  siteUrl: '',

  /*
   * The official trailer. A YouTube link (watch, youtu.be, shorts or embed), a Vimeo link, or a video file such as
   * 'assets/videos/trailer.mp4'. Nothing loads until a visitor presses play.
   */
  trailerUrl: 'assets/videos/trailer.mp4',
  /* The picture shown before the trailer plays. */
  trailerPoster: 'assets/videos/trailer-poster-1920.webp',

  /* A gameplay video, in the same forms as the trailer. */
  gameplayVideoUrl: '',

  /* Where players get the game (a store page, itch.io page or direct download). */
  downloadUrl: 'https://drive.google.com/drive/folders/1qiM_dWslHFjP9iMGNo0Xn2X0vY0TKgDw?usp=sharing',
  /* The button's words once there is a download link. */
  downloadLabel: 'Download for Windows PC',
  /* Real platforms only, once announced, e.g. ['Windows']. Shown under the download button. */
  platforms: ['Windows PC'],
  /* Platforms in the works, shown as planned (never as available). */
  plannedPlatforms: ['Android'],

  /* The QR code's destination. Left empty, it uses downloadUrl. With neither, no QR code is drawn. */
  qrUrl: '',

  /* Official accounts only, e.g. { label: 'Facebook', url: 'https://www.facebook.com/...' }. */
  socials: [],

  /* The team, e.g. { name: 'Juan dela Cruz', role: 'Programmer' }. The game's own Credits screen has placeholders too. */
  team: [],

  /* The name after the copyright sign in the footer. */
  copyrightHolder: 'HABULAN',
};
