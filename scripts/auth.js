// scripts/auth.js — Два способа входа: по ссылке и по паролю

const subtitle   = document.getElementById("subtitle");
const statusMsg  = document.getElementById("statusMsg");

// Вкладка «По ссылке»
const emailInput  = document.getElementById("email");
const sendLinkBtn = document.getElementById("sendLinkBtn");

// Вкладка «С паролем»
const emailPwdInput = document.getElementById("emailPwd");
const passwordInput = document.getElementById("password");
const loginBtn      = document.getElementById("loginBtn");
const registerBtn   = document.getElementById("registerBtn");

// URL для ссылки-приглашения (автоматически под текущий домен)
const actionCodeSettings = {
  url: window.location.origin + window.location.pathname,
  handleCodeInApp: true
};

// ============ ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ============
const tabs = document.querySelectorAll(".auth-tab");
const tabContents = document.querySelectorAll(".auth-tab-content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.toggle("active", t === tab));
    tabContents.forEach(c => c.classList.toggle("active", c.dataset.tab === target));
    statusMsg.textContent = "";
  });
});

// ============ ПОКАЗ ОШИБОК ============
function showError(err) {
  console.error(err);
  const messages = {
    "auth/email-already-in-use": "Этот email уже занят",
    "auth/invalid-email": "Некорректный email",
    "auth/weak-password": "Пароль должен быть минимум 6 символов",
    "auth/user-not-found": "Пользователь не найден",
    "auth/wrong-password": "Неверный пароль",
    "auth/invalid-credential": "Неверный email или пароль",
    "auth/network-request-failed": "Проверь интернет",
    "auth/too-many-requests": "Слишком много попыток. Подожди немного.",
    "auth/quota-exceeded": "Дневной лимит писем исчерпан. Попробуй завтра или войди по паролю."
  };
  statusMsg.style.color = "#f87171";
  statusMsg.textContent = messages[err.code] || "Ошибка: " + err.message;
}

function showSuccess(text) {
  statusMsg.style.color = "#4ade80";
  statusMsg.textContent = text;
}

// ============ ВКЛАДКА 1: ВХОД ПО ССЫЛКЕ ============
sendLinkBtn.addEventListener("click", () => {
  const email = emailInput.value.trim();

  if (!email || !email.includes("@")) {
    statusMsg.style.color = "#f87171";
    statusMsg.textContent = "Введи корректный email";
    return;
  }

  statusMsg.style.color = "rgba(255,255,255,0.6)";
  statusMsg.textContent = "Отправляем письмо...";

  auth.sendSignInLinkToEmail(email, actionCodeSettings)
    .then(() => {
      window.localStorage.setItem("emailForSignIn", email);
      showSuccess("✅ Письмо отправлено! Проверь почту.");
      emailInput.value = "";
    })
    .catch(showError);
});

emailInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendLinkBtn.click();
});

// ============ ВКЛАДКА 2: ВХОД ПО ПАРОЛЮ ============
loginBtn.addEventListener("click", () => {
  const email = emailPwdInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    statusMsg.style.color = "#f87171";
    statusMsg.textContent = "Заполни email и пароль";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "chat.html";
    })
    .catch(showError);
});

registerBtn.addEventListener("click", () => {
  const email = emailPwdInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    statusMsg.style.color = "#f87171";
    statusMsg.textContent = "Заполни email и пароль";
    return;
  }
  if (password.length < 6) {
    statusMsg.style.color = "#f87171";
    statusMsg.textContent = "Пароль — минимум 6 символов";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "chat.html";
    })
    .catch(showError);
});

emailPwdInput.addEventListener("keydown", e => {
  if (e.key === "Enter") passwordInput.focus();
});
passwordInput.addEventListener("keydown", e => {
  if (e.key === "Enter") loginBtn.click();
});

// ============ ЗАВЕРШЕНИЕ ВХОДА ПО ССЫЛКЕ ============
if (auth.isSignInWithEmailLink(window.location.href)) {
  let email = window.localStorage.getItem("emailForSignIn");

  if (!email) {
    email = window.prompt("Подтверди свой email:");
  }

  if (email) {
    auth.signInWithEmailLink(email, window.location.href)
      .then(() => {
        window.localStorage.removeItem("emailForSignIn");
        window.location.href = "chat.html";
      })
      .catch(showError);
  }
}

// ============ ЕСЛИ УЖЕ ВОШЁЛ — В ЧАТ ============
auth.onAuthStateChanged(user => {
  if (user && !auth.isSignInWithEmailLink(window.location.href)) {
    window.location.href = "chat.html";
  }
});
