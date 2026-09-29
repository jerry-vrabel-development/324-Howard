/**
 * Tiny, safe templating.
 *
 * Every value interpolated into `html\`...\`` is HTML-escaped unless it is
 * already a SafeHtml (another `html` result, or something wrapped in `raw()`).
 * This is what keeps user-entered titles, notes and URLs from being parsed as
 * markup — the original version wrote them straight into innerHTML.
 */

export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"'`]/g, (ch) => ESCAPES[ch] ?? ch);
}

function render(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0] ?? '';
  values.forEach((value, i) => {
    out += render(value) + (strings[i + 1] ?? '');
  });
  return new SafeHtml(out);
}

/** Mark trusted markup (e.g. an SVG icon we generated) as safe. Never pass user input. */
export function raw(markup: string): SafeHtml {
  return new SafeHtml(markup);
}

export function setHtml(el: Element, content: SafeHtml): void {
  el.innerHTML = content.value;
}

/**
 * Only allow http(s) and inline image data URLs as image sources.
 * Anything else (javascript:, file:, garbage) falls back to the placeholder.
 */
export function safeImageUrl(url: string, fallback: string): string {
  const trimmed = url.trim();
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);/i.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}
