const CACHE_NAME = 'calc-rpg-v31';
const ASSETS = ["./","./index.html","./manifest.webmanifest","./ui.css","./game.js","./ui.js","./memory.css","./memory-data.js","./memory-core.js","./memory-ui.js","./icon-180.png","./icon-192.png","./icon-512.png","./battle-forest.webp","./battle-meadow.webp","./hero-battle.webp","./hero-celebrate.webp","./hero-home.webp","./hero-rest.webp","./boss_diamond.webp","./boss_iron.webp","./boss_leather.webp","./boss_nether.webp","./boss_stone.webp","./enemy_bat.webp","./enemy_goblin.webp","./enemy_mushroom.webp","./enemy_slime.webp","./enemy_wolf.webp","./eq_diamond_body.png","./eq_diamond_feet.png","./eq_diamond_head.png","./eq_diamond_legs.png","./eq_diamond_weapon.png","./eq_iron_body.png","./eq_iron_feet.png","./eq_iron_head.png","./eq_iron_legs.png","./eq_iron_weapon.png","./eq_leather_body.png","./eq_leather_feet.png","./eq_leather_head.png","./eq_leather_legs.png","./eq_leather_weapon.png","./eq_nether_body.png","./eq_nether_feet.png","./eq_nether_head.png","./eq_nether_legs.png","./eq_nether_weapon.png","./eq_stone_body.png","./eq_stone_feet.png","./eq_stone_head.png","./eq_stone_legs.png","./eq_stone_weapon.png","./confirm.mp3","./digit.mp3","./home.css","./map-scene.webp","./home-foliage.webp","./checkpoint-stone.webp","./hero-map.webp","./button-grain.svg","./title-rays.svg"];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache:'reload'})))).then(() => self.skipWaiting()));
});

const removeOldCaches = () => caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('calc-rpg-') && key !== CACHE_NAME).map(key => caches.delete(key))));
self.addEventListener('activate', event => {
  event.waitUntil(removeOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // An in-flight older-version request may recreate its old cache during activation.
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

