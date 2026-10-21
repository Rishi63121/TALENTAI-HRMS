import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { resolveTheme } from '../src/lib/theme.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// ---- theme default -------------------------------------------------------
test('light is the default when nothing is saved', () => {
  assert.equal(resolveTheme(null), 'light');
  assert.equal(resolveTheme(undefined), 'light');
  assert.equal(resolveTheme(''), 'light');
  assert.equal(resolveTheme('garbage'), 'light');
});

test('a saved choice always wins over the default', () => {
  assert.equal(resolveTheme('dark'), 'dark');
  assert.equal(resolveTheme('light'), 'light');
});

test('the operating-system dark preference no longer forces dark mode', () => {
  for (const file of ['index.html', 'src/context/ThemeContext.jsx', 'src/lib/theme.js']) {
    assert.ok(!/prefers-color-scheme/.test(read(file)), `${file} still reads prefers-color-scheme`);
  }
});

test('the pre-paint script only adds .dark for a saved "dark"', () => {
  const html = read('index.html');
  assert.match(html, /getItem\('talentai-theme'\) === 'dark'/);
});

// ---- dropdown contrast ---------------------------------------------------
const css = read('src/styles/index.css');

function tokens(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
}
const light = tokens(css.match(/:root\s*{([^}]*)}/)[1]);
const dark = tokens(css.match(/\.dark\s*{([^}]*)}/)[1]);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('select options are coloured from the theme tokens', () => {
  assert.match(css, /select option,\s*select optgroup\s*{[^}]*background-color:\s*var\(--popover\)[^}]*color:\s*var\(--popover-foreground\)/s);
  assert.match(css, /select option:checked\s*{[^}]*var\(--accent\)[^}]*var\(--accent-foreground\)/s);
  assert.match(css, /select option:disabled\s*{[^}]*var\(--muted-foreground\)/s);
});

for (const [name, t] of [['light', light], ['dark', dark]]) {
  test(`dropdown text is readable in ${name} mode (WCAG AA, 4.5:1)`, () => {
    assert.ok(contrast(t['popover'], t['popover-foreground']) >= 4.5, 'normal option');
    assert.ok(contrast(t['accent'], t['accent-foreground']) >= 4.5, 'selected / highlighted option');
    assert.ok(contrast(t['popover'], t['muted-foreground']) >= 4.5, 'disabled / placeholder option');
    assert.ok(contrast(t['card'], t['foreground']) >= 4.5, 'closed select box');
  });
}

test('login page no longer shows the copyright line', () => {
  assert.ok(!/all rights reserved/i.test(read('src/components/auth/AuthLayout.jsx')));
});
