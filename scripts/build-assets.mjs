import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildIcons } from './build-icons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read valid JSON at ${file}: ${error.message}`);
  }
}

async function ensureFile(projectRoot, relativePath, label) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)
    || relativePath.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`${label} has an unsafe project path: ${relativePath}`);
  }
  const target = path.resolve(projectRoot, relativePath);
  if (!isWithin(projectRoot, target)) throw new Error(`${label} escapes the project root: ${relativePath}`);
  const stat = await fs.lstat(target).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`${label} is missing or not a regular file: ${relativePath}`);
}

async function rejectSymlinks(target) {
  const entries = await fs.readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(target, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing to package symbolic link: ${child}`);
    if (entry.isDirectory()) await rejectSymlinks(child);
  }
}

export async function buildAssets(projectRoot = root, outputPath = path.join(projectRoot, 'dist')) {
  projectRoot = path.resolve(projectRoot);
  outputPath = path.resolve(outputPath);
  if (outputPath !== path.join(projectRoot, 'dist')) {
    throw new Error('The output directory is fixed at <project-root>/dist.');
  }

  const characterManifestPath = path.join(projectRoot, 'assets/character/manifest.json');
  const catalogPath = path.join(projectRoot, 'design/management/asset-catalog.json');
  const [characters, catalog] = await Promise.all([
    readJson(characterManifestPath),
    readJson(catalogPath),
  ]);
  if (!characters || typeof characters !== 'object' || Array.isArray(characters)) {
    throw new Error('Character manifest must be an object.');
  }
  if (catalog.version !== 1 || !Array.isArray(catalog.assets)) {
    throw new Error('Asset catalog must use version 1 and contain an assets array.');
  }

  for (const [id, frames] of Object.entries(characters)) {
    if (!/^[A-Za-z0-9_-]+$/.test(id) || !frames || typeof frames !== 'object') {
      throw new Error(`Invalid character entry: ${id}`);
    }
    for (const frame of ['idle', 'walk-a', 'walk-b', 'attack', 'portrait']) {
      await ensureFile(projectRoot, frames[frame], `Character ${id} frame ${frame}`);
    }
  }

  for (const asset of catalog.assets) {
    if (!asset || typeof asset.id !== 'string' || !['sound', 'illustration', 'lore'].includes(asset.type)) {
      throw new Error('Asset catalog contains an invalid entry.');
    }
    if (!asset.path || asset.status === 'empty') continue;
    if (/^assets\/(audio|illustrations)\//.test(asset.path)) {
      const extension = path.extname(asset.path).toLowerCase();
      const allowed = asset.type === 'sound'
        ? ['.wav', '.mp3', '.ogg', '.m4a', '.flac', '.webm']
        : asset.type === 'illustration' ? ['.png', '.jpg', '.jpeg', '.webp'] : [];
      if (!allowed.includes(extension)) throw new Error(`Unexpected media file type for ${asset.id}: ${asset.path}`);
    }
    await ensureFile(projectRoot, asset.path, `Catalog asset ${asset.id}`);
  }

  const icons = await buildIcons(projectRoot);
  await ensureFile(projectRoot, 'assets/icons.bundle.svg', 'Icon bundle');
  const requiredFiles = ['index.html', 'icons.html', 'dev-context.html'];
  for (const file of requiredFiles) await ensureFile(projectRoot, file, 'Game entry point');

  const outputStat = await fs.lstat(outputPath).catch(() => null);
  if (outputStat?.isSymbolicLink()) throw new Error('Refusing to replace a symbolic-link output directory.');
  await fs.rm(outputPath, { recursive: true, force: true });
  await fs.mkdir(outputPath, { recursive: true });

  for (const entry of ['assets', 'css', 'js', 'design', 'docs']) {
    const source = path.join(projectRoot, entry);
    await rejectSymlinks(source);
    await fs.cp(source, path.join(outputPath, entry), { recursive: true, force: true });
  }
  for (const entry of await fs.readdir(projectRoot, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:html|md)$/i.test(entry.name)) {
      const source = path.join(projectRoot, entry.name);
      const stat = await fs.lstat(source);
      if (stat.isSymbolicLink()) throw new Error(`Refusing to package symbolic link: ${source}`);
      await fs.copyFile(source, path.join(outputPath, entry.name));
    }
  }

  const packagedAssets = catalog.assets.map(({ file, ...asset }) => ({ ...asset }));
  const manifest = {
    version: 1,
    characters,
    icons,
    catalog: packagedAssets,
  };
  await fs.writeFile(path.join(outputPath, 'asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { outputPath, characterCount: Object.keys(characters).length, iconCount: icons.length, catalogCount: packagedAssets.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await buildAssets();
    console.log(`Packaged ${result.characterCount} characters, ${result.iconCount} icons and ${result.catalogCount} catalog entries in ${result.outputPath}.`);
  } catch (error) {
    console.error(`Asset packaging failed: ${error.message}`);
    process.exitCode = 1;
  }
}
