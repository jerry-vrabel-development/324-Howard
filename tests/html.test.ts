import { describe, expect, it } from 'vitest';
import { escapeHtml, html, raw, safeImageUrl } from '../src/utils/html';

describe('html template', () => {
  it('escapes interpolated values', () => {
    const title = '<img src=x onerror="alert(1)">';
    expect(html`<h3>${title}</h3>`.value).toBe(
      '<h3>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</h3>',
    );
  });

  it('keeps nested templates and raw() unescaped', () => {
    const inner = html`<b>${'a & b'}</b>`;
    expect(html`<p>${inner}${raw('<i></i>')}</p>`.value).toBe('<p><b>a &amp; b</b><i></i></p>');
  });

  it('joins arrays and drops null/undefined/false', () => {
    expect(html`${['<', html`<br />`]}${null}${undefined}${false}`.value).toBe('&lt;<br />');
  });

  it('escapes quotes so attribute values cannot break out', () => {
    expect(escapeHtml(`" onmouseover='x'`)).toBe('&quot; onmouseover=&#39;x&#39;');
  });
});

describe('safeImageUrl', () => {
  const fallback = 'fallback.svg';
  it('allows http(s) and image data URLs', () => {
    expect(safeImageUrl('https://example.com/a.jpg', fallback)).toBe('https://example.com/a.jpg');
    expect(safeImageUrl('data:image/png;base64,AAAA', fallback)).toBe('data:image/png;base64,AAAA');
  });
  it('rejects scripts and garbage', () => {
    expect(safeImageUrl('javascript:alert(1)', fallback)).toBe(fallback);
    expect(safeImageUrl('not a url', fallback)).toBe(fallback);
    expect(safeImageUrl('data:text/html,<script>', fallback)).toBe(fallback);
  });
});
