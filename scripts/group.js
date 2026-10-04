// scripts/group.js — страница "О чате"

const groupAvatarEl  = document.getElementById("groupAvatar");
const groupNameEl    = document.getElementById("groupName");
const groupInfoEl    = document.getElementById("groupInfo");
const inviteLinkEl   = document.getElementById("inviteLink");
const copyLinkBtn    = document.getElementById("copyLinkBtn");
const copyStatusEl   = document.getElementById("copyStatus");
const membersListEl  = document.getElementById("membersList");
const membersCountEl = document.getElementById("membersCount");
const pageTitleEl    = document.getElementById("pageTitle");
const leaveBtn       = document.getElementById("leaveBtn");

const params = new URLSearchParams(window.location.search);
const chatId = params.get("id");

let currentUser = null;

auth.onAuthStateChanged(user => {
  if (!user) return;
  currentUser = user;

  if (!chatId) {
    alert("Чат не указан");
    window.location.href = "chat.html";
    return;
  }

  loadChatInfo();
});

function loadChatInfo() {
  db.ref("chats/" + chatId + "/info").on("value", snap => {
    if (!snap.exists()) {
      groupNameEl.textContent = "Чат не найден";
      return;
    }
    const info = snap.val();

    // Тип
    const isChannel = info.type === "channel";
    pageTitleEl.textContent = isChannel ? "О канале" : "О группе";

    // Название
    groupNameEl.textContent = info.name || "Без названия";

    // Аватарка
    if (info.avatarBase64) {
      groupAvatarEl.style.backgroundImage = `url(${info.avatarBase64})`;
      groupAvatarEl.style.backgroundSize = "cover";
      groupAvatarEl.style.backgroundPosition = "center";
      groupAvatarEl.textContent = "";
    } else {
      const letter = (info.name || "?")[0].toUpperCase();
      const hue = [...chatId].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
      groupAvatarEl.style.backgroundImage = "";
      groupAvatarEl.textContent = letter;
      groupAvatarEl.style.background = `linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%))`;
    }

    // Инфо
    const membersCount = info.members ? Object.keys(info.members).length : 0;
    groupInfoEl.textContent = `${isChannel ? "📢 Канал" : "👥 Группа"} · ${membersCount} участников`;

        // Ссылка — формируется автоматически под текущий домен
    const basePath = window.location.pathname.replace(/[^\/]*$/, "");  // убираем имя файла
    const link = window.location.origin + basePath + "?join=" + chatId;
    inviteLinkEl.value = link;

    // Список участников
    renderMembers(info);
  });
}

function renderMembers(info) {
  membersListEl.innerHTML = "";
  const members = info.members || {};
  const admins = info.admins || {};
  const uids = Object.keys(members);

  membersCountEl.textContent = `(${uids.length})`;

  uids.forEach(uid => {
    const u = window.allUsersCache?.[uid] || {};
    db.ref("users/" + uid).once("value").then(snap => {
      const user = snap.val() || {};
      const displayName = user.nick || user.email || "?";
      const letter = displayName[0].toUpperCase();
      const hue = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
      const isAdmin = admins[uid];

      const avatarStyle = user.avatarBase64
        ? `background-image:url(${user.avatarBase64}); background-size:cover; background-position:center;`
        : `background:linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%));`;
      const avatarText = user.avatarBase64 ? "" : letter;

      const div = document.createElement("div");
      div.className = "create-member";
      div.innerHTML = `
        <div class="create-member-avatar" style="${avatarStyle}">${avatarText}</div>
        <div class="create-member-name">
          ${escapeHtml(displayName)}
          ${uid === currentUser.uid ? " (Вы)" : ""}
        </div>
        ${isAdmin ? '<span class="admin-badge">👑</span>' : ''}
      `;
      membersListEl.appendChild(div);
    });
  });
}

copyLinkBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(inviteLinkEl.value);
    copyStatusEl.style.color = "#4ade80";
    copyStatusEl.textContent = "✅ Ссылка скопирована";
    setTimeout(() => copyStatusEl.textContent = "", 1500);
  } catch (err) {
    copyStatusEl.style.color = "#f87171";
    copyStatusEl.textContent = "Ошибка: " + err.message;
  }
});

leaveBtn.addEventListener("click", () => {
  alert("Выход из чата — скоро!");
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
