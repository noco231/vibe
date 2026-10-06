// scripts/settings.js — переключение тем
const themeItems = document.querySelectorAll(".theme-item");
const currentTheme = localStorage.getItem("theme") || "blue";

document.documentElement.dataset.theme = currentTheme;

themeItems.forEach(item => {
  if (item.dataset.theme === currentTheme) {
    item.classList.add("active");
  }
  item.addEventListener("click", () => {
    const t = item.dataset.theme;
    localStorage.setItem("theme", t);
    document.documentElement.dataset.theme = t;
    themeItems.forEach(i => i.classList.toggle("active", i === item));
  });
});