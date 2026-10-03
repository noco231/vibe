// scripts/nav.js — общее для всех страниц (кроме index.html)

// Проверка авторизации + сохранение профиля
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  window.__user = user;

  // Сохраняем email всегда (не только на chat.html)
  db.ref("users/" + user.uid).update({
    email: user.email,
    lastSeen: Date.now()
  });

  // Заполняем шапку drawer (если он есть)
  const dEmail = document.getElementById("drawerEmail");
  const dAvatar = document.getElementById("drawerAvatar");

  db.ref("users/" + user.uid).once("value").then(snap => {
    const data = snap.val() || {};
    const display = data.nick || user.email;

    if (dEmail) dEmail.textContent = display;
    if (dAvatar) {
      if (data.avatarBase64) {
        dAvatar.style.backgroundImage = `url(${data.avatarBase64})`;
        dAvatar.textContent = "";
      } else {
        dAvatar.style.backgroundImage = "";
        dAvatar.textContent = (display || "?")[0].toUpperCase();
      }
    }
  });
});

// Drawer: открытие/закрытие
const drawerEl = document.getElementById("drawer");
const drawerOverlayEl = document.getElementById("drawerOverlay");
const menuBtnEl = document.getElementById("menuBtn");

function openDrawer() {
  if (drawerEl) drawerEl.classList.add("open");
  if (drawerOverlayEl) drawerOverlayEl.classList.add("open");
}
function closeDrawer() {
  if (drawerEl) drawerEl.classList.remove("open");
  if (drawerOverlayEl) drawerOverlayEl.classList.remove("open");
}
if (menuBtnEl) menuBtnEl.addEventListener("click", openDrawer);
if (drawerOverlayEl) drawerOverlayEl.addEventListener("click", closeDrawer);

// Выход
const logoutBtnEl = document.getElementById("drawerLogout");
if (logoutBtnEl) {
  logoutBtnEl.addEventListener("click", () => {
    const u = window.__user;
    if (u) {
      db.ref("users/" + u.uid).update({ lastSeen: Date.now() });
    }
    auth.signOut();
  });
}