import { html, type SafeHtml } from '../../utils/html';

/**
 * Before/after comparison.
 *
 * The "before" image sits on top of the "after" image and is clipped with
 * `clip-path: inset(...)` driven by a single CSS variable, --pos. A native
 * <input type="range"> covers the whole image and sets --pos. That gives us
 * mouse, touch and keyboard support (arrow keys, Home/End) with one listener
 * and nothing attached to `window` — the original leaked window listeners on
 * every re-render and needed a resize handler to keep the images aligned.
 */

/** Label sits in its own half so the two placeholders don't overlap at the default 50% split. */
export function placeholderImage(label: string, color: string, x: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${color}"/><text x="${x}" y="410" font-family="system-ui, sans-serif" font-size="40" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const BEFORE_PLACEHOLDER = placeholderImage('No before photo', '#945238', 300);
export const AFTER_PLACEHOLDER = placeholderImage('No after photo', '#2b6b83', 900);

export function compareSliderMarkup(opts: {
  title: string;
  beforeSrc: string;
  afterSrc: string;
}): SafeHtml {
  return html`
    <div class="compare" style="--pos: 50%">
      <img
        class="compare-img"
        src="${opts.afterSrc}"
        alt="After: ${opts.title}"
        data-fallback="after"
        loading="lazy"
        decoding="async"
      />
      <img
        class="compare-img compare-before"
        src="${opts.beforeSrc}"
        alt="Before: ${opts.title}"
        data-fallback="before"
        loading="lazy"
        decoding="async"
      />
      <span class="compare-tag compare-tag-before">Before</span>
      <span class="compare-tag compare-tag-after">After</span>
      <div class="compare-handle" aria-hidden="true">
        <span class="compare-knob"><i data-lucide="chevrons-left-right" class="size-4"></i></span>
      </div>
      <input
        class="compare-range"
        type="range"
        min="0"
        max="100"
        step="0.5"
        value="50"
        aria-label="Reveal before or after photo: ${opts.title}"
        aria-valuetext="50% before"
      />
    </div>
  `;
}

/** One delegated listener handles every slider inside `root`. */
export function enhanceCompareSliders(root: HTMLElement): void {
  root.addEventListener('input', (event) => {
    const range = event.target as HTMLInputElement;
    if (!range.classList.contains('compare-range')) return;
    const compare = range.closest<HTMLElement>('.compare');
    compare?.style.setProperty('--pos', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${Math.round(Number(range.value))}% before`);
  });

  // Broken image URLs fall back to a local placeholder (no third-party request).
  root.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.failed) return;
      img.dataset.failed = 'true';
      img.src = img.dataset.fallback === 'before' ? BEFORE_PLACEHOLDER : AFTER_PLACEHOLDER;
    },
    true,
  );
}
