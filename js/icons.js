'use strict';
const ICONS_BUNDLE = 'assets/icons.bundle.svg';
const ICON_SYMBOL_BY_EMOJI = {
  '🗡️': 'weapon-dagger', '⛏️': 'weapon-warhammer', '🔪': 'weapon-dagger', '🧣': 'armor-travel-cloak',
  '🩸': 'magic-blood-pact', '📘': 'weapon-enchanted-tome', '🥋': 'armor-chainmail', '🦺': 'armor-chestplate',
  '💎': 'resource-cut-gem', '🎗️': 'armor-moon-amulet', '🧥': 'armor-leather-vest', '👢': 'armor-trail-boots',
  '✨': 'magic-holy-light', '📿': 'armor-moon-amulet', '🔷': 'resource-sapphire', '⚔️': 'weapon-long-sword',
  '☀️': 'magic-holy-light', '🌵': 'resource-heartwood', '👼': 'hero-cleric', '🎩': 'armor-sun-crown',
  '🦑': 'monster-drake', '🔱': 'weapon-trident', '❤️': 'ui-heart', '⚡': 'magic-thunderbolt', '🔥': 'magic-fireball',
  '🏆': 'ui-victory-cup', '📕': 'weapon-enchanted-tome', '🏹': 'weapon-hunter-bow', '💢': 'magic-thunderbolt',
  '💗': 'ui-heart', '🛡️': 'armor-tower-shield', '🏰': 'armor-tower-shield', '🎯': 'ui-crosshair',
  '👟': 'armor-trail-boots', '🔹': 'resource-sapphire', '🌀': 'magic-gust', '🦇': 'monster-cave-bat',
  '🍃': 'resource-moon-herb', '💰': 'ui-gold-coin', '📜': 'ui-quest-scroll', '👑': 'ui-crown',
  '🗿': 'monster-petricite-golem', '🪓': 'weapon-battleaxe', '🦁': 'hero-berserker', '💀': 'monster-skeleton',
  '💨': 'magic-gust', '🎲': 'resource-shard', '⛲': 'magic-healing-hand', '★': 'magic-holy-light',
  '🌟': 'magic-holy-light', '❄️': 'magic-frost-rune', '🔰': 'armor-buckler', '☄️': 'magic-starfall',
  '🌩️': 'magic-chain-lightning', '💚': 'ui-heart', '⚖️': 'armor-gauntlet', '🪤': 'monster-cave-spider',
  '🕸️': 'monster-cave-spider', '💥': 'magic-starfall', '🍀': 'resource-moon-herb', '🏃': 'hero-ranger',
  '🔫': 'weapon-crossbow', '🦅': 'hero-ranger', '👁️': 'monster-watch-eye', '🪽': 'hero-dragon-knight',
  '🌅': 'magic-starfall', '🌪️': 'magic-gust', '🤺': 'hero-duelist', '⏱': 'ui-timer',
  '🔮': 'magic-arcane-orb', '🧿': 'monster-watch-eye', '✴️': 'magic-frost-rune', '💖': 'ui-heart',
  '☠️': 'monster-skeleton', '⚙': 'ui-settings', '▶': 'ui-play', '❔': 'ui-help',
};
function iconMarkup(icon, className = '') {
  const id = ICON_SYMBOL_BY_EMOJI[icon];
  if (!id) return icon;
  return `<svg class='game-icon ${className}' viewBox='0 0 32 32' aria-hidden='true'><use href='${ICONS_BUNDLE}#${id}'></use></svg>`;
}