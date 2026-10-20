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
    const musicBoardOpen = activeTab === "notes" && !$("#notes-music-board").hidden;
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
    $(".tab-bar").hidden = (activeTab === "message" && inChat) || musicBoardOpen;
    $(".phone").classList.toggle("music-board-active", musicBoardOpen);
    $("#add-contact-btn").hidden = !(activeTab === "message" && !inChat);
    $(".phone").classList.toggle("chat-immersive", activeTab === "message" && inChat);
    const titles = { message: inChat ? currentContact().name : "Message", notes: !$("#note-reader").hidden ? (currentNoteKind === "diary" ? "Diary" : "Letter") : !$("#note-editor").hidden ? "Note Editor" : !$("#note-collection").hidden ? ({ letter: "Letters", diary: "Diary", all: "All Fragments" }[currentNoteKind] || "Notes") : "Notes", saved: "Saved", me: "Me" };
    $("#top-title").textContent = musicBoardOpen ? "Music" : titles[activeTab];
    $("#top-action").textContent = musicBoardOpen ? "‹ Back" : activeTab === "message" && inChat ? "Edit" : activeTab === "notes" ? (!$("#note-editor").hidden ? "Save" : (!$("#note-reader").hidden ? "Edit" : "＋ New")) : activeTab === "saved" ? "+ Date" : (activeTab === "message" && !inChat && state.hiddenContacts.length ? (showHiddenContacts ? "Hide list" : `Hidden ${state.hiddenContacts.length}`) : "Edit");
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
    const musicKeys = [MUSIC_PLAYLISTS_KEY, MUSIC_SAVED_KEY, MUSIC_SELECTED_PLAYLIST_KEY];
    const music = {};
    musicKeys.forEach(key => { try { music[key] = JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { music[key] = null; } });
    const backup = { format: "retro-otome-full-backup", version: 2, exportedAt: new Date().toISOString(), appState: state, music };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "retro-otome-full-backup.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importJsonBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const importedState = parsed.appState || parsed.state || (parsed.messages ? parsed : null);
      if (!importedState || typeof importedState !== "object") throw new Error("这个文件不是有效的 Retro Otome JSON 备份。");
      if (!await showModal("导入完整备份？", "导入会覆盖当前浏览器中的聊天、笔记、字卡及音乐歌单数据。建议先导出一份当前备份。", "⇧", { confirm: true, okText: "导入并刷新" })) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedState));
      const music = parsed.music || {};
      [MUSIC_PLAYLISTS_KEY, MUSIC_SAVED_KEY, MUSIC_SELECTED_PLAYLIST_KEY].forEach(key => {
        if (Object.prototype.hasOwnProperty.call(music, key)) {
          if (music[key] === null || music[key] === undefined) localStorage.removeItem(key);
          else localStorage.setItem(key, JSON.stringify(music[key]));
        }
      });
      location.reload();
    } catch (error) { await showModal("导入失败", `无法读取这个备份文件：${error.message || error}`, "!"); }
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
  // Music Box interactions. Sample rows are UI placeholders; selected local audio files play for real.
  const MUSIC_PLAYLISTS_KEY = "retroOtomeMusicPlaylistSourcesV1";
  const MUSIC_SAVED_KEY = "retroOtomeMusicSavedTracksV1";
  const MUSIC_SELECTED_PLAYLIST_KEY = "retroOtomeMusicSelectedPlaylistV1";
  const DEFAULT_QQ_PLAYLIST = {
    id: "qq-shared-playlist-9795540748",
    platform: "QQ音乐",
    name: "哈哈哈哈哈哈哈哈哈",
    url: "https://y.qq.com/n/ryqq_v2/playlist/9795540748?ADTAG=h5_share_playlist&redirecttag=mn.redirect.custom&mnst=1.06"
  };
  const MUSIC_SAMPLE_META = [
    {
      duration: 275,
      cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=320&h=320&fit=crop",
      lyrics: [
        [0, "♪ [Intro — Nostalgic Synth] ♪"],
        [14, "车窗外流过的霓虹光晕"],
        [29, "在后视镜里轻轻褪色"],
        [44, "收音机里微弱的电流声"],
        [60, "夜色沿着街角，慢慢落进眼底"],
        [82, "旧胶片一样的回忆还在转动"],
        [108, "♪ [Outro — Fading Echoes] ♪"]
      ]
    },
    {
      duration: 254,
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=320&h=320&fit=crop",
      lyrics: [
        [0, "♪ [City Pop Intro] ♪"],
        [16, "雨后的街道映着蓝色霓虹"],
        [32, "玻璃窗里倒映着匆匆的人群"],
        [48, "晚风把旧日心事轻轻吹远"],
        [66, "今晚就让旋律陪我慢慢走"],
        [88, "♪ [Instrumental Break] ♪"]
      ]
    },
    {
      duration: 223,
      cover: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=320&h=320&fit=crop",
      lyrics: [
        [0, "♪ [Tape Noise] ♪"],
        [13, "旧磁带转动时轻微的沙沙声"],
        [27, "被遗忘的日期重新亮了起来"],
        [41, "屏幕上的微光停留在旧夏天"],
        [57, "那些没来得及说的话仍然温柔"],
        [79, "♪ [Memory Fade] ♪"]
      ]
    },
    {
      duration: 242,
      cover: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=320&h=320&fit=crop",
      lyrics: [
        [0, "♪ [Ocean Air Intro] ♪"],
        [15, "海平面泛起一层安静的微光"],
        [30, "风把云影推向更远的地方"],
        [45, "所有没说出口的话都慢慢沉淀"],
        [63, "等天色变亮，我们再继续出发"],
        [85, "♪ [Blue Horizon Outro] ♪"]
      ]
    }
  ];
  let musicTracks = [];
  let activeMusicTrackId = null;
  let musicPlayerInitialized = false;
  let musicGlobalVolume = 0.7;
  let musicMuted = false;
  let musicSelectedPlaylist = null;
  let musicSavedTrackIds = [];
  function safeReadMusicSources() {
    try {
      const raw = JSON.parse(localStorage.getItem(MUSIC_PLAYLISTS_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(item => item && typeof item.url === "string") : [];
    } catch (_) { return []; }
  }
  function writeMusicSources(sources) {
    try { localStorage.setItem(MUSIC_PLAYLISTS_KEY, JSON.stringify(sources)); } catch (_) {}
  }
  function extractPlaylistId(platform, rawUrl) {
    try {
      const url = new URL(rawUrl);
      const path = url.pathname;
      if (platform === "QQ音乐") {
        return path.match(/\/playlist\/(\d+)/i)?.[1]
          || path.match(/\/(?:n\/)?yqq\/playlist\/(\d+)/i)?.[1]
          || url.searchParams.get("disstid")
          || url.searchParams.get("dissid")
          || url.searchParams.get("id")
          || rawUrl.match(/[?&](?:disstid|dissid|id)=(\d+)/i)?.[1]
          || null;
      }
      return path.match(/\/playlist\/(\d+)/i)?.[1] || url.searchParams.get("id") || rawUrl.match(/[?&]id=(\d+)/i)?.[1] || null;
    } catch (_) { return null; }
  }
  function musicJsonp(requestUrl, callbackParameter = "jsonpCallback", timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const callback = `__retroMusicJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const target = new URL(requestUrl);
      target.searchParams.set(callbackParameter, callback);
      if (!target.searchParams.has("format")) target.searchParams.set("format", "jsonp");
      const script = document.createElement("script");
      let timer;
      const cleanup = () => {
        clearTimeout(timer); script.remove();
        try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      };
      window[callback] = payload => { cleanup(); resolve(payload); };
      script.onerror = () => { cleanup(); reject(new Error("音乐平台接口无法读取该歌单")); };
      timer = setTimeout(() => { cleanup(); reject(new Error("读取歌单超时，请稍后重试")); }, timeoutMs);
      script.src = target.toString();
      document.head.append(script);
    });
  }
  function qqPlaylistData(payload) {
    const reqData = payload?.req_0?.data;
    return reqData?.data || reqData || payload?.data?.data || payload?.data || payload;
  }
  function qqPlaylistTotal(playlist) {
    const data = playlist?.data || playlist;
    const info = data?.dirinfo || data?.playlistInfo || data?.info || {};
    const candidates = [
      data?.total_song_num, data?.totalSongNum, data?.songnum, data?.song_num,
      data?.total, data?.song_count, data?.songCount,
      info?.songnum, info?.song_num, info?.song_count, info?.songCount
    ];
    for (const value of candidates) {
      const total = Number(value);
      if (Number.isFinite(total) && total > 0) return total;
    }
    return 0;
  }
  function normalizeQQPlaylist(playlist) {
    const data = playlist?.data?.data || playlist?.data || playlist;
    const sourceTracks = data?.songlist || data?.songs || data?.songList || data?.tracks || [];
    if (!Array.isArray(sourceTracks) || !sourceTracks.length) return null;
    const tracks = sourceTracks.map((song, index) => {
      const songMid = song.songmid || song.songMid || song.song_mid || song.mid || song.track?.songmid || song.track?.mid || song.song?.songmid || song.song?.mid || song.track_info?.mid || song.song_info?.mid || "";
      const musicId = song.songid || song.songId || song.track?.songid || song.track?.id || (typeof song.id === "object" ? song.id?.songid : song.id) || "";
      const fallbackId = musicId || songMid || uid();
      const title = song.songname || song.name || song.title || `歌曲 ${index + 1}`;
      const singers = song.singer || song.singers || song.artist || song.artists || [];
      const artist = Array.isArray(singers) ? singers.map(person => typeof person === "string" ? person : person?.name).filter(Boolean).join(" / ") : String(singers || "未知歌手");
      const album = song.album || song.albummid || song.albumMid || song.album_info || "";
      const albumMid = typeof album === "object" ? album.mid || album.albummid || album.albumMid || "" : album;
      const fileInfo = song.file || song.file_info || {};
      const mediaMid = fileInfo.media_mid || fileInfo.strMediaMid || fileInfo.mediaMid || song.strMediaMid || song.media_mid || song.mediaMid || "";
      const cover = song.albumpic || song.cover || song.picurl || song.cover_url || (albumMid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg?max_age=2592000` : "");
      const seconds = Number(song.interval || song.duration || song.dt || 0);
      return { id:`qq-${songMid || fallbackId}`, songMid:String(songMid), musicId:String(musicId || ""), mediaMid:String(mediaMid), title:String(title), artist, duration:seconds > 10000 ? seconds / 1000 : seconds, cover, lyrics:[], externalUrl:songMid ? `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(songMid)}` : "", platform:"QQ音乐" };
    });
    const info = data?.dirinfo || data?.playlistInfo || data?.info || {};
    return { name: data.dissname || data.name || data.title || info.title || info.dissname || info.name || "QQ 音乐歌单", tracks, total: qqPlaylistTotal(data) };
  }
  async function readQQPlaylist(playlistId) {
    let currentError = null;
    // Current QQ Music web endpoint. Request 100 songs per page so larger public playlists can be imported too.
    try {
      const allTracks = [];
      let playlistName = "QQ 音乐歌单";
      let expectedTotal = 0;
      const pageSize = 100;
      const maxPages = 30;
      for (let page = 0; page < maxPages; page++) {
        const requestData = {
          req_0: { module:"music.srfDissInfo.aiDissInfo", method:"uniform_get_Dissinfo", param:{ disstid:Number(playlistId), enc_host_uin:"", tag:1, userinfo:1, orderlist:1, song_begin:page * pageSize, song_num:pageSize } },
          comm: { g_tk:5381, uin:0, format:"json", ct:24, cv:0 }
        };
        const endpoint = new URL("https://u.y.qq.com/cgi-bin/musicu.fcg");
        endpoint.searchParams.set("data", JSON.stringify(requestData));
        endpoint.searchParams.set("format", "jsonp");
        const payload = await musicJsonp(endpoint.toString(), "callback");
        const data = qqPlaylistData(payload);
        const normalized = normalizeQQPlaylist(data);
        if (!normalized?.tracks?.length) {
          if (page === 0) throw new Error("QQ 音乐没有返回这份歌单的曲目列表");
          break;
        }
        playlistName = normalized.name || playlistName;
        expectedTotal = normalized.total || expectedTotal;
        allTracks.push(...normalized.tracks);
        if (normalized.tracks.length < pageSize || (expectedTotal && allTracks.length >= expectedTotal)) break;
      }
      if (allTracks.length) return { name:playlistName, tracks:allTracks.slice(0, expectedTotal || allTracks.length) };
      throw new Error("QQ 音乐没有返回可用曲目");
    } catch (error) { currentError = error; }
    // Older public endpoint fallback. Some QQ Music deployments no longer serve this endpoint.
    try {
      const endpoint = new URL("https://c.y.qq.com/qzone/fcgi-bin/fcg_ucc_getcdinfo_byids_cp.fcg");
      Object.entries({type:"1",json:"1",utf8:"1",onlysong:"0",g_tk:"5381",loginUin:"0",hostUin:"0",inCharset:"utf8",outCharset:"utf-8",notice:"0",platform:"yqq",needNewCode:"0",disstid:String(playlistId)}).forEach(([key,value]) => endpoint.searchParams.set(key,value));
      const payload = await musicJsonp(endpoint.toString(), "jsonpCallback");
      const normalized = normalizeQQPlaylist(payload?.cdlist?.[0] || payload?.data?.cdlist?.[0] || payload?.playlist || payload?.data?.playlist);
      if (normalized) return normalized;
      throw new Error("旧版 QQ 音乐接口没有返回歌曲列表");
    } catch (legacyError) {
      const reason = currentError?.message || legacyError?.message || "读取失败";
      throw new Error(`${reason}。请确认链接对应的是可公开访问的歌单；个人收藏可能需要账号授权。网页已识别歌单 ID，但未能从平台取得曲目资料。不要分享账号密码或登录凭据。`);
    }
  }
  async function readNetEasePlaylist(playlistId) {
    const response = await fetch(`https://music.163.com/api/playlist/detail?id=${encodeURIComponent(playlistId)}&csrf_token=`, { credentials:"omit", mode:"cors" });
    if (!response.ok) throw new Error(`网易云读取失败（HTTP ${response.status}）`);
    const payload = await response.json();
    const playlist = payload?.playlist || payload?.result;
    const songs = playlist?.tracks || playlist?.trackIds?.map(item => item) || [];
    if (!Array.isArray(songs) || !songs.length || !songs[0]?.name) throw new Error("网易云没有返回公开歌单的歌曲列表；可能需要登录或使用可访问的分享链接。");
    const tracks = songs.map((song, index) => ({
      id:`netease-${song.id || uid()}`, title:String(song.name || `歌曲 ${index+1}`),
      artist:(song.ar || song.artists || []).map(person => person.name).filter(Boolean).join(" / ") || "未知歌手",
      duration:Math.round(Number(song.dt || song.duration || 0) / 1000), cover:song.al?.picUrl || song.album?.picUrl || "", lyrics:[],
      externalUrl:`https://music.163.com/#/song?id=${encodeURIComponent(song.id)}`, platform:"网易云音乐"
    }));
    return { name:playlist.name || "网易云歌单", tracks };
  }
  function musicTrackDedupeKeys(track) {
    const keys = [];
    const mid = String(track?.songMid || track?.songmid || "").trim().toLowerCase();
    const musicId = String(track?.musicId || track?.songId || "").trim();
    if (mid) keys.push(`mid:${mid}`);
    if (musicId) keys.push(`musicid:${musicId}`);
    const title = normalizedQQMatchText(track?.title || track?.name || "");
    const artist = normalizedQQMatchText(track?.artist || track?.singer || "");
    if (title) keys.push(`title:${title}|artist:${artist || "unknown"}`);
    return keys;
  }
  function dedupeMusicTracks(tracks) {
    if (!Array.isArray(tracks)) return [];
    const seen = new Map();
    const unique = [];
    tracks.forEach(track => {
      if (!track || typeof track !== "object") return;
      const keys = musicTrackDedupeKeys(track);
      const previous = keys.map(key => seen.get(key)).find(Boolean);
      if (previous) {
        ["songMid", "musicId", "mediaMid", "artist", "cover", "duration", "externalUrl", "lyricFileName", "lyricSource"].forEach(key => {
          if ((!previous[key] || previous[key] === "未知歌手") && track[key]) previous[key] = track[key];
        });
        if ((!Array.isArray(previous.lyrics) || !previous.lyrics.length) && Array.isArray(track.lyrics) && track.lyrics.length) previous.lyrics = track.lyrics;
        return;
      }
      unique.push(track);
      keys.forEach(key => seen.set(key, track));
    });
    return unique;
  }
  function persistDedupedMusicPlaylist(source) {
    if (!source?.id) return;
    const sources = safeReadMusicSources();
    const stored = sources.find(item => item.id === source.id);
    if (!stored) return;
    stored.tracks = source.tracks;
    writeMusicSources(sources);
  }
  function activateMusicPlaylist(source) {
    if (!source || !Array.isArray(source.tracks) || !source.tracks.length) return false;
    const beforeCount = source.tracks.length;
    source.tracks = dedupeMusicTracks(source.tracks);
    if (!source.tracks.length) return false;
    if (source.tracks.length !== beforeCount) persistDedupedMusicPlaylist(source);
    musicTracks.forEach(track => { if (track.audio && !track.audio.paused) track.audio.pause(); if (track.url && (track.isLocal || track.audioFromLocal)) URL.revokeObjectURL(track.url); });
    musicSelectedPlaylist = source;
    try { localStorage.setItem(MUSIC_SELECTED_PLAYLIST_KEY, source.id); } catch (_) {}
    const list = $("#music-track-list"); list.replaceChildren();
    musicTracks = source.tracks.map((savedTrack, index) => {
      const track = { ...savedTrack, sourcePlaylistId:String(source.playlistId || ""), sourcePlaylistKey:String(source.id || ""), sourceTrackIndex:index, audio:null, row:null, isSample:false, isRemote:true, lyrics:Array.isArray(savedTrack.lyrics) ? savedTrack.lyrics : [] };
      track.row = createMusicTrackRow(track); list.append(track.row); return track;
    });
    activeMusicTrackId = null;
    $("#music-track-search").value = "";
    applyMusicTrackSearch();
    updateMusicTrackCount();
    if (musicTracks[0]) selectMusicTrack(musicTracks[0], false);
    if ($("#music-open-playlists")) $("#music-open-playlists").title = `当前歌单：${source.platform} · ${source.name}`;
    return true;
  }
  function formatMusicTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const value = Math.floor(seconds);
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }
  function makeLocalCover(title, id) {
    const palettes = [["#b8c7d6", "#e6ecf2", "#7289a3"], ["#c9d3df", "#f1f3f6", "#8fa2b7"], ["#aebfd0", "#e3eaf0", "#647f9a"], ["#d1d9e2", "#f5f7f9", "#9babbc"]];
    const hash = [...String(id || title)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colors = palettes[hash % palettes.length];
    const letter = String(title || "M").trim().slice(0, 1).replace(/[&<>"']/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".52" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs><rect width="320" height="320" fill="url(#g)"/><circle cx="250" cy="70" r="88" fill="#ffffff" opacity=".18"/><circle cx="70" cy="270" r="120" fill="#536d88" opacity=".12"/><path d="M36 208 Q160 120 284 208" fill="none" stroke="#ffffff" stroke-width="3" opacity=".55"/><text x="160" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="112" font-weight="700" fill="#ffffff" opacity=".9">${letter || "M"}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
  function setMusicPlayButton(playing) {
    const main = $("#music-main-play");
    if (main) main.textContent = playing ? "Ⅱ" : "▶";
    musicTracks.forEach(track => {
      if (!track.row) return;
      const button = $(".music-track-play", track.row);
      if (button) button.textContent = track.id === activeMusicTrackId && playing ? "Ⅱ" : "▶";
    });
  }
  function updateMusicTrackCount() {
    $("#music-track-count").textContent = `(${musicTracks.length})`;
  }
  function renderMusicTrackProgress(track, ratio) {
    if (!track?.row) return;
    const fill = $(".music-mini-progress span", track.row);
    const dot = $(".music-mini-progress i", track.row);
    const percent = `${Math.max(0, Math.min(1, ratio || 0)) * 100}%`;
    if (fill) fill.style.width = percent;
    if (dot) dot.style.left = percent;
  }
  function renderMusicProgress(current, duration) {
    const ratio = Number.isFinite(duration) && duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;
    const progress = $("#music-main-progress");
    if (progress) {
      progress.querySelector("span").style.width = `${ratio * 100}%`;
      progress.querySelector("i").style.left = `${ratio * 100}%`;
      progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    }
    $("#music-current-time").textContent = `${formatMusicTime(current)} / ${formatMusicTime(duration)}`;
    if (activeMusicTrackId) {
      const active = musicTracks.find(track => track.id === activeMusicTrackId);
      if (active) renderMusicTrackProgress(active, ratio);
    }
  }
  function parseMusicLrc(text) {
    const rawLines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    let offsetMs = 0;
    for (const rawLine of rawLines) {
      const offsetMatch = rawLine.match(/^\s*\[offset\s*:\s*([+-]?\d+)\s*\]/i);
      if (offsetMatch) offsetMs = Number(offsetMatch[1]) || 0;
    }
    const parsed = [];
    const timePattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    for (const rawLine of rawLines) {
      if (/^\s*\[(ti|ar|al|by|re|ve|offset|kana|la)\s*:/i.test(rawLine)) continue;
      const stamps = [...rawLine.matchAll(timePattern)];
      if (!stamps.length) continue;
      const lyricText = rawLine.replace(timePattern, "").trim();
      if (!lyricText) continue;
      for (const stamp of stamps) {
        const minutes = Number(stamp[1]) || 0;
        const seconds = Number(stamp[2]) || 0;
        const fractionText = stamp[3] || "0";
        const fraction = Number(fractionText) / (fractionText.length === 1 ? 10 : fractionText.length === 2 ? 100 : 1000);
        const time = Math.max(0, minutes * 60 + seconds + fraction + offsetMs / 1000);
        parsed.push([time, lyricText]);
      }
    }
    parsed.sort((a, b) => a[0] - b[0]);
    return parsed;
  }
  // Lyrics are local-only in this build; playback sync uses imported LRC timestamps.
  function renderMusicLyrics(track) {
    const container = $("#music-lyrics-scroll");
    const lines = (Array.isArray(track?.lyrics) ? track.lyrics : [])
      .map((entry, index) => [Number(entry?.[0]) || 0, String(entry?.[1] || ""), index])
      .sort((a, b) => a[0] - b[0] || a[2] - b[2])
      .map(([time, text]) => [time, text]);
    if (track) track.lyrics = lines;
    container.replaceChildren();
    $("#music-lyrics-song-name").textContent = track?.title || "未选择歌曲";
    const status = !lines.length
      ? (track?.isSample ? "演示歌词" : "暂无歌词")
      : (track?.lyricSource === "online" ? "在线歌词" : track?.lyricFileName ? "LRC 已载入" : track?.isSample ? "演示歌词" : "歌词已载入");
    $("#music-lyrics-status").textContent = status;
    $("#music-lyrics-footer-note").textContent = lines.length
      ? (track?.lyricSource === "online" ? "QQ 音乐时间轴 · 跟随播放同步" : track?.lyricFileName ? `按 LRC 时间戳同步 · ${track.lyricFileName}` : track?.isSample ? "演示时间轴 · 非原曲歌词" : "按时间戳跟随播放")
      : track?.isSample ? "示例歌词仅用于预览" : "可一次批量导入本地 LRC，按文件名匹配歌曲";
    const displayLines = lines.length ? lines : [[0, track?.isSample ? "此处为播放器界面示例歌词" : "这首歌还没有时间轴歌词" ]];
    displayLines.forEach(([time, text], index) => {
      const line = document.createElement("div");
      line.className = `music-lyric-line${lines.length && index === 0 ? " is-current" : ""}`;
      line.dataset.time = String(time);
      line.textContent = text;
      container.append(line);
    });
    container.scrollTop = 0;
  }
  function syncMusicLyrics(track, currentTime, forceScroll = false) {
    if (!track || !Array.isArray(track.lyrics) || !track.lyrics.length) return;
    const container = $("#music-lyrics-scroll");
    const lines = $$(".music-lyric-line", container);
    if (!lines.length) return;
    const time = Math.max(0, Number(currentTime) || 0);
    let targetIndex = 0;
    for (let i = 0; i < track.lyrics.length; i++) {
      if (time >= Number(track.lyrics[i][0] || 0)) targetIndex = i;
      else break;
    }
    const target = lines[targetIndex];
    if (!target) return;
    const alreadyCurrent = target.classList.contains("is-current");
    if (!alreadyCurrent) {
      lines.forEach(line => line.classList.remove("is-current"));
      target.classList.add("is-current");
    }
    if (alreadyCurrent && !forceScroll) return;
    // Calculate within the actual scroll viewport; repeated smooth-scroll animations can lag behind playback.
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
    const top = relativeTop - Math.max(0, container.clientHeight * 0.38 - target.offsetHeight / 2);
    container.scrollTo({ top: Math.max(0, Math.min(top, container.scrollHeight - container.clientHeight)), behavior: "auto" });
  }
  function persistMusicLyrics(track) {
    if (!track || !musicSelectedPlaylist || !track.sourcePlaylistKey) return;
    const sources = safeReadMusicSources();
    const source = sources.find(item => item.id === track.sourcePlaylistKey);
    const savedTrack = source?.tracks?.find(item => item.id === track.id) || source?.tracks?.[track.sourceTrackIndex];
    if (!savedTrack) return;
    savedTrack.lyrics = track.lyrics.map(([time, lyric]) => [Number(time), String(lyric)]);
    savedTrack.lyricFileName = track.lyricFileName || "";
    savedTrack.lyricSource = track.lyricSource || (track.lyricFileName ? "lrc" : "");
    writeMusicSources(sources);
    musicSelectedPlaylist = source;
  }
  function updateMusicNowPlaying(track) {
    if (!track) return;
    $("#music-current-title").textContent = track.title;
    $("#music-current-artist").textContent = track.artist || "本地音频";
    const image = $("#music-album-image");
    image.onerror = () => { image.onerror = null; image.src = makeLocalCover(track.title, track.id); };
    image.src = track.cover || makeLocalCover(track.title, track.id);
    image.alt = `${track.title} 封面`;
    const duration = Number.isFinite(track.audio?.duration) ? track.audio.duration : track.duration;
    renderMusicProgress(track.audio?.currentTime || 0, duration || 0);
    renderMusicLyrics(track);
    setMusicPlayButton(Boolean(track.audio && !track.audio.paused));
  }
  function selectMusicTrack(track, autoplay = false) {
    if (!track) return;
    const oldTrack = musicTracks.find(item => item.id === activeMusicTrackId);
    if (oldTrack && oldTrack.id !== track.id && oldTrack.audio && !oldTrack.audio.paused) oldTrack.audio.pause();
    activeMusicTrackId = track.id;
    musicTracks.forEach(item => item.row?.classList.toggle("is-active", item.id === track.id));
    if (track.audio) {
      track.audio.volume = musicGlobalVolume;
      track.audio.muted = musicMuted;
      if (track.audio.readyState >= 1) track.duration = track.audio.duration;
      if (oldTrack?.id !== track.id) { try { track.audio.currentTime = 0; } catch (_) {} }
    }
    updateMusicNowPlaying(track);
    renderMusicTrackProgress(track, track.audio?.duration ? (track.audio.currentTime || 0) / track.audio.duration : 0);
    syncMusicLyrics(track, track.audio?.currentTime || 0, true);
    // 歌词完全使用本地 LRC；不再依赖易失效的 QQ 在线歌词接口。
    if (autoplay) playMusicTrack(track);
  }
  function normalizedQQMatchText(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/[\s\p{P}\p{S}]+/gu, "");
  }
  function qqTrackMidFromSong(song) {
    return String(song?.songmid || song?.songMid || song?.song_mid || song?.mid || song?.track?.songmid || song?.track?.mid || song?.song?.songmid || song?.song?.mid || song?.track_info?.mid || "");
  }
  function qqSongListFromSearch(payload) {
    return payload?.["music.search.SearchCgiService"]?.data?.body?.song?.list
      || payload?.req_1?.data?.body?.song?.list
      || payload?.req_1?.data?.data?.body?.song?.list
      || payload?.data?.body?.song?.list
      || [];
  }
  function qqSongArtistText(song) {
    const singers = song?.singer || song?.singers || song?.artist || song?.artists || [];
    if (Array.isArray(singers)) return singers.map(person => typeof person === "string" ? person : person?.name || person?.title || "").filter(Boolean).join(" / ");
    return String(singers || "");
  }
  async function searchQQTrackMetadata(track) {
    const query = [track?.title, track?.artist && track.artist !== "未知歌手" ? track.artist : ""].filter(Boolean).join(" ").trim();
    if (!query) throw new Error("这首歌曲缺少歌名，无法补查 QQ 音乐歌曲资料。");
    const requestData = {
      "music.search.SearchCgiService": {
        module:"music.search.SearchCgiService", method:"DoSearchForQQMusicDesktop",
        param:{ search_type:0, query, page_num:1, num_per_page:20, remoteplace:"txt.yqq.center" }
      }
    };
    const endpoint = new URL("https://u.y.qq.com/cgi-bin/musicu.fcg");
    endpoint.searchParams.set("data", JSON.stringify(requestData));
    const payload = await musicJsonp(endpoint.toString(), "callback", 15000);
    const results = qqSongListFromSearch(payload);
    if (!Array.isArray(results) || !results.length) throw new Error("QQ 音乐搜索暂时没有返回可匹配的歌曲资料。");
    const wantedTitle = normalizedQQMatchText(track.title);
    const wantedArtist = normalizedQQMatchText(track.artist);
    const titleMatches = results.filter(song => normalizedQQMatchText(song?.name || song?.songname || song?.title) === wantedTitle && qqTrackMidFromSong(song));
    if (!titleMatches.length) throw new Error("没有在 QQ 音乐搜索结果中找到同名且带有歌曲 MID 的曲目。");
    let match = null;
    if (wantedArtist && wantedArtist !== normalizedQQMatchText("未知歌手")) {
      match = titleMatches.find(song => {
        const candidateArtist = normalizedQQMatchText(qqSongArtistText(song));
        return candidateArtist === wantedArtist || candidateArtist.includes(wantedArtist) || wantedArtist.includes(candidateArtist);
      }) || null;
    }
    if (!match && titleMatches.length === 1) match = titleMatches[0];
    if (!match) throw new Error("找到同名歌曲，但歌手信息无法可靠对应。请重新导入歌单，避免误播其他版本。");
    const mid = qqTrackMidFromSong(match);
    if (!mid) throw new Error("QQ 音乐搜索结果没有可用的歌曲 MID。");
    const file = match.file || match.file_info || {};
    const album = match.album || {};
    track.songMid = mid;
    track.mediaMid = String(file.media_mid || file.strMediaMid || file.mediaMid || match.strMediaMid || match.media_mid || "");
    track.albumMid = String(album.mid || album.albummid || match.albummid || "");
    if (!track.artist || track.artist === "未知歌手") track.artist = qqSongArtistText(match) || track.artist;
    if (!track.duration && Number(match.interval || match.duration)) track.duration = Number(match.interval || match.duration);
    if (!track.cover && track.albumMid) track.cover = `https://y.gtimg.cn/music/photo_new/T002R300x300M000${track.albumMid}.jpg?max_age=2592000`;
    persistQQTrackMetadata(track);
    return track.songMid;
  }
  function persistQQTrackMetadata(track) {
    if (!track?.songMid) return;
    const sources = safeReadMusicSources();
    let source = sources.find(item => item.id === (track.sourcePlaylistKey || musicSelectedPlaylist?.id));
    if (!source && musicSelectedPlaylist?.playlistId) source = sources.find(item => item.platform === "QQ音乐" && String(item.playlistId) === String(musicSelectedPlaylist.playlistId));
    if (!source || !Array.isArray(source.tracks)) return;
    let saved = source.tracks.find(item => item.id === track.id);
    if (!saved) {
      const targetTitle = normalizedQQMatchText(track.title);
      const targetArtist = normalizedQQMatchText(track.artist);
      saved = source.tracks.find(item => normalizedQQMatchText(item.title) === targetTitle && (!targetArtist || normalizedQQMatchText(item.artist) === targetArtist));
    }
    if (!saved) return;
    Object.assign(saved, {
      songMid:track.songMid,
      mediaMid:track.mediaMid || saved.mediaMid || "",
      title:track.title || saved.title,
      artist:track.artist || saved.artist,
      duration:track.duration || saved.duration || 0,
      cover:track.cover || saved.cover || ""
    });
    writeMusicSources(sources);
    if (musicSelectedPlaylist && source.id === musicSelectedPlaylist.id) musicSelectedPlaylist = source;
  }
  async function ensureQQSongMid(track) {
    if (track?.songMid) return track.songMid;
    // Older versions may have saved the playlist metadata without song MID. Resolve it lazily
    // from QQ Music's public song search, then persist it so future plays do not need to search again.
    try { return await searchQQTrackMetadata(track); }
    catch (error) {
      throw new Error(`这首歌的旧版歌单资料缺少 QQ 音乐歌曲 MID，已尝试自动补查但没有成功。${error?.message || ""} 请重新导入这份公开歌单后再试。`);
    }
  }
  async function resolveQQMediaMid(track) {
    if (track?.mediaMid || !track?.songMid) return track?.mediaMid || "";
    const requestData = {
      req_0:{
        module:"music.pf_song_detail_svr", method:"get_song_detail_yqq",
        param:{ song_mid:track.songMid }
      },
      comm:{ format:"json", ct:19, cv:0, uin:0, g_tk:5381 }
    };
    const endpoint = new URL("https://u.y.qq.com/cgi-bin/musicu.fcg");
    endpoint.searchParams.set("data", JSON.stringify(requestData));
    const payload = await musicJsonp(endpoint.toString(), "callback", 15000);
    const result = payload?.req_0?.data || payload?.data?.req_0?.data || {};
    const detail = result.track_info || result.data?.track_info || result.song || {};
    const fileInfo = detail.file || detail.file_info || {};
    track.mediaMid = String(fileInfo.media_mid || fileInfo.strMediaMid || fileInfo.mediaMid || detail.strMediaMid || "");
    const albumMid = detail.album?.mid || detail.album?.albummid || "";
    if (!track.cover && albumMid) track.cover = `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albumMid}.jpg?max_age=2592000`;
    if (!track.artist || track.artist === "未知歌手") track.artist = (detail.singer || []).map(person => person.name).filter(Boolean).join(" / ") || track.artist;
    if (!track.duration && Number(detail.interval)) track.duration = Number(detail.interval);
    return track.mediaMid;
  }
  async function getQQTrackPlaybackUrl(track) {
    // Request only standard public playback formats. If QQ Music does not return a usable stream,
    // the player stays in this page and reports that the track is unavailable; it never redirects.
    await ensureQQSongMid(track);
    if (!track.mediaMid) await resolveQQMediaMid(track);
    if (!track?.mediaMid) throw new Error("QQ 音乐没有返回这首歌的 media_mid，无法构造标准音质的播放请求。");
    if (track.playbackUrl && track.playbackUrlExpiresAt && Date.now() < track.playbackUrlExpiresAt - 30000) return track.playbackUrl;
    const candidates = [
      { filename:`C400${track.mediaMid}.m4a`, quality:"standard-m4a" },
      { filename:`M500${track.mediaMid}.mp3`, quality:"standard-mp3" }
    ];
    const requestData = {
      req_0: {
        module:"vkey.GetVkeyServer", method:"CgiGetVkey",
        param:{
          filename:candidates.map(item => item.filename),
          guid:String(Math.floor(1000000000 + Math.random() * 8999999999)),
          songmid:candidates.map(() => track.songMid),
          songtype:candidates.map(() => 0),
          uin:"0", loginflag:1, platform:"20", needNewCode:0
        }
      },
      comm:{ g_tk:5381, uin:0, format:"json", ct:19, cv:0 }
    };
    const endpoint = new URL("https://u.y.qq.com/cgi-bin/musicu.fcg");
    endpoint.searchParams.set("data", JSON.stringify(requestData));
    const payload = await musicJsonp(endpoint.toString(), "callback", 15000);
    const data = payload?.req_0?.data || payload?.data?.req_0?.data || {};
    const list = Array.isArray(data.midurlinfo) ? data.midurlinfo : [];
    const valid = list.find(item => item && Number(item.result ?? 0) === 0 && item.purl && !String(item.purl).startsWith("//"));
    if (!valid) throw new Error("QQ 音乐没有向当前网页提供这首歌可用的标准音质音源。它可能受版权、地区或账号权限限制。");
    const base = Array.isArray(data.sip) ? data.sip.find(Boolean) : "";
    const playUrl = /^https?:\/\//i.test(valid.purl) ? valid.purl : `${base || "https://isure.stream.qqmusic.qq.com/"}${String(valid.purl).replace(/^\/+/, "")}`;
    if (!/^https?:\/\//i.test(playUrl)) throw new Error("QQ 音乐返回的播放地址格式不正确。");
    track.playbackUrl = playUrl;
    track.playbackUrlExpiresAt = Date.now() + 20 * 60 * 1000;
    return playUrl;
  }
  function attachMusicAudioEvents(track, audio) {
    track.audio = audio;
    audio.volume = musicGlobalVolume;
    audio.muted = musicMuted;
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", () => {
      track.duration = Number.isFinite(audio.duration) ? audio.duration : (track.duration || 0);
      if (activeMusicTrackId === track.id) renderMusicProgress(audio.currentTime || 0, track.duration);
    });
    audio.addEventListener("timeupdate", () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : (track.duration || 0);
      track.duration = duration || 0;
      if (activeMusicTrackId === track.id) {
        renderMusicProgress(audio.currentTime || 0, duration || 0);
        syncMusicLyrics(track, audio.currentTime || 0);
      } else renderMusicTrackProgress(track, duration ? audio.currentTime / duration : 0);
    });
    audio.addEventListener("seeking", () => {
      if (activeMusicTrackId === track.id) syncMusicLyrics(track, audio.currentTime || 0, true);
    });
    audio.addEventListener("seeked", () => {
      if (activeMusicTrackId === track.id) {
        renderMusicProgress(audio.currentTime || 0, Number.isFinite(audio.duration) ? audio.duration : track.duration);
        syncMusicLyrics(track, audio.currentTime || 0, true);
      }
    });
    audio.addEventListener("play", () => {
      if (activeMusicTrackId === track.id) {
        setMusicPlayButton(true);
        syncMusicLyrics(track, audio.currentTime || 0, true);
      }
    });
    audio.addEventListener("pause", () => { if (activeMusicTrackId === track.id) setMusicPlayButton(false); });
    audio.addEventListener("ended", () => { if (activeMusicTrackId === track.id) goToMusicTrack(1, true); });
    audio.addEventListener("error", () => {
      if (activeMusicTrackId === track.id) setMusicPlayButton(false);
    });
  }
  async function playMusicTrack(track) {
    if (!track) return;
    if (!track.audio) {
      setMusicPlayButton(false);
      if (track.loadingAudio) return;
      if (track.isRemote && track.platform === "QQ音乐") {
        track.loadingAudio = true;
        const requestTrackId = activeMusicTrackId;
        try {
          const playUrl = await getQQTrackPlaybackUrl(track);
          if (activeMusicTrackId !== requestTrackId || activeMusicTrackId !== track.id) return;
          const audio = new Audio(playUrl);
          attachMusicAudioEvents(track, audio);
          await audio.play();
          setMusicPlayButton(true);
        } catch (error) {
          setMusicPlayButton(false);
          const reason = error?.message || "无法获取可用的音源";
          await showModal("这首歌暂时无法在网页内播放", `${reason}\n\n播放器不会跳转到 QQ 音乐，也不会尝试绕过付费或版权限制。你可以试试歌单里的其他歌曲，或导入自己有权使用的本地音频文件。`, "!");
        } finally { track.loadingAudio = false; }
        return;
      }
      if (track.isRemote) {
        await showModal("暂不支持此平台的网页内播放", "这份歌单的曲目信息已导入，但当前版本还没有接入该平台提供的网页内音源。播放器不会再自动跳转到外部平台。", "!");
        return;
      }
      await showModal("示例曲目", "当前选中的是播放器示例曲目，没有附带真实音源。点击「导入」可以读取歌单，或选择本地音频文件进行网页内播放。", "♪");
      return;
    }
    try {
      await track.audio.play();
      setMusicPlayButton(true);
    } catch (error) {
      setMusicPlayButton(false);
      const isMediaError = track.audio.error;
      await showModal("无法播放", isMediaError ? "音频源拒绝播放或已失效。部分平台音源有时效或地区/授权限制，请重新尝试播放。" : "浏览器暂时无法播放这个音频，请确认格式受支持，并重试。", "!");
    }
  }
  function toggleMusicPlayback() {
    const track = musicTracks.find(item => item.id === activeMusicTrackId);
    if (!track) return;
    if (!track.audio) { playMusicTrack(track); return; }
    if (track.audio.paused) playMusicTrack(track); else track.audio.pause();
  }
  function goToMusicTrack(direction, onlyPlayable = false) {
    const realTracks = musicTracks.filter(track => track.audio || (track.isRemote && track.platform === "QQ音乐"));
    const pool = onlyPlayable ? realTracks : (realTracks.length ? realTracks : musicTracks);
    if (!pool.length || pool.length < 2) return;
    const currentIndex = Math.max(0, pool.findIndex(track => track.id === activeMusicTrackId));
    const nextIndex = (currentIndex + direction + pool.length) % pool.length;
    const current = musicTracks.find(track => track.id === activeMusicTrackId);
    const wasPlaying = onlyPlayable || Boolean(current?.audio && !current.audio.paused);
    selectMusicTrack(pool[nextIndex], wasPlaying);
  }
  function applyMusicTrackSearch() {
    const query = $("#music-track-search").value.trim().toLocaleLowerCase();
    musicTracks.forEach(track => {
      track.row.hidden = !`${track.title} ${track.artist}`.toLocaleLowerCase().includes(query);
    });
    syncMusicTrackSelection();
  }
  function createMusicTrackRow(track) {
    const row = document.createElement("div"); row.className = "music-track-row"; row.dataset.musicId = track.id;
    const pick = document.createElement("input"); pick.type = "checkbox"; pick.className = "music-track-select"; pick.setAttribute("aria-label", `选择歌曲 ${track.title}`); pick.checked = Boolean(track.selectedForDelete); pick.addEventListener("change", () => { track.selectedForDelete = pick.checked; syncMusicTrackSelection(); });
    const play = document.createElement("button"); play.type = "button"; play.className = "music-track-play"; play.setAttribute("aria-label", `播放 ${track.title}`); play.textContent = "▶";
    const main = document.createElement("div"); main.className = "music-track-main";
    const title = document.createElement("strong"); title.textContent = track.title;
    const progress = document.createElement("div"); progress.className = "music-mini-progress";
    const fill = document.createElement("span"), dot = document.createElement("i"); progress.append(fill, dot); main.append(title, progress);
    const save = document.createElement("button"); save.type = "button"; save.className = "music-track-save"; save.setAttribute("aria-label", `收藏 ${track.title}`); save.textContent = musicSavedTrackIds.includes(track.id) ? "◆" : "◇";
    row.append(pick, play, main, save); track.row = row; return row;
  }
  function matchMusicTrackForLrc(fileName, tracks) {
    const base = String(fileName || "").split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
    const fileNorm = normalizedQQMatchText(base);
    if (!fileNorm) return null;
    const scored = tracks.map(track => {
      const titleNorm = normalizedQQMatchText(track.title || "");
      if (!titleNorm || titleNorm.length < 2) return { track, score: 0 };
      let score = 0;
      if (fileNorm === titleNorm) score = 1000;
      else if (fileNorm.includes(titleNorm)) score = 700 + Math.min(100, titleNorm.length);
      else if (titleNorm.includes(fileNorm) && fileNorm.length >= 4) score = 500 + Math.min(100, fileNorm.length);
      const artistParts = String(track.artist || "").split(/[\/、,&，;；]+/).map(part => normalizedQQMatchText(part)).filter(part => part.length >= 2 && part !== normalizedQQMatchText("未知歌手"));
      const artistHits = artistParts.filter(artist => fileNorm.includes(artist));
      if (artistHits.length) score += 180 + Math.min(40, artistHits[0].length);
      return { track, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
    if (!scored.length) return null;
    if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].track.id !== scored[1].track.id) return null;
    if (scored.length > 1 && scored[0].score - scored[1].score < 35 && normalizedQQMatchText(scored[0].track.title) === normalizedQQMatchText(scored[1].track.title)) return null;
    return scored[0].track;
  }
  function handleMusicLocalFiles(fileList) {
    const files = [...(fileList || [])].filter(file => file.type.startsWith("audio/"));
    if (!files.length) return;
    const imported = [];
    for (const file of files) {
      const qqTracks = musicTracks.filter(track => track.isRemote && track.platform === "QQ音乐");
      let track = matchMusicTrackForLrc(file.name, qqTracks);
      const url = URL.createObjectURL(file);
      const audio = new Audio(url); audio.preload = "metadata"; audio.volume = musicGlobalVolume; audio.muted = musicMuted;
      if (track) {
        // Attach local audio to the imported QQ song row so that its saved LRC stays linked to playback.
        if (track.audio && !track.audio.paused) track.audio.pause();
        if (track.url && track.audioFromLocal) URL.revokeObjectURL(track.url);
        track.audio = audio;
        track.url = url;
        track.audioFromLocal = true;
        track.localAudioFileName = file.name;
      } else {
        const id = `local-${uid()}`;
        const title = file.name.replace(/\.[^.]+$/, "") || "未命名音频";
        track = { id, title, artist: "本地音频", duration: 0, cover: makeLocalCover(title, id), lyrics: [], audio, url, row: null, isLocal: true, audioFromLocal: true, localAudioFileName: file.name };
        track.row = createMusicTrackRow(track);
        musicTracks.push(track); $("#music-track-list").append(track.row);
      }
      imported.push(track);
      attachMusicAudioEvents(track, audio);
      audio.load();
    }
    updateMusicTrackCount(); applyMusicTrackSearch();
    if (imported.length) {
      selectMusicTrack(imported[0], false);
      $("#music-track-list").scrollTop = $("#music-track-list").scrollHeight;
    }
    $("#music-audio-import-input").value = "";
  }
  function syncMusicTrackSelection() {
    const visible = musicTracks.filter(track => track.row && !track.row.hidden);
    const selected = musicTracks.filter(track => track.selectedForDelete);
    const button = $("#music-delete-selected-tracks");
    if (button) { button.disabled = selected.length === 0; button.textContent = selected.length ? `删除所选 (${selected.length})` : "删除所选"; }
    const all = $("#music-select-all-tracks");
    if (all) all.textContent = visible.length && visible.every(track => track.selectedForDelete) ? "取消全选" : "全选";
    musicTracks.forEach(track => { const checkbox = $(".music-track-select", track.row || document.createElement("div")); if (checkbox) checkbox.checked = Boolean(track.selectedForDelete); });
  }
  async function deleteSelectedMusicTracks() {
    const selected = musicTracks.filter(track => track.selectedForDelete);
    if (!selected.length) return;
    if (!await showModal("批量删除歌曲？", `将从当前列表中删除 ${selected.length} 首已选歌曲。`, "!", { confirm: true, okText: "删除" })) return;
    const removedIds = new Set(selected.map(track => track.id));
    selected.forEach(track => { if (track.audio && !track.audio.paused) track.audio.pause(); if (track.url && (track.isLocal || track.audioFromLocal)) { try { URL.revokeObjectURL(track.url); } catch (_) {} } });
    musicTracks = musicTracks.filter(track => !removedIds.has(track.id));
    if (musicSelectedPlaylist) {
      musicSelectedPlaylist.tracks = musicSelectedPlaylist.tracks.filter(track => !removedIds.has(track.id));
      persistDedupedMusicPlaylist(musicSelectedPlaylist);
    }
    if (removedIds.has(activeMusicTrackId)) { activeMusicTrackId = null; if (musicTracks[0]) selectMusicTrack(musicTracks[0], false); }
    const list = $("#music-track-list"); list.replaceChildren(); musicTracks.forEach(track => { track.row = createMusicTrackRow(track); list.append(track.row); });
    updateMusicTrackCount(); applyMusicTrackSearch(); syncMusicTrackSelection();
  }
  function setupMusicPlayer() {
    if (musicPlayerInitialized) return;
    musicPlayerInitialized = true;
    const rows = $$(".music-track-row", $("#music-track-list"));
    const durations = [275, 254, 223, 242];
    const covers = MUSIC_SAMPLE_META.map(item => item.cover);
    musicTracks = rows.map((row, index) => {
      const title = row.dataset.trackTitle || $(".music-track-main strong", row)?.textContent.trim() || `示例曲目 ${index + 1}`;
      const artist = row.dataset.trackArtist || "示例艺术家";
      const track = { id: `sample-${index + 1}`, title, artist, duration: MUSIC_SAMPLE_META[index]?.duration || durations[index] || 180, cover: covers[index] || makeLocalCover(title, `sample-${index}`), lyrics: MUSIC_SAMPLE_META[index]?.lyrics || [], audio: null, row, isSample: true };
      row.dataset.musicId = track.id;
      return track;
    });
    try { musicSavedTrackIds = JSON.parse(localStorage.getItem(MUSIC_SAVED_KEY) || "[]"); if (!Array.isArray(musicSavedTrackIds)) musicSavedTrackIds = []; } catch (_) { musicSavedTrackIds = []; }
    rows.forEach(row => {
      const track = musicTracks.find(item => item.row === row);
      const save = $(".music-track-save", row);
      if (save) save.textContent = musicSavedTrackIds.includes(track?.id) ? "◆" : "◇";
    });
    $("#music-track-list").addEventListener("click", event => {
      const row = event.target.closest(".music-track-row"); if (!row) return;
      const track = musicTracks.find(item => item.row === row); if (!track) return;
      if (event.target.closest(".music-track-select")) return;
      if (event.target.closest(".music-track-save")) {
        const has = musicSavedTrackIds.includes(track.id);
        musicSavedTrackIds = has ? musicSavedTrackIds.filter(id => id !== track.id) : [...musicSavedTrackIds, track.id];
        try { localStorage.setItem(MUSIC_SAVED_KEY, JSON.stringify(musicSavedTrackIds)); } catch (_) {}
        event.target.closest(".music-track-save").textContent = has ? "◇" : "◆";
        return;
      }
      if (event.target.closest(".music-row-volume-slider")) return;
      if (event.target.closest(".music-track-play")) {
        if (activeMusicTrackId === track.id) toggleMusicPlayback(); else selectMusicTrack(track, true);
        return;
      }
      selectMusicTrack(track, false);
    });
    $("#music-track-search").addEventListener("input", applyMusicTrackSearch);
    $("#music-import-lyrics-button").addEventListener("click", () => {
      if (!musicTracks.length) { showModal("请先载入歌单", "先打开你的 QQ 音乐歌单，再一次性选择多首歌曲对应的 .lrc 文件。", "≡"); return; }
      $("#music-lyrics-file").click();
    });
    $("#music-lyrics-file").addEventListener("change", async event => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      if (!files.length) return;
      const assigned = new Set();
      const imported = [];
      const skipped = [];
      const tracks = musicTracks.slice();
      const selectedTrack = tracks.find(item => item.id === activeMusicTrackId);
      for (const file of files) {
        try {
          const lyrics = parseMusicLrc(await file.text());
          if (!lyrics.length) { skipped.push(`${file.name}（没有有效时间戳）`); continue; }
          let track = matchMusicTrackForLrc(file.name, tracks);
          // For a single arbitrarily named file, retain the traditional selected-track workflow.
          if (!track && files.length === 1 && selectedTrack) track = selectedTrack;
          if (!track) { skipped.push(`${file.name}（未能按文件名匹配歌曲）`); continue; }
          if (assigned.has(track.id)) { skipped.push(`${file.name}（同一首歌已有导入文件）`); continue; }
          track.lyrics = lyrics;
          track.lyricFileName = file.name;
          track.lyricSource = "lrc";
          persistMusicLyrics(track);
          assigned.add(track.id);
          imported.push({ title: track.title, count: lyrics.length, track });
        } catch (_) { skipped.push(`${file.name}（读取失败）`); }
      }
      if (imported.length) {
        const active = tracks.find(item => item.id === activeMusicTrackId);
        if (active && imported.some(item => item.track.id === active.id)) {
          renderMusicLyrics(active);
          syncMusicLyrics(active, active.audio?.currentTime || 0, true);
        }
        if (!active && imported[0]) selectMusicTrack(imported[0].track, false);
      }
      let summary = `成功载入 ${imported.length} 首歌曲的本地 LRC 歌词。\n这些歌词按时间戳同步，并保存在当前浏览器中。`;
      if (imported.length) summary += `\n\n已匹配：\n${imported.slice(0, 8).map(item => `《${item.title}》（${item.count} 行）`).join("\n")}${imported.length > 8 ? `\n……以及另外 ${imported.length - 8} 首` : ""}`;
      if (skipped.length) summary += `\n\n未导入 ${skipped.length} 个文件：\n${skipped.slice(0, 6).join("\n")}${skipped.length > 6 ? `\n……另外 ${skipped.length - 6} 个` : ""}`;
      if (!imported.length && !skipped.length) summary = "没有成功匹配到歌词。请将文件名写成“歌名.lrc”或“歌手 - 歌名.lrc”，再批量导入。";
      await showModal(imported.length ? "本地歌词导入完成" : "没有匹配到歌词", summary, imported.length ? "✓" : "≡");
    });
    $("#music-select-all-tracks").addEventListener("click", () => { const visible = musicTracks.filter(track => track.row && !track.row.hidden); const select = !visible.length || !visible.every(track => track.selectedForDelete); visible.forEach(track => { track.selectedForDelete = select; const box = $(".music-track-select", track.row); if (box) box.checked = select; }); syncMusicTrackSelection(); });
    $("#music-delete-selected-tracks").addEventListener("click", deleteSelectedMusicTracks);
    $("#music-audio-import").addEventListener("click", openMusicPlaylistImport);
    $("#music-audio-import-input").addEventListener("change", event => handleMusicLocalFiles(event.target.files));
    $("#music-main-play").addEventListener("click", toggleMusicPlayback);
    $("#music-previous-track").addEventListener("click", () => goToMusicTrack(-1));
    $("#music-next-track").addEventListener("click", () => goToMusicTrack(1));
    $("#music-open-playlists-shortcut").addEventListener("click", openMusicPlaylistPicker);
    const musicHomeButton = $(".music-dock-button");
    if (musicHomeButton) musicHomeButton.addEventListener("click", () => { $("#notes-music-board").hidden = true; $("#notes-home").hidden = false; renderLayout(); });
    $("#music-open-playlists").addEventListener("click", openMusicPlaylistPicker);
    $("#music-volume-toggle").addEventListener("click", () => {
      musicMuted = !musicMuted;
      musicTracks.forEach(track => { if (track.audio) track.audio.muted = musicMuted; });
      $("#music-volume-toggle").textContent = musicMuted ? "◖×" : "◖))";
      $("#music-volume-toggle").setAttribute("aria-pressed", String(musicMuted));
    });
    $$(".music-row-volume-slider").forEach(slider => slider.addEventListener("input", event => {
      musicGlobalVolume = Number(event.target.value) / 100;
      musicTracks.forEach(track => { if (track.audio) track.audio.volume = musicGlobalVolume; });
    }));
    const mainProgress = $("#music-main-progress");
    const seekFromEvent = event => {
      const track = musicTracks.find(item => item.id === activeMusicTrackId);
      if (!track?.audio || !Number.isFinite(track.audio.duration) || !track.audio.duration) return;
      const rect = mainProgress.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      track.audio.currentTime = ratio * track.audio.duration;
      renderMusicProgress(track.audio.currentTime, track.audio.duration);
      syncMusicLyrics(track, track.audio.currentTime, true);
    };
    mainProgress.addEventListener("click", seekFromEvent);
    mainProgress.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const track = musicTracks.find(item => item.id === activeMusicTrackId);
      if (!track?.audio || !track.audio.duration) return;
      event.preventDefault();
      if (event.key === "Home") track.audio.currentTime = 0;
      else if (event.key === "End") track.audio.currentTime = track.audio.duration;
      else track.audio.currentTime = Math.max(0, Math.min(track.audio.duration, track.audio.currentTime + (event.key === "ArrowRight" ? 5 : -5)));
      renderMusicProgress(track.audio.currentTime, track.audio.duration); syncMusicLyrics(track, track.audio.currentTime, true);
    });
    musicTracks.forEach(track => renderMusicTrackProgress(track, 0));
    const sources = safeReadMusicSources();
    try { const selectedId = localStorage.getItem(MUSIC_SELECTED_PLAYLIST_KEY); musicSelectedPlaylist = sources.find(source => source.id === selectedId && Array.isArray(source.tracks) && source.tracks.length) || null; } catch (_) { musicSelectedPlaylist = null; }
    if (musicSelectedPlaylist && $("#music-open-playlists")) $("#music-open-playlists").title = `当前歌单：${musicSelectedPlaylist.platform} · ${musicSelectedPlaylist.name}`;
    const firstTrack = musicTracks[0];
    if (firstTrack) selectMusicTrack(firstTrack, false);
    updateMusicTrackCount();
    if (musicSelectedPlaylist?.tracks?.length) activateMusicPlaylist(musicSelectedPlaylist);
  }
  async function openMusicPlaylistImport() {
    setupMusicPlayer();
    const modalPromise = showModal("导入歌单", "粘贴 QQ 音乐或网易云音乐的歌单分享链接。读取成功后，这个歌单才会出现在「歌单」选择器里。", "≋", { confirm:true, okText:"读取并导入" });
    const extra = $("#modal-extra"); extra.replaceChildren();
    const addLabel = (labelText, control) => { const label = document.createElement("label"); label.className = "music-playlist-field"; const caption = document.createElement("span"); caption.textContent = labelText; label.append(caption, control); extra.append(label); };
    const platform = document.createElement("select"); platform.className = "music-playlist-input";
    [["QQ音乐","QQ 音乐"],["网易云音乐","网易云音乐"]].forEach(([value,label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; platform.append(option); });
    const name = document.createElement("input"); name.className = "music-playlist-input"; name.type = "text"; name.placeholder = "歌单名称，例如：我喜欢"; name.maxLength = 64; name.value = DEFAULT_QQ_PLAYLIST.name;
    const url = document.createElement("input"); url.className = "music-playlist-input"; url.type = "url"; url.placeholder = "粘贴歌单分享链接"; url.inputMode = "url"; url.value = DEFAULT_QQ_PLAYLIST.url;
    url.addEventListener("input", () => {
      if (/music\.163\.com/i.test(url.value)) platform.value = "网易云音乐";
      else if (/y\.qq\.com|qq\.com/i.test(url.value)) platform.value = "QQ音乐";
    });
    addLabel("平台", platform); addLabel("歌单名称", name); addLabel("分享链接", url);
    const hint = document.createElement("p"); hint.className = "music-playlist-hint"; hint.textContent = "当前已填入你刚提供的 QQ 音乐歌单链接。点击读取并导入后，会尝试加载公开歌单曲目；只有读取到歌曲列表才会保存到「歌单」选择器。"; extra.append(hint);
    const accepted = await modalPromise;
    if (!accepted) return;
    const cleanUrl = url.value.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) { await showModal("链接不完整", "请粘贴完整的 http 或 https 歌单分享链接。", "!"); return; }
    const selectedPlatform = platform.value;
    const playlistId = extractPlaylistId(selectedPlatform, cleanUrl);
    if (!playlistId) {
      await showModal("没有识别到歌单 ID", "请粘贴 QQ 音乐最终歌单详情页（例如 /n/ryqq_v2/playlist/数字ID）或网易云音乐公开歌单链接。短分享链接本身不含歌单 ID 时，静态网页无法可靠解析它的跳转目标。", "!");
      return;
    }
    let imported;
    try {
      imported = selectedPlatform === "QQ音乐" ? await readQQPlaylist(playlistId) : await readNetEasePlaylist(playlistId);
    } catch (error) {
      await showModal("暂时无法读取歌单", `${error?.message || "读取失败"}\n\n请确认链接是公开歌单详情页，不是分享短链或需要登录的私人收藏页。QQ 音乐链接建议使用 /n/ryqq/playlist/数字ID 格式。`, "!");
      return;
    }
    const sources = safeReadMusicSources();
    let source = sources.find(item => item.url === cleanUrl || (item.platform === selectedPlatform && item.playlistId === String(playlistId)));
    if (!source) { source = { id:uid(), platform:selectedPlatform, name:"", url:cleanUrl, playlistId:String(playlistId) }; sources.push(source); }
    source.platform = selectedPlatform;
    source.name = name.value.trim() || imported.name || (selectedPlatform === "QQ音乐" ? "QQ 音乐歌单" : "网易云歌单");
    source.resolvedName = imported.name || source.name;
    source.url = cleanUrl; source.playlistId = String(playlistId);
    source.tracks = dedupeMusicTracks(imported.tracks);
    source.importedAt = Date.now();
    writeMusicSources(sources);
    activateMusicPlaylist(source);
    await showModal("歌单导入成功", `「${source.name}」已导入，共读取到 ${source.tracks.length} 首歌曲。你以后可以点右侧「歌单」切换已导入的歌单。\n\n提示：当前已读取曲目信息；在线歌曲的网页内播放仍受平台授权和音源可用性限制。`, "≋");
  }
  async function openMusicPlaylistPicker() {
    setupMusicPlayer();
    const sources = safeReadMusicSources().filter(source => Array.isArray(source.tracks) && source.tracks.length);
    if (!sources.length) {
      await showModal("还没有已导入的歌单", "点「导入」并粘贴歌单链接。读取成功后，就会出现在这里供你切换。", "≋");
      return;
    }
    const selectedId = musicSelectedPlaylist?.id || (() => { try { return localStorage.getItem(MUSIC_SELECTED_PLAYLIST_KEY) || ""; } catch (_) { return ""; } })();
    const modalPromise = showModal("选择歌单", "这里仅用于切换已经成功导入的歌单，不会在这里添加新的链接。", "≋", { confirm:true, okText:"切换歌单" });
    const extra = $("#modal-extra"); extra.replaceChildren();
    const label = document.createElement("label"); label.className = "music-playlist-field";
    const caption = document.createElement("span"); caption.textContent = "已导入的歌单";
    const select = document.createElement("select"); select.className = "music-playlist-input";
    sources.forEach(source => { const option = document.createElement("option"); option.value = source.id; option.textContent = `${source.platform} · ${source.name}（${source.tracks.length} 首）`; select.append(option); });
    select.value = sources.some(source => source.id === selectedId) ? selectedId : sources[0].id;
    label.append(caption, select); extra.append(label);
    const accepted = await modalPromise;
    if (!accepted) return;
    const source = sources.find(item => item.id === select.value);
    if (!source) return;
    activateMusicPlaylist(source);
  }
  setupMusicPlayer();

  $("#open-music-board").addEventListener("click", () => { $("#notes-home").hidden = true; $("#notes-music-board").hidden = false; $("#note-collection").hidden = true; $("#note-reader").hidden = true; $("#note-editor").hidden = true; renderLayout(); });
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
  $("#import-data").addEventListener("click", () => $("#import-data-file").click());
  $("#import-data-file").addEventListener("change", event => { importJsonBackup(event.target.files?.[0]); event.target.value = ""; });
  $("#reset-data").addEventListener("click", async () => { if (await showModal("Reset local data?", "这会清除本浏览器中的 Notes、字卡、聊天记录和自定义纪念日。", "!", { confirm: true, okText: "Reset" })) { state = freshState(); saveState(); selectedDate = todayKey(); calendarYear = new Date().getFullYear(); calendarMonth = new Date().getMonth(); $("#profile-name").textContent = state.profileName; $("#profile-signature").textContent = state.signature; renderConversations(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderNotes(); switchTab("message"); showModal("Reset complete", "本地数据已恢复为初始 Demo 内容。", "✓"); } });
  $("#top-action").addEventListener("click", () => { if (activeTab === "notes" && !$("#notes-music-board").hidden) { $("#notes-music-board").hidden = true; $("#notes-home").hidden = false; renderLayout(); return; } if (activeTab === "message" && inChat) openChatPreferences(); else if (activeTab === "notes" && !$("#note-editor").hidden) saveNote(); else if (activeTab === "notes" && !$("#note-reader").hidden) { if (readingNoteId) openNoteEditor(currentNoteKind, readingNoteId); } else if (activeTab === "notes") { if (!$("#note-collection").hidden) $("#create-collection-note").click(); else $("#new-note").click(); } else if (activeTab === "saved") addAnniversary(); else if (activeTab === "me") showModal("Edit profile", "你可以在 Me 页面修改显示名称、签名和自定义字卡库。", "✎"); else if (activeTab === "message" && !inChat && state.hiddenContacts.length) { showHiddenContacts = !showHiddenContacts; renderConversations(); renderLayout(); } else showModal("Message", "选择一条会话即可开始聊天。", "✎"); });

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
  // Music pager is a compact view of the same Mortimer conversation and uses the shared chat/card settings.
  function musicPagerContactId() {
    return (CONTACTS.find(contact => /mortimer|莫蒂/i.test(contact.name)) || {}).id || activeContactId || (CONTACTS[0] || {}).id;
  }
  function renderMusicPagerChat() {
    const container = $("#music-pager-chat");
    if (!container) return;
    container.replaceChildren();
    const contactId = musicPagerContactId();
    const messages = contactId ? (state.messages[contactId] || []).filter(message => message.text && !["call-log", "music", "voice"].includes(message.kind)).slice(-10) : [];
    if (!messages.length) {
      const empty = document.createElement("div"); empty.className = "music-pager-empty"; empty.textContent = "여기에 메시지가 표시됩니다"; container.append(empty); return;
    }
    messages.forEach(message => {
      const row = document.createElement("div"); row.className = `message ${message.type === "sent" ? "sent" : "received"} music-pager-message-row`;
      const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = message.text;
      row.append(bubble);
      const meta = document.createElement("div"); meta.className = "message-meta"; meta.textContent = message.time || ""; row.append(meta);
      container.append(row);
    });
    container.scrollTop = container.scrollHeight;
  }
  function sendMusicPagerText() {
    const input = $("#music-pager-input");
    const value = input?.value.trim(); if (!value) return;
    const contactId = musicPagerContactId(); if (!contactId) return;
    if (!state.messages[contactId]) state.messages[contactId] = [];
    const message = { id: uid(), text: value, type: "sent", status: "Delivered", time: nowTime() };
    state.messages[contactId].push(message); state.previews[contactId] = value;
    markMessagesRead(contactId, "received"); saveState();
    input.value = ""; $("#music-pager-char-count").textContent = "0 / 1200";
    renderMusicPagerChat(); renderConversations();
    scheduleCharacterResponse(contactId);
  }
  $("#music-pager-input")?.addEventListener("input", event => { $("#music-pager-char-count").textContent = `${event.target.value.length} / 1200`; });
  $("#music-pager-input")?.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); sendMusicPagerText(); } });
  $("#music-send-vivi")?.addEventListener("click", sendMusicPagerText);
  $("#music-ask-mortimer")?.addEventListener("click", () => {
    const contactId = musicPagerContactId(); if (!contactId) return;
    receiveCard(contactId, getChatPreferences(contactId)); renderMusicPagerChat();
  });
  // Keep the small music chat in sync when the shared conversation receives messages.
  const musicPagerObserver = new MutationObserver(() => renderMusicPagerChat());
  const mainChatMessages = $("#chat-messages"); if (mainChatMessages) musicPagerObserver.observe(mainChatMessages, { childList: true, subtree: true });
  renderMusicPagerChat();

  // Run once on startup (to catch up on replies whose time passed while the page was closed),
  // then poll while open. Foreground events also catch up after mobile/browser timer throttling.
  processScheduledLetterReplies();
  setInterval(processScheduledLetterReplies, 10000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") processScheduledLetterReplies(); });
  window.addEventListener("focus", processScheduledLetterReplies);
  renderCustomStickers(); renderConversations(); renderMessages(); renderNotes(); renderCalendar(); renderSavedDay(); renderAnniversaries(); renderMe(); renderLayout();
})();
