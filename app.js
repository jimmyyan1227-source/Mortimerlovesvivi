(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const CARD_POOL = [
    "你吃饭了吗？不许总吃外卖。",
    "今晚月色很美，但我只看着你。",
    "又在发呆了吗？把手伸过来。",
    "刚刚忽然很想听你的声音。",
    "无论多晚，我的讯号永远向你开放。",
    "今天的疲惫，就暂存在我这里吧。",
    "我买了两张周末的电影票，要一起吗？",
    "笨蛋，天冷了怎么不多穿一件。",
    "你不用每次都表现得很坚强。",
    "等雨停了，我们就去散步吧。",
    "我把今天最后一点好运分给你。",
    "晚安。要记得在梦里见我。"
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
      { text: "I can't sleep :<", type: "sent", time: "23:51" },
      { text: "Who cares", type: "received", time: "23:52" },
      { text: ":(", type: "sent", time: "23:52" },
      { text: "don't you care about me now?", type: "sent", time: "23:52" },
      { text: "I always don't care.", type: "received", time: "23:53" },
      { text: "SOMEONE KNOCKING AT MY DOOR WTF", type: "sent", time: "23:53" },
      { text: "Its cold outta here", type: "received", time: "23:53" }
    ],
    luna: [{ text: "今天也辛苦啦，早点睡。", type: "received", time: "01:31" }],
    chen: [{ text: "Its cold outta here", type: "received", time: "23:53" }],
    couple: [{ text: "我们先开吧。", type: "received", time: "20:22" }],
    voice: [{ text: "刚刚给你留了一段语音。", type: "received", time: "14:27" }]
  };

  const STORAGE_KEY = "retroOtome_v2";
  const freshState = () => ({
    activeContact: "heart",
    collected: [],
    messages: JSON.parse(JSON.stringify(DEFAULT_MESSAGES)),
    previews: {},
    signature: "A leaf that remains evergreen"
  });

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return freshState();
      const parsed = JSON.parse(saved);
      return { ...freshState(), ...parsed, messages: { ...DEFAULT_MESSAGES, ...(parsed.messages || {}) } };
    } catch (error) {
      return freshState();
    }
  }
  let state = loadState();
  let activeTab = "list";
  let currentFilter = "all";

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { console.warn("Local storage is unavailable.", error); }
  }

  function showModal(title, message, symbol = "✦") {
    $("#modal-title").textContent = title;
    $("#modal-text").textContent = message;
    $("#modal-symbol").textContent = symbol;
    $("#modal").hidden = false;
  }
  function closeModal() { $("#modal").hidden = true; }

  function currentContact() {
    return CONTACTS.find(contact => contact.id === state.activeContact) || CONTACTS[0];
  }

  function switchTab(tab) {
    activeTab = tab;
    const pageMap = { list: "#page-list", chat: "#page-chat", diary: "#page-diary", collection: "#page-collection", settings: "#page-settings" };
    Object.entries(pageMap).forEach(([key, selector]) => { $(selector).hidden = key !== tab; });
    $$(".tab-item").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    $("#back-btn").hidden = tab !== "chat";
    $("#top-action").hidden = tab === "chat";
    const titles = { list: "Messages", chat: currentContact().name, diary: "Letters", collection: "Card Pool", settings: "My Profile" };
    $("#top-title").textContent = titles[tab] || "Messages";
    $("#top-action").textContent = tab === "diary" ? "Clear" : tab === "settings" ? "Edit" : "Edit";
    if (tab === "list") renderConversations();
    if (tab === "chat") renderMessages();
    if (tab === "diary") renderCards();
    if (tab === "collection") renderRecentCards();
  }

  function openChat(id) {
    state.activeContact = id;
    saveState();
    switchTab("chat");
  }

  function renderConversations() {
    const list = $("#conversation-list");
    list.replaceChildren();
    CONTACTS.filter(contact => currentFilter === "all" || contact.mood === currentFilter || contact.mood === "all").forEach(contact => {
      const button = document.createElement("button");
      button.className = "conversation";
      button.type = "button";
      button.addEventListener("click", () => openChat(contact.id));
      const avatar = document.createElement("img");
      avatar.src = contact.avatar;
      avatar.alt = "";
      const copy = document.createElement("div");
      copy.className = "convo-copy";
      const head = document.createElement("div");
      head.className = "convo-head";
      const name = document.createElement("span");
      name.className = "convo-name";
      name.textContent = contact.name;
      const time = document.createElement("span");
      time.className = "convo-time";
      time.textContent = contact.time;
      const preview = document.createElement("div");
      preview.className = "convo-preview";
      preview.textContent = state.previews[contact.id] || contact.preview;
      head.append(name, time);
      copy.append(head, preview);
      button.append(avatar, copy);
      list.append(button);
    });
  }

  function renderMessages() {
    const container = $("#chat-messages");
    container.replaceChildren();
    const messages = state.messages[state.activeContact] || [];
    messages.forEach(message => appendMessageElement(container, message));
    container.scrollTop = container.scrollHeight;
    $("#top-title").textContent = currentContact().name;
  }

  function appendMessageElement(container, message) {
    const group = document.createElement("div");
    group.className = `message ${message.type === "sent" ? "sent" : "received"}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text;
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = `${message.time || nowTime()} ${message.type === "sent" ? "Delivered" : "Read"}`;
    group.append(bubble, meta);
    container.append(group);
  }

  function nowTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function sendMessage(text) {
    const content = text.trim();
    if (!content) return;
    const id = state.activeContact;
    if (!state.messages[id]) state.messages[id] = [];
    state.messages[id].push({ text: content, type: "sent", time: nowTime() });
    state.previews[id] = content;
    saveState();
    $("#message-input").value = "";
    renderMessages();
    window.setTimeout(() => {
      const card = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
      state.messages[id].push({ text: card, type: "received", time: nowTime() });
      state.previews[id] = card;
      if (!state.collected.includes(card)) state.collected.unshift(card);
      saveState();
      if (activeTab === "chat" && state.activeContact === id) renderMessages();
      renderConversations();
      renderCards();
    }, 550);
  }

  function collectRandomCard() {
    const card = CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
    if (!state.collected.includes(card)) state.collected.unshift(card);
    state.lastDraw = card;
    saveState();
    $("#draw-preview").textContent = `“${card}”`;
    renderCards();
    renderRecentCards();
    showModal("字卡已打捞", `「${card}」已放进你的收藏。`, "✧");
  }

  function renderCards() {
    const container = $("#card-tags");
    container.replaceChildren();
    $("#collected-count").textContent = `${state.collected.length} cards`;
    if (!state.collected.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "还没有收集到字卡。去聊天或抽卡池看看吧。";
      container.append(empty);
      return;
    }
    state.collected.forEach(card => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card-tag";
      button.textContent = `＋ ${card}`;
      button.addEventListener("click", () => {
        const box = $("#letter-box");
        box.value += `${box.value ? "\n" : ""}${card}`;
        box.focus();
      });
      container.append(button);
    });
  }

  function renderRecentCards() {
    const container = $("#recent-cards");
    container.replaceChildren();
    const cards = state.collected.slice(0, 5);
    if (!cards.length) {
      const empty = document.createElement("div");
      empty.className = "recent-card";
      empty.textContent = "还没有字卡。抽一张作为今天的小纪念吧。";
      container.append(empty);
      return;
    }
    cards.forEach(card => {
      const item = document.createElement("div");
      item.className = "recent-card";
      item.textContent = `✧　${card}`;
      container.append(item);
    });
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "retro-otome-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function updateStatusTime() {
    $("#status-time").textContent = nowTime();
  }

  $$(".tab-item").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  $("#back-btn").addEventListener("click", () => switchTab("list"));
  $("#composer").addEventListener("submit", event => {
    event.preventDefault();
    sendMessage($("#message-input").value);
  });
  $("#camera-btn").addEventListener("click", () => showModal("Camera", "这是一个界面 Demo，暂不调用设备相机。", "◎"));
  $$(".action-btn").forEach(button => button.addEventListener("click", () => {
    const actions = {
      call: ["Call", "正在模拟拨打语音电话……对方暂时无法接听。", "☎"],
      facetime: ["FaceTime", "正在连接视频信号……这是一个视觉演示，不会发起真实视频通话。", "▣"],
      contact: ["Contact", "联系人资料已打开。你可以在「Me」页面管理本地设置。", "♙"]
    };
    showModal(...actions[button.dataset.action]);
  }));
  $("#modal-ok").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", event => { if (event.target === $("#modal")) closeModal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

  $$(".mood-chip").forEach(button => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    $$(".mood-chip").forEach(chip => chip.classList.toggle("active", chip === button));
    renderConversations();
  }));
  $("#profile-done").addEventListener("click", () => showModal("Profile", "个人主页已就绪。以后收到的字卡会保存在当前浏览器。", "♡"));
  $("#draw-card").addEventListener("click", collectRandomCard);
  $("#draw-card-main").addEventListener("click", collectRandomCard);
  $("#copy-letter").addEventListener("click", async () => {
    const text = $("#letter-box").value;
    if (!text.trim()) return showModal("信纸还是空的", "先点选一张字卡，或者写下自己的句子吧。", "✉");
    try {
      await navigator.clipboard.writeText(text);
      showModal("Copied!", "信件内容已复制，可以粘贴到你想分享的地方。", "✓");
    } catch (error) {
      $("#letter-box").select();
      showModal("复制提示", "浏览器暂不允许自动复制，信件已选中，请使用 Ctrl+C 复制。", "✉");
    }
  });
  $("#clear-letter").addEventListener("click", () => {
    $("#letter-box").value = "";
  });
  $("#top-action").addEventListener("click", () => {
    if (activeTab === "diary") $("#letter-box").value = "";
    else if (activeTab === "settings") showModal("Edit profile", "个人资料编辑功能可以在后续版本中继续扩展。", "✎");
    else showModal("Edit", "长按或点击任意会话即可进入聊天。", "✎");
  });
  $("#edit-signature").addEventListener("click", () => {
    const value = window.prompt("输入新的个人签名：", state.signature || "");
    if (value !== null) {
      state.signature = value.trim();
      saveState();
      $(".profile-caption span").textContent = state.signature;
      showModal("Saved", "个人签名已保存在当前浏览器。", "✓");
    }
  });
  $("#export-data").addEventListener("click", downloadJson);
  $("#reset-data").addEventListener("click", () => {
    showModal("重置本地数据？", "如果确认重置，请再次点击下面按钮以恢复初始演示内容。", "!");
    const ok = $("#modal-ok");
    ok.textContent = "Reset";
    const resetHandler = () => {
      state = freshState();
      saveState();
      $("#letter-box").value = "";
      $(".profile-caption span").textContent = state.signature;
      closeModal();
      ok.textContent = "Okay";
      ok.removeEventListener("click", resetHandler);
      renderConversations();
      switchTab("list");
    };
    ok.addEventListener("click", resetHandler, { once: true });
  });

  $(".profile-caption span").textContent = state.signature || "A leaf that remains evergreen";
  updateStatusTime();
  renderConversations();
  renderMessages();
  renderCards();
  renderRecentCards();
  switchTab("list");
})();
