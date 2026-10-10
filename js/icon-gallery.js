'use strict';
const SVG_SHEET = 'assets/icons.bundle.svg';
const SVG_FILES = 'assets/icons';
const GROUPS = [
  ['hero', '英雄', ['游侠', '决斗家', '守卫', '术士', '刺客', '圣骑士', '德鲁伊', '狂战士', '牧师', '死灵法师', '驯兽师', '枪骑兵', '工程师', '龙骑士', '暗影法师']],
  ['weapon', '武器', ['长剑', '巨剑', '匕首', '双匕首', '猎弓', '弩', '长矛', '战斧', '战锤', '法杖', '魔杖', '镰刀', '三叉戟', '钉头锤', '魔法典籍']],
  ['armor', '护甲', ['铁盔', '鹿角头盔', '游侠兜帽', '胸甲', '锁子甲', '皮甲', '护手', '护胫', '行者之靴', '旅行斗篷', '圆盾', '塔盾', '日冕', '印戒', '月光护符']],
  ['potion', '药剂', ['生命药水', '法力药水', '耐力药水', '毒药', '解毒剂', '再生药剂', '隐形药剂', '抗火药水', '抗寒药水', '力量药剂', '幸运药水', '凤凰药剂']],
  ['magic', '魔法', ['火球', '寒霜符文', '雷电', '奥术法球', '圣光', '暗影印记', '自然绽放', '疾风', '大地符文', '血契', '屏障', '传送门', '星陨', '连锁闪电', '治愈之手', '诅咒']],
  ['monster', '怪物', ['暗沼之狼', '裂背野猪', '洞穴蝙蝠', '森林史莱姆', '骷髅', '迷失灵体', '禁魔石魔像', '洞穴蜘蛛', '怨灵', '强盗', '幼龙', '宝箱怪', '监视之眼', '巨蛇', '恶魔', '巫妖']],
  ['resource', '资源', ['金币袋', '切割宝石', '红宝石', '蓝宝石', '绿宝石', '法力水晶', '铁矿石', '心木', '月光草', '蘑菇', '狮鹫羽毛', '骨头', '禁魔石', '碎片', '宝箱', '锈钥匙']],
  ['ui', '界面', ['生命', '空心生命', '护盾', '法力', '经验', '金币', '世界地图', '罗盘', '准星', '骷髅标记', '胜利奖杯', '王冠', '背包', '任务卷轴', '沙漏', '营火', '设置', '开始游戏', '帮助']],
];
const ICONS = GROUPS.flatMap(([category, label, names]) => names.map((name, index) => ({
  category,
  name,
  id: `${category}-${({ hero: 'ranger,duelist,guardian,arcanist,assassin,paladin,druid,berserker,cleric,necromancer,beastmaster,lancer,engineer,dragon-knight,shadow-mage', weapon: 'long-sword,greatsword,dagger,twin-daggers,hunter-bow,crossbow,spear,battleaxe,warhammer,mage-staff,wand,scythe,trident,mace,enchanted-tome', armor: 'iron-helm,antler-helm,ranger-hood,chestplate,chainmail,leather-vest,gauntlet,greaves,trail-boots,travel-cloak,buckler,tower-shield,sun-crown,signet-ring,moon-amulet', potion: 'health,mana,stamina,poison,antidote,regeneration,invisibility,fire-resist,frost-resist,strength,luck,phoenix', magic: 'fireball,frost-rune,thunderbolt,arcane-orb,holy-light,shadow-mark,nature-bloom,gust,earth-rune,blood-pact,barrier,portal,starfall,chain-lightning,healing-hand,curse', monster: 'murk-wolf,razorback,cave-bat,forest-slime,skeleton,lost-wisp,petricite-golem,cave-spider,wraith,bandit,drake,mimic,watch-eye,serpent,demon,lich', resource: 'gold-pouch,cut-gem,ruby,sapphire,emerald,mana-crystal,iron-ore,heartwood,moon-herb,mushroom,griffin-feather,bone,petricite,shard,treasure-chest,rusted-key', ui: 'heart,empty-heart,guard,mana-drop,xp-star,gold-coin,world-map,compass,crosshair,skull-mark,victory-cup,crown,inventory-bag,quest-scroll,timer,campfire,settings,play,help' })[category].split(',')[index]}`,
  label,
})));
const grid = document.getElementById('icon-grid');
const search = document.getElementById('search');
const count = document.getElementById('results-count');
const empty = document.getElementById('empty-state');
const more = document.getElementById('load-more');
const colorPicker = document.getElementById('icon-color');
const sizeSlider = document.getElementById('icon-size');
const PAGE_SIZE = 48;
let activeCategory = 'all';
let shown = PAGE_SIZE;
let toastTimer;
function filteredIcons() {
  const query = search.value.trim().toLocaleLowerCase();
  return ICONS.filter(icon => (activeCategory === 'all' || icon.category === activeCategory)
    && (!query || `${icon.id} ${icon.name} ${icon.category}`.toLocaleLowerCase().includes(query)));
}
function iconMarkup(icon, index) {
  const card = document.createElement('button');
  card.className = 'icon-card';
  card.type = 'button';
  card.style.setProperty('--i', index % PAGE_SIZE);
  card.title = `${icon.name} / ${icon.id} · 点击复制 SVG`;
  card.setAttribute('aria-label', `复制${icon.name}图标 ${icon.id}`);
  const preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  preview.setAttribute('viewBox', '0 0 32 32');
  preview.setAttribute('aria-hidden', 'true');
  preview.classList.add('icon-preview');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `${SVG_FILES}/${icon.id}.svg#${icon.id}`);
  preview.append(use);
  const label = document.createElement('span');
  label.className = 'icon-id';
  label.textContent = `${icon.name} · ${icon.id}`;
  card.append(preview, label);
  card.addEventListener('click', () => copyIcon(icon));
  return card;
}
function render() {
  const icons = filteredIcons();
  const visible = icons.slice(0, shown);
  grid.replaceChildren(...visible.map(iconMarkup));
  count.textContent = String(icons.length);
  document.getElementById('icon-count').textContent = String(ICONS.length);
  empty.hidden = icons.length > 0;
  more.hidden = visible.length >= icons.length;
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}
async function copyIcon(icon) {
  const snippet = `<svg viewBox="0 0 32 32" role="img" aria-label="${icon.name}"><use href="${SVG_SHEET}#${icon.id}"></use></svg>`;
  try {
    await navigator.clipboard.writeText(snippet);
    showToast(`已复制 ${icon.id} 的 SVG 引用`);
  } catch {
    const field = document.createElement('textarea');
    field.value = snippet;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    showToast(copied ? `已复制 ${icon.id} 的 SVG 引用` : `图标 ID：${icon.id}`);
  }
}
document.getElementById('filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  shown = PAGE_SIZE;
  document.querySelector('.filter.active').classList.remove('active');
  button.classList.add('active');
  render();
});
search.addEventListener('input', () => { shown = PAGE_SIZE; render(); });
more.addEventListener('click', () => { shown += PAGE_SIZE; render(); });
colorPicker.addEventListener('input', () => {
  document.documentElement.style.setProperty('--icon-color', colorPicker.value);
  document.querySelectorAll('.icon-preview').forEach(icon => { icon.style.color = colorPicker.value; });
  document.querySelector('.specimen-icon').style.color = colorPicker.value;
});
sizeSlider.addEventListener('input', () => document.documentElement.style.setProperty('--icon-size', `${sizeSlider.value}px`));
document.getElementById('background-toggle').addEventListener('click', event => {
  const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
  document.querySelectorAll('.icon-card').forEach(card => card.classList.toggle('checker', enabled));
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== search) { event.preventDefault(); search.focus(); }
  if (event.key === 'Escape' && document.activeElement === search) { search.value = ''; search.blur(); render(); }
});
render();