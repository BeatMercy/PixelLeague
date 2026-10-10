import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgNamespace = 'http://www.w3.org/2000/svg';

function readAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? null;
}

export async function buildIcons(projectRoot = root) {
  const sourcePath = path.join(projectRoot, 'assets/game-icons.svg');
  const source = await fs.readFile(sourcePath, 'utf8');
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<(?:script|foreignObject|iframe|object|embed|animate|animateTransform|animateMotion|set|discard)\b/i.test(source)
    || /\son[a-z]+\s*=|\b(?:xlink:)?href\s*=\s*(['"])(?!#)[\s\S]*?\1/i.test(source)
    || /javascript\s*:|@import|expression\s*\(|url\(\s*['"]?(?:https?:|data:|\/\/)/i.test(source)) {
    throw new Error('Icon source contains unsupported active or external content.');
  }

  const definitions = source.match(/<defs\b[^>]*>[\s\S]*?<\/defs\s*>/i)?.[0];
  const rootOpen = source.match(/<svg\b([^>]*)>/i);
  const rootClose = source.match(/<\/svg\s*>\s*$/i);
  if (!definitions || !rootOpen || !rootClose) throw new Error(`Invalid SVG source: ${sourcePath}`);

  const symbols = [...source.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol\s*>/gi)].map((match) => ({
    markup: match[0],
    attributes: match[1],
    id: readAttribute(match[1], 'id'),
    viewBox: readAttribute(match[1], 'viewBox'),
  }));
  if (!symbols.length || symbols.some((symbol) =>
    !symbol.id || !/^[A-Za-z_][\w.-]*$/.test(symbol.id) || !symbol.viewBox || !/^[\d.eE+\-\s]+$/.test(symbol.viewBox))) {
    throw new Error('Icon source must contain symbols with id and viewBox attributes.');
  }
  if (new Set(symbols.map((symbol) => symbol.id)).size !== symbols.length) {
    throw new Error('Icon source contains duplicate symbol IDs.');
  }

  const ids = new Set([...source.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map((match) => match[2]));
  if (ids.size !== [...source.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].length) {
    throw new Error('Icon source contains duplicate IDs.');
  }
  const missingReferences = [...source.matchAll(/(?:href|xlink:href)\s*=\s*(["'])#([^"']+)\1/gi)]
    .map((match) => match[2])
    .filter((id) => !ids.has(id));
  if (missingReferences.length) throw new Error(`Icon source has missing references: ${[...new Set(missingReferences)].join(', ')}`);

  const assetsDir = path.join(projectRoot, 'assets/icons');
  await fs.mkdir(assetsDir, { recursive: true });
  for (const symbol of symbols) {
    const svgOpen = `<svg xmlns="${svgNamespace}" width="32" height="32" viewBox="${symbol.viewBox}">`;
    const icon = `${svgOpen}${definitions}${symbol.markup}<use href="#${symbol.id}"/></svg>\n`;
    await fs.writeFile(path.join(assetsDir, `${symbol.id}.svg`), icon);
  }
  const bundle = `<svg xmlns="${svgNamespace}" width="32" height="32" viewBox="0 0 32 32">${definitions}${symbols.map((symbol) => symbol.markup).join('')}</svg>\n`;
  await fs.writeFile(path.join(projectRoot, 'assets/icons.bundle.svg'), bundle);
  return symbols.map(({ id, viewBox }) => ({ id, viewBox }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const icons = await buildIcons();
    console.log(`Exported ${icons.length} standalone SVG icons and assets/icons.bundle.svg.`);
  } catch (error) {
    console.error(`Icon build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
