# Pixel League 项目管理

本目录是游戏设计、项目规划和素材管理工作台。这里的文档描述目标与决策；游戏代码和运行表现才是当前实现的事实来源。

## 开始使用

1. 在仓库根目录启动静态服务器：`python -m http.server 8000`。
2. 浏览器访问 `http://localhost:8000/design/management/dev-console.html`。
3. 连接项目目录时，选择仓库根目录，并授权读写；随后可浏览角色动画帧和 SVG 图标、搜索、编辑源码、导入替换文件并保存。
4. 如浏览器不支持文件系统目录访问，控制台提供下载替换文件；下载后自行放入显示的素材路径。
5. 打开游戏和图标页，检查替换结果，再按下方开发流程提交变更。

控制台仅处理 SVG，最多接受 2 MiB，并阻止脚本、事件属性和外部资源引用。浏览器授权仅在本地有效。它不会代替 Git 提交、游戏运行验证或备份。图标的单独 SVG 文件是生成产物；图标源文件是 `assets/game-icons.svg`，游戏加载的是 `assets/icons.bundle.svg`。修改图标源后，在 Windows 开发环境执行 `node scripts/build-icons.mjs` 生成新产物。

## 管理组件与职责

| 组件/服务 | 当前职责与依据 | 当前状态 |
| --- | --- | --- |
| 游戏运行时 | `index.html` 按固定顺序加载经典脚本；`js/main.js` 启动游戏 | 已实现 |
| 游戏设计基线 | 本目录的 `game-design.md` 记录核心循环、体验原则和待确认设计决策 | 初始基线 |
| 素材库与编辑台 | `assets/character/manifest.json` 登记角色帧和尺寸；`dev-console.html` 浏览、编辑和替换 SVG | 已实现 |
| 角色素材生成 | `scripts/build-character-assets.mjs` 从代码精灵定义导出角色 SVG；导出会覆盖这些文件 | 已实现 |
| 图标生成 | `assets/game-icons.svg` 是图标源；`scripts/build-icons.mjs` 生成独立图标和 bundle | 已实现 |
| 项目计划与决策 | `roadmap.md` 管理分阶段成果、待办和依赖；设计变更先写入规格再进入实现 | 轻量文档流程 |
| 质量与交付 | `development-workflow.md` 定义需求、实现、验证、审查和发布门槛 | 轻量文档流程 |

当前项目是无打包器、无第三方运行时依赖的 HTML/CSS/JavaScript 项目，没有服务端资产 API、自动化测试或 CI。管理台是本地静态工具，而不是多人协作或部署服务。多人协作、云素材库、线上关卡编辑器暂不纳入，避免在游戏核心尚未稳定前引入基础设施负担。

## 文档索引

- [游戏设计基线](game-design.md)：核心体验、循环、设计约束与待决问题。
- [开发流程与质量门槛](development-workflow.md)：从目标到验证、提交和发布的新人操作路径。
- [路线图与待办](roadmap.md)：优先级、交付成果、依赖和完成标准。
- [项目开发上下文](../../dev-context.md)：当前代码模块、接口与运行流程。
