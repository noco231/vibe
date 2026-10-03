// scripts/profile.js — профиль с base64-аватаркой (без Storage)

auth.onAuthStateChanged(user => {
  if (!user) return;
  initProfile(user);
});

function initProfile(user) {
  document.getElementById("emailDisplay").value = user.email;

  db.ref("users/" + user.uid).once("value").then(snap => {
    const data = snap.val() || {};

    document.getElementById("nickInput").value = data.nick || "";

    const preview = document.getElementById("avatarPreview");
    if (data.avatarBase64) {
      preview.style.backgroundImage = `url(${data.avatarBase64})`;
      preview.textContent = "";
    } else {
      preview.style.backgroundImage = "";
      preview.textContent = (data.nick || user.email || "?")[0].toUpperCase();
    }
  });

  renderPasswordBlock(user);
}

// ============ НИК ============
document.getElementById("saveNickBtn").addEventListener("click", () => {
  const nick = document.getElementById("nickInput").value.trim();
  const status = document.getElementById("nickStatus");

  if (!nick) {
    status.style.color = "#f87171";
    status.textContent = "Ник не может быть пустым";
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  db.ref("users/" + user.uid + "/nick").set(nick)
    .then(() => {
      status.style.color = "#4ade80";
      status.textContent = "✅ Сохранено";
      setTimeout(() => (status.textContent = ""), 1500);
    })
    .catch(err => {
      status.style.color = "#f87171";
      status.textContent = "Ошибка: " + err.message;
    });
});

// ============ АВАТАРКА (base64) ============
const avatarInput = document.getElementById("avatarInput");
document.getElementById("changeAvatarBtn").addEventListener("click", () => {
  avatarInput.click();
});

avatarInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  if (!file.type.startsWith("image/")) {
    alert("Выбери файл-изображение");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert("Файл больше 8 МБ. Выбери меньше.");
    return;
  }

  const status = document.getElementById("nickStatus");
  status.style.color = "rgba(255,255,255,0.6)";
  status.textContent = "Обрабатываем фото...";

  try {
    const base64 = await resizeImageToBase64(file, 200, 0.7);

    if (base64.length > 150000) {
      status.style.color = "#f87171";
      status.textContent = "Фото слишком большое. Выбери другое.";
      return;
    }

    await db.ref("users/" + user.uid + "/avatarBase64").set(base64);

    const preview = document.getElementById("avatarPreview");
    preview.style.backgroundImage = `url(${base64})`;
    preview.textContent = "";

    status.style.color = "#4ade80";
    status.textContent = "✅ Аватарка обновлена";
    setTimeout(() => (status.textContent = ""), 1500);
  } catch (err) {
    console.error(err);
    status.style.color = "#f87171";
    status.textContent = "Ошибка: " + err.message;
  }
});

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

        const base64 = canvas.toDataURL("image/jpeg", quality);
        resolve(base64);
      };
      img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

// ============ ПАРОЛЬ ============
function renderPasswordBlock(user) {
  const block = document.getElementById("passwordBlock");
  const hasPassword = user.providerData.some(p => p.providerId === "password");

  if (hasPassword) {
    block.innerHTML = `
      <div class="form-row">
        <input type="password" id="currentPassword" placeholder="Текущий пароль">
        <input type="password" id="newPassword" placeholder="Новый пароль">
      </div>
      <button class="btn primary" id="changePasswordBtn" style="margin-top:10px;">Сменить пароль</button>
      <div class="form-hint" id="passwordStatus"></div>
    `;
    document.getElementById("changePasswordBtn")
      .addEventListener("click", () => changePasswordWithOld(user));
  } else {
    block.innerHTML = `
      <input type="password" id="newPassword" placeholder="Придумай пароль (мин. 6 символов)">
      <button class="btn primary" id="setPasswordBtn" style="margin-top:10px;">Установить пароль</button>
      <div class="form-hint" id="passwordStatus"></div>
    `;
    document.getElementById("setPasswordBtn")
      .addEventListener("click", () => setNewPassword(user));
  }
}

async function changePasswordWithOld(user) {
  const current = document.getElementById("currentPassword").value;
  const newPass = document.getElementById("newPassword").value;
  const status = document.getElementById("passwordStatus");

  if (!current || !newPass) {
    status.style.color = "#f87171";
    status.textContent = "Заполни оба поля";
    return;
  }
  if (newPass.length < 6) {
    status.style.color = "#f87171";
    status.textContent = "Новый пароль — минимум 6 символов";
    return;
  }

  status.style.color = "rgba(255,255,255,0.6)";
  status.textContent = "Меняем пароль...";

  try {
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, current);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(newPass);

    status.style.color = "#4ade80";
    status.textContent = "✅ Пароль изменён";
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
  } catch (err) {
    console.error(err);
    status.style.color = "#f87171";
    status.textContent = "Ошибка: " + err.message;
  }
}

async function setNewPassword(user) {
  const newPass = document.getElementById("newPassword").value;
  const status = document.getElementById("passwordStatus");

  if (newPass.length < 6) {
    status.style.color = "#f87171";
    status.textContent = "Пароль — минимум 6 символов";
    return;
  }

  status.style.color = "rgba(255,255,255,0.6)";
  status.textContent = "Устанавливаем пароль...";

  try {
    await user.updatePassword(newPass);
    status.style.color = "#4ade80";
    status.textContent = "✅ Пароль установлен";
    document.getElementById("newPassword").value = "";
    setTimeout(() => renderPasswordBlock(user), 1000);
  } catch (err) {
    console.error(err);
    status.style.color = "#f87171";
    status.textContent = "Ошибка: " + err.message;
  }
}