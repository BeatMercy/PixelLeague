'use strict';
// ---------- Lightweight English / Simplified Chinese localization ----------
const I18N = (() => {
  const STORAGE_KEY = 'pixelLeague.locale.v1';
  const hintSource = document.getElementById('hint')?.innerHTML || '';
  let locale = 'en';
  let onChange = null;
  const zh = {
    'Right-click: move / attack': '右键：移动 / 攻击', 'Q W E R: skills': 'Q W E R：技能',
    'Shift+Q/W/E/R: level skill': 'Shift+Q/W/E/R：升级技能', 'D: Flash': 'D：闪现', 'F: Heal': 'F：治疗',
    'A+Click: attack-move': 'A+点击：攻击移动', 'S: stop': 'S：停止', 'Space: center': '空格：镜头居中',
    'Y: camera lock': 'Y：镜头锁定', 'Esc: pause': 'Esc：暂停',
    'New Run': '开始冒险', 'Armory': '军械库', 'How to Play': '游戏说明', 'Back': '返回',
    'Choose your Champion': '选择英雄', 'Health': '生命', 'Attack': '攻击', 'Range': '射程', 'Speed': '速度',
    'Bonus Skill': '额外技能', 'Champion': '英雄', 'Common': '普通', 'Rare': '稀有', 'Epic': '史诗', 'Legendary': '传说',
    'Choose a Talent': '选择天赋', 'picks pending': '次待选择', 'skill point': '技能点', 'skill points': '技能点',
    'to spend (Shift+Q/W/E/R)': '可用（Shift+Q/W/E/R）', 'Reroll': '重抽', 'Reroll shop': '刷新商店',
    'Seek Wisdom': '求取智慧', 'Continue': '继续', 'Paused': '已暂停', 'Resume [Esc]': '继续 [Esc]',
    'Abandon Run': '放弃本局', 'Demacia Stands!': '德玛西亚屹立不倒！', 'Defeated': '战败',
    'All champions of the outskirts have fallen.': '郊野的所有冠军都已倒下。', 'Level': '等级', 'Time': '时间',
    'Kills': '击杀', 'Champions slain': '击败的冠军', 'Gold': '金币', 'Petricite Shards earned': '获得的禁魔石碎片',
    'Play Again': '再来一局', 'Title': '返回主菜单', 'The Armory': '军械库',
    'Spend Petricite Shards on permanent upgrades. You have': '使用禁魔石碎片购买永久强化。当前拥有',
    'MAX': '已满级', 'at rank 1': '（1 级效果）', 'Runs': '冒险次数', 'Victories': '胜利次数', 'Best stage': '最远区域',
    'shards': '碎片', 'SOLD': '已售出', 'You rest by the fire. Health and mana restored. Gold:': '你在篝火旁休整，生命与法力已恢复。金币：',
    'Inventory full — right-click an item below to sell it.': '背包已满，右键点击下方物品出售。', 'Click to sell': '点击出售',
    'Right-click: sell · Shift+click: drop': '右键：出售 · Shift+点击：丢弃', 'foes': '名敌人', 'Champion fight!': '冠军战！',
    'Enter the portal': '进入传送门', 'ENRAGED': '狂暴', 'Manaless': '无消耗', 'Passive': '被动', 'Rank': '等级',
    'Cooldown': '冷却', 'Cost': '消耗', 'mana': '法力', 'or click + to rank up': '或点击 + 升级',
    'Next rank at level': '下一级需要等级', 'Camera locked': '镜头已锁定', 'Camera free': '镜头已解锁',
    'Inventory full (right-click item to sell)': '背包已满（右键物品出售）', 'No target': '没有目标',
    'Not learned': '尚未学习', 'No mana': '法力不足', 'PARRY': '格挡', 'MISS': '未命中', 'REVIVED': '复活',
    'Stop': '停止', 'Pause': '暂停', 'S': '停止', 'Esc': '暂停', 'Space': '空格',
    'A + Left-click': 'A + 鼠标左键', 'Shift + Q/W/E/R': 'Shift + Q/W/E/R', 'D / F': 'D / F', 'Space / Y': '空格 / Y',
    'Champion Defeated!': '冠军已击败！', 'Step into the light to claim victory': '踏入光芒，赢得最终胜利',
    'Collect your loot, then enter the portal': '拾取战利品，然后进入传送门',
    'A champion of the outskirts appears!': '郊野冠军现身！',
    'The Silverfield Outskirts': '银原郊野', 'Pixel League: Silverfield Outskirts': 'Pixel League：银原郊野',
    'Farmlands': '农田', 'Village Outskirts': '村庄郊外',
    'Whispering Woods': '低语森林', 'Petricite Ruins': '禁魔石遗迹', 'Castle Gates': '城堡大门',
    'Kestrel': '凯斯特尔', 'Wings of the Dawnguard': '黎明卫队之翼', 'Marksman · Ranged': '射手 · 远程',
    'Vela': '维拉', 'the Silver Duelist': '银刃决斗家', 'Duelist · Melee': '决斗家 · 近战',
    'Miss Fortune': '好运姐', 'Bounty Hunter': '赏金猎人', 'Gunslinger · Ranged': '枪手 · 远程',
    'Caitlyn': '凯特琳', 'Sheriff of Piltover': '皮城女警', 'Sniper · Ranged': '狙击手 · 远程',
    'Aldric': '奥德里克', 'the Might of the Realm': '王国之力', 'Juggernaut · Melee': '重装战士 · 近战',
    'Harrier': '猎鹰', "Duelist's Dance": '决斗之舞', 'Perseverance': '坚忍', 'Lucky Break': '好运当头',
    'Your first attack against each enemy every 4s deals bonus physical damage.': '每 4 秒，你对每名敌人的首次攻击会造成额外物理伤害。',
    'Deadeye Ricochet': '弹跳射击', 'Strut': '疾行', 'Bullet Rain': '铅弹风暴', 'Full Salvo': '全弹齐射',
    'Headshot': '爆头', 'Piltover Peacemaker': '和平使者', 'Yordle Snap Trap': '约德尔诱捕器',
    '90 Caliber Net': '90口径绳网', 'Ace in the Hole': '让子弹飞', 'Longshot': '超远射程',
    'Lethal Tempo': '致命节奏', 'Quickdraw': '快速拔枪',
    'Blinding Assault': '致盲突袭', 'Heightened Senses': '敏锐感官', 'Vault': '跃击', 'Skystrike': '天际突袭',
    'Lunge': '突进', 'Riposte': '回击', 'Bladework': '剑刃技艺', 'Grand Challenge': '终极挑战',
    'Decisive Strike': '致命打击', 'Courage': '勇气', 'Judgment': '审判', 'Demacian Justice': '德玛西亚正义',
    'Spinning Blades': '旋转刀刃', 'Holy Smite': '圣光惩击', 'Frost Nova': '寒霜新星', 'Phantom Daggers': '幻影飞刃',
    'Searing Aura': '灼热光环', 'Bulwark': '壁垒', 'Meteor': '陨石', 'Storm Call': '风暴呼唤',
    'Attack Damage': '攻击力', 'Ability Power': '法术强度', 'Armor': '护甲', 'Magic Resist': '魔法抗性',
    'Attack Speed': '攻击速度', 'Move Speed': '移动速度', 'Crit Chance': '暴击率', 'Life Steal': '生命偷取',
    'Ability Haste': '技能急速', 'HP Regen': '生命回复', 'Damage': '伤害', 'Damage Reduction': '伤害减免',
    'Gold Gain': '金币获取', 'XP Gain': '经验获取', 'Dmg vs Elites/Bosses': '对精英/首领伤害',
    'Pickup Radius': '拾取范围', 'Spell Vamp': '法术吸血',
    'Foes slain': '击杀敌人', 'Stages reached': '抵达区域', 'Champions': '冠军', 'Level reached': '达到等级', 'Victory': '胜利',
    'Might of Demacia': '德玛西亚之力', 'Vigor': '活力', 'Petricite Guard': '禁魔石守护', 'Swiftness': '迅捷',
    'Focus': '专注', 'Greed': '贪欲', 'Wisdom': '智慧', 'Fortune': '幸运', 'Foresight': '先见',
    'Bandit Thug': '强盗打手', 'Bandit Archer': '强盗弓手', 'Razorback': '裂背野猪', 'Hedge Mage': '荒野法师',
    'Siege Cart': '攻城车', 'Murk Wolf': '暗沼之狼', 'Lost Wisp': '迷失灵体', 'Fallen Knight': '堕落骑士',
    'Petricite Golem': '禁魔石魔像', 'Rourke, Bandit King': '强盗之王鲁克', 'Varn the Hexcaller': '咒术师瓦恩',
    'Fenrok, Alpha of the Murk': '暗沼狼王芬洛克', 'The Ancient Colossus': '远古巨像',
    'Sir Malrec, the Fallen Champion': '堕落冠军马尔雷克爵士',
    'Long Sword': '长剑', 'Heavy Pickaxe': '重型镐', 'Swift Dagger': '迅捷匕首', 'Agility Cloak': '敏捷斗篷',
    'Vampiric Rod': '吸血魔杖', 'Amplifying Tome': '增幅典籍', 'Cloth Armor': '布甲', 'Chain Vest': '锁子甲',
    'Ruby Crystal': '红水晶', "Giant's Belt": '巨人腰带', 'Null Mantle': '负极斗篷', 'Swift Boots': '轻灵之靴',
    'Glowing Mote': '辉光微粒', 'Rejuv Bead': '复苏坠饰', 'Sapphire Shard': '蓝宝石碎片',
    'Endless Edge': '无尽之刃', 'Sunflare Aegis': '日炎圣盾', 'Thornplate': '荆棘甲', "Guardian's Grace": '守护天使',
    'Ruinblade': '破败之刃', 'Archmage Crown': '大法师之帽', 'Krakenfang': '海妖之牙', 'Tri-Edge': '三相之刃',
    "Titan's Heart": '泰坦之心', 'Static Shiv': '斯塔缇克电刃', 'Hexflame Torment': '黑焰折磨', 'Blood Chalice': '鲜血圣杯',
    'Sharpened Steel': '淬炼钢刃', 'Brutal Edge': '残暴锋刃', 'Arcane Study': '奥术研习', 'Forbidden Lore': '禁忌知识',
    'Quickened Hands': '迅捷之手', 'Frenzy': '狂热', 'Vitality': '生命活力', 'Titan Blood': '泰坦之血',
    'Iron Skin': '钢铁之肤', 'Fortress': '坚固堡垒', 'Keen Eye': '鹰眼', "Assassin's Focus": '刺客专注',
    'Fleet Footwork': '灵巧步法', 'Clarity': '清晰思维', 'Transcendence': '超凡', 'Bloodlust': '嗜血',
    'Second Wind': '复苏之风', 'Treasure Hunter': '寻宝猎人', 'Fast Learner': '快速学习', 'Conqueror': '征服者',
    'Unbreakable': '坚不可摧', 'Giant Slayer': '巨人杀手', 'Demacian Resolve': '德玛西亚意志', 'Coup de Grace': '致命一击',
    'Phase Rush': '相位猛冲', 'Fate Weaver': '命运编织者', 'Healing Font': '治愈之泉',
    'Twin Talons': '双生利爪', 'Keen Hawk': '锐眼猎鹰', 'Tailwind': '顺风而行', 'Sixth Sense': '第六感',
    'Second Mark': '追加悬赏', 'Easy Escape': '脱身有术', 'Lead Storm': '弹幕压制',
    'Deadeye Ricochet bounces to one additional enemy.': '「弹跳射击」会额外弹射至一名敌人。',
    'Strut grants more attack and move speed; takedowns extend it by 1s.': '「疾行」提供更多攻速与移速，击杀会延长持续时间 1 秒。',
    'Full Salvo fires 4 additional bullets.': '「全弹齐射」额外发射 4 发子弹。',
    'Perfect Parry': '完美招架', 'Ever Forward': '勇往直前', 'Whirlwind': '剑刃风暴',
    'Righteous Verdict': '正义裁决', 'Indomitable': '不屈意志', 'Flash': '闪现', 'Heal': '治疗',
    'critical strikes deal +40% damage.': '暴击伤害提高 40%。',
    'Burn nearby enemies for 12 + 1% max HP magic damage per second.': '每秒对附近敌人造成 12 + 1% 最大生命值的魔法伤害。',
    'Reflect 30% of damage taken from attacks as magic damage.': '将受到的攻击伤害的 30% 以魔法伤害反弹。',
    'Once per run, revive with 50% HP on death.': '每局限一次，阵亡时以 50% 生命值复活。',
    "Attacks deal 6% of the target's current HP as bonus physical damage.": '攻击额外造成相当于目标当前生命值 6% 的物理伤害。',
    'Increases total Ability Power by 35%.': '法术强度提高 35%。',
    'Every 3rd attack deals 60 + 40% AD bonus true damage.': '每第 3 次攻击额外造成 60 + 40% 攻击力的真实伤害。',
    'After using a skill, your next attack deals +100% base AD bonus damage.': '施放技能后，下次攻击额外造成 100% 基础攻击力的伤害。',
    'Regenerate 3% max HP per second after 4s without taking damage.': '4 秒未受伤后，每秒回复 3% 最大生命值。',
    'Every 4th attack chains lightning to 5 enemies for 50 + 30% AD magic damage.': '每第 4 次攻击触发闪电链，对 5 名敌人造成 50 + 30% 攻击力的魔法伤害。',
    'Skills burn enemies for 2% max HP per second for 3s.': '技能灼烧敌人，每秒造成 2% 最大生命值的伤害，持续 3 秒。',
    'Life steal can overheal into a shield of up to 150.': '生命偷取的过量治疗会转化为最多 150 点护盾。',
    'Deal +15% damage to enemies below 40% HP.': '对生命值低于 40% 的敌人造成的伤害提高 15%。',
    'Gain 40% move speed for 2s after casting a skill.': '施放技能后，移动速度提高 40%，持续 2 秒。',
    '+2 card rerolls.': '天赋卡重抽次数 +2。', '+60 Health and fully heal.': '生命值 +60 并恢复全部生命。',
    'Judgment lasts 40% longer and hits a wider area.': '「审判」持续时间延长 40%，攻击范围扩大。',
    'Demacian Justice also deals 50% of its damage to enemies around the target.': '「德玛西亚正义」也会对目标周围的敌人造成 50% 伤害。',
    'Perseverance starts after 2s and heals twice as fast.': '「坚忍」的生效时间缩短至 2 秒，回复速度翻倍。',
    'Blinding Assault fires 3 arrows in a spread.': '「致盲突袭」改为扇形射出 3 支箭。',
    'Harrier marks twice as often and Vulnerable deals +50% damage.': '「猎鹰」标记频率翻倍，攻击易伤目标的伤害提高 50%。',
    "Vault's cooldown resets whenever you kill an enemy.": '击杀敌人时重置「跃击」冷却。',
    'Vitals appear twice as often and deal +50% damage.': '破绽出现频率翻倍，造成的伤害提高 50%。',
    'A successful Riposte refunds 60% of its cooldown and heals 10% max HP.': '成功招架时返还 60% 冷却时间，并回复 10% 最大生命值。',
    'Lunging into a Vital fully refunds Lunge.': '命中破绽时完全重置「突进」冷却。',
    'Move / attack an enemy (hold to keep moving)': '移动 / 攻击敌人（按住可持续移动）',
    'Attack-move (attack anything near the target point)': '攻击移动（攻击目标点附近的敌人）',
    'Cast skills (aim with the mouse)': '施放技能（使用鼠标瞄准）',
    'Spend a skill point (or click + on a skill)': '消耗技能点（或点击技能上的 +）',
    'Center camera / toggle camera lock': '镜头居中 / 切换镜头锁定',
    'Walk over loot to pick up · Right-click a slot to sell · Shift+click to drop': '走过战利品即可拾取 · 右键点击物品出售 · Shift+点击丢弃',
    'stats, special effects or auto-cast ': '可提升属性、获得特殊效果或解锁自动施放的',
    'Every level (max 18) grants a skill point and a ': '每次升级（最高 18 级）都会获得技能点和一张',
    'talent card': '天赋卡', 'bonus skills': '额外技能',
    'Fire an arrow that explodes on the first enemy hit, dealing ': '射出箭矢，命中第一个敌人时爆炸，造成 ',
    ' physical damage around it and ': ' 物理伤害并波及周围敌人，使其',
    ' enemies for 1.5s (their attacks miss).': '，持续 1.5 秒（其攻击会落空）。',
    'Passive: consuming Vulnerable grants ': '被动：消耗易伤标记后，获得',
    ' attack speed and 15% move speed for 2s.': '攻击速度和 15% 移动速度，持续 2 秒。',
    'Active: mark the ': '主动：标记',
    ' nearest enemies as Vulnerable and gain ': '名最近的敌人为易伤状态，并获得',
    ' attack speed for 4s.': '攻击速度，持续 4 秒。',
    'Dash to an enemy, dealing ': '冲向敌人，造成',
    ' physical damage, slowing it 50% and marking it Vulnerable, then vault backwards.': '物理伤害，使其减速 50% 并陷入易伤，随后向后跃开。',
    'Your hawk lifts you up: gain ': '猎鹰将你托起：移动速度提高',
    ' move speed for 6s. When it ends, strike all nearby enemies for ': '，持续 6 秒。结束时，对附近敌人造成',
    'Lunge toward a location and stab the nearest enemy for ': '向目标位置突进，并刺击最近的敌人，造成',
    ' physical damage. Prefers Vitals. Refunds 50% cooldown on hit.': '物理伤害。优先攻击破绽。命中时返还 50% 冷却时间。',
    'Parry all damage and crowd control for 0.75s, then stab forward for ': '格挡所有伤害和控制效果 0.75 秒，然后向前刺击，造成',
    ' physical damage. If you parried an attack, enemies hit are ': '物理伤害。若成功格挡攻击，命中的敌人将被',
    'stunned': '眩晕', ' for 1.25s; otherwise slowed.': '，持续 1.25 秒；否则会被减速。',
    'Your next 2 attacks gain ': '接下来的 2 次攻击获得',
    ' attack speed. The first slows by 40%; the second always ': '攻击速度。第一次攻击使敌人减速 40%；第二次必定',
    'crits': '暴击', ' for ': '，持续 ', ' damage. Resets your attack timer.': '伤害，并重置攻击计时器。',
    'Reveal all ': '揭示目标身上的全部', ' Vitals on an enemy. Striking all ': '处破绽。击中全部',
    ' (or killing it after striking one) creates a healing field restoring ': '处破绽（或命中一处破绽后击杀目标）会生成治疗区域，每秒回复',
    ' HP per second for 4s.': '点生命值，持续 4 秒。',
    'Cleanse slows and gain 35% move speed for ': '移除减速效果，并提高 35% 移动速度，持续',
    's. Your next attack deals ': ' 秒。你的下次攻击额外造成',
    ' bonus physical damage and ': '物理伤害并',
    ' for 1.2s (0.4s on bosses).': '，持续 1.2 秒（对首领持续 0.4 秒）。',
    'Active: take ': '主动：受到的伤害降低',
    ' less damage for ': '，持续',
    ' and gain a ': '，并获得',
    ' shield.': '护盾。',
    'Spin your sword for 3s, dealing ': '旋转剑刃 3 秒，每次对周围敌人造成',
    ' physical damage per tick around you. Ticks scale with attack speed. Can crit.': '物理伤害。攻击速度越快，命中频率越高。可以暴击。',
    'Call down the might of the realm on an enemy, dealing ': '召唤王国之力打击敌人，造成',
    ' + ': ' + ', ' missing HP': '已损失生命值', ' true damage.': '真实伤害。',
    ': stats, special effects or auto-cast ': '：可提升属性、获得特殊效果或解锁自动施放的',
    'Survive waves across ': '穿越 ', ' regions of the Demacian outskirts and defeat each region\'s champion.': ' 个德玛西亚郊野区域的敌潮，击败每一区域的冠军。',
    'Harrier periodically marks the nearest enemy as ': '猎鹰会周期性标记最近的敌人，使其',
    'Vulnerable': '易伤', 'attacks miss': '攻击落空', 'Passive: ': '被动：', 'Active: ': '主动：',
    'Vital': '破绽', 'Vitals': '处破绽', ' on an enemy. Striking all ': '。击中全部',
    'bonus AD': '额外攻击力', 'bonus HP': '额外生命值', 'stuns': '眩晕',
    's and gain a ': ' 秒，并获得 ', 'kills permanently grant +0.25 armor and magic resist (max 40).': '击杀永久提高 0.25 护甲和魔法抗性（最多 40）。',
    'Critical strikes deal +40% damage.': '暴击伤害提高 40%。',
    'Critical': '暴击',
    'physical damage': '物理伤害', 'magic damage': '魔法伤害', 'true damage': '真实伤害',
    ' physical damage.': ' 物理伤害。', 'physical damage.': '物理伤害。',
    'bonus physical damage': '额外物理伤害', 'bonus damage': '额外伤害', 'max HP': '最大生命值',
    'max health': '最大生命值', 'move speed': '移动速度', 'attack speed': '攻击速度',
    'attack timer': '攻击计时器', 'cooldown': '冷却时间', 'nearest enemy': '最近的敌人', 'nearest enemies': '最近的敌人',
    'enemies hit': '命中的敌人', 'nearby enemies': '附近的敌人', 'nearby enemy': '附近的敌人',
    'all damage': '所有伤害', 'crowd control': '控制效果', 'on hit': '命中时', 'per second': '每秒',
    'per tick': '每次', 'after casting a skill': '施放技能后', 'with an attack or skill': '通过攻击或技能命中时',
    'grants move speed': '提高移动速度', 'heals you': '为你回复生命', 'consumes the mark': '并消耗标记',
    'attacking a Vulnerable enemy deals bonus physical damage and consumes the mark.': '攻击易伤敌人会造成额外物理伤害并消耗标记。',
    'Your hawk periodically marks the nearest enemy as ': '你的猎鹰会周期性标记最近的敌人，使其',
    ' seconds': ' 秒', ' second': ' 秒',
    ' tiles': ' 格范围内', ' tile': ' 格范围内',
    'gain ': '获得', 'Gain ': '获得', 'dealing ': '造成', 'deals ': '造成', 'deal ': '造成', 'dealing <b>': '造成 <b>',
    ' dealing ': '，造成', ' and ': '并', ' then ': '，随后', ' while ': '，同时', ' after ': '后',
    ' nearest ': '名最近的', ' nearest enemies': '名最近的敌人', ' enemy': '敌人', ' enemies': '敌人',
    'your next attack': '你的下次攻击', 'Your next attack': '你的下次攻击', 'your next 2 attacks': '你的接下来 2 次攻击',
    'You ': '你', 'Your ': '你的', 'your ': '你的', ' all ': '所有', ' all<': '所有<',
    ' max ': '最大', ' (+': '（+', ') ': '）', ' AD': ' 攻击力', ' AP': ' 法术强度',
    ' armor': '护甲', ' magic resist': '魔法抗性', ' HP': ' 生命值', ' HP.': ' 生命值。',
    'Parry ': '格挡', 'parried ': '成功格挡', 'slows.': '施加减速。', 'slowed.': '被减速。',
    'stunned': '眩晕', 'blinding': '致盲', 'slowing': '减速', 'slow ': '减速', 'slows ': '减速',
    'burn ': '灼烧', 'Burn ': '灼烧', 'burning ': '灼烧', 'orbit you': '环绕自身', 'on contact': '命中时',
    'Every level': '每次升级', 'bonus skills': '额外技能', 'right-click': '右键', 'Right-click': '右键',
    'Shift+click': 'Shift+点击', 'items': '物品', 'Items': '物品', 'inventory': '背包', 'Inventory': '背包',
    'rerolls': '次重抽', 'reroll': '重抽', 'Reroll': '重抽', 'mana': '法力', 'Mana': '法力',
    'health': '生命', 'Health': '生命', 'gold': '金币', 'Gold': '金币', 'stage': '区域', 'Stage': '区域',
    'wave': '波次', 'Wave': '波次', 'Level ': '等级 ', 'level ': '等级 ', 'talent': '天赋',
    'Talent': '天赋', 'choose': '选择', 'Choose': '选择', 'Sell: ': '出售：', ' gold': ' 金币',
    'Fine ': '精制', 'Exalted ': '卓越', 'Elite': '精英', 'elite': '精英', 'elites': '精英',
    'No target': '没有目标', 'Revived': '复活', 'Camera locked': '镜头已锁定', 'Camera free': '镜头已解锁',
    'Attack Damage': '攻击力', 'Ability Power': '法术强度', 'Rerolls': '重抽次数',
  };
  const rules = [
      [/^([\d.]+)% damage\. Resets your attack timer\.$/, (_, percent) => `造成 ${percent}% 伤害，并重置攻击计时器。`],
    [/^Survive waves across (\d+) regions of the Demacian outskirts and defeat each region's champion\.$/, (_, n) => `穿越德玛西亚郊野的 ${n} 个区域，击败每一区域的冠军。`],
    [/^Stage (\d+)\/(\d+) · (.+)$/, (_, n, max, biome) => `区域 ${n}/${max} · ${t(biome)}`],
    [/^Stage (\d+) — (.+)$/, (_, n, biome) => `区域 ${n} — ${t(biome)}`],
    [/^Next wave in (\d+)s$/, (_, n) => `${n} 秒后出现下一波`],
    [/^Wave (\d+)\/(\d+) · (\d+) foes$/, (_, n, max, count) => `波次 ${n}/${max} · ${count} 名敌人`],
    [/^Wave (\d+) \/ (\d+)$/, (_, n, max) => `第 ${n} / ${max} 波`],
    [/^(\d+) waves, then a champion awaits$/, (_, n) => `${n} 波之后，冠军将现身`],
    [/^(\d+) elites? incoming$/, (_, n) => `即将出现 ${n} 名精英`],
    [/^Level (\d+) — Choose a Talent$/, (_, n) => `等级 ${n} — 选择天赋`],
    [/^Rank (\d+) \/ (\d+)$/, (_, n, max) => `等级 ${n} / ${max}`],
    [/^Cooldown (\d+(?:\.\d+)?)s(?: · Cost (\d+) mana)?$/, (_, cd, cost) => `冷却 ${cd} 秒${cost ? ` · 消耗 ${cost} 法力` : ''}`],
    [/^Next rank at level (\d+)$/, (_, n) => `下一级需要等级 ${n}`],
    [/^Fell in (.+), wave (\d+)\.$/, (_, biome, wave) => `在${t(biome)}第 ${wave} 波中倒下。`],
    [/^Sell: (\d+) gold$/, (_, amount) => `出售价格：${amount} 金币`],
    [/^Fine (.+)$/, (_, name) => `精制${t(name)}`], [/^Exalted (.+)$/, (_, name) => `卓越${t(name)}`],
    [/^\+(\d+(?:\.\d+)?)% damage dealt$/, (_, n) => `伤害提高 ${n}%`],
    [/^\+(\d+) max health$/, (_, n) => `最大生命值 +${n}`],
    [/^\+(\d+) armor and magic resist$/, (_, n) => `护甲与魔法抗性 +${n}`],
    [/^\+(\d+)% move speed$/, (_, n) => `移动速度 +${n}%`],
    [/^\+(\d+) ability haste$/, (_, n) => `技能急速 +${n}`],
    [/^\+(\d+)% gold gain$/, (_, n) => `金币获取 +${n}%`], [/^\+(\d+)% XP gain$/, (_, n) => `经验获取 +${n}%`],
    [/^Rarer talent cards \(\+(\d+)% weight\)$/, (_, n) => `天赋卡稀有度提升（权重 +${n}%）`],
    [/^\+(\d+) card rerolls per run$/, (_, n) => `每局额外重抽 ${n} 次`],
    [/^Run (\d+) · Victories (\d+) · Best stage (\d+)$/, (_, runs, wins, stage) => `冒险 ${runs} 局 · 胜利 ${wins} 次 · 最远区域 ${stage}`],
    [/^Level (\d+)$/, (_, n) => `等级 ${n}`],
    [/^\+(\d+(?:\.\d+)?)(.*)$/, (_, amount, stat) => `+${amount}${t(stat)}`],
    [/^(\d+(?:\.\d+)?)s$/, (_, seconds) => `${seconds} 秒`],
    [/^\((\d+(?:\.\d+)?)s on bosses\)\.$/, (_, seconds) => `（对首领持续 ${seconds} 秒）。`],
    [/^([+-]?\d+(?:\.\d+)?)% damage$/, (_, n) => `${n}% 伤害`],
    [/^ for (\d+)% damage\. Resets your attack timer\.$/, (_, percent) => `，造成 ${percent}% 伤害，并重置攻击计时器。`],
    [/^(\d+) blades orbit you, dealing (\d+) \(\+15% AD, \+20% AP\) magic damage on contact\.$/, (_, blades, damage) => `${blades} 把刀刃环绕自身，命中时造成 ${damage}（+15% 攻击力，+20% 法术强度）魔法伤害。`],
    [/^Every (\d+(?:\.\d+)?)s, lightning strikes a nearby enemy for (\d+) \(\+40% AP, \+30% AD\) magic damage\.$/, (_, seconds, damage) => `每隔 ${seconds} 秒，闪电击中附近敌人，造成 ${damage}（+40% 法术强度，+30% 攻击力）魔法伤害。`],
    [/^Every 5s, release a frost ring dealing (\d+) \(\+30% AP\) magic damage and slowing by 40% for 1\.5s\.$/, (_, damage) => `每隔 5 秒释放寒霜波，对周围敌人造成 ${damage}（+30% 法术强度）魔法伤害并减速 40%，持续 1.5 秒。`],
    [/^Every 1\.5s, throw (\d+) dagger\(s\) at the nearest enemies for (\d+) \(\+30% AD\) physical damage\.$/, (_, count, damage) => `每隔 1.5 秒向最近的敌人投掷 ${count} 把匕首，造成 ${damage}（+30% 攻击力）物理伤害。`],
    [/^Burn enemies within ([\d.]+) tiles for (\d+) \(\+1% max HP\) magic damage per second\.$/, (_, range, damage) => `灼烧 ${range} 格范围内的敌人，每秒造成 ${damage}（+1% 最大生命值）魔法伤害。`],
    [/^Every 9s, gain a shield of (\d+) \(\+6% max HP\) for 4s\.$/, (_, shield) => `每隔 9 秒获得持续 4 秒的护盾，数值为 ${shield}（+6% 最大生命值）。`],
    [/^Every ([\d.]+)s, call a meteor on the densest group of enemies for (\d+) \(\+50% AP, \+30% AD\) magic damage\.$/, (_, seconds, damage) => `每隔 ${seconds} 秒向敌人最密集处召唤陨石，造成 ${damage}（+50% 法术强度，+30% 攻击力）魔法伤害。`],
    [/^Every 3s, lightning chains between (\d+) nearby enemies for (\d+) \(\+25% AP\) magic damage\.$/, (_, count, damage) => `每隔 3 秒，闪电在 ${count} 名附近敌人间跳跃，造成 ${damage}（+25% 法术强度）魔法伤害。`],
  ];
  const replacementKeys = Object.keys(zh).filter(key => key.length > 1).sort((a, b) => b.length - a.length);
  const replacementPattern = new RegExp(replacementKeys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  function t(value) {
    const text = String(value);
    if (locale !== 'zh') return text;
    if (Object.prototype.hasOwnProperty.call(zh, text)) return zh[text];
    for (const [pattern, format] of rules) { const match = text.match(pattern); if (match) return format(...match); }
    return text.replace(replacementPattern, match => zh[match]);
  }
  function translateTree(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) node.nodeValue = t(node.nodeValue);
    if (!root.querySelectorAll) return;
    for (const element of root.querySelectorAll('[title], [placeholder], [aria-label], [data-tip]')) {
      for (const attribute of ['title', 'placeholder', 'aria-label', 'data-tip']) {
        if (!element.hasAttribute(attribute)) continue;
        const value = element.getAttribute(attribute);
        element.setAttribute(attribute, attribute === 'data-tip' ? html(value) : t(value));
      }
    }
  }
  function html(value) {
    if (locale !== 'zh') return String(value);
    const template = document.createElement('template');
    template.innerHTML = String(value);
    translateTree(template.content);
    return template.innerHTML;
  }
  function set(next) {
    locale = next === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) { /* storage blocked */ }
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = locale === 'zh' ? 'Pixel League：银原郊野' : 'Pixel League: Silverfield Outskirts';
    const button = document.getElementById('langToggle');
    if (button) { button.textContent = locale === 'zh' ? 'English' : '中文'; button.setAttribute('aria-label', locale === 'zh' ? 'Switch to English' : '切换到中文'); }
    const hint = document.getElementById('hint');
    if (hint) hint.innerHTML = html(hintSource);
    if (onChange) onChange();
  }
  try { locale = localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'; } catch (e) { locale = 'en'; }
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.title = locale === 'zh' ? 'Pixel League：银原郊野' : 'Pixel League: Silverfield Outskirts';
  const toggle = document.getElementById('langToggle');
  if (toggle) toggle.addEventListener('click', () => set(locale === 'en' ? 'zh' : 'en'));
  return { get locale() { return locale; }, t, html, set, setOnChange(fn) { onChange = fn; } };
})();
I18N.set(I18N.locale);