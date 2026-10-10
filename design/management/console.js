'use strict';

const rootPath = new URL('../../', window.location.href);
const state = { assets: [], filter: 'all', query: '', selected: null, projectRoot: null, previewUrl: null, previewRequest: 0, drawing: false, erasing: false, strokeStart: null, history: [] };
const ui = {
  list: document.querySelector('#assetList'),
  count: document.querySelector('#assetCount'),
  search: document.querySelector('#searchAssets'),
  connect: document.querySelector('#connectProject'),
  connection: document.querySelector('#connectionStatus'),
  name: document.querySelector('#selectedName'),
  path: document.querySelector('#selectedPath'),
  preview: document.querySelector('#assetPreview'),
  emptyPreview: document.querySelector('#emptyPreview'),
  source: document.querySelector('#svgSource'),
  validation: document.querySelector('#validationStatus'),
  dirty: document.querySelector('#dirtyStatus'),
  save: document.querySelector('#saveAsset'),
  saveHelp: document.querySelector('#saveHelp'),
  replace: document.querySelector('#replaceFile'),
  replacePng: document.querySelector('#replacePng'),
  drawIcon: document.querySelector('#drawIcon'),
  drawingPanel: document.querySelector('#drawingPanel'),
  closeDrawing: document.querySelector('#closeDrawing'),
  pixelCanvas: document.querySelector('#pixelCanvas'),
  brushColor: document.querySelector('#brushColor'),
  brushSize: document.querySelector('#brushSize'),
  eraser: document.querySelector('#eraser'),
  undoDrawing: document.querySelector('#undoDrawing'),
  clearDrawing: document.querySelector('#clearDrawing'),
  applyDrawing: document.querySelector('#applyDrawing'),
};
const pixelContext = ui.pixelCanvas.getContext('2d', { willReadFrequently: true });

function setConnection(message, status = '') {
  ui.connection.textContent = message;
  ui.connection.dataset.state = status;
}

function safeAssetPath(path) {
  return typeof path === 'string'
    && path.startsWith('assets/')
    && !path.split('/').some((part) => !part || part === '.' || part === '..')
    && /\.(svg|json)$/i.test(path);
}

async function readFromProject(path) {
  if (!state.projectRoot || !safeAssetPath(path)) throw new Error('无效的素材路径');
  const parts = path.split('/');
  let directory = state.projectRoot;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  const file = await directory.getFileHandle(parts.at(-1));
  return file.getFile();
}

async function readProjectText(path) {
  if (state.projectRoot) return (await readFromProject(path)).text();
  const response = await fetch(new URL(path, rootPath));
  if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
  return response.text();
}

async function loadAssets() {
  const [manifestText, iconsText] = await Promise.all([
    readProjectText('assets/character/manifest.json'),
    readProjectText('assets/game-icons.svg'),
  ]);
  const manifest = JSON.parse(manifestText);
  const characters = Object.entries(manifest).flatMap(([character, frames]) =>
    Object.entries(frames)
      .filter(([frame, path]) => ['idle', 'walk-a', 'walk-b', 'attack', 'portrait'].includes(frame) && safeAssetPath(path))
      .map(([frame, path]) => ({ id: `${character}-${frame}`, name: `${character} · ${frame}`, group: character, type: 'character', frame, path })));
  const document = new DOMParser().parseFromString(iconsText, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('图标集合 SVG 格式无效');
  const icons = [...document.querySelectorAll('symbol[id]')]
    .filter((symbol) => /^[A-Za-z_][\w.-]*$/.test(symbol.id))
    .map((symbol) => ({
    id: symbol.id,
    name: symbol.id,
    group: '图标',
    type: 'icon',
    path: `assets/icons/${symbol.id}.svg`,
  }));
  state.assets = [...characters, ...icons];
  ui.count.textContent = String(state.assets.length);
  renderList();
  if (state.selected) {
    const updated = state.assets.find((asset) => asset.id === state.selected.id);
    if (updated) await selectAsset(updated, false, true);
  }
}

function renderList() {
  const matches = state.assets.filter((asset) => {
    const filterMatch = state.filter === 'all' || asset.type === state.filter;
    const queryMatch = `${asset.name} ${asset.group} ${asset.type}`.toLowerCase().includes(state.query);
    return filterMatch && queryMatch;
  });
  ui.list.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = state.assets.length ? '没有匹配的素材。' : '素材尚未加载。';
    ui.list.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const asset of matches) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'asset-row';
    row.dataset.assetId = asset.id;
    row.setAttribute('aria-current', String(state.selected?.id === asset.id));
    const thumb = document.createElement('span');
    thumb.className = 'asset-thumb';
    const image = document.createElement('img');
    image.src = new URL(asset.path, rootPath);
    image.alt = '';
    image.loading = 'lazy';
    thumb.append(image);
    const label = document.createElement('span');
    label.className = 'asset-label';
    const title = document.createElement('strong');
    title.textContent = asset.name;
    const group = document.createElement('small');
    group.textContent = asset.type === 'character' ? `${asset.group} / ${asset.frame}` : 'SVG 图标';
    label.append(title, group);
    const kind = document.createElement('span');
    kind.className = 'asset-kind';
    kind.textContent = asset.type === 'character' ? '角色' : '图标';
    row.append(thumb, label, kind);
    row.addEventListener('click', () => selectAsset(asset));
    fragment.append(row);
  }
  ui.list.append(fragment);
}

function validateSvg(source) {
  const trimmed = source.trim();
  if (!/^<svg\b/i.test(trimmed.replace(/^<\?xml[^?]*\?>\s*/i, ''))
    || !/<\/svg>\s*$/i.test(trimmed)) {
    return { valid: false, message: '无效的 SVG/XML 格式' };
  }
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<(?:script|foreignObject|iframe|object|embed|animate|animateTransform|animateMotion|set|discard)\b/i.test(source)) {
    return { valid: false, message: '不允许使用脚本、外部实体或嵌入式内容' };
  }
  if (/\son[a-z]+\s*=|\b(?:xlink:)?href\s*=\s*(['"])(?!#)[\s\S]*?\1/i.test(source)) {
    return { valid: false, message: '不允许事件处理属性或外部资源引用' };
  }
  if (/javascript\s*:|@import|expression\s*\(|url\(\s*['"]?(?:https?:|data:|\/\/)/i.test(source)) {
    return { valid: false, message: '不允许脚本或外部资源引用' };
  }
  return { valid: true };
}

function refreshPreview() {
  const request = ++state.previewRequest;
  const result = validateSvg(ui.source.value);
  ui.validation.textContent = result.valid ? '检查 SVG 格式…' : result.message;
  ui.validation.dataset.state = result.valid ? '' : 'error';
  ui.save.disabled = true;
  if (!result.valid) {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
    ui.preview.hidden = true;
    ui.emptyPreview.hidden = false;
    return;
  }
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = URL.createObjectURL(new Blob([ui.source.value], { type: 'image/svg+xml' }));
  ui.preview.src = state.previewUrl;
  ui.preview.hidden = false;
  ui.emptyPreview.hidden = true;
  ui.preview.decode().then(() => {
    if (request !== state.previewRequest) return;
    ui.validation.textContent = 'SVG 格式有效';
    ui.validation.dataset.state = 'valid';
    ui.save.disabled = !state.selected;
  }).catch(() => {
    if (request !== state.previewRequest) return;
    ui.validation.textContent = 'SVG 无法解析或预览';
    ui.validation.dataset.state = 'error';
    ui.preview.hidden = true;
    ui.emptyPreview.hidden = false;
    ui.save.disabled = true;
  });
}

async function selectAsset(asset, updateList = true, force = false) {
  if (!force && state.selected?.id === asset.id) return;
  if (!force && ui.dirty.dataset.dirty === 'true' && state.selected?.id !== asset.id
    && !window.confirm('当前素材有未保存修改，切换后将丢失这些修改。继续吗？')) return;
  state.selected = asset;
  ui.name.textContent = asset.name;
  ui.path.textContent = asset.path;
  ui.source.value = '';
  ui.source.disabled = true;
  ui.save.disabled = true;
  ui.replace.disabled = true;
  ui.replacePng.disabled = true;
  ui.drawIcon.disabled = true;
  ui.drawingPanel.hidden = true;
  ui.validation.textContent = '正在读取 SVG…';
  ui.validation.dataset.state = '';
  try {
    const source = await readProjectText(asset.path);
    const validation = validateSvg(source);
    if (!validation.valid) throw new Error(validation.message);
    ui.source.value = source;
    ui.source.disabled = false;
    ui.replace.disabled = false;
    ui.replacePng.disabled = false;
    ui.drawIcon.disabled = asset.type !== 'icon';
    ui.dirty.textContent = '未修改';
    ui.dirty.dataset.dirty = 'false';
    ui.saveHelp.textContent = asset.type === 'icon'
      ? '连接项目目录后，保存会同步更新图标源集合和游戏 bundle；否则需手动同步生成文件。'
      : '保存后会直接替换游戏读取的素材；建议先在浏览器中验证。';
    refreshPreview();
    if (updateList) renderList();
  } catch (error) {
    ui.validation.textContent = error.message;
    ui.validation.dataset.state = 'error';
    ui.emptyPreview.hidden = false;
    ui.preview.hidden = true;
    setConnection('素材读取失败：请启动本地服务器或连接项目目录', 'error');
  }
}

async function loadDrawingCanvas() {
  const url = URL.createObjectURL(new Blob([ui.source.value], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    pixelContext.clearRect(0, 0, ui.pixelCanvas.width, ui.pixelCanvas.height);
    pixelContext.drawImage(image, 0, 0, ui.pixelCanvas.width, ui.pixelCanvas.height);
    state.history = [];
    ui.undoDrawing.disabled = true;
    ui.eraser.setAttribute('aria-pressed', 'false');
    state.erasing = false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function saveDrawingSnapshot() {
  if (state.history.length >= 40) state.history.shift();
  state.history.push(pixelContext.getImageData(0, 0, ui.pixelCanvas.width, ui.pixelCanvas.height));
  ui.undoDrawing.disabled = false;
}

function paintPixel(x, y) {
  const size = Number(ui.brushSize.value);
  pixelContext.globalCompositeOperation = state.erasing ? 'destination-out' : 'source-over';
  pixelContext.fillStyle = ui.brushColor.value;
  pixelContext.fillRect(x - Math.floor((size - 1) / 2), y - Math.floor((size - 1) / 2), size, size);
  pixelContext.globalCompositeOperation = 'source-over';
}

function drawStrokeTo(x, y) {
  if (!state.strokeStart) {
    paintPixel(x, y);
    state.strokeStart = { x, y };
    return;
  }
  let { x: fromX, y: fromY } = state.strokeStart;
  const dx = Math.abs(x - fromX);
  const dy = Math.abs(y - fromY);
  const stepX = fromX < x ? 1 : -1;
  const stepY = fromY < y ? 1 : -1;
  let error = dx - dy;
  while (fromX !== x || fromY !== y) {
    const doubledError = 2 * error;
    if (doubledError > -dy) { error -= dy; fromX += stepX; }
    if (doubledError < dx) { error += dx; fromY += stepY; }
    paintPixel(fromX, fromY);
  }
  state.strokeStart = { x, y };
}

function pointerPixel(event) {
  const rect = ui.pixelCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(31, Math.floor((event.clientX - rect.left) * 32 / rect.width))),
    y: Math.max(0, Math.min(31, Math.floor((event.clientY - rect.top) * 32 / rect.height))),
  };
}

function rasterToSvg(imageData, width, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const offset = (y * width + x) * 4;
      const red = imageData.data[offset];
      const green = imageData.data[offset + 1];
      const blue = imageData.data[offset + 2];
      const alpha = imageData.data[offset + 3];
      if (!alpha) { x++; continue; }
      let run = 1;
      while (x + run < width) {
        const next = (y * width + x + run) * 4;
        if (imageData.data[next] !== red || imageData.data[next + 1] !== green
          || imageData.data[next + 2] !== blue || imageData.data[next + 3] !== alpha) break;
        run++;
      }
      const color = `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
      const opacity = alpha === 255 ? '' : ` fill-opacity="${alpha / 255}"`;
      rows.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${color}"${opacity}/>`);
      x += run;
    }
  }
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rows.join('')}</svg>\n`;
  if (source.length > 2 * 1024 * 1024) throw new Error('转换后的 SVG 超过 2 MiB，请缩小图片或简化颜色。');
  return source;
}

async function replaceWithPng(file) {
  if (!file || !state.selected) return;
  if (file.size > 2 * 1024 * 1024) throw new Error('PNG 文件过大（上限 2 MiB）。');
  if (file.type && file.type !== 'image/png') throw new Error('请选择 PNG 图片。');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => bytes[index] === byte)) throw new Error('文件内容不是有效的 PNG 图片。');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width > 256 || bitmap.height > 256 || bitmap.width * bitmap.height > 32768) {
      throw new Error('PNG 最大尺寸为 256 × 256，且总像素不超过 32,768。');
    }
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    ui.source.value = rasterToSvg(context.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
    ui.dirty.textContent = 'PNG 已转换，尚未保存';
    ui.dirty.dataset.dirty = 'true';
    refreshPreview();
    setConnection(`PNG 已转换为透明像素 SVG：${bitmap.width} × ${bitmap.height}`, '');
  } finally {
    bitmap.close();
  }
}

async function connectProject() {
  if (!window.showDirectoryPicker) {
    setConnection('此浏览器不支持目录访问；请下载文件或使用支持 File System Access API 的浏览器。', 'error');
    return;
  }
  const discardChanges = ui.dirty.dataset.dirty === 'true';
  if (discardChanges
    && !window.confirm('当前素材有未保存修改，连接项目目录会重新载入素材并丢失这些修改。继续吗？')) return;
  try {
    const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
    const assets = await directory.getDirectoryHandle('assets');
    await assets.getDirectoryHandle('character');
    if (discardChanges) ui.dirty.dataset.dirty = 'false';
    state.projectRoot = directory;
    await loadAssets();
    setConnection(`已连接：${directory.name}`, 'connected');
    ui.saveHelp.textContent = '保存会写入已授权项目目录中的原素材文件。';
  } catch (error) {
    if (error.name !== 'AbortError') setConnection(`连接失败：${error.message}`, 'error');
  }
}

async function writeProjectText(path, contents) {
  if (!state.projectRoot || !safeAssetPath(path)) throw new Error('没有可写的项目目录');
  const parts = path.split('/');
  let directory = state.projectRoot;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  const handle = await directory.getFileHandle(parts.at(-1), { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(contents);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
}

function findSymbolMarkup(source, iconId) {
  const escapedId = iconId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`<symbol\\b(?=[^>]*\\bid=(["'])${escapedId}\\1)[^>]*>[\\s\\S]*?<\\/symbol\\s*>`, 'i'));
  return match?.[0] || null;
}

function tagEnd(source, start) {
  let quote = '';
  for (let index = start; index < source.length; index++) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function elementEnd(source, start) {
  const openingEnd = tagEnd(source, start);
  if (openingEnd < 0) return -1;
  const opening = source.slice(start, openingEnd + 1);
  const name = opening.match(/^<([\w:.-]+)/)?.[1];
  if (!name) return -1;
  if (/\/\s*>$/.test(opening)) return openingEnd;
  let depth = 1;
  let cursor = openingEnd + 1;
  while (depth && cursor < source.length) {
    const next = source.indexOf('<', cursor);
    if (next < 0) return -1;
    if (source.startsWith('<!--', next)) {
      const commentEnd = source.indexOf('-->', next + 4);
      if (commentEnd < 0) return -1;
      cursor = commentEnd + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', next)) {
      const cdataEnd = source.indexOf(']]>', next + 9);
      if (cdataEnd < 0) return -1;
      cursor = cdataEnd + 3;
      continue;
    }
    const end = tagEnd(source, next);
    if (end < 0) return -1;
    const token = source.slice(next, end + 1);
    const tokenName = token.match(/^<\/?([\w:.-]+)/)?.[1];
    if (tokenName === name) {
      if (/^<\//.test(token)) depth--;
      else if (!/\/\s*>$/.test(token)) depth++;
    }
    cursor = end + 1;
  }
  return depth ? -1 : cursor - 1;
}

function topLevelElements(source) {
  const elements = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;
    if (source.startsWith('<!--', start)) {
      const end = source.indexOf('-->', start + 4);
      if (end < 0) break;
      cursor = end + 3;
      continue;
    }
    if (source[start + 1] === '/' || source[start + 1] === '!' || source[start + 1] === '?') {
      const end = tagEnd(source, start);
      if (end < 0) break;
      cursor = end + 1;
      continue;
    }
    const end = elementEnd(source, start);
    if (end < 0) break;
    elements.push(source.slice(start, end + 1));
    cursor = end + 1;
  }
  return elements;
}

function iconSymbolMarkup(source, iconId) {
  const existingSymbol = findSymbolMarkup(source, iconId);
  if (existingSymbol) return { symbol: existingSymbol, definitions: [] };
  const opening = source.match(/<svg\b([^>]*)>/i);
  const closing = source.match(/<\/svg\s*>\s*$/i);
  if (!opening || !closing) throw new Error(`无法从替换文件读取 SVG 图标 ${iconId}`);
  const rootStart = opening.index + opening[0].length;
  const inner = source.slice(rootStart, closing.index);
  const viewBox = opening[1].match(/\bviewBox\s*=\s*(["'])(.*?)\1/i)?.[2];
  const safeViewBox = viewBox && /^[\d.eE+\-\s]+$/.test(viewBox) ? viewBox : '0 0 32 32';
  const definitionsBlock = inner.match(/<defs\b[^>]*>([\s\S]*?)<\/defs\s*>/i)?.[1] || '';
  const contents = inner.replace(/<defs\b[^>]*>[\s\S]*?<\/defs\s*>/i, '');
  const definitions = topLevelElements(definitionsBlock).filter((definition) => /\bid\s*=\s*(["']).+?\1/i.test(definition));
  return { symbol: `<symbol id="${iconId}" viewBox="${safeViewBox}">${contents}</symbol>`, definitions };
}

function updateIconCollection(collectionSource, iconSource, iconId) {
  const collection = new DOMParser().parseFromString(collectionSource, 'image/svg+xml');
  if (collection.querySelector('parsererror')) throw new Error('图标 SVG 集合格式无效');
  const replacement = iconSymbolMarkup(iconSource, iconId);
  const target = [...collection.querySelectorAll('symbol[id]')].find((item) => item.id === iconId);
  const targetMarkup = target && findSymbolMarkup(collectionSource, iconId);
  if (!targetMarkup) throw new Error(`无法在 SVG 中找到图标 ${iconId}`);
  let updated = collectionSource;
  if (replacement.definitions.length) {
    const existingIds = new Set([...collection.querySelectorAll('defs [id]')].map((item) => item.id));
    const additions = replacement.definitions.filter((definition) => {
      const id = definition.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
      if (!id || existingIds.has(id)) return false;
      existingIds.add(id);
      return true;
    });
    if (additions.length) updated = updated.replace(/<\/defs\s*>/i, `${additions.join('')}</defs>`);
  }
  return updated.replace(targetMarkup, replacement.symbol);
}

function downloadAsset() {
  const blob = new Blob([ui.source.value], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = state.selected.path.split('/').at(-1);
  link.click();
  URL.revokeObjectURL(link.href);
  setConnection(`已下载 ${link.download}；请手动替换 ${state.selected.path}`, '');
}

async function saveAsset() {
  if (!state.selected || !validateSvg(ui.source.value).valid) return;
  if (!state.projectRoot) {
    downloadAsset();
    return;
  }
  try {
    const outputs = [{ path: state.selected.path, contents: ui.source.value }];
    if (state.selected.type === 'icon') {
      const [sourceCollection, bundle] = await Promise.all([
        readProjectText('assets/game-icons.svg'),
        readProjectText('assets/icons.bundle.svg'),
      ]);
      outputs.push(
        { path: 'assets/game-icons.svg', contents: updateIconCollection(sourceCollection, ui.source.value, state.selected.id) },
        { path: 'assets/icons.bundle.svg', contents: updateIconCollection(bundle, ui.source.value, state.selected.id) },
      );
    }
    for (const output of outputs) await writeProjectText(output.path, output.contents);
    state.selected.lastSaved = ui.source.value;
    ui.dirty.textContent = '已保存';
    ui.dirty.dataset.dirty = 'false';
    setConnection(state.selected.type === 'icon'
      ? `已保存图标及其源集合与 bundle：${state.selected.id}`
      : `已保存：${state.selected.path}`, 'connected');
    renderList();
  } catch (error) {
    setConnection(`保存失败：${error.message}`, 'error');
  }
}

ui.search.addEventListener('input', () => {
  state.query = ui.search.value.trim().toLowerCase();
  renderList();
});
document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    renderList();
  });
});
ui.connect.addEventListener('click', connectProject);
ui.source.addEventListener('input', () => {
  ui.dirty.textContent = '有未保存修改';
  ui.dirty.dataset.dirty = 'true';
  refreshPreview();
});
ui.replace.addEventListener('change', async () => {
  const file = ui.replace.files?.[0];
  ui.replace.value = '';
  if (!file || !state.selected) return;
  if (file.size > 2 * 1024 * 1024) {
    setConnection('SVG 文件过大（上限 2 MiB）。', 'error');
    return;
  }
  const source = await file.text();
  const validation = validateSvg(source);
  if (!validation.valid) {
    setConnection(`替换失败：${validation.message}`, 'error');
    return;
  }
  ui.source.value = source;
  ui.dirty.textContent = '有未保存修改';
  ui.dirty.dataset.dirty = 'true';
  refreshPreview();
});
ui.replacePng.addEventListener('change', async () => {
  const file = ui.replacePng.files?.[0];
  ui.replacePng.value = '';
  try {
    await replaceWithPng(file);
  } catch (error) {
    setConnection(`PNG 转换失败：${error.message}`, 'error');
  }
});
ui.drawIcon.addEventListener('click', async () => {
  if (state.selected?.type !== 'icon') return;
  ui.drawingPanel.hidden = false;
  try {
    await loadDrawingCanvas();
    ui.pixelCanvas.focus();
  } catch {
    setConnection('无法载入当前图标到画板。', 'error');
    ui.drawingPanel.hidden = true;
  }
});
ui.closeDrawing.addEventListener('click', () => {
  ui.drawingPanel.hidden = true;
  state.strokeStart = null;
});
ui.pixelCanvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  saveDrawingSnapshot();
  state.drawing = true;
  ui.pixelCanvas.setPointerCapture(event.pointerId);
  const point = pointerPixel(event);
  state.strokeStart = null;
  drawStrokeTo(point.x, point.y);
});
ui.pixelCanvas.addEventListener('pointermove', (event) => {
  if (!state.drawing) return;
  const point = pointerPixel(event);
  drawStrokeTo(point.x, point.y);
});
function finishDrawingStroke() {
  state.drawing = false;
  state.strokeStart = null;
}
ui.pixelCanvas.addEventListener('pointerup', finishDrawingStroke);
ui.pixelCanvas.addEventListener('pointercancel', finishDrawingStroke);
ui.eraser.addEventListener('click', () => {
  state.erasing = !state.erasing;
  ui.eraser.setAttribute('aria-pressed', String(state.erasing));
});
ui.undoDrawing.addEventListener('click', () => {
  const previous = state.history.pop();
  if (!previous) return;
  pixelContext.putImageData(previous, 0, 0);
  ui.undoDrawing.disabled = state.history.length === 0;
});
ui.clearDrawing.addEventListener('click', () => {
  saveDrawingSnapshot();
  pixelContext.clearRect(0, 0, ui.pixelCanvas.width, ui.pixelCanvas.height);
});
ui.applyDrawing.addEventListener('click', () => {
  if (state.selected?.type !== 'icon') return;
  ui.source.value = rasterToSvg(pixelContext.getImageData(0, 0, 32, 32), 32, 32);
  ui.dirty.textContent = '画板内容未保存';
  ui.dirty.dataset.dirty = 'true';
  ui.drawingPanel.hidden = true;
  refreshPreview();
});
ui.save.addEventListener('click', saveAsset);
window.addEventListener('beforeunload', (event) => {
  if (ui.dirty.dataset.dirty === 'true') {
    event.preventDefault();
    event.returnValue = '';
  }
});

loadAssets()
  .then(() => setConnection('素材已加载；连接项目目录可直接保存。'))
  .catch((error) => setConnection(`素材加载失败：${error.message}`, 'error'));
