import { hydrateIcons } from '../../components/icons';
import type { HomeContent } from '../../content/home';
import { resolveAssetPath } from '../../content/published';

/**
 * Background video for the Home hero.
 *
 * - Muted, looping, inline (required for autoplay on phones).
 * - Doesn't autoplay for people who ask for reduced motion; they get the poster
 *   and can press play.
 * - Always has a visible pause button (WCAG 2.2.2 for moving content).
 * - Pauses when scrolled out of view or when another tab is open, so it isn't
 *   burning battery in the background.
 * - Falls back to the poster (or the plain gradient) if the video can't load.
 */

export interface HeroVideo {
  setVisible(visible: boolean): void;
}

export function initHeroVideo(
  media: HTMLElement,
  toggle: HTMLButtonElement,
  hero: HomeContent['hero'],
): HeroVideo {
  const poster = hero.poster ? resolveAssetPath(hero.poster) : '';
  if (poster) media.style.backgroundImage = `url("${poster}")`;
  if (!hero.video) return { setVisible: () => {} };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'metadata' });
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  if (poster) video.poster = poster;
  video.src = resolveAssetPath(hero.video);
  media.append(video);

  let userPaused = reduceMotion;
  let inView = true;
  let tabVisible = true;

  function renderToggle(): void {
    const playing = !video.paused;
    toggle.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}" class="size-4"></i><span class="sr-only">${
      playing ? 'Pause' : 'Play'
    } background video</span>`;
    hydrateIcons(toggle);
  }

  function sync(): void {
    if (!userPaused && inView && tabVisible) {
      video.play().catch(() => {
        // Autoplay blocked (e.g. data saver): leave the poster and the play button.
      });
    } else {
      video.pause();
    }
  }

  video.addEventListener('play', renderToggle);
  video.addEventListener('pause', renderToggle);
  video.addEventListener('error', () => {
    video.remove();
    toggle.hidden = true;
  });

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    userPaused = !video.paused;
    sync();
  });

  new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? true;
    sync();
  }).observe(media);

  renderToggle();
  sync();

  return {
    setVisible(visible) {
      tabVisible = visible;
      sync();
    },
  };
}
