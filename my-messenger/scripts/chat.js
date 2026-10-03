// scripts/chat.js — Личные чаты + онлайн + ответы + реакции

// Экраны
const screenChatsEl = document.getElementById("screenChats");
const screenChatEl  = document.getElementById("screenChat");
const backBtn       = document.getElementById("backBtn");

// Список
const chatListEl = document.getElementById("chatList");
const countEl    = document.getElementById("messagesCount");

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

let currentUser = null;
let currentPeer = null;
let messagesRef = null;
let messagesListener = null;
let peerStatusRef = null;
let allUsers = {};
let myChats = {};
let replyTo = null;
let heartbeatTimer = null;

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
});

function updateLastSeen() {
  if (!currentUser) return;
  db.ref("users/" + currentUser.uid + "/lastSeen").set(Date.now());
}

window.addEventListener("beforeunload", () => {
  if (currentUser) {
    db.ref("users/" + currentUser.uid + "/lastSeen").set(Date.now());
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

  if (sec < 60)   return "в сети";
  if (min < 60)   return `был(а) ${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  if (hour < 24)  return `был(а) ${hour} ${plural(hour, "час", "часа", "часов")} назад`;
  if (day === 1)  return "был(а) вчера";
  if (day < 7)    return `был(а) ${day} ${plural(day, "день", "дня", "дней")} назад`;
  return "был(а) давно";
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
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
      if (currentPeer) updatePeerStatus(currentPeer.uid);
    }
  });
}

function loadMyChats() {
  db.ref("users/" + currentUser.uid + "/chats").on("value", snapshot => {
    myChats = snapshot.val() || {};
    renderChatList();
  });
}

function renderChatList() {
  chatListEl.innerHTML = "";

  const chatEntries = Object.entries(myChats)
    .sort((a, b) => (b[1].lastTime || 0) - (a[1].lastTime || 0));

  if (chatEntries.length === 0) {
    chatListEl.innerHTML = `
      <div class="chats-empty">
        <div class="chats-empty-icon">💬</div>
        <div class="chats-empty-text">
          Пока нет чатов.<br>
          Нажми 🔍 вверху, чтобы найти человека по email.
        </div>
      </div>
    `;
    countEl.textContent = "— нет чатов";
    return;
  }

  chatEntries.forEach(([peerUid, chat]) => {
    const li = document.createElement("li");
    li.className = "chat-item";
    li.dataset.uid = peerUid;

    const peer = allUsers[peerUid] || {};
    const displayName = peer.nick || chat.peerName || peer.email || "?";
    const letter = (displayName || "?")[0].toUpperCase();
    const hue = [...peerUid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

    const avatarStyle = peer.avatarBase64
      ? `background-image:url(${peer.avatarBase64}); background-size:cover; background-position:center;`
      : `background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%));`;
    const avatarText = peer.avatarBase64 ? "" : letter;

    const onlineDot = isOnline(peer.lastSeen) ? `<span class="online-dot"></span>` : "";

    const lastMsg = (chat.lastMessage || "").slice(0, 40) || "нет сообщений";
    const timeStr = chat.lastTime ? formatTime(chat.lastTime) : "";

    li.innerHTML = `
      <div class="avatar" style="${avatarStyle}">${avatarText}${onlineDot}</div>
      <div class="chat-info">
        <div class="chat-name">${escapeHtml(displayName)}</div>
        <div class="chat-last">${escapeHtml(lastMsg)}</div>
      </div>
      <div class="chat-meta">
        <span class="chat-time">${timeStr}</span>
      </div>
    `;

    li.addEventListener("click", () => openChatWith(peerUid, displayName));
    chatListEl.appendChild(li);

    if (!allUsers[peerUid]) {
      db.ref("users/" + peerUid).once("value").then(snap => {
        const u = snap.val();
        if (u) {
          allUsers[peerUid] = u;
          renderChatList();
        }
      });
    }
  });

  countEl.textContent = `(${chatEntries.length} ${chatEntries.length === 1 ? "чат" : "чатов"})`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatMsgTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// ============ ПОИСК ============
searchBtn.addEventListener("click", () => {
  searchPanel.classList.toggle("open");
  if (searchPanel.classList.contains("open")) {
    searchInput.focus();
  } else {
    searchInput.value = "";
    searchResults.innerHTML = "";
  }
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!query || query.length < 2) {
    if (query.length > 0) {
      searchResults.innerHTML = `<div class="search-empty">Введи хотя бы 2 символа</div>`;
    }
    return;
  }

  const found = Object.entries(allUsers).filter(([uid, u]) => {
    if (uid === currentUser.uid) return false;
    const email = (u.email || "").toLowerCase();
    const nick = (u.nick || "").toLowerCase();
    return email.includes(query) || nick.includes(query);
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
      </div>
    `;

    li.addEventListener("click", () => {
      searchPanel.classList.remove("open");
      searchInput.value = "";
      searchResults.innerHTML = "";
      openChatWith(uid, displayName);
    });

    searchResults.appendChild(li);
  });
});

// ============ ОТКРЫТИЕ ЧАТА ============
function openChatWith(peerUid, peerDisplayName) {
  currentPeer = { uid: peerUid, name: peerDisplayName };
  replyTo = null;
  hideReplyPreview();

  [...chatListEl.querySelectorAll(".chat-item")].forEach(li => {
    li.classList.toggle("active", li.dataset.uid === peerUid);
  });

  peerNameEl.textContent = peerDisplayName;

  applyPeerAvatar(peerUid, peerDisplayName);

  if (!allUsers[peerUid]) {
    db.ref("users/" + peerUid).once("value").then(snap => {
      const u = snap.val();
      if (u) {
        allUsers[peerUid] = u;
        applyPeerAvatar(peerUid, peerDisplayName);
      }
    });
  }

  if (peerStatusRef) peerStatusRef.off();
  peerStatusRef = db.ref("users/" + peerUid + "/lastSeen");
  peerStatusRef.on("value", snap => {
    updatePeerStatusFromLastSeen(snap.val());
  });

  if (messagesRef && messagesListener) {
    messagesRef.off("child_added", messagesListener);
    messagesRef.off("child_changed");
  }

  messagesEl.innerHTML = "";

  const chatId = [currentUser.uid, peerUid].sort().join("_");
  messagesRef = db.ref("chats/" + chatId + "/messages");

  messagesListener = messagesRef.on("child_added", snapshot => {
    renderMessage(snapshot.key, snapshot.val());
  });

  messagesRef.on("child_changed", snapshot => {
    updateMessage(snapshot.key, snapshot.val());
  });

  if (window.innerWidth < 768) {
    showChatScreen();
  }
}

function updatePeerStatus(peerUid) {
  const peer = allUsers[peerUid];
  if (peer) updatePeerStatusFromLastSeen(peer.lastSeen);
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
  const text = inputEl.value.trim();
  if (!text) return;

  const now = Date.now();

  const msgData = {
    uid: currentUser.uid,
    text: text,
    timestamp: now
  };

  if (replyTo) {
    msgData.replyTo = {
      text: replyTo.text,
      uid: replyTo.uid,
      name: replyTo.name
    };
  }

  messagesRef.push(msgData);

  db.ref("users/" + currentUser.uid + "/chats/" + currentPeer.uid).update({
    lastMessage: text,
    lastTime: now,
    peerName: currentPeer.name
  });

  db.ref("users/" + currentPeer.uid + "/chats/" + currentUser.uid).update({
    lastMessage: text,
    lastTime: now,
    peerName: currentUser.email
  });

  replyTo = null;
  hideReplyPreview();

  inputEl.value = "";
  inputEl.focus();
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

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
      </div>
    `;
  }

  inner += `<div class="text">${escapeHtml(msg.text)}</div>`;
  msgEl.innerHTML = inner;

  msgEl.addEventListener("click", (e) => {
    e.stopPropagation();
    openActionsMenu(wrap, msgId, msg, msgEl);
  });

  wrap.appendChild(msgEl);

  if (msg.timestamp) {
    const timeEl = document.createElement("div");
    timeEl.className = "msg-time";
    timeEl.textContent = formatMsgTime(msg.timestamp);
    wrap.appendChild(timeEl);
  }

  renderReaction(wrap, msgId, msg);

  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateMessage(msgId, msg) {
  const wrap = document.querySelector(`.message-wrap[data-msg-id="${msgId}"]`);
  if (!wrap) return;

  const oldReaction = wrap.querySelector(".msg-reaction");
  if (oldReaction) oldReaction.remove();
  renderReaction(wrap, msgId, msg);
}

function renderReaction(wrap, msgId, msg) {
  const reactions = msg.reactions || {};
  const users = Object.keys(reactions);
  const count = users.length;

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

  if (meReacted) {
    ref.remove();
  } else {
    ref.set(true);
  }
}

// ============ ПАНЕЛЬ ДЕЙСТВИЙ ============
function openActionsMenu(wrap, msgId, msg, msgEl) {
  document.querySelectorAll(".msg-actions").forEach(el => el.remove());

  const menu = document.createElement("div");
  menu.className = "msg-actions";

  // Кнопка "Реакция" — ставит/убирает ❤ (та же логика, что и клик по самой реакции)
  const reactBtn = document.createElement("button");
  reactBtn.className = "msg-action-btn";
  const meReacted = msg.reactions && msg.reactions[currentUser.uid];
  reactBtn.textContent = meReacted ? "❤" : "🤍";
  reactBtn.title = meReacted ? "Убрать реакцию" : "Поставить ❤";
  reactBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleReaction(msgId, meReacted);
    menu.remove();
  });

  // Кнопка "Ответить"
  const replyBtn = document.createElement("button");
  replyBtn.className = "msg-action-btn";
  replyBtn.textContent = "↩ Ответить";
  replyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const authorName = msg.uid === currentUser.uid
      ? "Вы"
      : (currentPeer && currentPeer.name) || "Собеседник";
    replyTo = {
      text: (msg.text || "").slice(0, 80),
      uid: msg.uid,
      name: authorName
    };
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

  if (left + menuRect.width > window.innerWidth - 10) {
    left = window.innerWidth - menuRect.width - 10;
  }
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
    messagesRef.off("child_changed");
    messagesRef = null;
    messagesListener = null;
  }
  if (peerStatusRef) {
    peerStatusRef.off();
    peerStatusRef = null;
  }
  currentPeer = null;
  showListScreen();
});

// ============ УТИЛИТЫ ============
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}