import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spriteSource = await fs.readFile(path.join(root, 'js/sprites.js'), 'utf8');
const definitionSource = await fs.readFile(path.join(root, 'js/sprite_defs.js'), 'utf8');
const sandbox = {};
vm.runInNewContext(`${spriteSource}\n${definitionSource}\nthis.sources = { SPRITE_CFG, drawHumanoid, drawQuad, drawGolem, drawWisp, drawCannon, shade };`, sandbox);

const { SPRITE_CFG, drawHumanoid, drawQuad, drawGolem, drawWisp, drawCannon, shade } = sandbox.sources;
const sizes = {
  h: { w: 32, h: 26, ax: 12, ay: 25, draw: drawHumanoid },
  q: { w: 30, h: 18, ax: 14, ay: 17, draw: drawQuad },
  g: { w: 30, h: 30, ax: 15, ay: 29, draw: drawGolem },
  w: { w: 20, h: 22, ax: 10, ay: 21, draw: drawWisp },
  c: { w: 28, h: 18, ax: 13, ay: 17, draw: drawCannon },
};
const frames = ['idle', 'walk-a', 'walk-b', 'attack'];
const border = '#140c1c';

function recordFrame(width, height, draw, config, frame) {
  const pixels = Array(width * height).fill(null);
  const context = {
    fillStyle: '#000000',
    fillRect(x, y, w, h) {
      for (let py = Math.max(0, Math.floor(y)); py < Math.min(height, Math.ceil(y + h)); py++) {
        for (let px = Math.max(0, Math.floor(x)); px < Math.min(width, Math.ceil(x + w)); px++) {
          pixels[py * width + px] = this.fillStyle;
        }
      }
    },
  };
  draw(context, frame, config);
  return pixels;
}

function rectangles(pixels, width, height, colorAt) {
  const output = [];
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const color = colorAt(x, y);
      if (!color) { x++; continue; }
      const start = x++;
      while (x < width && colorAt(x, y) === color) x++;
      output.push(`<rect x="${start}" y="${y}" width="${x - start}" height="1" fill="${color}"/>`);
    }
  }
  return output.join('');
}

function svgFrame(pixels, width, height, scale) {
  const opaque = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[y * width + x] !== null;
  const outline = (x, y) => opaque(x, y) && (!opaque(x - 1, y) || !opaque(x + 1, y) || !opaque(x, y - 1) || !opaque(x, y + 1));
  const borderPixels = Array.from({ length: width * height }, (_, i) => outline(i % width, Math.floor(i / width)) ? border : null);
  const w = Math.round(width * scale), h = Math.round(height * scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><g transform="scale(${scale})">${rectangles(borderPixels, width, height, (x, y) => borderPixels[y * width + x])}${rectangles(pixels, width, height, (x, y) => pixels[y * width + x])}</g></svg>\n`;
}

const manifest = {};
for (const [id, config] of Object.entries(SPRITE_CFG)) {
  const size = sizes[config.type], scale = config.s || 1;
  const dir = path.join(root, 'assets/character', id);
  await fs.mkdir(dir, { recursive: true });
  const files = {};
  for (let frame = 0; frame < frames.length; frame++) {
    const name = frames[frame], file = `${name}.svg`;
    const pixels = recordFrame(size.w, size.h, size.draw, config, frame);
    await fs.writeFile(path.join(dir, file), svgFrame(pixels, size.w, size.h, scale));
    files[name] = `assets/character/${id}/${file}`;
  }
  await fs.copyFile(path.join(dir, 'idle.svg'), path.join(dir, 'portrait.svg'));
  manifest[id] = {
    ...files,
    portrait: `assets/character/${id}/portrait.svg`,
    width: Math.round(size.w * scale), height: Math.round(size.h * scale),
    ax: Math.round(size.ax * scale), ay: Math.round(size.ay * scale), scale,
  };
}
await fs.writeFile(path.join(root, 'assets/character/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Exported ${Object.keys(manifest).length} characters and ${Object.keys(manifest).length * 5} SVG files.`);