// scripts/user.js — профиль другого пользователя

const userAvatarEl = document.getElementById("userAvatar");
const userNickEl   = document.getElementById("userNick");
const userStatusEl = document.getElementById("userStatus");
const writeBtn     = document.getElementById("writeBtn");

let targetUid = null;
let targetUser = null;

// Получаем uid из URL: user.html?uid=XXX
const params = new URLSearchParams(window.location.search);
targetUid = params.get("uid");

auth.onAuthStateChanged(user => {
  if (!user) return;

  if (!targetUid) {
    alert("Пользователь не указан");
    window.location.href = "chat.html";
    return;
  }

  if (targetUid === user.uid) {
    // Это я — редирект на свой профиль
    window.location.href = "profile.html";
    return;
  }

  loadUser();
});

function loadUser() {
  db.ref("users/" + targetUid).on("value", snap => {
    const u = snap.val();
    if (!u) {
      userNickEl.textContent = "Пользователь не найден";
      return;
    }
    targetUser = u;

    const displayName = u.nick || u.email || "Без имени";
    userNickEl.textContent = displayName;

    // Аватарка
    if (u.avatarBase64) {
      userAvatarEl.style.backgroundImage = `url(${u.avatarBase64})`;
      userAvatarEl.textContent = "";
    } else {
      const letter = (displayName || "?")[0].toUpperCase();
      const hue = [...targetUid].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
      userAvatarEl.style.backgroundImage = "";
      userAvatarEl.textContent = letter;
      userAvatarEl.style.background = `linear-gradient(135deg,hsl(${hue},70%,55%),hsl(${(hue+40)%360},70%,45%))`;
    }

    // Статус онлайн
    updateStatus(u.lastSeen);
  });
}

function updateStatus(lastSeen) {
  if (!lastSeen) {
    userStatusEl.textContent = "не в сети";
    userStatusEl.style.color = "var(--text-dim)";
    return;
  }
  const diff = Date.now() - lastSeen;
  const sec  = Math.floor(diff / 1000);
  const min  = Math.floor(sec / 60);

  if (sec < 60) {
    userStatusEl.textContent = "● в сети";
    userStatusEl.style.color = "#4ade80";
  } else if (min < 60) {
    userStatusEl.textContent = `○ был(а) ${min} мин. назад`;
    userStatusEl.style.color = "var(--text-dim)";
  } else {
    const hours = Math.floor(min / 60);
    if (hours < 24) {
      userStatusEl.textContent = `○ был(а) ${hours} ч. назад`;
    } else {
      userStatusEl.textContent = "○ давно не в сети";
    }
    userStatusEl.style.color = "var(--text-dim)";
  }
}

// Обновляем статус каждые 30 сек
setInterval(() => {
  if (targetUser) updateStatus(targetUser.lastSeen);
}, 30000);

// Кнопка "Написать"
writeBtn.addEventListener("click", () => {
  if (!targetUid) return;
  // Возвращаемся в чат и открываем диалог
  window.location.href = "chat.html?open=" + targetUid;
});