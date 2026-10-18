(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "retroOtome_final_v3";
  const CONTACTS = [
    { id: "heart", name: "hearty eah^", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces", time: "23:11", preview: "1", mood: "cute" },
    { id: "luna", name: "小月亮", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces", time: "01:31", preview: "[动画表情] 哎", mood: "soft" },
    { id: "chen", name: "陆沉", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces", time: "23:53", preview: "Its cold outta here", mood: "all" },
    { id: "couple", name: "我们先开吧", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces", time: "20:22", preview: "我在楼下等你。", mood: "cute" },
    { id: "voice", name: "语音备忘", avatar: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=120&h=120&fit=crop&crop=faces", time: "14:27", preview: "[语音通话]", mood: "soft" }
  ];
  const DEFAULT_MESSAGES = {
    heart: [
      { text: "I can't sleep :<", type: "sent", time: "23:51" }, { text: "Who cares", type: "received", time: "23:52" },
      { text: ":(", type: "sent", time: "23:52" }, { text: "don't you care about me now?", type: "sent", time: "23:52" },
      { text: "I always don't care.", type: "received", time: "23:53" }, { text: "SOMEONE KNOCKING AT MY DOOR WTF", type: "sent", time: "23:53" },
      { text: "Its cold outta here", type: "received", time: "23:53" }
    ],
    luna: [{ text: "今天也辛苦啦，早点睡。", type: "received", time: "01:31" }],
    chen: [{ text: "Its cold outta here", type: "received", time: "23:53" }],
    couple: [{ text: "我在楼下等你。", type: "received", time: "20:22" }],
    voice: [{ text: "刚刚给你留了一段语音。", type: "received", time: "14:27" }]
  };
  const todayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const freshState = () => ({
    profileName: "heartYEAH:)", signature: "A leaf that remains evergreen",
    // The card library intentionally starts empty: only user-created/imported cards can reply.
    customCards: [], cardGroups: [], collected: [], messages: clone(DEFAULT_MESSAGES), previews: {}, notes: [],
    savedItems: [],
    anniversaries: [
      { id: "anniv-meet", title: "相识纪念日", date: "2026-05-14", note: "The day our story began." },
      { id: "anniv-first", title: "第一次约会", date: "2026-06-01", note: "A tiny date worth remembering." }
    ]
  });
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return freshState();
      const parsed = JSON.parse(saved);
      const base = freshState();
      const cardGroups = (Array.isArray(parsed.cardGroups) ? parsed.cardGroups : []).map(group => ({
        id: String(group.id || uid()), name: String(group.name || "未命名分组"), enabled: group.enabled !== false
      }));
      // Migrate older user-added string cards into the new managed-card format.
      // Legacy built-in replies are not migrated; the built-in library has been removed.
      const customCards = (Array.isArray(parsed.customCards) ? parsed.customCards : []).map(card => {
        if (typeof card === "string") return { id: uid(), text: card.trim(), groupId: "", enabled: true, createdAt: Date.now() };
        return { id: String(card.id || uid()), text: String(card.text || "").trim(), groupId: String(card.groupId || ""), enabled: card.enabled !== false, createdAt: card.createdAt || Date.now() };
      }).filter(card => card.text).map(card => { if (card.groupId && !cardGroups.some(group => group.id === card.groupId)) card.groupId = ""; return card; });
      return {
        ...base, ...parsed,
        messages: { ...clone(DEFAULT_MESSAGES), ...(parsed.messages || {}) },
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        savedItems: Array.isArray(parsed.savedItems) ? parsed.savedItems : [],
        anniversaries: Array.isArray(parsed.anniversaries) ? parsed.anniversaries : [],
        collected: Array.isArray(parsed.collected) ? parsed.collected : [],
        customCards, cardGroups
      };
    } catch (error) { console.warn("Saved data could not be read; loading defaults.", error); return freshState(); }
  }
  let state = loadState();
  let activeTab = "message";
  let inChat = false;
  let activeContactId = "heart";
  let currentFilter = "all";
  let editingNoteId = null;
  let currentNoteKind = "all";
  const now = new Date();
  let calendarYear = now.getFullYear();
  let calendarMonth = now.getMonth();
  let selectedDate = todayKey();
  let modalResolver = null;

  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.warn("Local storage could not be written.", error); } }
  function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
  function dateLabel(dateStr) { const d = new Date(`${dateStr}T12:00:00`); return Number.isNaN(d.getTime()) ? dateStr : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; }
  function currentContact() { return CONTACTS.find(c => c.id === activeContactId) || CONTACTS[0]; }
  function allCards() {
    const enabledGroups = new Set(state.cardGroups.filter(group => group.enabled).map(group => group.id));
    return state.customCards.filter(card => card.enabled && (!card.groupId || enabledGroups.has(card.groupId)));
  }
  function showModal(title, message, symbol = "✦", options = {}) {
    $("#modal-title").textContent = title; $("#modal-text").textContent = message; $("#modal-symbol").textContent = symbol;
    $("#modal-extra").replaceChildren();
    $("#modal-cancel").hidden = !options.confirm; $("#modal-ok").hidden = false;
    $("#modal-ok").textContent = options.okText || (options.confirm ? "Confirm" : "Okay");
    $("#modal").hidden = false;
    return new Promise(resolve => { modalResolver = resolve; });
  }
  function closeModal(result = false) { $("#modal").hidden = true; if (modalResolver) { modalResolver(result); modalResolver = null; } }

  function renderLayout() {
    if (!(activeTab === "message" && inChat)) { $("#extension-panel").hidden = true; $("#sticker-tray").hidden = true; }
    const messageListVisible = activeTab === "message" && !inChat;
    $("#page-message").hidden = !messageListVisible;
    $("#page-chat").hidden = !(activeTab === "message" && inChat);
    $("#page-notes").hidden = activeTab !== "notes";
    $("#page-saved").hidden = activeTab !== "saved";
    $("#page-me").hidden = activeTab !== "me";
    $$(".tab-item").forEach(button => button.classList.toggle("active", button.dataset.tab === activeTab));
    $("#back-btn").hidden = !(inChat || (activeTab === "notes" && !$("#note-editor").hidden));
    $("#top-action").hidden = activeTab === "message" && inChat;
    const titles = { message: inChat ? currentContact().name : "Message", notes: $("#note-editor").hidden ? "Notes" : "Note Editor", saved: "Saved", me: "Me" };
    $("#top-title").textContent = titles[activeTab];
    $("#top-action").textContent = activeTab === "notes" ? (!$("#note-editor").hidden ? "Save" : "＋ New") : activeTab === "saved" ? "+ Date" : "Edit";
  }
  function switchTab(tab) {
    activeTab = tab; inChat = false;
    if (tab === "notes") { $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; }
    renderLayout();
    if (tab === "message") renderConversations();
    if (tab === "notes") renderNotes();
    if (tab === "saved") { renderCalendar(); renderSavedDay(); renderAnniversaries(); }
    if (tab === "me") renderMe();
  }
  function openChat(id) { activeContactId = id; inChat = true; activeTab = "message"; renderLayout(); renderMessages(); }

  function renderConversations() {
    const list = $("#conversation-list"); list.replaceChildren();
    CONTACTS.filter(contact => currentFilter === "all" || contact.mood === currentFilter || contact.mood === "all").forEach(contact => {
      const button = document.createElement("button"); button.type = "button"; button.className = "conversation"; button.addEventListener("click", () => openChat(contact.id));
      const img = document.createElement("img"); img.src = contact.avatar; img.alt = "";
      const copy = document.createElement("div"); copy.className = "convo-copy";
      const head = document.createElement("div"); head.className = "convo-head";
      const name = document.createElement("span"); name.className = "convo-name"; name.textContent = contact.name;
      const time = document.createElement("span"); time.className = "convo-time"; time.textContent = contact.time;
      const preview = document.createElement("div"); preview.className = "convo-preview"; preview.textContent = state.previews[contact.id] || contact.preview;
      head.append(name, time); copy.append(head, preview); button.append(img, copy); list.append(button);
    });
  }
  function renderMessages() {
    const container = $("#chat-messages"); container.replaceChildren();
    (state.messages[activeContactId] || []).forEach(message => appendMessageElement(container, message));
    container.scrollTop = container.scrollHeight;
    $("#top-title").textContent = currentContact().name;
  }
  function appendMessageElement(container, message) {
    const group = document.createElement("div"); group.className = `message ${message.type === "sent" ? "sent" : "received"}`;
    if (message.kind === "poll") {
      const card = document.createElement("article"); card.className = "special-card poll-card";
      const kicker = document.createElement("div"); kicker.className = "special-kicker"; kicker.textContent = "✦ QUICK QUESTION";
      const question = document.createElement("strong"); question.className = "poll-question"; question.textContent = message.poll?.question || "A little question";
      const hint = document.createElement("p"); hint.className = "special-hint"; hint.textContent = message.votedIndex == null ? "点击一个选项，模拟 TA 作答" : "TA 已经做出选择";
      const options = document.createElement("div"); options.className = "poll-options";
      (message.poll?.options || []).forEach((option, index) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "poll-choice";
        if (message.votedIndex === index) button.classList.add("chosen");
        button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        button.disabled = message.votedIndex != null;
        button.addEventListener("click", () => answerPoll(message.id, index));
        options.append(button);
      });
      card.append(kicker, question, hint, options); group.append(card);
    } else if (message.kind === "transfer") {
      const card = document.createElement("button"); card.type = "button"; card.className = `special-card transfer-card ${message.transferType === "红包" ? "redpacket" : "money-transfer"}`;
      const seal = document.createElement("span"); seal.className = "packet-seal"; seal.textContent = message.transferType === "红包" ? "福" : "¥";
      const copy = document.createElement("span"); copy.className = "transfer-copy";
      const label = document.createElement("strong"); label.textContent = message.transferType === "红包" ? "恭喜发财，大吉大利" : "转账给你";
      const amount = document.createElement("span"); amount.className = "transfer-amount"; amount.textContent = `¥ ${Number(message.amount || 0).toFixed(2)}`;
      const note = document.createElement("small"); note.textContent = message.note || "点击查看这份小心意";
      copy.append(label, amount, note); card.append(seal, copy);
      card.addEventListener("click", () => showModal(message.transferType === "红包" ? "红包已打开" : "转账详情", `${message.note || "这是一份来自梦境的模拟小心意。"} 金额：¥${Number(message.amount || 0).toFixed(2)}。这只是网页演示，不会产生真实支付。`, "✉"));
      group.append(card);
    } else if (message.kind === "music") {
      const card = document.createElement("article"); card.className = "special-card music-card";
      const disc = document.createElement("div"); disc.className = "record-disc"; disc.innerHTML = '<span class="record-center">♫</span>';
      const copy = document.createElement("div"); copy.className = "music-copy";
      const kicker = document.createElement("div"); kicker.className = "special-kicker"; kicker.textContent = "NOW PLAYING · MIXTAPE";
      const title = document.createElement("strong"); title.className = "music-title"; title.textContent = message.track || "Untitled track";
      const artist = document.createElement("span"); artist.className = "music-artist"; artist.textContent = message.artist || "Unknown artist";
      const note = document.createElement("small"); note.textContent = message.note || "a song I wanted you to hear";
      const play = document.createElement("button"); play.type = "button"; play.className = "music-play"; play.textContent = "▶ Play preview";
      play.addEventListener("click", () => { const playing = play.dataset.playing !== "true"; play.dataset.playing = String(playing); play.textContent = playing ? "Ⅱ Pause preview" : "▶ Play preview"; disc.classList.toggle("spinning", playing); });
      copy.append(kicker, title, artist, note, play); card.append(disc, copy); group.append(card);
    } else if (message.kind === "voice") {
      const bubble = document.createElement("button"); bubble.type = "button"; bubble.className = "bubble voice-bubble";
      const play = document.createElement("span"); play.className = "voice-play"; play.textContent = "▶";
      const wave = document.createElement("span"); wave.className = "voice-wave";
      [6, 12, 18, 9, 22, 14, 7, 17, 10, 21, 8, 14, 5].forEach(height => { const bar = document.createElement("i"); bar.style.height = `${height}px`; wave.append(bar); });
      const duration = document.createElement("span"); duration.className = "voice-duration"; duration.textContent = `0:${String(message.duration || 3).padStart(2, "0")}`;
      bubble.append(play, wave, duration); bubble.addEventListener("click", () => showModal("Voice message", "这是一条模拟语音消息，当前 Demo 没有录制或播放真实音频。", "♫")); group.append(bubble);
    } else if (message.kind === "sticker") {
      const bubble = document.createElement("div"); bubble.className = "bubble sticker-bubble"; bubble.textContent = message.text || "♡"; group.append(bubble);
    } else {
      const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = message.text || ""; group.append(bubble);
    }
    const meta = document.createElement("div"); meta.className = "message-meta"; meta.textContent = `${message.time || nowTime()} ${message.type === "sent" ? "Delivered" : "Read"}`;
    group.append(meta); container.append(group);
  }
  function saveMemoryItem(type, title, text, date = todayKey()) {
    state.savedItems.unshift({ id: uid(), date, type, title, text, createdAt: Date.now() });
    saveState();
  }
  function receiveCard(contactId) {
    const pool = allCards();
    if (!pool.length) {
      // Never silently fall back to a built-in phrase. The library is user-owned and may be empty/disabled.
      if (activeTab === "message" && inChat && activeContactId === contactId) {
        showModal("字卡库暂时没有可抽取内容", "请前往 Me 添加字卡，或启用至少一张字卡及其所属分组。", "✧");
      }
      return;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const card = chosen.text;
    const message = { text: card, type: "received", time: nowTime(), cardId: chosen.id };
    if (!state.messages[contactId]) state.messages[contactId] = [];
    state.messages[contactId].push(message); state.previews[contactId] = card;
    if (!state.collected.includes(card)) state.collected.unshift(card);
    saveMemoryItem("card", `来自 ${CONTACTS.find(c => c.id === contactId)?.name || "TA"} 的字卡`, card);
    saveState();
    if (activeTab === "message" && inChat && activeContactId === contactId) renderMessages();
    renderConversations(); renderNotes(); renderMe();
  }
  function sendMessage(text) {
    const value = text.trim(); if (!value) return;
    sendSpecialMessage({ text: value }, true);
    $("#message-input").value = "";
  }
  function sendSpecialMessage(payload, shouldReply = true) {
    const id = activeContactId; if (!state.messages[id]) state.messages[id] = [];
    $("#extension-panel").hidden = true; $("#sticker-tray").hidden = true;
    const message = { ...payload, id: payload.id || uid(), type: "sent", time: nowTime() };
    state.messages[id].push(message);
    state.previews[id] = message.text || message.poll?.question || (message.kind === "transfer" ? `${message.transferType} ¥${message.amount}` : message.kind === "music" ? `♫ ${message.track}` : message.kind === "voice" ? "[语音消息]" : "[表情贴纸]");
    saveState(); renderMessages(); renderConversations();
    if (shouldReply) window.setTimeout(() => receiveCard(id), 550);
  }
  function answerPoll(messageId, optionIndex) {
    const messages = state.messages[activeContactId] || [];
    const poll = messages.find(item => item.id === messageId && item.kind === "poll");
    if (!poll || poll.votedIndex != null || !poll.poll?.options?.[optionIndex]) return;
    poll.votedIndex = optionIndex;
    messages.push({ id: uid(), text: `我选「${poll.poll.options[optionIndex]}」。你呢？`, type: "received", time: nowTime() });
    state.previews[activeContactId] = `我选「${poll.poll.options[optionIndex]}」`;
    saveState(); renderMessages(); renderConversations();
  }
  function toggleComposerPanel(panelName) {
    const extension = $("#extension-panel"); const stickers = $("#sticker-tray");
    if (panelName === "extension") { const shouldOpen = extension.hidden; extension.hidden = !shouldOpen; stickers.hidden = true; }
    else if (panelName === "stickers") { const shouldOpen = stickers.hidden; stickers.hidden = !shouldOpen; extension.hidden = true; }
  }
  function addModalField(parent, labelText, options = {}) {
    const field = document.createElement("label"); field.className = "modal-field"; field.textContent = labelText;
    let input;
    if (options.tag === "textarea") { input = document.createElement("textarea"); input.rows = options.rows || 3; }
    else if (options.tag === "select") { input = document.createElement("select"); (options.choices || []).forEach(choice => { const option = document.createElement("option"); option.value = choice.value; option.textContent = choice.label; input.append(option); }); }
    else { input = document.createElement("input"); input.type = options.type || "text"; }
    input.className = "retro-form-control"; input.placeholder = options.placeholder || ""; input.value = options.value || "";
    if (options.required) input.required = true;
    if (options.min != null) input.min = options.min;
    if (options.maxLength) input.maxLength = options.maxLength;
    field.append(input); parent.append(field); return input;
  }
  async function composeExtension(kind) {
    $("#extension-panel").hidden = true;
    if (kind === "transfer") {
      const pending = showModal("红包 / 转账", "送出一份小心意。此功能仅模拟界面，不会真实支付。", "✉", { confirm: true, okText: "Send" });
      const extra = $("#modal-extra");
      const transferType = addModalField(extra, "功能类型", { tag: "select", choices: [{ value: "红包", label: "红包 / Red packet" }, { value: "转账", label: "转账 / Transfer" }] });
      const amount = addModalField(extra, "金额（元）", { type: "number", value: "52.00", min: "0.01", required: true });
      const note = addModalField(extra, "附上一句话", { value: "买杯热可可，别着凉。", maxLength: 100 });
      if (!await pending) return;
      const numericAmount = Number(amount.value);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) { showModal("金额不正确", "请输入大于 0 的有效金额。", "!"); return; }
      sendSpecialMessage({ kind: "transfer", transferType: transferType.value, amount: numericAmount, note: note.value.trim() });
    } else if (kind === "poll") {
      const pending = showModal("互动小问卷", "写一个问题，并把每个选项单独放在一行。至少需要两个选项。", "☷", { confirm: true, okText: "Send poll" });
      const extra = $("#modal-extra");
      const question = addModalField(extra, "你的问题", { value: "今晚想和我做什么？", required: true, maxLength: 120 });
      const options = addModalField(extra, "选项（每行一个）", { tag: "textarea", value: "一起看电影\n去散步\n待在家里", rows: 4, required: true, maxLength: 360 });
      if (!await pending) return;
      const choices = [...new Set(options.value.split("\n").map(item => item.trim()).filter(Boolean))].slice(0, 6);
      if (!question.value.trim() || choices.length < 2) { showModal("问卷还没准备好", "请填写问题，并提供至少两个不同的选项。", "☷"); return; }
      sendSpecialMessage({ kind: "poll", poll: { question: question.value.trim(), options: choices, votedIndex: null } });
    } else if (kind === "music") {
      const pending = showModal("分享音乐", "制作一张复古 mixtape 卡片。试听按钮为视觉模拟，不会播放真实音频。", "♫", { confirm: true, okText: "Share track" });
      const extra = $("#modal-extra");
      const track = addModalField(extra, "歌曲名称", { value: "Somewhere Only We Know", required: true, maxLength: 100 });
      const artist = addModalField(extra, "歌手 / Artist", { value: "Keane", maxLength: 80 });
      const note = addModalField(extra, "想对 TA 说", { value: "听到这首歌，就想起你了。", maxLength: 100 });
      if (!await pending) return;
      if (!track.value.trim()) { showModal("还没填写歌曲名称", "给这首歌起一个名字再分享吧。", "♫"); return; }
      sendSpecialMessage({ kind: "music", track: track.value.trim(), artist: artist.value.trim(), note: note.value.trim() });
    }
  }
  async function recordVoiceMessage() {
    const ready = await showModal("Voice memo", "开始后会发送一条 3 秒的模拟语音消息。本 Demo 不会访问麦克风或录制真实声音。", "♬", { confirm: true, okText: "Start recording" });
    if (!ready) return;
    $("#voice-btn").classList.add("recording");
    $("#modal").hidden = false;
    $("#modal-title").textContent = "Recording…"; $("#modal-text").textContent = "正在模拟录音，请稍等片刻。"; $("#modal-symbol").textContent = "◉";
    $("#modal-cancel").hidden = true; $("#modal-ok").hidden = true;
    window.setTimeout(() => {
      closeModal(false); $("#voice-btn").classList.remove("recording");
      sendSpecialMessage({ kind: "voice", duration: 3, text: "[语音消息 · 0:03]" });
    }, 1200);
  }

  function renderNotes() {
    const count = type => state.notes.filter(note => note.type === type).length;
    $("#letter-count").textContent = count("letter"); $("#diary-count").textContent = count("diary"); $("#collage-count").textContent = count("collage");
    const container = $("#notes-saved-list"); container.replaceChildren();
    const shown = state.notes.filter(note => currentNoteKind === "all" || note.type === currentNoteKind);
    if (!shown.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = currentNoteKind === "all" ? "这里还空着。点击 New Note，保存第一段文字吧。" : "还没有这类内容，点击 New Note 开始创作。"; container.append(empty); return; }
    shown.forEach(note => {
      const button = document.createElement("button"); button.type = "button"; button.className = "saved-note-row"; button.addEventListener("click", () => openNoteEditor(note.type, note.id));
      const copy = document.createElement("div"); const title = document.createElement("strong"); title.textContent = note.title || typeLabel(note.type);
      const sub = document.createElement("small"); sub.textContent = `${typeLabel(note.type)} · ${dateLabel(note.date)} · ${(note.content || "").slice(0, 42)}`;
      copy.append(title, sub); const arrow = document.createElement("span"); arrow.className = "row-arrow"; arrow.textContent = "›"; button.append(copy, arrow); container.append(button);
    });
  }
  function typeLabel(type) { return ({ letter: "Letter", diary: "Diary", collage: "Card Collage" })[type] || "Note"; }
  function openNoteEditor(type = "diary", id = null) {
    currentNoteKind = type; editingNoteId = id;
    const note = id ? state.notes.find(item => item.id === id) : null;
    $("#notes-home").hidden = true; $("#note-editor").hidden = false;
    $("#note-title").value = note?.title || ({ letter: "A letter to you", diary: "Today's fragments", collage: "Collected words" })[type] || "Untitled";
    $("#note-content").value = note?.content || (type === "collage" ? state.collected.slice(0, 4).join("\n") : "");
    $("#delete-note").hidden = !note; renderNoteCardTags(); renderLayout();
  }
  function renderNoteCardTags() {
    const container = $("#note-card-tags"); container.replaceChildren();
    if (!state.collected.length) { const empty = document.createElement("span"); empty.className = "hint"; empty.textContent = "还没有收藏的字卡。"; container.append(empty); return; }
    state.collected.forEach(card => {
      const button = document.createElement("button"); button.className = "card-tag"; button.type = "button"; button.textContent = `＋ ${card}`;
      button.addEventListener("click", () => { const box = $("#note-content"); box.value += `${box.value ? "\n" : ""}${card}`; box.focus(); }); container.append(button);
    });
  }
  function saveNote() {
    const title = $("#note-title").value.trim() || typeLabel(currentNoteKind);
    const content = $("#note-content").value.trim();
    if (!content) { showModal("Nothing to save", "先写下一点内容，再把它留存起来吧。", "✉"); return; }
    let note;
    if (editingNoteId) { note = state.notes.find(item => item.id === editingNoteId); if (note) Object.assign(note, { title, content, type: currentNoteKind, date: todayKey(), updatedAt: Date.now() }); }
    else { note = { id: uid(), type: currentNoteKind, title, content, date: todayKey(), createdAt: Date.now() }; state.notes.unshift(note); }
    saveMemoryItem(currentNoteKind, title, content); saveState();
    $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; currentNoteKind = "all"; renderLayout(); renderNotes(); renderCalendar(); renderSavedDay();
    showModal("Saved", "这段内容已保存到 Notes，也出现在对应日期的 Saved 记忆里。", "✓");
  }

  function renderCalendar() {
    const first = new Date(calendarYear, calendarMonth, 1); const lastDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    $("#calendar-title").textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const grid = $("#calendar-grid"); grid.replaceChildren();
    const offset = first.getDay(); const prevLast = new Date(calendarYear, calendarMonth, 0).getDate();
    const memoryDates = new Set(state.savedItems.map(item => item.date));
    for (let i = 0; i < 42; i++) {
      let day, year = calendarYear, month = calendarMonth, other = false;
      if (i < offset) { day = prevLast - offset + i + 1; other = true; month--; if (month < 0) { month = 11; year--; } }
      else if (i >= offset + lastDay) { day = i - offset - lastDay + 1; other = true; month++; if (month > 11) { month = 0; year++; } }
      else day = i - offset + 1;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const button = document.createElement("button"); button.type = "button"; button.textContent = day; if (other) button.classList.add("other-month");
      if (memoryDates.has(key)) button.classList.add("has-memory"); if (key === selectedDate) button.classList.add("selected");
      button.setAttribute("aria-label", key); button.addEventListener("click", () => { selectedDate = key; calendarYear = year; calendarMonth = month; renderCalendar(); renderSavedDay(); }); grid.append(button);
    }
  }
  function renderSavedDay() {
    $("#selected-date-title").textContent = `Memories · ${dateLabel(selectedDate)}`;
    const list = $("#saved-day-list"); list.replaceChildren();
    const items = state.savedItems.filter(item => item.date === selectedDate);
    $("#saved-day-count").textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    if (!items.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = "这一天还没有收藏。你可以在聊天中抽取字卡，或去 Notes 保存一段文字。"; list.append(empty); return; }
    items.forEach(item => { const card = document.createElement("article"); card.className = "saved-item"; const title = document.createElement("strong"); title.textContent = `${({ card: "✧ CARD", letter: "✉ LETTER", diary: "▤ DIARY", collage: "▧ COLLAGE" })[item.type] || "✧ MEMORY"} · ${item.title}`; const p = document.createElement("p"); p.textContent = item.text; card.append(title, p); list.append(card); });
  }
  function renderAnniversaries() {
    const list = $("#anniversary-list"); list.replaceChildren();
    if (!state.anniversaries.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = "还没有纪念日，点击右上角的 ＋ 添加一个。"; list.append(empty); return; }
    [...state.anniversaries].sort((a, b) => (a.date || "").slice(5).localeCompare((b.date || "").slice(5))).forEach(item => {
      const row = document.createElement("div"); row.className = "anniversary-item"; const date = document.createElement("div"); date.className = "anniversary-date";
      const d = new Date(`${item.date}T12:00:00`); const month = document.createElement("span"); month.textContent = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(); const day = document.createElement("strong"); day.textContent = String(d.getDate()).padStart(2, "0"); date.append(month, day);
      const info = document.createElement("div"); info.className = "anniversary-info"; const name = document.createElement("strong"); name.textContent = item.title; const note = document.createElement("small"); note.textContent = item.note || dateLabel(item.date); info.append(name, note);
      const del = document.createElement("button"); del.className = "delete-anniversary"; del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", `Delete ${item.title}`); del.addEventListener("click", async () => { if (await showModal("Delete anniversary?", `移除「${item.title}」？`, "!", { confirm: true, okText: "Delete" })) { state.anniversaries = state.anniversaries.filter(a => a.id !== item.id); saveState(); renderAnniversaries(); } });
      row.append(date, info, del); list.append(row);
    });
  }
  function addAnniversary() {
    const title = window.prompt("纪念日名称，例如：相识纪念日"); if (!title || !title.trim()) return;
    const date = window.prompt("日期（YYYY-MM-DD）", todayKey()); if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) { showModal("Date format", "请使用 YYYY-MM-DD 格式输入有效日期。", "▦"); return; }
    const note = window.prompt("补充一句备注（可留空）", "A date to remember.") || "";
    state.anniversaries.push({ id: uid(), title: title.trim(), date, note: note.trim() }); saveState(); renderAnniversaries(); renderCalendar(); showModal("Anniversary saved", "这个日子已经加入你的纪念日列表。", "♡");
  }

  function renderMe() {
    $("#me-name").textContent = state.profileName; $("#me-signature").textContent = state.signature;
    const enabledCount = allCards().length;
    $("#custom-card-count").textContent = `${state.customCards.length} / ${enabledCount} active`;
    renderCardGroups();
    renderManagedCards();
    renderCardGroupSelect();
    const batchInput = $("#custom-card-batch");
    if (batchInput && !batchInput.value) batchInput.placeholder = "一行一句，可一次粘贴多张字卡……";
  }

  function isCardActive(card) {
    if (!card.enabled) return false;
    if (!card.groupId) return true;
    const group = state.cardGroups.find(item => item.id === card.groupId);
    return Boolean(group && group.enabled);
  }

  function renderCardGroupSelect() {
    const select = $("#custom-card-group");
    if (!select) return;
    const prior = select.value;
    select.replaceChildren();
    const ungrouped = document.createElement("option"); ungrouped.value = ""; ungrouped.textContent = "不分组 / Ungrouped"; select.append(ungrouped);
    state.cardGroups.forEach(group => {
      const option = document.createElement("option"); option.value = group.id; option.textContent = `${group.name}${group.enabled ? "" : "（已禁用）"}`; select.append(option);
    });
    if ([...select.options].some(option => option.value === prior)) select.value = prior;
  }

  function renderCardGroups() {
    const container = $("#card-group-list");
    container.replaceChildren();
    if (!state.cardGroups.length) {
      const empty = document.createElement("div"); empty.className = "empty-message";
      empty.textContent = "还没有分组。可以创建「日常」「吃醋」「问候」等分组，再将字卡归入其中。";
      container.append(empty); return;
    }
    state.cardGroups.forEach(group => {
      const cards = state.customCards.filter(card => card.groupId === group.id);
      const row = document.createElement("div"); row.className = "card-group-row";
      const main = document.createElement("div"); main.className = "card-group-main";
      const name = document.createElement("strong"); name.textContent = group.name;
      const count = document.createElement("small"); count.textContent = `${cards.length} 张字卡 · ${cards.filter(card => card.enabled).length} 张单条启用`;
      main.append(name, count);
      const switchLabel = document.createElement("label"); switchLabel.className = "retro-switch"; switchLabel.title = group.enabled ? "禁用此分组" : "启用此分组";
      const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = group.enabled; toggle.setAttribute("aria-label", `${group.name} 分组启用状态`);
      toggle.addEventListener("change", () => {
        group.enabled = toggle.checked;
        // Group switch controls all cards in the group in one action.
        state.customCards.filter(card => card.groupId === group.id).forEach(card => { card.enabled = toggle.checked; });
        saveState(); renderMe();
      });
      const slider = document.createElement("span"); slider.className = "retro-slider"; switchLabel.append(toggle, slider);
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "tiny-metal-btn"; edit.textContent = "Edit"; edit.addEventListener("click", () => editCardGroup(group.id));
      const del = document.createElement("button"); del.type = "button"; del.className = "tiny-metal-btn danger"; del.textContent = "×"; del.setAttribute("aria-label", `删除${group.name}分组`); del.addEventListener("click", () => deleteCardGroup(group.id));
      row.append(main, switchLabel, edit, del); container.append(row);
    });
  }

  function renderManagedCards() {
    const container = $("#custom-card-list");
    container.replaceChildren();
    if (!state.customCards.length) {
      const empty = document.createElement("div"); empty.className = "empty-message";
      empty.textContent = "字卡库目前为空。添加或导入你自己的短句后，已启用的字卡才会参与随机回复。";
      container.append(empty); return;
    }
    const sections = [{ id: "", name: "未分组 / Ungrouped" }, ...state.cardGroups.map(group => ({ id: group.id, name: group.name }))];
    sections.forEach(section => {
      const cards = state.customCards.filter(card => card.groupId === section.id || (section.id === "" && !card.groupId));
      if (!cards.length) return;
      const title = document.createElement("div"); title.className = "managed-group-label"; title.textContent = `${section.name} · ${cards.length}`; container.append(title);
      cards.forEach(card => {
        const row = document.createElement("div"); row.className = `custom-card-item${isCardActive(card) ? " is-active" : " is-inactive"}`;
        const text = document.createElement("span"); text.className = "managed-card-text"; text.textContent = card.text;
        const activeLabel = document.createElement("label"); activeLabel.className = "retro-switch card-switch"; activeLabel.title = "单条字卡启用状态";
        const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = card.enabled; toggle.setAttribute("aria-label", `启用字卡：${card.text}`);
        toggle.addEventListener("change", () => { card.enabled = toggle.checked; saveState(); renderMe(); });
        const slider = document.createElement("span"); slider.className = "retro-slider"; activeLabel.append(toggle, slider);
        const edit = document.createElement("button"); edit.type = "button"; edit.className = "tiny-metal-btn"; edit.textContent = "Edit"; edit.addEventListener("click", () => editCard(card.id));
        const del = document.createElement("button"); del.type = "button"; del.className = "tiny-metal-btn danger"; del.textContent = "×"; del.setAttribute("aria-label", "Delete card"); del.addEventListener("click", () => deleteCard(card.id));
        row.append(text, activeLabel, edit, del); container.append(row);
      });
    });
  }

  async function addCardsFromText(text, groupId = "") {
    const candidates = text.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    if (!candidates.length) { showModal("没有发现字卡", "请先输入或粘贴内容，每行写一句字卡。", "✧"); return 0; }
    const existing = new Set(state.customCards.map(card => card.text.toLocaleLowerCase()));
    let added = 0; let skipped = 0;
    candidates.forEach(value => {
      if (existing.has(value.toLocaleLowerCase())) { skipped++; return; }
      state.customCards.unshift({ id: uid(), text: value, groupId: state.cardGroups.some(group => group.id === groupId) ? groupId : "", enabled: true, createdAt: Date.now() });
      existing.add(value.toLocaleLowerCase()); added++;
    });
    if (added) { saveState(); renderMe(); }
    showModal(added ? "字卡已加入" : "没有新增字卡", `新增 ${added} 张${skipped ? `，跳过重复内容 ${skipped} 条` : ""}。已启用的字卡才会参与聊天随机回复。`, added ? "✓" : "✧");
    return added;
  }

  function parseCSVRows(source) {
    const rows = []; let row = []; let field = ""; let quoted = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '"' && quoted && source[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { row.push(field.trim()); field = ""; }
      else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && source[i + 1] === "\n") i++;
        row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = "";
      } else field += ch;
    }
    row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  async function importCardFile(file) {
    if (!file) return;
    try {
      const source = (await file.text()).replace(/^\uFEFF/, "");
      let lines;
      if (/\.csv$/i.test(file.name) || file.type.includes("csv")) {
        const rows = parseCSVRows(source);
        const header = (rows[0] || []).map(cell => cell.toLowerCase());
        const cardColumn = header.findIndex(cell => /^(card|text|content|sentence|phrase|字卡|句子|内容|文案)$/.test(cell));
        const hasHeader = cardColumn >= 0;
        const column = hasHeader ? cardColumn : 0;
        lines = rows.slice(hasHeader ? 1 : 0).map(row => row[column] || row.find(Boolean) || "");
      } else lines = source.split(/\r?\n/);
      await addCardsFromText(lines.join("\n"), $("#custom-card-group").value);
    } catch (error) { showModal("导入失败", "无法读取这个文件。请使用 UTF-8 编码的 .txt 或 .csv 文件。", "!"); }
    $("#card-file-input").value = "";
  }

  async function editCardGroup(groupId) {
    const group = state.cardGroups.find(item => item.id === groupId); if (!group) return;
    const pending = showModal("编辑字卡分组", "为这组字卡取一个容易辨认的名字。", "▤", { confirm: true, okText: "Save" });
    const input = addModalField($("#modal-extra"), "分组名称", { value: group.name, required: true, maxLength: 40 });
    if (!await pending) return;
    const name = input.value.trim(); if (!name) { showModal("分组名称不能为空", "请输入一个分组名称。", "!"); return; }
    if (state.cardGroups.some(item => item.id !== groupId && item.name.toLowerCase() === name.toLowerCase())) { showModal("分组已存在", "请使用一个不同的分组名称。", "!"); return; }
    group.name = name; saveState(); renderMe();
  }

  async function createCardGroup() {
    const pending = showModal("新建字卡分组", "例如：日常、吃醋、问候。", "▤", { confirm: true, okText: "Create" });
    const input = addModalField($("#modal-extra"), "分组名称", { placeholder: "例如：日常", required: true, maxLength: 40 });
    if (!await pending) return;
    const name = input.value.trim(); if (!name) { showModal("分组名称不能为空", "请输入一个分组名称。", "!"); return; }
    if (state.cardGroups.some(item => item.name.toLowerCase() === name.toLowerCase())) { showModal("分组已存在", "这个分组已经创建过了。", "!"); return; }
    state.cardGroups.push({ id: uid(), name, enabled: true }); saveState(); renderMe();
  }

  async function deleteCardGroup(groupId) {
    const group = state.cardGroups.find(item => item.id === groupId); if (!group) return;
    if (!await showModal("删除这个分组？", `「${group.name}」中的字卡不会删除，而是移到未分组。`, "!", { confirm: true, okText: "Delete group" })) return;
    state.customCards.filter(card => card.groupId === groupId).forEach(card => { card.groupId = ""; });
    state.cardGroups = state.cardGroups.filter(item => item.id !== groupId); saveState(); renderMe();
  }

  async function editCard(cardId) {
    const card = state.customCards.find(item => item.id === cardId); if (!card) return;
    const pending = showModal("编辑字卡", "修改内容或调整它所属的分组。", "✎", { confirm: true, okText: "Save" });
    const content = addModalField($("#modal-extra"), "字卡内容", { tag: "textarea", value: card.text, rows: 3, required: true, maxLength: 500 });
    const groupField = addModalField($("#modal-extra"), "所属分组", { tag: "select", choices: [{ value: "", label: "不分组 / Ungrouped" }, ...state.cardGroups.map(group => ({ value: group.id, label: group.name }))], value: card.groupId });
    if (!await pending) return;
    const text = content.value.trim(); if (!text) { showModal("内容不能为空", "字卡内容不能为空。", "!"); return; }
    if (state.customCards.some(item => item.id !== cardId && item.text.toLowerCase() === text.toLowerCase())) { showModal("重复字卡", "字卡库中已经有相同内容。", "!"); return; }
    card.text = text; card.groupId = groupField.value; saveState(); renderMe();
  }

  async function deleteCard(cardId) {
    const card = state.customCards.find(item => item.id === cardId); if (!card) return;
    if (!await showModal("删除这张字卡？", card.text, "!", { confirm: true, okText: "Delete" })) return;
    state.customCards = state.customCards.filter(item => item.id !== cardId); saveState(); renderMe();
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "retro-otome-backup.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  function updateClock() { $("#status-time").textContent = nowTime(); }

  $$(".tab-item").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $("#back-btn").addEventListener("click", () => { if (inChat) { inChat = false; renderLayout(); renderConversations(); } else { $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; renderLayout(); renderNotes(); } });
  $("#composer").addEventListener("submit", event => { event.preventDefault(); sendMessage($("#message-input").value); });
  $("#more-btn").addEventListener("click", () => toggleComposerPanel("extension"));
  $("#sticker-btn").addEventListener("click", () => toggleComposerPanel("stickers"));
  $("#close-extension").addEventListener("click", () => { $("#extension-panel").hidden = true; });
  $("#close-stickers").addEventListener("click", () => { $("#sticker-tray").hidden = true; });
  $$("[data-extension]").forEach(button => button.addEventListener("click", () => composeExtension(button.dataset.extension)));
  $$("[data-sticker]").forEach(button => button.addEventListener("click", () => { const sticker = button.dataset.sticker; $("#sticker-tray").hidden = true; sendSpecialMessage({ kind: "sticker", text: sticker }, true); }));
  $("#camera-btn").addEventListener("click", () => showModal("Camera", "这是一个复古界面 Demo，目前不会调用设备相机或上传真实照片。", "▣"));
  $("#voice-btn").addEventListener("click", recordVoiceMessage);
  $$(".action-btn").forEach(button => button.addEventListener("click", () => {
    const actions = { call: ["Call", "正在模拟拨打语音电话……对方暂时无法接听。", "☎"], facetime: ["FaceTime", "正在连接视频信号……这是视觉演示，不会发起真实视频通话。", "▣"], contact: ["Contact", "联系人卡片已打开。转账为视觉模拟，不会发起真实支付。", "♙"] };
    showModal(...actions[button.dataset.action]);
  }));
  $("#modal-ok").addEventListener("click", () => closeModal(true)); $("#modal-cancel").addEventListener("click", () => closeModal(false));
  $("#modal").addEventListener("click", event => { if (event.target === $("#modal")) closeModal(false); }); document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(false); });
  $$(".mood-chip").forEach(button => button.addEventListener("click", () => { currentFilter = button.dataset.filter; $$(".mood-chip").forEach(chip => chip.classList.toggle("active", chip === button)); renderConversations(); }));
  $("#profile-done").addEventListener("click", () => showModal("Profile", "个人主页已就绪。新的聊天字卡会被收进 Saved。", "♡"));
  $$(".notes-row").forEach(button => button.addEventListener("click", () => {
    currentNoteKind = button.dataset.noteKind;
    $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null;
    renderNotes(); renderLayout();
  }));
  $("#new-note").addEventListener("click", () => {
    if (["letter", "diary", "collage"].includes(currentNoteKind)) { openNoteEditor(currentNoteKind); return; }
    const choice = window.prompt("新建内容类型：输入 letter（信件）、diary（日记）或 collage（字卡拼贴）", "diary");
    if (!choice) return; const type = choice.trim().toLowerCase(); if (!["letter", "diary", "collage"].includes(type)) { showModal("Type not found", "请输入 letter、diary 或 collage。", "✉"); return; } openNoteEditor(type);
  });
  $("#notes-back").addEventListener("click", () => { $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; currentNoteKind = "all"; renderLayout(); renderNotes(); });
  $("#save-note").addEventListener("click", saveNote);
  $("#delete-note").addEventListener("click", async () => { if (!editingNoteId) return; const note = state.notes.find(n => n.id === editingNoteId); if (await showModal("Delete this note?", note?.title || "This note", "!", { confirm: true, okText: "Delete" })) { state.notes = state.notes.filter(n => n.id !== editingNoteId); saveState(); $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; currentNoteKind = "all"; renderLayout(); renderNotes(); } });
  $("#month-prev").addEventListener("click", () => { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(); });
  $("#month-next").addEventListener("click", () => { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(); });
  $("#add-anniversary").addEventListener("click", addAnniversary);
  $("#custom-card-form").addEventListener("submit", async event => {
    event.preventDefault();
    const input = $("#custom-card-batch");
    const added = await addCardsFromText(input.value, $("#custom-card-group").value);
    if (added) input.value = "";
  });
  $("#create-card-group").addEventListener("click", createCardGroup);
  $("#import-card-file").addEventListener("click", () => $("#card-file-input").click());
  $("#card-file-input").addEventListener("change", event => importCardFile(event.target.files?.[0]));
  $("#enable-all-cards").addEventListener("click", () => {
    state.cardGroups.forEach(group => { group.enabled = true; }); state.customCards.forEach(card => { card.enabled = true; });
    saveState(); renderMe(); showModal("全部已启用", "所有字卡及分组已开启，将参与随机回复。", "✓");
  });
  $("#disable-all-cards").addEventListener("click", () => {
    state.cardGroups.forEach(group => { group.enabled = false; }); state.customCards.forEach(card => { card.enabled = false; });
    saveState(); renderMe(); showModal("全部已禁用", "所有字卡及分组均已关闭；聊天将不会抽取默认短句。", "⊘");
  });
  $("#edit-profile").addEventListener("click", () => { const name = window.prompt("新的显示名称：", state.profileName); if (name !== null && name.trim()) { state.profileName = name.trim(); $("#profile-name").textContent = state.profileName; saveState(); renderMe(); } });
  $("#edit-signature").addEventListener("click", () => { const signature = window.prompt("输入个人签名：", state.signature); if (signature !== null) { state.signature = signature.trim(); $("#profile-signature").textContent = state.signature; saveState(); renderMe(); } });
  $("#export-data").addEventListener("click", downloadJson);
  $("#reset-data").addEventListener("click", async () => { if (await showModal("Reset local data?", "这会清除本浏览器中的 Notes、字卡、聊天记录和自定义纪念日。", "!", { confirm: true, okText: "Reset" })) { state = freshState(); saveState(); selectedDate = todayKey(); calendarYear = new Date().getFullYear(); calendarMonth = new Date().getMonth(); $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature; renderConversations(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderNotes(); switchTab("message"); showModal("Reset complete", "本地数据已恢复为初始 Demo 内容。", "✓"); } });
  $("#top-action").addEventListener("click", () => { if (activeTab === "notes" && !$("#note-editor").hidden) saveNote(); else if (activeTab === "notes") $("#new-note").click(); else if (activeTab === "saved") addAnniversary(); else if (activeTab === "me") showModal("Edit profile", "你可以在 Me 页面修改显示名称、签名和自定义字卡库。", "✎"); else showModal("Message", "选择一条会话即可开始聊天。发送任意内容后，TA 会随机回复一张字卡。", "✎"); });

  $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature; updateClock(); window.setInterval(updateClock, 30000);
  renderConversations(); renderMessages(); renderNotes(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderLayout();
})();
