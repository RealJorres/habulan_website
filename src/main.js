import { config } from './config.js';
import { qrSvg } from './qr.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* ---------- Header: solid once scrolled, the current section underlined ---------- */
function initHeader() {
  const header = $('[data-header]');
  const update = () => header.classList.toggle('is-solid', window.scrollY > 40);
  update();
  window.addEventListener('scroll', update, { passive: true });

  const links = $$('.nav a[href^="#"]:not(.btn)');
  const sections = links.map((link) => $(link.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.setAttribute('aria-current', String(link.getAttribute('href') === `#${entry.target.id}`)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((section) => observer.observe(section));
}

/* ---------- Mobile menu ---------- */
function initMobileMenu() {
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-mobile-menu]');
  if (!toggle || !menu) return;
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'true');
  menu.inert = true;

  const focusables = () => $$('a, button', menu);
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) focusables()[0]?.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
    } else if (event.key === 'Tab') {
      // Keep focus inside the menu and its toggle.
      const items = [toggle, ...focusables()];
      const index = items.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
    }
  });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/* ---------- Reveal on scroll ---------- */
function initReveals() {
  const targets = $$('.reveal, .reveal-img, .words');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach((el) => observer.observe(el));
}

/* ---------- Parallax (only while on screen, and never with reduced motion) ---------- */
function initParallax() {
  const layers = $$('[data-parallax]');
  if (!layers.length) return;
  const visible = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
  });
  layers.forEach((layer) => observer.observe(layer.parentElement));

  let frame = 0;
  const render = () => {
    frame = 0;
    if (reduceMotion.matches) {
      layers.forEach((layer) => (layer.style.transform = ''));
      return;
    }
    const viewport = window.innerHeight;
    layers.forEach((layer) => {
      const section = layer.parentElement;
      if (!visible.has(section)) return;
      const rect = section.getBoundingClientRect();
      const speed = parseFloat(layer.dataset.parallax) || 0.2;
      const offset = (rect.top + rect.height / 2 - viewport / 2) * -speed;
      layer.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  };
  const request = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  reduceMotion.addEventListener('change', request);
  request();
}

/* ---------- Embers rising over the hero ---------- */
function initEmbers() {
  const canvas = $('[data-embers]');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let embers = [];
  let running = false;
  let onScreen = true;
  let last = 0;

  const spawn = (anywhere) => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 10,
    r: 0.6 + Math.random() * 1.8,
    vy: 12 + Math.random() * 30,
    sway: 8 + Math.random() * 22,
    phase: Math.random() * Math.PI * 2,
    life: 0.5 + Math.random() * 0.5,
    hue: Math.random() < 0.18 ? 'crimson' : 'gold',
  });

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.round(Math.min(70, Math.max(24, width / 22)));
    embers = Array.from({ length: count }, () => spawn(true));
  };

  const draw = (time) => {
    if (!running) return;
    const dt = Math.min(0.05, (time - last) / 1000 || 0);
    last = time;
    context.clearRect(0, 0, width, height);
    for (const e of embers) {
      e.y -= e.vy * dt;
      e.phase += dt * 0.9;
      const x = e.x + Math.sin(e.phase) * e.sway;
      if (e.y < -10) Object.assign(e, spawn(false));
      const fade = Math.min(1, e.y / (height * 0.25)) * e.life * (0.65 + 0.35 * Math.sin(e.phase * 3));
      const glow = context.createRadialGradient(x, e.y, 0, x, e.y, e.r * 4);
      const color = e.hue === 'crimson' ? '208, 67, 77' : '232, 184, 112';
      glow.addColorStop(0, `rgba(${color}, ${Math.max(0, fade).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${color}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, e.y, e.r * 4, 0, Math.PI * 2);
      context.fill();
    }
    requestAnimationFrame(draw);
  };

  const sync = () => {
    const shouldRun = onScreen && !document.hidden && !reduceMotion.matches;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(draw);
    } else if (!shouldRun && running) {
      running = false;
      context.clearRect(0, 0, width, height);
    }
  };

  resize();
  window.addEventListener('resize', () => {
    resize();
  });
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', sync);
  sync();
}

/* ---------- Horizontal rails with arrows ---------- */
function initRails() {
  $$('[data-rail]').forEach((rail) => {
    const controls = $(`[data-rail-controls="${rail.dataset.rail}"]`);
    if (!controls) return;
    const prev = $('[data-rail-prev]', controls);
    const next = $('[data-rail-next]', controls);
    const step = () => Math.max(rail.clientWidth * 0.85, 240);
    const behavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
    const update = () => {
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
    };
    prev.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: behavior() }));
    next.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: behavior() }));
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    rail.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') next.click();
      if (event.key === 'ArrowLeft') prev.click();
    });
    update();
  });
}

/* ---------- Day / dusk comparison ---------- */
function initCompare() {
  const compare = $('[data-compare]');
  if (!compare) return;
  const range = $('[data-compare-range]', compare);
  const set = (value) => {
    compare.style.setProperty('--split', `${value}%`);
    range.setAttribute('aria-valuetext', `${100 - value}% dusk`);
  };
  let touched = false;
  range.addEventListener('input', () => set(range.value));
  range.addEventListener('pointerdown', () => (touched = true));
  range.addEventListener('keydown', () => (touched = true));
  set(range.value);

  // The first time the picture comes into view, the day sweeps to dusk and back by itself, once.
  const sweep = () => {
    if (touched || reduceMotion.matches) return;
    const keys = [[0, 50], [0.32, 86], [0.72, 10], [1, 50]];
    const duration = 3600;
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      if (touched) return;
      const t = Math.min(1, (now - start) / duration);
      let i = 0;
      while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
      const [t0, v0] = keys[i];
      const [t1, v1] = keys[i + 1];
      const value = v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
      range.value = String(Math.round(value));
      set(value.toFixed(2));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    setTimeout(sweep, 700);
  }, { threshold: 0.55 });
  observer.observe(compare);
}

/* ---------- Headings split into words that rise one by one ---------- */
function initSplit() {
  $$('[data-split]').forEach((heading) => {
    let index = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          if (!parts.some((p) => p.trim())) return;
          const fragment = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (!part.trim()) {
              fragment.append(document.createTextNode(' '));
              return;
            }
            const outer = document.createElement('span');
            outer.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--w', String(index++));
            outer.append(inner);
            fragment.append(outer);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());
    walk(heading);
    // The words move instead of the whole heading fading.
    heading.classList.remove('reveal');
    heading.classList.add('words');
  });
}

/* ---------- Effects tied to the scroll position ---------- */
function initScrollEffects() {
  const progress = $('[data-progress]');
  const header = $('[data-header]');
  const menuToggle = $('[data-menu-toggle]');
  const hero = $('.hero');
  const heroContent = $('[data-hero-content]');
  const drifters = $$('[data-drift]');
  const growers = $$('[data-grow]');
  const marquees = $$('[data-marquee]').map((band) => ({ band, track: $('.marquee__track', band), dir: Number(band.dataset.marquee) || 1 }));
  const chronicle = $('.chronicle');
  const chapters = chronicle ? $$('li', chronicle) : [];

  let lastY = window.scrollY;
  let frame = 0;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const render = () => {
    frame = 0;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');

    // Hide the header going down (past the hero), show it going up. Never while the menu is open.
    const menuOpen = menuToggle?.getAttribute('aria-expanded') === 'true';
    if (!menuOpen && Math.abs(y - lastY) > 6) {
      header.classList.toggle('is-hidden', y > lastY && y > vh * 0.9 && !reduceMotion.matches);
      lastY = y;
    }
    if (menuOpen) header.classList.remove('is-hidden');

    if (reduceMotion.matches) {
      [heroContent, ...drifters, ...growers, ...marquees.map((m) => m.track)].forEach((el) => el && (el.style.transform = ''));
      if (heroContent) heroContent.style.opacity = '';
      chronicle?.style.setProperty('--line', '1');
      chapters.forEach((li) => li.classList.add('is-lit'));
      return;
    }

    // The hero's words lift and fade as the page moves past them.
    if (hero && heroContent) {
      const p = clamp(y / (hero.offsetHeight * 0.75));
      heroContent.style.opacity = (1 - p * 1.1).toFixed(3);
      heroContent.style.transform = `translate3d(0, ${(p * -70).toFixed(1)}px, 0) scale(${(1 - p * 0.06).toFixed(4)})`;
    }

    // Chapter pictures and their numerals drift at different speeds.
    drifters.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const offset = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0, ${(offset * parseFloat(el.dataset.drift)).toFixed(1)}px, 0)`;
    });

    // The trailer screen grows into place.
    growers.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp((vh - r.top) / (vh * 0.75));
      el.style.transform = `scale(${(0.86 + 0.14 * p).toFixed(4)})`;
    });

    // The bands of type slide sideways.
    marquees.forEach(({ band, track, dir }) => {
      const r = band.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (vh - r.top) / (vh + r.height); // 0 entering, 1 leaving
      const travel = Math.max(0, track.scrollWidth - band.clientWidth);
      const x = dir > 0 ? -travel * p : -travel * (1 - p);
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    });

    // The lore's line draws down to the reading position; passed chapters light up.
    if (chronicle) {
      const r = chronicle.getBoundingClientRect();
      const reading = vh * 0.62;
      chronicle.style.setProperty('--line', clamp((reading - r.top) / r.height).toFixed(4));
      chapters.forEach((li) => li.classList.toggle('is-lit', li.getBoundingClientRect().top < reading));
    }
  };

  const request = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  reduceMotion.addEventListener('change', request);
  render();
}

/* ---------- Gallery: filters and lightbox ---------- */
function initGallery() {
  const gallery = $('[data-gallery]');
  const lightbox = $('[data-lightbox]');
  if (!gallery || !lightbox) return;
  const img = $('[data-lightbox-img]', lightbox);
  const caption = $('[data-lightbox-caption]', lightbox);
  let items = [];
  let index = 0;
  let opener = null;

  const visibleLinks = () => $$('li:not([hidden]) a', gallery);

  $$('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      $$('li', gallery).forEach((li) => {
        li.hidden = filter !== 'all' && !li.dataset.cat.split(' ').includes(filter);
      });
    });
  });

  const show = (i) => {
    index = (i + items.length) % items.length;
    const link = items[index];
    img.src = link.href;
    img.alt = $('img', link)?.alt || '';
    caption.textContent = `${link.dataset.caption}  ·  ${index + 1} / ${items.length}`;
  };

  gallery.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link || typeof lightbox.showModal !== 'function') return;
    event.preventDefault();
    opener = link;
    items = visibleLinks();
    show(items.indexOf(link));
    lightbox.showModal();
  });
  // The character art opens in the same viewer, paging through the characters.
  $$('[data-art-set]').forEach((set) => {
    set.addEventListener('click', (event) => {
      const link = event.target.closest('a.card__art');
      if (!link || typeof lightbox.showModal !== 'function') return;
      event.preventDefault();
      opener = link;
      items = $$('a.card__art', set);
      show(items.indexOf(link));
      lightbox.showModal();
    });
  });
  $('[data-prev]', lightbox).addEventListener('click', () => show(index - 1));
  $('[data-next]', lightbox).addEventListener('click', () => show(index + 1));
  $('[data-close]', lightbox).addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('close', () => {
    img.removeAttribute('src');
    opener?.focus();
  });

  // Swipe between pictures on touch screens.
  let startX = null;
  lightbox.addEventListener('touchstart', (event) => (startX = event.touches[0].clientX), { passive: true });
  lightbox.addEventListener('touchend', (event) => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
}

/* ---------- Video: YouTube, Vimeo or a file, loaded only on play ---------- */
export function videoEmbed(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url, window.location.href);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, '');
  let id = null;
  if (host === 'youtu.be') id = parsed.pathname.slice(1);
  else if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
    id = parsed.searchParams.get('v') || (parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/) || [])[1];
  }
  if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1` };
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeo = (parsed.pathname.match(/(\d{6,})/) || [])[1];
    if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo}?autoplay=1&dnt=1` };
  }
  if (/\.(mp4|webm|ogv|mov)$/i.test(parsed.pathname)) return { kind: 'file', src: parsed.href };
  // Any other web page (a Facebook or TikTok video, say) opens in a new tab.
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return { kind: 'link', src: parsed.href };
  return null;
}

function initVideos() {
  const modal = $('[data-video-modal]');
  const frame = $('[data-video-frame]', modal);
  const sources = {
    trailer: { url: config.trailerUrl, title: 'The official trailer', poster: config.trailerPoster },
    gameplay: { url: config.gameplayVideoUrl, title: 'The gameplay video' },
  };
  let opener = null;

  $$('[data-video-status]').forEach((status) => {
    const ready = Boolean(videoEmbed(sources[status.dataset.videoStatus]?.url));
    status.textContent = ready ? 'Play' : 'Coming soon';
    status.classList.toggle('tag--soon', !ready);
  });

  const open = (key, trigger) => {
    const source = sources[key];
    const embed = videoEmbed(source?.url);
    if (embed?.kind === 'link') {
      window.open(embed.src, '_blank', 'noopener');
      return;
    }
    frame.replaceChildren();
    if (!embed) {
      const box = document.createElement('div');
      box.className = 'video-modal__placeholder';
      box.innerHTML = '<span class="tag tag--soon">Coming soon</span><h3></h3><p>It isn’t out yet. Check back here soon.</p>';
      box.querySelector('h3').textContent = `${source?.title || 'This video'} is on its way.`;
      frame.append(box);
    } else if (embed.kind === 'iframe') {
      const iframe = document.createElement('iframe');
      iframe.src = embed.src;
      iframe.title = source.title;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.append(iframe);
    } else {
      const video = document.createElement('video');
      video.src = embed.src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'auto';
      if (source.poster) video.poster = source.poster;
      video.setAttribute('aria-label', source.title);
      frame.append(video);
    }
    opener = trigger;
    if (typeof modal.showModal === 'function') modal.showModal();
  };

  $$('[data-video]').forEach((trigger) => trigger.addEventListener('click', () => open(trigger.dataset.video, trigger)));
  const close = () => {
    frame.replaceChildren(); // stop the sound at once, not after the dialog's close event
    modal.close();
  };
  $('[data-close]', modal).addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });
  modal.addEventListener('close', () => {
    frame.replaceChildren(); // stops playback
    opener?.focus();
  });
}

/* ---------- Download, platforms and the QR code ---------- */
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function initDownload() {
  const button = $('[data-download]');
  const platforms = $('[data-platforms]');
  const qr = $('[data-qr]');
  const qrCaption = $('[data-qr-caption]');

  if (config.downloadUrl && isHttpUrl(config.downloadUrl)) {
    button.href = config.downloadUrl;
    button.textContent = config.downloadLabel || 'Download';
    button.removeAttribute('aria-disabled');
    button.target = '_blank';
    button.rel = 'noopener';
  } else {
    button.addEventListener('click', (event) => event.preventDefault());
  }

  if (config.platforms?.length || config.plannedPlatforms?.length) {
    platforms.replaceChildren();
    const add = (label, text) => {
      if (platforms.childNodes.length) platforms.append(document.createTextNode('   '));
      const b = document.createElement('b');
      b.textContent = `${label}: `;
      platforms.append(b, document.createTextNode(text));
    };
    if (config.platforms?.length) add('Out now', config.platforms.join(' · '));
    if (config.plannedPlatforms?.length) add('Planned', config.plannedPlatforms.join(' · '));
  }

  const target = config.qrUrl || config.downloadUrl;
  if (target && isHttpUrl(target)) {
    try {
      qr.innerHTML = qrSvg(target, { label: `QR code for ${target}` });
      qr.classList.remove('is-empty');
      qrCaption.textContent = 'Scan with your phone to open the download page.';
    } catch (error) {
      console.warn(error.message);
    }
  }
}

/* ---------- Footer: year, holder, socials and team ---------- */
function initFooter() {
  $('[data-year]').textContent = String(new Date().getFullYear());
  if (config.copyrightHolder) $('[data-holder]').textContent = config.copyrightHolder;

  const socials = (config.socials || []).filter((s) => s.label && isHttpUrl(s.url));
  if (socials.length) {
    const list = $('[data-socials-list]');
    socials.forEach((s) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.label;
      a.rel = 'noopener me';
      a.target = '_blank';
      li.append(a);
      list.append(li);
    });
    $('[data-socials]').hidden = false;
  }

  const team = (config.team || []).filter((m) => m.name);
  if (team.length) {
    const list = $('[data-team-list]');
    team.forEach((m) => {
      const li = document.createElement('li');
      li.textContent = m.role ? `${m.name}, ${m.role}` : m.name;
      list.append(li);
    });
    $('[data-team]').hidden = false;
  }
}

initHeader();
initMobileMenu();
initSplit();
$$('[data-gallery] li').forEach((li) => li.classList.add('reveal'));
initReveals();
initScrollEffects();
initParallax();
initEmbers();
initRails();
initCompare();
initGallery();
initVideos();
initDownload();
initFooter();
