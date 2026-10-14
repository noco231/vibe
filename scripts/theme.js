// scripts/theme.js — применяет тему из localStorage
(function applyTheme() {
  const theme = localStorage.getItem("theme") || "blue";
  document.documentElement.dataset.theme = theme;
})();