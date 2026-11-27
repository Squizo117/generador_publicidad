import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeSvg } from '../src/utils/sanitize-svg.js';

const svgSize = { width: 1024, height: 1536 };
const svgNamespace = 'http://www.w3.org/2000/svg';

test('keeps allowed vector artwork and enforces a responsive viewBox', () => {
  const source = `<svg xmlns="${svgNamespace}" width="10" height="10">
    <defs><linearGradient id="Brand"><stop offset="0%" stop-color="#245c43" /></linearGradient></defs>
    <rect x="10" y="20" width="300" height="400" fill="url(#Brand)" />
    <path d="M10 10 C20 20 30 30 40 40 Z" />
    <text x="20" y="60">Café &amp; pan</text>
  </svg>`;

  const result = sanitizeSvg(source, svgSize);

  assert.match(result, /width="1024" height="1536" viewBox="0 0 1024 1536"/);
  assert.match(result, /fill="url\(#brand\)"/);
  assert.match(result, /d="M10 10 C20 20 30 30 40 40 Z"/);
  assert.match(result, /Café &amp; pan/);
});

test('removes scripts, event handlers, inline CSS, foreign objects, and external references', () => {
  const source = `<svg xmlns="${svgNamespace}">
    <script>alert(1)</script>
    <foreignObject><div>unsafe</div></foreignObject>
    <rect width="100" height="100" fill="url(https://example.com/image.svg)" onclick="alert(1)" style="display:none" />
  </svg>`;

  const result = sanitizeSvg(source, svgSize);

  assert.match(result, /<rect width="100" height="100"><\/rect>/);
  assert.doesNotMatch(result, /script|foreignObject|unsafe|onclick|style=|https:/i);
});

test('rejects malformed or entity-declaring SVG documents', () => {
  assert.throws(
    () => sanitizeSvg(`<svg xmlns="${svgNamespace}"><rect></svg>`, svgSize),
    /mal formado/
  );
  assert.throws(
    () => sanitizeSvg(`<!DOCTYPE svg [<!ENTITY x "x">]><svg xmlns="${svgNamespace}"><rect /></svg>`, svgSize),
    /declaraciones XML no permitidas/
  );
});
