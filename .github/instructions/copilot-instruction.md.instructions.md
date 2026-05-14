---
description: "Use when: editing this workspace's HTML/CSS/JS demos (no package.json). Keep changes minimal and runnable without introducing new build tooling by default."
applyTo:
	 "**/*.{js,html,css}"
---

# 项目编码规范（JS Demo 工作区）

## 基本原则
- 这是多个**相互独立**的小示例目录；默认不要引入新的工具链/依赖（如 Vite/Webpack/TypeScript/Tailwind 等），除非用户明确要求。
- 不做全局格式化/重构；分号、缩进、引号等风格以**当前文件**既有写法为准。

## 代码风格
- 优先使用 ES6+（`const/let`、箭头函数、模板字符串）。
- 命名：变量/函数用 `camelCase`；类/组件用 `PascalCase`。
- 代码要可读：优先自解释命名；复杂逻辑再补必要注释。

## 运行与模块
- 浏览器示例：直接打开对应 `.html`；`react/first.html` 通过 CDN + Babel 演示（需要联网）。
- Node 示例：多数脚本可用 `node xxx.js` 直接运行。
- `impo_expo/` 是 ESM（`import/export`）示例：更适合用浏览器 `<script type=\"module\">` + 本地静态服务器；在 Node 下直接运行 `.js` 可能因 ESM/CJS 模式不匹配失败。
- `zhanbu/` 需要 Node.js 18+（内置 `fetch`）；不要把 API Key 写入前端或仓库，使用环境变量 `DEEPSEEK_API_KEY`（也支持请求体 `apiKey`）。

## 排错与参考
- 端口占用与配置漂移等已知问题：见 `/.learnings/ERRORS.md`
- 工作区总览与每个目录的运行方式：见 `/AGENTS.md`
- `zhanbu/` 运行与环境变量：见 `/zhanbu/README.md`
