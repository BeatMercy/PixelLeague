'use strict';

const rootPath = new URL('../../', window.location.href);
const state = { assets: [], filter: 'all', query: '', selected: null, projectRoot: null, previewUrl: null, previewRequest: 0 };
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
};

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
  const icons = [...document.querySelectorAll('symbol[id]')].map((symbol) => ({
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
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<(?:script|foreignObject|iframe|object|embed)\b/i.test(source)) {
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
  ui.validation.textContent = '正在读取 SVG…';
  ui.validation.dataset.state = '';
  try {
    const source = await readProjectText(asset.path);
    const validation = validateSvg(source);
    if (!validation.valid) throw new Error(validation.message);
    ui.source.value = source;
    ui.source.disabled = false;
    ui.replace.disabled = false;
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

function updateIconCollection(collectionSource, iconSource, iconId) {
  const collection = new DOMParser().parseFromString(collectionSource, 'image/svg+xml');
  if (collection.querySelector('parsererror')) throw new Error('图标 SVG 集合格式无效');
  const symbolMarkup = findSymbolMarkup(iconSource, iconId);
  const target = [...collection.querySelectorAll('symbol[id]')].find((item) => item.id === iconId);
  const targetMarkup = target && findSymbolMarkup(collectionSource, iconId);
  if (!symbolMarkup || !targetMarkup) throw new Error(`无法在 SVG 中找到图标 ${iconId}`);
  return collectionSource.replace(targetMarkup, symbolMarkup);
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
