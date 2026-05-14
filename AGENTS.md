# JS Demo 工作区：AI 代理指南

本仓库是多个独立的 HTML/CSS/JS 学习示例合集。**没有统一的构建系统/依赖管理**（根目录无 `package.json`），各子目录互不依赖。

## 快速运行（按目录）

| 目录 | 主要内容 | 运行方式 |
|---|---|---|
| `html-css/` | HTML + CSS 基础示例 | 直接用浏览器打开 `.html` |
| `js-first/` | JavaScript 基础/异步/Fetch 等示例 | 视文件而定：浏览器打开对应 `.html`；或用 `node xxx.js` 运行脚本 |
| `impo_expo/` | ES Module（`import/export`）示例 | 建议用 `<script type="module">` + 本地静态服务器运行；直接用 Node 运行 `.js` 可能因 ESM/CJS 模式不匹配失败 |
| `react/` | React 浏览器演示 | `react/first.html` 通过 CDN + Babel 可直接浏览器打开（需联网） |
| `oop/` | JS 面向对象示例 + Docker 演示 | 可直接 `node oop/getter-setter.js`；`oop/Dockerfile` 用于 Docker 演示 |
| `zhanbu/` | 塔罗占卜（Node 本地服务 + DeepSeek 代理） | 见 `zhanbu/README.md`（需要 Node.js 18+；启动 `node server.js`） |

## 变更原则（给 AI 代理）

- **不要默认引入新工具链**：除非用户明确要求，否则不要新增 Vite/Webpack/TypeScript/Tailwind/Vitest 等；保持示例“即开即用”。
- **保持局部一致**：不要对全仓库做格式化/重构；分号、缩进、引号风格以“当前文件”既有风格为准。
- **避免跨目录耦合**：各文件夹是独立练习区，不要把一个目录的代码抽成公共库再被别的目录引用（除非用户明确要做项目化整理）。
- **密钥与配置**：不要把 API Key 写进前端或提交到仓库；`zhanbu/` 使用环境变量 `DEEPSEEK_API_KEY`（也支持前端临时输入）。

## 已知问题/经验

- 端口占用与排查、以及 DeepSeek API Key 流程同步问题：见 `.learnings/ERRORS.md`
- 配置单一事实来源、样式迭代避免主题拼接：见 `.learnings/LEARNINGS.md`

## 参考

- `zhanbu/README.md`：本地运行与环境变量说明
