const CACHE_NAME = 'calc-rpg-v25';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './assets/bosses/boss_diamond.webp', './assets/bosses/boss_iron.webp', './assets/bosses/boss_leather.webp', './assets/bosses/boss_nether.webp', './assets/bosses/boss_stone.webp', './assets/enemies/enemy_bat.webp', './assets/enemies/enemy_goblin.webp', './assets/enemies/enemy_mushroom.webp', './assets/enemies/enemy_slime.webp', './assets/enemies/enemy_wolf.webp', './assets/equipment/eq_diamond_body.png', './assets/equipment/eq_diamond_feet.png', './assets/equipment/eq_diamond_head.png', './assets/equipment/eq_diamond_legs.png', './assets/equipment/eq_diamond_weapon.png', './assets/equipment/eq_iron_body.png', './assets/equipment/eq_iron_feet.png', './assets/equipment/eq_iron_head.png', './assets/equipment/eq_iron_legs.png', './assets/equipment/eq_iron_weapon.png', './assets/equipment/eq_leather_body.png', './assets/equipment/eq_leather_feet.png', './assets/equipment/eq_leather_head.png', './assets/equipment/eq_leather_legs.png', './assets/equipment/eq_leather_weapon.png', './assets/equipment/eq_nether_body.png', './assets/equipment/eq_nether_feet.png', './assets/equipment/eq_nether_head.png', './assets/equipment/eq_nether_legs.png', './assets/equipment/eq_nether_weapon.png', './assets/equipment/eq_stone_body.png', './assets/equipment/eq_stone_feet.png', './assets/equipment/eq_stone_head.png', './assets/equipment/eq_stone_legs.png', './assets/equipment/eq_stone_weapon.png', './assets/sounds/confirm.mp3', './assets/sounds/digit.mp3', './assets/ui/battle-bg-clean.webp', './assets/ui/hero-battle.webp', './assets/ui/hero-home.webp', './assets/ui/hero-scene.webp', './assets/ui/result-backdrop.webp', './assets/ui/title-logo.webp', './assets/ui/top-hero-bg.webp'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
