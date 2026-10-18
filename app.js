(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "retroOtome_final_v3";
  const BASE_CARDS = [
    "你吃饭了吗？不许总吃外卖。", "你想干嘛？", "今晚月色很美，但我只看着你。",
    "又在发呆了吗？把手伸过来。", "刚刚忽然很想听你的声音。", "无论多晚，我的讯号永远向你开放。",
    "今天的疲惫，就暂存在我这里吧。", "我买了两张周末的电影票，要一起吗。", "笨蛋，天冷了怎么不多穿一件。",
    "你不用每次都表现得很坚强。", "等雨停了，我们就去散步吧。", "晚安。要记得在梦里见我。",
    "你现在是在想我吗？", "到家了告诉我。", "今天也有一点点想你。", "别躲，我看见你了。"
  ];
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
  const freshState = () => {
    const today = todayKey();
    const sampleCards = ["今晚月色很美，但我只看着你。", "Its cold outta here"];
    return {
      profileName: "heartYEAH:)", signature: "A leaf that remains evergreen", customCards: [], collected: sampleCards,
      messages: clone(DEFAULT_MESSAGES), previews: {}, notes: [],
      savedItems: sampleCards.map((text, i) => ({ id: uid(), date: today, type: "card", title: "Collected card", text, createdAt: Date.now() + i })),
      anniversaries: [
        { id: "anniv-meet", title: "相识纪念日", date: "2026-05-14", note: "The day our story began." },
        { id: "anniv-first", title: "第一次约会", date: "2026-06-01", note: "A tiny date worth remembering." }
      ]
    };
  };
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return freshState();
      const parsed = JSON.parse(saved);
      const base = freshState();
      return { ...base, ...parsed, messages: { ...clone(DEFAULT_MESSAGES), ...(parsed.messages || {}) }, notes: Array.isArray(parsed.notes) ? parsed.notes : [], savedItems: Array.isArray(parsed.savedItems) ? parsed.savedItems : [], anniversaries: Array.isArray(parsed.anniversaries) ? parsed.anniversaries : [], collected: Array.isArray(parsed.collected) ? parsed.collected : [], customCards: Array.isArray(parsed.customCards) ? parsed.customCards : [] };
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
  function allCards() { return [...BASE_CARDS, ...state.customCards]; }
  function showModal(title, message, symbol = "✦", options = {}) {
    $("#modal-title").textContent = title; $("#modal-text").textContent = message; $("#modal-symbol").textContent = symbol;
    $("#modal-cancel").hidden = !options.confirm; $("#modal-ok").textContent = options.okText || (options.confirm ? "Confirm" : "Okay");
    $("#modal").hidden = false;
    return new Promise(resolve => { modalResolver = resolve; });
  }
  function closeModal(result = false) { $("#modal").hidden = true; if (modalResolver) { modalResolver(result); modalResolver = null; } }

  function renderLayout() {
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
    const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = message.text;
    const meta = document.createElement("div"); meta.className = "message-meta"; meta.textContent = `${message.time || nowTime()} ${message.type === "sent" ? "Delivered" : "Read"}`;
    group.append(bubble, meta); container.append(group);
  }
  function saveMemoryItem(type, title, text, date = todayKey()) {
    state.savedItems.unshift({ id: uid(), date, type, title, text, createdAt: Date.now() });
    saveState();
  }
  function receiveCard(contactId) {
    const pool = allCards();
    const card = pool[Math.floor(Math.random() * pool.length)] || "你想干嘛？";
    const message = { text: card, type: "received", time: nowTime() };
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
    const id = activeContactId; if (!state.messages[id]) state.messages[id] = [];
    state.messages[id].push({ text: value, type: "sent", time: nowTime() }); state.previews[id] = value;
    saveState(); $("#message-input").value = ""; renderMessages(); renderConversations();
    window.setTimeout(() => receiveCard(id), 550);
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
    $("#custom-card-count").textContent = state.customCards.length;
    const list = $("#custom-card-list"); list.replaceChildren();
    if (!state.customCards.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = "自定义字卡暂时为空。添加后，聊天回复也可能抽到它。"; list.append(empty); return; }
    state.customCards.forEach((card, index) => { const row = document.createElement("div"); row.className = "custom-card-item"; const text = document.createElement("span"); text.textContent = card; const del = document.createElement("button"); del.type = "button"; del.textContent = "×"; del.setAttribute("aria-label", "Delete card"); del.addEventListener("click", async () => { if (await showModal("Remove this card?", card, "!", { confirm: true, okText: "Remove" })) { state.customCards.splice(index, 1); saveState(); renderMe(); } }); row.append(text, del); list.append(row); });
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "retro-otome-backup.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  function updateClock() { $("#status-time").textContent = nowTime(); }

  $$(".tab-item").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $("#back-btn").addEventListener("click", () => { if (inChat) { inChat = false; renderLayout(); renderConversations(); } else { $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; renderLayout(); renderNotes(); } });
  $("#composer").addEventListener("submit", event => { event.preventDefault(); sendMessage($("#message-input").value); });
  $("#camera-btn").addEventListener("click", () => showModal("Camera", "这是一个网页界面 Demo，暂不调用设备相机。", "◎"));
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
  $("#custom-card-form").addEventListener("submit", event => { event.preventDefault(); const value = $("#custom-card-input").value.trim(); if (!value) return; if (state.customCards.includes(value) || BASE_CARDS.includes(value)) { showModal("Already in the deck", "这句话已经存在于字卡库中。", "✧"); return; } state.customCards.unshift(value); $("#custom-card-input").value = ""; saveState(); renderMe(); showModal("Card added", "你的自定义字卡已加入随机回复库。", "✓"); });
  $("#edit-profile").addEventListener("click", () => { const name = window.prompt("新的显示名称：", state.profileName); if (name !== null && name.trim()) { state.profileName = name.trim(); $("#profile-name").textContent = state.profileName; saveState(); renderMe(); } });
  $("#edit-signature").addEventListener("click", () => { const signature = window.prompt("输入个人签名：", state.signature); if (signature !== null) { state.signature = signature.trim(); $("#profile-signature").textContent = state.signature; saveState(); renderMe(); } });
  $("#export-data").addEventListener("click", downloadJson);
  $("#reset-data").addEventListener("click", async () => { if (await showModal("Reset local data?", "这会清除本浏览器中的 Notes、字卡、聊天记录和自定义纪念日。", "!", { confirm: true, okText: "Reset" })) { state = freshState(); saveState(); selectedDate = todayKey(); calendarYear = new Date().getFullYear(); calendarMonth = new Date().getMonth(); $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature; renderConversations(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderNotes(); switchTab("message"); showModal("Reset complete", "本地数据已恢复为初始 Demo 内容。", "✓"); } });
  $("#top-action").addEventListener("click", () => { if (activeTab === "notes" && !$("#note-editor").hidden) saveNote(); else if (activeTab === "notes") $("#new-note").click(); else if (activeTab === "saved") addAnniversary(); else if (activeTab === "me") showModal("Edit profile", "你可以在 Me 页面修改显示名称、签名和自定义字卡库。", "✎"); else showModal("Message", "选择一条会话即可开始聊天。发送任意内容后，TA 会随机回复一张字卡。", "✎"); });

  $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature; updateClock(); window.setInterval(updateClock, 30000);
  renderConversations(); renderMessages(); renderNotes(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderLayout();
})();
