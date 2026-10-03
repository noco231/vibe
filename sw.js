// sw.js — service worker My Messenger

const CACHE_NAME = "messenger-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./chat.html",
  "./profile.html",
  "./settings.html",
  "./about.html",
  "./style/auth.css",
  "./style/chat.css",
  "./style/pages.css",
  "./scripts/firebase-config.js",
  "./scripts/auth.js",
  "./scripts/chat.js",
  "./scripts/nav.js",
  "./scripts/profile.js",
  "./scripts/settings.js",
  "./scripts/about.js",
  "./scripts/theme.js"
];

// Установка: кэшируем файлы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Кэшируем файлы");
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn("Часть файлов не закэшировалась:", err);
      });
    })
  );
  self.skipWaiting();
});

// Активация: удаляем старые кэши
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов: сначала сеть, потом кэш
self.addEventListener("fetch", (event) => {
  // Не кэшируем запросы к Firebase
  if (event.request.url.includes("firebase") ||
      event.request.url.includes("googleapis")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Обновляем кэш свежей копией
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone).catch(() => {});
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});