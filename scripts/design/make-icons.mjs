#!/usr/bin/env node
/**
 * Renders the brand icons from one SVG source: a stroked "S" whose caron is a
 * check mark (gold on the brand teal). The same glyph paths are drawn inline
 * by apps/web/src/components/brand-mark.tsx; keep them in sync.
 *
 *   node scripts/design/make-icons.mjs
 *
 * Writes apps/web/public/{icon.svg,icon.png,icon-192.png,icon-maskable.png,
 * apple-touch-icon.png,favicon.ico}, linked from the locale layout's metadata.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(fileURLToPath(import.meta.url), '../../..');
const pub = (name) => resolve(root, 'apps/web/public', name);

export const GLYPH_S =
  'M330 238 C315 212 289 200 258 200 C219 200 192 220 192 252 C192 286 224 296 258 304 C296 312 326 324 326 360 C326 395 297 414 258 414 C223 414 196 401 182 375';
export const GLYPH_CHECK = 'M208 118 L240 148 L306 84';

const DEFS = `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#119a85"/><stop offset="1" stop-color="#04564c"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
<radialGradient id="shine" cx="0.22" cy="0.12" r="0.85"><stop offset="0" stop-color="#fff" stop-opacity="0.24"/><stop offset="0.65" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>`;

/** `rx` 0 = full bleed (the OS rounds maskable / Apple icons); `scale` shrinks the glyph into the maskable safe zone. */
function iconSvg({ rx, scale = 1 }) {
  const t =
    scale === 1
      ? 'translate(0 6)'
      : `translate(256 262) scale(${scale}) translate(-256 -256)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${DEFS}
<rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
<rect width="512" height="512" rx="${rx}" fill="url(#shine)"/>
<g transform="${t}">
<path d="${GLYPH_S}" fill="none" stroke="#fff" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${GLYPH_CHECK}" transform="translate(0 6)" fill="none" stroke="#052e2a" stroke-opacity="0.25" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${GLYPH_CHECK}" fill="none" stroke="url(#gold)" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
</g></svg>
`;
}

const rounded = iconSvg({ rx: 116 });
const bleed = iconSvg({ rx: 0, scale: 0.8 });
writeFileSync(pub('icon.svg'), rounded);

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
writeFileSync(pub('icon.png'), await png(rounded, 512));
writeFileSync(pub('icon-192.png'), await png(rounded, 192));
writeFileSync(pub('icon-maskable.png'), await png(bleed, 512));
writeFileSync(pub('apple-touch-icon.png'), await png(iconSvg({ rx: 0 }), 180));

/** ICO with embedded PNGs (supported by every current browser). */
async function ico(sizes) {
  const images = await Promise.all(sizes.map((s) => png(rounded, s)));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(sizes[i] % 256, e);
    header.writeUInt8(sizes[i] % 256, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(img.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  return Buffer.concat([header, ...images]);
}
writeFileSync(pub('favicon.ico'), await ico([16, 32, 48]));
console.log('icons written');
