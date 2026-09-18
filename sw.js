const CACHE_NAME = 'calc-rpg-v28';
const ASSETS = ["./memory.css", "./memory-data.js", "./memory-core.js", "./memory-ui.js", "./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./assets/bosses/boss_diamond.webp", "./assets/bosses/boss_iron.webp", "./assets/bosses/boss_leather.webp", "./assets/bosses/boss_nether.webp", "./assets/bosses/boss_stone.webp", "./assets/enemies/enemy_bat.webp", "./assets/enemies/enemy_goblin.webp", "./assets/enemies/enemy_mushroom.webp", "./assets/enemies/enemy_slime.webp", "./assets/enemies/enemy_wolf.webp", "./assets/equipment/eq_diamond_body.png", "./assets/equipment/eq_diamond_feet.png", "./assets/equipment/eq_diamond_head.png", "./assets/equipment/eq_diamond_legs.png", "./assets/equipment/eq_diamond_weapon.png", "./assets/equipment/eq_iron_body.png", "./assets/equipment/eq_iron_feet.png", "./assets/equipment/eq_iron_head.png", "./assets/equipment/eq_iron_legs.png", "./assets/equipment/eq_iron_weapon.png", "./assets/equipment/eq_leather_body.png", "./assets/equipment/eq_leather_feet.png", "./assets/equipment/eq_leather_head.png", "./assets/equipment/eq_leather_legs.png", "./assets/equipment/eq_leather_weapon.png", "./assets/equipment/eq_nether_body.png", "./assets/equipment/eq_nether_feet.png", "./assets/equipment/eq_nether_head.png", "./assets/equipment/eq_nether_legs.png", "./assets/equipment/eq_nether_weapon.png", "./assets/equipment/eq_stone_body.png", "./assets/equipment/eq_stone_feet.png", "./assets/equipment/eq_stone_head.png", "./assets/equipment/eq_stone_legs.png", "./assets/equipment/eq_stone_weapon.png", "./assets/sounds/confirm.mp3", "./assets/sounds/digit.mp3", "./assets/ui/battle-bg-clean.webp", "./assets/ui/hero-battle.webp", "./assets/ui/hero-home.webp", "./assets/ui/hero-scene.webp", "./assets/ui/hit-impact.webp", "./assets/ui/result-backdrop.webp", "./assets/ui/title-logo.webp", "./assets/ui/top-hero-bg.webp"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache:'reload'})))).then(() => self.skipWaiting()));
});

const removeOldCaches = () => caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('calc-rpg-') && key !== CACHE_NAME).map(key => caches.delete(key))));
self.addEventListener('activate', event => {
  event.waitUntil(removeOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // An in-flight v27 request may recreate its old cache during activation.
  // Always read this version's cache; never let an old HTML response win.
  if (event.request.mode === 'navigate') event.waitUntil(removeOldCaches());
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        event.waitUntil(cache.put(event.request, response.clone()));
      }
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      return Response.error();
    }
  }));
});

