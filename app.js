import { MAJOR_ARCANA_DECK, drawUniqueCards } from "./tarot-deck.js";

const elements = {
    question: document.getElementById("question"),
    apiKey: document.getElementById("apiKey"),
    startBtn: document.getElementById("startBtn"),
    cards: document.getElementById("cards"),
    reading: document.getElementById("reading"),
    status: document.getElementById("status"),
};

let runId = 0;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function setStatus(text) {
    elements.status.textContent = text || "";
}

function setReading(text, { muted = false, error = false } = {}) {
    elements.reading.textContent = text || "";
    elements.reading.classList.toggle("is-muted", muted);
    elements.reading.classList.toggle("is-error", error);
}

function clearCards() {
    elements.cards.replaceChildren();
}

function createCardElement(card, index) {
    const wrapper = document.createElement("div");
    wrapper.className = "tarot-card";
    wrapper.setAttribute("role", "group");
    wrapper.setAttribute("aria-label", `第 ${index + 1} 张：未翻开`);

    wrapper.innerHTML = `
    <div class="tarot-card__inner">
      <div class="tarot-card__face tarot-card__back" aria-hidden="true"></div>
      <div class="tarot-card__face tarot-card__front">
        <div class="tarot-card__content">
          <div>
            <h3 class="tarot-card__name">${escapeHtml(card.nameCn)}</h3>
            <p class="tarot-card__name-en">${escapeHtml(card.nameEn)}</p>
            <div class="tarot-card__divider"></div>
          </div>
          <ul class="tarot-card__keywords">
            ${card.keywords
            .slice(0, 6)
            .map((k) => `<li class="tarot-card__keyword">${escapeHtml(k)}</li>`)
            .join("")}
          </ul>
          <div></div>
        </div>
      </div>
    </div>
  `.trim();

    return wrapper;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function flipCard(cardEl, { revealLabel } = {}) {
    const inner = cardEl.querySelector(".tarot-card__inner");

    return new Promise((resolve) => {
        let settled = false;

        const cleanup = () => {
            if (settled) return;
            settled = true;
            inner?.removeEventListener("transitionend", onEnd);
            resolve();
        };

        const onEnd = (event) => {
            if (event.propertyName !== "transform") return;
            cleanup();
        };

        if (inner) inner.addEventListener("transitionend", onEnd);

        if (revealLabel) cardEl.setAttribute("aria-label", revealLabel);
        cardEl.classList.add("is-flipped");

        // Fallback for reduced-motion or dropped transitionend
        window.setTimeout(cleanup, 1400);
    });
}

async function requestReading(question, cards, apiKey) {
    const payload = {
        question,
        apiKey: apiKey || undefined,
        cards: cards.map((c) => ({
            id: c.id,
            nameCn: c.nameCn,
            nameEn: c.nameEn,
            keywords: c.keywords,
            meaning: c.meaning,
        })),
    };

    const response = await fetch("/api/reading", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message = data?.error || `请求失败（HTTP ${response.status}）`;
        throw new Error(message);
    }

    if (!data?.text) {
        throw new Error("AI 返回内容为空");
    }

    return data.text;
}

async function handleStart() {
    const question = elements.question.value.trim();
    if (!question) {
        setStatus("");
        setReading("请先输入一个问题。", { error: true });
        elements.question.focus();
        return;
    }

    const apiKey = elements.apiKey ? elements.apiKey.value.trim() : "";

    runId += 1;
    const myRun = runId;

    elements.startBtn.disabled = true;
    elements.question.disabled = true;
    if (elements.apiKey) elements.apiKey.disabled = true;

    setStatus("翻牌中…");
    setReading("");
    clearCards();

    const drawn = drawUniqueCards(MAJOR_ARCANA_DECK, 3);
    const cardEls = drawn.map((card, index) => {
        const el = createCardElement(card, index);
        elements.cards.appendChild(el);
        return { el, card, index };
    });

    // Give the browser a moment to paint card backs
    await sleep(120);

    for (const item of cardEls) {
        if (runId !== myRun) return;

        await flipCard(item.el, {
            revealLabel: `第 ${item.index + 1} 张：${item.card.nameCn}`,
        });
        await sleep(140);
    }

    if (runId !== myRun) return;

    setStatus("生成解读中…");
    setReading("正在生成占卜解读…", { muted: true });

    try {
        const text = await requestReading(question, drawn, apiKey);
        if (runId !== myRun) return;

        setStatus("");
        setReading(text);
    } catch (error) {
        if (runId !== myRun) return;

        const message = error instanceof Error ? error.message : "生成失败";
        setStatus("");
        setReading(`生成失败：${message}`, { error: true });
    } finally {
        if (runId !== myRun) return;
        elements.startBtn.disabled = false;
        elements.question.disabled = false;
        if (elements.apiKey) elements.apiKey.disabled = false;
    }
}

elements.startBtn.addEventListener("click", handleStart);

// Initial UI state
setReading("在上方输入问题，然后点击“开始占卜”。", { muted: true });
