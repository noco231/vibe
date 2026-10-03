// scripts/theme.js — применяет тему на любой странице

(function applyTheme() {
  const theme = localStorage.getItem("theme") || "dark";

  if (theme === "light") {
    // Если body уже есть — сразу применяем
    if (document.body) {
      document.body.classList.add("light");
    } else {
      // Иначе ждём, пока body появится
      document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add("light");
      });
    }
  }
})();