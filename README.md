# AI 塔罗占卜（本地运行）

## 运行环境
- Node.js 18+（需要内置 `fetch`）

## 启动（Windows PowerShell）
在 `zhanbu/` 目录启动本地服务（会同时托管页面 + 提供 `/api/reading` 转发 DeepSeek）：

```powershell
cd .\zhanbu

# 可选：如果不想每次在页面输入 Key，可以在这里设置（推荐）
# $env:DEEPSEEK_API_KEY = "你的 DeepSeek API Key"

# 可选配置
# $env:DEEPSEEK_MODEL = "deepseek-v4-flash"   # 或 deepseek-v4-pro
# $env:DEEPSEEK_BASE_URL = "https://api.deepseek.com"
# $env:PORT = "3000"

node .\server.js
```

浏览器打开：
- http://localhost:3000/

如果你没有设置 `DEEPSEEK_API_KEY`，请在页面里填写 **DeepSeek API Key**，再提问并点击“开始占卜”。

### 端口占用（EADDRINUSE）
如果提示端口被占用，说明已有进程占用了端口：
- 关闭之前启动的服务后重试，或
- 换一个端口启动：`$env:PORT = "3001"; node .\server.js`

## 可选配置（环境变量）
- `DEEPSEEK_API_KEY`：可选（不填则在页面输入；填写后端代理使用，不会暴露到前端）
- `DEEPSEEK_MODEL`：默认 `deepseek-v4-flash`
- `DEEPSEEK_BASE_URL`：默认 `https://api.deepseek.com`
- `PORT`：默认 `3000`

## 文件说明
- `index.html`：单页界面
- `styles.css`：深紫 + 金色纹理 + 星空背景 + 翻牌样式
- `app.js`：抽牌、顺序翻牌、请求 AI、渲染解读
- `tarot-deck.js`：22 张大阿卡纳牌库数据
- `server.js`：静态托管 + `/api/reading`（DeepSeek 代理）
