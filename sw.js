// sw.js — service worker My Messenger + OneSignal
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "messenger-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./chat.html",
  "./profile.html",
  "./settings.html",
  "./about.html",
  "./group.html",
  "./user.html",
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
  "./scripts/group.js",
  "./scripts/user.js",
  "./scripts/theme.js"
];

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

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.includes("firebase") ||
      url.includes("googleapis") ||
      url.includes("onesignal.com")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone).catch(() => {});
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});