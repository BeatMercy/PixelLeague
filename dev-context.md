# Pixel League 开发上下文

> 面向后续维护与功能扩展的项目速览。项目是一款原生 HTML/CSS/JavaScript 的 2.5D 等距视角地牢 Roguelike，无打包器、无第三方运行时依赖。

## 项目概况

- 游戏入口：`index.html`。用浏览器打开即可运行；所有游戏脚本以经典 `<script>` 按固定顺序加载，共用全局词法作用域。
- 玩法：在 5 个德玛西亚郊野区域中依次迎战敌潮和区域首领。角色上限 18 级，每级获得技能点和天赋选择；敌人掉落金币、药水、装备。
- 视觉：Canvas 绘制程序化像素精灵和等距地图；DOM/CSS 负责菜单、HUD、装备栏、技能提示和叠层。
- 输入：右键移动或攻击，Q/W/E/R 施放英雄技能，D/F 使用召唤师技能；其他快捷键见游戏说明。
- 局外成长：禁魔石碎片和强化保存在 `localStorage` 的 `pixelLeague.meta.v1`。
- 素材：`assets/game-icons.svg` 提供可复用图标；`icons.html` 是可搜索、分类、复制引用的图标选择页。
- 语言：`js/i18n.js` 提供英语和简体中文；偏好保存在 `pixelLeague.locale.v1`，与游戏进度分开。

## 开始运行

1. 在浏览器中打开 `index.html`。没有 `package.json`、构建步骤或依赖安装步骤。
2. 从标题界面选择 New Run，选择英雄后进入第一关。
3. 更新 JavaScript 后重新载入页面即可；游戏状态和语言分别保存在浏览器本地存储中。
4. 开发介绍页为 `dev-context.html`；本文件为更完整的纯文本上下文记录。

项目没有配置自动化测试。可使用 `node --check js/<file>.js` 检查单个脚本语法；完整验证仍需在浏览器中游玩关键流程。

## 单局生命周期

```text
boot()
  -> 标题 / 英雄选择
  -> startRun(hero)
  -> startStage(1)
  -> 休整倒计时 -> 多波敌人 -> 区域首领
  -> 击败首领 -> 传送门 -> 营地商店 -> 下一关
  -> 第五关传送门获胜；玩家阵亡后结算
```

每帧由 `main.js` 的 `frame()` 驱动。游玩时 `stepPlay()` 依次更新鼠标目标、玩家、敌人、弹道、区域效果、计时器、刷怪器、镜头和 HUD，随后绘制小地图及世界。玩家逻辑在 `Player.prototype.update()`；关卡、波次、首领和传送门转移由 `spawner.js` 控制。

战斗伤害集中经过 `dealDamage()`：防御减伤、增伤/减伤、护盾、英雄被动、物品效果和击杀处理在此处串联。修改战斗机制时优先定位这个入口和相关 `hero.onAttack` / `onDealt` / `dmgTaken` 钩子，避免在显示层重复计算。

## 目录与模块

### 页面与样式

| 文件 | 职责 |
| --- | --- |
| `index.html` | 游戏 DOM 容器、HUD 初始骨架、语言按钮与游戏脚本加载顺序。 |
| `css/style.css` | 像素风菜单、HUD、卡片、弹窗、布局与窄屏样式。 |
| `icons.html` | 游戏 SVG 素材选择器的独立页面。 |
| `css/icon-gallery.css` | 素材选择器的响应式样式。 |
| `dev-context.html` | 本项目的开发导览页。 |

### 游戏脚本

| 文件 | 职责 |
| --- | --- |
| `js/i18n.js` | 英文/简体中文翻译、DOM/HTML 文案翻译、语言偏好和切换事件。必须在其他游戏脚本前加载。 |
| `js/core.js` | 尺寸常量、随机/数学工具、Canvas 初始化、输入监听和全局状态 `G`。 |
| `js/sprites.js` | 通过 Canvas 程序化生成英雄等人物像素精灵及绘制辅助函数。 |
| `js/sprite_defs.js` | 非人形精灵定义和精灵注册表。 |
| `js/props.js` | 五种区域调色板、地砖和场景物件的绘制定义。 |
| `js/map.js` | 44×44 地图生成、碰撞、寻路、敌人流场及可用出生点。 |
| `js/fx.js` | 粒子、飘字、地面圆环、射线及其他战斗视觉效果。 |
| `js/data_items.js` | 属性文案、稀有度、普通装备/传奇装备数据、掉落和装备提示 HTML。 |
| `js/data_talents.js` | 普通天赋、英雄专属天赋、额外技能卡、抽卡权重和天赋应用。 |
| `js/data_enemies.js` | 普通敌人/首领基础属性、关卡区域/敌人池/波次数和经验曲线。 |
| `js/entity.js` | `Unit` 共用状态、控制效果、持续伤害、移动状态和血条绘制。 |
| `js/combat.js` | 伤害/治疗/击杀/经验结算、普攻和弹道、连锁效果、装备被动。 |
| `js/hero_kestrel.js` | 凯斯特尔英雄配置、技能、被动、专属天赋与事件钩子。 |
| `js/hero_vela.js` | 维拉英雄配置、技能、被动、专属天赋与事件钩子。 |
| `js/hero_aldric.js` | 奥德里克英雄配置、技能、被动、专属天赋与事件钩子，并汇总 `HEROES`。 |
| `js/extras.js` | 天赋卡授予的自动施放额外技能。 |
| `js/player.js` | `Player` 数据、属性重算、路径/攻击指令、施放技能与召唤师技能。 |
| `js/player_update.js` | 玩家逐帧状态更新、普攻行为、拾取/出售/丢弃物品。 |
| `js/enemy.js` | 普通敌人构造、AI、控制效果和死亡掉落。 |
| `js/boss.js` | 首领技能预告/施放和首领狂暴阶段。 |
| `js/spawner.js` | 单局状态、阶段/波次/首领/传送门推进、升级和阵亡回调。 |
| `js/render.js` | 等距世界、场景物件、单位、掉落、弹道和 Canvas 放大绘制。 |
| `js/hud.js` | HUD、状态栏、技能栏、背包、工具提示、横幅和小地图。 |
| `js/ui.js` | 标题、英雄选择、天赋、营地、暂停、结算和军械库界面及按钮路由。 |
| `js/meta.js` | 局外碎片/强化的读取、保存、购买和奖励计算。 |
| `js/main.js` | 启动、游戏主循环、游玩输入路由、镜头和鼠标悬停逻辑。 |
| `js/icon-gallery.js` | 独立素材选择页的搜索、分类、分页、预览与复制引用。 |

### 素材和需求

- `assets/game-icons.svg`：124 个以 `<symbol>` 导出的 SVG 图标，ID 按 `hero-`、`weapon-`、`armor-`、`potion-`、`magic-`、`monster-`、`resource-`、`ui-` 分类。
- `design/management/asset-catalog.json`：素材管理目录；声效由 `js/sound.js` 的 Web Audio 实时合成，故事候选见 `design/story/`，新增原画与音频可从管理台登记和预览。登记/导入不代表已接入游戏运行时。
- `Requirement.md`：初始玩法目标记录。当前代码为该目标的已实现形态，发生差异时以实际代码为准。

## 加载顺序与共享接口

`index.html` 的游戏脚本顺序是依赖关系：

1. `i18n.js`、`core.js` 建立语言、常量、Canvas 和全局状态。
2. `sprites.js`、`sprite_defs.js`、`props.js`、`map.js`、`fx.js` 建立渲染/地图基础。
3. `data_items.js`、`data_talents.js`、`data_enemies.js` 注册游戏数据。
4. `entity.js`、`combat.js`、三个英雄文件、`extras.js`、`player.js`、`player_update.js`、`enemy.js`、`boss.js` 定义规则实体。
5. `spawner.js`、`render.js`、`hud.js`、`ui.js`、`meta.js`、`main.js` 建立游戏流程和启动。`main.js` 最后调用 `boot()`。

主要共享入口：

- `G`：游戏状态。`G.state` 为标题、选择、游玩、暂停、营地/结算等流程状态；其他字段保存地图、实体和效果。
- `HEROES`：可选英雄定义列表；目前在 `hero_aldric.js` 末尾汇总。
- `STAGES` / `BIOMES`：关卡表在 `data_enemies.js`；区域视觉配置在 `props.js`。
- `Player`、`Enemy`、`Boss` / `dealDamage()`：角色/敌人及战斗的主要规则接口。
- `screen()` / `banner()` / `ftext()`：整屏 DOM 界面、HUD 横幅和 Canvas 飘字的显示入口。

## 扩展约定

### 添加英雄

在独立的 `hero_<id>.js` 定义英雄配置，填好唯一 `id`、精灵键、基础成长属性、被动、Q/W/E/R、卡片、可选的 `tick`/战斗回调；按依赖顺序在 `index.html` 加载，并把对象加入 `HEROES`。如果添加了可见名称或文案，在 i18n 英文键对应的 `zh` 词典中加入翻译。

### 添加物品、天赋或敌人

- 物品进入 `BASE_ITEMS` 或 `LEGENDARIES`；数值效果由 `stats` 字段和 `Player.recalc()` 聚合。
- 天赋进入 `TALENTS`；被动式属性写入 `st`，需要一次性触发时使用 `flag` / `fn`，自动技能放入 `EXTRAS`。
- 普通敌人和首领分别登记在 `ENEMY_DEF` / `BOSS_DEF`；将敌人 key 加入某个 `STAGES[].pool` 才会在该阶段生成。
- 新增任何玩家可读名称或效果说明，都应同时添加中文词条并检查 tooltip、卡片、HUD 和拾取提示。

### 添加界面文案或语言

- 当前语言入口在屏幕右上角；选择会保存到 `pixelLeague.locale.v1`。
- 固定英文片段与名称加在 `js/i18n.js` 的 `zh` 表；带变量的完整文案优先加 `rules` 正则，并保留所有数值/HTML 标签。
- 菜单通过 `screen()` 注入，工具提示/装备内容经 `I18N.html()` 翻译；HUD 的文字、HTML 由 `setText()` / `setHTML()` 处理。
- Canvas 飘字要保留原文并调用 `I18N.t()` 显示，语言切换才能即时更新。
- 如果新增 DOM 更新路径，不要只在首次启动时翻译一次；应保证语言切换时会重绘或调用 `I18N`。
- 游戏需要第三种语言时，扩展语言表和 locale 校验，再给切换控件增加选择方式；不要把翻译状态写进战斗或 meta 存档。

### 使用 SVG 图标

```html
<svg viewBox="0 0 32 32" role="img" aria-label="Long sword">
  <use href="assets/game-icons.svg#weapon-long-sword"></use>
</svg>
```

使用 CSS 的 `color` 可更改大多数图标的主题色。打开 `icons.html` 搜索、预览并点击图标，可复制引用代码；新增素材时按现有类别 ID 添加 `<symbol>`，并同步 `js/icon-gallery.js` 的类别清单。

## 持久化、渲染与验证

- Meta 存档键：`pixelLeague.meta.v1`；语言偏好键：`pixelLeague.locale.v1`。清空/迁移其一不会影响另一项。
- 世界运行在 44×44 tile 空间；`map.js` 处理空间/寻路，`render.js` 负责 Canvas 绘制，`hud.js` 负责 HTML 层。碰撞和战斗逻辑不应依赖本地化文案。
- 地图和精灵在运行时用 Canvas 生成；地图随机，截图和关卡布局不会固定。
- 当前无 lint/test/build 配置。建议验证：中英来回切换、刷新后语言保持、主菜单和帮助、英雄选择、开局/HUD、技能 tooltip、升级卡、掉落/出售、营地、暂停、结算。图标选择器另检查筛选和 SVG 显示。
