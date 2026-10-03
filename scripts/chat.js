// scripts/chat.js — Личные чаты + группы + онлайн + ответы + реакции + меню + галочки + morph

// Экраны
const screenChatsEl = document.getElementById("screenChats");
const screenChatEl  = document.getElementById("screenChat");
const backBtn       = document.getElementById("backBtn");

// Список
const chatListEl = document.getElementById("chatList");
const countEl    = document.getElementById("messagesCount");

// Кнопка создания
const createBtn = document.getElementById("createBtn");

// Экран создания
const createPage          = document.getElementById("createPage");
const createPageTitle     = document.getElementById("createPageTitle");
const createBackBtn       = document.getElementById("createBackBtn");
const createAvatarPreview = document.getElementById("createAvatarPreview");
const createAvatarInput   = document.getElementById("createAvatarInput");
const createAvatarBtn     = document.getElementById("createAvatarBtn");
const createNameInput     = document.getElementById("createNameInput");
const createNameStatus    = document.getElementById("createNameStatus");
const createMembers       = document.getElementById("createMembers");
const createMembersStatus = document.getElementById("createMembersStatus");
const createSubmitBtn     = document.getElementById("createSubmitBtn");

let createType = "group";
let createSelectedMembers = {};
let createAvatarBase64 = null;

// Меню создания
const createMenuOverlay = document.getElementById("createMenuOverlay");
const createMenu        = document.getElementById("createMenu");
const createGroupBtn    = document.getElementById("createGroupBtn");
const createChannelBtn  = document.getElementById("createChannelBtn");
const createCancel      = document.getElementById("createCancel");

// Поиск
const searchBtn      = document.getElementById("searchBtn");
const searchPanel    = document.getElementById("searchPanel");
const searchInput    = document.getElementById("searchInput");
const searchResults  = document.getElementById("searchResults");

// Чат
const messagesEl   = document.getElementById("messages");
const inputEl      = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const peerAvatarEl = document.getElementById("peerAvatar");
const peerNameEl   = document.getElementById("peerName");
const peerStatusEl = document.getElementById("peerStatus");

// Reply
const replyPreview = document.getElementById("replyPreview");
const replyNameEl  = document.getElementById("replyName");
const replyTextEl  = document.getElementById("replyText");
const replyCloseEl = document.getElementById("replyClose");

// Drawer
const drawerEmail  = document.getElementById("drawerEmail");
const drawerAvatar = document.getElementById("drawerAvatar");

// Профиль собеседника
const peerInfoBlock = document.getElementById("peerInfoBlock");

// Меню чата
const chatMenuOverlay = document.getElementById("chatMenuOverlay");
const chatMenu        = document.getElementById("chatMenu");
const chatMenuTitle   = document.getElementById("chatMenuTitle");
const menuPin         = document.getElementById("menuPin");
const menuBlock       = document.getElementById("menuBlock");
const menuDelete      = document.getElementById("menuDelete");
const menuCancel      = document.getElementById("menuCancel");

let currentUser = null;
let currentPeer = null;
let messagesRef = null;
let messagesListener = null;
let messagesChangedListener = null;
let peerStatusRef = null;
let allUsers = {};
let myChats = {};
let replyTo = null;
let heartbeatTimer = null;
let activeMenuChatId = null;
let longPressTimer = null;
let peerTypingRef = null;
let typingTimeout = null;
let myTypingState = false;

// Morph
let morphTimeout = null;
let currentMorphGhost = null;

// Кэш информации о группах
const chatInfoCache = {};

// ============ АВТОРИЗАЦИЯ ============
auth.onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;

  db.ref("users/" + user.uid).once("value").then(snap => {
    const data = snap.val() || {};
    const display = data.nick || user.email;
    if (drawerEmail) drawerEmail.textContent = display;
    if (drawerAvatar) {
      if (data.avatarBase64) {
        drawerAvatar.style.backgroundImage = `url(${data.avatarBase64})`;
        drawerAvatar.textContent = "";
      } else {
        drawerAvatar.style.backgroundImage = "";
        drawerAvatar.textContent = (display || "?")[0].toUpperCase();
      }
    }
  });

  updateLastSeen();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(updateLastSeen, 30000);

  loadAllUsers();
  loadMyChats();

  const params = new URLSearchParams(window.location.search);
  const openUid = params.get("open");
  if (openUid) {
    setTimeout(() => {
      const u = allUsers[openUid];
      if (u) {
        const chatId = [currentUser.uid, openUid].sort().join("_");
        openChatById(chatId, true);
      }
    }, 800);
  }
});

function updateLastSeen() {
  if (!currentUser) return;
  db.ref("users/" + currentUser.uid + "/lastSeen").set(Date.now());
}

// ============ ПЕЧАТАЕТ... ============
function setTyping(isTyping) {
  if (!currentPeer || !currentUser) return;
  if (myTypingState === isTyping) return;
  myTypingState = isTyping;
  db.ref("chats/" + currentPeer.chatId + "/typing/" + currentUser.uid)
    .set(isTyping ? true : null);
}

inputEl.addEventListener("input", () => {
  if (!inputEl.value.trim()) {
    setTyping(false);
    if (typingTimeout) clearTimeout(typingTimeout);
    return;
  }
  setTyping(true);
  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => setTyping(false), 2000);
});

window.addEventListener("beforeunload", () => {
  if (currentUser) {
    db.ref("users/" + currentUser.uid + "/lastSeen").set(Date.now());
  }
  if (currentPeer && currentPeer.chatId) {
    db.ref("chats/" + currentPeer.chatId + "/typing/" + currentUser.uid).remove();
  }
});

// ============ СТАТУС ============
function getStatusText(lastSeen) {
  if (!lastSeen) return "не в сети";
  const diff = Date.now() - lastSeen;
  const sec  = Math.floor(diff / 1000);
  const min  = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day  = Math.floor(hour / 24);

  if (sec < 60)  return "в сети";
  if (min < 60)  return `был(а) ${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  if (hour < 24) return `был(а) ${hour} ${plural(hour, "час", "часа", "часов")} назад`;
  if (day === 1) return "был(а) вчера";
  if (day < 7)   return `был(а) ${day} ${plural(day, "день", "дня", "дней")} назад`;
  return "был(а) давно";
}

function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function isOnline(lastSeen) {
  return lastSeen && (Date.now() - lastSeen < 60000);
}

// ============ ПОЛЬЗОВАТЕЛИ ============
function loadAllUsers() {
  db.ref("users").on("value", snapshot => {
    allUsers = snapshot.val() || {};
    if (currentUser) {
      renderChatList();
      if (currentPeer && currentPeer.isPrivate && currentPeer.uid) {
        updatePeerStatus(currentPeer.uid);
      }
    }
  });
}

function loadMyChats() {
  db.ref("users/" + currentUser.uid + "/chats").on("value", snapshot => {
    myChats = snapshot.val() || {};
    renderChatList();

    Object.keys(myChats).forEach(key => {
      const chat = myChats[key] || {};
      if (chat.chatType === "group" || chat.chatType === "channel") {
        loadChatInfo(key);
      } else {
        db.ref("chats/" + key + "/info").once("value").then(snap => {
          if (snap.exists()) {
            chatInfoCache[key] = snap.val();
            renderChatList();
          }
        });
      }
    });
  });
}

function loadChatInfo(chatId) {
  if (chatInfoCache[chatId] && chatInfoCache[chatId]._loaded) return;
  db.ref("chats/" + chatId + "/info").on("value", snap => {
    if (snap.exists()) {
      const info = snap.val();
      info._loaded = true;
      chatInfoCache[chatId] = info;
      renderChatList();
    }
  });
}

function isPrivateChatId(chatId) {
  if (chatId.startsWith("-")) return false;
  return true;
}

function getPeerUidFromPrivateChatId(chatId) {
  if (chatId.includes("_")) {
    const parts = chatId.split("_");
    return parts[0] === currentUser.uid ? parts[1] : parts[0];
  }
  return chatId;
}

// ============ СПИСОК ЧАТОВ ============
function renderChatList() {
  chatListEl.innerHTML = "";

  const chatEntries = Object.entries(myChats)
    .filter(([chatId, chat]) => !chat.deleted)   // ← пропускаем удалённые
    .sort((a, b) => {
      const aP = a[1].pinned ? 1 : 0, bP = b[1].pinned ? 1 : 0;
      if (aP !== bP) return bP - aP;
      return (b[1].lastTime || 0) - (a[1].lastTime || 0);
    });

  if (chatEntries.length === 0) {
    chatListEl.innerHTML = `
      <div class="chats-empty">
        <div class="chats-empty-icon">💬</div>
        <div class="chats-empty-text">
          Пока нет чатов.<br>
          Нажми 🔍 вверху, чтобы найти человека по email.
        </div>
      </div>`;
    countEl.textContent = "— нет чатов";
    return;
  }

  chatEntries.forEach(([chatId, chat]) => {
    const li = document.createElement("li");
    li.className = "chat-item";
    li.dataset.chatId = chatId;
    if (chat.pinned) li.classList.add("pinned");
    if (chat.blocked) li.classList.add("blocked");

    let displayName, avatarStyle, avatarText, onlineDot = "";
    const isPrivate = isPrivateChatId(chatId);

    if (isPrivate) {
      const peerUid = getPeerUidFromPrivateChatId(chatId);
      const peer = allUsers[peerUid] || {};
      displayName = peer.nick || chat.peerName || peer.email || "?";

      const letter = (displayName || "?")[0].toUpperCase();
      const hue = [...peerUid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

      avatarStyle = peer.avatarBase64
        ? `background-image:url(${peer.avatarBase64}); background-size:cover; background-position:center;`
        : `background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%));`;
      avatarText = peer.avatarBase64 ? "" : letter;
      onlineDot = isOnline(peer.lastSeen) ? `<span class="online-dot"></span>` : "";

      li.dataset.uid = peerUid;
    } else {
      const info = chatInfoCache[chatId] || {};
      displayName = info.name || chat.chatName || "Группа";

      const letter = displayName[0].toUpperCase();
      const hue = [...chatId].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

      avatarStyle = info.avatarBase64
        ? `background-image:url(${info.avatarBase64}); background-size:cover; background-position:center;`
        : `background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%));`;
      avatarText = info.avatarBase64 ? "" : letter;
    }

    const lastMsg = (chat.lastMessage || "").slice(0, 40) || "нет сообщений";
    const timeStr = chat.lastTime ? formatTime(chat.lastTime) : "";
    const unread = chat.unread || 0;
    const unreadBadge = unread > 0 ? `<span class="unread-badge">${unread > 99 ? "99+" : unread}</span>` : "";

    li.innerHTML = `
      <div class="avatar" style="${avatarStyle}">${avatarText}${onlineDot}</div>
      <div class="chat-info">
        <div class="chat-name">${escapeHtml(displayName)}</div>
        <div class="chat-last">${escapeHtml(lastMsg)}</div>
      </div>
      <div class="chat-meta">
        <span class="chat-time">${timeStr}</span>
        ${unreadBadge}
      </div>`;

    li.addEventListener("click", () => {
      if (li.dataset.longPressed === "true") {
        li.dataset.longPressed = "false";
        return;
      }
      const avatarEl = li.querySelector(".avatar");
      openChatById(chatId, isPrivate, avatarEl);
    });

    const startPress = () => {
      longPressTimer = setTimeout(() => {
        li.dataset.longPressed = "true";
        li.classList.add("pressing");
        try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
        openChatMenu(chatId, displayName);
        setTimeout(() => li.classList.remove("pressing"), 300);
      }, 500);
    };
    const cancelPress = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    li.addEventListener("touchstart", startPress, { passive: true });
    li.addEventListener("touchend", cancelPress);
    li.addEventListener("touchcancel", cancelPress);
    li.addEventListener("touchmove", cancelPress);
    li.addEventListener("mousedown", startPress);
    li.addEventListener("mouseup", cancelPress);
    li.addEventListener("mouseleave", cancelPress);
    li.addEventListener("contextmenu", e => e.preventDefault());

    chatListEl.appendChild(li);
  });

  countEl.textContent = `(${chatEntries.length} ${chatEntries.length === 1 ? "чат" : "чатов"})`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatMsgTime(ts) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// ============ МЕНЮ ЧАТА ============
function openChatMenu(chatId, displayName) {
  activeMenuChatId = chatId;
  chatMenuTitle.textContent = displayName;
  const chat = myChats[chatId] || {};
  menuPin.querySelector(".chat-menu-text").textContent = chat.pinned ? "Открепить" : "Закрепить";
  menuBlock.querySelector(".chat-menu-text").textContent = chat.blocked ? "Разблокировать" : "Заблокировать";
  chatMenuOverlay.classList.add("open");
  chatMenu.classList.add("open");
}

function closeChatMenu() {
  chatMenuOverlay.classList.remove("open");
  chatMenu.classList.remove("open");
  activeMenuChatId = null;
}

chatMenuOverlay.addEventListener("click", closeChatMenu);
menuCancel.addEventListener("click", closeChatMenu);

menuPin.addEventListener("click", () => {
  if (!activeMenuChatId) return;
  const chat = myChats[activeMenuChatId] || {};
  db.ref("users/" + currentUser.uid + "/chats/" + activeMenuChatId + "/pinned")
    .set(!chat.pinned ? true : null);
  closeChatMenu();
});

menuBlock.addEventListener("click", () => {
  if (!activeMenuChatId) return;
  const chat = myChats[activeMenuChatId] || {};
  db.ref("users/" + currentUser.uid + "/chats/" + activeMenuChatId + "/blocked")
    .set(!chat.blocked ? true : null);
  closeChatMenu();
});

menuDelete.addEventListener("click", () => {
  if (!activeMenuChatId) return;
  const chatId = activeMenuChatId;
  const chat = myChats[chatId] || {};
  const isPrivate = isPrivateChatId(chatId);

  let displayName = "чат";
  if (isPrivate) {
    const peerUid = getPeerUidFromPrivateChatId(chatId);
    const peer = allUsers[peerUid] || {};
    displayName = peer.nick || peer.email || "чат";
  } else {
    const info = chatInfoCache[chatId] || {};
    displayName = info.name || "группа";
  }

  if (!confirm(`Удалить чат с ${displayName}?`)) return;

  if (isPrivate) {
    db.ref("users/" + currentUser.uid + "/chats/" + chatId).remove();
  } else {
    // Группа — ставим флаг deleted, чтобы не возвращалась
    db.ref("users/" + currentUser.uid + "/chats/" + chatId).update({
      deleted: true,
      lastMessage: "",
      lastTime: 0,
      unread: 0
    });
  }

  closeChatMenu();
});

// ============ ПОИСК ============
searchBtn.addEventListener("click", () => {
  searchPanel.classList.toggle("open");
  if (searchPanel.classList.contains("open")) searchInput.focus();
  else { searchInput.value = ""; searchResults.innerHTML = ""; }
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";
  if (!query || query.length < 2) {
    if (query.length > 0) searchResults.innerHTML = `<div class="search-empty">Введи хотя бы 2 символа</div>`;
    return;
  }
  const found = Object.entries(allUsers).filter(([uid, u]) => {
    if (uid === currentUser.uid) return false;
    return (u.email || "").toLowerCase().includes(query) ||
           (u.nick || "").toLowerCase().includes(query);
  });
  if (found.length === 0) {
    searchResults.innerHTML = `<div class="search-empty">Никого не найдено</div>`;
    return;
  }
  found.slice(0, 10).forEach(([uid, u]) => {
    const displayName = u.nick || u.email;
    const letter = (displayName || "?")[0].toUpperCase();
    const hue = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    const avatarStyle = u.avatarBase64
      ? `background-image:url(${u.avatarBase64}); background-size:cover; background-position:center;`
      : `background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%));`;
    const avatarText = u.avatarBase64 ? "" : letter;

    const li = document.createElement("li");
    li.className = "chat-item";
    li.innerHTML = `
      <div class="avatar" style="${avatarStyle}">${avatarText}</div>
      <div class="chat-info">
        <div class="chat-name">${escapeHtml(displayName)}</div>
        <div class="chat-last">${escapeHtml(u.email || "")}</div>
      </div>`;
    li.addEventListener("click", () => {
      searchPanel.classList.remove("open");
      searchInput.value = "";
      searchResults.innerHTML = "";
      const avatarEl = li.querySelector(".avatar");
      const chatId = [currentUser.uid, uid].sort().join("_");
      openChatById(chatId, true, avatarEl);
    });
    searchResults.appendChild(li);
  });
});

// ============ ОТКРЫТИЕ ЧАТА ПО ID ============
function openChatById(chatId, isPrivate, sourceAvatarEl) {
  let morphStartRect = null;
  let morphData = null;
  if (sourceAvatarEl) {
    morphStartRect = sourceAvatarEl.getBoundingClientRect();
    const sStyle = window.getComputedStyle(sourceAvatarEl);
    morphData = {
      bgImage: sStyle.backgroundImage,
      bg: sourceAvatarEl.style.background || sStyle.background,
      text: sourceAvatarEl.textContent || ""
    };
  }

  let peerUid = null;
  let displayName = "?";

  if (isPrivate) {
    peerUid = getPeerUidFromPrivateChatId(chatId);
    const peer = allUsers[peerUid] || {};
    displayName = peer.nick || peer.email || "?";
    currentPeer = { uid: peerUid, name: displayName, chatId: chatId, isPrivate: true };
  } else {
    const info = chatInfoCache[chatId] || {};
    displayName = info.name || "Группа";
    currentPeer = { uid: null, name: displayName, chatId: chatId, isPrivate: false, info: info };
  }

  replyTo = null;
  hideReplyPreview();

  [...chatListEl.querySelectorAll(".chat-item")].forEach(li => {
    li.classList.toggle("active", li.dataset.chatId === chatId);
  });

  peerNameEl.textContent = displayName;

  // Аватар в шапке
  if (isPrivate) {
    applyPeerAvatar(peerUid, displayName);
  } else {
    const info = chatInfoCache[chatId] || {};
    const letter = displayName[0].toUpperCase();
    const hue = [...chatId].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

    peerAvatarEl.style.opacity = "1";

    if (info.avatarBase64) {
      peerAvatarEl.style.backgroundImage = `url(${info.avatarBase64})`;
      peerAvatarEl.textContent = "";
      peerAvatarEl.style.background = `url(${info.avatarBase64}) center/cover`;
    } else {
      peerAvatarEl.style.backgroundImage = "";
      peerAvatarEl.textContent = letter;
      peerAvatarEl.style.background = `linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%))`;
    }
  }

  if (morphTimeout) clearTimeout(morphTimeout);
  if (currentMorphGhost) { currentMorphGhost.remove(); currentMorphGhost = null; }
  peerAvatarEl.style.opacity = "1";

  // Статус в шапке
  if (isPrivate) {
    if (peerStatusRef) peerStatusRef.off();
    peerStatusRef = db.ref("users/" + peerUid + "/lastSeen");
    peerStatusRef.on("value", snap => updatePeerStatusFromLastSeen(snap.val()));
  } else {
    if (peerStatusRef) { peerStatusRef.off(); peerStatusRef = null; }
    const info = chatInfoCache[chatId] || {};
    const membersCount = info.members ? Object.keys(info.members).length : 1;
    peerStatusEl.textContent = `${info.type === "channel" ? "📢" : "👥"} ${membersCount} участников`;
    peerStatusEl.style.color = "var(--text-dim)";
  }

    // Проверка прав для канала: писать могут только админы
  const info = chatInfoCache[chatId] || {};
  const isChannel = info.type === "channel";
  const isAdmin = info.admins && info.admins[currentUser.uid];
  const canWrite = !isChannel || isAdmin;

  const chatFooter = document.querySelector(".chat-footer");
  if (chatFooter) {
    chatFooter.style.display = canWrite ? "flex" : "none";
  }

  if (peerTypingRef) peerTypingRef.off();
  peerTypingRef = null;

  if (messagesRef && messagesListener) {
    messagesRef.off("child_added", messagesListener);
    messagesRef.off("child_changed", messagesChangedListener);
  }

  messagesEl.innerHTML = "";
  messagesRef = db.ref("chats/" + chatId + "/messages");

  messagesListener = messagesRef.on("child_added", snapshot => {
    const msg = snapshot.val();
    renderMessage(snapshot.key, msg);
    if (msg.uid !== currentUser.uid && (!msg.readBy || !msg.readBy[currentUser.uid])) {
      snapshot.ref.child("readBy/" + currentUser.uid).set(true);
      db.ref("users/" + currentUser.uid + "/chats/" + chatId + "/unread").set(null);
    }
  });

  messagesChangedListener = messagesRef.on("child_changed", snapshot => {
    updateMessage(snapshot.key, snapshot.val());
  });

  messagesRef.once("value").then(snap => {
    const messages = snap.val() || {};
    const updates = {};
    Object.keys(messages).forEach(msgId => {
      const m = messages[msgId];
      if (m.uid !== currentUser.uid && (!m.readBy || !m.readBy[currentUser.uid])) {
        updates[msgId + "/readBy/" + currentUser.uid] = true;
      }
    });
    if (Object.keys(updates).length > 0) messagesRef.update(updates);
  });

  db.ref("users/" + currentUser.uid + "/chats/" + chatId + "/unread").set(null);

  if (peerInfoBlock) {
    peerInfoBlock.onclick = () => {
      if (isPrivate && peerUid) {
        window.location.href = "user.html?uid=" + peerUid;
      }
    };
  }

  if (window.innerWidth < 768) showChatScreen();

  if (morphStartRect && morphData) {
    setTimeout(() => {
      const target = document.getElementById("peerAvatar");
      if (target && target.getBoundingClientRect().width > 0) {
        morphAvatarWithRect(morphStartRect, morphData);
      }
    }, 60);
  }
}

function updatePeerStatus(peerUid) {
  const peer = allUsers[peerUid];
  if (peer) updatePeerStatusFromLastSeen(peer.lastSeen);
}

function showTypingStatus() {
  peerStatusEl.innerHTML = `печатает<span class="typing-dots"><span></span><span></span><span></span></span>`;
  peerStatusEl.style.color = "#6b8dff";
}

function updatePeerStatusFromLastSeen(lastSeen) {
  const online = isOnline(lastSeen);
  peerStatusEl.textContent = online ? "● в сети" : "○ " + getStatusText(lastSeen);
  peerStatusEl.style.color = online ? "#4ade80" : "var(--text-dim)";
}

function applyPeerAvatar(peerUid, peerDisplayName) {
  const peer = allUsers[peerUid] || {};
  const displayName = peer.nick || peerDisplayName || peer.email || "?";
  const letter = (displayName || "?")[0].toUpperCase();
  const hue = [...peerUid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  peerAvatarEl.style.opacity = "1";

  if (peer.avatarBase64) {
    peerAvatarEl.style.backgroundImage = `url(${peer.avatarBase64})`;
    peerAvatarEl.textContent = "";
    peerAvatarEl.style.background = `url(${peer.avatarBase64}) center/cover`;
  } else {
    peerAvatarEl.style.backgroundImage = "";
    peerAvatarEl.textContent = letter;
    peerAvatarEl.style.background = `linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%))`;
  }

  if (peer.nick) peerNameEl.textContent = peer.nick;
}

// ============ ОТПРАВКА ============
function sendMessage() {
  if (!currentPeer || !messagesRef) return;
  const chat = myChats[currentPeer.chatId] || {};
  if (chat.blocked) { alert("Чат заблокирован."); return; }

  // Проверка: если канал и я не админ — нельзя писать
  if (!currentPeer.isPrivate) {
    const info = chatInfoCache[currentPeer.chatId] || {};
    if (info.type === "channel" && !(info.admins && info.admins[currentUser.uid])) {
      alert("В канале могут писать только администраторы.");
      return;
    }
  }

  const text = inputEl.value.trim();
  if (!text) return;

  const now = Date.now();
  const msgData = {
    uid: currentUser.uid,
    text: text,
    timestamp: now,
    readBy: {}
  };
  if (replyTo) msgData.replyTo = { text: replyTo.text, uid: replyTo.uid, name: replyTo.name };

  messagesRef.push(msgData);

  db.ref("users/" + currentUser.uid + "/chats/" + currentPeer.chatId).update({
    lastMessage: text,
    lastTime: now,
    unread: 0
  });

  if (currentPeer.isPrivate && currentPeer.uid) {
    db.ref("users/" + currentPeer.uid + "/chats/" + currentPeer.chatId).update({
      lastMessage: text,
      lastTime: now,
      peerName: currentUser.email
    });
    db.ref("users/" + currentPeer.uid + "/chats/" + currentPeer.chatId + "/unread")
      .transaction(c => (c || 0) + 1);
  } else {
    const info = chatInfoCache[currentPeer.chatId] || {};
    const members = info.members || {};
    const updates = {};
    Object.keys(members).forEach(uid => {
      if (uid === currentUser.uid) return;
      updates["users/" + uid + "/chats/" + currentPeer.chatId + "/lastMessage"] = text;
      updates["users/" + uid + "/chats/" + currentPeer.chatId + "/lastTime"] = now;
      updates["users/" + uid + "/chats/" + currentPeer.chatId + "/chatType"] = info.type;
      updates["users/" + uid + "/chats/" + currentPeer.chatId + "/chatName"] = info.name;
    });
    if (Object.keys(updates).length > 0) db.ref().update(updates);
    Object.keys(members).forEach(uid => {
      if (uid === currentUser.uid) return;
      db.ref("users/" + uid + "/chats/" + currentPeer.chatId + "/unread")
        .transaction(c => (c || 0) + 1);
    });
  }

  setTyping(false);
  replyTo = null;
  hideReplyPreview();
  inputEl.value = "";
  inputEl.focus();
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

// ============ REPLY ============
function showReplyPreview(name, text) {
  replyNameEl.textContent = name;
  replyTextEl.textContent = text;
  replyPreview.style.display = "flex";
}
function hideReplyPreview() {
  replyPreview.style.display = "none";
  replyTo = null;
}
replyCloseEl.addEventListener("click", hideReplyPreview);

// ============ СООБЩЕНИЯ ============
function renderMessage(msgId, msg) {
  const wrap = document.createElement("div");
  wrap.className = "message-wrap";
  if (msg.uid === currentUser.uid) wrap.classList.add("mine");
  wrap.dataset.msgId = msgId;

  const msgEl = document.createElement("div");
  msgEl.className = "message";

  let inner = "";
  if (msg.replyTo) {
    inner += `
      <div class="msg-reply">
        <div class="msg-reply-name">${escapeHtml(msg.replyTo.name || "—")}</div>
        <div class="msg-reply-text">${escapeHtml(msg.replyTo.text || "")}</div>
      </div>`;
  }
  inner += `<div class="text">${escapeHtml(msg.text)}</div>`;
  msgEl.innerHTML = inner;

  msgEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if (wrap.dataset.swiped === "true") { wrap.dataset.swiped = "false"; return; }
    openActionsMenu(wrap, msgId, msg, msgEl);
  });

  wrap.appendChild(msgEl);
  attachSwipeToReply(wrap, msg);

  if (msg.timestamp) {
    const metaEl = document.createElement("div");
    metaEl.className = "msg-meta";

    const timeEl = document.createElement("span");
    timeEl.className = "msg-time";
    timeEl.textContent = formatMsgTime(msg.timestamp);
    metaEl.appendChild(timeEl);

    if (msg.uid === currentUser.uid) {
      const ticksEl = document.createElement("span");
      ticksEl.className = "msg-ticks";
      if (currentPeer && currentPeer.isPrivate && msg.readBy && msg.readBy[currentPeer.uid]) {
        ticksEl.classList.add("read");
        ticksEl.textContent = "✓✓";
      } else {
        ticksEl.textContent = "✓";
      }
      metaEl.appendChild(ticksEl);
    }
    wrap.appendChild(metaEl);
  }

  renderReaction(wrap, msgId, msg);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateMessage(msgId, msg) {
  const wrap = document.querySelector(`.message-wrap[data-msg-id="${msgId}"]`);
  if (!wrap) return;

  if (msg.uid === currentUser.uid && currentPeer && currentPeer.isPrivate) {
    const ticksEl = wrap.querySelector(".msg-ticks");
    if (ticksEl) {
      if (msg.readBy && msg.readBy[currentPeer.uid]) {
        ticksEl.classList.add("read");
        ticksEl.textContent = "✓✓";
      } else {
        ticksEl.classList.remove("read");
        ticksEl.textContent = "✓";
      }
    }
  }

  const oldReaction = wrap.querySelector(".msg-reaction");
  if (oldReaction) oldReaction.remove();
  renderReaction(wrap, msgId, msg);
}

function renderReaction(wrap, msgId, msg) {
  const reactions = msg.reactions || {};
  const count = Object.keys(reactions).length;
  if (count === 0) return;

  const meReacted = reactions[currentUser.uid];
  const reactEl = document.createElement("div");
  reactEl.className = "msg-reaction";
  if (meReacted) reactEl.classList.add("active");
  reactEl.textContent = `❤ ${count}`;

  reactEl.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleReaction(msgId, meReacted);
  });
  wrap.appendChild(reactEl);
}

function toggleReaction(msgId, meReacted) {
  if (!messagesRef) return;
  const ref = messagesRef.child(msgId + "/reactions/" + currentUser.uid);
  if (meReacted) ref.remove();
  else ref.set(true);
}

// ============ ПАНЕЛЬ ДЕЙСТВИЙ ============
function openActionsMenu(wrap, msgId, msg, msgEl) {
  document.querySelectorAll(".msg-actions").forEach(el => el.remove());

  const menu = document.createElement("div");
  menu.className = "msg-actions";

  const reactBtn = document.createElement("button");
  reactBtn.className = "msg-action-btn";
  const meReacted = msg.reactions && msg.reactions[currentUser.uid];
  reactBtn.textContent = meReacted ? "❤" : "🤍";
  reactBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleReaction(msgId, meReacted);
    menu.remove();
  });

  const replyBtn = document.createElement("button");
  replyBtn.className = "msg-action-btn";
  replyBtn.textContent = "↩ Ответить";
  replyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const authorName = msg.uid === currentUser.uid
      ? "Вы"
      : (currentPeer && currentPeer.name) || "Собеседник";
    replyTo = { text: (msg.text || "").slice(0, 80), uid: msg.uid, name: authorName };
    showReplyPreview(authorName, msg.text);
    inputEl.focus();
    menu.remove();
  });

  menu.appendChild(reactBtn);
  menu.appendChild(replyBtn);
  document.body.appendChild(menu);

  const msgRect = msgEl.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let top = msgRect.top - menuRect.height - 8;
  let left = msgRect.left;
  if (top < 10) top = msgRect.bottom + 8;
  if (left + menuRect.width > window.innerWidth - 10) left = window.innerWidth - menuRect.width - 10;
  if (left < 10) left = 10;

  menu.style.top = top + "px";
  menu.style.left = left + "px";

  setTimeout(() => {
    const closeHandler = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener("click", closeHandler);
      }
    };
    document.addEventListener("click", closeHandler);
  }, 10);
}

// ============ ЭКРАНЫ ============
function showChatScreen() {
  screenChatsEl.style.display = "none";
  screenChatEl.style.display = "flex";
}
function showListScreen() {
  screenChatEl.style.display = "none";
  screenChatsEl.style.display = "flex";
}
backBtn.addEventListener("click", () => {
  if (messagesRef && messagesListener) {
    messagesRef.off("child_added", messagesListener);
    messagesRef.off("child_changed", messagesChangedListener);
    messagesRef = null;
    messagesListener = null;
    messagesChangedListener = null;
  }
  if (peerStatusRef) { peerStatusRef.off(); peerStatusRef = null; }
  if (peerTypingRef) { peerTypingRef.off(); peerTypingRef = null; }
  setTyping(false);
  currentPeer = null;
    // Возвращаем поле ввода (на случай, если было скрыто для канала)
  const chatFooter = document.querySelector(".chat-footer");
  if (chatFooter) chatFooter.style.display = "flex";
  showListScreen();
});

// ============ УТИЛИТЫ ============
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

// ============ СВАЙП ВЛЕВО ДЛЯ ОТВЕТА ============
function attachSwipeToReply(wrap, msg) {
  let startX = 0, startY = 0, currentX = 0;
  let isSwiping = false, isHorizontal = false;
  const THRESHOLD = 60;

  const onStart = (x, y) => {
    startX = x; startY = y; currentX = 0;
    isSwiping = true; isHorizontal = false;
    wrap.classList.add("swiping");
  };

  const onMove = (x, y) => {
    if (!isSwiping) return;
    const dx = x - startX, dy = y - startY;

    if (!isHorizontal) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        isSwiping = false;
        wrap.classList.remove("swiping");
        return;
      }
      if (Math.abs(dx) > 8) isHorizontal = true;
    }

    if (dx < 0 && Math.abs(dx) < 100) {
      currentX = dx;
      wrap.style.transform = `translateX(${dx}px)`;
      wrap.classList.toggle("swipe-ready", Math.abs(dx) > THRESHOLD);
    }
  };

  const onEnd = () => {
    if (!isSwiping) {
      wrap.style.transform = "";
      wrap.classList.remove("swiping", "swipe-ready");
      return;
    }
    if (Math.abs(currentX) > THRESHOLD) {
      wrap.dataset.swiped = "true";
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
      const authorName = msg.uid === currentUser.uid ? "Вы"
        : (currentPeer && currentPeer.name) || "Собеседник";
      replyTo = { text: (msg.text || "").slice(0, 80), uid: msg.uid, name: authorName };
      showReplyPreview(authorName, msg.text);
      inputEl.focus();
    }
    wrap.style.transform = "";
    setTimeout(() => wrap.classList.remove("swiping", "swipe-ready"), 50);
    isSwiping = false; isHorizontal = false; currentX = 0;
  };

  wrap.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  wrap.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  wrap.addEventListener("touchend", onEnd);
  wrap.addEventListener("touchcancel", onEnd);
}

// ============ УТИЛИТА: сжатие изображения ============
function resizeImageToBase64(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Не удалось загрузить"));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("Ошибка чтения"));
    reader.readAsDataURL(file);
  });
}

// ============ СОЗДАНИЕ ГРУППЫ / КАНАЛА ============
function openCreateMenu() {
  createMenuOverlay.classList.add("open");
  createMenu.classList.add("open");
}
function closeCreateMenu() {
  createMenuOverlay.classList.remove("open");
  createMenu.classList.remove("open");
}

createBtn.addEventListener("click", openCreateMenu);
createMenuOverlay.addEventListener("click", closeCreateMenu);
createCancel.addEventListener("click", closeCreateMenu);

createGroupBtn.addEventListener("click", () => {
  closeCreateMenu();
  openCreatePage("group");
});
createChannelBtn.addEventListener("click", () => {
  closeCreateMenu();
  openCreatePage("channel");
});

function openCreatePage(type) {
  createType = type;
  createPageTitle.textContent = type === "group" ? "Новая группа" : "Новый канал";
  createAvatarPreview.textContent = type === "group" ? "👥" : "📢";
  createAvatarPreview.style.backgroundImage = "";
  createAvatarPreview.style.background = "";
  createNameInput.value = "";
  createNameStatus.textContent = "";
  createMembersStatus.textContent = "";
  createSelectedMembers = {};
  createAvatarBase64 = null;
  createSubmitBtn.disabled = true;
  createSubmitBtn.textContent = "Создать";
  renderCreateMembers();
  createPage.classList.add("open");
}
function closeCreatePage() {
  createPage.classList.remove("open");
}
createBackBtn.addEventListener("click", closeCreatePage);

function renderCreateMembers() {
  createMembers.innerHTML = "";
  Object.entries(allUsers).forEach(([uid, u]) => {
    if (uid === currentUser.uid) return;
    const displayName = u.nick || u.email || "?";
    const letter = displayName[0].toUpperCase();
    const hue = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    const avatarStyle = u.avatarBase64
      ? `background-image:url(${u.avatarBase64}); background-size:cover; background-position:center;`
      : `background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%));`;
    const avatarText = u.avatarBase64 ? "" : letter;

    const div = document.createElement("div");
    div.className = "create-member";
    if (createSelectedMembers[uid]) div.classList.add("selected");
    div.dataset.uid = uid;

    div.innerHTML = `
      <div class="create-member-check"></div>
      <div class="create-member-avatar" style="${avatarStyle}">${avatarText}</div>
      <div class="create-member-name">${escapeHtml(displayName)}</div>
    `;

    div.addEventListener("click", () => {
      if (createSelectedMembers[uid]) {
        delete createSelectedMembers[uid];
        div.classList.remove("selected");
      } else {
        createSelectedMembers[uid] = true;
        div.classList.add("selected");
      }
      updateCreateSubmit();
    });

    createMembers.appendChild(div);
  });
}

createNameInput.addEventListener("input", updateCreateSubmit);
function updateCreateSubmit() {
  const hasName = createNameInput.value.trim().length >= 2;
  const hasMembers = Object.keys(createSelectedMembers).length > 0;
  createSubmitBtn.disabled = !(hasName && hasMembers);
}

createAvatarBtn.addEventListener("click", () => createAvatarInput.click());
createAvatarInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return;
  if (file.size > 8 * 1024 * 1024) { alert("Файл больше 8 МБ"); return; }

  try {
    const base64 = await resizeImageToBase64(file, 300, 0.75);
    createAvatarBase64 = base64;
    createAvatarPreview.style.backgroundImage = `url(${base64})`;
    createAvatarPreview.style.backgroundSize = "cover";
    createAvatarPreview.style.backgroundPosition = "center";
    createAvatarPreview.textContent = "";
  } catch (err) {
    alert("Ошибка загрузки: " + err.message);
  }
});

createSubmitBtn.addEventListener("click", async () => {
  const name = createNameInput.value.trim();
  const members = Object.keys(createSelectedMembers);

  if (name.length < 2) {
    createNameStatus.style.color = "#f87171";
    createNameStatus.textContent = "Название слишком короткое";
    return;
  }
  if (members.length === 0) {
    createMembersStatus.style.color = "#f87171";
    createMembersStatus.textContent = "Выбери хотя бы одного участника";
    return;
  }

  createSubmitBtn.disabled = true;
  createSubmitBtn.textContent = "Создаём…";

  try {
    const chatId = db.ref("chats").push().key;
    const membersMap = {};
    membersMap[currentUser.uid] = true;
    members.forEach(uid => { membersMap[uid] = true; });

    const adminsMap = {};
    adminsMap[currentUser.uid] = true;

    const chatInfo = {
      type: createType,
      name: name,
      avatarBase64: createAvatarBase64 || null,
      members: membersMap,
      admins: adminsMap,
      createdBy: currentUser.uid,
      createdAt: Date.now()
    };

    await db.ref("chats/" + chatId + "/info").set(chatInfo);

    const updates = {};
    Object.keys(membersMap).forEach(uid => {
      updates["users/" + uid + "/chats/" + chatId] = {
        lastMessage: "",
        lastTime: Date.now(),
        unread: 0,
        chatType: createType,
        chatName: name
      };
    });

    await db.ref().update(updates);

    closeCreatePage();
    alert(`✅ ${createType === "group" ? "Группа" : "Канал"} "${name}" создан${createType === "group" ? "а" : ""}!`);

  } catch (err) {
    console.error(err);
    createNameStatus.style.color = "#f87171";
    createNameStatus.textContent = "Ошибка: " + err.message;
    createSubmitBtn.disabled = false;
    createSubmitBtn.textContent = "Создать";
  }
});
