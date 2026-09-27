// 주변(Jubyeon) 서비스워커 - PWA 설치 요건(설치 가능성 체크)을 만족시키기 위한 최소 구현.
// 네트워크 우선 + 실패 시 캐시 폴백만 한다 - Supabase API(다른 origin)는 캐시하지 않는다.
const CACHE_NAME = "jubyeon-cache-v1";
const PRECACHE_URLS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const res_clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res_clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
