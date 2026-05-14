const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_PORT = 3000;
const portFromEnv = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const PORT = Number.isFinite(portFromEnv) ? portFromEnv : DEFAULT_PORT;

const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || "").trim();
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(
    /\/$/,
    ""
);
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const ROOT_DIR = __dirname;

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}

function sendText(res, statusCode, text, contentType = "text/plain; charset=utf-8") {
    res.writeHead(statusCode, {
        "Content-Type": contentType,
        "Content-Length": Buffer.byteLength(text),
    });
    res.end(text);
}

function readRequestBody(req, { limitBytes }) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;

        req.on("data", (chunk) => {
            total += chunk.length;
            if (total > limitBytes) {
                reject(new Error("Request body too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });

        req.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf8"));
        });

        req.on("error", (err) => {
            reject(err);
        });
    });
}

function validateReadingPayload(payload) {
    if (!payload || typeof payload !== "object") return "请求体必须是 JSON 对象";

    const question = payload.question;
    if (typeof question !== "string") return "question 必须是字符串";
    if (!question.trim()) return "question 不能为空";
    if (question.length > 140) return "question 太长";

    const apiKey = payload.apiKey;
    if (apiKey !== undefined) {
        if (typeof apiKey !== "string") return "apiKey 必须是字符串";
        if (apiKey.length > 200) return "apiKey 太长";
    }

    const cards = payload.cards;
    if (!Array.isArray(cards)) return "cards 必须是数组";
    if (cards.length !== 3) return "cards 必须正好 3 张";

    for (const card of cards) {
        if (!card || typeof card !== "object") return "cards 项必须是对象";
        if (typeof card.nameCn !== "string" || !card.nameCn.trim()) return "cards.nameCn 缺失";
        if (typeof card.nameEn !== "string" || !card.nameEn.trim()) return "cards.nameEn 缺失";
        if (!Array.isArray(card.keywords) || card.keywords.length === 0) return "cards.keywords 缺失";
    }

    return null;
}

async function handleApiReading(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return sendJson(res, 405, { error: "Method Not Allowed" });
    }

    let payload;
    try {
        const raw = await readRequestBody(req, { limitBytes: 80_000 });
        payload = JSON.parse(raw);
    } catch {
        return sendJson(res, 400, { error: "请求体必须是合法 JSON" });
    }

    const validationError = validateReadingPayload(payload);
    if (validationError) {
        return sendJson(res, 400, { error: validationError });
    }

    const requestApiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
    const apiKey = requestApiKey || DEEPSEEK_API_KEY;
    if (!apiKey) {
        return sendJson(res, 400, {
            error: "缺少 DeepSeek API Key。请在页面输入，或在启动服务时设置环境变量 DEEPSEEK_API_KEY。",
        });
    }

    const question = payload.question.trim();
    const cards = payload.cards;

    const systemPrompt =
        "你是一位塔罗占卜师。你的表达要神秘、华丽、温柔，但不制造恐惧；避免绝对化断言。" +
        "请用中文输出，语气像深紫与金色的星空。" +
        "输出为纯文本，使用换行分段：总体（1段）/三张牌逐张解读（每张1段）/建议（1段）。" +
        "字数控制在 280~520 字之间。";

    const cardLines = cards
        .map((c, i) => {
            const kw = Array.isArray(c.keywords) ? c.keywords.slice(0, 6).join("、") : "";
            const meaning = typeof c.meaning === "string" ? c.meaning.trim() : "";
            return `第${i + 1}张：${c.nameCn}（${c.nameEn}）\n关键词：${kw}\n简述：${meaning}`;
        })
        .join("\n\n");

    const userPrompt = `用户问题：${question}\n\n抽到的三张牌：\n\n${cardLines}\n\n请结合用户问题与三张牌，生成占卜解读。`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
        const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                stream: false,
                temperature: 0.8,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
            }),
            signal: controller.signal,
        });

        let data;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const message =
                data?.error?.message ||
                data?.message ||
                `DeepSeek 请求失败（HTTP ${response.status}）`;
            return sendJson(res, 502, { error: message });
        }

        const text = data?.choices?.[0]?.message?.content;
        if (!text || typeof text !== "string") {
            return sendJson(res, 502, { error: "DeepSeek 返回内容为空" });
        }

        return sendJson(res, 200, { text: text.trim() });
    } catch (err) {
        if (err && typeof err === "object" && err.name === "AbortError") {
            return sendJson(res, 504, { error: "DeepSeek 请求超时" });
        }

        return sendJson(res, 500, { error: "服务器异常：无法生成解读" });
    } finally {
        clearTimeout(timeoutId);
    }
}

function tryServeStatic(req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Allow", "GET, HEAD");
        sendText(res, 405, "Method Not Allowed");
        return;
    }

    let urlPath;
    try {
        const fullUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
        urlPath = decodeURIComponent(fullUrl.pathname);
    } catch {
        sendText(res, 400, "Bad Request");
        return;
    }

    if (urlPath === "/") urlPath = "/index.html";

    const resolved = path.resolve(ROOT_DIR, "." + urlPath);
    if (!resolved.startsWith(ROOT_DIR)) {
        sendText(res, 403, "Forbidden");
        return;
    }

    fs.stat(resolved, (err, stat) => {
        if (err || !stat.isFile()) {
            sendText(res, 404, "Not Found");
            return;
        }

        const ext = path.extname(resolved).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType,
        });

        if (req.method === "HEAD") {
            res.end();
            return;
        }

        fs.createReadStream(resolved).pipe(res);
    });
}

const server = http.createServer(async (req, res) => {
    if (!req.url) return sendText(res, 400, "Bad Request");

    if (req.url.startsWith("/api/reading")) {
        return handleApiReading(req, res);
    }

    return tryServeStatic(req, res);
});

server.on("error", (err) => {
    const code = err && typeof err === "object" ? err.code : null;

    if (code === "EADDRINUSE") {
        console.error(`端口 ${PORT} 已被占用：服务可能已经在运行。`);
        console.error(`- 如果你已经启动过一次，请不要重复启动。`);
        console.error(`- 需要重启：先停止占用端口的进程，或设置环境变量 PORT 更换端口（例如 3001）。`);
        process.exit(1);
        return;
    }

    if (code === "EACCES") {
        console.error(`没有权限监听端口 ${PORT}。请尝试更换 PORT（例如 3001）。`);
        process.exit(1);
        return;
    }

    console.error("服务器启动失败：", err);
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`Tarot app running on http://localhost:${PORT}`);
});
