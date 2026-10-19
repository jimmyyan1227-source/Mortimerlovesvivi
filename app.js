(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "retroOtome_final_v3";
  let CONTACTS = [
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
    profileName: "heartYEAH:)", signature: "A leaf that remains evergreen", profileAvatar: "", customContacts: [],
    // The card library intentionally starts empty: only user-created/imported cards can reply.
    customCards: [], cardGroups: [], collected: [], messages: clone(DEFAULT_MESSAGES), previews: {}, notes: [],
    savedItems: [], pinnedContacts: [], hiddenContacts: [], deletedContacts: [], chatPreferences: {}, customStickers: [],
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
        customContacts: Array.isArray(parsed.customContacts) ? parsed.customContacts : [],
        messages: { ...clone(DEFAULT_MESSAGES), ...(parsed.messages || {}) },
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        // Saved now contains only explicit manual message saves. Legacy auto-captured chat/note rows are excluded.
        savedItems: Array.isArray(parsed.savedItems) ? parsed.savedItems.filter(item => ["single-message", "group-chat"].includes(item.type)) : [],
        pinnedContacts: Array.isArray(parsed.pinnedContacts) ? parsed.pinnedContacts : [],
        hiddenContacts: Array.isArray(parsed.hiddenContacts) ? parsed.hiddenContacts : [],
        deletedContacts: Array.isArray(parsed.deletedContacts) ? parsed.deletedContacts : [],
        chatPreferences: parsed.chatPreferences && typeof parsed.chatPreferences === "object" ? parsed.chatPreferences : {},
        customStickers: Array.isArray(parsed.customStickers) ? [...new Set(parsed.customStickers.map(sticker => String(sticker || "").trim()).filter(Boolean))].slice(0, 200) : [],
        anniversaries: Array.isArray(parsed.anniversaries) ? parsed.anniversaries : [],
        collected: Array.isArray(parsed.collected) ? parsed.collected : [],
        customCards, cardGroups
      };
    } catch (error) { console.warn("Saved data could not be read; loading defaults.", error); return freshState(); }
  }
  let state = loadState();
  CONTACTS = [...CONTACTS, ...(state.customContacts || []).filter(c => c && c.id && c.name)];
  let activeTab = "message";
  let inChat = false;
  let activeContactId = "heart";
  let currentFilter = "all";
  let editingNoteId = null;
  let currentNoteKind = "all";
  let selectedNoteIds = new Set();
  let readingNoteId = null;
  const now = new Date();
  let calendarYear = now.getFullYear();
  let calendarMonth = now.getMonth();
  let selectedDate = todayKey();
  let modalResolver = null;
  let showHiddenContacts = false;
  let selectionMode = false;
  const selectedMessageIds = new Set();
  let longPressTimer = null;
  let pressStart = null;
  let suppressMessageClickUntil = 0;
  let openMessageMenuId = null;
  const CARD_UI_KEY = "retroOtome_cardLibraryUI_v1";
  let cardUI = (() => { try { return { listCollapsed: true, groupManagerCollapsed: true, collapsedGroups: {}, ...(JSON.parse(localStorage.getItem(CARD_UI_KEY) || "{}")) }; } catch { return { listCollapsed: true, groupManagerCollapsed: true, collapsedGroups: {} }; } })();
  const selectedCardIds = new Set();
  function saveCardUI() { try { localStorage.setItem(CARD_UI_KEY, JSON.stringify(cardUI)); } catch {} }

  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.warn("Local storage could not be written.", error); } }
  function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
  function dateLabel(dateStr) { const d = new Date(`${dateStr}T12:00:00`); return Number.isNaN(d.getTime()) ? dateStr : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; }
  function featurePhoneTimestamp(note) {
    let date = note?.createdAt || note?.updatedAt;
    date = date ? new Date(date) : new Date(`${note?.date || todayKey()}T12:00:00`);
    if (Number.isNaN(date.getTime())) date = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${months[date.getMonth()]}-${date.getFullYear()} ${hour}:${minute}`;
  }
  function currentContact() { return CONTACTS.find(c => c.id === activeContactId) || CONTACTS[0]; }
  function allCards() {
    const enabledGroups = new Set(state.cardGroups.filter(group => group.enabled).map(group => group.id));
    return state.customCards.filter(card => card.enabled && (!card.groupId || enabledGroups.has(card.groupId)));
  }
  const DEFAULT_CHAT_PREFERENCES = Object.freeze({
    multiCardsEnabled: false, cardCount: 2, autoPunctuation: true, stickerEnabled: false,
    delayMin: 1, delayMax: 3, noReplyEnabled: true, replyProbability: 70,
    ttsEnabled: false, minimaxApiKey: "", minimaxGroupId: "", ttsModel: "speech-2.8-hd", voiceId: "", ttsLanguage: "原文", ttsSpeed: 1, ttsGender: "男", ttsEmotion: "温柔体贴", ttsCustomEmotion: "",
    autoTranslateCards: false, showTranslatedText: true
  });
  const STICKER_INSERTION_CHANCE = 0.2;
  const BUILT_IN_STICKERS = [
    "(^３^)", "ヽ(｡ゝω・｡)ﾉ", "((ﾐ´ω`ﾐ))", "(=^ω^=)", "(*-ω-)", "↖(^ω^)↗",
    "Y(^_^)Y", "(｡･ω･｡)", "Σ(・ω・`|||)", "#^_^#", ">_<¦¦¦", "^ω^"
  ];
  function getChatPreferences(contactId = activeContactId) {
    const stored = state.chatPreferences?.[contactId] || {};
    return { ...DEFAULT_CHAT_PREFERENCES, ...stored };
  }
  function setChatPreferences(contactId, preferences) {
    if (!state.chatPreferences || typeof state.chatPreferences !== "object") state.chatPreferences = {};
    state.chatPreferences[contactId] = { ...DEFAULT_CHAT_PREFERENCES, ...preferences };
    saveState();
  }
  function showModal(title, message, symbol = "✦", options = {}) {
    $("#modal-title").textContent = title; $("#modal-text").textContent = message; $("#modal-symbol").textContent = symbol;
    $("#modal-extra").replaceChildren();
    $("#modal-cancel").hidden = !options.confirm; $("#modal-ok").hidden = false;
    $("#modal-ok").textContent = options.okText || (options.confirm ? "Confirm" : "Okay");
    $("#modal").classList.toggle("context-menu-open", Boolean(options.menu));
    $("#modal").hidden = false;
    return new Promise(resolve => { modalResolver = resolve; });
  }
  function closeModal(result = false) { $("#modal").hidden = true; $("#modal").classList.remove("context-menu-open"); openMessageMenuId = null; if (modalResolver) { modalResolver(result); modalResolver = null; } }
  async function showDiagnosticError(title, error, details = {}) {
    const message = error?.message || String(error || "未知错误");
    const diagnostic = [
      `错误类型：${error?.name || "Error"}`,
      `错误信息：${message}`,
      ...Object.entries(details).map(([key, value]) => `${key}：${value}`),
      error?.stack ? `堆栈：${error.stack}` : ""
    ].filter(Boolean).join("\n");
    console.error(`[${title}]`, { error, details, diagnostic });
    const modalPromise = showModal(title, diagnostic, "!", { okText: "关闭" });
    const extra = $("#modal-extra");
    const copyButton = document.createElement("button");
    copyButton.type = "button"; copyButton.className = "chrome-btn"; copyButton.textContent = "复制错误详情";
    copyButton.addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(diagnostic);
        else { const area = document.createElement("textarea"); area.value = diagnostic; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); }
        copyButton.textContent = "已复制，可发给开发者";
      } catch (_) { copyButton.textContent = "复制失败，请手动选中错误文字"; }
    });
    extra.append(copyButton);
    return modalPromise;
  }

  function renderLayout() {
    if (!(activeTab === "message" && inChat)) { $("#extension-panel").hidden = true; $("#sticker-tray").hidden = true; }
    const messageListVisible = activeTab === "message" && !inChat;
    $("#page-message").hidden = !messageListVisible;
    $("#page-chat").hidden = !(activeTab === "message" && inChat);
    $("#page-notes").hidden = activeTab !== "notes";
    $("#page-saved").hidden = activeTab !== "saved";
    $("#page-me").hidden = activeTab !== "me";
    $$(".tab-item").forEach(button => button.classList.toggle("active", button.dataset.tab === activeTab));
    $("#back-btn").hidden = !(inChat || (activeTab === "notes" && (!$("#note-editor").hidden || !$("#note-collection").hidden || !$("#note-reader").hidden)));
    const readingNote = state.notes.find(note => note.id === readingNoteId);
    $(".phone").classList.toggle("feature-reader-active", activeTab === "notes" && !$("#note-reader").hidden && ["letter", "diary"].includes(readingNote?.type));
    $("#top-action").hidden = false;
    $(".tab-bar").hidden = activeTab === "message" && inChat;
    $("#add-contact-btn").hidden = !(activeTab === "message" && !inChat);
    $(".phone").classList.toggle("chat-immersive", activeTab === "message" && inChat);
    const titles = { message: inChat ? currentContact().name : "Message", notes: !$("#note-reader").hidden ? (currentNoteKind === "diary" ? "Diary" : "Letter") : !$("#note-editor").hidden ? "Note Editor" : !$("#note-collection").hidden ? ({ letter: "Letters", diary: "Diary", all: "All Fragments" }[currentNoteKind] || "Notes") : "Notes", saved: "Saved", me: "Me" };
    $("#top-title").textContent = titles[activeTab];
    $("#top-action").textContent = activeTab === "message" && inChat ? "Edit" : activeTab === "notes" ? (!$("#note-editor").hidden ? "Save" : (!$("#note-reader").hidden ? "Edit" : "＋ New")) : activeTab === "saved" ? "+ Date" : (activeTab === "message" && !inChat && state.hiddenContacts.length ? (showHiddenContacts ? "Hide list" : `Hidden ${state.hiddenContacts.length}`) : "Edit");
  }
  function switchTab(tab) {
    activeTab = tab; inChat = false; endSelectionMode();
    if (tab === "notes") { $("#notes-home").hidden = false; $("#notes-music-board").hidden = true; $("#note-collection").hidden = true; $("#note-reader").hidden = true; $("#note-editor").hidden = true; editingNoteId = null; readingNoteId = null; selectedNoteIds.clear(); }
    renderLayout();
    if (tab === "message") renderConversations();
    if (tab === "notes") renderNotes();
    if (tab === "saved") { renderCalendar(); renderSavedDay(); renderAnniversaries(); }
    if (tab === "me") renderMe();
  }
  function openChat(id) { activeContactId = id; inChat = true; activeTab = "message"; endSelectionMode(); renderLayout(); renderMessages(); }

  function renderConversations() {
    const list = $("#conversation-list"); list.replaceChildren();
    const contacts = CONTACTS.filter(contact => !state.deletedContacts.includes(contact.id))
      .filter(contact => showHiddenContacts || !state.hiddenContacts.includes(contact.id))
      .filter(contact => currentFilter === "all" || contact.mood === currentFilter || contact.mood === "all")
      .sort((a, b) => Number(state.pinnedContacts.includes(b.id)) - Number(state.pinnedContacts.includes(a.id)));
    if (!contacts.length) {
      const empty = document.createElement("div"); empty.className = "empty-message";
      empty.textContent = showHiddenContacts ? "没有隐藏的会话。" : "这里暂时没有会话。"; list.append(empty); return;
    }
    contacts.forEach(contact => {
      const shell = document.createElement("div"); shell.className = "conversation-shell";
      if (state.pinnedContacts.includes(contact.id)) shell.classList.add("is-pinned");
      if (state.hiddenContacts.includes(contact.id)) shell.classList.add("is-hidden-contact");
      const actions = document.createElement("div"); actions.className = "conversation-actions";
      const makeAction = (label, cls, fn) => {
        const button = document.createElement("button"); button.type = "button"; button.className = `conversation-action ${cls || ""}`; button.textContent = label;
        button.addEventListener("click", event => { event.stopPropagation(); fn(shell, contact); }); actions.append(button);
      };
      makeAction(state.pinnedContacts.includes(contact.id) ? "Unpin" : "Pin", "pin-action", () => {
        state.pinnedContacts = state.pinnedContacts.includes(contact.id) ? state.pinnedContacts.filter(id => id !== contact.id) : [...state.pinnedContacts, contact.id];
        saveState(); renderConversations();
      });
      makeAction(state.hiddenContacts.includes(contact.id) ? "Restore" : "Hide", "hide-action", () => {
        state.hiddenContacts = state.hiddenContacts.includes(contact.id) ? state.hiddenContacts.filter(id => id !== contact.id) : [...state.hiddenContacts, contact.id];
        showHiddenContacts = false; saveState(); renderConversations(); renderLayout();
      });
      makeAction("Delete", "delete-action", async () => {
        if (!await showModal("删除这段会话？", `「${contact.name}」的聊天列表和本地对话记录将被删除。已手动收藏到 Saved 的记录会保留。`, "!", { confirm: true, okText: "Delete" })) return;
        state.deletedContacts = [...new Set([...state.deletedContacts, contact.id])];
        state.hiddenContacts = state.hiddenContacts.filter(id => id !== contact.id); state.pinnedContacts = state.pinnedContacts.filter(id => id !== contact.id);
        delete state.messages[contact.id]; delete state.previews[contact.id]; saveState(); renderConversations();
      });
      const button = document.createElement("button"); button.type = "button"; button.className = "conversation";
      const img = document.createElement("img"); img.src = contact.avatar; img.alt = "";
      const copy = document.createElement("div"); copy.className = "convo-copy";
      const head = document.createElement("div"); head.className = "convo-head";
      const name = document.createElement("span"); name.className = "convo-name"; name.textContent = `${state.pinnedContacts.includes(contact.id) ? "◆ " : ""}${contact.name}`;
      const time = document.createElement("span"); time.className = "convo-time"; time.textContent = contact.time;
      const preview = document.createElement("div"); preview.className = "convo-preview"; preview.textContent = state.previews[contact.id] || contact.preview;
      head.append(name, time); copy.append(head, preview); button.append(img, copy); shell.append(actions, button); list.append(shell);
      let startX = 0, startY = 0, moved = false, ignoreClick = false;
      button.addEventListener("pointerdown", event => { startX = event.clientX; startY = event.clientY; moved = false; ignoreClick = false; });
      button.addEventListener("pointerup", event => {
        const dx = event.clientX - startX, dy = event.clientY - startY;
        if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          moved = true; ignoreClick = true;
          if (dx < 0) { $$(".conversation-shell.swiped", list).forEach(node => node.classList.remove("swiped")); shell.classList.add("swiped"); }
          else shell.classList.remove("swiped");
        }
      });
      button.addEventListener("click", event => { if (ignoreClick || moved) { event.preventDefault(); event.stopPropagation(); ignoreClick = false; moved = false; return; } $$(".conversation-shell.swiped", list).forEach(node => { if (node !== shell) node.classList.remove("swiped"); }); openChat(contact.id); });
      button.addEventListener("contextmenu", event => { event.preventDefault(); shell.classList.toggle("swiped"); });
    });
  }
  function renderMessages() {
    const container = $("#chat-messages");
    const previousScrollTop = container.scrollTop;
    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 35;
    container.replaceChildren();
    const messages = state.messages[activeContactId] || [];
    let migrated = false;
    messages.forEach(message => { if (!message.id) { message.id = uid(); migrated = true; } appendMessageElement(container, message); });
    if (migrated) saveState();
    container.scrollTop = wasAtBottom ? container.scrollHeight : previousScrollTop;
    $("#top-title").textContent = currentContact().name;
    renderSelectionToolbar();
  }
  function appendMessageElement(container, message) {
    const group = document.createElement("div"); group.className = `message ${message.type === "sent" ? "sent" : "received"}`;
    if (Array.isArray(message.cardIds) && message.cardIds.length > 1) group.classList.add("combo-message");
    group.dataset.messageId = message.id;
    if (message.kind === "call-log") {
      group.className = `message call-log-message ${message.callStatus === "missed" ? "call-log-missed" : "call-log-ended"}`;
      const card = document.createElement("article"); card.className = "call-log-card";
      const icon = document.createElement("span"); icon.className = "call-log-icon"; icon.setAttribute("aria-hidden", "true");
      if (message.callType === "facetime") {
        icon.innerHTML = '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="13" height="14" rx="3"/><path d="M15 10l7-4v12l-7-4z"/></svg>';
      } else {
        icon.innerHTML = message.callStatus === "missed"
          ? '<svg viewBox="0 0 24 24"><path d="M4 14.5c4.5-3.8 11.5-3.8 16 0l-2.1 3.1-3.3-1.3-.3-2.1a10 10 0 0 0-4.6 0l-.3 2.1-3.3 1.3L4 14.5Z"/><path d="M5 4l14 16"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M4 14.5c4.5-3.8 11.5-3.8 16 0l-2.1 3.1-3.3-1.3-.3-2.1a10 10 0 0 0-4.6 0l-.3 2.1-3.3 1.3L4 14.5Z"/></svg>';
      }
      const copy = document.createElement("div"); copy.className = "call-log-copy";
      const title = document.createElement("strong");
      title.textContent = message.callStatus === "missed"
        ? (message.callType === "facetime" ? "FaceTime 未接听" : "未接听")
        : (message.callType === "facetime" ? "FaceTime 已结束" : "通话结束");
      const detail = document.createElement("span");
      detail.textContent = message.callStatus === "missed"
        ? (message.contactName || "对方")
        : `${message.callType === "facetime" ? "视频通话时长" : "通话时长"} ${formatCallTime(message.durationSeconds || 0)}`;
      // Call logs are ordinary message items: they support long-press/context-menu
      // deletion and the same multi-select workflow as other messages.
      copy.append(title, detail); card.append(icon, copy); group.append(card);
      if (selectionMode) {
        group.classList.add("selecting");
        if (selectedMessageIds.has(message.id)) group.classList.add("selected-message");
        const check = document.createElement("button"); check.type = "button"; check.className = "message-select-check";
        check.setAttribute("aria-label", "选择这条消息"); check.textContent = selectedMessageIds.has(message.id) ? "✓" : "";
        check.addEventListener("click", event => { event.stopPropagation(); toggleSelectedMessage(message.id); });
        group.append(check);
      }
      attachMessageGesture(group, message.id);
      container.append(group); return;
    }
    if (selectionMode) {
      group.classList.add("selecting");
      if (selectedMessageIds.has(message.id)) group.classList.add("selected-message");
      const check = document.createElement("button"); check.type = "button"; check.className = "message-select-check"; check.setAttribute("aria-label", "选择这条消息"); check.textContent = selectedMessageIds.has(message.id) ? "✓" : "";
      check.addEventListener("click", event => { event.stopPropagation(); toggleSelectedMessage(message.id); });
      group.append(check);
    }
    attachMessageGesture(group, message.id);
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
      bubble.append(play, wave, duration); bubble.addEventListener("click", async () => {
        if (message.audioUrl) { const audio = new Audio(message.audioUrl); play.textContent = "Ⅱ"; audio.onended = () => { play.textContent = "▶"; }; try { await audio.play(); } catch (_) { play.textContent = "▶"; } return; }
        const prefs = getChatPreferences(message.contactId || activeContactId);
        if (!prefs.minimaxApiKey || !prefs.voiceId) { showModal("MiniMax 语音设置", "请先在聊天页右上角 Edit → 板块三填写 API Key 和 Voice ID，并开启语音功能。", "♫"); return; }
        play.textContent = "…";
        try {
          let speechText = message.text || "";
          if (shouldTranslateVoice(prefs)) {
            try {
              if (!message.translationText || message.translationFailed) {
                message.translationText = await translateWithMyMemory(message.text || "", prefs);
                message.translationFailed = false; message.translationError = ""; saveState();
              }
              speechText = message.translationText || speechText;
            } catch (translationError) {
              message.translationFailed = true; message.translationError = translationError.message || "MyMemory 翻译失败";
              message.translationText = ""; saveState();
              if (voicePrefs.showTranslatedText) {
                const fallback = document.createElement("div"); fallback.className = "voice-translation voice-translation-fallback";
                fallback.textContent = "✧ 翻译暂不可用，将尝试播放原文"; group.append(fallback);
              }
              // Graceful fallback: speak the original card text if MyMemory is unavailable.
            }
          }
          const audioUrl = await generateMiniMaxAudio(speechText, prefs); message.audioUrl = audioUrl; saveState();
          const audio = new Audio(audioUrl); audio.onended = () => { play.textContent = "▶"; }; await audio.play(); play.textContent = "Ⅱ";
        } catch (error) { play.textContent = "▶"; showModal("语音生成失败", error.message || "请检查 MiniMax 配置和网络。", "!"); }
      }); group.append(bubble);
      const voicePrefs = getChatPreferences(message.contactId || activeContactId);
      if (voicePrefs.showTranslatedText && message.translationText && message.translationText !== message.text) {
        const translation = document.createElement("div"); translation.className = "voice-translation"; translation.textContent = message.translationText; group.append(translation);
      } else if (voicePrefs.showTranslatedText && message.translationFailed && shouldTranslateVoice(voicePrefs)) {
        const fallback = document.createElement("div"); fallback.className = "voice-translation voice-translation-fallback"; fallback.textContent = "✧ 翻译暂不可用，将尝试播放原文"; group.append(fallback);
      }
    } else if (message.kind === "sticker") {
      const bubble = document.createElement("div"); bubble.className = "bubble sticker-bubble"; bubble.textContent = message.text || "♡"; group.append(bubble);
    } else {
      const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = message.text || ""; group.append(bubble);
    }
    const meta = document.createElement("div"); meta.className = `message-meta ${message.status === "Delivered" ? "status-delivered" : "status-read"}`;
    const defaultStatus = message.type === "sent" ? "Read" : "Delivered";
    meta.textContent = `${message.time || nowTime()} ${message.status || defaultStatus}`;
    group.append(meta); container.append(group);
  }
  function renderSelectionToolbar() {
    const toolbar = $("#selection-toolbar");
    toolbar.hidden = !selectionMode;
    $("#composer").hidden = selectionMode;
    if (selectionMode) {
      $("#extension-panel").hidden = true; $("#sticker-tray").hidden = true;
      $("#selection-count").textContent = `${selectedMessageIds.size} selected`;
      $("#save-selected-group").disabled = selectedMessageIds.size === 0;
      $("#delete-selected").disabled = selectedMessageIds.size === 0;
    }
  }
  function endSelectionMode() {
    selectionMode = false; selectedMessageIds.clear();
    if ($("#selection-toolbar")) renderSelectionToolbar();
  }
  function toggleSelectedMessage(messageId) {
    if (selectedMessageIds.has(messageId)) selectedMessageIds.delete(messageId); else selectedMessageIds.add(messageId);
    renderMessages();
    $("#selection-count").textContent = `${selectedMessageIds.size} selected`;
  }
  function startSelectionMode(messageId = null) {
    selectionMode = true; selectedMessageIds.clear(); if (messageId) selectedMessageIds.add(messageId);
    renderMessages();
  }
  function messageToReadable(message) {
    if (!message) return "";
    if (message.kind === "poll") return `互动问卷：${message.poll?.question || ""}\n${(message.poll?.options || []).map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}${message.votedIndex != null ? `\n已选：${message.poll.options[message.votedIndex]}` : ""}`;
    if (message.kind === "transfer") return `${message.transferType || "转账"} ¥${Number(message.amount || 0).toFixed(2)}${message.note ? ` · ${message.note}` : ""}`;
    if (message.kind === "music") return `音乐分享：${message.track || "Untitled track"} — ${message.artist || "Unknown artist"}${message.note ? `\n${message.note}` : ""}`;
    if (message.kind === "voice") return `[语音消息 0:${String(message.duration || 3).padStart(2, "0")}]`;
    if (message.kind === "sticker") return `表情贴纸：${message.text || "♡"}`;
    return message.text || "";
  }
  function attachMessageGesture(group, messageId) {
    const open = () => { if (selectionMode) return; suppressMessageClickUntil = Date.now() + 900; openMessageMenu(messageId); };
    group.addEventListener("pointerdown", event => {
      if (selectionMode || event.target.closest(".poll-choice,.music-play,.voice-bubble")) return;
      pressStart = { x: event.clientX, y: event.clientY, id: messageId };
      clearTimeout(longPressTimer);
      longPressTimer = window.setTimeout(open, 520);
    });
    group.addEventListener("pointermove", event => {
      if (!pressStart || pressStart.id !== messageId) return;
      if (Math.abs(event.clientX - pressStart.x) > 12 || Math.abs(event.clientY - pressStart.y) > 12) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    const clearPress = () => { clearTimeout(longPressTimer); longPressTimer = null; pressStart = null; };
    group.addEventListener("pointerup", clearPress); group.addEventListener("pointercancel", clearPress); group.addEventListener("pointerleave", clearPress);
    group.addEventListener("contextmenu", event => { event.preventDefault(); clearPress(); open(); });
    group.addEventListener("click", event => { if (Date.now() < suppressMessageClickUntil) { event.preventDefault(); event.stopPropagation(); } }, true);
  }
  function openMessageMenu(messageId) {
    if (openMessageMenuId === messageId && !$("#modal").hidden) return;
    const messages = state.messages[activeContactId] || [];
    const message = messages.find(item => item.id === messageId); if (!message) return;
    openMessageMenuId = messageId;
    showModal("Message options", "选择你想对这条消息做的事。", "✧", { menu: true, okText: "Close" });
    const menu = $("#modal-extra");
    const actions = [
      ["✧　收藏这一条", () => saveSingleMessage(messageId)],
      ["✕　删除消息", () => deleteSingleMessage(messageId)],
      ["☷　进入多选模式", () => startSelectionMode(messageId)]
    ];
    actions.forEach(([label, handler]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "message-menu-action"; button.textContent = label;
      button.addEventListener("click", () => { closeModal(false); handler(); }); menu.append(button);
    });
  }
  function saveSingleMessage(messageId) {
    const message = (state.messages[activeContactId] || []).find(item => item.id === messageId); if (!message) return;
    const alreadySaved = state.savedItems.some(item => item.type === "single-message" && item.contactId === activeContactId && item.sourceMessageId === messageId);
    if (alreadySaved) { showModal("已经收藏过了", "这条消息已经在 Saved 里。", "✓"); return; }
    const content = messageToReadable(message);
    state.savedItems.unshift({ id: uid(), date: todayKey(), type: "single-message", title: `${message.type === "sent" ? state.profileName : currentContact().name} · 单条收藏`, text: content, contactId: activeContactId, contactName: currentContact().name, sender: message.type === "sent" ? state.profileName : currentContact().name, sourceMessageId: messageId, message: clone(message), createdAt: Date.now() });
    selectedDate = todayKey(); calendarYear = new Date().getFullYear(); calendarMonth = new Date().getMonth();
    saveState(); renderCalendar(); renderSavedDay();
    showModal("已收藏到 Saved", "这条消息已经加入今天的纪念记录。", "♡");
  }
  async function deleteSingleMessage(messageId) {
    if (!await showModal("删除这条消息？", "删除后将从当前对话中移除。已手动收藏到 Saved 的副本仍会保留。", "!", { confirm: true, okText: "Delete" })) return;
    state.messages[activeContactId] = (state.messages[activeContactId] || []).filter(item => item.id !== messageId);
    selectedMessageIds.delete(messageId); state.previews[activeContactId] = messageToReadable(state.messages[activeContactId].slice(-1)[0]) || currentContact().preview;
    saveState(); renderMessages(); renderConversations();
  }
  async function deleteSelectedMessages() {
    if (!selectedMessageIds.size) return;
    const count = selectedMessageIds.size;
    if (!await showModal("批量删除这些消息？", `将从当前对话中删除 ${count} 条已选消息；Saved 中已经收藏的副本仍会保留。`, "!", { confirm: true, okText: "Delete all" })) return;
    state.messages[activeContactId] = (state.messages[activeContactId] || []).filter(item => !selectedMessageIds.has(item.id));
    state.previews[activeContactId] = messageToReadable(state.messages[activeContactId].slice(-1)[0]) || currentContact().preview;
    saveState(); endSelectionMode(); renderMessages(); renderConversations();
  }
  function saveSelectedGroup() {
    const messages = (state.messages[activeContactId] || []).filter(item => selectedMessageIds.has(item.id));
    if (!messages.length) return;
    const snapshot = messages.map(message => ({ type: message.type, time: message.time || "", speaker: message.type === "sent" ? state.profileName : currentContact().name, text: messageToReadable(message), kind: message.kind || "text" }));
    const duplicate = state.savedItems.some(item => item.type === "group-chat" && item.contactId === activeContactId && Array.isArray(item.sourceMessageIds) && item.sourceMessageIds.length === messages.length && item.sourceMessageIds.every(id => selectedMessageIds.has(id)));
    if (duplicate) { showModal("这组对话已收藏", "这组消息已经在 Saved 里。", "✓"); return; }
    state.savedItems.unshift({ id: uid(), date: todayKey(), type: "group-chat", title: `与 ${currentContact().name} 的合并聊天记录`, text: snapshot.map(line => `${line.speaker}：${line.text}`).join("\n"), messages: snapshot, sourceMessageIds: messages.map(message => message.id), contactId: activeContactId, contactName: currentContact().name, createdAt: Date.now() });
    selectedDate = todayKey(); calendarYear = new Date().getFullYear(); calendarMonth = new Date().getMonth();
    saveState(); endSelectionMode(); renderMessages(); renderCalendar(); renderSavedDay();
    showModal("组收藏完成", `${snapshot.length} 条消息已合并保存到 Saved。`, "▤");
  }
  function showThinkingIndicator(contactId) {
    if (!(activeTab === "message" && inChat && activeContactId === contactId)) return;
    hideThinkingIndicator();
    const row = document.createElement("div"); row.className = "typing-indicator"; row.id = "typing-indicator";
    const dots = document.createElement("span"); dots.className = "typing-dots"; dots.innerHTML = "<i></i><i></i><i></i>";
    const label = document.createElement("span"); label.textContent = `${currentContact().name} is thinking…`;
    row.append(dots, label); $("#chat-messages").append(row); $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  }
  function hideThinkingIndicator() { $("#typing-indicator")?.remove(); }
  function markMessagesRead(contactId, type) {
    (state.messages[contactId] || []).forEach(message => { if (message.type === type) message.status = "Read"; });
  }
  function translationTargetLanguage(language) {
    return ({ "英语": "en", "日语": "ja", "韩语": "ko", "德语": "de" })[language] || "";
  }
  function shouldTranslateVoice(prefs) {
    return Boolean(prefs?.autoTranslateCards && String(prefs?.ttsLanguage || "原文") !== "原文" && translationTargetLanguage(prefs.ttsLanguage));
  }
  async function translateWithMyMemory(text, prefs) {
    const sourceText = String(text || "").trim();
    if (!sourceText) throw new Error("字卡文本为空，无法翻译。");
    const targetLang = translationTargetLanguage(prefs?.ttsLanguage);
    if (!targetLang) throw new Error("当前语音语言暂不支持自动翻译。");

    // MyMemory is a hosted public API. Split into short chunks to stay below request-size limits.
    const chunks = [];
    let remaining = sourceText;
    while (remaining.length) {
      if (new TextEncoder().encode(remaining).length <= 420) { chunks.push(remaining); break; }
      let cut = Math.min(remaining.length, 300);
      const boundary = Math.max(remaining.lastIndexOf("。", cut), remaining.lastIndexOf("！", cut), remaining.lastIndexOf("？", cut), remaining.lastIndexOf("\n", cut), remaining.lastIndexOf(". ", cut), remaining.lastIndexOf("! ", cut), remaining.lastIndexOf("? ", cut), remaining.lastIndexOf(" ", cut));
      if (boundary > 80) cut = boundary + 1;
      while (cut > 1 && new TextEncoder().encode(remaining.slice(0, cut)).length > 420) cut--;
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trimStart();
    }

    const translatedChunks = [];
    for (const chunk of chunks) {
      const params = new URLSearchParams({ q: chunk, langpair: `zh-CN|${targetLang}` });
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, { signal: controller.signal });
      } catch (error) {
        if (error?.name === "AbortError") throw new Error("MyMemory 翻译请求超时（15 秒），请稍后重试。");
        throw new Error("无法连接 MyMemory 翻译服务。请检查网络或稍后重试。" + (error?.message ? ` ${error.message}` : ""));
      } finally { window.clearTimeout(timeout); }
      const raw = await response.text();
      let data = null; try { data = JSON.parse(raw); } catch (_) {}
      if (!response.ok) throw new Error(`MyMemory 请求失败（HTTP ${response.status}）：${data?.responseDetails || raw.slice(0, 200) || response.statusText}`);
      const translated = data?.responseData?.translatedText;
      if (!translated || typeof translated !== "string") throw new Error(data?.responseDetails || "MyMemory 没有返回有效译文。");
      if (Number(data?.responseStatus) >= 400) throw new Error(data?.responseDetails || "MyMemory 暂时无法完成翻译。");
      translatedChunks.push(translated.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    }
    return translatedChunks.join(" ").trim();
  }
  async function prepareVoiceTranslation(message, prefs) {
    if (!shouldTranslateVoice(prefs)) return;
    try {
      message.translationText = await translateWithMyMemory(message.text || "", prefs);
      message.translationFailed = false; message.translationError = "";
    } catch (error) {
      message.translationText = ""; message.translationFailed = true;
      message.translationError = error?.message || "MyMemory 翻译失败";
    }
    saveState();
    if (activeTab === "message" && inChat && activeContactId === message.contactId) renderMessages();
  }

  async function generateMiniMaxAudio(text, prefs) {
    // MiniMax official HTTP T2A request. Browser CORS may still require a server-side proxy.
    const endpoint = "https://api.minimaxi.com/v1/t2a_v2";
    const requestBody = {
      model: prefs.ttsModel || "speech-2.8-hd",
      text: String(text || "").trim(),
      stream: false,
      voice_setting: {
        voice_id: String(prefs.voiceId || "").trim(),
        speed: Math.min(2, Math.max(0.5, Number(prefs.ttsSpeed) || 1)),
        vol: 1,
        pitch: 0
      },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
      output_format: "hex"
    };
    if (!requestBody.text) throw new Error("试听文本为空。");
    if (!requestBody.voice_setting.voice_id) throw new Error("请填写有效的 Voice ID。");
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${prefs.minimaxApiKey}` },
        body: JSON.stringify(requestBody)
      });
    } catch (error) {
      throw new Error("网页无法连接 MiniMax 接口。常见原因是浏览器跨域（CORS）限制；需要通过后端代理请求，单改 API Key 通常解决不了。详情：" + (error?.message || "网络请求失败"));
    }
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch (_) { data = null; }
    if (!response.ok) {
      const detail = data?.base_resp?.status_msg || data?.message || raw.slice(0, 800) || response.statusText;
      const error = new Error(`MiniMax API 返回 HTTP ${response.status}：${detail}`);
      error.name = "MiniMaxHttpError";
      error.diagnostic = { httpStatus: response.status, responseBody: raw.slice(0, 2000) };
      throw error;
    }
    if (data?.base_resp && Number(data.base_resp.status_code) !== 0) {
      const error = new Error(`MiniMax 合成失败（${data.base_resp.status_code}）：${data.base_resp.status_msg || "请检查 API Key、模型和音色权限"}`);
      error.name = "MiniMaxBusinessError";
      error.diagnostic = { apiStatusCode: data.base_resp.status_code, apiStatusMessage: data.base_resp.status_msg || "", responseBody: raw.slice(0, 2000) };
      throw error;
    }
    const audio = data?.data?.audio || data?.audio;
    if (!audio) throw new Error("接口请求已返回，但没有音频数据。返回内容：" + raw.slice(0, 240));
    if (/^https?:\/\//i.test(audio)) return audio;
    // output_format=hex means the API returns hex-encoded MP3 bytes.
    if (/^[0-9a-f]+$/i.test(audio) && audio.length % 2 === 0) {
      const bytes = new Uint8Array(audio.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      return `data:audio/mpeg;base64,${btoa(binary)}`;
    }
    throw new Error("MiniMax 返回的音频不是预期的 Hex 数据，请检查接口输出格式。");
  }
  function renderCustomStickers() {
    const container = $("#sticker-grid");
    if (!container) return;
    container.querySelectorAll("[data-custom-sticker-chip]").forEach(node => node.remove());
    const stickers = Array.isArray(state.customStickers) ? state.customStickers : [];
    stickers.forEach((sticker, index) => {
      const item = document.createElement("div");
      item.className = "custom-sticker-chip";
      item.dataset.customStickerChip = "true";
      const send = document.createElement("button");
      send.type = "button";
      send.className = "custom-sticker-send";
      send.dataset.customStickerSend = String(index);
      send.textContent = sticker;
      send.title = "点击发送这个颜文字";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "custom-sticker-remove";
      remove.dataset.customStickerRemove = String(index);
      remove.textContent = "×";
      remove.title = "从 Quick picks 删除这个颜文字";
      remove.setAttribute("aria-label", `删除颜文字 ${sticker}`);
      item.append(send, remove);
      container.append(item);
    });
  }

  function addCustomSticker(value) {
    const sticker = String(value || "").trim();
    if (!sticker) return false;
    if (Array.from(sticker).length > 100) {
      void showModal("颜文字太长啦", "单个颜文字最多 100 个字符，请删减后再添加。", "✧");
      return false;
    }
    if (!Array.isArray(state.customStickers)) state.customStickers = [];
    if (state.customStickers.some(item => String(item).toLocaleLowerCase() === sticker.toLocaleLowerCase())) {
      void showModal("已经添加过啦", "这个颜文字已经在「我的颜文字」里了。", "♡");
      return false;
    }
    if (state.customStickers.length >= 200) {
      void showModal("颜文字收藏已满", "最多可以保存 200 个自定义颜文字。", "!");
      return false;
    }
    state.customStickers.push(sticker);
    saveState();
    renderCustomStickers();
    return true;
  }

  function receiveCard(contactId, preferences = getChatPreferences(contactId)) {
    hideThinkingIndicator();
    const pool = allCards();
    if (!pool.length) {
      if (activeTab === "message" && inChat && activeContactId === contactId) {
        showModal("字卡库暂时没有可抽取内容", "请前往 Me 添加字卡，或启用至少一张字卡及其所属分组。", "✧");
      }
      return;
    }
    // Only an actual reply marks the player's pending messages as read.
    markMessagesRead(contactId, "sent");
    const maxCards = preferences.multiCardsEnabled ? Math.max(1, Math.min(5, Number(preferences.cardCount) || 1)) : 1;
    const availableLimit = Math.min(maxCards, pool.length);
    // Enabling multi-card mode sets an upper limit, not a fixed number for every reply.
    const requested = preferences.multiCardsEnabled ? 1 + Math.floor(Math.random() * availableLimit) : 1;
    const shuffled = [...pool];
    // Fisher-Yates shuffle avoids the bias of sorting with a random comparator.
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const picked = shuffled.slice(0, requested);
    const fragments = picked.map(card => {
      let text = card.text;
      if (preferences.multiCardsEnabled && preferences.autoPunctuation && text && !/[。！？.!?…]$/.test(text)) text += "。";
      return text;
    });
    // Optional kaomoji insertion: at most one per reply, 20% chance. Only use safe boundaries:
    // before the whole paragraph, after a complete card, or after the whole paragraph — never inside card text.
    const customStickers = Array.isArray(state.customStickers)
      ? state.customStickers.map(sticker => String(sticker || "").trim()).filter(Boolean)
      : [];
    const availableStickers = [...new Set([...BUILT_IN_STICKERS, ...customStickers])];
    let stickerAtEnd = "";
    let stickerAtStart = "";
    if (preferences.stickerEnabled && availableStickers.length && fragments.length && Math.random() < STICKER_INSERTION_CHANCE) {
      const sticker = availableStickers[Math.floor(Math.random() * availableStickers.length)];
      // Valid slots: paragraph start, after any complete card, and paragraph end. No character-level insertion.
      const slot = Math.floor(Math.random() * (fragments.length + 2));
      if (slot === 0) {
        stickerAtStart = `${sticker} `;
      } else if (slot === fragments.length + 1) {
        stickerAtEnd = ` ${sticker}`;
      } else {
        const cardIndex = slot - 1;
        fragments[cardIndex] = `${fragments[cardIndex]} ${sticker}`;
      }
    }
    // Keep composed cards in one continuous message; don't insert line breaks between cards.
    const replyText = `${stickerAtStart}${fragments.join("")}${stickerAtEnd}`;
    const useVoice = preferences.ttsEnabled && Math.random() < 0.4;
    const message = { id: uid(), text: replyText, type: "received", status: "Delivered", time: nowTime(), cardIds: picked.map(card => card.id), ...(useVoice ? { kind: "voice", duration: Math.max(2, Math.min(30, Math.ceil(replyText.length / 4))), contactId } : {}) };
    if (!state.messages[contactId]) state.messages[contactId] = [];
    state.messages[contactId].push(message); state.previews[contactId] = replyText;
    picked.forEach(card => { if (!state.collected.includes(card.text)) state.collected.unshift(card.text); });
    // Receiving a reply is not an explicit save action; Saved only stores manual bookmarks.
    saveState();
    if (activeTab === "message" && inChat && activeContactId === contactId) renderMessages();
    renderConversations(); renderNotes(); renderMe();
    if (useVoice) void prepareVoiceTranslation(message, preferences);
  }
  function scheduleCharacterResponse(contactId) {
    const preferences = getChatPreferences(contactId);
    const delayMin = Math.max(0, Math.min(30, Number(preferences.delayMin) || 0));
    const delayMax = Math.max(delayMin, Math.min(60, Number(preferences.delayMax) || delayMin));
    const delayMs = (delayMin + Math.random() * (delayMax - delayMin)) * 1000;
    showThinkingIndicator(contactId);
    window.setTimeout(() => {
      hideThinkingIndicator();
      // Probability is the chance of a normal response; the remaining percentage is read-but-no-reply.
      if (preferences.noReplyEnabled && Math.random() * 100 >= Number(preferences.replyProbability)) {
        // A no-reply outcome is still a read receipt: the message is seen, but no response arrives.
        markMessagesRead(contactId, "sent"); saveState();
        if (activeTab === "message" && inChat && activeContactId === contactId) {
          renderMessages();
          const note = document.createElement("div"); note.className = "no-reply-note"; note.textContent = "Read · no reply";
          $("#chat-messages").append(note); $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
          window.setTimeout(() => note.remove(), 2600);
        }
        return;
      }
      receiveCard(contactId, preferences);
    }, delayMs);
  }
  function sendMessage(text) {
    const value = text.trim(); if (!value) return;
    sendSpecialMessage({ text: value }, true);
    $("#message-input").value = "";
  }
  function sendSpecialMessage(payload, shouldReply = true) {
    const id = activeContactId; if (!state.messages[id]) state.messages[id] = [];
    $("#extension-panel").hidden = true; $("#sticker-tray").hidden = true;
    // A player's new message marks previously delivered character messages as Read.
    markMessagesRead(id, "received");
    const message = { ...payload, id: payload.id || uid(), type: "sent", status: "Delivered", time: nowTime() };
    state.messages[id].push(message);
    state.previews[id] = message.text || message.poll?.question || (message.kind === "transfer" ? `${message.transferType} ¥${message.amount}` : message.kind === "music" ? `♫ ${message.track}` : message.kind === "voice" ? "[语音消息]" : "[表情贴纸]");
    saveState(); renderMessages(); renderConversations();
    if (shouldReply) scheduleCharacterResponse(id);
  }
  function answerPoll(messageId, optionIndex) {
    const messages = state.messages[activeContactId] || [];
    const poll = messages.find(item => item.id === messageId && item.kind === "poll");
    if (!poll || poll.votedIndex != null || !poll.poll?.options?.[optionIndex]) return;
    poll.votedIndex = optionIndex;
    markMessagesRead(activeContactId, "sent");
    messages.push({ id: uid(), text: `我选「${poll.poll.options[optionIndex]}」。你呢？`, type: "received", status: "Delivered", time: nowTime() });
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
    // Letters and diary entries live only in their dedicated folders, never under the home New Note button.
    const shown = state.notes.filter(note => note.type === "collage" && (currentNoteKind === "all" || note.type === currentNoteKind));
    if (!shown.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = currentNoteKind === "all" ? "信件和日记请从各自入口查看；这里不会重复显示它们。" : currentNoteKind === "collage" ? "还没有字卡拼贴，点击 New Note 开始创作。" : "这类记录会保存在专属列表中。"; container.append(empty); return; }
    shown.forEach(note => {
      const button = document.createElement("button"); button.type = "button"; button.className = "saved-note-row"; button.addEventListener("click", () => openNoteEditor(note.type, note.id));
      const copy = document.createElement("div"); const title = document.createElement("strong"); title.textContent = note.title || typeLabel(note.type);
      const sub = document.createElement("small"); sub.textContent = `${typeLabel(note.type)} · ${dateLabel(note.date)} · ${(note.content || "").slice(0, 42)}`;
      copy.append(title, sub); const arrow = document.createElement("span"); arrow.className = "row-arrow"; arrow.textContent = "›"; button.append(copy, arrow); container.append(button);
    });
  }
  function typeLabel(type) { return ({ letter: "Letter", diary: "Diary", collage: "Card Collage" })[type] || "Note"; }
  function ownerLabel(note) { return note.owner === "mortimer" ? "莫蒂" : "薇薇"; }
  function openNoteCollection(type) {
    currentNoteKind = type; selectedNoteIds.clear();
    $("#notes-home").hidden = true; $("#note-collection").hidden = false; $("#note-reader").hidden = true; $("#note-editor").hidden = true;
    $("#create-collection-note").textContent = type === "letter" ? "＋ 写一封信" : type === "diary" ? "＋ 写一篇日记" : "＋ 新建记录";
    renderNoteCollection(); renderLayout();
  }
  function renderNoteCollection() {
    const root = $("#note-collection-groups"); root.replaceChildren();
    const type = currentNoteKind;
    if (type === "all") {
      const section = document.createElement("section"); section.className = "note-owner-group";
      const heading = document.createElement("div"); heading.className = "note-owner-heading";
      const title = document.createElement("strong"); title.textContent = "全部内容";
      const count = document.createElement("small"); count.textContent = `${state.notes.length} 篇`; heading.append(title, count); section.append(heading);
      if (!state.notes.length) { const empty = document.createElement("div"); empty.className = "empty-message owner-empty"; empty.textContent = "这里还没有保存的内容。"; section.append(empty); }
      state.notes.forEach(note => {
        const row = document.createElement("div"); row.className = "collection-note-row";
        const check = document.createElement("input"); check.type = "checkbox"; check.checked = selectedNoteIds.has(note.id); check.setAttribute("aria-label", `选择${note.title || typeLabel(note.type)}`); check.addEventListener("change", () => { check.checked ? selectedNoteIds.add(note.id) : selectedNoteIds.delete(note.id); updateNoteBatchButton(); });
        const open = document.createElement("button"); open.type = "button"; open.className = "collection-note-open";
        const title = document.createElement("strong"); title.textContent = note.title || (note.type === "letter" ? "无题信件" : note.type === "diary" ? "无题日记" : "无题拼贴");
        const preview = document.createElement("small"); preview.textContent = `${typeLabel(note.type)} · ${dateLabel(note.date)}　${(note.content || "").replace(/\s+/g," ").slice(0,44)}`;
        const arrow = document.createElement("span"); arrow.className = "row-arrow"; arrow.textContent = "›"; open.append(title, preview);
        open.addEventListener("click", () => ["letter", "diary"].includes(note.type) ? openNoteReader(note.id) : openNoteEditor(note.type, note.id));
        row.append(check, open, arrow); section.append(row);
      });
      root.append(section); updateNoteBatchButton(); return;
    }
    [{owner:"vivi",label:type === "letter" ? "薇薇の信件" : "薇薇の日记"},{owner:"mortimer",label:type === "letter" ? "莫蒂の信件" : "莫蒂の日记"}].forEach(group => {
      const section = document.createElement("section"); section.className = "note-owner-group";
      const heading = document.createElement("div"); heading.className = "note-owner-heading"; const title = document.createElement("strong"); title.textContent = group.label; const count = document.createElement("small");
      const items = state.notes.filter(n => n.type === type && (n.owner || "vivi") === group.owner); count.textContent = `${items.length} 篇`; heading.append(title,count); section.append(heading);
      if (!items.length) { const empty = document.createElement("div"); empty.className = "empty-message owner-empty"; empty.textContent = "暂时还没有内容，等一封信或一页日记被写下。"; section.append(empty); }
      items.forEach(note => {
        const row = document.createElement("div"); row.className = "collection-note-row";
        const check = document.createElement("input"); check.type = "checkbox"; check.checked = selectedNoteIds.has(note.id); check.setAttribute("aria-label", `选择${note.title || typeLabel(type)}`); check.addEventListener("change", () => { check.checked ? selectedNoteIds.add(note.id) : selectedNoteIds.delete(note.id); updateNoteBatchButton(); });
        const open = document.createElement("button"); open.type = "button"; open.className = "collection-note-open"; const title = document.createElement("strong"); title.textContent = note.title || (type === "letter" ? "无题信件" : "无题日记"); const preview = document.createElement("small"); preview.textContent = `${dateLabel(note.date)}　${(note.content || "").replace(/\s+/g," ").slice(0,44)}`; const arrow = document.createElement("span"); arrow.className="row-arrow"; arrow.textContent="›"; open.append(title,preview); open.addEventListener("click",()=>openNoteReader(note.id)); row.append(check,open,arrow); section.append(row);
      }); root.append(section);
    }); updateNoteBatchButton();
  }
  function updateNoteBatchButton() {
    const deleteButton = $("#batch-delete-notes");
    deleteButton.disabled = selectedNoteIds.size === 0;
    deleteButton.textContent = `删除所选 (${selectedNoteIds.size})`;
    const editButton = $("#edit-selected-note");
    editButton.disabled = selectedNoteIds.size !== 1;
    editButton.textContent = selectedNoteIds.size > 1 ? "编辑所选 (仅限一条)" : "编辑所选";
  }
  function openNoteReader(id) {
    const note = state.notes.find(n => n.id === id); if (!note) return; readingNoteId = id; currentNoteKind = note.type;
    $("#note-collection").hidden = true; $("#note-reader").hidden = false; $("#note-editor").hidden = true;
    const isLetter = note.type === "letter";
    const sender = ownerLabel(note);
    // Letters and diaries share the same clean feature-phone reader; the label keeps their meanings distinct.
    $("#feature-letter-reader").hidden = false;
    $("#reader-options-menu").hidden = true;
    $("#reader-sender").textContent = sender;
    $("#reader-timestamp").textContent = featurePhoneTimestamp(note);
    $("#reader-subject").textContent = note.title || (isLetter ? "无题信件" : "无题日记");
    $("#reader-prefix").textContent = isLetter ? `【${sender}】: ` : `【${sender}的日记】 `;
    $("#reader-sms-content").textContent = note.content || "";
    const replyButton = $("#reader-reply-button");
    const canReply = isLetter && note.owner === "mortimer";
    replyButton.hidden = !canReply;
    $("#reader-actions").classList.toggle("has-reply", canReply);
    $("#reader-options-button").setAttribute("aria-label", isLetter ? "信件选项" : "日记选项");
    renderLayout();
  }
  async function deleteReadingNote() {
    const note = state.notes.find(n => n.id === readingNoteId); if (!note) return;
    if (await showModal("删除这份记录？", note.title || typeLabel(note.type), "!", { confirm: true, okText: "删除" })) {
      state.notes = state.notes.filter(n => n.id !== readingNoteId); saveState(); readingNoteId = null;
      openNoteCollection(currentNoteKind); renderNotes();
    }
  }
  function replyToReadingNote() {
    const note = state.notes.find(n => n.id === readingNoteId); if (!note || note.type !== "letter" || note.owner !== "mortimer") return;
    openNoteEditor("letter");
    // User-authored letters are always addressed to Mortimer. Character-authored letters will use a separate flow later.
    $("#note-recipient").value = "mortimer";
    const subject = note.title || "无题信件";
    $("#note-title").value = (`Re: ${subject}`).slice(0, 80);
    $("#note-content").value = "";
    $("#note-content").focus();
  }
  function openNoteEditor(type = "diary", id = null) {
    currentNoteKind = type; editingNoteId = id;
    const note = id ? state.notes.find(item => item.id === id) : null;
    $("#notes-home").hidden = true; $("#note-collection").hidden = true; $("#note-reader").hidden = true; $("#note-editor").hidden = false;
    $("#note-title").value = note?.title || ({ letter: "A letter to you", diary: "Today's fragments", collage: "Collected words" })[type] || "Untitled";
    $("#note-content").value = note?.content || (type === "collage" ? state.collected.slice(0, 4).join("\n") : "");
    $("#note-owner").value = note?.owner || "vivi";
    $("#note-owner-field").hidden = type === "letter";
    $("#note-recipient-field").hidden = type !== "letter";
    $("#note-owner-label").textContent = type === "diary" ? "这份日记属于" : "这份记录属于";
    $("#note-recipient").value = note?.recipient || "mortimer";
    // Collected-card insertion is reserved for the card-collage editor, not personal letters or diary entries.
    $("#note-card-tools").hidden = type !== "collage";
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
    if (editingNoteId) {
      note = state.notes.find(item => item.id === editingNoteId);
      if (note) {
        const author = currentNoteKind === "letter" ? (note.owner || "vivi") : $("#note-owner").value;
        Object.assign(note, { title, content, type: currentNoteKind, owner: author, date: todayKey(), updatedAt: Date.now() });
        if (currentNoteKind === "letter") note.recipient = $("#note-recipient").value || "mortimer";
      }
    } else {
      const createdAt = Date.now();
      note = { id: uid(), type: currentNoteKind, owner: currentNoteKind === "letter" ? "vivi" : $("#note-owner").value, title, content, date: todayKey(), createdAt };
      if (currentNoteKind === "letter") {
        note.recipient = $("#note-recipient").value || "mortimer";
        // Secretly decide the reply time once, when the letter is first saved.
        // This timestamp is internal data only; it is never shown in the UI.
        const twelveHours = 12 * 60 * 60 * 1000;
        const minimumDelay = 60 * 1000;
        note.replyDueAt = createdAt + minimumDelay + Math.floor(Math.random() * (twelveHours - minimumDelay + 1));
      }
      state.notes.unshift(note);
    }
    saveState();
    editingNoteId = null; renderCalendar(); renderSavedDay(); if (["letter","diary"].includes(currentNoteKind)) { openNoteCollection(currentNoteKind); } else { $("#notes-home").hidden = false; $("#note-editor").hidden = true; renderLayout(); renderNotes(); }
    showModal("Saved", "这段内容已保存到 Notes。Saved 只展示你在聊天中手动收藏的消息。", "✓");
  }

  // Deliver scheduled Mortimer letters from the active user-managed card library.
  // The reply deadline is stored on the original Vivian letter but never displayed.
  function processScheduledLetterReplies() {
    const nowMs = Date.now();
    const pool = allCards();
    if (!pool.length) return 0;
    const pending = state.notes.filter(note =>
      note.type === "letter" && (note.owner || "vivi") === "vivi" &&
      Number.isFinite(Number(note.replyDueAt)) && Number(note.replyDueAt) <= nowMs &&
      !note.replyGeneratedAt && !note.replyCancelledAt
    );
    if (!pending.length) return 0;

    let generated = 0;
    pending.forEach(original => {
      // Defensive duplicate guard for migrated or partially restored local data.
      const existingReply = state.notes.find(note => note.type === "letter" && note.autoReplyTo === original.id);
      if (existingReply) {
        original.replyGeneratedAt = existingReply.createdAt || nowMs;
        return;
      }
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const count = 1 + Math.floor(Math.random() * Math.min(12, shuffled.length));
      const picked = shuffled.slice(0, count);
      const content = picked.map(card => card.text).join("");
      if (!content.trim()) return;

      const reply = {
        id: uid(), type: "letter", owner: "mortimer", recipient: "vivi",
        title: `Re: ${original.title || "A letter to you"}`.slice(0, 80),
        content, date: todayKey(), createdAt: nowMs, updatedAt: nowMs,
        autoReplyTo: original.id,
        replyCardIds: picked.map(card => card.id)
      };
      original.replyGeneratedAt = nowMs;
      state.notes.unshift(reply);
      generated++;
    });

    if (generated || pending.some(note => note.replyGeneratedAt)) {
      saveState();
      renderNotes();
      if (!$("#note-collection").hidden) renderNoteCollection();
      renderMe();
    }
    return generated;
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
    if (!items.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = "这一天还没有手动收藏的聊天内容。长按消息气泡即可收藏，或多选后合并保存。"; list.append(empty); return; }
    items.forEach(item => {
      const card = document.createElement("article"); card.className = `saved-item ${item.type === "group-chat" ? "saved-group-chat" : "saved-single-chat"}`;
      const title = document.createElement("strong");
      title.textContent = `${item.type === "group-chat" ? "▤ GROUP CHAT" : "✧ SAVED MESSAGE"} · ${item.title}`;
      card.append(title);
      if (item.type === "group-chat" && Array.isArray(item.messages)) {
        const lines = document.createElement("div"); lines.className = "saved-chat-lines";
        item.messages.forEach(line => { const row = document.createElement("div"); row.className = `saved-chat-line ${line.type === "sent" ? "saved-line-sent" : "saved-line-received"}`; const speaker = document.createElement("b"); speaker.textContent = line.speaker || (line.type === "sent" ? state.profileName : item.contactName || "TA"); const content = document.createElement("span"); content.textContent = line.text || "[互动卡片]"; const time = document.createElement("small"); time.textContent = line.time || ""; row.append(speaker, content, time); lines.append(row); });
        card.append(lines);
      } else { const p = document.createElement("p"); p.textContent = item.text; card.append(p); }
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "saved-remove"; remove.textContent = "×"; remove.setAttribute("aria-label", "取消收藏");
      remove.addEventListener("click", async () => { if (await showModal("从 Saved 移除？", "这只会取消收藏，不会删除原聊天消息。", "!", { confirm: true, okText: "Remove" })) { state.savedItems = state.savedItems.filter(saved => saved.id !== item.id); saveState(); renderCalendar(); renderSavedDay(); } });
      card.append(remove); list.append(card);
    });
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
    renderBatchTargetSelect();
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

  function renderBatchTargetSelect() {
    const select = $("#batch-target-group"); if (!select) return;
    const prior = select.value; select.replaceChildren();
    const ungrouped = document.createElement("option"); ungrouped.value = ""; ungrouped.textContent = "移动至未分组"; select.append(ungrouped);
    state.cardGroups.forEach(group => { const option = document.createElement("option"); option.value = group.id; option.textContent = group.name; select.append(option); });
    if ([...select.options].some(option => option.value === prior)) select.value = prior;
  }

  function renderCardGroups() {
    const container = $("#card-group-list");
    const groupToggle = $("#toggle-card-groups");
    if (container) container.hidden = Boolean(cardUI.groupManagerCollapsed);
    if (groupToggle) { groupToggle.setAttribute("aria-expanded", String(!cardUI.groupManagerCollapsed)); groupToggle.textContent = cardUI.groupManagerCollapsed ? "▸ 查看分组" : "▾ 收起分组"; }
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

  function syncBatchToolbar() {
    const count = selectedCardIds.size;
    const countEl = $("#batch-selected-count"); if (countEl) countEl.textContent = `已选 ${count} 张`;
    const all = $("#select-all-cards");
    if (all) { all.checked = state.customCards.length > 0 && count === state.customCards.length; all.indeterminate = count > 0 && count < state.customCards.length; }
    const move = $("#batch-move-cards"), del = $("#batch-delete-cards");
    if (move) move.disabled = count === 0;
    if (del) del.disabled = count === 0;
  }

  function renderManagedCards() {
    const container = $("#custom-card-list");
    container.replaceChildren();
    const listContent = $("#card-list-content"), listToggle = $("#toggle-card-list");
    const searchInput = $("#card-global-search"), searchCount = $("#card-search-count");
    const query = (searchInput?.value || "").trim().toLocaleLowerCase();
    if (listContent) listContent.hidden = Boolean(cardUI.listCollapsed && !query);
    if (listToggle) { listToggle.setAttribute("aria-expanded", String(!cardUI.listCollapsed || Boolean(query))); const chevron = $(".collapse-chevron", listToggle); if (chevron) chevron.textContent = (cardUI.listCollapsed && !query) ? "▸" : "▾"; }
    const groupName = card => state.cardGroups.find(group => group.id === card.groupId)?.name || "未分组 / Ungrouped";
    if (query) {
      const matches = state.customCards.filter(card => card.text.toLocaleLowerCase().includes(query) || groupName(card).toLocaleLowerCase().includes(query));
      if (searchCount) searchCount.textContent = `找到 ${matches.length} 张字卡${matches.length ? " · 已显示所属分组与快捷操作" : " · 换个关键词试试"}`;
      if (!matches.length) { const empty = document.createElement("div"); empty.className = "empty-message"; empty.textContent = "没有找到匹配的字卡。"; container.append(empty); syncBatchToolbar(); return; }
      matches.forEach(card => {
        const row = document.createElement("div"); row.className = `custom-card-item search-result-item${isCardActive(card) ? " is-active" : " is-inactive"}${selectedCardIds.has(card.id) ? " is-selected" : ""}`;
        const pickLabel = document.createElement("label"); pickLabel.className = "card-pick-label"; pickLabel.title = "选择这张字卡";
        const pick = document.createElement("input"); pick.type = "checkbox"; pick.checked = selectedCardIds.has(card.id); pick.setAttribute("aria-label", `选择字卡：${card.text}`);
        pick.addEventListener("change", () => { if (pick.checked) selectedCardIds.add(card.id); else selectedCardIds.delete(card.id); row.classList.toggle("is-selected", pick.checked); syncBatchToolbar(); });
        const pickFace = document.createElement("span"); pickFace.className = "retro-checkbox-face"; pickLabel.append(pick, pickFace);
        const textWrap = document.createElement("div"); textWrap.className = "search-result-copy";
        const text = document.createElement("span"); text.className = "managed-card-text"; text.textContent = card.text;
        const groupTag = document.createElement("small"); groupTag.className = "search-result-group"; groupTag.textContent = `GROUP · ${groupName(card)}`;
        textWrap.append(text, groupTag);
        const activeLabel = document.createElement("label"); activeLabel.className = "retro-switch card-switch"; activeLabel.title = "单条字卡启用状态";
        const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = card.enabled; toggle.setAttribute("aria-label", `启用字卡：${card.text}`);
        toggle.addEventListener("change", () => { card.enabled = toggle.checked; saveState(); renderMe(); });
        const slider = document.createElement("span"); slider.className = "retro-slider"; activeLabel.append(toggle, slider);
        const edit = document.createElement("button"); edit.type = "button"; edit.className = "tiny-metal-btn"; edit.textContent = "Edit"; edit.addEventListener("click", () => editCard(card.id));
        const del = document.createElement("button"); del.type = "button"; del.className = "tiny-metal-btn danger"; del.textContent = "×"; del.setAttribute("aria-label", "Delete card"); del.addEventListener("click", () => deleteCard(card.id));
        row.append(pickLabel, textWrap, activeLabel, edit, del); container.append(row);
      });
      syncBatchToolbar(); return;
    }
    if (searchCount) searchCount.textContent = "可搜索所有分组中的字卡";
    if (!state.customCards.length) {
      const empty = document.createElement("div"); empty.className = "empty-message";
      empty.textContent = "字卡库目前为空。添加或导入你自己的短句后，已启用的字卡才会参与随机回复。";
      container.append(empty); syncBatchToolbar(); return;
    }
    const sections = [{ id: "", name: "未分组 / Ungrouped" }, ...state.cardGroups.map(group => ({ id: group.id, name: group.name }))];
    sections.forEach(section => {
      const cards = state.customCards.filter(card => card.groupId === section.id || (section.id === "" && !card.groupId));
      if (!cards.length) return;
      const groupCollapsed = Boolean(cardUI.collapsedGroups[section.id || "__ungrouped__"]);
      const group = document.createElement("section"); group.className = `managed-card-group${groupCollapsed ? " is-collapsed" : ""}`;
      const header = document.createElement("div"); header.className = "managed-group-header";
      const title = document.createElement("button"); title.type = "button"; title.className = "managed-group-label"; title.setAttribute("aria-expanded", String(!groupCollapsed));
      const chevron = document.createElement("span"); chevron.className = "managed-group-chevron"; chevron.textContent = groupCollapsed ? "▸" : "▾";
      const label = document.createElement("span"); label.className = "managed-group-name"; label.textContent = section.name;
      const count = document.createElement("span"); count.className = "managed-group-count"; count.textContent = String(cards.length);
      title.append(chevron, label, count);
      const groupPickLabel = document.createElement("label"); groupPickLabel.className = "group-select-cards"; groupPickLabel.title = `选择${section.name}全部字卡`;
      const groupPick = document.createElement("input"); groupPick.type = "checkbox"; groupPick.setAttribute("aria-label", `选择${section.name}全部字卡`);
      const selectedInGroup = cards.filter(card => selectedCardIds.has(card.id)).length;
      groupPick.checked = cards.length > 0 && selectedInGroup === cards.length;
      groupPick.indeterminate = selectedInGroup > 0 && selectedInGroup < cards.length;
      groupPick.addEventListener("change", () => { cards.forEach(card => groupPick.checked ? selectedCardIds.add(card.id) : selectedCardIds.delete(card.id)); renderManagedCards(); });
      groupPickLabel.append(groupPick); header.append(title, groupPickLabel);
      const rows = document.createElement("div"); rows.className = "managed-group-cards"; rows.hidden = groupCollapsed;
      title.addEventListener("click", () => { const key = section.id || "__ungrouped__"; cardUI.collapsedGroups[key] = !cardUI.collapsedGroups[key]; saveCardUI(); renderManagedCards(); });
      cards.forEach(card => {
        const row = document.createElement("div"); row.className = `custom-card-item${isCardActive(card) ? " is-active" : " is-inactive"}${selectedCardIds.has(card.id) ? " is-selected" : ""}`;
        const pickLabel = document.createElement("label"); pickLabel.className = "card-pick-label"; pickLabel.title = "选择这张字卡";
        const pick = document.createElement("input"); pick.type = "checkbox"; pick.checked = selectedCardIds.has(card.id); pick.setAttribute("aria-label", `选择字卡：${card.text}`);
        pick.addEventListener("change", () => { if (pick.checked) selectedCardIds.add(card.id); else selectedCardIds.delete(card.id); row.classList.toggle("is-selected", pick.checked); syncBatchToolbar(); });
        const pickFace = document.createElement("span"); pickFace.className = "retro-checkbox-face"; pickLabel.append(pick, pickFace);
        const text = document.createElement("span"); text.className = "managed-card-text"; text.textContent = card.text;
        const activeLabel = document.createElement("label"); activeLabel.className = "retro-switch card-switch"; activeLabel.title = "单条字卡启用状态";
        const toggle = document.createElement("input"); toggle.type = "checkbox"; toggle.checked = card.enabled; toggle.setAttribute("aria-label", `启用字卡：${card.text}`);
        toggle.addEventListener("change", () => { card.enabled = toggle.checked; saveState(); renderMe(); });
        const slider = document.createElement("span"); slider.className = "retro-slider"; activeLabel.append(toggle, slider);
        const edit = document.createElement("button"); edit.type = "button"; edit.className = "tiny-metal-btn"; edit.textContent = "Edit"; edit.addEventListener("click", () => editCard(card.id));
        const del = document.createElement("button"); del.type = "button"; del.className = "tiny-metal-btn danger"; del.textContent = "×"; del.setAttribute("aria-label", "Delete card"); del.addEventListener("click", () => deleteCard(card.id));
        row.append(pickLabel, text, activeLabel, edit, del); rows.append(row);
      });
      group.append(header, rows); container.append(group);
    });
    syncBatchToolbar();
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

  async function importReplyJson(source) {
    let data;
    try { data = JSON.parse(source); } catch { throw new Error("JSON 格式无效，请确认文件内容完整。"); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("这不是有效的字卡 JSON 对象。");
    const groups = Array.isArray(data.customReplyGroups) ? data.customReplyGroups : [];
    const replies = Array.isArray(data.customReplies) ? data.customReplies : [];
    if (!groups.length && !replies.length) throw new Error("没有找到 customReplies 或 customReplyGroups 字段。");

    let added = 0, skipped = 0, groupsAdded = 0;
    const existingText = new Set(state.customCards.map(card => card.text.trim().toLocaleLowerCase()));
    const groupIdsByName = new Map(state.cardGroups.map(group => [group.name.trim().toLocaleLowerCase(), group.id]));
    const importedText = new Set();
    const normalizedGroups = [];
    for (const sourceGroup of groups) {
      if (!sourceGroup || typeof sourceGroup !== "object") continue;
      const name = String(sourceGroup.name || "导入分组").trim() || "导入分组";
      const key = name.toLocaleLowerCase();
      let groupId = groupIdsByName.get(key);
      if (!groupId) {
        groupId = uid();
        state.cardGroups.push({ id: groupId, name, enabled: sourceGroup.disabled !== true });
        groupIdsByName.set(key, groupId); groupsAdded++;
      } else {
        const existingGroup = state.cardGroups.find(group => group.id === groupId);
        if (existingGroup) existingGroup.enabled = sourceGroup.disabled !== true;
      }
      normalizedGroups.push({ sourceGroup, groupId });
      const items = Array.isArray(sourceGroup.items) ? sourceGroup.items : [];
      for (const item of items) {
        const text = String(item ?? "").trim();
        if (!text) continue;
        const keyText = text.toLocaleLowerCase();
        if (existingText.has(keyText) || importedText.has(keyText)) { skipped++; continue; }
        state.customCards.push({ id: uid(), text, groupId, enabled: sourceGroup.disabled !== true, createdAt: Date.now() });
        existingText.add(keyText); importedText.add(keyText); added++;
      }
    }
    // customReplies is the complete list in this export format. Import any entries not already covered by a group as ungrouped cards.
    for (const item of replies) {
      const text = String(item ?? "").trim();
      if (!text) continue;
      const keyText = text.toLocaleLowerCase();
      if (existingText.has(keyText) || importedText.has(keyText)) continue;
      state.customCards.push({ id: uid(), text, groupId: "", enabled: true, createdAt: Date.now() });
      existingText.add(keyText); importedText.add(keyText); added++;
    }
    saveState(); renderMe();
    showModal("JSON 导入完成", `新增 ${added} 张字卡，新增 ${groupsAdded} 个分组${skipped ? `，跳过重复字卡 ${skipped} 张` : ""}。分组和字卡的启用状态已按文件内容导入。`, "✓");
  }

  async function importCardFile(file) {
    if (!file) return;
    try {
      const source = (await file.text()).replace(/^\uFEFF/, "");
      if (/\.json$/i.test(file.name) || file.type.includes("json")) {
        await importReplyJson(source);
      } else {
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
      }
    } catch (error) { showModal("导入失败", error?.message || "无法读取文件。请使用 UTF-8 编码的 .txt、.csv 或兼容的 .json 文件。", "!"); }
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
    state.customCards = state.customCards.filter(item => item.id !== cardId); selectedCardIds.delete(cardId); saveState(); renderMe();
  }

  function preferenceSection(parent, title, subtitle = "") {
    const section = document.createElement("section"); section.className = "pref-section";
    const head = document.createElement("div"); head.className = "pref-section-heading";
    const strong = document.createElement("strong"); strong.textContent = title; head.append(strong);
    if (subtitle) { const small = document.createElement("small"); small.textContent = subtitle; head.append(small); }
    section.append(head); parent.append(section); return section;
  }
  function preferenceToggle(parent, title, description, checked, onChange) {
    const row = document.createElement("div"); row.className = "pref-row";
    const copy = document.createElement("div"); copy.className = "pref-copy";
    const label = document.createElement("strong"); label.textContent = title;
    const hint = document.createElement("small"); hint.textContent = description;
    copy.append(label, hint);
    const wrap = document.createElement("label"); wrap.className = "retro-switch pref-switch";
    const input = document.createElement("input"); input.type = "checkbox"; input.checked = Boolean(checked);
    const slider = document.createElement("span"); slider.className = "retro-slider";
    input.addEventListener("change", () => onChange(input.checked)); wrap.append(input, slider);
    row.append(copy, wrap); parent.append(row); return input;
  }
  function preferenceRange(parent, title, description, min, max, step, value, onChange, formatter = value => String(value)) {
    const row = document.createElement("div"); row.className = "pref-range-row";
    const titleRow = document.createElement("div"); titleRow.className = "pref-range-title";
    const label = document.createElement("strong"); label.textContent = title;
    const valueLabel = document.createElement("output"); valueLabel.className = "pref-range-value"; valueLabel.textContent = formatter(value);
    titleRow.append(label, valueLabel);
    const hint = document.createElement("small"); hint.className = "pref-range-hint"; hint.textContent = description;
    const input = document.createElement("input"); input.className = "retro-range"; input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    input.addEventListener("input", () => { valueLabel.textContent = formatter(Number(input.value)); onChange(Number(input.value), input, valueLabel); });
    row.append(titleRow, hint, input); parent.append(row); return input;
  }
  async function openChatPreferences() {
    const contactId = activeContactId;
    const prefs = { ...getChatPreferences(contactId) };
    const resultPromise = showModal(`${currentContact().name} · 对话偏好`, "只影响当前角色；设置会保存在这台设备的浏览器中。", "⚙", { confirm: true, okText: "Save Preferences" });
    const host = $("#modal-extra");
    const comboSection = preferenceSection(host, "01 · 回复内容生成规则", "RESPONSE COMPOSITION");
    const comboOptions = document.createElement("div"); comboOptions.className = "pref-nested";
    preferenceToggle(comboSection, "拼字卡功能 / Multi-Cards Combo", "开启后，每次回复会随机抽取 1 张到下方设定上限的字卡，组成同一条回复。", prefs.multiCardsEnabled, checked => { prefs.multiCardsEnabled = checked; comboOptions.classList.toggle("is-disabled", !checked); });
    preferenceRange(comboOptions, "字卡数量上限", "每次随机抽取 1 张至此上限，不会每次固定抽满；可用字卡不足时自动取可用数量。", 1, 5, 1, prefs.cardCount, value => { prefs.cardCount = value; }, value => `${value} 张`);
    preferenceToggle(comboOptions, "标点自动补充", "拼字卡模式下，自动为每条字卡补上句号“。”。", prefs.autoPunctuation, checked => { prefs.autoPunctuation = checked; });
    comboOptions.classList.toggle("is-disabled", !prefs.multiCardsEnabled);
    comboSection.append(comboOptions);
    preferenceToggle(comboSection, "附带颜文字 / Sticker in Bubble", "每条回复有 20% 概率附加一个颜文字；只会放在整段开头、整段结尾或完整字卡后面，不会插进句子中间。自带颜文字和「我的颜文字」都可被随机抽取。", prefs.stickerEnabled, checked => { prefs.stickerEnabled = checked; });

    const delaySection = preferenceSection(host, "02 · 拟人化回复与状态联动", "HUMAN-LIKE RESPONSE BEHAVIOR");
    preferenceRange(delaySection, "思考延迟 · 最短时间", "收到消息后至少等待多久再回复。", 0, 10, 0.5, prefs.delayMin, (value, input, output) => {
      prefs.delayMin = value;
      if (prefs.delayMax < value) { prefs.delayMax = value; const maxSlider = host.querySelector("#pref-delay-max"); if (maxSlider) { maxSlider.value = value; maxSlider.dispatchEvent(new Event("input")); } }
    }, value => `${Number(value).toFixed(1)} 秒`).id = "pref-delay-min";
    preferenceRange(delaySection, "思考延迟 · 最长时间", "系统会在最短与最长时间之间随机等待。", 0, 30, 0.5, Math.max(prefs.delayMax, prefs.delayMin), (value, input, output) => {
      prefs.delayMax = Math.max(value, prefs.delayMin);
      if (value < prefs.delayMin) { input.value = String(prefs.delayMin); output.textContent = `${Number(prefs.delayMin).toFixed(1)} 秒`; }
    }, value => `${Number(value).toFixed(1)} 秒`).id = "pref-delay-max";
    const noReplyOptions = document.createElement("div"); noReplyOptions.className = "pref-nested";
    preferenceToggle(delaySection, "启用已读不回 / No-Reply Simulation", "开启后按概率决定是否回复；关闭后角色总会尝试正常回复。", prefs.noReplyEnabled !== false, checked => { prefs.noReplyEnabled = checked; noReplyOptions.classList.toggle("is-disabled", !checked); });
    preferenceRange(noReplyOptions, "正常回复概率", "例如 70% 正常回复，剩余 30% 会已读不回。", 0, 100, 5, prefs.replyProbability, value => { prefs.replyProbability = value; }, value => `${value}%`);
    noReplyOptions.classList.toggle("is-disabled", prefs.noReplyEnabled === false);
    delaySection.append(noReplyOptions);
    const statusNote = document.createElement("div"); statusNote.className = "pref-status-note";
    statusNote.innerHTML = "<strong>Delivered / Read 状态规则</strong><span>你发送消息后，对方此前的消息变为 Read；你的新消息先显示 Delivered。角色实际回复后，你的消息变为 Read，而角色的新消息显示 Delivered。若触发已读不回，角色虽然不回复，但你的消息仍会变为 Read。</span>";
    delaySection.append(statusNote);
    const ttsSection = preferenceSection(host, "03 · 语音与 TTS 设置", "RETRO VOICE MESSAGE · MYMEMORY → MINIMAX");
    const translationSection = preferenceSection(ttsSection, "MyMemory 自动翻译", "PUBLIC TRANSLATION API · NO KEY REQUIRED");
    preferenceToggle(translationSection, "自动翻译字卡", "开启后，角色触发语音消息时，会先用 MyMemory 翻译，再将译文交给 MiniMax 合成语音。", prefs.autoTranslateCards, checked => { prefs.autoTranslateCards = checked; });
    preferenceToggle(translationSection, "语音消息同时显示译文", "勾选后，在语音条下方显示 MyMemory 返回的译文。", prefs.showTranslatedText !== false, checked => { prefs.showTranslatedText = checked; });
    const myMemoryNote = document.createElement("div"); myMemoryNote.className = "pref-status-note"; myMemoryNote.innerHTML = "<strong>无需 API Key 或代理</strong><span>直接通过公开的 MyMemory 翻译接口请求，适用于静态 GitHub Pages。需要联网，服务可能有免费额度、频率限制或临时不可用的情况。支持目标语言：英语、日语、韩语、德语。</span>"; translationSection.append(myMemoryNote);
    const testTranslation = document.createElement("button"); testTranslation.type = "button"; testTranslation.className = "chrome-btn tts-test-btn"; testTranslation.textContent = "⌕ 测试 MyMemory 翻译";
    testTranslation.addEventListener("click", async () => {
      prefs.ttsLanguage = lang.value;
      const targetLang = translationTargetLanguage(prefs.ttsLanguage);
      if (!targetLang) { await showDiagnosticError("MyMemory 测试失败", new Error("请先在「语音语言」中选择英语、日语、韩语或德语；选择「原文」无法确定翻译目标。"), { 当前语言: prefs.ttsLanguage, 支持目标语言: "英语 / 日语 / 韩语 / 德语" }); return; }
      testTranslation.disabled = true; testTranslation.textContent = "正在测试连接…";
      const sample = "你好，很高兴认识你。";
      try {
        const translated = await translateWithMyMemory(sample, prefs);
        await showModal("MyMemory 翻译成功 ✓", `目标语言：${prefs.ttsLanguage}\n测试原文：${sample}\n翻译结果：${translated}\n\n翻译服务已成功返回译文。若语音仍无法播放，请再单独测试 MiniMax。`, "✓", { okText: "完成" });
      } catch (error) {
        await showDiagnosticError("MyMemory 测试失败 · 错误详情", error, { 失败阶段: "网页 → MyMemory 翻译 API", 请求地址: "https://api.mymemory.translated.net/get", 目标语言: prefs.ttsLanguage, 测试原文: sample, 排查建议: "请检查网络连接；公开服务可能存在额度或频率限制，请稍后再试。", 浏览器: navigator.userAgent });
      } finally { testTranslation.disabled = false; testTranslation.textContent = "⌕ 测试 MyMemory 翻译"; }
    });
    translationSection.append(testTranslation);
    preferenceToggle(ttsSection, "启用角色语音消息", "开启后，角色每次回复有 40% 概率显示为复古语音条。", prefs.ttsEnabled, checked => { prefs.ttsEnabled = checked; });
    const apiKey = addModalField(ttsSection, "MiniMax API Key（密码隐藏）", { type: "password", value: prefs.minimaxApiKey, placeholder: "输入 API Key" }); apiKey.autocomplete = "off"; apiKey.addEventListener("input", () => prefs.minimaxApiKey = apiKey.value);
    const groupId = addModalField(ttsSection, "Group ID", { value: prefs.minimaxGroupId, placeholder: "MiniMax Group ID" }); groupId.addEventListener("input", () => prefs.minimaxGroupId = groupId.value);
    const model = addModalField(ttsSection, "Model", { value: prefs.ttsModel || "speech-2.8-hd" }); model.addEventListener("input", () => prefs.ttsModel = model.value);
    const voiceId = addModalField(ttsSection, "Voice ID", { value: prefs.voiceId, placeholder: "音色代码" }); voiceId.addEventListener("input", () => prefs.voiceId = voiceId.value);
    const lang = addModalField(ttsSection, "语音语言", { tag: "select", value: prefs.ttsLanguage, choices: [{value:"原文",label:"原文"},{value:"日语",label:"日语"},{value:"英语",label:"英语"},{value:"韩语",label:"韩语"},{value:"德语",label:"德语"}] }); lang.value = prefs.ttsLanguage; lang.addEventListener("change", () => prefs.ttsLanguage = lang.value);

    preferenceRange(ttsSection, "语速 · Speed", "慢 ↔ 快；可在试听按钮中试听当前配置。", 0.5, 2, 0.05, Number(prefs.ttsSpeed) || 1, value => { prefs.ttsSpeed = value; }, value => `${Number(value).toFixed(2)}x`);
    const gender = addModalField(ttsSection, "角色性别", { tag: "select", value: prefs.ttsGender, choices: [{value:"男",label:"男"},{value:"女",label:"女"}] }); gender.value = prefs.ttsGender; gender.addEventListener("change", () => prefs.ttsGender = gender.value);
    const emotion = addModalField(ttsSection, "说话风格预设", { tag: "select", value: prefs.ttsEmotion, choices: ["傲娇冷漠","温柔体贴","活泼开朗","高冷霸道","自定义"].map(v => ({value:v,label:v})) }); emotion.value = prefs.ttsEmotion; emotion.addEventListener("change", () => prefs.ttsEmotion = emotion.value);
    const customEmotion = addModalField(ttsSection, "自定义情绪描述（最多 50 字）", { value: prefs.ttsCustomEmotion, placeholder: "例如：压低声音，克制但带一点吃醋", maxLength: 50 }); customEmotion.addEventListener("input", () => prefs.ttsCustomEmotion = customEmotion.value.slice(0,50));
    const testVoice = document.createElement("button"); testVoice.type = "button"; testVoice.className = "chrome-btn tts-test-btn"; testVoice.textContent = "▶ 试听当前设置"; testVoice.addEventListener("click", async () => { prefs.minimaxApiKey = apiKey.value.trim(); prefs.minimaxGroupId = groupId.value.trim(); prefs.voiceId = voiceId.value.trim(); prefs.ttsModel = model.value.trim() || "speech-2.8-hd"; prefs.ttsLanguage = lang.value; prefs.ttsSpeed = Number(ttsSection.querySelector(".retro-range")?.value || prefs.ttsSpeed); if (!prefs.minimaxApiKey || !prefs.voiceId) { await showDiagnosticError("试听配置不完整", new Error(!prefs.minimaxApiKey ? "API Key 为空，请填写 MiniMax API Key。" : "Voice ID 为空，请填写有效音色 ID。"), { 当前模型: prefs.ttsModel, GroupID: prefs.minimaxGroupId ? "已填写" : "未填写", VoiceID: prefs.voiceId ? "已填写" : "未填写", 提示: "不要把 API Key 截图或发给他人。" }); return; } testVoice.disabled = true; testVoice.textContent = "正在生成…"; let stage = "请求 MiniMax 生成音频"; try { let testText = "你好，这是复古字卡语音试听。"; if (shouldTranslateVoice(prefs)) { try { testText = await translateWithMyMemory(testText, prefs); } catch (translationError) { stage = "MyMemory 翻译（已回退原文）"; } } const url = await generateMiniMaxAudio(testText, prefs); stage = "浏览器播放音频"; const audio = new Audio(url); await new Promise((resolve, reject) => { audio.addEventListener("canplaythrough", resolve, { once: true }); audio.addEventListener("error", () => reject(new Error(`音频已返回但浏览器无法解码或播放（audio.error code: ${audio.error?.code || "unknown"}）。请检查音频格式和返回数据。`)), { once: true }); audio.load(); setTimeout(() => { if (audio.readyState >= 3) resolve(); }, 1500); }); await audio.play(); } catch (e) { await showDiagnosticError("试听失败 · 诊断信息", e, { 失败阶段: stage, 请求地址: "https://api.minimaxi.com/v1/t2a_v2", 模型: prefs.ttsModel, 语音ID: prefs.voiceId, GroupID: prefs.minimaxGroupId ? "已填写（T2A v2 请求通常不需要此字段）" : "未填写", 浏览器: navigator.userAgent, 附加诊断: e?.diagnostic ? JSON.stringify(e.diagnostic, null, 2) : "无服务端结构化错误信息" }); } finally { testVoice.disabled = false; testVoice.textContent = "▶ 试听当前设置"; } }); ttsSection.append(testVoice);
    const securityNote = document.createElement("div"); securityNote.className = "pref-status-note"; securityNote.innerHTML = "<strong>接口安全提醒</strong><span>此纯前端 Demo 会将 API Key 保存在本机浏览器设置中，且浏览器请求可能暴露密钥。正式公开部署请改用服务端代理，不要把真实密钥提交到 GitHub。</span>"; ttsSection.append(securityNote);

    const result = await resultPromise;
    if (result) {
      prefs.cardCount = Math.max(1, Math.min(5, Number(prefs.cardCount) || 1));
      prefs.delayMin = Math.max(0, Math.min(10, Number(prefs.delayMin) || 0));
      prefs.delayMax = Math.max(prefs.delayMin, Math.min(30, Number(prefs.delayMax) || prefs.delayMin));
      prefs.replyProbability = Math.max(0, Math.min(100, Number(prefs.replyProbability)));
      prefs.noReplyEnabled = prefs.noReplyEnabled !== false;
      setChatPreferences(contactId, prefs);
      showModal("Preferences Saved", `${currentContact().name} 的对话偏好已保存。`, "✓");
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "retro-otome-backup.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  function updateClock() {}

  $$(".tab-item").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $("#back-btn").addEventListener("click", () => { if (inChat) { inChat = false; renderLayout(); renderConversations(); } else if (activeTab === "notes") { if (!$("#note-editor").hidden) { if (["letter","diary"].includes(currentNoteKind)) openNoteCollection(currentNoteKind); else { $("#notes-home").hidden=false; $("#note-editor").hidden=true; renderNotes(); renderLayout(); } } else if (!$("#note-reader").hidden) openNoteCollection(currentNoteKind); else { $("#notes-home").hidden = false; $("#note-collection").hidden=true; $("#note-reader").hidden=true; $("#note-editor").hidden = true; selectedNoteIds.clear(); renderLayout(); renderNotes(); } } });
  $("#composer").addEventListener("submit", event => { event.preventDefault(); sendMessage($("#message-input").value); });
  $("#cancel-selection").addEventListener("click", () => { endSelectionMode(); renderMessages(); });
  $("#delete-selected").addEventListener("click", deleteSelectedMessages);
  $("#save-selected-group").addEventListener("click", saveSelectedGroup);
  $("#more-btn").addEventListener("click", () => toggleComposerPanel("extension"));
  $("#sticker-btn").addEventListener("click", () => toggleComposerPanel("stickers"));
  $("#close-extension").addEventListener("click", () => { $("#extension-panel").hidden = true; });
  $("#close-stickers").addEventListener("click", () => { $("#sticker-tray").hidden = true; });
  $("#custom-sticker-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#custom-sticker-input");
    if (addCustomSticker(input.value)) input.value = "";
  });
  $("#sticker-grid").addEventListener("click", event => {
    const removeButton = event.target.closest("[data-custom-sticker-remove]");
    if (removeButton) {
      const index = Number(removeButton.dataset.customStickerRemove);
      if (Number.isInteger(index) && index >= 0 && index < (state.customStickers || []).length) {
        state.customStickers.splice(index, 1);
        saveState();
        renderCustomStickers();
      }
      return;
    }
    const sendButton = event.target.closest("[data-custom-sticker-send]");
    if (sendButton) {
      const sticker = state.customStickers?.[Number(sendButton.dataset.customStickerSend)];
      if (sticker) {
        $("#sticker-tray").hidden = true;
        sendSpecialMessage({ kind: "sticker", text: sticker }, true);
      }
    }
  });
  $$("[data-extension]").forEach(button => button.addEventListener("click", () => composeExtension(button.dataset.extension)));
  $$("[data-sticker]").forEach(button => button.addEventListener("click", () => { const sticker = button.dataset.sticker; $("#sticker-tray").hidden = true; sendSpecialMessage({ kind: "sticker", text: sticker }, true); }));
  $("#camera-btn").addEventListener("click", () => showModal("Camera", "这是一个复古界面 Demo，目前不会调用设备相机或上传真实照片。", "▣"));
  $("#voice-btn").addEventListener("click", recordVoiceMessage);
  let callConnectTimeout = null, callTickInterval = null, callStartedAt = 0, callConnected = false, activeCallContact = null, activeCallStartedAt = 0;
  let dialpadValue = "", dtmfAudioContext = null;
  const DTMF_FREQUENCIES = {
    "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
    "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
    "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
    "*": [941, 1209], "0": [941, 1336], "#": [941, 1477]
  };
  function playDtmfTone(digit) {
    const frequencies = DTMF_FREQUENCIES[digit];
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!frequencies || !AudioContextClass) return;
    try {
      if (!dtmfAudioContext) dtmfAudioContext = new AudioContextClass();
      const context = dtmfAudioContext;
      const play = () => {
        const now = context.currentTime;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
        gain.gain.setValueAtTime(0.16, now + 0.105);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.155);
        gain.connect(context.destination);
        let remaining = frequencies.length;
        frequencies.forEach(frequency => {
          const oscillator = context.createOscillator();
          oscillator.type = "sine"; oscillator.frequency.setValueAtTime(frequency, now);
          oscillator.connect(gain); oscillator.onended = () => { oscillator.disconnect(); remaining -= 1; if (!remaining) gain.disconnect(); };
          oscillator.start(now); oscillator.stop(now + 0.16);
        });
      };
      if (context.state === "suspended") context.resume().then(play).catch(() => {});
      else play();
    } catch (error) { /* Older browsers may not support Web Audio; keypad input still works. */ }
  }
  function clearDialpadDisplay() {
    const display = $("#dialpad-display");
    if (!display) return;
    // Support either an <input> or the current <output>; clear both value and
    // rendered content so no stale text/HTML can survive between openings.
    if ("value" in display) display.value = "";
    display.textContent = "";
    display.replaceChildren();
  }
  function renderDialpadValue() {
    const display = $("#dialpad-display");
    if (!display) return;
    const cleanValue = String(dialpadValue || "");
    if ("value" in display) display.value = cleanValue;
    else display.textContent = cleanValue;
  }
  // The dialpad display must be blank on initial page load.
  dialpadValue = "";
  clearDialpadDisplay();
  function setDialpadOpen(open) {
    const panel = $("#ios6-dialpad-panel");
    const button = $("#tool-keypad");
    if (!panel || !button) return;
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    const callContent = panel.closest(".ios6-call-content");
    if (callContent) callContent.classList.toggle("dialpad-open", open);
    button.classList.toggle("active", open);
    button.setAttribute("aria-pressed", String(open));
  }
  function formatCallTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
  function formatClockTime(date = new Date()) { return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`; }
  function saveCallLog(status, durationSeconds = 0, contactOverride = null, callType = "call", startedAtOverride = 0) {
    const logContact = contactOverride || activeCallContact;
    if (!logContact) return;
    const contactId = logContact.id || activeContactId;
    const endedAt = new Date();
    const record = { id: uid(), kind: "call-log", type: "received", callType, callStatus: status, contactId, contactName: logContact.name || "联系人", durationSeconds: Math.max(0, Math.floor(durationSeconds)), callStartedAt: startedAtOverride || activeCallStartedAt || endedAt.getTime(), callEndedAt: endedAt.toISOString(), time: formatClockTime(endedAt), createdAt: endedAt.getTime() };
    if (!Array.isArray(state.messages[contactId])) state.messages[contactId] = [];
    state.messages[contactId].push(record);
    const dateText = `${String(endedAt.getMonth()+1).padStart(2,"0")}/${String(endedAt.getDate()).padStart(2,"0")} ${formatClockTime(endedAt)}`;
    const callLabel = callType === "facetime" ? "FaceTime" : "通话";
    state.previews[contactId] = status === "missed" ? `${callLabel}未接听 · ${dateText}` : `${callLabel}结束 ${formatCallTime(durationSeconds)} · ${dateText}`;
    const contact = CONTACTS.find(item => item.id === contactId);
    if (contact) contact.time = formatClockTime(endedAt);
    saveState();
    renderConversations();
    if (inChat && activeContactId === contactId) renderMessages();
  }
  function startCall(contactArg) {
    const contact = (contactArg && typeof contactArg === "object") ? contactArg : currentContact();
    const panel = $("#call-screen");
    if (!panel) return;
    clearTimeout(callConnectTimeout); clearInterval(callTickInterval);
    callConnectTimeout = null; callTickInterval = null; callConnected = false; callStartedAt = 0;
    activeCallContact = contact; activeCallStartedAt = Date.now();
    dialpadValue = ""; renderDialpadValue(); setDialpadOpen(false);
    $("#call-contact-name").textContent = contact.name || (typeof contactArg === "string" ? contactArg : "联系人");
    const avatar = $("#call-avatar");
    avatar.src = contact.avatar || currentContact().avatar || "";
    avatar.alt = `${contact.name || "联系人"}的头像`;
    const status = $("#call-status");
    status.className = "ios6-status-connecting";
    status.innerHTML = '<span class="ios6-pulse-ring" aria-hidden="true"></span>正在呼叫...';
    ["#tool-mute", "#tool-keypad", "#tool-speaker"].forEach(selector => { const el = $(selector); el.classList.remove("active"); el.setAttribute("aria-pressed", "false"); });
    panel.style.display = "";
    panel.classList.remove("hidden", "is-minimized"); panel.setAttribute("aria-hidden", "false"); panel.setAttribute("aria-modal", "true");
    const miniIcon = $("#call-minimized-icon");
    if (miniIcon) { miniIcon.hidden = true; miniIcon.classList.remove("is-visible"); }
    callConnectTimeout = setTimeout(() => {
      // The Call screen may be hidden while switching to FaceTime; the call
      // session itself is still active and must finish connecting normally.
      if (!activeCallContact) return;
      callConnected = true; callStartedAt = Date.now();
      status.className = "ios6-status-timer"; status.textContent = "00:00";
      callTickInterval = setInterval(() => {
        if (!callConnected || panel.classList.contains("hidden")) return;
        status.textContent = formatCallTime(Math.floor((Date.now() - callStartedAt) / 1000));
      }, 500);
    }, 1500);
  }
  function minimizeCall() {
    const panel = $("#call-screen");
    if (!activeCallContact || !panel || panel.classList.contains("hidden")) return;
    setDialpadOpen(false);
    panel.classList.add("is-minimized");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-modal", "false");
    const miniIcon = $("#call-minimized-icon");
    if (miniIcon) { miniIcon.hidden = false; requestAnimationFrame(() => miniIcon.classList.add("is-visible")); }
  }
  function restoreCall() {
    const panel = $("#call-screen");
    if (!activeCallContact || !panel) return;
    panel.style.display = "";
    panel.classList.remove("is-minimized", "hidden");
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-modal", "true");
    const miniIcon = $("#call-minimized-icon");
    if (miniIcon) { miniIcon.classList.remove("is-visible"); setTimeout(() => { if (!panel.classList.contains("is-minimized")) miniIcon.hidden = true; }, 180); }
  }
  function endCall() {
    const hadActiveCall = Boolean(activeCallContact);
    const wasConnected = callConnected;
    const duration = wasConnected && callStartedAt ? Math.floor((Date.now() - callStartedAt) / 1000) : 0;
    clearTimeout(callConnectTimeout); clearInterval(callTickInterval);
    callConnectTimeout = null; callTickInterval = null; callConnected = false; callStartedAt = 0;
    const panel = $("#call-screen");
    setDialpadOpen(false);
    if (panel) { panel.style.display = ""; panel.classList.remove("is-minimized"); panel.classList.add("hidden"); panel.setAttribute("aria-hidden", "true"); panel.setAttribute("aria-modal", "false"); }
    const miniIcon = $("#call-minimized-icon");
    if (miniIcon) { miniIcon.classList.remove("is-visible"); miniIcon.hidden = true; }
    if (hadActiveCall) saveCallLog(wasConnected ? "ended" : "missed", duration);
    activeCallContact = null; activeCallStartedAt = 0;
  }
  const FACETIME_PHOTO_KEY = "retroOtome_facetime_persistent_photo_v1";
  let faceTimeTickInterval = null, faceTimeStartedAt = 0, faceTimeSessionStartedAt = 0, faceTimeReturnToCall = false, faceTimeObjectUrl = null, faceTimeIsMinimized = false, faceTimeContact = null;
  function getSavedFaceTimePhoto() { try { return localStorage.getItem(FACETIME_PHOTO_KEY) || ""; } catch { return ""; } }
  function updateFaceTimeTimer() {
    if (!faceTimeStartedAt) return;
    // FaceTime takes over the active Call session's timestamp when switched
    // from Call, so the visible timer continues without keeping Call alive.
    const timer = $("#facetime-timer");
    if (timer) timer.textContent = formatCallTime(Math.floor((Date.now() - faceTimeStartedAt) / 1000));
  }
  function openFaceTime(contactArg, fromCall = false) {
    const panel = $("#facetime-screen");
    if (!panel) return;
    if (faceTimeIsMinimized && faceTimeStartedAt) { restoreFaceTime(); return; }
    const contact = (contactArg && typeof contactArg === "object") ? contactArg : currentContact();
    clearInterval(faceTimeTickInterval);
    faceTimeTickInterval = null;
    const takingOverCall = Boolean(fromCall && activeCallContact);
    const callTimestamp = takingOverCall && callConnected && callStartedAt ? callStartedAt : 0;
    const now = Date.now();
    // Call is silently ended as a UI/session, but its elapsed time is carried
    // into FaceTime. No Call-ended log is created during this transition.
    faceTimeReturnToCall = false;
    faceTimeSessionStartedAt = callTimestamp || now;
    faceTimeStartedAt = faceTimeSessionStartedAt;
    faceTimeContact = contact;
    faceTimeIsMinimized = false;
    if (takingOverCall) {
      setDialpadOpen(false);
      clearTimeout(callConnectTimeout);
      clearInterval(callTickInterval);
      callConnectTimeout = null; callTickInterval = null;
      callConnected = false; callStartedAt = 0;
      activeCallContact = null; activeCallStartedAt = 0;
      const callPanel = $("#call-screen");
      if (callPanel) {
        callPanel.classList.remove("is-minimized");
        callPanel.classList.add("hidden");
        callPanel.setAttribute("aria-hidden", "true"); callPanel.setAttribute("aria-modal", "false");
        callPanel.style.display = "none";
      }
      const callMini = $("#call-minimized-icon");
      if (callMini) { callMini.classList.remove("is-visible"); callMini.hidden = true; }
    }
    $("#facetime-contact-name").textContent = contact.name || "联系人";
    $("#facetime-status").textContent = "视频展示已连接";
    $("#facetime-timer").textContent = formatCallTime(Math.floor((Date.now() - faceTimeStartedAt) / 1000));
    const portrait = $("#facetime-portrait");
    portrait.classList.remove("is-mirrored");
    portrait.alt = `${contact.name || "联系人"}的展示照片`;
    if (faceTimeObjectUrl) { URL.revokeObjectURL(faceTimeObjectUrl); faceTimeObjectUrl = null; }
    // A user-uploaded FaceTime photo is a persistent display preference, not a
    // chat message. Keep it until another photo is selected, including reloads.
    const savedPhoto = getSavedFaceTimePhoto();
    portrait.src = savedPhoto || contact.avatar || currentContact().avatar || "";
    $("#facetime-empty").hidden = Boolean(portrait.src);
    $("#facetime-mute").setAttribute("aria-pressed", "false");
    $("#facetime-flip").setAttribute("aria-pressed", "false");
    const mini = $("#facetime-minimized-icon");
    mini.hidden = true; mini.classList.remove("is-visible"); mini.style.left = ""; mini.style.top = ""; mini.style.right = "12px"; mini.style.bottom = "";
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-modal", "true");
    requestAnimationFrame(() => panel.classList.add("is-visible"));
    updateFaceTimeTimer();
    faceTimeTickInterval = setInterval(updateFaceTimeTimer, 500);
  }
  function minimizeFaceTime() {
    const panel = $("#facetime-screen");
    if (!panel || panel.classList.contains("hidden") || faceTimeIsMinimized) return;
    faceTimeIsMinimized = true;
    panel.classList.remove("is-visible");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-modal", "false");
    const mini = $("#facetime-minimized-icon");
    mini.hidden = false;
    requestAnimationFrame(() => mini.classList.add("is-visible"));
    setTimeout(() => { if (faceTimeIsMinimized) panel.classList.add("hidden"); }, 280);
  }
  function restoreFaceTime() {
    const panel = $("#facetime-screen");
    if (!panel) return;
    faceTimeIsMinimized = false;
    const mini = $("#facetime-minimized-icon");
    mini.classList.remove("is-visible");
    setTimeout(() => { if (!mini.classList.contains("is-visible")) mini.hidden = true; }, 220);
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    panel.setAttribute("aria-modal", "true");
    requestAnimationFrame(() => panel.classList.add("is-visible"));
    updateFaceTimeTimer();
  }
  function closeFaceTime() {
    const panel = $("#facetime-screen");
    if (!panel || (panel.classList.contains("hidden") && !faceTimeIsMinimized)) return;
    const endedAt = Date.now();
    const endedContact = faceTimeContact;
    // If FaceTime replaced Call, faceTimeStartedAt is the original connected
    // Call timestamp, so the final record reflects the entire continuous call.
    const logStartedAt = faceTimeStartedAt || faceTimeSessionStartedAt;
    const duration = logStartedAt ? Math.floor((endedAt - logStartedAt) / 1000) : 0;
    if (endedContact && logStartedAt) saveCallLog("ended", duration, endedContact, "facetime", logStartedAt);
    clearInterval(faceTimeTickInterval);
    faceTimeTickInterval = null;
    faceTimeStartedAt = 0;
    faceTimeSessionStartedAt = 0;
    faceTimeIsMinimized = false;
    panel.classList.remove("is-visible");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-modal", "false");
    const mini = $("#facetime-minimized-icon");
    mini.classList.remove("is-visible"); mini.hidden = true;
    setTimeout(() => {
      panel.classList.add("hidden");
      faceTimeReturnToCall = false;
      faceTimeContact = null;
    }, 280);
  }
  function chooseFaceTimePhoto() { $("#facetime-photo-input").click(); }
  $$(".action-btn").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.action === "call") { startCall(currentContact()); return; }
    if (button.dataset.action === "facetime") { openFaceTime(currentContact(), false); return; }
    const actions = { contact: ["Contact", "联系人卡片已打开。转账为视觉模拟，不会发起真实支付。", "♙"] };
    if (actions[button.dataset.action]) showModal(...actions[button.dataset.action]);
  }));
  $("#call-end-btn").addEventListener("click", endCall);
  $("#call-back-btn").addEventListener("click", minimizeCall);
  $("#call-minimized-icon").addEventListener("click", () => { if (!$("#call-minimized-icon").dataset.dragged) restoreCall(); });
  // The floating call chip can be dragged anywhere inside the phone frame.
  (() => {
    const chip = $("#call-minimized-icon");
    const phone = $(".phone");
    if (!chip || !phone) return;
    let pointerStartX = 0, pointerStartY = 0, chipStartX = 0, chipStartY = 0, dragging = false;
    chip.addEventListener("pointerdown", event => {
      if (chip.hidden) return;
      const rect = chip.getBoundingClientRect();
      const parent = phone.getBoundingClientRect();
      pointerStartX = event.clientX; pointerStartY = event.clientY;
      chipStartX = rect.left - parent.left; chipStartY = rect.top - parent.top;
      dragging = false; chip.dataset.dragged = "";
      chip.setPointerCapture(event.pointerId);
    });
    chip.addEventListener("pointermove", event => {
      if (!chip.hasPointerCapture(event.pointerId)) return;
      const dx = event.clientX - pointerStartX, dy = event.clientY - pointerStartY;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragging = true;
      if (!dragging) return;
      const maxX = phone.clientWidth - chip.offsetWidth - 4;
      const maxY = phone.clientHeight - chip.offsetHeight - 4;
      chip.style.left = `${Math.max(4, Math.min(maxX, chipStartX + dx))}px`;
      chip.style.top = `${Math.max(4, Math.min(maxY, chipStartY + dy))}px`;
      chip.style.right = "auto"; chip.style.bottom = "auto";
    });
    const finishDrag = () => { if (dragging) { chip.dataset.dragged = "true"; setTimeout(() => { chip.dataset.dragged = ""; }, 0); } dragging = false; };
    chip.addEventListener("pointerup", finishDrag);
    chip.addEventListener("pointercancel", finishDrag);
  })();
  const callTools = {
    "#tool-mute": { label: "静音", toggle: true },
    "#tool-speaker": { label: "免提", toggle: true }
  };
  Object.entries(callTools).forEach(([selector]) => $(selector).addEventListener("click", () => {
    const button = $(selector);
    const active = button.classList.toggle("active");
    button.setAttribute("aria-pressed", String(active));
  }));
  $("#tool-keypad").addEventListener("click", () => {
    const opening = !$("#ios6-dialpad-panel").classList.contains("is-open");
    // Always start with a clean display whenever the keypad is opened.
    if (opening) {
      dialpadValue = "";
      clearDialpadDisplay();
      renderDialpadValue();
    }
    setDialpadOpen(opening);
  });
  $$("[data-dial-digit]").forEach(button => button.addEventListener("click", () => {
    const digit = button.dataset.dialDigit;
    if (!Object.prototype.hasOwnProperty.call(DTMF_FREQUENCIES, digit)) return;
    dialpadValue = (dialpadValue + digit).slice(-40);
    renderDialpadValue(); playDtmfTone(digit);
  }));
  $("#dialpad-delete").addEventListener("click", () => { dialpadValue = dialpadValue.slice(0, -1); renderDialpadValue(); });
  $("#dialpad-close").addEventListener("click", () => setDialpadOpen(false));
  $("#tool-add").addEventListener("click", () => showModal("添加通话", "这是界面演示，暂不支持真实的多方通话。", "＋"));
  $("#tool-facetime").addEventListener("click", () => openFaceTime(activeCallContact || currentContact(), Boolean(activeCallContact)));
  $("#facetime-end-btn").addEventListener("click", closeFaceTime);
  $("#facetime-upload-top").addEventListener("click", chooseFaceTimePhoto);
  $("#facetime-minimize-btn").addEventListener("click", minimizeFaceTime);
  $("#facetime-minimized-icon").addEventListener("click", () => { if (!$("#facetime-minimized-icon").dataset.dragged) restoreFaceTime(); });
  // Allow the minimized FaceTime tile to be repositioned within the phone screen.
  (() => {
    const chip = $("#facetime-minimized-icon");
    const phone = $(".phone");
    if (!chip || !phone) return;
    let startX = 0, startY = 0, chipX = 0, chipY = 0, dragging = false;
    chip.addEventListener("pointerdown", event => {
      if (chip.hidden) return;
      const rect = chip.getBoundingClientRect(), parent = phone.getBoundingClientRect();
      startX = event.clientX; startY = event.clientY; chipX = rect.left - parent.left; chipY = rect.top - parent.top;
      dragging = false; chip.dataset.dragged = ""; chip.setPointerCapture(event.pointerId);
    });
    chip.addEventListener("pointermove", event => {
      if (!chip.hasPointerCapture(event.pointerId)) return;
      const dx = event.clientX - startX, dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragging = true;
      if (!dragging) return;
      const maxX = phone.clientWidth - chip.offsetWidth - 4, maxY = phone.clientHeight - chip.offsetHeight - 4;
      chip.style.left = `${Math.max(4, Math.min(maxX, chipX + dx))}px`; chip.style.top = `${Math.max(4, Math.min(maxY, chipY + dy))}px`;
      chip.style.right = "auto"; chip.style.bottom = "auto";
    });
    const finish = () => { if (dragging) { chip.dataset.dragged = "true"; setTimeout(() => { chip.dataset.dragged = ""; }, 0); } dragging = false; };
    chip.addEventListener("pointerup", finish); chip.addEventListener("pointercancel", finish);
  })();
  $("#facetime-photo-input").addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showModal("图片格式不支持", "请选择 JPG、PNG、WebP 等图片文件。", "!"); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      try { localStorage.setItem(FACETIME_PHOTO_KEY, reader.result); }
      catch (error) { showModal("图片保存失败", "图片可能太大，请换一张尺寸较小的图片再试。", "!"); return; }
      if (faceTimeObjectUrl) { URL.revokeObjectURL(faceTimeObjectUrl); faceTimeObjectUrl = null; }
      const portrait = $("#facetime-portrait");
      portrait.src = reader.result;
      portrait.alt = `${file.name}（已保存的 FaceTime 展示图片）`;
      $("#facetime-empty").hidden = true;
    };
    reader.onerror = () => showModal("图片读取失败", "请重新选择这张图片。", "!");
    reader.readAsDataURL(file);
    event.target.value = "";
  });
  $("#facetime-mute").addEventListener("click", event => {
    const button = event.currentTarget;
    button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true"));
  });
  $("#facetime-flip").addEventListener("click", event => {
    const button = event.currentTarget;
    const active = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(active));
    $("#facetime-portrait").classList.toggle("is-mirrored", active);
  });
  $("#tool-contacts").addEventListener("click", () => showModal("通讯录", "当前通话联系人：" + currentContact().name, "♙"));
  document.addEventListener("keydown", event => {
    const callPanel = $("#call-screen");
    if (event.key !== "Escape") return;
    const faceTimePanel = $("#facetime-screen");
    if (faceTimePanel && (!faceTimePanel.classList.contains("hidden") || faceTimeIsMinimized)) { closeFaceTime(); return; }
    if (callPanel.classList.contains("hidden")) return;
    if (callPanel.classList.contains("is-minimized")) return;
    if ($("#ios6-dialpad-panel").classList.contains("is-open")) setDialpadOpen(false);
    else minimizeCall();
  });
  $("#modal-ok").addEventListener("click", () => closeModal(true)); $("#modal-cancel").addEventListener("click", () => closeModal(false));
  $("#modal").addEventListener("click", event => { if (event.target === $("#modal")) closeModal(false); }); document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(false); });
  $$(".mood-chip").forEach(button => button.addEventListener("click", () => { currentFilter = button.dataset.filter; $$(".mood-chip").forEach(chip => chip.classList.toggle("active", chip === button)); renderConversations(); }));
  $("#profile-done").addEventListener("click", () => showModal("Profile", "个人主页已就绪。新的聊天字卡会被收进 Saved。", "♡"));
  $("#open-music-board").addEventListener("click", () => { $("#notes-home").hidden = true; $("#notes-music-board").hidden = false; $("#note-collection").hidden = true; $("#note-reader").hidden = true; $("#note-editor").hidden = true; renderLayout(); });
  $("#music-board-back").addEventListener("click", () => { $("#notes-music-board").hidden = true; $("#notes-home").hidden = false; renderLayout(); });
  $$(".notes-row[data-note-kind]").forEach(button => button.addEventListener("click", () => {
    const kind = button.dataset.noteKind;
    if (["letter", "diary", "all"].includes(kind)) { openNoteCollection(kind); return; }
    currentNoteKind = kind; $("#notes-home").hidden = false; $("#note-collection").hidden=true; $("#note-reader").hidden=true; $("#note-editor").hidden = true; editingNoteId = null; renderNotes(); renderLayout();
  }));
  $("#new-note").addEventListener("click", () => {
    if (["letter", "diary", "collage"].includes(currentNoteKind)) { openNoteEditor(currentNoteKind); return; }
    const choice = window.prompt("新建内容类型：输入 letter（信件）、diary（日记）或 collage（字卡拼贴）", "diary");
    if (!choice) return; const type = choice.trim().toLowerCase(); if (!["letter", "diary", "collage"].includes(type)) { showModal("Type not found", "请输入 letter、diary 或 collage。", "✉"); return; } openNoteEditor(type);
  });
  $("#notes-back").addEventListener("click", () => { if (["letter","diary"].includes(currentNoteKind)) openNoteCollection(currentNoteKind); else { $("#notes-home").hidden = false; $("#note-editor").hidden = true; editingNoteId = null; currentNoteKind = "all"; renderLayout(); renderNotes(); } });
  $("#collection-back").addEventListener("click", () => { $("#notes-home").hidden=false; $("#note-collection").hidden=true; $("#note-reader").hidden=true; $("#note-editor").hidden=true; selectedNoteIds.clear(); readingNoteId = null; editingNoteId = null; currentNoteKind = "all"; renderLayout(); renderNotes(); });
  $("#edit-selected-note").addEventListener("click", () => {
    if (selectedNoteIds.size !== 1) return;
    const id = selectedNoteIds.values().next().value;
    const note = state.notes.find(item => item.id === id);
    if (note) openNoteEditor(note.type, note.id);
  });
  $("#create-collection-note").addEventListener("click", () => {
    if (currentNoteKind !== "all") { openNoteEditor(currentNoteKind); return; }
    const choice = window.prompt("新建内容类型：输入 letter（信件）、diary（日记）或 collage（字卡拼贴）", "letter");
    if (!choice) return;
    const type = choice.trim().toLowerCase();
    if (!["letter", "diary", "collage"].includes(type)) { showModal("Type not found", "请输入 letter、diary 或 collage。", "✉"); return; }
    openNoteEditor(type);
  });
  $("#reader-options-button").addEventListener("click", () => { $("#reader-options-menu").hidden = !$("#reader-options-menu").hidden; });
  $("#reader-menu-edit").addEventListener("click", () => { $("#reader-options-menu").hidden = true; if (readingNoteId) openNoteEditor(currentNoteKind, readingNoteId); });
  $("#reader-menu-delete").addEventListener("click", () => { $("#reader-options-menu").hidden = true; deleteReadingNote(); });
  $("#reader-reply-button").addEventListener("click", replyToReadingNote);
  $("#reader-bottom-exit").addEventListener("click", () => {
    // Exit closes the reader and returns to the Notes & Fragments home screen.
    $("#reader-options-menu").hidden = true;
    readingNoteId = null; editingNoteId = null; selectedNoteIds.clear();
    $("#note-reader").hidden = true; $("#note-collection").hidden = true; $("#note-editor").hidden = true; $("#notes-home").hidden = false;
    currentNoteKind = "all"; renderNotes(); renderLayout();
  });
  $("#batch-delete-notes").addEventListener("click", async () => { if (!selectedNoteIds.size) return; const n=selectedNoteIds.size; if (await showModal("批量删除记录？",`确定删除选中的 ${n} 篇内容吗？此操作无法撤销。`,"!",{confirm:true,okText:"删除"})) { state.notes=state.notes.filter(note=>!selectedNoteIds.has(note.id)); selectedNoteIds.clear(); saveState(); renderNoteCollection(); renderNotes(); } });
  $("#save-note").addEventListener("click", saveNote);
  $("#delete-note").addEventListener("click", async () => { if (!editingNoteId) return; const note = state.notes.find(n => n.id === editingNoteId); if (await showModal("Delete this note?", note?.title || "This note", "!", { confirm: true, okText: "Delete" })) { state.notes = state.notes.filter(n => n.id !== editingNoteId); saveState(); editingNoteId = null; if (["letter","diary"].includes(currentNoteKind)) openNoteCollection(currentNoteKind); else { $("#notes-home").hidden = false; $("#note-editor").hidden = true; currentNoteKind = "all"; renderLayout(); renderNotes(); } } });
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
  $("#toggle-card-groups").addEventListener("click", () => { cardUI.groupManagerCollapsed = !cardUI.groupManagerCollapsed; saveCardUI(); renderCardGroups(); });
  $("#card-global-search").addEventListener("input", () => renderManagedCards());
  $("#clear-card-search").addEventListener("click", () => { $("#card-global-search").value = ""; renderManagedCards(); $("#card-global-search").focus(); });
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
  $("#toggle-card-list").addEventListener("click", () => { cardUI.listCollapsed = !cardUI.listCollapsed; saveCardUI(); renderManagedCards(); });
  $("#select-all-cards").addEventListener("change", event => { selectedCardIds.clear(); if (event.target.checked) state.customCards.forEach(card => selectedCardIds.add(card.id)); renderManagedCards(); });
  $("#batch-move-cards").addEventListener("click", async () => {
    const ids = new Set([...selectedCardIds].filter(id => state.customCards.some(card => card.id === id)));
    if (!ids.size) return;
    const target = $("#batch-target-group").value;
    const targetName = state.cardGroups.find(group => group.id === target)?.name || "未分组 / Ungrouped";
    if (!await showModal("批量移动字卡", `将选中的 ${ids.size} 张字卡移动到「${targetName}」？`, "⇢", { confirm: true, okText: "移动" })) return;
    state.customCards.forEach(card => { if (ids.has(card.id)) card.groupId = target; }); selectedCardIds.clear(); saveState(); renderMe();
    showModal("移动完成", `已将 ${ids.size} 张字卡移动到「${targetName}」。`, "✓");
  });
  $("#batch-delete-cards").addEventListener("click", async () => {
    const ids = new Set([...selectedCardIds].filter(id => state.customCards.some(card => card.id === id)));
    if (!ids.size) return;
    if (!await showModal("批量删除字卡？", `即将删除选中的 ${ids.size} 张字卡。此操作无法撤销。`, "!", { confirm: true, okText: "删除" })) return;
    state.customCards = state.customCards.filter(card => !ids.has(card.id)); selectedCardIds.clear(); saveState(); renderMe();
    showModal("删除完成", `已删除 ${ids.size} 张字卡。`, "✓");
  });
  $("#edit-profile").addEventListener("click", () => { const name = window.prompt("新的显示名称：", state.profileName); if (name !== null && name.trim()) { state.profileName = name.trim(); $("#profile-name").textContent = state.profileName; saveState(); renderMe(); } });
  $("#edit-signature").addEventListener("click", () => { const signature = window.prompt("输入个人签名：", state.signature); if (signature !== null) { state.signature = signature.trim(); $("#profile-signature").textContent = state.signature; saveState(); renderMe(); } });
  $("#export-data").addEventListener("click", downloadJson);
  $("#reset-data").addEventListener("click", async () => { if (await showModal("Reset local data?", "这会清除本浏览器中的 Notes、字卡、聊天记录和自定义纪念日。", "!", { confirm: true, okText: "Reset" })) { state = freshState(); saveState(); selectedDate = todayKey(); calendarYear = new Date().getFullYear(); calendarMonth = new Date().getMonth(); $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature; renderConversations(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderNotes(); switchTab("message"); showModal("Reset complete", "本地数据已恢复为初始 Demo 内容。", "✓"); } });
  $("#top-action").addEventListener("click", () => { if (activeTab === "message" && inChat) openChatPreferences(); else if (activeTab === "notes" && !$("#note-editor").hidden) saveNote(); else if (activeTab === "notes" && !$("#note-reader").hidden) { if (readingNoteId) openNoteEditor(currentNoteKind, readingNoteId); } else if (activeTab === "notes") { if (!$("#note-collection").hidden) $("#create-collection-note").click(); else $("#new-note").click(); } else if (activeTab === "saved") addAnniversary(); else if (activeTab === "me") showModal("Edit profile", "你可以在 Me 页面修改显示名称、签名和自定义字卡库。", "✎"); else if (activeTab === "message" && !inChat && state.hiddenContacts.length) { showHiddenContacts = !showHiddenContacts; renderConversations(); renderLayout(); } else showModal("Message", "选择一条会话即可开始聊天。", "✎"); });

  $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature;
  if (state.profileAvatar) { $("#profile-avatar").src = state.profileAvatar; const meAvatar = $("#me-profile-avatar"); if (meAvatar) meAvatar.src = state.profileAvatar; }

  function readAvatarFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) return reject(new Error("请选择图片文件。"));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败，请重试。"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("无法识别这张图片。"));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 360 / Math.max(img.naturalWidth, img.naturalHeight));
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", .82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function chooseProfileAvatar() {
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
    input.addEventListener("change", async () => { if (!input.files?.[0]) return; try { state.profileAvatar = await readAvatarFile(input.files[0]); $("#profile-avatar").src = state.profileAvatar; const meAvatar = $("#me-profile-avatar"); if (meAvatar) meAvatar.src = state.profileAvatar; saveState(); } catch (error) { showModal("头像设置失败", error.message, "!"); } });
    input.click();
  }
  $("#profile-avatar").addEventListener("click", chooseProfileAvatar);
  $("#profile-avatar").addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseProfileAvatar(); } });
  const meProfileAvatar = $("#me-profile-avatar");
  if (meProfileAvatar) {
    meProfileAvatar.addEventListener("click", chooseProfileAvatar);
    meProfileAvatar.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseProfileAvatar(); } });
  }

  function openAddContactModal() {
    const overlay = document.createElement("div"); overlay.className = "modal-overlay contact-modal-overlay";
    const card = document.createElement("form"); card.className = "modal-card contact-modal";
    card.innerHTML = '<div class="modal-symbol">♙＋</div><h2>New Contact</h2><p>添加一位新的聊天联系人</p><label class="contact-avatar-picker"><img alt="头像预览" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces"><span>选择头像</span><input class="contact-avatar-file" type="file" accept="image/*" aria-label="选择联系人头像"></label><label class="contact-name-label">角色名字<input class="contact-name-input" maxlength="40" placeholder="输入角色名字" required></label><div class="modal-buttons"><button class="chrome-btn contact-cancel" type="button">Cancel</button><button class="chrome-btn modal-ok" type="submit">Add Friend</button></div>';
    overlay.append(card); $(".phone").append(overlay);
    const fileInput = $("input[type=file]", card), preview = $(".contact-avatar-picker img", card), nameInput = $(".contact-name-input", card);
    let avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces";
    fileInput.addEventListener("change", async event => { const file = event.currentTarget.files && event.currentTarget.files[0]; if (!file) return; try { avatar = await readAvatarFile(file); preview.src = avatar; preview.dataset.customAvatar = "true"; } catch (error) { showModal("头像设置失败", error.message, "!"); } finally { fileInput.value = ""; } });
    $(".contact-cancel", card).addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
    card.addEventListener("submit", event => {
      event.preventDefault(); const name = nameInput.value.trim(); if (!name) return;
      const contact = { id: `custom-${uid()}`, name, avatar, time: nowTime(), preview: "开始一段新的对话吧。", mood: "all", custom: true };
      CONTACTS.push(contact); state.customContacts = [...(state.customContacts || []), contact];
      state.messages[contact.id] = []; state.previews[contact.id] = contact.preview; saveState(); overlay.remove(); currentFilter = "all"; $$(".mood-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.filter === "all")); renderConversations();
      showModal("联系人已添加", `「${name}」已加入你的联系人列表。`, "✓");
    });
    nameInput.focus();
  }
  $("#add-contact-btn").addEventListener("click", openAddContactModal);
  // Run once on startup (to catch up on replies whose time passed while the page was closed),
  // then poll while open. Foreground events also catch up after mobile/browser timer throttling.
  processScheduledLetterReplies();
  setInterval(processScheduledLetterReplies, 10000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") processScheduledLetterReplies(); });
  window.addEventListener("focus", processScheduledLetterReplies);
  renderCustomStickers(); renderConversations(); renderMessages(); renderNotes(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderLayout();
})();
