window.__bootOverlay?.setStatus("Инициализация рендера...");
const canvas = document.getElementById("game");
const ctx = canvas?.getContext("2d");
console.log("game.js start", { hasCanvas: !!canvas, hasCtx: !!ctx });
if (!canvas || !ctx) {
  throw new Error("Canvas 2D context could not be created.");
}
ctx.imageSmoothingEnabled = false;

const lightingCanvas = document.createElement("canvas");
lightingCanvas.width = canvas.width;
lightingCanvas.height = canvas.height;
const lightingCtx = lightingCanvas.getContext("2d");
lightingCtx.imageSmoothingEnabled = false;
const desktopApi = window.desktopBridge ?? null;

const TILE_SIZE = 16;
const WORLD_WIDTH = 320;
const WORLD_HEIGHT = 160;
const WORLD_PIXEL_WIDTH = WORLD_WIDTH * TILE_SIZE;
const WORLD_PIXEL_HEIGHT = WORLD_HEIGHT * TILE_SIZE;
const INTERACT_RANGE = TILE_SIZE * 6;
const DAY_LENGTH = 210;
const GRAVITY = 980;
const DESKTOP_RENDER_MAX_WIDTH = 1600;
const DESKTOP_RENDER_MAX_HEIGHT = 900;
const LIGHTING_RESOLUTION_SCALE = 1;
const DARKNESS_START_DEPTH = 5;
const UNDERGROUND_LIGHTING_DEPTH = 18;
const SHADOWFLAME_TICK_DAMAGE = 5;
const SHADOWFLAME_TICK_COUNT = 6;
const SHADOWFLAME_TICK_INTERVAL = 0.5;
const SHADOWFLAME_PARTICLE_INTERVAL = 0.08;
const FIRE_TICK_DAMAGE = 10;
const FIRE_TICK_COUNT = 6;
const FIRE_TICK_INTERVAL = 0.5;
const FLOWER_VARIANT_COUNT = 10;
const FLOWER_MINE_TIME = 0.12;
const LAVA_DAMAGE_INTERVAL = 0.18;
const LAVA_FLOW_STEP = 0.08;

const Tile = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  TREE: 6,
  TREE_TRUNK: 7,
  TORCH: 8,
  COPPER_ORE: 9,
  IRON_ORE: 10,
  CRYSTAL_ORE: 11,
  FURNACE_TL: 12,
  FURNACE_TR: 13,
  FURNACE_BL: 14,
  FURNACE_BR: 15,
  CLOUD: 16,
  DOOR_CLOSED_BOTTOM: 17,
  DOOR_CLOSED_TOP: 18,
  DOOR_OPEN_BOTTOM: 19,
  DOOR_OPEN_TOP: 20,
  PLATFORM: 21,
  LAVA: 22,
};

const Wall = {
  NONE: 0,
  WOOD: 1,
  GRASS: 2,
};

const TILE_DEFS = {
  [Tile.AIR]: { id: "air", name: "Air", solid: false, item: null, mineTime: 0, asset: null, light: 0 },
  [Tile.GRASS]: { id: "grass", name: "Grass", solid: true, item: "dirt", mineTime: 0.4, asset: "tile-grass", light: 0 },
  [Tile.DIRT]: { id: "dirt", name: "Dirt", solid: true, item: "dirt", mineTime: 0.55, asset: "tile-dirt", light: 0 },
  [Tile.STONE]: { id: "stone", name: "Stone", solid: true, item: "stone", mineTime: 0.9, asset: "tile-stone", light: 0 },
  [Tile.WOOD]: { id: "wood", name: "Wood", solid: true, item: "wood", mineTime: 0.65, asset: "tile-wood", light: 0 },
  [Tile.LEAVES]: { id: "leaves", name: "Leaves", solid: false, item: "leaves", mineTime: 0.25, asset: "tile-leaves", light: 0 },
  [Tile.TREE]: { id: "tree", name: "Tree", solid: false, item: "wood", mineTime: 0.32, asset: "tile-tree", light: 0 },
  [Tile.TREE_TRUNK]: { id: "treeTrunk", name: "Tree Trunk", solid: false, item: "wood", mineTime: 0.32, asset: "tile-tree-trunk", light: 0 },
  [Tile.TORCH]: { id: "torch", name: "Torch", solid: false, item: "torch", mineTime: 0.1, asset: "tile-torch", light: 150 },
  [Tile.COPPER_ORE]: { id: "copperOreTile", name: "Copper Ore", solid: true, item: "copperOre", mineTime: 1.05, asset: "tile-copper-ore", light: 0 },
  [Tile.IRON_ORE]: { id: "ironOreTile", name: "Iron Ore", solid: true, item: "ironOre", mineTime: 1.2, asset: "tile-iron-ore", light: 0 },
  [Tile.CRYSTAL_ORE]: { id: "crystalOreTile", name: "Crystal Ore", solid: true, item: "crystalOre", mineTime: 1.4, asset: "tile-crystal-ore", light: 18 },
  [Tile.FURNACE_TL]: { id: "furnaceTl", name: "Furnace", solid: false, item: null, mineTime: 0.8, asset: "tile-furnace-tl", light: 26 },
  [Tile.FURNACE_TR]: { id: "furnaceTr", name: "Furnace", solid: false, item: null, mineTime: 0.8, asset: "tile-furnace-tr", light: 34 },
  [Tile.FURNACE_BL]: { id: "furnaceBl", name: "Furnace", solid: false, item: null, mineTime: 0.8, asset: "tile-furnace-bl", light: 72 },
  [Tile.FURNACE_BR]: { id: "furnaceBr", name: "Furnace", solid: false, item: null, mineTime: 0.8, asset: "tile-furnace-br", light: 84 },
  [Tile.CLOUD]: { id: "cloud", name: "Cloud", solid: true, item: null, mineTime: 0.18, asset: null, light: 0 },
  [Tile.DOOR_CLOSED_BOTTOM]: { id: "doorClosedBottom", name: "Wood Door", solid: true, item: "wood", mineTime: 0.28, asset: null, light: 0 },
  [Tile.DOOR_CLOSED_TOP]: { id: "doorClosedTop", name: "Wood Door", solid: true, item: null, mineTime: 0.28, asset: null, light: 0 },
  [Tile.DOOR_OPEN_BOTTOM]: { id: "doorOpenBottom", name: "Open Wood Door", solid: false, item: "wood", mineTime: 0.28, asset: null, light: 0 },
  [Tile.DOOR_OPEN_TOP]: { id: "doorOpenTop", name: "Open Wood Door", solid: false, item: null, mineTime: 0.28, asset: null, light: 0 },
  [Tile.PLATFORM]: { id: "platform", name: "Wood Platform", solid: false, platform: true, item: "woodPlatform", mineTime: 0.18, asset: "tile-platform", light: 0 },
  [Tile.LAVA]: { id: "lava", name: "Lava", solid: false, item: null, mineTime: 999, asset: null, light: 110 },
};

const ITEM_DEFS = {
  sword: { id: "sword", name: "Bronze Sword", kind: "melee", slot: 10, damage: 7, tint: "#f3c367", asset: "item-sword" },
  retinaBlade: { id: "retinaBlade", name: "Retina Blade", kind: "melee", slot: 11, damage: 12, tint: "#ef6b75", asset: "item-retina-blade" },
  wardenCleaver: { id: "wardenCleaver", name: "Warden Cleaver", kind: "melee", slot: 12, damage: 33, tint: "#d6c295", asset: "item-warden-cleaver" },
  pickaxe: { id: "pickaxe", name: "Copper Pickaxe", kind: "tool", slot: 20, power: 1.35, tint: "#e59b56", asset: "item-pickaxe" },
  ironPickaxe: { id: "ironPickaxe", name: "Iron Pickaxe", kind: "tool", slot: 21, power: 1.72, tint: "#cfd7e0", asset: "item-iron-pickaxe" },
  crystalPickaxe: { id: "crystalPickaxe", name: "Crystal Pickaxe", kind: "tool", slot: 22, power: 2.08, tint: "#98efff", asset: "item-crystal-pickaxe" },
  ironSword: { id: "ironSword", name: "Iron Sword", kind: "melee", slot: 13, damage: 21, tint: "#dbe2ea", asset: "item-iron-sword" },
  crystalSword: { id: "crystalSword", name: "Crystal Sword", kind: "melee", slot: 14, damage: 50, tint: "#9aefff", asset: "item-crystal-sword" },
  bow: { id: "bow", name: "Hunter Bow", kind: "ranged", slot: 30, damage: 20, cooldown: 0.34, speed: 470, spread: 0.02, projectile: "arrow", auto: false, asset: "item-bow" },
  gun: { id: "gun", name: "Minigun", kind: "ranged", slot: 31, damage: 7, cooldown: 4 / 60, speed: 860, spread: 0.045, projectile: "bullet", auto: true, asset: "item-minigun" },
  sandCarbine: { id: "sandCarbine", name: "Sand Carbine", kind: "ranged", slot: 32, damage: 15, cooldown: 30 / 60, speed: 760, spread: 0.03, projectile: "bullet", auto: true, asset: "item-sand-carbine", projectileColor: "#eed08c", projectileTrail: "rgba(239, 208, 139, 0.4)" },
  prismLaser: { id: "prismLaser", name: "Prism Laser", kind: "ranged", slot: 33, damage: 7, cooldown: 0.28, speed: 980, spread: 0.012, projectile: "laser", auto: true, asset: "item-prism-laser", projectileColor: "#8feeff", projectileTrail: "rgba(149, 240, 255, 0.48)", projectileLightRadius: 24 },
  titanBlaster: { id: "titanBlaster", name: "Titan Blaster", kind: "ranged", slot: 34, damage: 35, cooldown: 0.48, speed: 340, spread: 0.012, projectile: "ember-orb", auto: true, asset: "item-titan-blaster", projectileColor: "#ffbb74", projectileTrail: "rgba(255, 179, 103, 0.42)", projectileLightRadius: 38 },
  tempestScattergun: { id: "tempestScattergun", name: "Tempest Scattergun", kind: "ranged", slot: 35, damage: 20, cooldown: 0.72, speed: 710, spread: 0.02, projectile: "bullet", auto: false, asset: "item-tempest-scattergun", projectileColor: "#d9eeff", projectileTrail: "rgba(198, 231, 255, 0.42)", pelletCount: 6, pelletSpread: 0.24, randomPelletSpread: true, projectileKnockbackX: 70, projectileKnockbackY: -18, impactForce: 52 },
  cryptBell: { id: "cryptBell", name: "Crypt Bell", kind: "ranged", slot: 36, damage: 28, cooldown: 0.62, speed: 420, spread: 0, projectile: "grave-skull", auto: false, asset: "item-crypt-bell", projectileColor: "#bba2ff", projectileTrail: "rgba(184, 160, 255, 0.38)", projectileRadius: 7, projectileKnockbackX: 132, projectileKnockbackY: -82, projectileTrailInterval: 0.05, projectileLightRadius: 28, impactParticles: 8, impactForce: 60, minProjectileCount: 2, maxProjectileCount: 3, pelletSpread: 0.17453292519943295, hitEffect: "shadowflame", hitEffectDamage: SHADOWFLAME_TICK_DAMAGE, hitEffectTicks: SHADOWFLAME_TICK_COUNT, hitEffectInterval: SHADOWFLAME_TICK_INTERVAL },
  voidRelic: { id: "voidRelic", name: "Void Relic", kind: "ranged", slot: 37, damage: 24, cooldown: 0.42, speed: 480, spread: 0.02, projectile: "void-orb", auto: true, asset: "item-void-relic", projectileColor: "#d48aff", projectileTrail: "rgba(198, 124, 255, 0.42)", projectileRadius: 7, projectileKnockbackX: 124, projectileKnockbackY: -98, projectileTrailInterval: 0.045, projectileLightRadius: 34, impactParticles: 9, impactForce: 64 },
  cloudfang: { id: "cloudfang", name: "Cloudfang", kind: "melee", slot: 15, damage: 10, tint: "#f2fbff", impulseDamage: 15, asset: "item-cloudfang" },
  gustBow: { id: "gustBow", name: "Gust Bow", kind: "ranged", slot: 38, damage: 3, cooldown: 0.34, speed: 360, spread: 0.04, projectile: "cloud-arrow", auto: false, projectileColor: "#e7f8ff", projectileTrail: "rgba(208, 242, 255, 0.4)", projectileLightRadius: 18, projectileGravity: 260, projectileRadius: 5, projectileTrailInterval: 0.05, projectileKnockbackX: 42, projectileKnockbackY: -82, burstTicks: 6, burstInterval: 0.08, portalMinCount: 2, portalMaxCount: 3, portalSpread: 84, portalHeightMin: 72, portalHeightMax: 114, asset: "item-gust-bow" },
  sunshard: { id: "sunshard", name: "Sunshard", kind: "ranged", slot: 39, damage: 13, cooldown: 0.46, speed: 520, spread: 0.018, projectile: "sunshard-core", auto: false, projectileColor: "#fff1a1", projectileTrail: "rgba(255, 236, 148, 0.42)", projectileLightRadius: 22, shardDamage: 5, shardCount: 8, lifetime: 1, asset: "item-sunshard" },
  ashfallMortar: { id: "ashfallMortar", name: "Ashfall Mortar", kind: "ranged", slot: 40, damage: 9, cooldown: 4 / 60, speed: 300, spread: 0.02, projectile: "flame", auto: true, asset: "item-ashfall-mortar", projectileColor: "#ff8d5b", projectileTrail: "rgba(255, 128, 90, 0.42)", projectileRadius: 25, projectileSpawnRadius: 0.5, projectileGrowTicks: 30, projectileGravity: 120, projectileLift: 32, projectileKnockbackX: 136, projectileKnockbackY: -110, projectileLightRadius: 25, impactParticles: 12, impactForce: 84, lifetime: 50 / 60, hitEffect: "fire", hitEffectDamage: FIRE_TICK_DAMAGE, hitEffectTicks: FIRE_TICK_COUNT, hitEffectInterval: FIRE_TICK_INTERVAL },
  stormspine: { id: "stormspine", name: "Stormspine", kind: "ranged", slot: 41, damage: 25, cooldown: 0.15, speed: 860, spread: 0.055, projectile: "bullet", auto: true, asset: "item-stormspine", projectileColor: "#bff7ff", projectileTrail: "rgba(175, 242, 255, 0.46)", pelletCount: 2, pelletSpread: 0.08, projectileKnockbackX: 64, projectileKnockbackY: -24, impactForce: 54 },
  moonveil: { id: "moonveil", name: "Moonveil", kind: "melee", slot: 16, damage: 28, tint: "#deecff", impulseDamage: 38, asset: "item-moonveil" },
  sepulcherChain: { id: "sepulcherChain", name: "Sepulcher Chain", kind: "ranged", slot: 42, damage: 34, cooldown: 0.74, speed: 395, spread: 0, projectile: "grave-skull", auto: false, asset: "item-sepulcher-chain", projectileColor: "#d6c3a4", projectileTrail: "rgba(214, 196, 165, 0.4)", projectileRadius: 8, projectileKnockbackX: 144, projectileKnockbackY: -88, projectileTrailInterval: 0.05, projectileLightRadius: 24, impactParticles: 10, impactForce: 68, minProjectileCount: 1, maxProjectileCount: 1, hitEffect: "shadowflame", hitEffectDamage: 4, hitEffectTicks: 4, hitEffectInterval: SHADOWFLAME_TICK_INTERVAL, orbitCount: 7, orbitRadius: 16 * 7, orbitSpeed: 4.6, orbitLifetime: 3.2 },
  voidThorn: { id: "voidThorn", name: "Void Thorn", kind: "ranged", slot: 43, damage: 9, cooldown: 0.34, speed: 560, spread: 0.05, projectile: "shadow-dagger", auto: true, asset: "item-void-thorn", projectileColor: "#c171ff", projectileTrail: "rgba(194, 110, 255, 0.45)", projectileRadius: 6, projectileKnockbackX: 112, projectileKnockbackY: -92, projectileTrailInterval: 0.04, projectileLightRadius: 30, impactParticles: 8, impactForce: 58, minProjectileCount: 2, maxProjectileCount: 3, pelletSpread: 0.2, projectilePierceCount: 3, projectileSpinSpeed: 12, projectileHomingStrength: 1400, projectileHomingRange: 220 },
  aeroRig: { id: "aeroRig", name: "Aero Rig", kind: "accessory", slot: 90, asset: "item-aero-rig" },
  skyWings: { id: "skyWings", name: "Sky Wings", kind: "accessory", slot: 91, asset: "item-sky-wings", flightTime: 1.9, flightLift: 1500, maxRiseSpeed: 175 },
  seraphWings: { id: "seraphWings", name: "Seraph Wings", kind: "accessory", slot: 92, asset: "item-seraph-wings", flightTime: Infinity, flightLift: 1580, maxRiseSpeed: 188 },
  watcherLens: { id: "watcherLens", name: "Watcher Lens", kind: "accessory", slot: 97, asset: "item-watcher-lens", maxHealthBonus: 8 },
  wardenPlate: { id: "wardenPlate", name: "Warden Plate", kind: "accessory", slot: 98, asset: "item-warden-plate", defenseBonus: 2, knockbackResist: 0.08 },
  djinnSash: { id: "djinnSash", name: "Djinn Sash", kind: "accessory", slot: 99, asset: "item-djinn-sash", moveSpeedBonus: 0.08, jumpBoost: 16 },
  prismHeart: { id: "prismHeart", name: "Prism Heart", kind: "accessory", slot: 100, asset: "item-prism-heart", maxHealthBonus: 12, passiveRegen: 0.35 },
  forgeCore: { id: "forgeCore", name: "Forge Core", kind: "accessory", slot: 101, asset: "item-forge-core", defenseBonus: 3, damageReduction: 0.06 },
  rocPlume: { id: "rocPlume", name: "Roc Plume", kind: "accessory", slot: 102, asset: "item-roc-plume", jumpBoost: 28, wingFuelBonus: 0.55, moveSpeedBonus: 0.04 },
  cinderSigil: { id: "cinderSigil", name: "Cinder Sigil", kind: "accessory", slot: 103, asset: "item-cinder-sigil", passiveRegen: 0.3, damageReduction: 0.03 },
  hydraLoop: { id: "hydraLoop", name: "Hydra Loop", kind: "accessory", slot: 104, asset: "item-hydra-loop", maxHealthBonus: 10, passiveRegen: 0.25 },
  moonMantle: { id: "moonMantle", name: "Moon Mantle", kind: "accessory", slot: 105, asset: "item-moon-mantle", moveSpeedBonus: 0.06, dashCooldownMultiplier: 0.82 },
  graveChain: { id: "graveChain", name: "Grave Chain", kind: "accessory", slot: 106, asset: "item-grave-chain", defenseBonus: 2, knockbackResist: 0.12 },
  abyssBloom: { id: "abyssBloom", name: "Abyss Bloom", kind: "accessory", slot: 107, asset: "item-abyss-bloom", passiveRegen: 0.35, moveSpeedBonus: 0.03 },
  matriarchEmblem: { id: "matriarchEmblem", name: "Matriarch Emblem", kind: "accessory", slot: 108, asset: "item-matriarch-emblem", defenseBonus: 1, maxHealthBonus: 6, passiveRegen: 0.15 },
  starDiadem: { id: "starDiadem", name: "Star Diadem", kind: "accessory", slot: 109, asset: "item-star-diadem", maxHealthBonus: 14, moveSpeedBonus: 0.05, wingFuelBonus: 0.75 },
  ironArmor: { id: "ironArmor", name: "Iron Armor", kind: "armor", slot: 93, defense: 8, asset: "item-iron-armor" },
  crystalArmor: { id: "crystalArmor", name: "Crystal Armor", kind: "armor", slot: 94, defense: 12, asset: "item-crystal-armor" },
  steelArmor: { id: "steelArmor", name: "Steel Armor", kind: "armor", slot: 95, defense: 5, asset: "item-steel-armor" },
  overseerCarapace: { id: "overseerCarapace", name: "Overseer Carapace", kind: "armor", slot: 96, defense: 6, asset: "sprite-overseer-eye", hurtHealMin: 1, hurtHealMax: 2 },
  copperOre: { id: "copperOre", name: "Copper Ore", kind: "material", slot: 70, asset: "item-copper-ore" },
  ironOre: { id: "ironOre", name: "Iron Ore", kind: "material", slot: 71, asset: "item-iron-ore" },
  crystalOre: { id: "crystalOre", name: "Crystal Ore", kind: "material", slot: 72, asset: "item-crystal-ore" },
  copperBar: { id: "copperBar", name: "Copper Bar", kind: "material", slot: 73, asset: "item-copper-bar" },
  ironBar: { id: "ironBar", name: "Iron Bar", kind: "material", slot: 74, asset: "item-iron-bar" },
  crystalBar: { id: "crystalBar", name: "Crystal Bar", kind: "material", slot: 75, asset: "item-crystal-bar" },
  dirt: { id: "dirt", name: "Dirt", kind: "block", slot: 40, tile: Tile.DIRT },
  stone: { id: "stone", name: "Stone", kind: "block", slot: 41, tile: Tile.STONE },
  wood: { id: "wood", name: "Wood", kind: "block", slot: 42, tile: Tile.WOOD },
  woodPlatform: { id: "woodPlatform", name: "Wood Platform", kind: "block", slot: 43, tile: Tile.PLATFORM },
  leaves: { id: "leaves", name: "Leaves", kind: "block", slot: 44, tile: Tile.LEAVES },
  torch: { id: "torch", name: "Torch", kind: "block", slot: 45, tile: Tile.TORCH },
  grenade: { id: "grenade", name: "Grenade", kind: "consumable", use: "grenade", slot: 50, damage: 34, cooldown: 0.24, asset: "item-grenade" },
  eyeSigil: { id: "eyeSigil", name: "Eye Sigil", kind: "consumable", use: "summon", summons: "overseer-eye", slot: 60, asset: "item-eye-sigil" },
  wardenIdol: { id: "wardenIdol", name: "Warden Idol", kind: "consumable", use: "summon", summons: "stone-warden", slot: 61, asset: "item-warden-idol" },
  djinnLamp: { id: "djinnLamp", name: "Djinn Lamp", kind: "consumable", use: "summon", summons: "sand-djinn", slot: 62, asset: "item-djinn-lamp" },
  queenPrism: { id: "queenPrism", name: "Queen Prism", kind: "consumable", use: "summon", summons: "crystal-queen", slot: 63, asset: "item-queen-prism" },
  titanCore: { id: "titanCore", name: "Titan Core", kind: "consumable", use: "summon", summons: "forge-titan", slot: 64, asset: "item-titan-core" },
  rocFeather: { id: "rocFeather", name: "Roc Feather", kind: "consumable", use: "summon", summons: "thunder-roc", slot: 65, asset: "item-roc-feather" },
  ashenHeart: { id: "ashenHeart", name: "Ashen Heart", kind: "consumable", use: "summon", summons: "ashen-behemoth", slot: 66, asset: "item-ashen-heart" },
  stormTotem: { id: "stormTotem", name: "Storm Totem", kind: "consumable", use: "summon", summons: "storm-hydra", slot: 67, asset: "item-storm-totem" },
  moonCharm: { id: "moonCharm", name: "Moon Charm", kind: "consumable", use: "summon", summons: "moonlit-empress", slot: 68, asset: "item-moon-charm" },
  graveCrown: { id: "graveCrown", name: "Grave Crown", kind: "consumable", use: "summon", summons: "grave-sovereign", slot: 69, asset: "item-grave-crown" },
  abyssLantern: { id: "abyssLantern", name: "Abyss Lantern", kind: "consumable", use: "summon", summons: "abyss-herald", slot: 70, asset: "item-abyss-lantern" },
  cryptSeal: { id: "cryptSeal", name: "Crypt Seal", kind: "consumable", use: "summon", summons: "crypt-matriarch", slot: 71, asset: "item-crypt-seal" },
  voidHalo: { id: "voidHalo", name: "Void Halo", kind: "consumable", use: "summon", summons: "void-seraph", slot: 72, asset: "item-void-halo" },
  coin: { id: "coin", name: "Coins", kind: "currency", slot: null, asset: "item-coin" },
};

const STARTER_LOADOUT = [
  { id: "sword", count: 1 },
  { id: "pickaxe", count: 1 },
];

const SHOP_ITEMS = [
  { id: "gun", price: 10 },
  { id: "bow", price: 15 },
  { id: "aeroRig", price: 15 },
  { id: "skyWings", price: 24 },
  { id: "steelArmor", price: 18 },
  { id: "grenade", price: 2, quantity: 3 },
  { id: "eyeSigil", price: 6 },
  { id: "wardenIdol", price: 8 },
  { id: "djinnLamp", price: 10 },
  { id: "queenPrism", price: 12 },
  { id: "titanCore", price: 16 },
  { id: "rocFeather", price: 14 },
  { id: "ashenHeart", price: 18 },
  { id: "stormTotem", price: 20 },
  { id: "moonCharm", price: 22 },
  { id: "graveCrown", price: 24 },
  { id: "abyssLantern", price: 26 },
  { id: "cryptSeal", price: 15 },
  { id: "voidHalo", price: 18 },
];

const BOSS_STAGES = [
  { kind: "overseer-eye", flag: "bossDefeated", requiresNight: true, waitText: "The Overseer Eye only answers during the night." },
  { kind: "stone-warden", flag: "stoneWardenDefeated", requiresNight: false, waitText: "Stone Warden rises only under daylight. Wait for dawn." },
  { kind: "sand-djinn", flag: "sandDjinnDefeated", requiresNight: false, waitText: "Sandstorm Djinn only gathers under daylight." },
  { kind: "crystal-queen", flag: "crystalQueenDefeated", requiresNight: true, waitText: "Crystal Queen only awakens at night." },
  { kind: "forge-titan", flag: "forgeTitanDefeated", requiresNight: false, waitText: "Forge Titan marches only under daylight. Wait for dawn." },
  { kind: "thunder-roc", flag: "thunderRocDefeated", requiresNight: false, waitText: "Thunder Roc rides only on daylight thermals." },
  { kind: "ashen-behemoth", flag: "ashenBehemothDefeated", requiresNight: false, waitText: "Ashen Behemoth rouses only while the sun still burns." },
  { kind: "storm-hydra", flag: "stormHydraDefeated", requiresNight: false, waitText: "Storm Hydra circles only through bright daytime skies." },
  { kind: "moonlit-empress", flag: "moonlitEmpressDefeated", requiresNight: true, waitText: "Moonlit Empress only steps through the veil at night." },
  { kind: "grave-sovereign", flag: "graveSovereignDefeated", requiresNight: true, waitText: "Grave Sovereign only answers from the dark." },
  { kind: "abyss-herald", flag: "abyssHeraldDefeated", requiresNight: true, waitText: "Abyss Herald descends only beneath the night sky." },
  { kind: "crypt-matriarch", flag: "cryptMatriarchDefeated", requiresNight: true, waitText: "Crypt Matriarch rises only after dusk." },
  { kind: "void-seraph", flag: "voidSeraphDefeated", requiresNight: false, waitText: "Void Seraph can be summoned any time." },
];

const RECIPES = [
  { id: "torch-bundle", outputId: "torch", outputCount: 3, ingredients: [{ id: "wood", count: 1 }] },
  { id: "bow-craft", outputId: "bow", outputCount: 1, ingredients: [{ id: "wood", count: 10 }, { id: "copperBar", count: 2 }] },
  { id: "grenade-pack", outputId: "grenade", outputCount: 3, ingredients: [{ id: "ironBar", count: 1 }, { id: "torch", count: 1 }] },
  { id: "iron-sword", outputId: "ironSword", outputCount: 1, ingredients: [{ id: "ironBar", count: 5 }] },
  { id: "crystal-sword", outputId: "crystalSword", outputCount: 1, ingredients: [{ id: "crystalBar", count: 7 }] },
  { id: "iron-pickaxe", outputId: "ironPickaxe", outputCount: 1, ingredients: [{ id: "ironBar", count: 4 }, { id: "wood", count: 3 }] },
  { id: "crystal-pickaxe", outputId: "crystalPickaxe", outputCount: 1, ingredients: [{ id: "crystalBar", count: 5 }, { id: "wood", count: 4 }] },
  { id: "iron-armor", outputId: "ironArmor", outputCount: 1, ingredients: [{ id: "ironBar", count: 9 }] },
  { id: "crystal-armor", outputId: "crystalArmor", outputCount: 1, ingredients: [{ id: "crystalBar", count: 11 }] },
  { id: "steel-armor", outputId: "steelArmor", outputCount: 1, ingredients: [{ id: "ironBar", count: 6 }] },
  { id: "eye-sigil", outputId: "eyeSigil", outputCount: 1, ingredients: [{ id: "crystalBar", count: 4 }] },
  { id: "warden-idol", outputId: "wardenIdol", outputCount: 1, ingredients: [{ id: "stone", count: 18 }, { id: "ironBar", count: 2 }] },
  { id: "djinn-lamp", outputId: "djinnLamp", outputCount: 1, ingredients: [{ id: "wood", count: 8 }, { id: "crystalBar", count: 2 }] },
  { id: "queen-prism", outputId: "queenPrism", outputCount: 1, ingredients: [{ id: "crystalBar", count: 6 }] },
  { id: "titan-core", outputId: "titanCore", outputCount: 1, ingredients: [{ id: "ironBar", count: 6 }, { id: "crystalBar", count: 4 }] },
  { id: "roc-feather", outputId: "rocFeather", outputCount: 1, ingredients: [{ id: "wood", count: 10 }, { id: "ironBar", count: 4 }, { id: "crystalBar", count: 2 }] },
  { id: "ashen-heart", outputId: "ashenHeart", outputCount: 1, ingredients: [{ id: "ironBar", count: 6 }, { id: "crystalBar", count: 6 }, { id: "wood", count: 6 }] },
  { id: "storm-totem", outputId: "stormTotem", outputCount: 1, ingredients: [{ id: "ironBar", count: 5 }, { id: "crystalBar", count: 7 }, { id: "wood", count: 8 }] },
  { id: "moon-charm", outputId: "moonCharm", outputCount: 1, ingredients: [{ id: "crystalBar", count: 10 }, { id: "wood", count: 8 }] },
  { id: "grave-crown", outputId: "graveCrown", outputCount: 1, ingredients: [{ id: "stone", count: 24 }, { id: "ironBar", count: 7 }, { id: "crystalBar", count: 5 }] },
  { id: "abyss-lantern", outputId: "abyssLantern", outputCount: 1, ingredients: [{ id: "wood", count: 12 }, { id: "ironBar", count: 8 }, { id: "crystalBar", count: 8 }] },
  { id: "crypt-seal", outputId: "cryptSeal", outputCount: 1, ingredients: [{ id: "stone", count: 20 }, { id: "ironBar", count: 5 }, { id: "crystalBar", count: 2 }] },
  { id: "void-halo", outputId: "voidHalo", outputCount: 1, ingredients: [{ id: "ironBar", count: 4 }, { id: "crystalBar", count: 8 }] },
  { id: "copper-bar", outputId: "copperBar", outputCount: 1, station: "furnace", ingredients: [{ id: "copperOre", count: 3 }] },
  { id: "iron-bar", outputId: "ironBar", outputCount: 1, station: "furnace", ingredients: [{ id: "ironOre", count: 3 }] },
  { id: "crystal-bar", outputId: "crystalBar", outputCount: 1, station: "furnace", ingredients: [{ id: "crystalOre", count: 3 }] },
];

const ASSET_PATHS = {
  "tile-dirt": "./assets/tiles/dirt.png",
  "tile-grass": "./assets/tiles/grass.png",
  "tile-stone": "./assets/tiles/stone.png",
  "tile-wood": "./assets/tiles/wood.png",
  "tile-tree-trunk": "./assets/tiles/tree_trunk.png",
  "tile-leaves": "./assets/tiles/leaves.png",
  "tile-tree": "./assets/tiles/leaves.png",
  "tile-torch": "./assets/tiles/torch.png",
  "tile-platform": "./assets/tiles/platform.png",
  "tile-copper-ore": "./assets/tiles/copper_ore.png",
  "tile-iron-ore": "./assets/tiles/iron_ore.png",
  "tile-crystal-ore": "./assets/tiles/crystal_ore.png",
  "tile-furnace-tl": "./assets/tiles/furnace_tl.png",
  "tile-furnace-tr": "./assets/tiles/furnace_tr.png",
  "tile-furnace-bl": "./assets/tiles/furnace_bl.png",
  "tile-furnace-br": "./assets/tiles/furnace_br.png",
  "wall-wood": "./assets/tiles/wood_wall.png",
  "wall-grass": "./assets/tiles/grass_wall.png",
  "item-sword": "./assets/items/sword.png",
  "item-pickaxe": "./assets/items/pickaxe.png",
  "item-iron-sword": "./assets/items/iron_sword.png",
  "item-crystal-sword": "./assets/items/crystal_sword.png",
  "item-iron-pickaxe": "./assets/items/iron_pickaxe.png",
  "item-crystal-pickaxe": "./assets/items/crystal_pickaxe.png",
  "item-bow": "./assets/items/bow.png",
  "item-minigun": "./assets/items/minigun.png",
  "item-retina-blade": "./assets/items/retina_blade.png",
  "item-warden-cleaver": "./assets/items/warden_cleaver.png",
  "item-sand-carbine": "./assets/items/sand_carbine.png",
  "item-prism-laser": "./assets/items/prism_laser.png",
  "item-titan-blaster": "./assets/items/titan_blaster.png",
  "item-tempest-scattergun": "./assets/items/tempest_scattergun.png",
  "item-crypt-bell": "./assets/items/crypt_bell.png",
  "item-void-relic": "./assets/items/void_relic.png",
  "item-cloudfang": "./assets/items/cloudfang.png",
  "item-gust-bow": "./assets/items/gust_bow.png",
  "item-sunshard": "./assets/items/sunshard.png",
  "item-ashfall-mortar": "./assets/items/ashfall_mortar.png",
  "item-stormspine": "./assets/items/stormspine.png",
  "item-moonveil": "./assets/items/moonveil.png",
  "item-sepulcher-chain": "./assets/items/sepulcher_chain.png",
  "item-void-thorn": "./assets/items/void_thorn.png",
  "projectile-flame": "./assets/Projectiles/Flame.png",
  "projectile-portal": "./assets/Projectiles/Portal.png",
  "item-aero-rig": "./assets/items/aero_rig.png",
  "item-sky-wings": "./assets/items/sky_wings.png",
  "item-seraph-wings": "./assets/items/seraph_wings.png",
  "item-watcher-lens": "./assets/items/watcher_lens.png",
  "item-warden-plate": "./assets/items/warden_plate.png",
  "item-djinn-sash": "./assets/items/djinn_sash.png",
  "item-prism-heart": "./assets/items/prism_heart.png",
  "item-forge-core": "./assets/items/forge_core.png",
  "item-roc-plume": "./assets/items/roc_plume.png",
  "item-cinder-sigil": "./assets/items/cinder_sigil.png",
  "item-hydra-loop": "./assets/items/hydra_loop.png",
  "item-moon-mantle": "./assets/items/moon_mantle.png",
  "item-grave-chain": "./assets/items/grave_chain.png",
  "item-abyss-bloom": "./assets/items/abyss_bloom.png",
  "item-matriarch-emblem": "./assets/items/matriarch_emblem.png",
  "item-star-diadem": "./assets/items/star_diadem.png",
  "item-steel-armor": "./assets/items/steel_armor.png",
  "item-iron-armor": "./assets/items/iron_armor.png",
  "item-crystal-armor": "./assets/items/crystal_armor.png",
  "item-copper-ore": "./assets/items/copper_ore.png",
  "item-iron-ore": "./assets/items/iron_ore.png",
  "item-crystal-ore": "./assets/items/crystal_ore.png",
  "item-copper-bar": "./assets/items/copper_bar.png",
  "item-iron-bar": "./assets/items/iron_bar.png",
  "item-crystal-bar": "./assets/items/crystal_bar.png",
  "item-grenade": "./assets/items/grenade.png",
  "item-eye-sigil": "./assets/items/eye_sigil.png",
  "item-warden-idol": "./assets/items/warden_idol.png",
  "item-djinn-lamp": "./assets/items/djinn_lamp.png",
  "item-queen-prism": "./assets/items/queen_prism.png",
  "item-titan-core": "./assets/items/titan_core.png",
  "item-roc-feather": "./assets/items/roc_feather.png",
  "item-ashen-heart": "./assets/items/ashen_heart.png",
  "item-storm-totem": "./assets/items/storm_totem.png",
  "item-moon-charm": "./assets/items/moon_charm.png",
  "item-grave-crown": "./assets/items/grave_crown.png",
  "item-abyss-lantern": "./assets/items/abyss_lantern.png",
  "item-crypt-seal": "./assets/items/crypt_seal.png",
  "item-void-halo": "./assets/items/void_halo.png",
  "item-coin": "./assets/items/coin.png",
  "ui-game-sun": "./assets/ui/Game_sun.png",
  "ui-game-black-hole": "./assets/ui/Game_BlackHole.png",
  "sprite-player": "./assets/sprites/player_idle.png",
  "sprite-slime": "./assets/sprites/slime.png",
  "sprite-goblin": "./assets/sprites/goblin.png",
  "sprite-eye-servant": "./assets/sprites/eye_servant.png",
  "sprite-sand-wisp": "./assets/sprites/sand_wisp.png",
  "sprite-cave-bat": "./assets/sprites/cave_bat.png",
  "sprite-skeleton-miner": "./assets/sprites/skeleton_miner.png",
  "sprite-guide": "./assets/sprites/guide.png",
  "sprite-merchant": "./assets/sprites/merchant.png",
  "sprite-overseer-eye": "./assets/sprites/overseer_eye.png",
  "sprite-stone-warden": "./assets/sprites/stone_warden.png",
  "sprite-sand-djinn": "./assets/sprites/sandstorm_djinn.png",
  "sprite-crystal-queen": "./assets/sprites/crystal_queen.png",
  "sprite-forge-titan": "./assets/sprites/forge_titan.png",
  "sprite-thunder-roc": "./assets/sprites/thunder_roc.png",
  "sprite-ashen-behemoth": "./assets/sprites/ashen_behemoth.png",
  "sprite-storm-hydra": "./assets/sprites/storm_hydra.png",
  "sprite-moonlit-empress": "./assets/sprites/moonlit_empress.png",
  "sprite-grave-sovereign": "./assets/sprites/grave_sovereign.png",
  "sprite-abyss-herald": "./assets/sprites/abyss_herald.png",
  "sprite-crypt-matriarch": "./assets/sprites/crypt_matriarch.png",
  "sprite-void-seraph": "./assets/sprites/void_seraph.png",
};

const NPC_DIALOGUES = {
  guide: [
    "Build a shelter before the night thickens. Goblins love open doors and poor planning.",
    "Use the pickaxe on solid tiles, keep torches in slot 9, and use the bow when enemies stay just out of reach.",
    "When the moon is high, buy an Eye Sigil and use it from the hotbar to call the Overseer Eye.",
  ],
  merchant: [
    "Business is better when you are alive. Stay close if you need supplies or a quick heal.",
    "Wood for roofs, stone for walls, torches for courage. That is the closest thing to a starter pack.",
    "A tidy hotbar is worth more than ten panic clicks.",
  ],
};

const input = {
  down: new Set(),
  pressed: new Set(),
  mouseX: canvas.width * 0.5,
  mouseY: canvas.height * 0.5,
  worldX: 0,
  worldY: 0,
  left: false,
  right: false,
  leftPressed: false,
  rightPressed: false,
};

const assets = {};
let state = null;
let lastFrame = performance.now();
let fatalError = null;
let bootCompleted = false;
let menuActionInFlight = false;

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
if (desktopApi?.onWindowModeChanged) {
  desktopApi.onWindowModeChanged((mode) => {
    if (state) {
      state.desktopWindowMode = mode;
    }
  });
}
window.addEventListener("error", (event) => {
  console.error("Renderer error:", event.error ?? event.message);
  handleFatal(event.error ?? event.message ?? "Unknown renderer error");
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
  handleFatal(event.reason ?? "Unhandled promise rejection");
});

setupInput();
setupMainMenu();
renderLoading("Loading Russraria...");
boot().catch((error) => {
  console.error(error);
  handleFatal(error);
});

async function boot() {
  window.__bootOverlay?.setStatus("Загрузка текстур...");
  console.log("boot begin");
  await loadAssets();
  window.__bootOverlay?.setStatus("Генерация мира...");
  console.log("assets loaded");
  bootCompleted = true;
  window.__bootOverlay?.hide();
  window.__mainMenu?.setStatus("Select an option");
  window.__mainMenu?.show();
  requestAnimationFrame(frame);
}

function setupMainMenu() {
  const buttons = document.querySelectorAll("[data-menu-action]");
  for (const button of buttons) {
    button.addEventListener("click", async () => {
      await handleMainMenuAction(button.dataset.menuAction ?? "");
    });
  }
}

async function handleMainMenuAction(action) {
  if (!bootCompleted) {
    window.__mainMenu?.setStatus("Still loading...");
    return;
  }

  if (action === "play") {
    if (menuActionInFlight || state || !window.__mainMenu?.isVisible?.()) {
      return;
    }
    menuActionInFlight = true;
    window.__mainMenu?.setStatus("Generating world...");
    try {
      state = createState();
      console.log("state created");
      await syncDesktopWindowMode();
      console.log("desktop window mode synced", state?.desktopWindowMode);
      window.__mainMenu?.hide();
    } catch (error) {
      menuActionInFlight = false;
      throw error;
    }
    return;
  }

  if (action === "settings") {
    window.__mainMenu?.setStatus("Settings will be added next.");
    return;
  }

  if (action === "theme") {
    window.__mainMenu?.toggleTheme();
    return;
  }

  if (action === "exit") {
    window.__mainMenu?.setStatus("Closing...");
    if (desktopApi?.quitApp) {
      await desktopApi.quitApp();
    } else {
      window.close();
    }
  }
}

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  if (fatalError) {
    renderFatal(fatalError);
    return;
  }

  try {
    if (state) {
      updateMouseWorld();
      update(dt);
      render();
      if (!state.__bootOverlayHidden) {
        state.__bootOverlayHidden = true;
        window.__bootOverlay?.hide();
      }
      input.pressed.clear();
      input.leftPressed = false;
      input.rightPressed = false;
    }
  } catch (error) {
    console.error("Frame error:", error);
    handleFatal(error);
    return;
  }

  requestAnimationFrame(frame);
}

function createState() {
  const seed = Math.floor(Math.random() * 1000000);
  const world = generateWorld(seed);
  const player = createPlayer(world.spawn.x, world.spawn.y);

  return {
    seed,
    elapsed: 0,
    dayClock: DAY_LENGTH * 0.18,
    world,
    player,
    camera: { x: 0, y: 0 },
    mobs: createAmbientCritters(world),
    skyChests: world.skyChests.map((chest) => ({ ...chest, loot: chest.loot.map((entry) => ({ ...entry })) })),
    npcs: createNpcs(world),
    particles: [],
    combatTexts: [],
    projectiles: [],
    beams: [],
    portals: [],
    lavaFlowTimer: 0,
    activeBeam: null,
    activeQuasar: null,
    drops: [],
    lights: [],
    leafFallTimer: 0,
    mineTarget: null,
    boss: null,
    bossDefeated: false,
    stoneWardenDefeated: false,
    sandDjinnDefeated: false,
    crystalQueenDefeated: false,
    forgeTitanDefeated: false,
    thunderRocDefeated: false,
    ashenBehemothDefeated: false,
    stormHydraDefeated: false,
    moonlitEmpressDefeated: false,
    graveSovereignDefeated: false,
    abyssHeraldDefeated: false,
    cryptMatriarchDefeated: false,
    voidSeraphDefeated: false,
    tradeOpen: false,
    tradeScroll: 0,
    craftOpen: false,
    craftScroll: 0,
    settingsOpen: false,
    cheatOpen: false,
    cheatScroll: 0,
    desktopWindowMode: desktopApi?.isDesktop ? "fullscreen" : "browser",
    spawnCooldown: 1.8,
    message: { text: "Explore, mine, build, and survive the first night.", ttl: 7 },
    dialogue: null,
    celestialBlackHoleBlend: 0,
    voidSeraphSkyBlend: 0,
    stars: createStars(),
    clouds: createClouds(),
    mountains: createMountainBands(),
    hoveredTile: null,
  };
}

function sortInventoryEntries(entries) {
  entries.sort((a, b) => {
    const orderA = ITEM_DEFS[a.id]?.slot ?? 999;
    const orderB = ITEM_DEFS[b.id]?.slot ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });
  return entries;
}

function createStarterInventory() {
  return sortInventoryEntries(STARTER_LOADOUT.filter((entry) => entry.count > 0).map((entry) => ({ ...entry })));
}

function getEquippedWingDef() {
  if (!state?.player) {
    return null;
  }
  if (state.player.hasSeraphWings) {
    return ITEM_DEFS.seraphWings;
  }
  if (state.player.hasSkyWings) {
    return ITEM_DEFS.skyWings;
  }
  return null;
}

function getWingFlightTime(wingDef, player = state?.player) {
  if (!wingDef) {
    return 0;
  }
  if (!Number.isFinite(wingDef.flightTime)) {
    return wingDef.flightTime;
  }
  return wingDef.flightTime + (player?.wingFuelBonus ?? 0);
}

function unlockAccessory(itemId) {
  if (!state?.player) {
    return false;
  }
  state.player.unlockedAccessories[itemId] ||= true;
  refreshPlayerPassives(state.player, { restoreBonusHealth: true });
  return true;
}

function refreshPlayerPassives(player, options = {}) {
  const previousMaxHealth = player.maxHealth ?? 140;
  let maxHealth = 140;
  let bonusDefense = 0;
  let damageReduction = 0;
  let moveSpeedBonus = 0;
  let jumpBoost = 0;
  let passiveRegen = 0;
  let wingFuelBonus = 0;
  let dashCooldownMultiplier = 1;
  let knockbackResist = 0;
  let miningPowerBonus = 0;

  for (const itemId of Object.keys(player.unlockedAccessories ?? {})) {
    if (!player.unlockedAccessories[itemId]) {
      continue;
    }
    const def = ITEM_DEFS[itemId];
    if (!def || def.kind !== "accessory") {
      continue;
    }
    maxHealth += def.maxHealthBonus ?? 0;
    bonusDefense += def.defenseBonus ?? 0;
    damageReduction += def.damageReduction ?? 0;
    moveSpeedBonus += def.moveSpeedBonus ?? 0;
    jumpBoost += def.jumpBoost ?? 0;
    passiveRegen += def.passiveRegen ?? 0;
    wingFuelBonus += def.wingFuelBonus ?? 0;
    dashCooldownMultiplier *= def.dashCooldownMultiplier ?? 1;
    knockbackResist += def.knockbackResist ?? 0;
    miningPowerBonus += def.miningPowerBonus ?? 0;
  }

  player.maxHealth = maxHealth;
  player.bonusDefense = bonusDefense;
  player.damageReduction = clamp(damageReduction, 0, 0.35);
  player.moveSpeedBonus = moveSpeedBonus;
  player.jumpBoost = jumpBoost;
  player.passiveRegen = passiveRegen;
  player.wingFuelBonus = wingFuelBonus;
  player.dashCooldownMultiplier = clamp(dashCooldownMultiplier, 0.55, 1);
  player.knockbackResist = clamp(knockbackResist, 0, 0.45);
  player.miningPowerBonus = miningPowerBonus;

  if (options.restoreBonusHealth && player.maxHealth > previousMaxHealth) {
    player.health = Math.min(player.maxHealth, player.health + (player.maxHealth - previousMaxHealth));
  } else if (player.health > player.maxHealth) {
    player.health = player.maxHealth;
  }
}

function createPlayer(x, y) {
  return {
    x,
    y,
    w: 14,
    h: 26,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    health: 140,
    maxHealth: 140,
    coins: 0,
    invuln: 0,
    attackTimer: 0,
    attackCooldown: 0,
    swingId: 0,
    attackDamage: 0,
    attackItemId: "sword",
    swingStartAngle: -Math.PI * 0.5,
    swingEndAngle: Math.PI * 0.5,
    swingReach: 38,
    swingRadius: 12,
    minigunHeat: 0,
    minigunOverheatTimer: 0,
    laserDamageTimer: 0,
    sandBurstShotsRemaining: 0,
    sandBurstTimer: 0,
    sandBurstBaseAngle: 0,
    gustBurstShotsRemaining: 0,
    gustBurstTimer: 0,
    gustBurstBaseAngle: 0,
    gustBurstTargetX: 0,
    gustBurstTargetY: 0,
    gustBurstPortals: [],
    gustBurstPortalIndex: 0,
    swingImpulseFired: false,
    platformDropTimer: 0,
    hasAeroRig: false,
    hasSkyWings: false,
    hasSeraphWings: false,
    unlockedAccessories: {},
    armor: 0,
    armorName: null,
    bonusDefense: 0,
    damageReduction: 0,
    moveSpeedBonus: 0,
    jumpBoost: 0,
    passiveRegen: 0,
    passiveRegenBuffer: 0,
    wingFuelBonus: 0,
    dashCooldownMultiplier: 1,
    knockbackResist: 0,
    miningPowerBonus: 0,
    dashCooldown: 0,
    dashMomentum: 0,
    airJumpAvailable: true,
    wingFuel: 0,
    wingFxTimer: 0,
    fireHazardTimer: 0,
    placeCooldown: 0,
    selectedSlot: 0,
    inventory: createStarterInventory(),
  };
}

function createNpcs(world) {
  const floorPixelY = world.village.baseY * TILE_SIZE;

  return [
    {
      id: "guide",
      kind: "guide",
      name: "Mika the Guide",
      x: (world.village.houseA + 2) * TILE_SIZE,
      y: floorPixelY - 26,
      w: 14,
      h: 26,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      alive: true,
      health: 90,
      maxHealth: 90,
      invuln: 0,
      fireHazardTimer: 0,
      respawnTimer: 0,
      wanderTimer: 0.8,
      healCooldown: 0,
      attackTimer: 0,
      attackCooldown: 0,
      swingId: 0,
      currentSwingTag: "",
      attackDamage: 14,
      attackItemId: "sword",
      swingStartAngle: -0.4,
      swingEndAngle: 0.4,
      swingReach: 32,
      swingRadius: 11,
      openedDoorKey: null,
      openedDoorCloseTimer: 0,
      homeLeft: (world.village.left + 1) * TILE_SIZE,
      homeRight: (world.village.houseB - 4) * TILE_SIZE,
      dialogueIndex: 0,
    },
    {
      id: "merchant",
      kind: "merchant",
      name: "Rurik the Merchant",
      x: (world.village.houseB + 2) * TILE_SIZE,
      y: floorPixelY - 26,
      w: 14,
      h: 26,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: -1,
      alive: true,
      health: 110,
      maxHealth: 110,
      invuln: 0,
      fireHazardTimer: 0,
      respawnTimer: 0,
      wanderTimer: 0.4,
      healCooldown: 0,
      attackTimer: 0,
      attackCooldown: 0,
      swingId: 0,
      currentSwingTag: "",
      attackDamage: 12,
      attackItemId: "sword",
      swingStartAngle: -0.4,
      swingEndAngle: 0.4,
      swingReach: 32,
      swingRadius: 11,
      openedDoorKey: null,
      openedDoorCloseTimer: 0,
      homeLeft: (world.village.houseB - 2) * TILE_SIZE,
      homeRight: (world.village.right - 1) * TILE_SIZE,
      dialogueIndex: 0,
    },
  ];
}

function createAmbientCritters(world) {
  const critters = [];
  const spawnCritter = (kind, tileX) => {
    if (tileX <= 8 || tileX >= WORLD_WIDTH - 8) {
      return;
    }
    if (tileX >= world.village.left - 6 && tileX <= world.village.right + 6) {
      return;
    }
    const surfaceY = world.heights[tileX] ?? 0;
    if (surfaceY < 12 || surfaceY > WORLD_HEIGHT - 6) {
      return;
    }
    const entity = createSurfaceCritter(kind, tileX * TILE_SIZE, surfaceY);
    if (entity) {
      critters.push(entity);
    }
  };

  for (let i = 0; i < 7; i += 1) {
    spawnCritter("bird", 14 + Math.floor(Math.random() * (WORLD_WIDTH - 28)));
  }
  for (let i = 0; i < 5; i += 1) {
    spawnCritter("worm", 14 + Math.floor(Math.random() * (WORLD_WIDTH - 28)));
  }
  for (let i = 0; i < 18; i += 1) {
    spawnCritter("butterfly", 14 + Math.floor(Math.random() * (WORLD_WIDTH - 28)));
  }
  return critters;
}

function generateWorld(seed) {
  const random = mulberry32(seed);
  const world = {
    tiles: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
    walls: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
    flowers: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
    lavaLevel: new Float32Array(WORLD_WIDTH * WORLD_HEIGHT),
    lavaSource: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT),
    heights: new Array(WORLD_WIDTH),
    spawn: { x: 0, y: 0 },
    skyChests: [],
    village: {
      left: 0,
      right: 0,
      baseY: 0,
      houseA: 0,
      houseB: 0,
      furnaceX: 0,
      furnaceY: 0,
    },
  };

  let drift = 0;
  for (let x = 0; x < WORLD_WIDTH; x += 1) {
    drift += random() * 2 - 1;
    drift = clamp(drift, -7, 7);
    const ridge = Math.sin(x * 0.09) * 4 + Math.sin(x * 0.028 + 1.2) * 6;
    world.heights[x] = Math.round(clamp(70 + ridge + drift * 0.65, 56, 86));
  }

  for (let x = 0; x < WORLD_WIDTH; x += 1) {
    fillColumn(world, x, world.heights[x]);
  }

  carveCaves(world, random);

  const spawnTileX = Math.floor(WORLD_WIDTH * 0.46);
  const villageLeft = spawnTileX - 20;
  const villageRight = spawnTileX + 20;
  const averageHeight = Math.round(
    world.heights.slice(spawnTileX - 5, spawnTileX + 6).reduce((sum, value) => sum + value, 0) / 11
  );

  for (let x = villageLeft; x <= villageRight; x += 1) {
    world.heights[x] = averageHeight;
    fillColumn(world, x, averageHeight);
  }

  for (let x = 4; x < WORLD_WIDTH - 4; x += Math.floor(random() * 5) + 6) {
    if (x >= villageLeft - 4 && x <= villageRight + 4) {
      continue;
    }
    const surfaceY = world.heights[x];
    if (surfaceY < 14) {
      continue;
    }
    plantTree(world, x, surfaceY, 4 + Math.floor(random() * 4));
  }

  buildVillage(world, villageLeft, villageRight, averageHeight);
  placeOreVeins(world, random, villageLeft, villageRight, averageHeight);
  placeLavaPools(world, random, villageLeft, villageRight, averageHeight);
  placeSkyIslands(world, random, villageLeft, villageRight);
  placeGrassBushes(world, random, villageLeft, villageRight);
  placeFlowers(world, random, villageLeft, villageRight);

  world.spawn.x = spawnTileX * TILE_SIZE;
  world.spawn.y = (averageHeight - 3) * TILE_SIZE - 26;
  return world;
}

function placeSkyIslands(world, random, villageLeft, villageRight) {
  const weaponPool = shuffleArray(["cloudfang", "gustBow", "sunshard"], random);
  const islandCount = 3 + Math.floor(random() * 2);
  let placed = 0;
  let attempts = 0;

  while (placed < islandCount && attempts < 40) {
    attempts += 1;
    const centerX = 20 + Math.floor(random() * (WORLD_WIDTH - 40));
    if (centerX >= villageLeft - 18 && centerX <= villageRight + 18) {
      continue;
    }
    const radiusX = 5 + Math.floor(random() * 4);
    const radiusY = 2 + Math.floor(random() * 2);
    const baseY = 8 + Math.floor(random() * 7);
    const left = centerX - radiusX - 3;
    const right = centerX + radiusX + 3;
    if (left < 4 || right >= WORLD_WIDTH - 4) {
      continue;
    }
    if (world.skyChests.some((chest) => Math.abs(chest.tileX - centerX) < 18)) {
      continue;
    }

    let topY = WORLD_HEIGHT;
    for (let x = centerX - radiusX - 1; x <= centerX + radiusX + 1; x += 1) {
      for (let y = baseY - radiusY - 1; y <= baseY + radiusY + 1; y += 1) {
        const nx = (x - centerX) / (radiusX + 0.45);
        const ny = (y - baseY) / (radiusY + 0.75);
        const distance = nx * nx + ny * ny;
        if (distance > 1.08 + random() * 0.08) {
          continue;
        }
        if (ny > 0.1 && random() < ny * 0.22) {
          continue;
        }
        if (getTile(world, x, y) !== Tile.AIR) {
          continue;
        }
        setTile(world, x, y, Tile.CLOUD);
        topY = Math.min(topY, y);
      }
    }

    if (topY >= WORLD_HEIGHT) {
      continue;
    }

    const chestTileY = Math.max(2, topY - 1);
    world.skyChests.push({
      id: `sky-chest-${placed}`,
      tileX: centerX,
      tileY: chestTileY,
      x: centerX * TILE_SIZE - 11,
      y: chestTileY * TILE_SIZE - 12,
      w: 22,
      h: 14,
      opened: false,
      loot: [{ id: weaponPool[placed % weaponPool.length], count: 1 }],
    });
    placed += 1;
  }
}

function shuffleArray(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(random() * (i + 1));
    [result[i], result[swapIndex]] = [result[swapIndex], result[i]];
  }
  return result;
}

function buildVillage(world, left, right, baseY) {
  const houseA = left + 4;
  const houseB = left + 24;
  buildHouse(world, houseA, baseY, 10, 6, "right");
  buildHouse(world, houseB, baseY, 10, 6, "left");

  const furnaceX = houseA + 6;
  const furnaceY = baseY - 2;
  setTile(world, furnaceX, furnaceY, Tile.FURNACE_TL);
  setTile(world, furnaceX + 1, furnaceY, Tile.FURNACE_TR);
  setTile(world, furnaceX, furnaceY + 1, Tile.FURNACE_BL);
  setTile(world, furnaceX + 1, furnaceY + 1, Tile.FURNACE_BR);

  setTile(world, left + 2, baseY - 1, Tile.TORCH);
  setTile(world, right - 2, baseY - 1, Tile.TORCH);

  world.village.left = left;
  world.village.right = right;
  world.village.baseY = baseY;
  world.village.houseA = houseA;
  world.village.houseB = houseB;
  world.village.furnaceX = furnaceX;
  world.village.furnaceY = furnaceY;
}

function buildHouse(world, left, baseY, width, height, doorSide) {
  const right = left + width - 1;
  const roofY = baseY - height;

  for (let x = left - 1; x <= right + 1; x += 1) {
    setTile(world, x, roofY - 1, Tile.WOOD);
  }

  for (let x = left; x <= right; x += 1) {
    for (let y = roofY; y <= baseY; y += 1) {
      const onBorder = x === left || x === right || y === roofY || y === baseY;
      setTile(world, x, y, onBorder ? Tile.WOOD : Tile.AIR);
      setWall(world, x, y, onBorder ? Wall.NONE : Wall.WOOD);
    }
  }

  setTile(world, right + 1, roofY, Tile.WOOD);

  const placeDoor = (doorX) => {
    setTile(world, doorX, baseY - 1, Tile.DOOR_CLOSED_BOTTOM);
    setTile(world, doorX, baseY - 2, Tile.DOOR_CLOSED_TOP);
    setTile(world, doorX, baseY - 3, Tile.WOOD);
    setWall(world, doorX, baseY - 1, Wall.WOOD);
    setWall(world, doorX, baseY - 2, Wall.WOOD);
    setWall(world, doorX, baseY - 3, Wall.NONE);
  };

  placeDoor(left);
  placeDoor(right);
  setTile(world, left + Math.floor(width / 2), roofY + 2, Tile.TORCH);
}

function placeGrassBushes(world, random, villageLeft, villageRight) {
  for (let x = 6; x < WORLD_WIDTH - 6; x += 1) {
    if (x >= villageLeft - 2 && x <= villageRight + 2) {
      continue;
    }
    if (random() > 0.2) {
      continue;
    }
    const surfaceY = world.heights[x];
    if (getTile(world, x, surfaceY) !== Tile.GRASS) {
      continue;
    }
    const bushHeight = 1 + Math.floor(random() * 2);
    const bushHalfWidth = random() < 0.35 ? 1 : 0;
    for (let offsetX = -bushHalfWidth; offsetX <= bushHalfWidth; offsetX += 1) {
      for (let offsetY = 1; offsetY <= bushHeight; offsetY += 1) {
        const wallX = x + offsetX;
        const wallY = surfaceY - offsetY;
        if (getTile(world, wallX, wallY) !== Tile.AIR) {
          continue;
        }
        if (offsetX !== 0 && offsetY === bushHeight && random() < 0.35) {
          continue;
        }
        setWall(world, wallX, wallY, Wall.GRASS);
      }
    }
  }
}

function placeFlowers(world, random, villageLeft, villageRight) {
  for (let x = 5; x < WORLD_WIDTH - 5; x += 1) {
    if (x >= villageLeft - 2 && x <= villageRight + 2) {
      continue;
    }
    if (random() > 0.24) {
      continue;
    }
    const surfaceY = world.heights[x];
    const flowerY = surfaceY - 1;
    if (getTile(world, x, surfaceY) !== Tile.GRASS || getTile(world, x, flowerY) !== Tile.AIR) {
      continue;
    }
    if (getWall(world, x, flowerY) === Wall.GRASS && random() < 0.5) {
      continue;
    }
    setFlower(world, x, flowerY, 1 + Math.floor(random() * FLOWER_VARIANT_COUNT));
  }
}

function carveCaves(world, random) {
  for (let i = 0; i < 95; i += 1) {
    let x = 10 + random() * (WORLD_WIDTH - 20);
    let y = 38 + random() * (WORLD_HEIGHT - 48);
    let angle = random() * Math.PI * 2;
    const steps = 7 + Math.floor(random() * 12);

    for (let step = 0; step < steps; step += 1) {
      carveCircle(world, x, y, 1.5 + random() * 2.8);
      x += Math.cos(angle) * (1 + random() * 2.1);
      y += Math.sin(angle) * (0.8 + random() * 1.6);
      angle += (random() - 0.5) * 1.4;
    }
  }
}

function carveCircle(world, cx, cy, radius) {
  const minX = Math.floor(cx - radius - 1);
  const maxX = Math.ceil(cx + radius + 1);
  const minY = Math.floor(cy - radius - 1);
  const maxY = Math.ceil(cy + radius + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const clampedX = clamp(x, 0, WORLD_WIDTH - 1);
        if (y <= world.heights[clampedX] + 5) {
          continue;
        }
        setTile(world, x, y, Tile.AIR);
      }
    }
  }
}

function placeOreVeins(world, random, villageLeft, villageRight, villageBaseY) {
  const configs = [
    { tile: Tile.COPPER_ORE, veins: 85, minY: 48, maxY: 88, minR: 1.2, maxR: 2.4 },
    { tile: Tile.IRON_ORE, veins: 68, minY: 62, maxY: 102, minR: 1.4, maxR: 2.6 },
    { tile: Tile.CRYSTAL_ORE, veins: 42, minY: 76, maxY: 114, minR: 1.2, maxR: 2.2 },
  ];

  for (const config of configs) {
    for (let i = 0; i < config.veins; i += 1) {
      const x = 6 + Math.floor(random() * (WORLD_WIDTH - 12));
      const y = config.minY + Math.floor(random() * Math.max(1, config.maxY - config.minY));
      if (x >= villageLeft - 4 && x <= villageRight + 4 && y <= villageBaseY + 28) {
        continue;
      }
      placeOrePocket(world, x, y, config.minR + random() * (config.maxR - config.minR), config.tile);
    }
  }
}

function placeOrePocket(world, cx, cy, radius, tile) {
  const minX = Math.floor(cx - radius - 1);
  const maxX = Math.ceil(cx + radius + 1);
  const minY = Math.floor(cy - radius - 1);
  const maxY = Math.ceil(cy + radius + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }
      if (getTile(world, x, y) !== Tile.STONE) {
        continue;
      }
      setTile(world, x, y, tile);
    }
  }
}

function plantTree(world, x, surfaceY, height) {
  for (let i = 1; i <= height; i += 1) {
    setTile(world, x, surfaceY - i, Tile.TREE_TRUNK);
  }

  const crownY = surfaceY - height;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance > 3) {
        continue;
      }
      const tx = x + dx;
      const ty = crownY + dy;
      if (getTile(world, tx, ty) === Tile.AIR) {
        setTile(world, tx, ty, Tile.TREE);
      }
    }
  }
}

function fillColumn(world, x, surfaceY) {
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    if (y < surfaceY) {
      setTile(world, x, y, Tile.AIR);
    } else if (y === surfaceY) {
      setTile(world, x, y, Tile.GRASS);
    } else if (y < surfaceY + 4) {
      setTile(world, x, y, Tile.DIRT);
    } else {
      setTile(world, x, y, Tile.STONE);
    }
  }
}

function setupInput() {
  window.addEventListener("keydown", (event) => {
    const primaryCode = event.key === "*" ? "StarKey" : event.code;
    if (!input.down.has(primaryCode)) {
      input.pressed.add(primaryCode);
    }
    input.down.add(primaryCode);

    const slot = parseHotbarSlot(event.code);
    if (slot !== null && state && !state.tradeOpen) {
      const inventoryIndex = getHotbarWindowStart() + slot;
      if (inventoryIndex < state.player.inventory.length) {
        state.player.selectedSlot = inventoryIndex;
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    const primaryCode = event.key === "*" ? "StarKey" : event.code;
    input.down.delete(primaryCode);
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      input.left = true;
      input.leftPressed = true;
    }
    if (event.button === 2) {
      input.right = true;
      input.rightPressed = true;
    }
  });

  canvas.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      input.left = false;
    }
    if (event.button === 2) {
      input.right = false;
    }
  });

  canvas.addEventListener("mouseleave", () => {
    input.left = false;
    input.right = false;
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (!state) {
      return;
    }

    const direction = Math.sign(event.deltaY);
    if (direction === 0) {
      return;
    }

    if (state.cheatOpen) {
      adjustCheatScroll(direction);
    } else if (state.tradeOpen) {
      adjustTradeScroll(direction);
    } else if (state.craftOpen && !state.settingsOpen) {
      adjustCraftScroll(direction);
    } else {
      cycleSelectedSlot(direction);
    }
  }, { passive: false });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

function parseHotbarSlot(code) {
  if (!code.startsWith("Digit")) {
    return null;
  }
  const slot = Number(code.replace("Digit", "")) - 1;
  if (Number.isNaN(slot) || slot < 0 || slot > 8) {
    return null;
  }
  return slot;
}

function resizeCanvas() {
  const viewportWidth = Math.max(960, Math.floor(window.innerWidth || 1280));
  const viewportHeight = Math.max(540, Math.floor(window.innerHeight || 720));
  const desktopScale = desktopApi?.isDesktop
    ? Math.min(1, DESKTOP_RENDER_MAX_WIDTH / viewportWidth, DESKTOP_RENDER_MAX_HEIGHT / viewportHeight)
    : 1;
  const nextWidth = roundEven(Math.max(960, Math.floor(viewportWidth * desktopScale)));
  const nextHeight = roundEven(Math.max(540, Math.floor(viewportHeight * desktopScale)));
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  lightingCanvas.width = Math.max(1, roundEven(Math.floor(nextWidth * LIGHTING_RESOLUTION_SCALE)));
  lightingCanvas.height = Math.max(1, roundEven(Math.floor(nextHeight * LIGHTING_RESOLUTION_SCALE)));
  ctx.imageSmoothingEnabled = false;
  lightingCtx.imageSmoothingEnabled = true;
  input.mouseX = clamp(input.mouseX, 0, nextWidth);
  input.mouseY = clamp(input.mouseY, 0, nextHeight);
}

async function syncDesktopWindowMode() {
  if (!desktopApi?.getWindowMode || !state) {
    return;
  }

  try {
    state.desktopWindowMode = await desktopApi.getWindowMode();
  } catch (error) {
    console.warn("Failed to get desktop window mode.", error);
  }
}

async function setDesktopWindowMode(mode) {
  if (!desktopApi?.setWindowMode) {
    announce("Window mode switching is available in the desktop .exe build.");
    return;
  }

  try {
    state.desktopWindowMode = await desktopApi.setWindowMode(mode);
    announce(state.desktopWindowMode === "fullscreen" ? "Fullscreen mode enabled." : "Windowed mode enabled.");
  } catch (error) {
    console.warn("Failed to switch desktop window mode.", error);
    announce("Could not switch the window mode.");
  }
}

function handleFatal(error) {
  fatalError = error instanceof Error ? error : new Error(String(error));
  window.__bootOverlay?.fail(String(fatalError.message || fatalError));
  renderFatal(fatalError);
}

function cycleSelectedSlot(direction) {
  const size = state.player.inventory.length;
  if (size <= 0) {
    state.player.selectedSlot = 0;
    return;
  }
  state.player.selectedSlot = (state.player.selectedSlot + direction + size) % size;
}

function getHotbarWindowStart() {
  const maxStart = Math.max(0, state.player.inventory.length - 9);
  return clamp(state.player.selectedSlot - 4, 0, maxStart);
}

function getCraftWindowRect() {
  const panelW = Math.min(470, canvas.width - 52);
  const panelH = Math.min(310, canvas.height - 140);
  return {
    x: 26,
    y: canvas.height - panelH - 110,
    w: panelW,
    h: panelH,
  };
}

function getCraftSettingsButtonRect() {
  const panel = getCraftWindowRect();
  return {
    x: panel.x + panel.w - 112,
    y: panel.y + 14,
    w: 94,
    h: 28,
  };
}

function getSettingsWindowRect() {
  const panelW = Math.min(540, canvas.width - 60);
  const panelH = Math.min(438, canvas.height - 78);
  return {
    x: Math.round((canvas.width - panelW) * 0.5),
    y: Math.round((canvas.height - panelH) * 0.5),
    w: panelW,
    h: panelH,
  };
}

function getSettingsWindowModeButtonRect() {
  const panel = getSettingsWindowRect();
  return {
    x: panel.x + 24,
    y: panel.y + 76,
    w: Math.min(196, panel.w - 48),
    h: 36,
  };
}

function getSettingsCloseButtonRect() {
  const panel = getSettingsWindowRect();
  return {
    x: panel.x + panel.w - 116,
    y: panel.y + 18,
    w: 92,
    h: 28,
  };
}

function getInventoryIndex(itemId) {
  return state.player.inventory.findIndex((entry) => entry.id === itemId);
}

function getInventoryEntry(itemId) {
  const index = getInventoryIndex(itemId);
  return index === -1 ? null : state.player.inventory[index];
}

function getInventoryCount(itemId) {
  const entry = getInventoryEntry(itemId);
  return entry ? entry.count : 0;
}

function getSelectedInventoryEntry() {
  if (state.player.inventory.length <= 0) {
    return null;
  }
  if (state.player.selectedSlot < 0 || state.player.selectedSlot >= state.player.inventory.length) {
    state.player.selectedSlot = clamp(state.player.selectedSlot, 0, Math.max(0, state.player.inventory.length - 1));
  }
  return state.player.inventory[state.player.selectedSlot] ?? null;
}

function normalizeSelectedSlot(preferredItemId = null) {
  if (state.player.inventory.length <= 0) {
    state.player.selectedSlot = 0;
    return;
  }

  if (preferredItemId) {
    const preferredIndex = getInventoryIndex(preferredItemId);
    if (preferredIndex !== -1) {
      state.player.selectedSlot = preferredIndex;
      return;
    }
  }

  state.player.selectedSlot = clamp(state.player.selectedSlot, 0, state.player.inventory.length - 1);
}

function adjustTradeScroll(direction) {
  const visibleOffers = 4;
  const maxScroll = Math.max(0, SHOP_ITEMS.length - visibleOffers);
  state.tradeScroll = clamp(state.tradeScroll + direction, 0, maxScroll);
}

function adjustCraftScroll(direction) {
  const visibleRecipes = 5;
  const maxScroll = Math.max(0, RECIPES.length - visibleRecipes);
  state.craftScroll = clamp(state.craftScroll + direction, 0, maxScroll);
}

function getCheatItems() {
  return Object.values(ITEM_DEFS).slice().sort((a, b) => (a.slot ?? 999) - (b.slot ?? 999) || a.id.localeCompare(b.id));
}

function adjustCheatScroll(direction) {
  const visibleItems = 5;
  const maxScroll = Math.max(0, getCheatItems().length - visibleItems);
  state.cheatScroll = clamp(state.cheatScroll + direction, 0, maxScroll);
}

function isFurnaceTile(tile) {
  return tile === Tile.FURNACE_TL || tile === Tile.FURNACE_TR || tile === Tile.FURNACE_BL || tile === Tile.FURNACE_BR;
}

function isNearFurnace(range = 72) {
  const centerX = state.player.x + state.player.w * 0.5;
  const centerY = state.player.y + state.player.h * 0.5;
  const tileRange = Math.ceil(range / TILE_SIZE);
  const centerTileX = Math.floor(centerX / TILE_SIZE);
  const centerTileY = Math.floor(centerY / TILE_SIZE);

  for (let y = centerTileY - tileRange; y <= centerTileY + tileRange; y += 1) {
    for (let x = centerTileX - tileRange; x <= centerTileX + tileRange; x += 1) {
      if (!isFurnaceTile(getTile(state.world, x, y))) {
        continue;
      }
      const worldX = x * TILE_SIZE + TILE_SIZE * 0.5;
      const worldY = y * TILE_SIZE + TILE_SIZE * 0.5;
      if (Math.hypot(worldX - centerX, worldY - centerY) <= range) {
        return true;
      }
    }
  }

  return false;
}

function canReceiveItem(itemId) {
  const def = ITEM_DEFS[itemId];
  if (!def) {
    return false;
  }
  if (def.kind === "accessory") {
    if (itemId === "aeroRig") {
      return !state.player.hasAeroRig;
    }
    if (itemId === "skyWings") {
      return !state.player.hasSkyWings && !state.player.hasSeraphWings;
    }
    if (itemId === "seraphWings") {
      return !state.player.hasSeraphWings;
    }
    return !state.player.unlockedAccessories?.[itemId];
  }
  if (def.kind === "armor") {
    return (state.player.armor || 0) < (def.defense ?? 0);
  }
  return true;
}

function canCraftRecipe(recipe) {
  if (recipe.station === "furnace" && !isNearFurnace()) {
    return false;
  }
  if (!canReceiveItem(recipe.outputId)) {
    return false;
  }
  return recipe.ingredients.every((ingredient) => getInventoryCount(ingredient.id) >= ingredient.count);
}

function craftRecipe(recipe) {
  if (!canCraftRecipe(recipe)) {
    announce(recipe.station === "furnace" && !isNearFurnace() ? "Stand near the village furnace to smelt ore." : "Missing materials for that recipe.");
    return;
  }

  for (const ingredient of recipe.ingredients) {
    removeInventory(ingredient.id, ingredient.count);
  }

  if (!addInventory(recipe.outputId, recipe.outputCount, { selectAdded: true })) {
    announce("That recipe cannot be crafted right now.");
    return;
  }

  const outputName = ITEM_DEFS[recipe.outputId].name;
  announce(`Crafted ${recipe.outputCount > 1 ? `${recipe.outputCount}x ` : ""}${outputName}.`);
}

function toggleCraftWindow() {
  if (state.tradeOpen) {
    state.tradeOpen = false;
  }
  if (state.cheatOpen) {
    state.cheatOpen = false;
  }
  state.craftOpen = !state.craftOpen;
  if (state.craftOpen) {
    state.craftScroll = 0;
    state.settingsOpen = false;
  } else {
    state.settingsOpen = false;
  }
}

function toggleCheatPanel() {
  state.tradeOpen = false;
  state.craftOpen = false;
  state.settingsOpen = false;
  state.cheatOpen = !state.cheatOpen;
  if (state.cheatOpen) {
    state.cheatScroll = 0;
  }
}

async function loadAssets() {
  const entries = Object.entries(ASSET_PATHS);
  await Promise.all(
    entries.map(async ([key, src]) => {
      try {
        const image = await loadImage(src);
        assets[key] = image;
      } catch (error) {
        console.warn(`Failed to load asset ${key}`, error);
        assets[key] = null;
      }
    })
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out while loading ${src}`));
    }, 2500);
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error(`Failed to load ${src}`));
    };
    image.src = new URL(src, window.location.href).href;
  });
}

function updateMouseWorld() {
  if (!state) {
    return;
  }
  input.worldX = input.mouseX + state.camera.x;
  input.worldY = input.mouseY + state.camera.y;
}

function update(dt) {
  const { player } = state;
  state.elapsed += dt;
  state.dayClock = (state.dayClock + dt) % DAY_LENGTH;
  const isVoidSeraphActive = state.boss?.kind === "void-seraph";
  state.celestialBlackHoleBlend = approach(state.celestialBlackHoleBlend ?? 0, isVoidSeraphActive ? 1 : 0, dt * 1.35);
  state.voidSeraphSkyBlend = approach(state.voidSeraphSkyBlend ?? 0, isVoidSeraphActive ? 1 : 0, dt * 1.35);
  state.message.ttl = Math.max(0, state.message.ttl - dt);
  state.dialogue = state.dialogue
    ? { ...state.dialogue, ttl: state.dialogue.ttl - dt }
    : null;
  if (state.dialogue && state.dialogue.ttl <= 0) {
    state.dialogue = null;
  }

  for (const cloud of state.clouds) {
    cloud.x = (cloud.x + cloud.speed * dt) % (WORLD_PIXEL_WIDTH + 480);
  }

  player.invuln = Math.max(0, player.invuln - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.placeCooldown = Math.max(0, player.placeCooldown - dt);
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  player.platformDropTimer = Math.max(0, player.platformDropTimer - dt);
  player.minigunOverheatTimer = Math.max(0, player.minigunOverheatTimer - dt);
  player.sandBurstTimer = Math.max(0, player.sandBurstTimer - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashMomentum = Math.max(0, player.dashMomentum - dt);
  player.wingFxTimer = Math.max(0, player.wingFxTimer - dt);
  if (player.minigunOverheatTimer === 0 && player.minigunHeat >= 5) {
    player.minigunHeat = 0;
  }
  const equippedWings = getEquippedWingDef();
  if (player.passiveRegen > 0 && player.health > 0 && player.health < player.maxHealth) {
    player.passiveRegenBuffer += player.passiveRegen * dt;
    if (player.passiveRegenBuffer >= 1) {
      const healAmount = Math.floor(player.passiveRegenBuffer);
      player.passiveRegenBuffer -= healAmount;
      healPlayer(healAmount);
    }
  } else if (player.passiveRegenBuffer > 0) {
    player.passiveRegenBuffer = Math.max(0, player.passiveRegenBuffer - dt * 0.5);
  }
  if (player.onGround) {
    player.airJumpAvailable = true;
    if (equippedWings) {
      player.wingFuel = getWingFlightTime(equippedWings, player);
    }
  }

  syncTradeState();
  updateSandCarbineBurst(dt);
  updateGustBowBurst(dt);

  updateHoveredTile();
  handleMetaActions();
  updatePlayerMovement(dt);
  updateToolActions(dt);
  updateWeaponHeat(dt);
  updatePlayerCombat();
  moveGroundEntity(player, dt, true);
  updateNpcs(dt);
  updateMobs(dt);
  updateBoss(dt);
  updateLava(dt);
  updateEnvironmentalHazards(dt);
  updateProjectiles(dt);
  updateBeams(dt);
  updatePortals(dt);
  updateDrops(dt);
  updateSpawner(dt);
  updateAmbientLeafFall(dt);
  updateParticles(dt);
  updateCombatTexts(dt);
  updateCamera(dt);

  if (player.y > WORLD_PIXEL_HEIGHT + 120) {
    respawnPlayer("You fell too deep and woke up back at camp.");
  }
}

function handleMetaActions() {
  if (input.pressed.has("Minus") || input.pressed.has("NumpadSubtract")) {
    addInventory("coin", 10);
    announce("Debug: +10 coins.");
  }

  if (input.pressed.has("StarKey") || input.pressed.has("NumpadMultiply")) {
    toggleCheatPanel();
    return;
  }

  if (state.cheatOpen) {
    handleCheatInput();
    return;
  }

  if (state.tradeOpen) {
    handleTradeInput();
    return;
  }

  if (state.craftOpen) {
    handleCraftInput();
    return;
  }

  if (input.pressed.has("Escape")) {
    toggleCraftWindow();
    return;
  }

  if (input.pressed.has("KeyE")) {
    interactWithNearbyObject();
  }

  if (input.pressed.has("KeyT")) {
    toggleTrade();
  }

  if (input.pressed.has("KeyQ")) {
    dropSelectedItem();
  }

  if (input.pressed.has("KeyB")) {
    announce(isNight() ? "Use a night summon item from the hotbar." : "Use a day summon item from the hotbar.");
  }
}

function interactWithNearbyObject() {
  const chest = getNearestSkyChest(74);
  if (chest && !chest.opened) {
    openSkyChest(chest);
    return;
  }
  interactWithNpc();
}

function updateHoveredTile() {
  const tx = Math.floor(input.worldX / TILE_SIZE);
  const ty = Math.floor(input.worldY / TILE_SIZE);

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  const distance = Math.hypot(tx * TILE_SIZE + TILE_SIZE * 0.5 - playerCenterX, ty * TILE_SIZE + TILE_SIZE * 0.5 - playerCenterY);

  state.hoveredTile = {
    x: tx,
    y: ty,
    distance,
    tile: getTile(state.world, tx, ty),
    flower: getFlower(state.world, tx, ty),
    inReach: distance <= INTERACT_RANGE,
  };
}

function updatePlayerMovement(dt) {
  const player = state.player;
  const equippedWings = getEquippedWingDef();
  const moveIntent = (input.down.has("KeyD") ? 1 : 0) - (input.down.has("KeyA") ? 1 : 0);
  const wantsDropThroughPlatform = input.down.has("KeyS") || input.down.has("ArrowDown");
  const dashPressed = input.pressed.has("ShiftLeft") || input.pressed.has("ShiftRight");
  const running = input.down.has("ShiftLeft") || input.down.has("ShiftRight");
  const speedMultiplier = 1 + (player.moveSpeedBonus ?? 0);
  const targetSpeed = moveIntent * (running ? 215 : 155) * speedMultiplier;
  const accel = player.onGround ? 1100 : 700;

  if (dashPressed && player.hasAeroRig && moveIntent !== 0 && player.dashCooldown <= 0) {
    player.vx = moveIntent * 560;
    player.vy = Math.min(player.vy, -55);
    player.dashCooldown = 0.72 * (player.dashCooldownMultiplier ?? 1);
    player.dashMomentum = 0.18;
    burstParticles(player.x + player.w * 0.5, player.y + player.h * 0.65, "#b9f5ff", 6, 56);
  }

  if (player.dashMomentum > 0) {
    player.vx = approach(player.vx, moveIntent * 210, 220 * dt);
  } else {
    player.vx = approach(player.vx, targetSpeed, accel * dt);
  }

  if (moveIntent === 0 && player.onGround) {
    player.vx = approach(player.vx, 0, 1450 * dt);
  }

  if (moveIntent !== 0) {
    player.facing = moveIntent;
  } else if (Math.abs(input.worldX - (player.x + player.w * 0.5)) > 12) {
    player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;
  }

  if (wantsDropThroughPlatform && player.onGround && isStandingOnPlatform(player)) {
    player.platformDropTimer = 0.22;
    player.onGround = false;
    player.y += 2;
  }

  if (input.pressed.has("Space")) {
    if (player.onGround) {
      player.vy = -365 - (player.jumpBoost ?? 0);
      player.onGround = false;
    } else if (player.hasAeroRig && player.airJumpAvailable) {
      player.airJumpAvailable = false;
      player.vy = -285 - (player.jumpBoost ?? 0) * 0.65;
      burstParticles(player.x + player.w * 0.5, player.y + player.h, "#c8fbff", 7, 62);
    }
  }

  if (!player.onGround && equippedWings && input.down.has("Space") && player.wingFuel > 0) {
    player.wingFuel = Math.max(0, player.wingFuel - dt);
    player.vy = Math.max(player.vy - equippedWings.flightLift * dt, -(equippedWings.maxRiseSpeed + (player.jumpBoost ?? 0) * 0.35));
    if (player.wingFxTimer <= 0) {
      player.wingFxTimer = 0.07;
      const wingColorA = equippedWings.id === "seraphWings" ? "#f3dcff" : "#d8f4ff";
      const wingColorB = equippedWings.id === "seraphWings" ? "#d19cff" : "#b6ddff";
      burstParticles(player.x + player.w * 0.5 - player.facing * 4, player.y + player.h * 0.58, wingColorA, 2, 16);
      burstParticles(player.x + player.w * 0.5 + player.facing * 4, player.y + player.h * 0.58, wingColorB, 2, 16);
    }
  }
}

function updateToolActions(dt) {
  if (state.tradeOpen || state.craftOpen || state.cheatOpen) {
    clearSepulcherOrbit();
    releaseActiveQuasar();
    clearActiveBeam();
    state.mineTarget = null;
    return;
  }

  const selected = getSelectedItem();
  const hovered = state.hoveredTile;

  if (!selected) {
    clearSepulcherOrbit();
    releaseActiveQuasar();
    clearActiveBeam();
    state.mineTarget = null;
    if (input.leftPressed) {
      announce("This slot is empty. Buy weapons from the merchant or pick up a dropped item.");
    }
    return;
  }

  if (selected.kind === "tool") {
    handleMining(dt, hovered, selected);
  } else {
    state.mineTarget = null;
  }

  if (selected.kind === "melee" && input.leftPressed && state.player.attackCooldown <= 0) {
    startSwing(selected);
  }

  const wantsVoidQuasar =
    selected.kind === "ranged" &&
    selected.id === "voidRelic" &&
    input.left &&
    !isWeaponLocked(selected) &&
    (state.player.attackCooldown <= 0 || !!state.activeQuasar);
  if (wantsVoidQuasar) {
    clearActiveBeam();
    updateVoidRelicQuasar(selected, dt);
  } else if (state.activeQuasar && selected.id !== "voidRelic") {
    releaseActiveQuasar();
  } else if (state.activeQuasar && !input.left) {
    releaseActiveQuasar();
  }

  const wantsContinuousLaser =
    selected.kind === "ranged" &&
    selected.projectile === "laser" &&
    input.left &&
    !isWeaponLocked(selected);
  const wantsSepulcherOrbit =
    selected.kind === "ranged" &&
    selected.id === "sepulcherChain" &&
    input.left &&
    !isWeaponLocked(selected);
  if (wantsSepulcherOrbit) {
    clearActiveBeam();
    if (!state.projectiles.some((projectile) => projectile.alive && projectile.owner === "player" && projectile.kind === "sepulcher-ring")) {
      startSepulcherOrbit(selected);
    }
  } else {
    clearSepulcherOrbit();
  }
  if (wantsContinuousLaser) {
    updateContinuousLaser(selected, dt);
  } else {
    clearActiveBeam();
    const wantsRangedShot =
      selected.kind === "ranged" &&
      selected.id !== "voidRelic" &&
      selected.id !== "sepulcherChain" &&
      selected.projectile !== "laser" &&
      state.player.attackCooldown <= 0 &&
      !isWeaponLocked(selected) &&
      ((selected.auto && input.left) || (!selected.auto && input.leftPressed));
    if (wantsRangedShot) {
      fireRangedWeapon(selected);
    }
  }

  if (selected.kind === "consumable" && input.leftPressed && state.player.attackCooldown <= 0) {
    useConsumable(selected);
  }

  if (input.rightPressed && tryToggleDoor(hovered)) {
    return;
  }

  if (selected.kind === "block" && input.right && state.player.placeCooldown <= 0) {
    tryPlaceBlock(selected, hovered);
  }
}

function syncTradeState() {
  if (!state.tradeOpen) {
    return;
  }

  if (!getMerchantInRange()) {
    state.tradeOpen = false;
    state.tradeScroll = 0;
    return;
  }

  adjustTradeScroll(0);
}

function handleTradeInput() {
  if (input.pressed.has("Escape") || input.pressed.has("KeyT")) {
    state.tradeOpen = false;
    return;
  }

  if (input.pressed.has("Digit1")) {
    buyFromMerchant(state.tradeScroll);
  }

  if (input.pressed.has("Digit2")) {
    buyFromMerchant(state.tradeScroll + 1);
  }

  if (input.pressed.has("Digit3")) {
    buyFromMerchant(state.tradeScroll + 2);
  }

  if (input.pressed.has("Digit4")) {
    buyFromMerchant(state.tradeScroll + 3);
  }
}

function handleCraftInput() {
  if (input.leftPressed && pointInRect(input.mouseX, input.mouseY, getCraftSettingsButtonRect())) {
    state.settingsOpen = !state.settingsOpen;
    return;
  }

  if (state.settingsOpen) {
    handleSettingsInput();
    return;
  }

  if (input.pressed.has("Escape")) {
    state.craftOpen = false;
    state.settingsOpen = false;
    return;
  }

  if (input.pressed.has("Digit1")) {
    craftVisibleRecipe(0);
  }
  if (input.pressed.has("Digit2")) {
    craftVisibleRecipe(1);
  }
  if (input.pressed.has("Digit3")) {
    craftVisibleRecipe(2);
  }
  if (input.pressed.has("Digit4")) {
    craftVisibleRecipe(3);
  }
  if (input.pressed.has("Digit5")) {
    craftVisibleRecipe(4);
  }
}

function handleSettingsInput() {
  if (input.pressed.has("Escape")) {
    state.settingsOpen = false;
    return;
  }

  if (input.leftPressed && pointInRect(input.mouseX, input.mouseY, getSettingsCloseButtonRect())) {
    state.settingsOpen = false;
    return;
  }

  if ((input.leftPressed && pointInRect(input.mouseX, input.mouseY, getSettingsWindowModeButtonRect())) || input.pressed.has("KeyF")) {
    const nextMode = state.desktopWindowMode === "fullscreen" ? "windowed" : "fullscreen";
    void setDesktopWindowMode(nextMode);
  }
}

function handleCheatInput() {
  if (input.pressed.has("Escape") || input.pressed.has("StarKey") || input.pressed.has("NumpadMultiply")) {
    state.cheatOpen = false;
    return;
  }

  if (input.pressed.has("Digit1")) {
    grantCheatItem(0);
  }
  if (input.pressed.has("Digit2")) {
    grantCheatItem(1);
  }
  if (input.pressed.has("Digit3")) {
    grantCheatItem(2);
  }
  if (input.pressed.has("Digit4")) {
    grantCheatItem(3);
  }
  if (input.pressed.has("Digit5")) {
    grantCheatItem(4);
  }
}

function handleMining(dt, hovered, pickaxe) {
  if (!hovered || !hovered.inReach || !input.left) {
    state.mineTarget = null;
    return;
  }

  const tile = getTile(state.world, hovered.x, hovered.y);
  const tileDef = TILE_DEFS[tile];
  const flower = getFlower(state.world, hovered.x, hovered.y);

  if (flower > 0) {
    const key = `flower:${hovered.x},${hovered.y}`;
    if (!state.mineTarget || state.mineTarget.key !== key) {
      state.mineTarget = { key, x: hovered.x, y: hovered.y, progress: 0, mineTime: FLOWER_MINE_TIME };
    }
    state.mineTarget.progress += dt * pickaxe.power * (1 + (state.player.miningPowerBonus ?? 0));
    if (state.mineTarget.progress >= FLOWER_MINE_TIME) {
      destroyFlower(hovered.x, hovered.y);
      state.mineTarget = null;
    }
    return;
  }

  if (!tileDef || tile === Tile.AIR) {
    state.mineTarget = null;
    return;
  }

  const key = `${hovered.x},${hovered.y}`;
  if (!state.mineTarget || state.mineTarget.key !== key) {
    state.mineTarget = { key, x: hovered.x, y: hovered.y, progress: 0 };
  }

  state.mineTarget.progress += dt * pickaxe.power * (1 + (state.player.miningPowerBonus ?? 0));

  if (state.mineTarget.progress >= tileDef.mineTime) {
    mineTile(hovered.x, hovered.y);
    state.mineTarget = null;
  }
}

function mineTile(x, y) {
  destroyFlower(x, y, { silent: true });
  const tile = getTile(state.world, x, y);
  const tileDef = TILE_DEFS[tile];
  if (!tileDef || tile === Tile.AIR) {
    return;
  }

  if (isDoorTile(tile)) {
    const base = getDoorBasePosition(x, y, tile);
    setTile(state.world, base.x, base.y, Tile.AIR);
    setTile(state.world, base.x, base.y - 1, Tile.AIR);
    addInventory("wood", 1);
    burstParticles((base.x + 0.5) * TILE_SIZE, (base.y - 0.2) * TILE_SIZE, pickDustColor(Tile.WOOD), 12, 110);
    return;
  }

  setTile(state.world, x, y, Tile.AIR);
  if (tileDef.item) {
    addInventory(tileDef.item, 1);
  }
  burstParticles((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE, pickDustColor(tile), 10, 110);
}

function isDoorTile(tile) {
  return tile === Tile.DOOR_CLOSED_BOTTOM || tile === Tile.DOOR_CLOSED_TOP || tile === Tile.DOOR_OPEN_BOTTOM || tile === Tile.DOOR_OPEN_TOP;
}

function isDoorOpenTile(tile) {
  return tile === Tile.DOOR_OPEN_BOTTOM || tile === Tile.DOOR_OPEN_TOP;
}

function getDoorBasePosition(x, y, tile) {
  const isTop = tile === Tile.DOOR_CLOSED_TOP || tile === Tile.DOOR_OPEN_TOP;
  return { x, y: isTop ? y + 1 : y };
}

function setDoorOpenState(x, y, open) {
  const bottomTile = getTile(state.world, x, y);
  const topTile = getTile(state.world, x, y - 1);
  if (!isDoorTile(bottomTile) && !isDoorTile(topTile)) {
    return false;
  }

  setTile(state.world, x, y, open ? Tile.DOOR_OPEN_BOTTOM : Tile.DOOR_CLOSED_BOTTOM);
  setTile(state.world, x, y - 1, open ? Tile.DOOR_OPEN_TOP : Tile.DOOR_CLOSED_TOP);
  return true;
}

function getDoorKey(x, y) {
  return `${x},${y}`;
}

function parseDoorKey(key) {
  if (!key) {
    return null;
  }
  const [x, y] = key.split(",").map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

function isDoorwayOccupied(baseX, baseY, ignoreEntity = null) {
  const doorwayRect = { x: baseX * TILE_SIZE, y: (baseY - 1) * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE * 2 };
  if (!ignoreEntity || ignoreEntity !== state.player) {
    if (overlaps(doorwayRect, state.player)) {
      return true;
    }
  }
  for (const npc of state.npcs) {
    if (npc === ignoreEntity) {
      continue;
    }
    if (overlaps(doorwayRect, npc)) {
      return true;
    }
  }
  return false;
}

function tryNpcUseDoor(npc, direction) {
  const sampleX = direction > 0 ? npc.x + npc.w + 2 : npc.x - 2;
  const sampleYs = [npc.y + npc.h - 6, npc.y + npc.h - 18];
  for (const sampleY of sampleYs) {
    const tileX = Math.floor(sampleX / TILE_SIZE);
    const tileY = Math.floor(sampleY / TILE_SIZE);
    const tile = getTile(state.world, tileX, tileY);
    if (!isDoorTile(tile)) {
      continue;
    }
    const base = getDoorBasePosition(tileX, tileY, tile);
    if (!isDoorOpenTile(tile)) {
      setDoorOpenState(base.x, base.y, true);
      burstParticles((base.x + 0.5) * TILE_SIZE, (base.y - 0.3) * TILE_SIZE, pickDustColor(Tile.WOOD), 4, 24);
    }
    npc.openedDoorKey = getDoorKey(base.x, base.y);
    npc.openedDoorCloseTimer = 0.7;
    return true;
  }
  return false;
}

function updateNpcOpenedDoor(npc, dt) {
  npc.openedDoorCloseTimer = Math.max(0, (npc.openedDoorCloseTimer ?? 0) - dt);
  const base = parseDoorKey(npc.openedDoorKey);
  if (!base) {
    npc.openedDoorKey = null;
    return;
  }
  const bottomTile = getTile(state.world, base.x, base.y);
  const topTile = getTile(state.world, base.x, base.y - 1);
  if (!isDoorTile(bottomTile) && !isDoorTile(topTile)) {
    npc.openedDoorKey = null;
    npc.openedDoorCloseTimer = 0;
    return;
  }

  const doorCenterX = (base.x + 0.5) * TILE_SIZE;
  const doorCenterY = (base.y - 0.5) * TILE_SIZE;
  const npcCenterX = npc.x + npc.w * 0.5;
  const npcCenterY = npc.y + npc.h * 0.5;
  const farEnough = Math.abs(npcCenterX - doorCenterX) > 18 || Math.abs(npcCenterY - doorCenterY) > 26;
  if (npc.openedDoorCloseTimer <= 0 && farEnough && !isDoorwayOccupied(base.x, base.y, npc)) {
    setDoorOpenState(base.x, base.y, false);
    burstParticles((base.x + 0.5) * TILE_SIZE, (base.y - 0.3) * TILE_SIZE, pickDustColor(Tile.WOOD), 3, 18);
    npc.openedDoorKey = null;
  }
}

function tryToggleDoor(hovered) {
  if (!hovered || !hovered.inReach) {
    return false;
  }
  const tile = getTile(state.world, hovered.x, hovered.y);
  if (!isDoorTile(tile)) {
    return false;
  }

  const base = getDoorBasePosition(hovered.x, hovered.y, tile);
  const bottomTile = getTile(state.world, base.x, base.y);
  const topTile = getTile(state.world, base.x, base.y - 1);
  const opening = bottomTile === Tile.DOOR_CLOSED_BOTTOM || topTile === Tile.DOOR_CLOSED_TOP;

  setTile(state.world, base.x, base.y, opening ? Tile.DOOR_OPEN_BOTTOM : Tile.DOOR_CLOSED_BOTTOM);
  setTile(state.world, base.x, base.y - 1, opening ? Tile.DOOR_OPEN_TOP : Tile.DOOR_CLOSED_TOP);
  state.player.placeCooldown = 0.1;
  burstParticles((base.x + 0.5) * TILE_SIZE, (base.y - 0.3) * TILE_SIZE, pickDustColor(Tile.WOOD), 4, 26);
  return true;
}

function tryPlaceBlock(item, hovered) {
  if (!hovered || !hovered.inReach) {
    return;
  }

  const entry = getInventoryEntry(item.id);
  if (!entry || entry.count <= 0) {
    announce("That slot is empty.");
    return;
  }

  if (getTile(state.world, hovered.x, hovered.y) !== Tile.AIR) {
    return;
  }

  const tile = item.tile;
  const placementRect = {
    x: hovered.x * TILE_SIZE,
    y: hovered.y * TILE_SIZE,
    w: TILE_SIZE,
    h: TILE_SIZE,
  };

  if (TILE_DEFS[tile].solid && overlaps(placementRect, state.player)) {
    return;
  }

  if (TILE_DEFS[tile].solid) {
    for (const npc of state.npcs) {
      if (overlaps(placementRect, npc)) {
        return;
      }
    }
    for (const mob of state.mobs) {
      if (overlaps(placementRect, mob)) {
        return;
      }
    }
  }

  removeInventory(item.id, 1);
  destroyFlower(hovered.x, hovered.y, { silent: true });
  setTile(state.world, hovered.x, hovered.y, tile);
  state.player.placeCooldown = 0.12;
  burstParticles((hovered.x + 0.5) * TILE_SIZE, (hovered.y + 0.5) * TILE_SIZE, pickDustColor(tile), 7, 70);
}

function startSwing(weapon) {
  const player = state.player;
  const pivotX = player.x + player.w * 0.5 + player.facing * 2;
  const pivotY = player.y + 13;
  const aimAngle = Math.atan2(input.worldY - pivotY, input.worldX - pivotX);
  player.attackTimer = 0.18;
  player.attackCooldown = 0.24;
  player.swingId += 1;
  player.attackDamage = weapon.damage;
  player.attackItemId = weapon.id;
  player.swingImpulseFired = false;
  player.swingStartAngle = aimAngle - Math.PI * 0.5;
  player.swingEndAngle = aimAngle + Math.PI * 0.5;
  player.swingReach = 38;
  player.swingRadius = 12;
  player.facing = Math.cos(aimAngle) >= 0 ? 1 : -1;
}

function spawnProjectile(config) {
  state.projectiles.push({
    id: config.id ?? `${config.kind}-${performance.now()}-${Math.random()}`,
    owner: config.owner ?? "player",
    kind: config.kind,
    x: config.x,
    y: config.y,
    vx: config.vx,
    vy: config.vy,
    radius: config.radius ?? 4,
    baseRadius: config.baseRadius ?? config.radius ?? 4,
    targetRadius: config.targetRadius ?? config.radius ?? 4,
    growDuration: config.growDuration ?? 0,
    gravity: config.gravity ?? 0,
    damage: config.damage ?? 0,
    knockbackX: config.knockbackX ?? 0,
    knockbackY: config.knockbackY ?? 0,
    color: config.color ?? "#ffffff",
    impactParticles: config.impactParticles ?? (config.kind === "arrow" ? 4 : 6),
    impactForce: config.impactForce ?? (config.kind === "arrow" ? 36 : 56),
	    trailColor: config.trailColor ?? null,
	    trailInterval: config.trailInterval ?? 0,
	    trailTimer: config.trailInterval ?? 0,
      trailHistoryLength: config.trailHistoryLength ?? 0,
      trailHistory: config.trailHistoryLength > 0 ? Array.from({ length: config.trailHistoryLength }, () => ({ x: config.x, y: config.y, rotation: config.rotation ?? Math.atan2(config.vy || 0, config.vx || 1) })) : [],
	    rotation: config.rotation ?? Math.atan2(config.vy || 0, config.vx || 1),
    spinSpeed: config.spinSpeed ?? 0,
    lightRadius: config.lightRadius ?? 0,
    orbiting: config.orbiting ?? false,
    orbitRadius: config.orbitRadius ?? 0,
    orbitAngle: config.orbitAngle ?? 0,
    orbitSpeed: config.orbitSpeed ?? 0,
    orbitAnchorX: config.orbitAnchorX ?? config.x,
    orbitAnchorY: config.orbitAnchorY ?? config.y,
    orbitFollowSpeed: config.orbitFollowSpeed ?? 0,
    age: config.age ?? 0,
    spawnX: config.spawnX ?? config.x,
    spawnY: config.spawnY ?? config.y,
    boomerang: config.boomerang ?? false,
    returning: config.returning ?? false,
    returnDelay: config.returnDelay ?? 0,
    maxTravel: config.maxTravel ?? 0,
	    ignoreWorld: config.ignoreWorld ?? false,
	    remainingHits: config.remainingHits ?? 0,
	    infinitePierce: config.infinitePierce ?? false,
      bypassTargetInvuln: config.bypassTargetInvuln ?? false,
      homingStrength: config.homingStrength ?? 0,
      homingRange: config.homingRange ?? 0,
	    hitTargets: config.hitTargets ?? new Set(),
    hitEffect: config.hitEffect ?? null,
	    hitEffectDamage: config.hitEffectDamage ?? 0,
	    hitEffectTicks: config.hitEffectTicks ?? 0,
	    hitEffectInterval: config.hitEffectInterval ?? 0,
	    stormspineTwister: config.stormspineTwister ?? false,
	    stormspineCurveDelay: config.stormspineCurveDelay ?? 0,
	    stormspineCurveDuration: config.stormspineCurveDuration ?? 0,
	    stormspineCurveDirection: config.stormspineCurveDirection ?? 0,
	    stormspineCurveRadius: config.stormspineCurveRadius ?? 0,
	    stormspineCurveStartX: config.stormspineCurveStartX ?? 0,
	    stormspineCurveStartY: config.stormspineCurveStartY ?? 0,
	    stormspineCurveBaseAngle: config.stormspineCurveBaseAngle ?? 0,
	    stormspineCurveSpeed: config.stormspineCurveSpeed ?? 0,
	    stormspineCurveStarted: config.stormspineCurveStarted ?? false,
	    lifetime: config.lifetime ?? 0,
      harmless: config.harmless ?? false,
	    splitOnDestroy: config.splitOnDestroy ?? false,
	    splitCount: config.splitCount ?? 0,
	    splitDamage: config.splitDamage ?? 0,
    alive: true,
  });
}

function spawnBeam(config) {
  const life = config.ttl ?? 0.09;
  state.beams.push({
    id: config.id ?? `beam-${performance.now()}-${Math.random()}`,
    owner: config.owner ?? "player",
    x1: config.x1,
    y1: config.y1,
    x2: config.x2,
    y2: config.y2,
    color: config.color ?? "#9af0ff",
    glowColor: config.glowColor ?? "rgba(132, 241, 255, 0.32)",
    coreColor: config.coreColor ?? "#f2ffff",
    width: config.width ?? 6,
    lightRadius: config.lightRadius ?? 24,
    ttl: life,
    life,
  });
}

function spawnPortal(config) {
  const life = config.ttl ?? 0.6;
  state.portals.push({
    id: config.id ?? `portal-${performance.now()}-${Math.random()}`,
    x: config.x,
    y: config.y,
    radius: config.radius ?? 18,
    ttl: life,
    life,
    color: config.color ?? "#dff7ff",
    glowColor: config.glowColor ?? "rgba(167, 227, 255, 0.34)",
    wobble: Math.random() * Math.PI * 2,
  });
}

function traceBeamToWorld(originX, originY, dirX, dirY, maxDistance = Math.hypot(WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT)) {
  const step = 6;
  let distance = 0;
  let lastSafeDistance = 0;

  while (distance < maxDistance) {
    const nextDistance = Math.min(maxDistance, distance + step);
    const x = originX + dirX * nextDistance;
    const y = originY + dirY * nextDistance;

    if (x < 0 || x > WORLD_PIXEL_WIDTH || y < 0 || y > WORLD_PIXEL_HEIGHT) {
      return {
        x: clamp(x, 0, WORLD_PIXEL_WIDTH),
        y: clamp(y, 0, WORLD_PIXEL_HEIGHT),
        distance: nextDistance,
        hitWorld: false,
      };
    }

    if (isSolidTile(getTileAtPixel(x, y))) {
      let low = lastSafeDistance;
      let high = nextDistance;
      for (let i = 0; i < 6; i += 1) {
        const mid = (low + high) * 0.5;
        const midX = originX + dirX * mid;
        const midY = originY + dirY * mid;
        if (isSolidTile(getTileAtPixel(midX, midY))) {
          high = mid;
        } else {
          low = mid;
        }
      }
      return {
        x: originX + dirX * low,
        y: originY + dirY * low,
        distance: low,
        hitWorld: true,
      };
    }

    lastSafeDistance = nextDistance;
    distance = nextDistance;
  }

  return {
    x: originX + dirX * maxDistance,
    y: originY + dirY * maxDistance,
    distance: maxDistance,
    hitWorld: false,
  };
}

function rayRectDistance(originX, originY, dirX, dirY, rect) {
  let tMin = 0;
  let tMax = Infinity;

  if (Math.abs(dirX) < 1e-6) {
    if (originX < rect.x || originX > rect.x + rect.w) {
      return null;
    }
  } else {
    const tx1 = (rect.x - originX) / dirX;
    const tx2 = (rect.x + rect.w - originX) / dirX;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(dirY) < 1e-6) {
    if (originY < rect.y || originY > rect.y + rect.h) {
      return null;
    }
  } else {
    const ty1 = (rect.y - originY) / dirY;
    const ty2 = (rect.y + rect.h - originY) / dirY;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  if (tMax < tMin || tMax < 0) {
    return null;
  }

  return tMin >= 0 ? tMin : 0;
}

function clearActiveBeam() {
  state.activeBeam = null;
  state.player.laserDamageTimer = 0;
}

function releaseActiveQuasar() {
  const quasar = state.activeQuasar;
  if (!quasar) {
    return;
  }

  const blastRadius = quasar.explosionRadius ?? 78;
  burstParticles(quasar.x, quasar.y, "#0f1720", 22, 180);
  burstParticles(quasar.x, quasar.y, "#d9f7ff", 16, 132);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + state.elapsed * 0.7;
    spawnBeam({
      x1: quasar.x,
      y1: quasar.y,
      x2: quasar.x + Math.cos(angle) * blastRadius,
      y2: quasar.y + Math.sin(angle) * blastRadius,
      color: "#d9f7ff",
      glowColor: "rgba(155, 226, 255, 0.28)",
      coreColor: "#ffffff",
      width: 6,
      lightRadius: 32,
      ttl: 0.14,
    });
  }

  for (const mob of state.mobs) {
    if (!mob.alive || !circleRectCollision(quasar.x, quasar.y, blastRadius, mob)) {
      continue;
    }
    damageMob(mob, quasar.explosionDamage ?? 25, 0, 0, {
      bypassInvuln: true,
      invulnDuration: 0.02,
      particleCount: 14,
      particleForce: 160,
    });
  }

  if (state.boss && circleRectCollision(quasar.x, quasar.y, blastRadius, state.boss)) {
    damageBoss(quasar.explosionDamage ?? 25, 0, 0, {
      bypassInvuln: true,
      invulnDuration: 0.02,
      ignoreArmor: true,
      particleCount: 16,
      particleForce: 170,
    });
  }

  state.activeQuasar = null;
  state.player.attackCooldown = Math.max(state.player.attackCooldown, ITEM_DEFS.voidRelic.cooldown);
}

function updateVoidRelicQuasar(weapon, dt) {
  const player = state.player;
  if (!state.activeQuasar) {
    if (player.attackCooldown > 0) {
      return;
    }
    player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;
    state.activeQuasar = {
      x: player.x + player.w * 0.5 + player.facing * 18,
      y: player.y + player.h * 0.42,
      radius: 24,
      damage: 10,
      explosionDamage: 100,
      explosionRadius: 78,
      damageTimer: 0,
      fxTimer: 0,
      rotation: 0,
      pulse: 0,
    };
  }

  const quasar = state.activeQuasar;
  const targetX = clamp(input.worldX, quasar.radius, WORLD_PIXEL_WIDTH - quasar.radius);
  const targetY = clamp(input.worldY, quasar.radius, WORLD_PIXEL_HEIGHT - quasar.radius);
  const follow = 1 - Math.exp(-10 * dt);
  quasar.x = lerp(quasar.x, targetX, follow);
  quasar.y = lerp(quasar.y, targetY, follow);
  quasar.rotation += dt * 2.8;
  quasar.pulse += dt * 5.2;

  quasar.fxTimer -= dt;
  if (quasar.fxTimer <= 0) {
    quasar.fxTimer += 0.05;
    burstParticles(quasar.x, quasar.y, Math.random() < 0.5 ? "#121a24" : "#d7f6ff", 2, 18);
  }

  quasar.damageTimer -= dt;
  const damageInterval = 1 / 60;
  while (quasar.damageTimer <= 0) {
    quasar.damageTimer += damageInterval;
    for (const mob of state.mobs) {
      if (!mob.alive || !circleRectCollision(quasar.x, quasar.y, quasar.radius, mob)) {
        continue;
      }
      damageMob(mob, quasar.damage, 0, 0, {
        bypassInvuln: true,
        invulnDuration: 0,
        particleCount: 0,
      });
    }

    if (state.boss && circleRectCollision(quasar.x, quasar.y, quasar.radius, state.boss)) {
      damageBoss(quasar.damage, 0, 0, {
        bypassInvuln: true,
        invulnDuration: 0,
        ignoreArmor: true,
        particleCount: 0,
      });
    }
  }
}

function applyContinuousLaserDamage(weapon, originX, originY, dirX, dirY, maxDistance) {
  const impactProjectile = {
    kind: "laser",
    vx: dirX,
    vy: dirY,
    knockbackX: 88,
    knockbackY: -28,
  };

  for (const mob of state.mobs) {
    if (!mob.alive) {
      continue;
    }
    const hitDistance = rayRectDistance(originX, originY, dirX, dirY, mob);
    if (hitDistance === null || hitDistance > maxDistance) {
      continue;
    }
    applyProjectileImpactToMob(mob, impactProjectile);
    damageMob(mob, weapon.damage, Math.sign(dirX || 1) * impactProjectile.knockbackX, impactProjectile.knockbackY);
    burstParticles(originX + dirX * hitDistance, originY + dirY * hitDistance, weapon.projectileColor ?? "#9af0ff", 6, 56);
  }

  if (state.boss) {
    const hitDistance = rayRectDistance(originX, originY, dirX, dirY, state.boss);
    if (hitDistance !== null && hitDistance <= maxDistance) {
      applyProjectileImpactToBoss(state.boss, impactProjectile);
      damageBoss(weapon.damage, Math.sign(dirX || 1) * impactProjectile.knockbackX, impactProjectile.knockbackY, { pierceArmor: 8 });
      burstParticles(originX + dirX * hitDistance, originY + dirY * hitDistance, weapon.projectileColor ?? "#9af0ff", 8, 62);
    }
  }
}

function updateContinuousLaser(weapon, dt) {
  const player = state.player;
  player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;
  const originX = player.x + player.w * 0.5 + player.facing * 10;
  const originY = player.y + player.h * 0.38;
  const aimAngle = Math.atan2(input.worldY - originY, input.worldX - originX);
  const dirX = Math.cos(aimAngle);
  const dirY = Math.sin(aimAngle);
  const worldHit = traceBeamToWorld(originX, originY, dirX, dirY);
  const damageInterval = 5 / 60;

  state.activeBeam = {
    owner: "player",
    x1: originX,
    y1: originY,
    x2: worldHit.x,
    y2: worldHit.y,
    color: weapon.projectileColor ?? "#9af0ff",
    glowColor: weapon.projectileTrail ?? "rgba(149, 240, 255, 0.48)",
    coreColor: "#f2ffff",
    width: 7,
    lightRadius: weapon.projectileLightRadius ?? 26,
    ttl: damageInterval,
    life: damageInterval,
  };

  player.laserDamageTimer -= dt;
  if (player.laserDamageTimer > 0) {
    return;
  }

  while (player.laserDamageTimer <= 0) {
    player.laserDamageTimer += damageInterval;
  }

  applyContinuousLaserDamage(weapon, originX, originY, dirX, dirY, worldHit.distance);
  burstParticles(originX, originY, weapon.projectileColor ?? "#9af0ff", 4, 34);
  burstParticles(
    worldHit.x,
    worldHit.y,
    worldHit.hitWorld ? "#c8fbff" : weapon.projectileColor ?? "#9af0ff",
    worldHit.hitWorld ? 6 : 3,
    worldHit.hitWorld ? 46 : 20
  );
}

function startSandCarbineBurst(weapon) {
  const player = state.player;
  player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;
  player.sandBurstBaseAngle = Math.atan2(input.worldY - (player.y + player.h * 0.38), input.worldX - (player.x + player.w * 0.5 + player.facing * 10));
  player.sandBurstShotsRemaining = 2;
  player.sandBurstTimer = 10 / 60;
  fireRangedWeapon(weapon, { manageCooldown: false, baseAimAngle: player.sandBurstBaseAngle });
}

function updateSandCarbineBurst() {
  const player = state.player;
  if (player.sandBurstShotsRemaining <= 0 || player.sandBurstTimer > 0) {
    return;
  }

  const weapon = ITEM_DEFS.sandCarbine;
  while (player.sandBurstShotsRemaining > 0 && player.sandBurstTimer <= 0) {
    fireRangedWeapon(weapon, { manageCooldown: false, baseAimAngle: player.sandBurstBaseAngle });
    player.sandBurstShotsRemaining -= 1;
    if (player.sandBurstShotsRemaining > 0) {
      player.sandBurstTimer += 10 / 60;
    } else {
      player.sandBurstTimer = 0;
      player.attackCooldown = weapon.cooldown;
    }
  }
}

function startGustBowBurst(weapon) {
  const player = state.player;
  const targetX = clamp(input.worldX, 24, WORLD_PIXEL_WIDTH - 24);
  const targetY = clamp(input.worldY, 24, WORLD_PIXEL_HEIGHT - 24);
  const minPortalCount = Math.max(1, weapon.portalMinCount ?? 2);
  const maxPortalCount = Math.max(minPortalCount, weapon.portalMaxCount ?? minPortalCount);
  const portalCount =
    minPortalCount === maxPortalCount
      ? minPortalCount
      : minPortalCount + Math.floor(Math.random() * (maxPortalCount - minPortalCount + 1));
  const portalSpread = weapon.portalSpread ?? 84;
  const portalLifetime = (weapon.burstTicks ?? 6) * (weapon.burstInterval ?? 0.08) + 0.28;
  const portals = [];

  player.facing = targetX >= player.x + player.w * 0.5 ? 1 : -1;
  player.gustBurstTargetX = targetX;
  player.gustBurstTargetY = targetY;
  player.gustBurstBaseAngle = Math.PI * 0.5;
  player.gustBurstShotsRemaining = weapon.burstTicks ?? 5;
  player.gustBurstTimer = 0;
  player.gustBurstPortalIndex = 0;
  for (let index = 0; index < portalCount; index += 1) {
    const spreadOffset = portalCount === 1 ? 0 : (index / (portalCount - 1) - 0.5) * portalSpread;
    const x = clamp(targetX + spreadOffset + (Math.random() - 0.5) * 18, 20, WORLD_PIXEL_WIDTH - 20);
    const y = clamp(
      targetY - (weapon.portalHeightMin ?? 72) - Math.random() * ((weapon.portalHeightMax ?? 114) - (weapon.portalHeightMin ?? 72)),
      18,
      WORLD_PIXEL_HEIGHT - 36,
    );
    portals.push({ x, y });
    spawnPortal({
      x,
      y,
      radius: 16 + Math.random() * 4,
      ttl: portalLifetime,
      color: weapon.projectileColor ?? "#e7f8ff",
      glowColor: weapon.projectileTrail ?? "rgba(208, 242, 255, 0.4)",
    });
    burstParticles(x, y, weapon.projectileColor ?? "#e7f8ff", 5, 34);
  }
  player.gustBurstPortals = portals;
  player.attackCooldown = weapon.cooldown;
}

function updateGustBowBurst(dt) {
  const player = state.player;
  player.gustBurstTimer = Math.max(0, player.gustBurstTimer - dt);
  if (player.gustBurstShotsRemaining <= 0) {
    if (player.gustBurstPortals.length > 0) {
      player.gustBurstPortals = [];
      player.gustBurstPortalIndex = 0;
    }
    player.gustBurstTimer = 0;
    return;
  }

  const weapon = ITEM_DEFS.gustBow;
  while (player.gustBurstShotsRemaining > 0 && player.gustBurstTimer <= 0) {
    fireGustBeamTick(weapon, player.gustBurstBaseAngle);
    player.gustBurstShotsRemaining -= 1;
    if (player.gustBurstShotsRemaining > 0) {
      player.gustBurstTimer += weapon.burstInterval ?? (1 / 60);
    } else {
      player.gustBurstTimer = 0;
      player.gustBurstPortals = [];
      player.gustBurstPortalIndex = 0;
    }
  }
}

function fireGustBeamTick(weapon, baseAngle) {
  const player = state.player;
  const portals = player.gustBurstPortals;
  if (!portals.length) {
    return;
  }

  const portal = portals[player.gustBurstPortalIndex % portals.length];
  player.gustBurstPortalIndex += 1;
  const targetX = clamp(player.gustBurstTargetX + (Math.random() - 0.5) * 28, 12, WORLD_PIXEL_WIDTH - 12);
  const targetY = clamp(player.gustBurstTargetY + (Math.random() - 0.5) * 18, 12, WORLD_PIXEL_HEIGHT - 12);
  const dx = targetX - portal.x;
  const dy = Math.max(28, targetY - portal.y);
  const vx = clamp(dx * 2.15 + (Math.random() - 0.5) * 24, -150, 150);
  const vy = Math.max(220, dy * 2.65) + Math.random() * 28;
  const angle = Math.atan2(vy, vx || 0.001);

  spawnProjectile({
    owner: "player",
    kind: weapon.projectile,
    x: portal.x,
    y: portal.y + 6,
    vx,
    vy,
    radius: weapon.projectileRadius ?? 5,
    gravity: weapon.projectileGravity ?? 260,
    damage: weapon.damage,
    knockbackX: weapon.projectileKnockbackX ?? 42,
    knockbackY: weapon.projectileKnockbackY ?? -82,
    color: weapon.projectileColor ?? "#e7f8ff",
    impactParticles: 5,
    impactForce: 40,
    trailColor: weapon.projectileTrail ?? "rgba(208, 242, 255, 0.4)",
    trailInterval: weapon.projectileTrailInterval ?? 0.05,
    rotation: angle,
    lightRadius: weapon.projectileLightRadius ?? 18,
    infinitePierce: true,
    hitTargets: new Set(),
  });

  burstParticles(portal.x, portal.y + 4, weapon.projectileColor ?? "#e7f8ff", 4, 28);
}

function startSepulcherOrbit(weapon) {
  const player = state.player;
  const orbitCount = Math.max(1, weapon.orbitCount ?? 4);
  const orbitRadius = weapon.orbitRadius ?? (16 * 7);
  const orbitSpeed = weapon.orbitSpeed ?? 2.3;
  const orbitLifetime = weapon.orbitLifetime ?? 3.2;

  for (const projectile of state.projectiles) {
    if (projectile.alive && projectile.owner === "player" && projectile.kind === "sepulcher-ring") {
      projectile.alive = false;
    }
  }

  player.attackCooldown = weapon.cooldown;
  player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;

  for (let index = 0; index < orbitCount; index += 1) {
    const orbitAngle = (index / orbitCount) * Math.PI * 2;
    spawnProjectile({
      owner: "player",
      kind: "sepulcher-ring",
      x: player.x + player.w * 0.5 + Math.cos(orbitAngle) * orbitRadius,
      y: player.y + player.h * 0.5 + Math.sin(orbitAngle) * orbitRadius,
      vx: 0,
      vy: 0,
      radius: weapon.projectileRadius ?? 8,
      damage: weapon.damage,
      knockbackX: weapon.projectileKnockbackX ?? 144,
      knockbackY: weapon.projectileKnockbackY ?? -88,
      color: weapon.projectileColor ?? "#d6c3a4",
      impactParticles: weapon.impactParticles ?? 10,
      impactForce: weapon.impactForce ?? 68,
      trailColor: weapon.projectileTrail ?? "rgba(214, 196, 165, 0.4)",
      trailInterval: weapon.projectileTrailInterval ?? 0.05,
      lightRadius: weapon.projectileLightRadius ?? 24,
      infinitePierce: true,
      ignoreWorld: true,
      hitTargets: new Set(),
      hitEffect: weapon.hitEffect ?? null,
      hitEffectDamage: weapon.hitEffectDamage ?? 0,
      hitEffectTicks: weapon.hitEffectTicks ?? 0,
      hitEffectInterval: weapon.hitEffectInterval ?? 0,
      orbiting: true,
      orbitAnchorX: player.x + player.w * 0.5,
      orbitAnchorY: player.y + player.h * 0.5,
      orbitFollowSpeed: 1800,
      orbitRadius,
      orbitAngle,
      orbitSpeed,
      lifetime: orbitLifetime,
      rotation: orbitAngle,
      spinSpeed: orbitSpeed,
    });
  }

  burstParticles(player.x + player.w * 0.5, player.y + player.h * 0.5, weapon.projectileColor ?? "#d6c3a4", 14, 44);
}

function clearSepulcherOrbit() {
  for (const projectile of state.projectiles) {
    if (projectile.alive && projectile.owner === "player" && projectile.kind === "sepulcher-ring") {
      projectile.alive = false;
    }
  }
}

function fireRangedWeapon(weapon, options = {}) {
  const player = state.player;
  const manageCooldown = options.manageCooldown ?? true;
  const baseAimAngle = options.baseAimAngle ?? null;
  if (isWeaponLocked(weapon)) {
    return;
  }

  if (weapon.id === "sandCarbine" && manageCooldown) {
    if (player.sandBurstShotsRemaining > 0 || player.sandBurstTimer > 0) {
      return;
    }
    startSandCarbineBurst(weapon);
    return;
  }

  if (weapon.id === "gustBow" && manageCooldown) {
    if (player.gustBurstShotsRemaining > 0 || player.gustBurstTimer > 0) {
      return;
    }
    startGustBowBurst(weapon);
    return;
  }

  if (weapon.id === "sepulcherChain" && manageCooldown) {
    startSepulcherOrbit(weapon);
    return;
  }

  player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;
  const originX = player.x + player.w * 0.5 + player.facing * 10;
  const originY = player.y + player.h * 0.38;
  const targetAngle = baseAimAngle ?? Math.atan2(input.worldY - originY, input.worldX - originX);
  const speed = weapon.speed;
  const isArrow = weapon.projectile === "arrow";
  const isLaser = weapon.projectile === "laser";
  const isBullet = weapon.projectile === "bullet";
  const isEmberOrb = weapon.projectile === "ember-orb";
  const isGraveSkull = weapon.projectile === "grave-skull";
  const isVoidOrb = weapon.projectile === "void-orb";
  const isShadowDagger = weapon.projectile === "shadow-dagger";
  const isSunshardCore = weapon.projectile === "sunshard-core";
  const isFlame = weapon.projectile === "flame";
  const projectileColor =
    weapon.projectileColor ??
    (isArrow ? "#f0d9a3" : isLaser ? "#8feeff" : isEmberOrb ? "#ffbb74" : isGraveSkull ? "#baa0ff" : isVoidOrb || isShadowDagger ? "#d488ff" : isSunshardCore ? "#fff1a1" : isFlame ? "#ff8d5b" : "#ffd77d");
  const projectileTrail =
    weapon.projectileTrail ??
    (isBullet
      ? "rgba(247, 230, 184, 0.55)"
	      : isLaser
	        ? "rgba(149, 240, 255, 0.48)"
	        : isEmberOrb
	          ? "rgba(255, 164, 95, 0.5)"
	          : isFlame
	            ? "rgba(255, 126, 90, 0.42)"
	          : isGraveSkull
	            ? "rgba(185, 161, 255, 0.38)"
              : isVoidOrb || isShadowDagger
                ? "rgba(211, 137, 255, 0.42)"
              : isSunshardCore
                ? "rgba(255, 236, 148, 0.42)"
              : null);

  if (manageCooldown) {
    player.attackCooldown = weapon.cooldown;
  }

  if (isLaser) {
    updateContinuousLaser(weapon, 0);
    return;
  }

  const minProjectileCount = Math.max(1, weapon.minProjectileCount ?? weapon.pelletCount ?? 1);
  const maxProjectileCount = Math.max(minProjectileCount, weapon.maxProjectileCount ?? weapon.pelletCount ?? minProjectileCount);
  const pelletCount =
    minProjectileCount === maxProjectileCount
      ? minProjectileCount
      : minProjectileCount + Math.floor(Math.random() * (maxProjectileCount - minProjectileCount + 1));
  const pelletSpread = weapon.pelletSpread ?? 0;
  for (let pelletIndex = 0; pelletIndex < pelletCount; pelletIndex += 1) {
    const pelletOffset = weapon.randomPelletSpread
      ? (Math.random() - 0.5) * pelletSpread
      : pelletCount === 1
        ? 0
        : (pelletIndex / (pelletCount - 1) - 0.5) * pelletSpread;
    const aimAngle = targetAngle + pelletOffset + (Math.random() - 0.5) * weapon.spread;
    let vx = Math.cos(aimAngle) * speed;
    let vy = Math.sin(aimAngle) * speed;
	    let radius = weapon.projectileRadius ?? (isArrow ? 4 : isEmberOrb ? 8 : isFlame ? 50 : isGraveSkull || isVoidOrb || isShadowDagger ? 7 : isSunshardCore ? 6 : 3);
	    let gravity = weapon.projectileGravity ?? (isArrow ? 250 : 0);
	    let knockbackX = weapon.projectileKnockbackX ?? (isArrow ? 165 : isEmberOrb ? 160 : isFlame ? 136 : isGraveSkull ? 126 : isVoidOrb || isShadowDagger ? 122 : 55);
	    let knockbackY = weapon.projectileKnockbackY ?? (isArrow ? -70 : isEmberOrb ? -135 : isFlame ? -110 : isGraveSkull ? -82 : isVoidOrb || isShadowDagger ? -96 : -16);
	    let impactParticles = weapon.impactParticles ?? (isArrow ? 4 : isEmberOrb ? 9 : isFlame ? 12 : isGraveSkull || isVoidOrb || isShadowDagger ? 8 : isSunshardCore ? 7 : 6);
	    let impactForce = weapon.impactForce ?? (isArrow ? 36 : isEmberOrb ? 76 : isFlame ? 84 : isGraveSkull || isVoidOrb || isShadowDagger ? 60 : isSunshardCore ? 68 : 58);
	    let trailInterval = weapon.projectileTrailInterval ?? (isBullet ? 0.05 : isEmberOrb ? 0.045 : isFlame ? 0.03 : isGraveSkull || isVoidOrb || isShadowDagger || isSunshardCore ? 0.05 : 0);
	    let rotation = aimAngle;
	    let spinSpeed = weapon.projectileSpinSpeed ?? 0;
	    let lightRadius = weapon.projectileLightRadius ?? 0;
      let baseRadius = radius;
      let targetRadius = radius;
      let growDuration = 0;
      let lifetime = weapon.lifetime ?? 0;
      let stormspineTwister = false;
      let stormspineCurveDelay = 0;
      let stormspineCurveDuration = 0;
      let stormspineCurveDirection = 0;
      let stormspineCurveRadius = 0;

	    if (isEmberOrb) {
	      gravity = weapon.projectileGravity ?? 380;
	      vy = Math.sin(aimAngle) * speed - (weapon.projectileLift ?? 46);
      rotation = Math.random() * Math.PI * 2;
      spinSpeed = weapon.projectileSpinSpeed ?? (5 + Math.random() * 3);
      lightRadius = weapon.projectileLightRadius ?? 38;
    } else if (isGraveSkull) {
      rotation = Math.random() * Math.PI * 2;
      spinSpeed = weapon.projectileSpinSpeed ?? (3.8 + Math.random() * 1.6);
      lightRadius = weapon.projectileLightRadius ?? 26;
	    } else if (isVoidOrb) {
	      rotation = Math.random() * Math.PI * 2;
	      spinSpeed = weapon.projectileSpinSpeed ?? (2.8 + Math.random() * 1.8);
	      lightRadius = weapon.projectileLightRadius ?? 34;
	    } else if (isShadowDagger) {
	      rotation = aimAngle + Math.PI * 0.5;
	      spinSpeed = weapon.projectileSpinSpeed ?? 12;
	      lightRadius = weapon.projectileLightRadius ?? 28;
		    } else if (isSunshardCore) {
	      rotation = Math.random() * Math.PI * 2;
	      spinSpeed = weapon.projectileSpinSpeed ?? (5 + Math.random() * 2.5);
	      lightRadius = weapon.projectileLightRadius ?? 22;
	    } else if (isFlame) {
	      gravity = weapon.projectileGravity ?? 120;
	      vy = Math.sin(aimAngle) * speed - (weapon.projectileLift ?? 32);
	      rotation = Math.random() * Math.PI * 2;
	      spinSpeed = weapon.projectileSpinSpeed ?? (3.5 + Math.random() * 1.5);
	      lightRadius = weapon.projectileLightRadius ?? 50;
        baseRadius = weapon.projectileSpawnRadius ?? 1;
        targetRadius = weapon.projectileRadius ?? 50;
        radius = baseRadius;
        growDuration = (weapon.projectileGrowTicks ?? 30) / 60;
	    } else if (weapon.id === "stormspine") {
        stormspineTwister = true;
        stormspineCurveDelay = 0.5;
        stormspineCurveDuration = 0.5;
        stormspineCurveDirection = pelletOffset <= 0 ? -1 : 1;
        stormspineCurveRadius = 42;
        lifetime = stormspineCurveDelay + stormspineCurveDuration;
	    }

	    spawnProjectile({
      owner: "player",
      kind: weapon.projectile,
      x: originX,
      y: originY,
      vx,
      vy,
      radius,
      gravity,
      damage: weapon.damage,
      knockbackX,
      knockbackY,
      color: projectileColor,
      impactParticles,
      impactForce,
      trailColor: projectileTrail,
      trailInterval,
	      rotation,
	      spinSpeed,
	      lightRadius,
        baseRadius,
        targetRadius,
        growDuration,
	      ignoreWorld: isFlame,
	      infinitePierce: isFlame,
	      boomerang: isGraveSkull,
	      returnDelay: isGraveSkull ? 0.34 : 0,
	      maxTravel: isGraveSkull ? 300 : 0,
	      remainingHits: isGraveSkull ? 3 : isShadowDagger ? (weapon.projectilePierceCount ?? 3) : 0,
        bypassTargetInvuln: isShadowDagger || weapon.id === "tempestScattergun" || weapon.id === "ashfallMortar",
        homingStrength: isShadowDagger ? (weapon.projectileHomingStrength ?? 1400) : 0,
        homingRange: isShadowDagger ? (weapon.projectileHomingRange ?? 220) : 0,
	      hitEffect: weapon.hitEffect ?? null,
      hitEffectDamage: weapon.hitEffectDamage ?? 0,
      hitEffectTicks: weapon.hitEffectTicks ?? 0,
      hitEffectInterval: weapon.hitEffectInterval ?? 0,
	      stormspineTwister,
	      stormspineCurveDelay,
	      stormspineCurveDuration,
	      stormspineCurveDirection,
	      stormspineCurveRadius,
	      lifetime,
	      splitOnDestroy: isSunshardCore,
      splitCount: weapon.shardCount ?? 0,
      splitDamage: weapon.shardDamage ?? 0,
    });
  }

  const muzzleColor = isArrow ? "#d9bf8a" : isLaser ? "#9ff1ff" : isEmberOrb ? "#ffad63" : isGraveSkull ? "#c6aaff" : isVoidOrb ? "#dd98ff" : projectileColor;
  const muzzleCount = isArrow ? 3 : isEmberOrb ? 6 : pelletCount > 1 ? 6 : 4;
  const muzzleForce = isArrow ? 25 : isEmberOrb ? 52 : isLaser ? 44 : pelletCount > 1 ? 48 : 34;
  burstParticles(originX, originY, muzzleColor, muzzleCount, muzzleForce);

  if (weapon.id === "gun") {
    player.minigunHeat += weapon.cooldown;
    if (player.minigunHeat >= 5) {
      player.minigunHeat = 5;
      player.minigunOverheatTimer = 1;
      announce("Minigun overheated. Cooling for 1 second.");
    }
  }
}

function throwGrenade(item) {
  const player = state.player;
  player.facing = input.worldX >= player.x + player.w * 0.5 ? 1 : -1;
  const originX = player.x + player.w * 0.5 + player.facing * 8;
  const originY = player.y + player.h * 0.36;
  const aimAngle = Math.atan2(input.worldY - originY, input.worldX - originX);
  const speed = 290;

  spawnProjectile({
    owner: "player",
    kind: "grenade",
    x: originX,
    y: originY,
    vx: Math.cos(aimAngle) * speed,
    vy: Math.sin(aimAngle) * speed - 40,
    radius: 6,
    gravity: 380,
    damage: item.damage,
    knockbackX: 180,
    knockbackY: -140,
    color: "#ffcf86",
    impactParticles: 10,
    impactForce: 84,
    trailColor: "rgba(255, 209, 138, 0.35)",
    trailInterval: 0.05,
    rotation: Math.random() * Math.PI * 2,
    spinSpeed: 7,
  });

  burstParticles(originX, originY, "#f1c77a", 4, 28);
}

function useConsumable(item) {
  const entry = getInventoryEntry(item.id);
  if (!entry || entry.count <= 0) {
    return;
  }

  if (item.use === "grenade") {
    removeInventory(item.id, 1);
    state.player.attackCooldown = item.cooldown;
    throwGrenade(item);
    return;
  }

  if (item.use === "summon") {
    if (state.boss) {
      announce("A boss is already active.");
      return;
    }

    if (!canUseSummonForBoss(item.summons)) {
      return;
    }

    removeInventory(item.id, 1);
    state.player.attackCooldown = 0.22;
    spawnBossByKind(item.summons);
  }
}

function updateWeaponHeat(dt) {
  const selected = getSelectedItem();
  const player = state.player;
  const minigunSelectedAndHeld = selected?.id === "gun" && input.left;

  if (player.minigunOverheatTimer > 0) {
    return;
  }

  if (!minigunSelectedAndHeld) {
    player.minigunHeat = Math.max(0, player.minigunHeat - dt * 2.4);
  }
}

function isWeaponLocked(weapon) {
  return weapon.id === "gun" && state.player.minigunOverheatTimer > 0;
}

function updatePlayerCombat() {
  if (state.player.attackTimer <= 0) {
    return;
  }

  const swingProgress = getSwingProgress(state.player);
  if (state.player.attackItemId === "cloudfang" && !state.player.swingImpulseFired && swingProgress >= 0.88) {
    fireCloudfangImpulse();
    state.player.swingImpulseFired = true;
  }

  const swing = getSwingTrace(state.player);
  const knockbackX = Math.cos(swing.angle) * 180;
  const knockbackY = Math.min(-40, Math.sin(swing.angle) * 150);
  for (const mob of state.mobs) {
    if (!mob.alive || mob.lastSwingId === state.player.swingId) {
      continue;
    }
    if (swingHitsRect(state.player, mob)) {
      mob.lastSwingId = state.player.swingId;
      const damaged = damageMob(mob, state.player.attackDamage || ITEM_DEFS.sword.damage, knockbackX, knockbackY);
      if (damaged) {
        applyPlayerMeleeOnHitEffects();
      }
    }
  }

  if (state.boss && state.boss.lastSwingId !== state.player.swingId && swingHitsRect(state.player, state.boss)) {
    state.boss.lastSwingId = state.player.swingId;
    const damaged = damageBoss(Math.max(24, state.player.attackDamage || ITEM_DEFS.sword.damage), Math.cos(swing.angle) * 210, Math.min(-48, Math.sin(swing.angle) * 165));
    if (damaged) {
      applyPlayerMeleeOnHitEffects();
    }
  }
}

function fireCloudfangImpulse() {
  const player = state.player;
  const pivotX = player.x + player.w * 0.5 + player.facing * 10;
  const pivotY = player.y + player.h * 0.4;
  const aimAngle = Math.atan2(input.worldY - pivotY, input.worldX - pivotX);
  spawnProjectile({
    owner: "player",
    kind: "sky-impulse",
    x: pivotX,
    y: pivotY,
    vx: Math.cos(aimAngle) * 430,
    vy: Math.sin(aimAngle) * 430,
    radius: 8,
    damage: ITEM_DEFS.cloudfang.impulseDamage ?? 15,
    knockbackX: 135,
    knockbackY: -72,
    color: "#e8fbff",
    trailColor: "rgba(212, 245, 255, 0.42)",
    trailInterval: 0.04,
    impactParticles: 9,
    impactForce: 62,
    lightRadius: 22,
    lifetime: 0.7,
  });
  burstParticles(pivotX, pivotY, "#eefcff", 6, 34);
}

function applyPlayerMeleeOnHitEffects() {
  if (state.player.attackItemId !== "retinaBlade") {
    return;
  }

  healPlayer(2 + Math.floor(Math.random() * 2));
}

function getSwingPivot(entity) {
  return {
    x: entity.x + entity.w * 0.5 + (entity.facing || 1) * 2,
    y: entity.y + 13,
  };
}

function getSwingProgress(entity) {
  return 1 - clamp(entity.attackTimer / 0.18, 0, 1);
}

function getSwingTrace(entity) {
  const pivot = getSwingPivot(entity);
  const angle = lerp(entity.swingStartAngle ?? 0, entity.swingEndAngle ?? 0, getSwingProgress(entity));
  const innerReach = 6;
  const reach = entity.swingReach ?? 34;
  return {
    pivotX: pivot.x,
    pivotY: pivot.y,
    angle,
    reach,
    thickness: entity.swingRadius ?? 10,
    x1: pivot.x + Math.cos(angle) * innerReach,
    y1: pivot.y + Math.sin(angle) * innerReach,
    x2: pivot.x + Math.cos(angle) * reach,
    y2: pivot.y + Math.sin(angle) * reach,
  };
}

function segmentHitsRect(x1, y1, x2, y2, radius, rect) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(length / Math.max(6, radius * 0.75)));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const sampleX = lerp(x1, x2, t);
    const sampleY = lerp(y1, y2, t);
    if (circleRectCollision(sampleX, sampleY, radius, rect)) {
      return true;
    }
  }
  return false;
}

function swingHitsRect(entity, rect) {
  const swing = getSwingTrace(entity);
  return segmentHitsRect(swing.x1, swing.y1, swing.x2, swing.y2, swing.thickness, rect);
}

function startNpcSwing(npc, direction, threat = null) {
  const pivot = getSwingPivot(npc);
  const threatCenterX = threat ? threat.x + threat.w * 0.5 : pivot.x + (direction || npc.facing || 1) * 32;
  const threatCenterY = threat ? threat.y + threat.h * 0.5 : pivot.y;
  const aimAngle = Math.atan2(threatCenterY - pivot.y, threatCenterX - pivot.x);
  npc.attackTimer = 0.18;
  npc.attackCooldown = 0.42;
  npc.swingId += 1;
  npc.currentSwingTag = `${npc.id}-${npc.swingId}`;
  npc.attackItemId = npc.attackItemId ?? "sword";
  npc.swingStartAngle = aimAngle - 0.42;
  npc.swingEndAngle = aimAngle + 0.42;
  npc.swingReach = 32;
  npc.swingRadius = 11;
  npc.facing = Math.cos(aimAngle) >= 0 ? 1 : -1;
}

function fireNpcArrow(npc, threat) {
  const originX = npc.x + npc.w * 0.5 + npc.facing * 7;
  const originY = npc.y + 12;
  const targetX = threat.x + threat.w * 0.5;
  const targetY = threat.y + threat.h * 0.42;
  const aimAngle = Math.atan2(targetY - originY, targetX - originX);
  npc.attackCooldown = 1.5;
  npc.attackItemId = "bow";
  npc.facing = Math.cos(aimAngle) >= 0 ? 1 : -1;
  spawnProjectile({
    owner: "player",
    kind: "arrow",
    x: originX,
    y: originY,
    vx: Math.cos(aimAngle) * 430,
    vy: Math.sin(aimAngle) * 430,
    radius: 4,
    gravity: 240,
    damage: 16,
    knockbackX: 132,
    knockbackY: -84,
    color: "#f0d9a3",
    trailColor: "rgba(240, 217, 163, 0.34)",
    trailInterval: 0.05,
    impactParticles: 4,
    impactForce: 36,
    lifetime: 1.6,
  });
  burstParticles(originX, originY, "#d8bf8b", 4, 24);
}

function updateNpcCombat(npc) {
  if (npc.attackTimer <= 0) {
    return;
  }

  const swing = getSwingTrace(npc);
  const knockbackX = Math.cos(swing.angle) * 150;
  const knockbackY = Math.min(-35, Math.sin(swing.angle) * 120);
  for (const mob of state.mobs) {
    if (!mob.alive || mob.lastSwingId === npc.currentSwingTag) {
      continue;
    }
    if (swingHitsRect(npc, mob)) {
      mob.lastSwingId = npc.currentSwingTag;
      damageMob(mob, npc.attackDamage, knockbackX, knockbackY);
    }
  }

  if (state.boss && state.boss.lastSwingId !== npc.currentSwingTag && swingHitsRect(npc, state.boss)) {
    state.boss.lastSwingId = npc.currentSwingTag;
    damageBoss(Math.max(16, npc.attackDamage), Math.cos(swing.angle) * 160, Math.min(-40, Math.sin(swing.angle) * 130));
  }
}

function getNearestThreatForNpc(npc, range) {
  let nearest = null;
  let bestDistance = range;
  const npcCenterX = npc.x + npc.w * 0.5;
  const npcCenterY = npc.y + npc.h * 0.5;

  for (const mob of state.mobs) {
    if (!mob.alive || mob.peaceful) {
      continue;
    }
    const distance = Math.hypot(npcCenterX - (mob.x + mob.w * 0.5), npcCenterY - (mob.y + mob.h * 0.5));
    if (distance < bestDistance) {
      nearest = mob;
      bestDistance = distance;
    }
  }

  if (state.boss) {
    const distance = Math.hypot(npcCenterX - (state.boss.x + state.boss.w * 0.5), npcCenterY - (state.boss.y + state.boss.h * 0.5));
    if (distance < bestDistance) {
      nearest = state.boss;
    }
  }

  return nearest;
}

function getThreatPlanForNpc(npc, range) {
  let bestPlan = null;
  let bestDistance = range;
  const npcCenterX = npc.x + npc.w * 0.5;
  const npcCenterY = npc.y + npc.h * 0.5;
  const threats = state.boss ? [...state.mobs, state.boss] : state.mobs;

  for (const threat of threats) {
    if (!threat?.alive && threat !== state.boss) {
      continue;
    }
    if (threat !== state.boss && threat.peaceful) {
      continue;
    }

    const threatCenterX = threat.x + threat.w * 0.5;
    const threatCenterY = threat.y + threat.h * 0.5;
    const distance = Math.hypot(npcCenterX - threatCenterX, npcCenterY - threatCenterY);
    if (distance >= bestDistance) {
      continue;
    }

    const route = planGroundRoute(npc, threatCenterX);
    const attackReachX = Math.abs(threatCenterX - npcCenterX) <= 34;
    const attackReachY = Math.abs(threatCenterY - npcCenterY) <= 26;
    if (!route.reachable && !(attackReachX && attackReachY)) {
      continue;
    }

    bestDistance = distance;
    bestPlan = { threat, route };
  }

  return bestPlan;
}

function canJumpOneBlock(entity, direction) {
  if (!entity.onGround || direction === 0) {
    return false;
  }

  const probeX = direction > 0 ? entity.x + entity.w + 1 : entity.x - 1;
  const footY = entity.y + entity.h - 2;
  const chestY = entity.y + entity.h - TILE_SIZE - 2;
  const headY = entity.y + 4;

  return (
    isSolidTile(getTileAtPixel(probeX, footY)) &&
    !isSolidTile(getTileAtPixel(probeX, chestY)) &&
    !isSolidTile(getTileAtPixel(probeX, headY))
  );
}

function getEntityBodyTileHeight(entity) {
  return Math.max(2, Math.ceil((entity.h - 2) / TILE_SIZE));
}

function isStandableGroundTileForEntity(entity, tileX, groundTileY) {
  if (tileX < 1 || tileX >= WORLD_WIDTH - 1 || groundTileY < 2 || groundTileY >= WORLD_HEIGHT) {
    return false;
  }
  if (!isSolidTile(getTile(state.world, tileX, groundTileY))) {
    return false;
  }

  const bodyTiles = getEntityBodyTileHeight(entity);
  for (let y = groundTileY - 1; y >= groundTileY - bodyTiles; y -= 1) {
    if (isSolidTile(getTile(state.world, tileX, y))) {
      return false;
    }
  }
  return true;
}

function getEntityGroundTileY(entity) {
  const centerTileX = clamp(Math.floor((entity.x + entity.w * 0.5) / TILE_SIZE), 1, WORLD_WIDTH - 2);
  const baseGroundY = clamp(Math.floor((entity.y + entity.h + 1) / TILE_SIZE), 2, WORLD_HEIGHT - 1);
  const candidates = [
    baseGroundY,
    baseGroundY + 1,
    baseGroundY - 1,
    baseGroundY + 2,
    baseGroundY - 2,
    baseGroundY + 3,
  ];

  for (const groundTileY of candidates) {
    if (isStandableGroundTileForEntity(entity, centerTileX, groundTileY)) {
      return groundTileY;
    }
  }

  return baseGroundY;
}

function findTraversableGroundTileY(entity, fromTileX, currentGroundY, direction) {
  if (direction === 0) {
    return currentGroundY;
  }

  const targetTileX = fromTileX + direction;
  if (targetTileX < 1 || targetTileX >= WORLD_WIDTH - 1) {
    return null;
  }

  const bodyTiles = getEntityBodyTileHeight(entity);
  const candidates = [currentGroundY, currentGroundY - 1, currentGroundY + 1, currentGroundY + 2, currentGroundY + 3];

  for (const candidateGroundY of candidates) {
    const climb = currentGroundY - candidateGroundY;
    const drop = candidateGroundY - currentGroundY;
    if (climb > 1 || drop > 3) {
      continue;
    }
    if (!isStandableGroundTileForEntity(entity, targetTileX, candidateGroundY)) {
      continue;
    }

    let blocked = false;
    const transitionTop = Math.min(currentGroundY, candidateGroundY) - bodyTiles;
    const transitionChecks = [
      [fromTileX, currentGroundY],
      [targetTileX, candidateGroundY],
    ];
    for (const [checkTileX, floorTileY] of transitionChecks) {
      for (let y = transitionTop; y < floorTileY; y += 1) {
        if (isSolidTile(getTile(state.world, checkTileX, y))) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        break;
      }
    }

    if (!blocked) {
      return candidateGroundY;
    }
  }

  return null;
}

function planGroundRoute(entity, targetX, maxTiles = 56) {
  const currentTileX = clamp(Math.floor((entity.x + entity.w * 0.5) / TILE_SIZE), 1, WORLD_WIDTH - 2);
  const targetTileX = clamp(Math.floor(targetX / TILE_SIZE), 1, WORLD_WIDTH - 2);
  const direction = Math.sign(targetTileX - currentTileX) || 0;
  const currentGroundY = getEntityGroundTileY(entity);
  if (direction === 0) {
    return {
      reachable: true,
      direction: 0,
      currentGroundY,
      nextGroundY: currentGroundY,
    };
  }

  let probeTileX = currentTileX;
  let probeGroundY = currentGroundY;
  let nextGroundY = null;
  const steps = Math.min(maxTiles, Math.abs(targetTileX - currentTileX) + 1);

  for (let step = 0; step < steps; step += 1) {
    const candidateGroundY = findTraversableGroundTileY(entity, probeTileX, probeGroundY, direction);
    if (candidateGroundY == null) {
      return {
        reachable: false,
        direction,
        currentGroundY,
        nextGroundY,
      };
    }
    if (step === 0) {
      nextGroundY = candidateGroundY;
    }
    probeTileX += direction;
    probeGroundY = candidateGroundY;
    if (Math.abs(targetTileX - probeTileX) <= 1) {
      return {
        reachable: true,
        direction,
        currentGroundY,
        nextGroundY: nextGroundY ?? probeGroundY,
      };
    }
  }

  return {
    reachable: Math.abs(targetTileX - probeTileX) <= 1,
    direction,
    currentGroundY,
    nextGroundY,
  };
}

function moveGroundEntity(entity, dt, allowWorldEdgeClamp) {
  entity.vy = Math.min(entity.vy + GRAVITY * dt, 620);
  entity.onGround = false;

  entity.x += entity.vx * dt;
  resolveHorizontal(entity, allowWorldEdgeClamp);

  const previousY = entity.y;
  entity.y += entity.vy * dt;
  resolveVertical(entity, previousY);
}

function moveFlyingEntity(entity, dt, allowWorldEdgeClamp) {
  entity.onGround = false;
  entity.x += entity.vx * dt;
  resolveHorizontal(entity, allowWorldEdgeClamp);

  const previousY = entity.y;
  entity.y += entity.vy * dt;
  resolveVertical(entity, previousY);
  if (entity.onGround) {
    entity.onGround = false;
    entity.y -= 1;
    entity.vy = Math.min(entity.vy, -36);
  }
}

function resolveHorizontal(entity, clampToWorld) {
  if (clampToWorld) {
    entity.x = clamp(entity.x, 0, WORLD_PIXEL_WIDTH - entity.w);
  }

  const top = Math.floor((entity.y + 2) / TILE_SIZE);
  const bottom = Math.floor((entity.y + entity.h - 2) / TILE_SIZE);

  if (entity.vx > 0) {
    const rightTile = Math.floor((entity.x + entity.w) / TILE_SIZE);
    for (let y = top; y <= bottom; y += 1) {
      if (isSolidTile(getTile(state.world, rightTile, y))) {
        entity.x = rightTile * TILE_SIZE - entity.w - 0.01;
        entity.vx = 0;
        break;
      }
    }
  } else if (entity.vx < 0) {
    const leftTile = Math.floor(entity.x / TILE_SIZE);
    for (let y = top; y <= bottom; y += 1) {
      if (isSolidTile(getTile(state.world, leftTile, y))) {
        entity.x = (leftTile + 1) * TILE_SIZE + 0.01;
        entity.vx = 0;
        break;
      }
    }
  }
}

function resolveVertical(entity, previousY = entity.y) {
  const left = Math.floor((entity.x + 1) / TILE_SIZE);
  const right = Math.floor((entity.x + entity.w - 1) / TILE_SIZE);

  if (entity.vy > 0) {
    const previousBottom = previousY + entity.h;
    const bottomTile = Math.floor((entity.y + entity.h) / TILE_SIZE);
    for (let x = left; x <= right; x += 1) {
      const tile = getTile(state.world, x, bottomTile);
      const tileTop = bottomTile * TILE_SIZE;
      const canLandOnPlatform =
        isPlatformTile(tile) &&
        !shouldIgnorePlatforms(entity) &&
        previousBottom <= tileTop + 1 &&
        entity.y + entity.h >= tileTop;
      if (isSolidTile(tile) || canLandOnPlatform) {
        entity.y = bottomTile * TILE_SIZE - entity.h - 0.01;
        entity.vy = 0;
        entity.onGround = true;
        break;
      }
    }
  } else if (entity.vy < 0) {
    const topTile = Math.floor(entity.y / TILE_SIZE);
    for (let x = left; x <= right; x += 1) {
      if (isSolidTile(getTile(state.world, x, topTile))) {
        entity.y = (topTile + 1) * TILE_SIZE + 0.01;
        entity.vy = 0;
        break;
      }
    }
  }
}

function updateNpcs(dt) {
  for (const npc of state.npcs) {
    if (!npc.alive) {
      npc.respawnTimer = Math.max(0, (npc.respawnTimer ?? 0) - dt);
      if (npc.respawnTimer <= 0) {
        respawnNpc(npc);
      }
      continue;
    }
    npc.invuln = Math.max(0, (npc.invuln ?? 0) - dt);
    npc.healCooldown = Math.max(0, npc.healCooldown - dt);
    npc.attackTimer = Math.max(0, npc.attackTimer - dt);
    npc.attackCooldown = Math.max(0, npc.attackCooldown - dt);
    updateNpcOpenedDoor(npc, dt);
    npc.wanderTimer -= dt;
    const threatPlan = getThreatPlanForNpc(npc, 132);
	    if (threatPlan) {
	      const threat = threatPlan.threat;
	      const threatCenterX = threat.x + threat.w * 0.5;
	      const threatCenterY = threat.y + threat.h * 0.5;
	      const direction = threatPlan.route.direction || Math.sign(threatCenterX - (npc.x + npc.w * 0.5)) || npc.facing || 1;
	      const distanceX = Math.abs(threatCenterX - (npc.x + npc.w * 0.5));
	      const distanceY = Math.abs(threatCenterY - (npc.y + npc.h * 0.5));
	      npc.facing = direction;
	
	      if (npc.kind === "merchant") {
	        const inBowRange = distanceX <= 220 && distanceY <= 96;
	        if (!inBowRange && threatPlan.route.reachable) {
	          npc.vx = approach(npc.vx, direction * 60, 520 * dt);
	          if (npc.onGround && threatPlan.route.nextGroundY != null && threatPlan.route.nextGroundY < threatPlan.route.currentGroundY) {
	            npc.vy = -280;
	          } else if (npc.onGround && wallAhead(npc, direction) && canJumpOneBlock(npc, direction)) {
	            npc.vy = -232;
	          }
	        } else {
	          npc.vx = approach(npc.vx, 0, 980 * dt);
	          if (npc.attackCooldown <= 0 && inBowRange) {
	            fireNpcArrow(npc, threat);
	          }
	        }
	      } else if (distanceX > 26 && threatPlan.route.reachable) {
	        npc.vx = approach(npc.vx, direction * 68, 540 * dt);
	        if (npc.onGround && threatPlan.route.nextGroundY != null && threatPlan.route.nextGroundY < threatPlan.route.currentGroundY) {
	          npc.vy = -290;
	        } else if (npc.onGround && wallAhead(npc, direction) && canJumpOneBlock(npc, direction)) {
	          npc.vy = -240;
	        }
	      } else {
	        npc.vx = approach(npc.vx, 0, 980 * dt);
	        if (npc.attackCooldown <= 0 && distanceX <= 34) {
	          startNpcSwing(npc, direction, threat);
	        }
	      }
	    } else {
      if (npc.wanderTimer <= 0) {
        npc.wanderTimer = 1.2 + Math.random() * 2.2;
        const directionRoll = Math.random();
        if (directionRoll < 0.33) {
          npc.vx = -42;
        } else if (directionRoll < 0.66) {
          npc.vx = 42;
        } else {
          npc.vx = 0;
        }
      }

      if (npc.x < npc.homeLeft) {
        npc.vx = 36;
        npc.facing = 1;
      } else if (npc.x > npc.homeRight) {
        npc.vx = -36;
        npc.facing = -1;
      }

      if (npc.vx !== 0) {
        npc.facing = Math.sign(npc.vx);
      }

      const usedDoor = npc.facing !== 0 && tryNpcUseDoor(npc, npc.facing);
      if (!usedDoor && canJumpOneBlock(npc, npc.facing)) {
        npc.vy = -280;
      } else if (!usedDoor && wallAhead(npc, npc.facing)) {
        npc.vx *= -1;
        npc.facing *= -1;
      }
    }

    moveGroundEntity(npc, dt, false);
    for (const mob of state.mobs) {
      if (!mob.alive || mob.peaceful || !overlaps(npc, mob)) {
        continue;
      }
      const knockback = Math.sign(npc.x + npc.w * 0.5 - (mob.x + mob.w * 0.5)) || 1;
      damageNpc(npc, mob.damage ?? 8, knockback * 120, -90);
      if (!npc.alive) {
        break;
      }
    }
    if (npc.alive && state.boss && overlaps(npc, state.boss)) {
      const knockback = Math.sign(npc.x + npc.w * 0.5 - (state.boss.x + state.boss.w * 0.5)) || 1;
      damageNpc(npc, state.boss.phase === 1 ? 18 : 26, knockback * 160, -110);
    }
    if (!npc.alive) {
      continue;
    }
    if (Math.abs(npc.vx) > 1) {
      tryNpcUseDoor(npc, npc.facing || Math.sign(npc.vx) || 1);
    }
    updateNpcCombat(npc);
  }
}

function updateMobs(dt) {
  for (const mob of state.mobs) {
    if (!mob.alive) {
      continue;
    }

    mob.invuln = Math.max(0, mob.invuln - dt);
    updateShadowflame(mob, dt, (amount) => {
      damageMob(mob, amount, 0, mob.vy, {
        bypassInvuln: true,
        invulnDuration: 0,
        particleCount: 0,
      });
    });
    updateFireDebuff(mob, dt, (amount) => {
      damageMob(mob, amount, 0, mob.vy, {
        bypassInvuln: true,
        invulnDuration: 0,
        particleCount: 0,
      });
    });
    if (!mob.alive) {
      continue;
    }

    if (mob.kind === "slime") {
      updateSlime(mob, dt);
      moveGroundEntity(mob, dt, false);
    } else if (mob.kind === "goblin") {
      updateGoblin(mob, dt);
      moveGroundEntity(mob, dt, false);
    } else if (mob.kind === "bird") {
      updateBird(mob, dt);
      moveGroundEntity(mob, dt, false);
    } else if (mob.kind === "butterfly") {
      updateButterfly(mob, dt);
      moveFlyingEntity(mob, dt, false);
    } else if (mob.kind === "worm") {
      updateWorm(mob, dt);
      moveGroundEntity(mob, dt, false);
    } else if (mob.kind === "eye-servant") {
      updateEyeServant(mob, dt);
    } else if (mob.kind === "sand-wisp") {
      updateSandWisp(mob, dt);
    } else if (mob.kind === "cave-bat") {
      updateCaveBat(mob, dt);
    } else if (mob.kind === "skeleton-miner") {
      updateSkeletonMiner(mob, dt);
      moveGroundEntity(mob, dt, false);
    } else {
      moveGroundEntity(mob, dt, false);
    }

    if (!mob.peaceful && mob.damage > 0 && overlaps(state.player, mob)) {
      const knockback = Math.sign((state.player.x + state.player.w * 0.5) - (mob.x + mob.w * 0.5)) * 170;
      damagePlayer(mob.damage, knockback, -140);
    }

    const distanceToPlayer = Math.abs(mob.x - state.player.x);
    if (distanceToPlayer > 1600 || mob.health <= 0) {
      mob.alive = false;
    }
  }

  state.mobs = state.mobs.filter((mob) => mob.alive);
}

function updateSlime(mob, dt) {
  mob.hopTimer -= dt;
  if (mob.hopTimer <= 0 && mob.onGround) {
    const direction = Math.sign(state.player.x - mob.x) || (Math.random() < 0.5 ? -1 : 1);
    mob.vx = direction * (60 + Math.random() * 60);
    mob.vy = -220 - Math.random() * 60;
    mob.hopTimer = 0.8 + Math.random() * 0.8;
    mob.facing = direction;
  }

  mob.vx = approach(mob.vx, 0, 60 * dt);
}

function updateGoblin(mob, dt) {
  const direction = Math.sign(state.player.x - mob.x) || mob.facing;
  mob.vx = approach(mob.vx, direction * 95, 420 * dt);
  mob.facing = direction;

  if (mob.onGround && wallAhead(mob, direction)) {
    mob.vy = -280;
  }

  if (!groundAhead(mob, direction) && mob.onGround) {
    mob.vx = 0;
  }
}

function updateBird(mob, dt) {
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const birdCenterX = mob.x + mob.w * 0.5;
  const distanceX = playerCenterX - birdCenterX;
  const closeEnough = Math.abs(distanceX) < 120 && Math.abs((state.player.y + state.player.h * 0.5) - (mob.y + mob.h * 0.5)) < 72;
  mob.flutterTimer = Math.max(0, (mob.flutterTimer ?? 0) - dt);
  mob.idleTimer = Math.max(0, (mob.idleTimer ?? 0) - dt);
  mob.cruiseTimer = Math.max(0, (mob.cruiseTimer ?? 0) - dt);
  mob.wanderFlightTimer = Math.max(0, (mob.wanderFlightTimer ?? 0) - dt);

  if (closeEnough) {
    const direction = distanceX >= 0 ? -1 : 1;
    mob.facing = direction;
    mob.vx = approach(mob.vx, direction * 118, 460 * dt);
    if (mob.onGround || mob.flutterTimer <= 0) {
      mob.vy = -215 - Math.random() * 36;
      mob.flutterTimer = 0.24 + Math.random() * 0.18;
      mob.wanderFlightTimer = 0.45 + Math.random() * 0.35;
    }
  } else {
    if (mob.onGround && mob.cruiseTimer <= 0) {
      mob.cruiseTimer = 1.8 + Math.random() * 2.8;
      if (Math.random() < 0.5) {
        mob.facing = Math.random() < 0.5 ? -1 : 1;
        mob.vx = mob.facing * (58 + Math.random() * 34);
        mob.vy = -180 - Math.random() * 46;
        mob.wanderFlightTimer = 0.4 + Math.random() * 0.6;
        mob.flutterTimer = 0.12 + Math.random() * 0.12;
      }
    }

    if (!mob.onGround && mob.wanderFlightTimer > 0) {
      mob.vx = approach(mob.vx, mob.facing * (52 + Math.random() * 18), 190 * dt);
      if (mob.flutterTimer <= 0 && Math.random() < 0.4) {
        mob.vy = Math.min(mob.vy, -95 - Math.random() * 28);
        mob.flutterTimer = 0.14 + Math.random() * 0.14;
      }
    }

    if (mob.idleTimer <= 0 && mob.onGround) {
      mob.idleTimer = 0.8 + Math.random() * 1.4;
      const direction = Math.random() < 0.5 ? -1 : 1;
      mob.facing = direction;
      mob.vx = direction * (28 + Math.random() * 18);
      if (Math.random() < 0.45) {
        mob.vy = -145 - Math.random() * 24;
      }
    }
    if (mob.onGround || mob.wanderFlightTimer <= 0) {
      mob.vx = approach(mob.vx, 0, 140 * dt);
    }
  }
}

function updateButterfly(mob, dt) {
  mob.flutterTimer = Math.max(0, (mob.flutterTimer ?? 0) - dt);
  mob.driftTimer = Math.max(0, (mob.driftTimer ?? 0) - dt);
  mob.perchTimer = Math.max(0, (mob.perchTimer ?? 0) - dt);
  mob.wingPhase = (mob.wingPhase ?? 0) + dt * 12;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  const mobCenterX = mob.x + mob.w * 0.5;
  const mobCenterY = mob.y + mob.h * 0.5;
  const tileX = clamp(Math.floor(mobCenterX / TILE_SIZE), 0, WORLD_WIDTH - 1);
  const surfaceY = findSurface(tileX);
  const topFlightY = surfaceY * TILE_SIZE - TILE_SIZE * 5 - mob.h;
  const lowFlightY = surfaceY * TILE_SIZE - mob.h - 10;
  const flee = Math.abs(playerCenterX - mobCenterX) < 90 && Math.abs(playerCenterY - mobCenterY) < 70;

  if (flee) {
    const direction = playerCenterX >= mobCenterX ? -1 : 1;
    mob.facing = direction;
    mob.vx = approach(mob.vx, direction * 88, 280 * dt);
    if (mob.flutterTimer <= 0) {
      mob.vy = -120 - Math.random() * 45;
      mob.flutterTimer = 0.08 + Math.random() * 0.08;
    }
    mob.hoverY = clamp(Math.min(mob.hoverY ?? mob.y, mob.y - 22), topFlightY, lowFlightY);
    mob.perchTimer = 0;
    mob.perchX = null;
    mob.perchY = null;
    mob.vy = Math.min(mob.vy, -24);
    return;
  }

  if (mob.perchTimer > 0 && mob.perchX !== null && mob.perchY !== null) {
    mob.facing = mob.perchX >= mobCenterX ? 1 : -1;
    const targetX = mob.perchX - mob.w * 0.5;
    const targetY = clamp(mob.perchY, topFlightY, lowFlightY);
    mob.vx = approach(mob.vx, clamp((targetX - mob.x) * 4.2, -28, 28), 180 * dt);
    mob.vy = approach(mob.vy, clamp((targetY - mob.y) * 5, -36, 36), 240 * dt);
    mob.hoverY = targetY;
    if (Math.abs(targetX - mob.x) < 1.5 && Math.abs(targetY - mob.y) < 1.5) {
      mob.vx = approach(mob.vx, 0, 220 * dt);
      mob.vy = approach(mob.vy, 0, 220 * dt);
    }
    return;
  }

  if (mob.driftTimer <= 0) {
    mob.driftTimer = 0.6 + Math.random() * 1.2;
    if (Math.random() < 0.72) {
      mob.facing = Math.random() < 0.5 ? -1 : 1;
    }
    const perch = Math.random() < 0.22 ? findNearbyFlowerPerch(mob) : null;
    if (perch) {
      mob.perchTimer = 0.8 + Math.random() * 1.8;
      mob.perchX = perch.x;
      mob.perchY = perch.y;
      mob.hoverY = clamp(perch.y, topFlightY, lowFlightY);
    } else {
      mob.perchX = null;
      mob.perchY = null;
      mob.hoverY = clamp(mob.y - 10 + (Math.random() - 0.5) * 34, topFlightY, lowFlightY);
    }
  }

  const targetVx = mob.facing * (16 + Math.sin(state.elapsed * 2.4 + mob.wingPhase) * 8);
  mob.hoverY = clamp(mob.hoverY ?? mob.y, topFlightY, lowFlightY);
  const targetVy = clamp((mob.hoverY - mob.y) * 2.1, -42, 42);
  mob.vx = approach(mob.vx, targetVx, 110 * dt);
  mob.vy = approach(mob.vy, targetVy, 170 * dt);

  if (mob.flutterTimer <= 0 && Math.random() < 0.35) {
    mob.vy -= 18 + Math.random() * 18;
    mob.flutterTimer = 0.06 + Math.random() * 0.08;
  }

  if (mob.y < topFlightY) {
    mob.vy = Math.max(mob.vy, 26);
  }
}

function updateWorm(mob, dt) {
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const wormCenterX = mob.x + mob.w * 0.5;
  const distanceX = playerCenterX - wormCenterX;
  const threat = Math.abs(distanceX) < 82 && Math.abs((state.player.y + state.player.h * 0.5) - (mob.y + mob.h * 0.5)) < 52;
  mob.turnTimer = Math.max(0, (mob.turnTimer ?? 0) - dt);

  if (threat) {
    mob.facing = distanceX >= 0 ? -1 : 1;
  } else if (mob.turnTimer <= 0) {
    mob.turnTimer = 1.8 + Math.random() * 1.8;
    if (Math.random() < 0.55) {
      mob.facing *= -1;
    }
  }

  const targetSpeed = threat ? 54 : 22;
  mob.vx = approach(mob.vx, mob.facing * targetSpeed, 180 * dt);
  if (mob.onGround && wallAhead(mob, mob.facing)) {
    mob.facing *= -1;
    mob.vx = mob.facing * targetSpeed;
  }
  if (!groundAhead(mob, mob.facing) && mob.onGround) {
    mob.facing *= -1;
    mob.vx = mob.facing * targetSpeed;
  }
}

function updateEyeServant(mob, dt) {
  mob.orbitTime += dt * mob.orbitSpeed;
  const targetX = state.player.x + state.player.w * 0.5 + Math.cos(mob.orbitTime + mob.orbitOffset) * 84 - mob.w * 0.5;
  const targetY = state.player.y - 56 + Math.sin(mob.orbitTime * 1.4 + mob.orbitOffset) * 26;
  mob.vx = approach(mob.vx, clamp((targetX - mob.x) * 2.8, -220, 220), 520 * dt);
  mob.vy = approach(mob.vy, clamp((targetY - mob.y) * 2.8, -220, 220), 520 * dt);
  pushAirEntityAwayFromPlayer(mob, 58, 720, dt, -16);
  mob.x += mob.vx * dt;
  mob.y += mob.vy * dt;
  mob.facing = mob.vx < 0 ? -1 : 1;
  mob.x = clamp(mob.x, 8, WORLD_PIXEL_WIDTH - mob.w - 8);
  mob.y = clamp(mob.y, 8, WORLD_PIXEL_HEIGHT - mob.h - 40);
}

function updateSandWisp(mob, dt) {
  mob.orbitTime += dt * mob.orbitSpeed;
  const targetX = state.player.x + state.player.w * 0.5 + Math.cos(mob.orbitTime + mob.orbitOffset) * 112 - mob.w * 0.5;
  const targetY = state.player.y - 82 + Math.sin(mob.orbitTime * 1.8 + mob.orbitOffset) * 18;
  mob.vx = approach(mob.vx, clamp((targetX - mob.x) * 2.5, -210, 210), 470 * dt);
  mob.vy = approach(mob.vy, clamp((targetY - mob.y) * 2.5, -210, 210), 470 * dt);
  pushAirEntityAwayFromPlayer(mob, 68, 660, dt, -18);
  mob.x += mob.vx * dt;
  mob.y += mob.vy * dt;
  mob.facing = mob.vx < 0 ? -1 : 1;
  mob.x = clamp(mob.x, 8, WORLD_PIXEL_WIDTH - mob.w - 8);
  mob.y = clamp(mob.y, 8, WORLD_PIXEL_HEIGHT - mob.h - 48);
}

function updateCaveBat(mob, dt) {
  mob.orbitTime += dt * mob.orbitSpeed;
  const targetX = state.player.x + state.player.w * 0.5 + Math.cos(mob.orbitTime + mob.orbitOffset) * 54 - mob.w * 0.5;
  const targetY = state.player.y - 38 + Math.sin(mob.orbitTime * 2.1 + mob.orbitOffset) * 18;
  mob.vx = approach(mob.vx, clamp((targetX - mob.x) * 2.9, -240, 240), 520 * dt);
  mob.vy = approach(mob.vy, clamp((targetY - mob.y) * 2.9, -240, 240), 520 * dt);
  pushAirEntityAwayFromPlayer(mob, 40, 760, dt, -12);
  mob.x += mob.vx * dt;
  mob.y += mob.vy * dt;
  mob.facing = mob.vx < 0 ? -1 : 1;
  mob.x = clamp(mob.x, 8, WORLD_PIXEL_WIDTH - mob.w - 8);
  mob.y = clamp(mob.y, 8, WORLD_PIXEL_HEIGHT - mob.h - 32);
}

function updateSkeletonMiner(mob, dt) {
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const route = planGroundRoute(mob, playerCenterX, 72);
  const direction = route.direction || Math.sign(playerCenterX - (mob.x + mob.w * 0.5)) || mob.facing || 1;
  mob.facing = direction;

  if (route.reachable) {
    mob.vx = approach(mob.vx, direction * 92, 380 * dt);
    if (mob.onGround && route.nextGroundY != null && route.nextGroundY < route.currentGroundY) {
      mob.vy = -292;
    } else if (mob.onGround && wallAhead(mob, direction) && canJumpOneBlock(mob, direction)) {
      mob.vy = -292;
    }
  } else {
    mob.vx = approach(mob.vx, 0, 520 * dt);
  }
}

function pushAirEntityAwayFromPlayer(entity, desiredDistance, strength, dt, verticalBias = 0) {
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5 + verticalBias;
  const entityCenterX = entity.x + entity.w * 0.5;
  const entityCenterY = entity.y + entity.h * 0.5;
  const dx = entityCenterX - playerCenterX;
  const dy = entityCenterY - playerCenterY;
  const distance = Math.hypot(dx, dy) || 1;

  if (distance >= desiredDistance) {
    return;
  }

  const repel = (desiredDistance - distance) / desiredDistance;
  entity.vx += (dx / distance) * strength * repel * dt;
  entity.vy += (dy / distance) * strength * repel * dt;
}

function updateBoss(dt) {
  if (!state.boss) {
    return;
  }

  const boss = state.boss;
  boss.invuln = Math.max(0, boss.invuln - dt);
  updateShadowflame(boss, dt, (amount) => {
    damageBoss(amount, 0, 0, {
      bypassInvuln: true,
      invulnDuration: 0,
      particleCount: 0,
      ignoreArmor: true,
    });
  });
  updateFireDebuff(boss, dt, (amount) => {
    damageBoss(amount, 0, 0, {
      bypassInvuln: true,
      invulnDuration: 0,
      particleCount: 0,
      ignoreArmor: true,
    });
  });
  if (boss.health <= 0) {
    handleBossDefeat(boss);
    state.boss = null;
    return;
  }
  boss.phase = boss.health <= boss.maxHealth * 0.5 ? 2 : 1;

  if (boss.kind === "overseer-eye") {
    updateOverseerEye(dt, boss);
  } else if (boss.kind === "stone-warden") {
    updateStoneWarden(dt, boss);
  } else if (boss.kind === "sand-djinn") {
    updateSandDjinn(dt, boss);
  } else if (boss.kind === "crystal-queen") {
    updateCrystalQueen(dt, boss);
  } else if (boss.kind === "forge-titan") {
    updateForgeTitan(dt, boss);
  } else if (boss.kind === "thunder-roc") {
    updateThunderRoc(dt, boss);
  } else if (boss.kind === "ashen-behemoth") {
    updateAshenBehemoth(dt, boss);
  } else if (boss.kind === "storm-hydra") {
    updateStormHydra(dt, boss);
  } else if (boss.kind === "moonlit-empress") {
    updateMoonlitEmpress(dt, boss);
  } else if (boss.kind === "grave-sovereign") {
    updateGraveSovereign(dt, boss);
  } else if (boss.kind === "abyss-herald") {
    updateAbyssHerald(dt, boss);
  } else if (boss.kind === "crypt-matriarch") {
    updateCryptMatriarch(dt, boss);
  } else if (boss.kind === "void-seraph") {
    updateVoidSeraph(dt, boss);
  }

  if (boss.health <= 0) {
    handleBossDefeat(boss);
    state.boss = null;
  }
}

function handleBossDefeat(boss) {
  const centerX = boss.x + boss.w * 0.5;
  const centerY = boss.y + boss.h * 0.5;
  const deathColor =
    boss.kind === "overseer-eye"
      ? "#e9696a"
      : boss.kind === "crystal-queen"
        ? "#89dcff"
      : boss.kind === "forge-titan"
        ? "#ffb16b"
      : boss.kind === "thunder-roc"
        ? "#d2ecff"
      : boss.kind === "ashen-behemoth"
        ? "#ff9f67"
      : boss.kind === "storm-hydra"
        ? "#c8f1ff"
      : boss.kind === "moonlit-empress"
        ? "#b7e5ff"
      : boss.kind === "grave-sovereign"
        ? "#d7c29f"
      : boss.kind === "abyss-herald"
        ? "#cd8dff"
      : boss.kind === "crypt-matriarch"
        ? "#cab2ff"
      : boss.kind === "void-seraph"
        ? "#d78cff"
          : "#d5bf90";
  burstParticles(centerX, centerY, deathColor, 32, 220);
  addInventory("torch", 5);
  addInventory("wood", 15);

  if (boss.kind === "overseer-eye") {
    state.bossDefeated = true;
    spawnDrop("coin", 10, centerX, centerY, 0, -140);
    spawnDrop("retinaBlade", 1, centerX, centerY - 14, 4, -166);
    spawnDrop("watcherLens", 1, centerX, centerY - 10, -32, -150);
    spawnDrop("overseerCarapace", 1, centerX, centerY - 10, 30, -158);
    announce("Overseer Eye has fallen and left Retina Blade, Watcher Lens and Overseer Carapace.");
    return;
  }

  if (boss.kind === "stone-warden") {
    state.stoneWardenDefeated = true;
    spawnDrop("coin", 15, centerX, centerY, 0, -140);
    spawnDrop("wardenCleaver", 1, centerX, centerY - 14, -10, -164);
    spawnDrop("wardenPlate", 1, centerX, centerY - 10, 28, -155);
    announce("Stone Warden crumbles and leaves behind Warden Cleaver and Warden Plate.");
    return;
  }

  if (boss.kind === "sand-djinn") {
    state.sandDjinnDefeated = true;
    spawnDrop("coin", 18, centerX, centerY, 0, -150);
    spawnDrop("sandCarbine", 1, centerX, centerY - 14, -12, -170);
    spawnDrop("djinnSash", 1, centerX, centerY - 10, 0, -160);
    announce("Sandstorm Djinn is scattered and drops Sand Carbine and the Djinn Sash.");
    return;
  }

  if (boss.kind === "crystal-queen") {
    state.crystalQueenDefeated = true;
    spawnDrop("coin", 22, centerX, centerY, 0, -150);
    spawnDrop("prismLaser", 1, centerX, centerY - 14, 14, -176);
    spawnDrop("prismHeart", 1, centerX, centerY - 10, -24, -165);
    announce("Crystal Queen shatters and drops Prism Laser and Prism Heart.");
    return;
  }

  if (boss.kind === "forge-titan") {
    state.forgeTitanDefeated = true;
    spawnDrop("coin", 26, centerX, centerY, 0, -160);
    spawnDrop("titanBlaster", 1, centerX, centerY - 14, -16, -180);
    spawnDrop("forgeCore", 1, centerX, centerY - 10, 24, -172);
    announce("Forge Titan breaks apart and drops Titan Blaster and Forge Core.");
    return;
  }

  if (boss.kind === "thunder-roc") {
    state.thunderRocDefeated = true;
    spawnDrop("coin", 30, centerX, centerY, 0, -165);
    spawnDrop("tempestScattergun", 1, centerX, centerY - 14, 16, -182);
    spawnDrop("rocPlume", 1, centerX, centerY - 10, -26, -176);
    announce("Thunder Roc crashes down and drops Tempest Scattergun and Roc Plume.");
    return;
  }

  if (boss.kind === "ashen-behemoth") {
    state.ashenBehemothDefeated = true;
    spawnDrop("coin", 32, centerX, centerY, 0, -168);
    spawnDrop("ashfallMortar", 1, centerX, centerY - 10, -22, -182);
    spawnDrop("cinderSigil", 1, centerX, centerY - 10, 14, -175);
    announce("Ashen Behemoth collapses into cinders and leaves Ashfall Mortar and a Cinder Sigil.");
    return;
  }

  if (boss.kind === "storm-hydra") {
    state.stormHydraDefeated = true;
    spawnDrop("coin", 34, centerX, centerY, 0, -170);
    spawnDrop("stormspine", 1, centerX, centerY - 10, 20, -184);
    spawnDrop("hydraLoop", 1, centerX, centerY - 10, -12, -178);
    announce("Storm Hydra breaks apart into rain and leaves Stormspine and a Hydra Loop.");
    return;
  }

  if (boss.kind === "moonlit-empress") {
    state.moonlitEmpressDefeated = true;
    spawnDrop("coin", 36, centerX, centerY, 0, -172);
    spawnDrop("moonveil", 1, centerX, centerY - 10, -18, -186);
    spawnDrop("moonMantle", 1, centerX, centerY - 10, 18, -180);
    announce("Moonlit Empress fades into silver dust and leaves Moonveil and a Moon Mantle.");
    return;
  }

  if (boss.kind === "grave-sovereign") {
    state.graveSovereignDefeated = true;
    spawnDrop("coin", 38, centerX, centerY, 0, -175);
    spawnDrop("sepulcherChain", 1, centerX, centerY - 10, 20, -188);
    spawnDrop("graveChain", 1, centerX, centerY - 10, -18, -182);
    announce("Grave Sovereign is broken and sinks back into the grave, leaving Sepulcher Chain and a Grave Chain.");
    return;
  }

  if (boss.kind === "abyss-herald") {
    state.abyssHeraldDefeated = true;
    spawnDrop("coin", 40, centerX, centerY, 0, -176);
    spawnDrop("voidThorn", 1, centerX, centerY - 10, -18, -190);
    spawnDrop("abyssBloom", 1, centerX, centerY - 10, 16, -184);
    announce("Abyss Herald collapses back into the dark and leaves Void Thorn and an Abyss Bloom.");
    return;
  }

  if (boss.kind === "crypt-matriarch") {
    state.cryptMatriarchDefeated = true;
    spawnDrop("coin", 34, centerX, centerY, 0, -168);
    spawnDrop("cryptBell", 1, centerX, centerY - 14, -14, -182);
    spawnDrop("matriarchEmblem", 1, centerX, centerY - 10, 22, -178);
    announce("Crypt Matriarch fades and leaves behind Crypt Bell and the Matriarch Emblem.");
    return;
  }

	  state.voidSeraphDefeated = true;
	  spawnDrop("coin", 40, centerX, centerY, 0, -175);
	  spawnDrop("voidRelic", 1, centerX, centerY - 16, 0, -192);
	  spawnDrop("starDiadem", 1, centerX, centerY - 10, -24, -184);
	  spawnDrop("seraphWings", 1, centerX, centerY - 10, 24, -188);
	  announce("Void Seraph dissolves into starlight and drops Void Relic, Star Diadem and Seraph Wings.");
	}

function spawnProjectileTrail(projectile) {
  if (!projectile.trailColor) {
    return;
  }

  const bulletTrail = projectile.kind === "bullet";
  const life = bulletTrail ? 0.05 + Math.random() * 0.04 : 0.12 + Math.random() * 0.1;
  state.particles.push({
    x: projectile.x,
    y: projectile.y,
    vx: (Math.random() - 0.5) * (bulletTrail ? 10 : 28) - projectile.vx * (bulletTrail ? 0.02 : 0.04),
    vy: (Math.random() - 0.5) * (bulletTrail ? 10 : 22) - projectile.vy * (bulletTrail ? 0.01 : 0.02),
    ttl: life,
    life,
    size: bulletTrail ? 1 + Math.random() * 0.8 : projectile.kind === "boulder" ? 3 + Math.random() * 2 : 2 + Math.random() * 1.5,
    shrink: bulletTrail ? 22 + Math.random() * 5 : 10 + Math.random() * 3,
    color: projectile.trailColor,
  });
}

function hasShadowflame(target) {
  return !!(target?.shadowflame && target.shadowflame.ticksRemaining > 0);
}

function applyShadowflame(target, config = {}) {
  const tickInterval = Math.max(0.1, config.tickInterval ?? SHADOWFLAME_TICK_INTERVAL);
  target.shadowflame = {
    tickDamage: Math.max(1, config.tickDamage ?? SHADOWFLAME_TICK_DAMAGE),
    tickInterval,
    ticksRemaining: Math.max(1, Math.round(config.ticks ?? SHADOWFLAME_TICK_COUNT)),
    tickTimer: tickInterval,
    particleTimer: 0,
  };
}

function applyFireDebuff(target, config = {}) {
  const tickInterval = Math.max(0.1, config.tickInterval ?? FIRE_TICK_INTERVAL);
  target.fireDebuff = {
    tickDamage: Math.max(1, config.tickDamage ?? FIRE_TICK_DAMAGE),
    tickInterval,
    ticksRemaining: Math.max(1, Math.round(config.ticks ?? FIRE_TICK_COUNT)),
    tickTimer: tickInterval,
    particleTimer: 0,
  };
}

function applyProjectileHitEffect(target, projectile) {
  if (projectile.hitEffect === "shadowflame") {
    applyShadowflame(target, {
      tickDamage: projectile.hitEffectDamage,
      tickInterval: projectile.hitEffectInterval,
      ticks: projectile.hitEffectTicks,
    });
    return;
  }
  if (projectile.hitEffect === "fire") {
    applyFireDebuff(target, {
      tickDamage: projectile.hitEffectDamage,
      tickInterval: projectile.hitEffectInterval,
      ticks: projectile.hitEffectTicks,
    });
  }
}

function emitShadowflameParticles(target, count = 1) {
  for (let i = 0; i < count; i += 1) {
    const life = 0.24 + Math.random() * 0.18;
    state.particles.push({
      x: target.x + target.w * (0.2 + Math.random() * 0.6),
      y: target.y + target.h * (0.15 + Math.random() * 0.75),
      vx: (Math.random() - 0.5) * 24,
      vy: -68 - Math.random() * 54,
      ttl: life,
      life,
      size: 2 + Math.random() * 2.2,
      shrink: 8 + Math.random() * 4,
      color: Math.random() < 0.5 ? "#f1b2ff" : Math.random() < 0.5 ? "#8d4dff" : "#5819d2",
      gravityScale: -0.08,
    });
  }
}

function emitFireDebuffParticles(target, count = 1) {
  for (let i = 0; i < count; i += 1) {
    const life = 0.26 + Math.random() * 0.2;
    state.particles.push({
      x: target.x + target.w * (0.12 + Math.random() * 0.76),
      y: target.y + target.h * (0.12 + Math.random() * 0.76),
      vx: (Math.random() - 0.5) * 26,
      vy: -68 - Math.random() * 58,
      ttl: life,
      life,
      size: 3 + Math.random() * 3,
      shrink: 6.5 + Math.random() * 2.5,
      color: Math.random() < 0.25 ? "#fff0b3" : Math.random() < 0.6 ? "#ffbf63" : "#ff6a3d",
      gravityScale: -0.08,
    });
  }
}

function updateShadowflame(target, dt, onTickDamage) {
  if (!hasShadowflame(target)) {
    return;
  }

  const effect = target.shadowflame;
  effect.particleTimer -= dt;
  if (effect.particleTimer <= 0) {
    emitShadowflameParticles(target, 2);
    effect.particleTimer = SHADOWFLAME_PARTICLE_INTERVAL;
  }

  effect.tickTimer -= dt;
  while (effect.tickTimer <= 0 && effect.ticksRemaining > 0) {
    effect.ticksRemaining -= 1;
    onTickDamage(effect.tickDamage);
    emitShadowflameParticles(target, 3);
    effect.tickTimer += effect.tickInterval;
  }

  if (effect.ticksRemaining <= 0) {
    target.shadowflame = null;
  }
}

function updateFireDebuff(target, dt, onTickDamage) {
  if (!target?.fireDebuff || target.fireDebuff.ticksRemaining <= 0) {
    return;
  }

  const effect = target.fireDebuff;
  effect.tickTimer -= dt;
  effect.particleTimer -= dt;

  while (effect.tickTimer <= 0 && effect.ticksRemaining > 0) {
    effect.tickTimer += effect.tickInterval;
    effect.ticksRemaining -= 1;
    onTickDamage(effect.tickDamage);
    emitFireDebuffParticles(target, 5);
  }

  while (effect.particleTimer <= 0 && effect.ticksRemaining > 0) {
    effect.particleTimer += 0.05;
    emitFireDebuffParticles(target, 2);
  }

  if (effect.ticksRemaining <= 0) {
    target.fireDebuff = null;
  }
}

function projectileHitsWorld(projectile) {
  const sampleRadius = Math.max(2, projectile.radius - 1);
  const samples = [
    [0, 0],
    [sampleRadius, 0],
    [-sampleRadius, 0],
    [0, sampleRadius],
    [0, -sampleRadius],
  ];

  for (const [dx, dy] of samples) {
    const flowerTileX = Math.floor((projectile.x + dx) / TILE_SIZE);
    const flowerTileY = Math.floor((projectile.y + dy) / TILE_SIZE);
    if (destroyFlower(flowerTileX, flowerTileY, { silent: true })) {
      burstParticles((flowerTileX + 0.5) * TILE_SIZE, (flowerTileY + 0.7) * TILE_SIZE, "#98df7d", 4, 24);
    }
    if (isSolidTile(getTileAtPixel(projectile.x + dx, projectile.y + dy))) {
      return true;
    }
  }

  return false;
}

function shatterBoulder(projectile) {
  const shardCount = projectile.damage >= 24 ? 6 : 4;
  for (let i = 0; i < shardCount; i += 1) {
    const spread = shardCount === 1 ? 0 : i / (shardCount - 1) - 0.5;
    const angle = -Math.PI * 0.5 + spread * 1.45 + (Math.random() - 0.5) * 0.22;
    const speed = 135 + Math.random() * 85 + Math.abs(projectile.vx) * 0.08;
    spawnProjectile({
      owner: projectile.owner,
      kind: "rock-shard",
      x: projectile.x + Math.cos(angle) * 6,
      y: projectile.y + Math.sin(angle) * 6,
      vx: Math.cos(angle) * speed + Math.sign(projectile.vx || 1) * 46,
      vy: Math.sin(angle) * speed - Math.abs(projectile.vy) * 0.12,
      radius: 4,
      gravity: 330,
      damage: Math.max(7, Math.round(projectile.damage * 0.45)),
      knockbackX: Math.max(100, projectile.knockbackX * 0.45),
      knockbackY: -110,
      color: "#d6c2a5",
      impactParticles: 5,
      impactForce: 44,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: 10 + Math.random() * 9,
    });
  }
}

function shatterEmberOrb(projectile) {
  const sparkCount = projectile.damage >= 20 ? 7 : 5;
  for (let i = 0; i < sparkCount; i += 1) {
    const spread = sparkCount === 1 ? 0 : i / (sparkCount - 1) - 0.5;
    const angle = -Math.PI * 0.5 + spread * 1.65 + (Math.random() - 0.5) * 0.3;
    const speed = 120 + Math.random() * 85;
    spawnProjectile({
      owner: projectile.owner,
      kind: "ember-spark",
      x: projectile.x + Math.cos(angle) * 4,
      y: projectile.y + Math.sin(angle) * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 25,
      radius: 4,
      gravity: 220,
      damage: Math.max(6, Math.round(projectile.damage * 0.42)),
      knockbackX: 110,
      knockbackY: -95,
      color: "#ffbb72",
      trailColor: "rgba(255, 174, 94, 0.55)",
      trailInterval: 0.05,
      impactParticles: 6,
      impactForce: 48,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: 7 + Math.random() * 6,
      lightRadius: 30,
    });
  }
}

function shatterSunshard(projectile) {
  const shardCount = Math.max(1, projectile.splitCount || 8);
  for (let i = 0; i < shardCount; i += 1) {
    const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const speed = 165 + Math.random() * 45;
    spawnProjectile({
      owner: projectile.owner,
      kind: "sunshard-shard",
      x: projectile.x + Math.cos(angle) * 4,
      y: projectile.y + Math.sin(angle) * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      gravity: 0,
      damage: projectile.splitDamage || 5,
      knockbackX: 92,
      knockbackY: -42,
      color: "#fff1a8",
      trailColor: "rgba(255, 236, 148, 0.34)",
      trailInterval: 0.05,
      impactParticles: 4,
      impactForce: 34,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: 8 + Math.random() * 5,
      lightRadius: 14,
      lifetime: 0.42,
    });
  }
}

function shatterAshenMeteor(projectile) {
  const fragmentCount = 6;
  for (let i = 0; i < fragmentCount; i += 1) {
    const spread = i / (fragmentCount - 1) - 0.5;
    const angle = -Math.PI * 0.5 + spread * 1.55 + (Math.random() - 0.5) * 0.16;
    spawnProjectile({
      owner: projectile.owner,
      kind: "cinder-fragment",
      x: projectile.x + Math.cos(angle) * 5,
      y: projectile.y + Math.sin(angle) * 5,
      vx: Math.cos(angle) * (120 + Math.random() * 50),
      vy: Math.sin(angle) * (120 + Math.random() * 50) - 18,
      radius: 4,
      gravity: 250,
      damage: Math.max(7, Math.round(projectile.damage * 0.45)),
      knockbackX: 96,
      knockbackY: -82,
      color: "#ffd099",
      trailColor: "rgba(255, 202, 144, 0.28)",
      trailInterval: 0.055,
      impactParticles: 5,
      impactForce: 34,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: 7 + Math.random() * 5,
    });
  }
}

function shatterPortalProjectile(projectile) {
  const count =
    projectile.splitCount > 0
      ? projectile.splitCount
      : 4 + Math.floor(Math.random() * 3);
  const baseAngle = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const angle = baseAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
    const speed = 210 + Math.random() * 70;
    spawnProjectile({
      owner: projectile.owner,
      kind: "void-orb",
      x: projectile.x,
      y: projectile.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 7,
      gravity: 0,
      damage: projectile.splitDamage || 14,
      knockbackX: 124,
      knockbackY: -96,
      color: "#d58eff",
      trailColor: "rgba(209, 139, 255, 0.4)",
      trailInterval: 0.045,
      impactParticles: 9,
      impactForce: 62,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: 3 + Math.random() * 2,
      lightRadius: 30,
    });
  }
}

function explodeGrenade(projectile) {
  const blastRadius = 48;
  burstParticles(projectile.x, projectile.y, "#ffdb8e", 16, 110);
  burstParticles(projectile.x, projectile.y, "#ff9f52", 12, 88);

  for (const mob of state.mobs) {
    if (!mob.alive || !circleRectCollision(projectile.x, projectile.y, blastRadius, mob)) {
      continue;
    }
    const knockDirection = Math.sign(mob.x + mob.w * 0.5 - projectile.x) || 1;
    damageMob(mob, projectile.damage, knockDirection * projectile.knockbackX, projectile.knockbackY);
  }

  if (state.boss && circleRectCollision(projectile.x, projectile.y, blastRadius, state.boss)) {
    const knockDirection = Math.sign(state.boss.x + state.boss.w * 0.5 - projectile.x) || 1;
    damageBoss(Math.round(projectile.damage * 0.85), knockDirection * projectile.knockbackX, projectile.knockbackY);
  }
}

function destroyProjectile(projectile) {
  if (!projectile.alive) {
    return;
  }

  projectile.alive = false;
  burstParticles(projectile.x, projectile.y, projectile.color, projectile.impactParticles, projectile.impactForce);

  if (projectile.kind === "boulder") {
    shatterBoulder(projectile);
    burstParticles(projectile.x, projectile.y, "#c7b08b", 8, 82);
	  } else if (projectile.kind === "ember-orb") {
	    shatterEmberOrb(projectile);
	    burstParticles(projectile.x, projectile.y, "#ffb76d", 8, 78);
	  } else if (projectile.kind === "flame") {
	    burstParticles(projectile.x, projectile.y, "#ffb76d", 14, 92);
	    burstParticles(projectile.x, projectile.y, "#fff0b0", 8, 68);
	  } else if (projectile.kind === "portal") {
      shatterPortalProjectile(projectile);
      burstParticles(projectile.x, projectile.y, "#d58eff", 16, 84);
      burstParticles(projectile.x, projectile.y, "#f3d5ff", 10, 62);
	  } else if (projectile.kind === "ashen-meteor") {
    shatterAshenMeteor(projectile);
    burstParticles(projectile.x, projectile.y, "#ffbf7d", 10, 82);
  } else if (projectile.kind === "sunshard-core" && projectile.splitOnDestroy) {
    shatterSunshard(projectile);
    burstParticles(projectile.x, projectile.y, "#fff0a3", 10, 70);
  } else if (projectile.kind === "grenade") {
    explodeGrenade(projectile);
  }
}

function canLavaOccupy(world, x, y) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return false;
  }
  const tile = getTile(world, x, y);
  return tile === Tile.AIR || tile === Tile.LAVA;
}

function setLavaLevel(world, x, y, amount, source = false) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return;
  }
  const index = tileIndex(x, y);
  world.lavaLevel[index] = clamp(amount, 0, 1);
  if (source) {
    world.lavaSource[index] = 1;
  }
  if (world.lavaLevel[index] > 0.06 && canLavaOccupy(world, x, y)) {
    world.tiles[index] = Tile.LAVA;
  } else if (world.tiles[index] === Tile.LAVA) {
    world.tiles[index] = Tile.AIR;
  }
}

function syncLavaTiles(world) {
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const index = tileIndex(x, y);
      const currentTile = world.tiles[index];
      const amount = world.lavaLevel[index];
      if (currentTile !== Tile.LAVA && amount > 0.06 && canLavaOccupy(world, x, y)) {
        world.tiles[index] = Tile.LAVA;
      } else if (currentTile === Tile.LAVA && amount <= 0.06) {
        world.tiles[index] = Tile.AIR;
      }
    }
  }
}

function placeLavaPools(world, random, villageLeft, villageRight, villageBaseY) {
  const poolCount = 22 + Math.floor(random() * 10);
  let placed = 0;
  let attempts = 0;

  while (placed < poolCount && attempts < 240) {
    attempts += 1;
    const x = 8 + Math.floor(random() * (WORLD_WIDTH - 16));
    const y = Math.max(villageBaseY + 34, Math.floor(WORLD_HEIGHT * 0.72) + Math.floor(random() * (WORLD_HEIGHT * 0.18)));
    if (x >= villageLeft - 6 && x <= villageRight + 6) {
      continue;
    }
    if (getTile(world, x, y) !== Tile.AIR) {
      continue;
    }
    if (getTile(world, x, y + 1) === Tile.AIR) {
      continue;
    }

    const radius = 1.8 + random() * 2.6;
    let filled = 0;
    for (let py = Math.max(1, Math.floor(y - radius - 1)); py <= Math.min(WORLD_HEIGHT - 2, Math.ceil(y + radius + 1)); py += 1) {
      for (let px = Math.max(1, Math.floor(x - radius - 1)); px <= Math.min(WORLD_WIDTH - 2, Math.ceil(x + radius + 1)); px += 1) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy > radius * radius) {
          continue;
        }
        if (getTile(world, px, py) !== Tile.AIR) {
          continue;
        }
        if (getTile(world, px, py + 1) === Tile.AIR && dy >= 0) {
          continue;
        }
        const depthFactor = clamp(1 - Math.abs(dy) / (radius + 0.2), 0.2, 1);
        setLavaLevel(world, px, py, Math.max(world.lavaLevel[tileIndex(px, py)], depthFactor), false);
        filled += 1;
      }
    }

    if (filled > 0) {
      setLavaLevel(world, x, y, 1, true);
      if (canLavaOccupy(world, x - 1, y) && getTile(world, x - 1, y + 1) !== Tile.AIR) {
        setLavaLevel(world, x - 1, y, Math.max(world.lavaLevel[tileIndex(x - 1, y)], 0.92), true);
      }
      if (canLavaOccupy(world, x + 1, y) && getTile(world, x + 1, y + 1) !== Tile.AIR) {
        setLavaLevel(world, x + 1, y, Math.max(world.lavaLevel[tileIndex(x + 1, y)], 0.92), true);
      }
      placed += 1;
    }
  }
  syncLavaTiles(world);
}

function stepLavaFlow(world) {
  const levels = world.lavaLevel.slice();
  const next = world.lavaLevel.slice();

  for (let y = WORLD_HEIGHT - 2; y >= 1; y -= 1) {
    for (let x = 1; x < WORLD_WIDTH - 1; x += 1) {
      const index = tileIndex(x, y);
      let level = levels[index];
      if (world.lavaSource[index]) {
        level = Math.max(level, 1);
        next[index] = Math.max(next[index], 1);
      }
      if (level <= 0.01) {
        continue;
      }

      const belowIndex = tileIndex(x, y + 1);
      if (canLavaOccupy(world, x, y + 1)) {
        const capacity = Math.max(0, 1 - next[belowIndex]);
        const flowDown = Math.min(level, capacity, 0.45);
        if (flowDown > 0) {
          next[index] -= flowDown;
          next[belowIndex] += flowDown;
          level -= flowDown;
        }
      }

      const directions = (x + y + Math.floor(state.elapsed * 10)) % 2 === 0 ? [-1, 1] : [1, -1];
      for (const direction of directions) {
        const nx = x + direction;
        const neighborIndex = tileIndex(nx, y);
        if (!canLavaOccupy(world, nx, y)) {
          continue;
        }
        const difference = next[index] - next[neighborIndex];
        if (difference <= 0.08) {
          continue;
        }
        const flowSide = Math.min(difference * 0.25, 0.12);
        next[index] -= flowSide;
        next[neighborIndex] += flowSide;
      }
    }
  }

  for (let i = 0; i < next.length; i += 1) {
    if (world.lavaSource[i]) {
      next[i] = Math.max(next[i], 1);
    }
    world.lavaLevel[i] = clamp(next[i], 0, 1);
  }
  syncLavaTiles(world);
}

function updateLava(dt) {
  state.lavaFlowTimer += dt;
  while (state.lavaFlowTimer >= LAVA_FLOW_STEP) {
    state.lavaFlowTimer -= LAVA_FLOW_STEP;
    stepLavaFlow(state.world);
  }
}

function isEntityInLava(entity) {
  const left = clamp(Math.floor(entity.x / TILE_SIZE), 0, WORLD_WIDTH - 1);
  const right = clamp(Math.floor((entity.x + entity.w - 1) / TILE_SIZE), 0, WORLD_WIDTH - 1);
  const top = clamp(Math.floor(entity.y / TILE_SIZE), 0, WORLD_HEIGHT - 1);
  const bottom = clamp(Math.floor((entity.y + entity.h - 1) / TILE_SIZE), 0, WORLD_HEIGHT - 1);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const index = tileIndex(x, y);
      if (getTile(state.world, x, y) !== Tile.LAVA || state.world.lavaLevel[index] <= 0.06) {
        continue;
      }
      if (overlaps(entity, { x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE })) {
        return true;
      }
    }
  }

  return false;
}

function applyLavaPhysics(entity, dt) {
  if (!isEntityInLava(entity)) {
    return false;
  }
  entity.onGround = false;
  entity.vx = approach(entity.vx, entity.vx * 0.3, 260 * dt);
  entity.vy = approach(entity.vy, 28, 440 * dt);
  if (entity === state.player && input.down.has("Space")) {
    entity.vy -= 185 * dt;
  }
  return true;
}

function updateEnvironmentalHazards(dt) {
  state.player.fireHazardTimer = Math.max(0, (state.player.fireHazardTimer ?? 0) - dt);
  if (applyLavaPhysics(state.player, dt) && state.player.fireHazardTimer <= 0) {
    state.player.fireHazardTimer = LAVA_DAMAGE_INTERVAL;
    burstParticles(state.player.x + state.player.w * 0.5, state.player.y + state.player.h * 0.65, "#ff8c3f", 6, 26);
    damagePlayer(16, 0, -36, { invulnDuration: 0.16 });
  }

  for (const mob of state.mobs) {
    if (!mob.alive) {
      continue;
    }
    mob.fireHazardTimer = Math.max(0, (mob.fireHazardTimer ?? 0) - dt);
    if (applyLavaPhysics(mob, dt) && mob.fireHazardTimer <= 0) {
      mob.fireHazardTimer = LAVA_DAMAGE_INTERVAL;
      damageMob(mob, 14, 0, -18, {
        bypassInvuln: true,
        invulnDuration: 0,
        particleCount: 0,
      });
    }
  }

  for (const npc of state.npcs) {
    if (!npc.alive) {
      continue;
    }
    npc.fireHazardTimer = Math.max(0, (npc.fireHazardTimer ?? 0) - dt);
    if (applyLavaPhysics(npc, dt) && npc.fireHazardTimer <= 0) {
      npc.fireHazardTimer = LAVA_DAMAGE_INTERVAL;
      damageNpc(npc, 14, 0, -18, {
        bypassInvuln: true,
        invulnDuration: 0,
        particleCount: 0,
      });
    }
  }
}

function findNearestProjectileTarget(projectile, range) {
  let bestTarget = null;
  let bestDistance = range;

  for (const mob of state.mobs) {
    if (!mob.alive) {
      continue;
    }
    const dx = mob.x + mob.w * 0.5 - projectile.x;
    const dy = mob.y + mob.h * 0.5 - projectile.y;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTarget = { x: mob.x + mob.w * 0.5, y: mob.y + mob.h * 0.5 };
    }
  }

  if (state.boss) {
    const dx = state.boss.x + state.boss.w * 0.5 - projectile.x;
    const dy = state.boss.y + state.boss.h * 0.5 - projectile.y;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestTarget = { x: state.boss.x + state.boss.w * 0.5, y: state.boss.y + state.boss.h * 0.5 };
    }
  }

  return bestTarget;
}

function updateProjectileHoming(projectile, dt) {
  if (projectile.owner !== "player" || projectile.homingStrength <= 0 || projectile.homingRange <= 0) {
    return;
  }

  const target = findNearestProjectileTarget(projectile, projectile.homingRange);
  if (!target) {
    return;
  }

  const dx = target.x - projectile.x;
  const dy = target.y - projectile.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = Math.hypot(projectile.vx, projectile.vy) || 1;
  const forwardX = projectile.vx / speed;
  const forwardY = projectile.vy / speed;
  const targetDirX = dx / distance;
  const targetDirY = dy / distance;
  const forwardDot = forwardX * targetDirX + forwardY * targetDirY;
  if (forwardDot <= 0.08) {
    return;
  }
  const desiredVx = (dx / distance) * speed;
  const desiredVy = (dy / distance) * speed;
  const homingPower = projectile.homingStrength * (0.45 + forwardDot * 0.55);
  projectile.vx = approach(projectile.vx, desiredVx, homingPower * dt);
  projectile.vy = approach(projectile.vy, desiredVy, homingPower * dt);
}

function updateProjectiles(dt) {
  const projectiles = state.projectiles;
  const initialCount = projectiles.length;

  for (let index = 0; index < initialCount; index += 1) {
    const projectile = projectiles[index];
    if (!projectile.alive) {
      continue;
    }

    projectile.age += dt;
    if (projectile.orbiting) {
      const targetAnchorX = state.player.x + state.player.w * 0.5;
      const targetAnchorY = state.player.y + state.player.h * 0.5;
      const followSpeed = projectile.orbitFollowSpeed ?? 1800;
      projectile.orbitAnchorX = approach(projectile.orbitAnchorX ?? targetAnchorX, targetAnchorX, followSpeed * dt);
      projectile.orbitAnchorY = approach(projectile.orbitAnchorY ?? targetAnchorY, targetAnchorY, followSpeed * dt);
      projectile.orbitAngle += (projectile.orbitSpeed ?? 2.3) * dt;
      projectile.x = projectile.orbitAnchorX + Math.cos(projectile.orbitAngle) * (projectile.orbitRadius ?? (16 * 7));
      projectile.y = projectile.orbitAnchorY + Math.sin(projectile.orbitAngle) * (projectile.orbitRadius ?? (16 * 7));
      projectile.rotation = projectile.orbitAngle + Math.PI * 0.5;
    }
	    if (projectile.growDuration > 0) {
	      const growthRatio = clamp(projectile.age / projectile.growDuration, 0, 1);
	      projectile.radius = lerp(projectile.baseRadius ?? projectile.radius, projectile.targetRadius ?? projectile.radius, growthRatio);
	      if (projectile.kind === "flame") {
	        projectile.lightRadius = lerp(16, projectile.targetRadius ?? 50, growthRatio);
	      }
	    }
      updateProjectileHoming(projectile, dt);
      let handledCustomMotion = false;
      if (!projectile.orbiting && projectile.stormspineTwister) {
        const curveDelay = projectile.stormspineCurveDelay ?? 0.5;
        const curveDuration = projectile.stormspineCurveDuration ?? 0.5;
        if (projectile.age > curveDelay && curveDuration > 0) {
          if (!projectile.stormspineCurveStarted) {
            projectile.stormspineCurveStarted = true;
            projectile.stormspineCurveStartX = projectile.x;
            projectile.stormspineCurveStartY = projectile.y;
            projectile.stormspineCurveBaseAngle = Math.atan2(projectile.vy, projectile.vx);
            projectile.stormspineCurveSpeed = Math.hypot(projectile.vx, projectile.vy);
          }
          const progress = clamp((projectile.age - curveDelay) / curveDuration, 0, 1);
          const baseAngle = projectile.stormspineCurveBaseAngle;
          const direction = projectile.stormspineCurveDirection || 1;
          const speed = projectile.stormspineCurveSpeed || Math.hypot(projectile.vx, projectile.vy);
          const forwardDistance = speed * (projectile.age - curveDelay);
          const forwardX = Math.cos(baseAngle);
          const forwardY = Math.sin(baseAngle);
          const spinAngle = direction * Math.PI * progress;
          const offsetRadius = (projectile.stormspineCurveRadius ?? 42) * progress;
          const offsetAngle = baseAngle + spinAngle + Math.PI * 0.5;
          const baseX = projectile.stormspineCurveStartX + forwardX * forwardDistance;
          const baseY = projectile.stormspineCurveStartY + forwardY * forwardDistance;
          projectile.x = baseX + Math.cos(offsetAngle) * offsetRadius;
          projectile.y = baseY + Math.sin(offsetAngle) * offsetRadius;
          const tangentAngle = baseAngle + direction * Math.PI * 0.9 * progress;
          projectile.vx = Math.cos(tangentAngle) * speed;
          projectile.vy = Math.sin(tangentAngle) * speed;
          projectile.rotation = tangentAngle;
          handledCustomMotion = true;
        }
      }

      if (projectile.kind === "void-tracker") {
        if (projectile.trackTimer > 0) {
          projectile.trackTimer = Math.max(0, projectile.trackTimer - dt);
          const targetX = state.player.x + state.player.w * 0.5;
          const targetY = state.player.y + state.player.h * 0.5;
          const dx = targetX - projectile.x;
          const dy = targetY - projectile.y;
          const dist = Math.hypot(dx, dy) || 1;
          const chaseSpeed = 210;
          projectile.vx = approach(projectile.vx, (dx / dist) * chaseSpeed, 1320 * dt);
          projectile.vy = approach(projectile.vy, (dy / dist) * chaseSpeed, 1320 * dt);
          projectile.x += projectile.vx * dt;
          projectile.y += projectile.vy * dt;
          projectile.rotation = Math.atan2(projectile.vy, projectile.vx);
          handledCustomMotion = true;
        } else if (!projectile.voidTrackerStopped) {
          projectile.voidTrackerStopped = true;
          projectile.vx = 0;
          projectile.vy = 0;
          projectile.collapseTimer = 0.45;
        } else if (projectile.collapseTimer > 0) {
          projectile.collapseTimer = Math.max(0, projectile.collapseTimer - dt);
          const baseRadius = projectile.baseRadius ?? projectile.radius;
          projectile.radius = Math.max(2, lerp(1, baseRadius, projectile.collapseTimer / 0.45));
          projectile.rotation += 2 * dt;
          if (projectile.collapseTimer <= 0) {
            const blastRadius = 38;
            burstParticles(projectile.x, projectile.y, "#bf75ff", 18, 88);
            if (circleRectCollision(projectile.x, projectile.y, blastRadius, state.player)) {
              damagePlayer(12, 0, -22);
            }
            destroyProjectile(projectile);
            continue;
          }
          handledCustomMotion = true;
        }
      }

      if (!projectile.orbiting && !handledCustomMotion) {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.vy += projectile.gravity * dt;
        projectile.rotation += projectile.spinSpeed * dt;
      }

      if (projectile.trailHistoryLength > 0) {
        projectile.trailHistory.unshift({
          x: projectile.x,
          y: projectile.y,
          rotation: projectile.rotation,
        });
        if (projectile.trailHistory.length > projectile.trailHistoryLength) {
          projectile.trailHistory.length = projectile.trailHistoryLength;
        }
      }

    if (projectile.lifetime > 0 && projectile.age >= projectile.lifetime) {
      destroyProjectile(projectile);
      continue;
    }

    if (projectile.boomerang && projectile.owner === "player") {
      const traveled = Math.hypot(projectile.x - projectile.spawnX, projectile.y - projectile.spawnY);
      if (!projectile.returning && (projectile.remainingHits <= 0 || projectile.age >= projectile.returnDelay || traveled >= projectile.maxTravel)) {
        projectile.returning = true;
        projectile.ignoreWorld = true;
      }

      if (projectile.returning) {
        const targetX = state.player.x + state.player.w * 0.5;
        const targetY = state.player.y + state.player.h * 0.42;
        const dx = targetX - projectile.x;
        const dy = targetY - projectile.y;
        const distance = Math.hypot(dx, dy) || 1;
        const returnSpeed = 380;
        projectile.vx = approach(projectile.vx, (dx / distance) * returnSpeed, 920 * dt);
        projectile.vy = approach(projectile.vy, (dy / distance) * returnSpeed, 920 * dt);
        if (distance < 18) {
          projectile.alive = false;
          continue;
        }
      }
    }

    if (projectile.trailInterval > 0) {
      projectile.trailTimer -= dt;
      while (projectile.trailTimer <= 0) {
        projectile.trailTimer += projectile.trailInterval;
        spawnProjectileTrail(projectile);
      }
    }

	    if (!projectile.orbiting && (
	      projectile.x < projectile.radius ||
	      projectile.x > WORLD_PIXEL_WIDTH - projectile.radius ||
	      projectile.y < projectile.radius ||
	      projectile.y > WORLD_PIXEL_HEIGHT - projectile.radius
	    )) {
	      destroyProjectile(projectile);
	      continue;
	    }

    if (!projectile.ignoreWorld && projectileHitsWorld(projectile)) {
      if (projectile.boomerang && projectile.owner === "player") {
        projectile.returning = true;
        projectile.ignoreWorld = true;
        burstParticles(projectile.x, projectile.y, projectile.color, 4, 34);
        continue;
      }
      destroyProjectile(projectile);
      continue;
    }

    if (projectile.owner === "player") {
      for (const mob of state.mobs) {
        if (!mob.alive || !projectile.alive) {
          continue;
        }
        if (circleRectCollision(projectile.x, projectile.y, projectile.radius, mob)) {
	        if (!projectile.harmless && projectile.kind !== "grenade") {
            if (projectile.infinitePierce) {
              if (projectile.hitTargets.has(mob.id)) {
                continue;
              }
	              projectile.hitTargets.add(mob.id);
	              applyProjectileImpactToMob(mob, projectile);
	              const damaged = damageMob(mob, projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY, {
                  bypassInvuln: projectile.bypassTargetInvuln,
                  invulnDuration: projectile.bypassTargetInvuln ? 0 : undefined,
                });
	              if (damaged && mob.alive) {
	                applyProjectileHitEffect(mob, projectile);
	              }
              continue;
            }
	            if ((projectile.kind === "grave-skull" && projectile.boomerang) || projectile.kind === "shadow-dagger") {
	              if (projectile.remainingHits <= 0 || projectile.hitTargets.has(mob.id)) {
	                continue;
	              }
	              projectile.hitTargets.add(mob.id);
	              applyProjectileImpactToMob(mob, projectile);
	              const damaged = damageMob(mob, projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY, {
                  bypassInvuln: projectile.bypassTargetInvuln || projectile.kind === "shadow-dagger",
                  invulnDuration: projectile.bypassTargetInvuln || projectile.kind === "shadow-dagger" ? 0 : undefined,
                });
	              if (damaged && mob.alive) {
	                applyProjectileHitEffect(mob, projectile);
	              }
              projectile.remainingHits = Math.max(0, projectile.remainingHits - 1);
	              if (projectile.kind === "grave-skull" && projectile.remainingHits <= 0) {
	                projectile.returning = true;
	                projectile.ignoreWorld = true;
	              } else if (projectile.kind === "shadow-dagger" && projectile.remainingHits > 0) {
                  projectile.hitTargets.clear();
	              }
	              continue;
	            }
	            applyProjectileImpactToMob(mob, projectile);
	            const damaged = damageMob(mob, projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY, {
                bypassInvuln: projectile.bypassTargetInvuln,
                invulnDuration: projectile.bypassTargetInvuln ? 0 : undefined,
              });
	            if (damaged && mob.alive) {
	              applyProjectileHitEffect(mob, projectile);
	            }
          }
          destroyProjectile(projectile);
        }
      }

      if (state.boss && projectile.alive && circleRectCollision(projectile.x, projectile.y, projectile.radius, state.boss)) {
	        if (!projectile.harmless && projectile.kind !== "grenade") {
          if (projectile.infinitePierce) {
            if (!projectile.hitTargets.has("boss")) {
	              projectile.hitTargets.add("boss");
	              applyProjectileImpactToBoss(state.boss, projectile);
	              const damaged = damageBoss(projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY, {
                  bypassInvuln: projectile.bypassTargetInvuln,
                  invulnDuration: projectile.bypassTargetInvuln ? 0 : undefined,
                  pierceArmor: (projectile.kind === "flame" || projectile.kind === "laser") ? 8 : 0,
                });
	              if (damaged && state.boss && state.boss.health > 0) {
	                applyProjectileHitEffect(state.boss, projectile);
	              }
            }
            continue;
          }
	          if ((projectile.kind === "grave-skull" && projectile.boomerang) || projectile.kind === "shadow-dagger") {
	            if (projectile.remainingHits > 0 && !projectile.hitTargets.has("boss")) {
	              projectile.hitTargets.add("boss");
	              applyProjectileImpactToBoss(state.boss, projectile);
	              const damaged = damageBoss(projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY, {
                  bypassInvuln: projectile.bypassTargetInvuln || projectile.kind === "shadow-dagger",
                  invulnDuration: projectile.bypassTargetInvuln || projectile.kind === "shadow-dagger" ? 0 : undefined,
                  pierceArmor: (projectile.kind === "flame" || projectile.kind === "laser") ? 8 : 0,
                });
	              if (damaged && state.boss && state.boss.health > 0) {
	                applyProjectileHitEffect(state.boss, projectile);
	              }
              projectile.remainingHits = Math.max(0, projectile.remainingHits - 1);
	              if (projectile.kind === "grave-skull" && projectile.remainingHits <= 0) {
	                projectile.returning = true;
	                projectile.ignoreWorld = true;
	              } else if (projectile.kind === "shadow-dagger" && projectile.remainingHits > 0) {
                  projectile.hitTargets.delete("boss");
	              }
	            }
	            continue;
	          }
	          applyProjectileImpactToBoss(state.boss, projectile);
	          const damaged = damageBoss(projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY, {
                bypassInvuln: projectile.bypassTargetInvuln,
                invulnDuration: projectile.bypassTargetInvuln ? 0 : undefined,
                pierceArmor: (projectile.kind === "flame" || projectile.kind === "laser") ? 8 : 0,
              });
	          if (damaged && state.boss && state.boss.health > 0) {
	            applyProjectileHitEffect(state.boss, projectile);
	          }
        }
        destroyProjectile(projectile);
      }
	    } else if (projectile.owner === "enemy" && !projectile.harmless && circleRectCollision(projectile.x, projectile.y, projectile.radius, state.player)) {
      damagePlayer(projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY);
      if (state.projectiles !== projectiles) {
        return;
      }
      destroyProjectile(projectile);
    } else if (projectile.owner === "enemy") {
      for (const npc of state.npcs) {
        if (!npc.alive) {
          continue;
        }
        if (!projectile.harmless && circleRectCollision(projectile.x, projectile.y, projectile.radius, npc)) {
          damageNpc(npc, projectile.damage, Math.sign(projectile.vx || 1) * projectile.knockbackX, projectile.knockbackY);
          if (state.projectiles !== projectiles) {
            return;
          }
          destroyProjectile(projectile);
          break;
        }
      }
    }
  }

  if (state.projectiles === projectiles) {
    state.projectiles = projectiles.filter((projectile) => projectile.alive);
  }
}

function updateBeams(dt) {
  for (const beam of state.beams) {
    beam.ttl -= dt;
  }
  state.beams = state.beams.filter((beam) => beam.ttl > 0);
}

function updatePortals(dt) {
  for (const portal of state.portals) {
    portal.ttl -= dt;
  }
  state.portals = state.portals.filter((portal) => portal.ttl > 0);
}

function updateOverseerEye(dt, boss) {
  boss.dashCooldown -= dt;
  boss.dashTimer = Math.max(0, boss.dashTimer - dt);
  boss.volleyTimer -= dt;
  boss.spawnTimer -= dt;
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;

  if (boss.dashTimer > 0) {
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  } else {
    const bobOffset = Math.sin(state.elapsed * (boss.phase === 1 ? 2.1 : 3.2)) * (boss.phase === 1 ? 108 : 84);
    const targetX = playerCenterX + bobOffset - boss.w * 0.5;
    const targetY = state.player.y - (boss.phase === 1 ? 188 : 138) + Math.cos(state.elapsed * 2.1) * 14;
    boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2, -190, 190), 285 * dt);
    boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.05, -175, 175), 245 * dt);
    pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 188 : 156, 980, dt, -18);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  }

  if (boss.dashCooldown <= 0) {
    const angle = Math.atan2(
      playerCenterY - (boss.y + boss.h * 0.5),
      playerCenterX - (boss.x + boss.w * 0.5)
    );
    const dashSpeed = boss.phase === 1 ? 300 : 382;
    boss.vx = Math.cos(angle) * dashSpeed;
    boss.vy = Math.sin(angle) * dashSpeed;
    boss.dashTimer = boss.phase === 1 ? 0.5 : 0.62;
    boss.dashCooldown = boss.phase === 1 ? 3.15 : 2.15;
    announce("Overseer Eye is charging.");
  }

  if (boss.dashTimer <= 0 && boss.volleyTimer <= 0) {
    const shotCount = boss.phase === 1 ? 2 : 3;
    const speed = boss.phase === 1 ? 300 : 370;
    const spread = boss.phase === 1 ? 0.08 : 0.15;
    const shotTargetY = state.player.y + state.player.h * 0.35;

    for (let i = 0; i < shotCount; i += 1) {
      const shotOffset = i - (shotCount - 1) * 0.5;
      const originX = boss.x + boss.w * 0.5 + shotOffset * 16;
      const originY = boss.y + boss.h * 0.55;
      const angle = Math.atan2(shotTargetY - originY, playerCenterX - originX) + shotOffset * spread;
      spawnProjectile({
        owner: "enemy",
        kind: "eye-bolt",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        gravity: 0,
        damage: boss.phase === 1 ? 12 : 16,
        knockbackX: boss.phase === 1 ? 125 : 155,
        knockbackY: -120,
        color: "#ef6a74",
        trailColor: "#f28a92",
        trailInterval: 0.035,
        impactParticles: 8,
        impactForce: 60,
        rotation: angle,
        spinSpeed: 2.6,
        lightRadius: 52,
      });
    }

    boss.volleyTimer = boss.phase === 1 ? 2.35 : 1.25;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.55, "#f06b74", shotCount + 2, 48);
  }

  if (boss.phase === 2 && boss.spawnTimer <= 0 && countMobsByKind("eye-servant") < 4) {
    boss.spawnTimer = 3.2;
    spawnEyeServant(boss.x + boss.w * 0.2, boss.y + boss.h * 0.45);
    spawnEyeServant(boss.x + boss.w * 0.8, boss.y + boss.h * 0.45);
  }

  boss.x = clamp(boss.x, 16, WORLD_PIXEL_WIDTH - boss.w - 16);
  boss.y = clamp(boss.y, 24, WORLD_PIXEL_HEIGHT - 160);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign((state.player.x + state.player.w * 0.5) - (boss.x + boss.w * 0.5)) * 280;
    damagePlayer(boss.phase === 1 ? 18 : 26, knockback, -180);
  }
}

function updateStoneWarden(dt, boss) {
  boss.jumpTimer -= dt;
  boss.shockwaveTimer -= dt;
  boss.throwTimer -= dt;

  const direction = Math.sign((state.player.x + state.player.w * 0.5) - (boss.x + boss.w * 0.5)) || boss.facing || 1;
  boss.facing = direction;
  boss.vx = approach(boss.vx, direction * (boss.phase === 1 ? 82 : 118), 300 * dt);

  if (boss.onGround && boss.jumpTimer <= 0) {
    boss.vy = boss.phase === 1 ? -350 : -410;
    boss.vx = direction * (boss.phase === 1 ? 150 : 205);
    boss.jumpTimer = boss.phase === 1 ? 1.5 : 0.95;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#d3c295", 14, 130);
  }

  moveGroundEntity(boss, dt, false);
  boss.x = clamp(boss.x, 16, WORLD_PIXEL_WIDTH - boss.w - 16);

  if (boss.onGround && boss.shockwaveTimer <= 0 && Math.abs(boss.vy) < 1) {
    boss.shockwaveTimer = boss.phase === 1 ? 1.2 : 0.75;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#c7b188", 10, 90);
    if (playerIsNearBossGroundImpact(boss, 86, 26)) {
      damagePlayer(boss.phase === 1 ? 16 : 22, direction * 210, -160);
    }
  }

  if (boss.onGround && boss.throwTimer <= 0) {
    const originX = boss.x + boss.w * 0.5 + boss.facing * 18;
    const originY = boss.y + boss.h * 0.32;
    const targetX = state.player.x + state.player.w * 0.5;
    const targetY = state.player.y + state.player.h * 0.42;
    const gravity = 320;
    const travelTime = clamp(Math.abs(targetX - originX) / (boss.phase === 1 ? 235 : 300), 0.42, boss.phase === 1 ? 0.95 : 0.78);
    const vx = (targetX - originX) / travelTime;
    const vy = (targetY - originY - 0.5 * gravity * travelTime * travelTime) / travelTime;

    spawnProjectile({
      owner: "enemy",
      kind: "boulder",
      x: originX,
      y: originY,
      vx,
      vy,
      radius: boss.phase === 1 ? 10 : 12,
      gravity,
      damage: boss.phase === 1 ? 20 : 26,
      knockbackX: boss.phase === 1 ? 240 : 305,
      knockbackY: -185,
      color: "#c7af8d",
      trailColor: "#a28c71",
      trailInterval: 0.045,
      impactParticles: 14,
      impactForce: 110,
      rotation: Math.random() * Math.PI * 2,
      spinSpeed: boss.phase === 1 ? 7 : 9,
    });

    boss.throwTimer = boss.phase === 1 ? 2.15 : 1.25;
    boss.vx -= boss.facing * 42;
    burstParticles(originX, originY, "#cdb68f", 8, 58);
  }

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign((state.player.x + state.player.w * 0.5) - (boss.x + boss.w * 0.5)) * 240;
    damagePlayer(boss.phase === 1 ? 14 : 20, knockback, -160);
  }
}

function updateSandDjinn(dt, boss) {
  boss.volleyTimer -= dt;
  boss.spawnTimer -= dt;
  boss.driftTimer += dt;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  const targetX = playerCenterX + Math.sin(state.elapsed * (boss.phase === 1 ? 1.8 : 2.6)) * (boss.phase === 1 ? 118 : 88) - boss.w * 0.5;
  const targetY = state.player.y - (boss.phase === 1 ? 138 : 108) + Math.cos(state.elapsed * 2.5) * 26;

  boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.3, -240, 240), 360 * dt);
  boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.4, -210, 210), 360 * dt);
  pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 154 : 128, 620, dt, -14);
  boss.x += boss.vx * dt;
  boss.y += boss.vy * dt;

  if (boss.volleyTimer <= 0) {
    const shotCount = boss.phase === 1 ? 3 : 5;
    const speed = boss.phase === 1 ? 300 : 360;
    for (let i = 0; i < shotCount; i += 1) {
      const offset = i - (shotCount - 1) * 0.5;
      const originX = boss.x + boss.w * 0.5;
      const originY = boss.y + boss.h * 0.55;
      const angle = Math.atan2(playerCenterY - originY, playerCenterX - originX) + offset * 0.12;
      spawnProjectile({
        owner: "enemy",
        kind: "sand-spike",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 16,
        radius: 5,
        gravity: 110,
        damage: boss.phase === 1 ? 13 : 17,
        knockbackX: 125,
        knockbackY: -100,
        color: "#e6c07f",
        trailColor: "rgba(231, 205, 141, 0.4)",
        trailInterval: 0.06,
        impactParticles: 7,
        impactForce: 52,
        rotation: angle,
      });
    }
    boss.volleyTimer = boss.phase === 1 ? 1.65 : 0.95;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.55, "#ebcb88", shotCount + 1, 40);
  }

  const wispCap = boss.phase === 1 ? 2 : 4;
  if (boss.spawnTimer <= 0 && countMobsByKind("sand-wisp") < wispCap) {
    boss.spawnTimer = boss.phase === 1 ? 5.2 : 3.4;
    spawnSandWisp(boss.x + boss.w * 0.2, boss.y + boss.h * 0.45);
    if (boss.phase === 2 && countMobsByKind("sand-wisp") < wispCap) {
      spawnSandWisp(boss.x + boss.w * 0.78, boss.y + boss.h * 0.35);
    }
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.48, "#efd291", 8, 48);
  }

  boss.x = clamp(boss.x, 20, WORLD_PIXEL_WIDTH - boss.w - 20);
  boss.y = clamp(boss.y, 26, WORLD_PIXEL_HEIGHT - 220);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 230;
    damagePlayer(boss.phase === 1 ? 16 : 22, knockback, -140);
  }
}

function updateCrystalQueen(dt, boss) {
  boss.volleyTimer -= dt;
  boss.teleportTimer -= dt;
  boss.telegraphTimer = Math.max(0, boss.telegraphTimer - dt);

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  const targetX = playerCenterX + Math.sin(state.elapsed * 1.45) * (boss.phase === 1 ? 134 : 108) - boss.w * 0.5;
  const targetY = state.player.y - (boss.phase === 1 ? 194 : 156) + Math.cos(state.elapsed * 2.8) * 18;

  if (boss.teleportMoveTimer > 0 && boss.pendingTeleport) {
    boss.teleportMoveTimer = Math.max(0, boss.teleportMoveTimer - dt);
    const progress = 1 - boss.teleportMoveTimer / boss.teleportMoveDuration;
    const eased = progress * progress * (3 - 2 * progress);
    boss.x = lerp(boss.teleportFrom.x, boss.pendingTeleport.x, eased);
    boss.y = lerp(boss.teleportFrom.y, boss.pendingTeleport.y, eased);
    boss.vx = 0;
    boss.vy = 0;
    if (boss.teleportMoveTimer <= 0) {
      boss.x = boss.pendingTeleport.x;
      boss.y = boss.pendingTeleport.y;
      burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.55, "#9ce8ff", 12, 62);
      boss.pendingTeleport = null;
      boss.teleportFrom = null;
    }
  } else {
    const movementSlowdown = boss.pendingTeleport ? 0.38 : 1;
    boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.05, -220, 220), 330 * dt * movementSlowdown);
    boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.1, -190, 190), 330 * dt * movementSlowdown);
    pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 198 : 168, 840, dt, -22);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  }

  if (!boss.pendingTeleport && boss.teleportTimer <= 0) {
    const side = Math.random() < 0.5 ? -1 : 1;
    boss.pendingTeleport = {
      x: clamp(playerCenterX + side * (boss.phase === 1 ? 168 : 132) - boss.w * 0.5, 18, WORLD_PIXEL_WIDTH - boss.w - 18),
      y: clamp(state.player.y - (boss.phase === 1 ? 176 : 148) + Math.random() * 40, 22, WORLD_PIXEL_HEIGHT - 240),
    };
    boss.telegraphDuration = boss.phase === 1 ? 0.55 : 0.42;
    boss.telegraphTimer = boss.telegraphDuration;
    boss.teleportTimer = boss.phase === 1 ? 3.2 : 2.2;
    burstParticles(boss.pendingTeleport.x + boss.w * 0.5, boss.pendingTeleport.y + boss.h * 0.55, "#b3f1ff", 9, 48);
  }

  if (boss.pendingTeleport && boss.telegraphTimer <= 0 && boss.teleportMoveTimer <= 0) {
    boss.teleportFrom = { x: boss.x, y: boss.y };
    boss.teleportMoveDuration = boss.phase === 1 ? 0.18 : 0.14;
    boss.teleportMoveTimer = boss.teleportMoveDuration;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.55, "#83e0ff", 8, 52);
  }

  if (boss.volleyTimer <= 0 && boss.telegraphTimer <= 0 && boss.teleportMoveTimer <= 0) {
    const shotCount = boss.phase === 1 ? 3 : 5;
    const speed = boss.phase === 1 ? 360 : 420;
    const baseAngle = Math.atan2(playerCenterY - (boss.y + boss.h * 0.52), playerCenterX - (boss.x + boss.w * 0.5));
    for (let i = 0; i < shotCount; i += 1) {
      const offset = i - (shotCount - 1) * 0.5;
      const angle = baseAngle + offset * 0.18;
      spawnProjectile({
        owner: "enemy",
        kind: "crystal-bolt",
        x: boss.x + boss.w * 0.5,
        y: boss.y + boss.h * 0.52,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        gravity: 0,
        damage: boss.phase === 1 ? 14 : 18,
        knockbackX: 145,
        knockbackY: -110,
        color: "#8ce7ff",
        trailColor: "rgba(150, 239, 255, 0.48)",
        trailInterval: 0.04,
        impactParticles: 8,
        impactForce: 58,
        rotation: angle,
        lightRadius: 44,
      });
    }
    boss.volleyTimer = boss.phase === 1 ? 1.9 : 1.18;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.52, "#9deaff", shotCount + 2, 44);
  }

  boss.x = clamp(boss.x, 18, WORLD_PIXEL_WIDTH - boss.w - 18);
  boss.y = clamp(boss.y, 20, WORLD_PIXEL_HEIGHT - 230);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 240;
    damagePlayer(boss.phase === 1 ? 18 : 24, knockback, -150);
  }
}

function updateForgeTitan(dt, boss) {
  boss.jumpTimer -= dt;
  boss.volleyTimer -= dt;
  boss.barrageTimer -= dt;
  boss.stompTimer -= dt;

  const direction = Math.sign((state.player.x + state.player.w * 0.5) - (boss.x + boss.w * 0.5)) || boss.facing || 1;
  boss.facing = direction;
  boss.vx = approach(boss.vx, direction * (boss.phase === 1 ? 74 : 104), 260 * dt);

  if (boss.onGround && boss.jumpTimer <= 0) {
    boss.vy = boss.phase === 1 ? -300 : -350;
    boss.vx = direction * (boss.phase === 1 ? 112 : 150);
    boss.jumpTimer = boss.phase === 1 ? 1.35 : 0.92;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#ffb36b", 12, 120);
  }

  const wasOnGround = boss.onGround;
  const preMoveVy = boss.vy;
  moveGroundEntity(boss, dt, false);
  boss.x = clamp(boss.x, 16, WORLD_PIXEL_WIDTH - boss.w - 16);

  if (!wasOnGround && boss.onGround && preMoveVy > 120 && boss.stompTimer <= 0) {
    boss.stompTimer = boss.phase === 1 ? 1.2 : 0.9;
    for (const side of [-1, 1]) {
      for (let i = 0; i < (boss.phase === 1 ? 2 : 3); i += 1) {
        spawnProjectile({
          owner: "enemy",
          kind: "slag-shard",
          x: boss.x + boss.w * 0.5 + side * (8 + i * 4),
          y: boss.y + boss.h * 0.82,
          vx: side * (135 + i * 22),
          vy: -110 - i * 24,
          radius: 4,
          gravity: 250,
          damage: boss.phase === 1 ? 10 : 13,
          knockbackX: 105,
          knockbackY: -92,
          color: "#ffc27a",
          trailColor: "rgba(255, 186, 116, 0.36)",
          trailInterval: 0.06,
          impactParticles: 6,
          impactForce: 44,
          rotation: Math.random() * Math.PI * 2,
          spinSpeed: 8 + Math.random() * 5,
          lightRadius: 22,
        });
      }
    }
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#ffbf76", 10, 92);
  }

  if (boss.onGround && boss.volleyTimer <= 0) {
    const shotCount = boss.phase === 1 ? 1 : 2;
    for (let i = 0; i < shotCount; i += 1) {
      const offset = shotCount === 1 ? 0 : i - 0.5;
      const originX = boss.x + boss.w * 0.5 + boss.facing * 18 + offset * 10;
      const originY = boss.y + boss.h * 0.28;
      const targetX = state.player.x + state.player.w * 0.5 + offset * 20;
      const targetY = state.player.y + state.player.h * 0.38;
      const gravity = 255;
      const travelTime = clamp(Math.abs(targetX - originX) / (boss.phase === 1 ? 240 : 300), 0.45, boss.phase === 1 ? 0.95 : 0.8);
      const vx = (targetX - originX) / travelTime;
      const vy = (targetY - originY - 0.5 * gravity * travelTime * travelTime) / travelTime;
      spawnProjectile({
        owner: "enemy",
        kind: "ember-orb",
        x: originX,
        y: originY,
        vx,
        vy,
        radius: boss.phase === 1 ? 8 : 10,
        gravity,
        damage: boss.phase === 1 ? 16 : 21,
        knockbackX: 160,
        knockbackY: -135,
        color: "#ffb16b",
        trailColor: "rgba(255, 164, 95, 0.5)",
        trailInterval: 0.045,
        impactParticles: 9,
        impactForce: 76,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 5 + Math.random() * 3,
        lightRadius: 38,
      });
    }
    boss.volleyTimer = boss.phase === 1 ? 1.55 : 0.95;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.3, "#ffad63", 9, 62);
  }

  if (boss.barrageTimer <= 0) {
    const playerCenterX = state.player.x + state.player.w * 0.5;
    const playerCenterY = state.player.y + state.player.h * 0.42;
    const originX = boss.x + boss.w * 0.5 + boss.facing * 16;
    const originY = boss.y + boss.h * 0.34;
    const shotCount = boss.phase === 1 ? 2 : 3;
    for (let i = 0; i < shotCount; i += 1) {
      const spread = shotCount === 1 ? 0 : i - (shotCount - 1) * 0.5;
      const angle = Math.atan2(playerCenterY - originY, playerCenterX - originX) + spread * 0.13;
      spawnProjectile({
        owner: "enemy",
        kind: "forge-bolt",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * (boss.phase === 1 ? 265 : 325),
        vy: Math.sin(angle) * (boss.phase === 1 ? 265 : 325),
        radius: 5,
        gravity: 0,
        damage: boss.phase === 1 ? 12 : 16,
        knockbackX: 135,
        knockbackY: -105,
        color: "#ffb56d",
        trailColor: "rgba(255, 168, 101, 0.45)",
        trailInterval: 0.045,
        impactParticles: 7,
        impactForce: 50,
        rotation: angle,
        lightRadius: 32,
      });
    }
    boss.barrageTimer = boss.phase === 1 ? 2.4 : 1.6;
    burstParticles(originX, originY, "#ffbc78", shotCount + 4, 50);
  }

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign((state.player.x + state.player.w * 0.5) - (boss.x + boss.w * 0.5)) * 260;
    damagePlayer(boss.phase === 1 ? 18 : 24, knockback, -170);
  }
}

function updateThunderRoc(dt, boss) {
  boss.dashCooldown -= dt;
  boss.dashTimer = Math.max(0, boss.dashTimer - dt);
  boss.volleyTimer -= dt;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;

  if (boss.dashTimer > 0) {
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  } else {
    const arcOffset = Math.sin(state.elapsed * (boss.phase === 1 ? 1.75 : 2.35)) * (boss.phase === 1 ? 176 : 138);
    const targetX = playerCenterX + arcOffset - boss.w * 0.5;
    const targetY = state.player.y - (boss.phase === 1 ? 228 : 184) + Math.cos(state.elapsed * 3) * 24;
    boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.3, -270, 270), 390 * dt);
    boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.2, -230, 230), 360 * dt);
    pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 198 : 164, 780, dt, -26);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  }

  if (boss.dashCooldown <= 0 && boss.dashTimer <= 0) {
    const angle = Math.atan2(playerCenterY - (boss.y + boss.h * 0.52), playerCenterX - (boss.x + boss.w * 0.5));
    const dashSpeed = boss.phase === 1 ? 350 : 430;
    boss.vx = Math.cos(angle) * dashSpeed;
    boss.vy = Math.sin(angle) * dashSpeed - (boss.phase === 1 ? 14 : 22);
    boss.dashTimer = boss.phase === 1 ? 0.46 : 0.58;
    boss.dashCooldown = boss.phase === 1 ? 3.1 : 2.05;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.4, "#dcecff", 10, 76);
  }

  if (boss.volleyTimer <= 0 && boss.dashTimer <= 0) {
    const shotCount = boss.phase === 1 ? 4 : 6;
    const speed = boss.phase === 1 ? 330 : 392;
    const baseAngle = Math.atan2(playerCenterY - (boss.y + boss.h * 0.5), playerCenterX - (boss.x + boss.w * 0.5));
    for (let i = 0; i < shotCount; i += 1) {
      const offset = i - (shotCount - 1) * 0.5;
      const angle = baseAngle + offset * 0.12;
      spawnProjectile({
        owner: "enemy",
        kind: "storm-feather",
        x: boss.x + boss.w * 0.5 + offset * 8,
        y: boss.y + boss.h * 0.52,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 12,
        radius: 5,
        gravity: 75,
        damage: boss.phase === 1 ? 14 : 18,
        knockbackX: 138,
        knockbackY: -120,
        color: "#d6eeff",
        trailColor: "rgba(192, 224, 255, 0.4)",
        trailInterval: 0.045,
        impactParticles: 8,
        impactForce: 60,
        rotation: angle,
        lightRadius: 26,
      });
    }
    boss.volleyTimer = boss.phase === 1 ? 1.55 : 0.92;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, "#dcefff", shotCount + 2, 48);
  }

  boss.x = clamp(boss.x, 18, WORLD_PIXEL_WIDTH - boss.w - 18);
  boss.y = clamp(boss.y, 18, WORLD_PIXEL_HEIGHT - 250);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 260;
    damagePlayer(boss.phase === 1 ? 18 : 24, knockback, -165);
  }
}

function updateAshenBehemoth(dt, boss) {
  boss.jumpTimer -= dt;
  boss.meteorTimer -= dt;
  boss.eruptionTimer -= dt;
  boss.clapTimer -= dt;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const direction = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) || boss.facing || 1;
  boss.facing = direction;
  boss.vx = approach(boss.vx, direction * (boss.phase === 1 ? 68 : 94), 240 * dt);

  if (boss.onGround && wallAhead(boss, direction)) {
    boss.vy = boss.phase === 1 ? -255 : -310;
  }
  if (boss.onGround && boss.jumpTimer <= 0) {
    boss.vy = boss.phase === 1 ? -285 : -338;
    boss.vx = direction * (boss.phase === 1 ? 110 : 148);
    boss.jumpTimer = boss.phase === 1 ? 1.35 : 0.92;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#ffb270", 12, 104);
  }

  moveGroundEntity(boss, dt, false);
  boss.x = clamp(boss.x, 16, WORLD_PIXEL_WIDTH - boss.w - 16);

  if (boss.meteorTimer <= 0) {
    const count = boss.phase === 1 ? 2 : 3;
    for (let i = 0; i < count; i += 1) {
      const offset = i - (count - 1) * 0.5;
      const originX = boss.x + boss.w * 0.5 + offset * 10;
      const originY = boss.y + boss.h * 0.24;
      const targetX = state.player.x + state.player.w * 0.5 + offset * 34;
      const targetY = state.player.y + state.player.h * 0.44;
      const gravity = 290;
      const travelTime = clamp(Math.abs(targetX - originX) / (boss.phase === 1 ? 220 : 270), 0.48, 0.95);
      const vx = (targetX - originX) / travelTime;
      const vy = (targetY - originY - 0.5 * gravity * travelTime * travelTime) / travelTime;
      spawnProjectile({
        owner: "enemy",
        kind: "ashen-meteor",
        x: originX,
        y: originY,
        vx,
        vy,
        radius: 9,
        gravity,
        damage: boss.phase === 1 ? 18 : 23,
        knockbackX: 170,
        knockbackY: -138,
        color: "#ff9b5d",
        trailColor: "rgba(255, 158, 96, 0.46)",
        trailInterval: 0.04,
        impactParticles: 10,
        impactForce: 72,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 6 + Math.random() * 3,
        lightRadius: 30,
      });
    }
    boss.meteorTimer = boss.phase === 1 ? 1.65 : 1.08;
  }

  if (boss.eruptionTimer <= 0) {
    const playerTileX = clamp(Math.floor((state.player.x + state.player.w * 0.5) / TILE_SIZE), 4, WORLD_WIDTH - 5);
    const offsets = boss.phase === 1 ? [-2, 0, 2] : [-3, -1, 1, 3];
    for (const offset of offsets) {
      const tileX = clamp(playerTileX + offset, 3, WORLD_WIDTH - 4);
      const surfaceY = findSurface(tileX);
      spawnProjectile({
        owner: "enemy",
        kind: "ash-column",
        x: tileX * TILE_SIZE + TILE_SIZE * 0.5,
        y: surfaceY * TILE_SIZE - 10,
        vx: offset * 4,
        vy: -165 - Math.abs(offset) * 10,
        radius: 7,
        gravity: 220,
        damage: boss.phase === 1 ? 14 : 18,
        knockbackX: 140,
        knockbackY: -125,
        color: "#ffc47b",
        trailColor: "rgba(255, 188, 117, 0.36)",
        trailInterval: 0.05,
        impactParticles: 8,
        impactForce: 56,
        rotation: -Math.PI * 0.5,
        spinSpeed: 0,
        lightRadius: 20,
        lifetime: 1.1,
      });
    }
    boss.eruptionTimer = boss.phase === 1 ? 2.6 : 1.7;
  }

  if (boss.clapTimer <= 0) {
    const count = boss.phase === 1 ? 6 : 8;
    const originX = boss.x + boss.w * 0.5;
    const originY = boss.y + boss.h * 0.42;
    for (let i = 0; i < count; i += 1) {
      const spread = i / (count - 1) - 0.5;
      const angle = -Math.PI * 0.5 + spread * 1.25;
      spawnProjectile({
        owner: "enemy",
        kind: "cinder-fragment",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * (140 + Math.abs(spread) * 30),
        vy: Math.sin(angle) * (180 + Math.random() * 25),
        radius: 4,
        gravity: 240,
        damage: boss.phase === 1 ? 10 : 13,
        knockbackX: 105,
        knockbackY: -92,
        color: "#ffd39a",
        trailColor: "rgba(255, 195, 134, 0.32)",
        trailInterval: 0.06,
        impactParticles: 5,
        impactForce: 36,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 9 + Math.random() * 5,
      });
    }
    boss.clapTimer = boss.phase === 1 ? 3.8 : 2.55;
    burstParticles(originX, originY, "#ffbf7a", 12, 58);
  }

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign((state.player.x + state.player.w * 0.5) - (boss.x + boss.w * 0.5)) * 270;
    damagePlayer(boss.phase === 1 ? 20 : 27, knockback, -175);
  }
}

function updateStormHydra(dt, boss) {
  boss.fangTimer -= dt;
  boss.rainTimer -= dt;
  boss.sweepTimer -= dt;
  boss.sweepDuration = Math.max(0, boss.sweepDuration - dt);

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;

  if (boss.sweepDuration > 0) {
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  } else {
    const t = state.elapsed * (boss.phase === 1 ? 1.45 : 1.9);
    const targetX = playerCenterX + Math.sin(t) * (boss.phase === 1 ? 210 : 168) - boss.w * 0.5;
    const targetY = playerCenterY - 170 + Math.cos(t * 1.7) * 56;
    boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.4, -260, 260), 320 * dt);
    boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.6, -220, 220), 300 * dt);
    pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 180 : 150, 780, dt, -20);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  }

  if (boss.fangTimer <= 0) {
    const headOffsets = [-20, 0, 20];
    for (const headOffset of headOffsets) {
      const originX = boss.x + boss.w * 0.5 + headOffset;
      const originY = boss.y + boss.h * 0.46 + Math.abs(headOffset) * 0.12;
      const angle = Math.atan2(playerCenterY - originY, playerCenterX - originX);
      const shotCount = boss.phase === 1 ? 2 : 3;
      for (let i = 0; i < shotCount; i += 1) {
        const spread = (i - (shotCount - 1) * 0.5) * 0.12;
        spawnProjectile({
          owner: "enemy",
          kind: "hydra-bolt",
          x: originX,
          y: originY,
          vx: Math.cos(angle + spread) * (boss.phase === 1 ? 300 : 360),
          vy: Math.sin(angle + spread) * (boss.phase === 1 ? 300 : 360),
          radius: 5,
          gravity: 0,
          damage: boss.phase === 1 ? 13 : 17,
          knockbackX: 138,
          knockbackY: -112,
          color: "#a7efff",
          trailColor: "rgba(149, 231, 255, 0.42)",
          trailInterval: 0.045,
          impactParticles: 7,
          impactForce: 46,
          rotation: angle,
          lightRadius: 20,
        });
      }
    }
    boss.fangTimer = boss.phase === 1 ? 1.4 : 0.9;
  }

  if (boss.rainTimer <= 0) {
    const count = boss.phase === 1 ? 4 : 6;
    for (let i = 0; i < count; i += 1) {
      const spread = i - (count - 1) * 0.5;
      spawnProjectile({
        owner: "enemy",
        kind: "storm-drop",
        x: playerCenterX + spread * 34 + (Math.random() - 0.5) * 18,
        y: Math.max(20, state.player.y - 220 - Math.random() * 40),
        vx: spread * 6,
        vy: 210 + Math.random() * 45,
        radius: 5,
        gravity: 45,
        damage: boss.phase === 1 ? 12 : 15,
        knockbackX: 124,
        knockbackY: -100,
        color: "#dff9ff",
        trailColor: "rgba(201, 245, 255, 0.3)",
        trailInterval: 0.05,
        impactParticles: 8,
        impactForce: 50,
        rotation: Math.PI * 0.5,
        lightRadius: 18,
      });
    }
    boss.rainTimer = boss.phase === 1 ? 3.1 : 2.1;
  }

  if (boss.sweepTimer <= 0 && boss.sweepDuration <= 0) {
    const direction = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) || 1;
    boss.vx = direction * (boss.phase === 1 ? 350 : 430);
    boss.vy = -30 + Math.random() * 60;
    boss.sweepDuration = boss.phase === 1 ? 0.52 : 0.66;
    boss.sweepTimer = boss.phase === 1 ? 4.2 : 3;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, "#d6f3ff", 12, 68);
  }

  boss.x = clamp(boss.x, 18, WORLD_PIXEL_WIDTH - boss.w - 18);
  boss.y = clamp(boss.y, 20, WORLD_PIXEL_HEIGHT - 250);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 265;
    damagePlayer(boss.phase === 1 ? 19 : 24, knockback, -165);
  }
}

function updateMoonlitEmpress(dt, boss) {
  boss.crescentTimer -= dt;
  boss.lanceTimer -= dt;
  boss.teleportTimer -= dt;
  boss.telegraphTimer = Math.max(0, boss.telegraphTimer - dt);

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  const targetX = playerCenterX + Math.sin(state.elapsed * 1.3) * (boss.phase === 1 ? 150 : 118) - boss.w * 0.5;
  const targetY = state.player.y - (boss.phase === 1 ? 208 : 168) + Math.cos(state.elapsed * 2.3) * 20;

  if (boss.teleportMoveTimer > 0 && boss.pendingTeleport) {
    boss.teleportMoveTimer = Math.max(0, boss.teleportMoveTimer - dt);
    const progress = 1 - boss.teleportMoveTimer / boss.teleportMoveDuration;
    const eased = progress * progress * (3 - 2 * progress);
    boss.x = lerp(boss.teleportFrom.x, boss.pendingTeleport.x, eased);
    boss.y = lerp(boss.teleportFrom.y, boss.pendingTeleport.y, eased);
    boss.vx = 0;
    boss.vy = 0;
    if (boss.teleportMoveTimer <= 0) {
      boss.x = boss.pendingTeleport.x;
      boss.y = boss.pendingTeleport.y;
      burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.55, "#d8ebff", 12, 58);
      boss.pendingTeleport = null;
      boss.teleportFrom = null;
    }
  } else {
    boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.1, -240, 240), 320 * dt);
    boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.15, -210, 210), 320 * dt);
    pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 192 : 158, 860, dt, -24);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  }

  if (!boss.pendingTeleport && boss.teleportTimer <= 0) {
    const side = Math.random() < 0.5 ? -1 : 1;
    boss.pendingTeleport = {
      x: clamp(playerCenterX + side * (boss.phase === 1 ? 172 : 138) - boss.w * 0.5, 18, WORLD_PIXEL_WIDTH - boss.w - 18),
      y: clamp(state.player.y - (boss.phase === 1 ? 184 : 154) + Math.random() * 44, 22, WORLD_PIXEL_HEIGHT - 240),
    };
    boss.telegraphDuration = boss.phase === 1 ? 0.5 : 0.38;
    boss.telegraphTimer = boss.telegraphDuration;
    boss.teleportTimer = boss.phase === 1 ? 2.7 : 1.8;
  }
  if (boss.pendingTeleport && boss.telegraphTimer <= 0 && boss.teleportMoveTimer <= 0) {
    boss.teleportFrom = { x: boss.x, y: boss.y };
    boss.teleportMoveDuration = boss.phase === 1 ? 0.16 : 0.12;
    boss.teleportMoveTimer = boss.teleportMoveDuration;
  }

  if (boss.crescentTimer <= 0 && boss.teleportMoveTimer <= 0) {
    const count = boss.phase === 1 ? 2 : 3;
    const baseAngle = Math.atan2(playerCenterY - (boss.y + boss.h * 0.52), playerCenterX - (boss.x + boss.w * 0.5));
    for (let i = 0; i < count; i += 1) {
      const offset = i - (count - 1) * 0.5;
      const angle = baseAngle + offset * 0.22;
      spawnProjectile({
        owner: "enemy",
        kind: "moon-crescent",
        x: boss.x + boss.w * 0.5,
        y: boss.y + boss.h * 0.52,
        vx: Math.cos(angle) * (boss.phase === 1 ? 255 : 315),
        vy: Math.sin(angle) * (boss.phase === 1 ? 255 : 315),
        radius: 7,
        gravity: 0,
        damage: boss.phase === 1 ? 15 : 19,
        knockbackX: 144,
        knockbackY: -118,
        color: "#eff7ff",
        trailColor: "rgba(199, 231, 255, 0.38)",
        trailInterval: 0.045,
        impactParticles: 8,
        impactForce: 54,
        rotation: angle,
        spinSpeed: 5 + Math.random() * 2,
        lightRadius: 20,
      });
    }
    boss.crescentTimer = boss.phase === 1 ? 1.2 : 0.78;
  }

  if (boss.lanceTimer <= 0) {
    const count = boss.phase === 1 ? 3 : 5;
    for (let i = 0; i < count; i += 1) {
      const spread = i - (count - 1) * 0.5;
      spawnProjectile({
        owner: "enemy",
        kind: "star-lance",
        x: playerCenterX + spread * 36 + (Math.random() - 0.5) * 10,
        y: Math.max(18, state.player.y - 230 - Math.random() * 30),
        vx: spread * 4,
        vy: 260 + Math.random() * 28,
        radius: 6,
        gravity: 0,
        damage: boss.phase === 1 ? 13 : 17,
        knockbackX: 130,
        knockbackY: -110,
        color: "#d8eeff",
        trailColor: "rgba(196, 227, 255, 0.34)",
        trailInterval: 0.04,
        impactParticles: 8,
        impactForce: 50,
        rotation: Math.PI * 0.5,
        lightRadius: 18,
      });
    }
    boss.lanceTimer = boss.phase === 1 ? 2.4 : 1.55;
  }

  boss.x = clamp(boss.x, 18, WORLD_PIXEL_WIDTH - boss.w - 18);
  boss.y = clamp(boss.y, 20, WORLD_PIXEL_HEIGHT - 240);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 245;
    damagePlayer(boss.phase === 1 ? 18 : 24, knockback, -154);
  }
}

function updateGraveSovereign(dt, boss) {
  boss.jumpTimer -= dt;
  boss.lanceTimer -= dt;
  boss.chainTimer -= dt;
  boss.tombTimer -= dt;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const direction = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) || boss.facing || 1;
  boss.facing = direction;
  boss.vx = approach(boss.vx, direction * (boss.phase === 1 ? 66 : 90), 240 * dt);

  if (boss.onGround && wallAhead(boss, direction)) {
    boss.vy = boss.phase === 1 ? -255 : -302;
  }
  if (boss.onGround && boss.jumpTimer <= 0) {
    boss.vy = boss.phase === 1 ? -272 : -326;
    boss.vx = direction * (boss.phase === 1 ? 120 : 158);
    boss.jumpTimer = boss.phase === 1 ? 1.3 : 0.9;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#d9ceb8", 10, 80);
  }

  moveGroundEntity(boss, dt, false);
  boss.x = clamp(boss.x, 16, WORLD_PIXEL_WIDTH - boss.w - 16);

  if (boss.lanceTimer <= 0) {
    const playerTileX = clamp(Math.floor((state.player.x + state.player.w * 0.5) / TILE_SIZE), 4, WORLD_WIDTH - 5);
    const offsets = boss.phase === 1 ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
    for (const offset of offsets) {
      const tileX = clamp(playerTileX + offset, 3, WORLD_WIDTH - 4);
      const surfaceY = findSurface(tileX);
      spawnProjectile({
        owner: "enemy",
        kind: "grave-lance",
        x: tileX * TILE_SIZE + TILE_SIZE * 0.5,
        y: surfaceY * TILE_SIZE - 8,
        vx: offset * 3,
        vy: -210 - Math.abs(offset) * 10,
        radius: 6,
        gravity: 210,
        damage: boss.phase === 1 ? 14 : 18,
        knockbackX: 136,
        knockbackY: -120,
        color: "#d5c7a5",
        trailColor: "rgba(212, 196, 168, 0.3)",
        trailInterval: 0.05,
        impactParticles: 8,
        impactForce: 48,
        rotation: -Math.PI * 0.5,
        spinSpeed: 0,
        lightRadius: 12,
        lifetime: 1,
      });
    }
    boss.lanceTimer = boss.phase === 1 ? 1.95 : 1.25;
  }

  if (boss.chainTimer <= 0) {
    const count = boss.phase === 1 ? 2 : 3;
    const originX = boss.x + boss.w * 0.5 + boss.facing * 10;
    const originY = boss.y + boss.h * 0.34;
    const baseAngle = Math.atan2((state.player.y + state.player.h * 0.4) - originY, playerCenterX - originX);
    for (let i = 0; i < count; i += 1) {
      const offset = i - (count - 1) * 0.5;
      const angle = baseAngle + offset * 0.18;
      spawnProjectile({
        owner: "enemy",
        kind: "grave-chain",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * (boss.phase === 1 ? 220 : 280),
        vy: Math.sin(angle) * (boss.phase === 1 ? 220 : 280),
        radius: 6,
        gravity: 20,
        damage: boss.phase === 1 ? 15 : 19,
        knockbackX: 142,
        knockbackY: -116,
        color: "#b9ae92",
        trailColor: "rgba(186, 177, 151, 0.3)",
        trailInterval: 0.055,
        impactParticles: 7,
        impactForce: 44,
        rotation: angle,
        spinSpeed: 7 + Math.random() * 3,
      });
    }
    boss.chainTimer = boss.phase === 1 ? 2.1 : 1.3;
  }

  if (boss.tombTimer <= 0) {
    const count = boss.phase === 1 ? 4 : 6;
    for (let i = 0; i < count; i += 1) {
      const spread = i / (count - 1) - 0.5;
      const angle = -Math.PI * 0.5 + spread * 1.5;
      spawnProjectile({
        owner: "enemy",
        kind: "tomb-shard",
        x: boss.x + boss.w * 0.5,
        y: boss.y + boss.h * 0.32,
        vx: Math.cos(angle) * (130 + Math.abs(spread) * 40),
        vy: Math.sin(angle) * (190 + Math.random() * 26),
        radius: 5,
        gravity: 260,
        damage: boss.phase === 1 ? 11 : 14,
        knockbackX: 110,
        knockbackY: -96,
        color: "#d8cfbd",
        trailColor: "rgba(202, 194, 177, 0.26)",
        trailInterval: 0.05,
        impactParticles: 6,
        impactForce: 40,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 8 + Math.random() * 4,
      });
    }
    boss.tombTimer = boss.phase === 1 ? 3.4 : 2.15;
  }

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 255;
    damagePlayer(boss.phase === 1 ? 20 : 26, knockback, -165);
  }
}

function updateAbyssHerald(dt, boss) {
  boss.needleTimer -= dt;
  boss.bloomTimer -= dt;
  boss.gateTimer -= dt;
  boss.driftTimer += dt;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;
  const targetX = playerCenterX + Math.cos(boss.driftTimer * (boss.phase === 1 ? 1.25 : 1.62)) * (boss.phase === 1 ? 166 : 134) - boss.w * 0.5;
  const targetY = playerCenterY - 148 + Math.sin(boss.driftTimer * 2.1) * 34;
  boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.3, -250, 250), 340 * dt);
  boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.4, -220, 220), 340 * dt);
  pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 176 : 144, 900, dt, -14);
  boss.x += boss.vx * dt;
  boss.y += boss.vy * dt;

  if (boss.needleTimer <= 0) {
    const count = boss.phase === 1 ? 5 : 7;
    const originX = boss.x + boss.w * 0.5;
    const originY = boss.y + boss.h * 0.5;
    const baseAngle = Math.atan2(playerCenterY - originY, playerCenterX - originX);
    for (let i = 0; i < count; i += 1) {
      const offset = i - (count - 1) * 0.5;
      const angle = baseAngle + offset * 0.12;
      spawnProjectile({
        owner: "enemy",
        kind: "abyss-needle",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * (boss.phase === 1 ? 340 : 410),
        vy: Math.sin(angle) * (boss.phase === 1 ? 340 : 410),
        radius: 4,
        gravity: 0,
        damage: boss.phase === 1 ? 13 : 17,
        knockbackX: 130,
        knockbackY: -106,
        color: "#ca8bff",
        trailColor: "rgba(203, 140, 255, 0.34)",
        trailInterval: 0.04,
        impactParticles: 6,
        impactForce: 42,
        rotation: angle,
        lightRadius: 18,
      });
    }
    boss.needleTimer = boss.phase === 1 ? 1.2 : 0.72;
  }

  if (boss.bloomTimer <= 0) {
    const count = boss.phase === 1 ? 6 : 8;
    const originX = boss.x + boss.w * 0.5;
    const originY = boss.y + boss.h * 0.5;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + boss.driftTimer;
      spawnProjectile({
        owner: "enemy",
        kind: "rift-star",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * (boss.phase === 1 ? 170 : 220),
        vy: Math.sin(angle) * (boss.phase === 1 ? 170 : 220),
        radius: 6,
        gravity: 0,
        damage: boss.phase === 1 ? 11 : 14,
        knockbackX: 112,
        knockbackY: -94,
        color: "#e1b4ff",
        trailColor: "rgba(223, 176, 255, 0.28)",
        trailInterval: 0.05,
        impactParticles: 8,
        impactForce: 46,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 4 + Math.random() * 2,
        lightRadius: 24,
      });
    }
    boss.bloomTimer = boss.phase === 1 ? 2.8 : 1.85;
  }

  if (boss.gateTimer <= 0) {
    const fromLeft = Math.random() < 0.5;
    const originX = fromLeft ? Math.max(18, state.camera.x + 24) : Math.min(WORLD_PIXEL_WIDTH - 18, state.camera.x + canvas.width - 24);
    const originY = playerCenterY - 60 + Math.random() * 120;
    const angle = Math.atan2(playerCenterY - originY, playerCenterX - originX);
    const count = boss.phase === 1 ? 2 : 3;
    for (let i = 0; i < count; i += 1) {
      const speed = (boss.phase === 1 ? 250 : 300) + i * 20;
      spawnProjectile({
        owner: "enemy",
        kind: "abyss-flare",
        x: originX,
        y: originY + (i - (count - 1) * 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 7,
        gravity: 0,
        damage: boss.phase === 1 ? 14 : 18,
        knockbackX: 140,
        knockbackY: -110,
        color: "#e3a2ff",
        trailColor: "rgba(226, 164, 255, 0.34)",
        trailInterval: 0.045,
        impactParticles: 8,
        impactForce: 52,
        rotation: angle,
        lightRadius: 28,
      });
    }
    boss.gateTimer = boss.phase === 1 ? 3.9 : 2.65;
  }

  boss.x = clamp(boss.x, 18, WORLD_PIXEL_WIDTH - boss.w - 18);
  boss.y = clamp(boss.y, 18, WORLD_PIXEL_HEIGHT - 230);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 252;
    damagePlayer(boss.phase === 1 ? 18 : 24, knockback, -156);
  }
}

function updateCryptMatriarch(dt, boss) {
  boss.jumpTimer -= dt;
  boss.volleyTimer -= dt;
  boss.surgeTimer -= dt;

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const direction = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) || boss.facing || 1;
  boss.facing = direction;
  boss.vx = approach(boss.vx, direction * (boss.phase === 1 ? 70 : 94), 260 * dt);

  if (boss.onGround && wallAhead(boss, direction)) {
    boss.vy = boss.phase === 1 ? -280 : -320;
  }

  if (boss.onGround && boss.jumpTimer <= 0) {
    boss.vy = boss.phase === 1 ? -300 : -350;
    boss.vx = direction * (boss.phase === 1 ? 126 : 164);
    boss.jumpTimer = boss.phase === 1 ? 1.55 : 1.02;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h, "#bda1ff", 10, 86);
  }

  moveGroundEntity(boss, dt, false);
  boss.x = clamp(boss.x, 16, WORLD_PIXEL_WIDTH - boss.w - 16);

  if (boss.volleyTimer <= 0) {
    const shotCount = boss.phase === 1 ? 2 : 3;
    const speed = boss.phase === 1 ? 255 : 315;
    const originX = boss.x + boss.w * 0.5 + boss.facing * 8;
    const originY = boss.y + boss.h * 0.34;
    const baseAngle = Math.atan2((state.player.y + state.player.h * 0.38) - originY, playerCenterX - originX);
    for (let i = 0; i < shotCount; i += 1) {
      const offset = i - (shotCount - 1) * 0.5;
      const angle = baseAngle + offset * 0.2;
      spawnProjectile({
        owner: "enemy",
        kind: "grave-skull",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        radius: 7,
        gravity: 25,
        damage: boss.phase === 1 ? 16 : 21,
        knockbackX: 152,
        knockbackY: -126,
        color: "#b9a4ff",
        trailColor: "rgba(183, 160, 255, 0.38)",
        trailInterval: 0.05,
        impactParticles: 9,
        impactForce: 66,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 4 + Math.random() * 2,
        lightRadius: 24,
      });
    }
    boss.volleyTimer = boss.phase === 1 ? 1.75 : 1.08;
    burstParticles(originX, originY, "#cfbeff", shotCount + 2, 50);
  }

  if (boss.phase === 2 && boss.onGround && boss.surgeTimer <= 0) {
    boss.surgeTimer = 2.55;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i += 1) {
        spawnProjectile({
          owner: "enemy",
          kind: "grave-skull",
          x: boss.x + boss.w * 0.5 + side * (12 + i * 6),
          y: boss.y + boss.h * 0.54,
          vx: side * (170 + i * 24),
          vy: -86 - i * 16,
          radius: 6,
          gravity: 80,
          damage: 14,
          knockbackX: 132,
          knockbackY: -110,
          color: "#c5b0ff",
          trailColor: "rgba(183, 160, 255, 0.3)",
          trailInterval: 0.055,
          impactParticles: 8,
          impactForce: 56,
          rotation: Math.random() * Math.PI * 2,
          spinSpeed: 4.8 + Math.random() * 1.6,
          lightRadius: 18,
        });
      }
    }
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.46, "#d7c3ff", 12, 58);
  }

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 250;
    damagePlayer(boss.phase === 1 ? 20 : 26, knockback, -165);
  }
}

function updateVoidSeraph(dt, boss) {
  boss.volleyTimer -= dt;
  boss.ringTimer -= dt;
  boss.portalTimer -= dt;
  boss.dashCooldown -= dt;
  boss.dashTimer = Math.max(0, boss.dashTimer - dt);

  const playerCenterX = state.player.x + state.player.w * 0.5;
  const playerCenterY = state.player.y + state.player.h * 0.5;

  if (boss.dashTimer > 0) {
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  } else {
    const orbitAngle = state.elapsed * (boss.phase === 1 ? 1.15 : 1.52);
    const targetX = playerCenterX + Math.cos(orbitAngle) * (boss.phase === 1 ? 188 : 150) - boss.w * 0.5;
    const targetY = playerCenterY - (boss.phase === 1 ? 168 : 134) + Math.sin(orbitAngle * 1.8) * 22;
    boss.vx = approach(boss.vx, clamp((targetX - boss.x) * 2.2, -260, 260), 370 * dt);
    boss.vy = approach(boss.vy, clamp((targetY - boss.y) * 2.25, -230, 230), 350 * dt);
    pushAirEntityAwayFromPlayer(boss, boss.phase === 1 ? 190 : 154, 920, dt, -16);
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
  }

  if (boss.volleyTimer <= 0) {
    const shotCount = boss.phase === 1 ? 3 : 5;
    const speed = boss.phase === 1 ? 300 : 360;
    const originX = boss.x + boss.w * 0.5;
    const originY = boss.y + boss.h * 0.48;
    const baseAngle = Math.atan2(playerCenterY - originY, playerCenterX - originX);
    for (let i = 0; i < shotCount; i += 1) {
      const offset = i - (shotCount - 1) * 0.5;
      const angle = baseAngle + offset * 0.16;
      spawnProjectile({
        owner: "enemy",
        kind: "void-orb",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 7,
        gravity: 0,
        damage: boss.phase === 1 ? 17 : 21,
        knockbackX: 150,
        knockbackY: -122,
        color: "#cf88ff",
        trailColor: "rgba(209, 139, 255, 0.42)",
        trailInterval: 0.045,
        impactParticles: 10,
        impactForce: 70,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 3 + Math.random() * 2,
        lightRadius: 34,
      });
    }
    boss.volleyTimer = boss.phase === 1 ? 1.45 : 0.92;
    burstParticles(originX, originY, "#df9dff", shotCount + 3, 54);
  }

  if (boss.ringTimer <= 0 && boss.dashTimer <= 0) {
    const ringCount = boss.phase === 1 ? 6 : 8;
    const originX = boss.x + boss.w * 0.5;
    const originY = boss.y + boss.h * 0.5;
    const angleOffset = state.elapsed * 1.9;
    for (let i = 0; i < ringCount; i += 1) {
      const angle = angleOffset + (i / ringCount) * Math.PI * 2;
      spawnProjectile({
        owner: "enemy",
        kind: "void-orb",
        x: originX,
        y: originY,
        vx: Math.cos(angle) * (boss.phase === 1 ? 220 : 270),
        vy: Math.sin(angle) * (boss.phase === 1 ? 220 : 270),
        radius: 6,
        gravity: 0,
        damage: boss.phase === 1 ? 11 : 14,
        knockbackX: 118,
        knockbackY: -96,
        color: "#d891ff",
        trailColor: "rgba(216, 145, 255, 0.36)",
        trailInterval: 0.05,
        impactParticles: 8,
        impactForce: 52,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: 2.6 + Math.random() * 1.4,
        lightRadius: 26,
      });
    }
    boss.ringTimer = boss.phase === 1 ? 3.1 : 2.05;
    burstParticles(originX, originY, "#e6abff", ringCount + 4, 62);
  }

  if (boss.portalTimer <= 0) {
    const portalCount = boss.phase === 1 ? 1 : 2;
    for (let i = 0; i < portalCount; i += 1) {
      const offsetX = (i === 0 ? 1 : -1) * (36 + Math.random() * 42);
      const offsetY = -18 - Math.random() * 48;
      const portalX = clamp(playerCenterX + offsetX, 28, WORLD_PIXEL_WIDTH - 28);
      const portalY = clamp(playerCenterY + offsetY, 28, WORLD_PIXEL_HEIGHT - 60);
      spawnProjectile({
        owner: "enemy",
        kind: "portal",
        x: portalX,
        y: portalY,
        vx: 0,
        vy: 0,
        radius: 16,
        gravity: 0,
        damage: 0,
        harmless: true,
        color: "#cf88ff",
        trailColor: "rgba(207, 136, 255, 0.44)",
        trailInterval: 0.035,
        trailHistoryLength: boss.phase === 1 ? 7 : 9,
        impactParticles: 8,
        impactForce: 54,
        rotation: Math.random() * Math.PI * 2,
        spinSpeed: boss.phase === 1 ? 2.8 : 3.6,
        lightRadius: 36,
        lifetime: 1,
        splitCount: 4 + Math.floor(Math.random() * 3),
        splitDamage: boss.phase === 1 ? 13 : 16,
        ignoreWorld: true,
      });
      burstParticles(portalX, portalY, "#e8b8ff", 8, 42);
    }
    boss.portalTimer = boss.phase === 1 ? 3.8 : 2.55;
  }

  boss.trackerTimer -= dt;
  if (boss.trackerTimer <= 0) {
    for (const sign of [-1, 1]) {
      spawnProjectile({
        owner: "enemy",
        kind: "void-tracker",
        x: clamp(playerCenterX, 28, WORLD_PIXEL_WIDTH - 28),
        y: clamp(playerCenterY + sign * 220, 28, WORLD_PIXEL_HEIGHT - 28),
        vx: 0,
        vy: 0,
        radius: 14,
        baseRadius: 14,
        gravity: 0,
        damage: boss.phase === 1 ? 16 : 20,
        knockbackX: 110,
        knockbackY: -90,
        color: "#a370ff",
        trailColor: "rgba(166, 112, 255, 0.5)",
        trailInterval: 0.06,
        impactParticles: 10,
        impactForce: 66,
        lightRadius: 26,
        trackTimer: 2.0,
        collapseTimer: 0,
        voidTrackerStopped: false,
      });
    }
    boss.trackerTimer = boss.phase === 1 ? 4.6 : 3.3;
    burstParticles(playerCenterX, playerCenterY, "#b496ff", 16, 74);
  }

  if (boss.dashCooldown <= 0 && boss.dashTimer <= 0) {
    const baseAngle = Math.atan2(playerCenterY - (boss.y + boss.h * 0.5), playerCenterX - (boss.x + boss.w * 0.5));
    const dashAngle = baseAngle + (Math.random() < 0.5 ? -1 : 1) * (boss.phase === 1 ? 0.68 : 0.44);
    boss.vx = Math.cos(dashAngle) * (boss.phase === 1 ? 240 : 320);
    boss.vy = Math.sin(dashAngle) * (boss.phase === 1 ? 240 : 320);
    boss.dashTimer = boss.phase === 1 ? 0.4 : 0.56;
    boss.dashCooldown = boss.phase === 1 ? 2.8 : 1.9;
    burstParticles(boss.x + boss.w * 0.5, boss.y + boss.h * 0.5, "#e09cff", 9, 60);
  }

  boss.x = clamp(boss.x, 18, WORLD_PIXEL_WIDTH - boss.w - 18);
  boss.y = clamp(boss.y, 20, WORLD_PIXEL_HEIGHT - 240);

  if (bossTouchesPlayer(boss)) {
    const knockback = Math.sign(playerCenterX - (boss.x + boss.w * 0.5)) * 255;
    damagePlayer(boss.phase === 1 ? 19 : 25, knockback, -160);
  }
}

function updateSpawner(dt) {
  if (state.boss) {
    return;
  }

  state.spawnCooldown -= dt;
  if (state.spawnCooldown > 0) {
    return;
  }

  const playerTileX = clamp(Math.floor((state.player.x + state.player.w * 0.5) / TILE_SIZE), 0, WORLD_WIDTH - 1);
  const playerTileY = Math.floor((state.player.y + state.player.h * 0.5) / TILE_SIZE);
  const playerSurfaceY = state.world.heights[playerTileX] ?? 0;
  const underground = playerTileY > playerSurfaceY + 8;
  const caveDepth = Math.max(0, playerTileY - playerSurfaceY);
  const night = isNight();
  const peacefulCount = state.mobs.filter((mob) => mob.peaceful).length;
  const butterflyCount = state.mobs.filter((mob) => mob.kind === "butterfly" && mob.alive).length;
  const maxMobs = underground ? 12 : night ? 8 : 10;
  if (state.mobs.length >= maxMobs) {
    state.spawnCooldown = underground ? 2.1 : 1.5;
    return;
  }

  if (underground) {
    const type = pickCaveMobKind(caveDepth);
    if (spawnCaveMob(type)) {
      state.spawnCooldown = 2.4;
      return;
    }
    state.spawnCooldown = 1.8;
    return;
  }

  if (!night && peacefulCount < 10 && Math.random() < 0.82) {
    const kind =
      butterflyCount < 4
        ? "butterfly"
        : Math.random() < 0.55
          ? "butterfly"
          : Math.random() < 0.72
            ? "bird"
            : "worm";
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = kind === "butterfly" ? 10 + Math.floor(Math.random() * 10) : 18 + Math.floor(Math.random() * 18);
    const spawnX = state.player.x + direction * distance * TILE_SIZE;
    if (spawnMob(kind, spawnX)) {
      state.spawnCooldown = kind === "butterfly" ? 2.2 : 4.8;
      return;
    }
  }

  const type = night && Math.random() < 0.45 ? "goblin" : "slime";
  const direction = Math.random() < 0.5 ? -1 : 1;
  const distance = 16 + Math.floor(Math.random() * 14);
  const spawnX = state.player.x + direction * distance * TILE_SIZE;
  spawnMob(type, spawnX);
  state.spawnCooldown = night ? 1.7 : 3.2;
}

function pickCaveMobKind(caveDepth) {
  const roll = Math.random();
  if (caveDepth >= 20) {
    if (roll < 0.3) {
      return "cave-bat";
    }
    if (roll < 0.58) {
      return "skeleton-miner";
    }
    if (roll < 0.82) {
      return "eye-servant";
    }
    return "sand-wisp";
  }

  if (roll < 0.4) {
    return "cave-bat";
  }
  if (roll < 0.72) {
    return "skeleton-miner";
  }
  if (roll < 0.9) {
    return "eye-servant";
  }
  return "sand-wisp";
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.ttl -= dt;
    if (particle.kind === "leaf-fall") {
      particle.x += (particle.vx + Math.sin(state.elapsed * 3.2 + (particle.driftPhase ?? 0)) * (particle.drift ?? 0)) * dt;
      particle.y += particle.vy * dt;
      particle.vy += 420 * (particle.gravityScale ?? 1) * dt;
      particle.rotation = (particle.rotation ?? 0) + (particle.spinSpeed ?? 0) * dt;
      if (particle.floorY != null && particle.y + particle.size >= particle.floorY) {
        particle.ttl = 0;
      }
      continue;
    }
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 420 * (particle.gravityScale ?? 1) * dt;
    particle.size = Math.max(1, particle.size - dt * particle.shrink);
  }
  state.particles = state.particles.filter((particle) => particle.ttl > 0);
}

function spawnCombatText(x, y, amount, kind = "damage", options = {}) {
  const roundedAmount = Math.max(1, Math.round(amount));
  const mergeKey = options.mergeKey ?? null;
  const mergeWindow = options.mergeWindow ?? 0.14;
  if (mergeKey) {
    const existing = [...state.combatTexts].reverse().find((entry) => entry.mergeKey === mergeKey && entry.kind === kind && entry.ttl > entry.life - mergeWindow);
    if (existing) {
      existing.amount += roundedAmount;
      existing.text = `${existing.prefix}${existing.amount}`;
      existing.ttl = Math.max(existing.ttl, existing.life * 0.5);
      existing.x = (existing.x + x) * 0.5;
      existing.y = Math.min(existing.y, y);
      return;
    }
  }

  const color =
    kind === "heal"
      ? "#8df3a1"
      : kind === "player-damage"
        ? "#ff8b7f"
        : "#f6e8c9";
  const prefix = kind === "heal" ? "+" : "";
  state.combatTexts.push({
    x: x + (Math.random() - 0.5) * 12,
    y,
    vx: (Math.random() - 0.5) * 18,
    vy: -46 - Math.random() * 10,
    ttl: 0.7,
    life: 0.7,
    amount: roundedAmount,
    text: `${prefix}${roundedAmount}`,
    prefix,
    color,
    outline: "rgba(8, 11, 18, 0.92)",
    size: kind === "heal" ? 19 : kind === "player-damage" ? 20 : 18,
    kind,
    mergeKey,
  });
}

function updateCombatTexts(dt) {
  for (const entry of state.combatTexts) {
    entry.ttl -= dt;
    entry.x += entry.vx * dt;
    entry.y += entry.vy * dt;
    entry.vx *= Math.max(0, 1 - dt * 3.5);
    entry.vy -= 18 * dt;
  }
  state.combatTexts = state.combatTexts.filter((entry) => entry.ttl > 0);
}

function updateCamera(dt) {
  const maxX = Math.max(0, WORLD_PIXEL_WIDTH - canvas.width);
  const maxY = Math.max(0, WORLD_PIXEL_HEIGHT - canvas.height);
  const targetX = clamp(state.player.x + state.player.w * 0.5 - canvas.width * 0.5, 0, maxX);
  const targetY = clamp(state.player.y + state.player.h * 0.5 - canvas.height * 0.55, 0, maxY);

  state.camera.x = lerp(state.camera.x, targetX, 1 - Math.exp(-6 * dt));
  state.camera.y = lerp(state.camera.y, targetY, 1 - Math.exp(-6 * dt));
}

function spawnMob(kind, worldX) {
  const tileX = clamp(Math.floor(worldX / TILE_SIZE), 3, WORLD_WIDTH - 4);
  const surfaceY = findSurface(tileX);
  const spawnY = (surfaceY - 2) * TILE_SIZE;

  if (surfaceY < 10 || surfaceY > WORLD_HEIGHT - 4) {
    return false;
  }

  if (Math.abs(worldX - state.player.x) < 160) {
    return false;
  }

  if (kind === "slime") {
    state.mobs.push({
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: tileX * TILE_SIZE,
      y: spawnY - 18,
      w: 24,
      h: 18,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      hopTimer: 0.2 + Math.random() * 0.8,
      health: 34,
      maxHealth: 34,
      damage: 10,
      alive: true,
      invuln: 0,
      lastSwingId: -1,
      sprite: "sprite-slime",
    });
    return true;
  }

  if (kind === "goblin") {
    state.mobs.push({
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: tileX * TILE_SIZE,
      y: spawnY - 26,
      w: 16,
      h: 26,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      health: 54,
      maxHealth: 54,
      damage: 14,
      alive: true,
      invuln: 0,
      lastSwingId: -1,
      sprite: "sprite-goblin",
    });
    return true;
  }

  const critter = createSurfaceCritter(kind, tileX * TILE_SIZE, surfaceY);
  if (critter) {
    state.mobs.push(critter);
    return true;
  }
  return false;
}

function createSurfaceCritter(kind, worldX, surfaceY) {
  if (kind === "bird") {
    return {
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: worldX,
      y: (surfaceY - 2) * TILE_SIZE - 10,
      w: 16,
      h: 12,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: Math.random() < 0.5 ? -1 : 1,
      health: 8,
      maxHealth: 8,
      damage: 0,
      peaceful: true,
      alive: true,
      invuln: 0,
      flutterTimer: 0.2 + Math.random() * 0.4,
      idleTimer: 0.6 + Math.random() * 1.2,
      lastSwingId: -1,
      sprite: null,
    };
  }

  if (kind === "butterfly") {
    const palette = [
      ["#ff8ab3", "#fff0a6"],
      ["#8fe3ff", "#f8fdff"],
      ["#c89cff", "#fff0ff"],
      ["#ffd27a", "#fff5c8"],
      ["#9df09b", "#efffe8"],
    ][Math.floor(Math.random() * 5)];
    return {
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: worldX,
      y: (surfaceY - 4) * TILE_SIZE,
      w: 10,
      h: 8,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: Math.random() < 0.5 ? -1 : 1,
      health: 5,
      maxHealth: 5,
      damage: 0,
      peaceful: true,
      alive: true,
      invuln: 0,
      flutterTimer: 0.1 + Math.random() * 0.2,
      driftTimer: 0.5 + Math.random() * 1,
      hoverY: (surfaceY - 5) * TILE_SIZE - Math.random() * 28,
      perchTimer: 0,
      perchX: null,
      perchY: null,
      wingPhase: Math.random() * Math.PI * 2,
      palette,
      lastSwingId: -1,
      sprite: null,
    };
  }

  if (kind === "worm") {
    return {
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: worldX,
      y: surfaceY * TILE_SIZE - 8,
      w: 14,
      h: 8,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: Math.random() < 0.5 ? -1 : 1,
      health: 6,
      maxHealth: 6,
      damage: 0,
      peaceful: true,
      alive: true,
      invuln: 0,
      turnTimer: 1 + Math.random() * 1.6,
      lastSwingId: -1,
      sprite: null,
    };
  }

  return null;
}

function spawnCaveMob(kind) {
  const flying = kind === "cave-bat" || kind === "eye-servant" || kind === "sand-wisp";
  const position = findCaveSpawn(flying);
  if (!position) {
    return false;
  }

  if (kind === "cave-bat") {
    state.mobs.push({
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: position.x,
      y: position.y,
      w: 20,
      h: 14,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      orbitTime: Math.random() * Math.PI * 2,
      orbitOffset: Math.random() * Math.PI * 2,
      orbitSpeed: 1.2 + Math.random() * 0.8,
      health: 30,
      maxHealth: 30,
      damage: 12,
      alive: true,
      invuln: 0,
      lastSwingId: -1,
      sprite: "sprite-cave-bat",
    });
    return true;
  }

  if (kind === "skeleton-miner") {
    state.mobs.push({
      id: `${kind}-${performance.now()}-${Math.random()}`,
      kind,
      x: position.x,
      y: position.y,
      w: 16,
      h: 26,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      health: 68,
      maxHealth: 68,
      damage: 16,
      alive: true,
      invuln: 0,
      lastSwingId: -1,
      sprite: "sprite-skeleton-miner",
    });
    return true;
  }

  if (kind === "eye-servant") {
    spawnEyeServant(position.x, position.y, {
      health: 24,
      damage: 10,
      orbitSpeedMin: 0.95,
      orbitSpeedMax: 1.85,
    });
    return true;
  }

  if (kind === "sand-wisp") {
    spawnSandWisp(position.x, position.y, {
      health: 28,
      damage: 11,
      orbitSpeedMin: 0.85,
      orbitSpeedMax: 1.6,
    });
    return true;
  }

  return false;
}

function findCaveSpawn(flying) {
  const playerTileY = clamp(Math.floor((state.player.y + state.player.h * 0.5) / TILE_SIZE), 10, WORLD_HEIGHT - 10);
  const leftTile = clamp(Math.floor((state.camera.x - 96) / TILE_SIZE), 6, WORLD_WIDTH - 7);
  const rightTile = clamp(Math.ceil((state.camera.x + canvas.width + 96) / TILE_SIZE), 6, WORLD_WIDTH - 7);

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const tileX =
      direction < 0
        ? clamp(leftTile - (6 + Math.floor(Math.random() * 16)), 6, WORLD_WIDTH - 7)
        : clamp(rightTile + (6 + Math.floor(Math.random() * 16)), 6, WORLD_WIDTH - 7);
    if (Math.abs(tileX * TILE_SIZE - state.player.x) < Math.max(220, canvas.width * 0.3)) {
      continue;
    }

    if (flying) {
      const tileY = clamp(playerTileY - 5 + Math.floor(Math.random() * 12), 12, WORLD_HEIGHT - 12);
      if (
        getTile(state.world, tileX, tileY) === Tile.AIR &&
        getTile(state.world, tileX, tileY - 1) === Tile.AIR &&
        getTile(state.world, tileX, tileY + 1) === Tile.AIR
      ) {
        const spawnX = tileX * TILE_SIZE;
        const spawnY = tileY * TILE_SIZE;
        if (isWorldRectOffscreen(spawnX, spawnY, 20, 20, 96)) {
          return { x: spawnX, y: spawnY };
        }
      }
      continue;
    }

    for (let tileY = playerTileY + 8; tileY >= playerTileY - 8; tileY -= 1) {
      const clampedY = clamp(tileY, 10, WORLD_HEIGHT - 4);
      if (
        getTile(state.world, tileX, clampedY) === Tile.AIR &&
        getTile(state.world, tileX, clampedY - 1) === Tile.AIR &&
        isSolidTile(getTile(state.world, tileX, clampedY + 1))
      ) {
        const spawnX = tileX * TILE_SIZE;
        const spawnY = (clampedY - 1) * TILE_SIZE;
        if (isWorldRectOffscreen(spawnX, spawnY, 16, 26, 96)) {
          return { x: spawnX, y: spawnY };
        }
      }
    }
  }

  return null;
}

function spawnEyeServant(worldX, worldY, overrides = {}) {
  state.mobs.push({
    id: `eye-servant-${performance.now()}-${Math.random()}`,
    kind: "eye-servant",
    x: worldX,
    y: worldY,
    w: 18,
    h: 18,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    orbitTime: Math.random() * Math.PI * 2,
    orbitOffset: Math.random() * Math.PI * 2,
    orbitSpeed: (overrides.orbitSpeedMin ?? 1.2) + Math.random() * ((overrides.orbitSpeedMax ?? 2.5) - (overrides.orbitSpeedMin ?? 1.2)),
    health: overrides.health ?? 18,
    maxHealth: overrides.health ?? 18,
    damage: overrides.damage ?? 8,
    alive: true,
    invuln: 0,
    lastSwingId: -1,
    sprite: "sprite-eye-servant",
  });
}

function spawnSandWisp(worldX, worldY, overrides = {}) {
  state.mobs.push({
    id: `sand-wisp-${performance.now()}-${Math.random()}`,
    kind: "sand-wisp",
    x: worldX,
    y: worldY,
    w: 18,
    h: 18,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    orbitTime: Math.random() * Math.PI * 2,
    orbitOffset: Math.random() * Math.PI * 2,
    orbitSpeed: (overrides.orbitSpeedMin ?? 1) + Math.random() * ((overrides.orbitSpeedMax ?? 2.1) - (overrides.orbitSpeedMin ?? 1)),
    health: overrides.health ?? 20,
    maxHealth: overrides.health ?? 20,
    damage: overrides.damage ?? 9,
    alive: true,
    invuln: 0,
    lastSwingId: -1,
    sprite: "sprite-sand-wisp",
  });
}

function isWorldRectOffscreen(x, y, w, h, margin = 96) {
  return (
    x + w < state.camera.x - margin ||
    x > state.camera.x + canvas.width + margin ||
    y + h < state.camera.y - margin ||
    y > state.camera.y + canvas.height + margin
  );
}

function getNextBossStage() {
  for (const stage of BOSS_STAGES) {
    if (!state[stage.flag]) {
      return stage;
    }
  }
  return null;
}

function getBossDisplayName(kind) {
  switch (kind) {
    case "overseer-eye":
      return "Overseer Eye";
    case "stone-warden":
      return "Stone Warden";
    case "sand-djinn":
      return "Sandstorm Djinn";
    case "crystal-queen":
      return "Crystal Queen";
    case "forge-titan":
      return "Forge Titan";
    case "thunder-roc":
      return "Thunder Roc";
    case "ashen-behemoth":
      return "Ashen Behemoth";
    case "storm-hydra":
      return "Storm Hydra";
    case "moonlit-empress":
      return "Moonlit Empress";
    case "grave-sovereign":
      return "Grave Sovereign";
    case "abyss-herald":
      return "Abyss Herald";
    case "crypt-matriarch":
      return "Crypt Matriarch";
    case "void-seraph":
      return "Void Seraph";
    default:
      return "Boss";
  }
}

function getBossStageByKind(kind) {
  return BOSS_STAGES.find((stage) => stage.kind === kind) ?? null;
}

function canUseSummonForBoss(kind) {
  const stageIndex = BOSS_STAGES.findIndex((stage) => stage.kind === kind);
  if (stageIndex === -1) {
    return false;
  }

  const stage = BOSS_STAGES[stageIndex];
  if (stage.kind === "void-seraph") {
    return true;
  }

  if (stage.requiresNight !== isNight()) {
    announce(stage.waitText);
    return false;
  }

  return true;
}

function spawnBossByKind(kind) {
  if (kind === "overseer-eye") {
    state.boss = {
      kind: "overseer-eye",
      name: "Overseer Eye",
      sprite: "sprite-overseer-eye",
      x: state.player.x + 180,
      y: state.player.y - 180,
      w: 84,
      h: 84,
      vx: 0,
      vy: 0,
      maxHealth: 2620,
      health: 2620,
      phase: 1,
      dashCooldown: 2,
      dashTimer: 0,
      volleyTimer: 1.35,
      spawnTimer: 4,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("The Overseer Eye opens in the dark.");
    return;
  }

  if (kind === "stone-warden") {
    const tileX = clamp(Math.floor((state.player.x + 18 * TILE_SIZE) / TILE_SIZE), 6, WORLD_WIDTH - 6);
    const surfaceY = findSurface(tileX);
    state.boss = {
      kind: "stone-warden",
      name: "Stone Warden",
      sprite: "sprite-stone-warden",
      x: tileX * TILE_SIZE,
      y: surfaceY * TILE_SIZE - 72,
      w: 76,
      h: 72,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: -1,
      maxHealth: 2780,
      health: 2780,
      phase: 1,
      jumpTimer: 0.8,
      shockwaveTimer: 0.5,
      throwTimer: 1.15,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Stone Warden grinds its way out of the ground.");
    return;
  }

  if (kind === "sand-djinn") {
    state.boss = {
      kind: "sand-djinn",
      name: "Sandstorm Djinn",
      sprite: "sprite-sand-djinn",
      x: state.player.x + 150,
      y: state.player.y - 170,
      w: 82,
      h: 76,
      vx: 0,
      vy: 0,
      maxHealth: 2860,
      health: 2860,
      phase: 1,
      volleyTimer: 1.05,
      driftTimer: 0,
      spawnTimer: 4.8,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("The air dries out as Sandstorm Djinn takes shape.");
    return;
  }

  if (kind === "crystal-queen") {
    state.boss = {
      kind: "crystal-queen",
      name: "Crystal Queen",
      sprite: "sprite-crystal-queen",
      x: state.player.x + 170,
      y: state.player.y - 200,
      w: 84,
      h: 82,
      vx: 0,
      vy: 0,
      maxHealth: 3000,
      health: 3000,
      phase: 1,
      volleyTimer: 0.95,
      teleportTimer: 2.8,
      telegraphTimer: 0,
      telegraphDuration: 0,
      teleportMoveTimer: 0,
      teleportMoveDuration: 0.18,
      pendingTeleport: null,
      teleportFrom: null,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("The Crystal Queen descends in a rain of glass.");
    return;
  }

  if (kind === "forge-titan") {
    const tileX = clamp(Math.floor((state.player.x + 20 * TILE_SIZE) / TILE_SIZE), 6, WORLD_WIDTH - 6);
    const surfaceY = findSurface(tileX);
    state.boss = {
      kind: "forge-titan",
      name: "Forge Titan",
      sprite: "sprite-forge-titan",
      x: tileX * TILE_SIZE,
      y: surfaceY * TILE_SIZE - 86,
      w: 86,
      h: 84,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: -1,
      maxHealth: 3280,
      health: 3280,
      phase: 1,
      jumpTimer: 1.15,
      volleyTimer: 1.1,
      barrageTimer: 1.9,
      stompTimer: 0.6,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Forge Titan stomps out of the earth with molten breath.");
    return;
  }

  if (kind === "thunder-roc") {
    state.boss = {
      kind: "thunder-roc",
      name: "Thunder Roc",
      sprite: "sprite-thunder-roc",
      x: state.player.x + 160,
      y: state.player.y - 220,
      w: 96,
      h: 78,
      vx: 0,
      vy: 0,
      maxHealth: 3180,
      health: 3180,
      phase: 1,
      dashCooldown: 1.7,
      dashTimer: 0,
      volleyTimer: 1.1,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Thunder Roc tears through the sky.");
    return;
  }

  if (kind === "crypt-matriarch") {
    const tileX = clamp(Math.floor((state.player.x + 16 * TILE_SIZE) / TILE_SIZE), 6, WORLD_WIDTH - 6);
    const surfaceY = findSurface(tileX);
    state.boss = {
      kind: "crypt-matriarch",
      name: "Crypt Matriarch",
      sprite: "sprite-crypt-matriarch",
      x: tileX * TILE_SIZE,
      y: surfaceY * TILE_SIZE - 82,
      w: 78,
      h: 80,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: -1,
      maxHealth: 3380,
      health: 3380,
      phase: 1,
      jumpTimer: 0.9,
      volleyTimer: 1.15,
      surgeTimer: 1.8,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Crypt Matriarch claws her way out of the dark soil.");
    return;
  }

  if (kind === "void-seraph") {
    state.boss = {
	      kind: "void-seraph",
      name: "Void Seraph",
      sprite: "sprite-void-seraph",
      x: state.player.x + 180,
      y: state.player.y - 210,
      w: 92,
      h: 88,
      vx: 0,
      vy: 0,
      maxHealth: 3580,
      health: 3580,
	      phase: 1,
	      volleyTimer: 1.2,
	      ringTimer: 2.3,
        portalTimer: 1.8,
        trackerTimer: 0,
	      dashCooldown: 1.9,
      dashTimer: 0,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Void Seraph opens a wound in the night sky.");
    return;
  }

  if (kind === "ashen-behemoth") {
    const tileX = clamp(Math.floor((state.player.x + 20 * TILE_SIZE) / TILE_SIZE), 6, WORLD_WIDTH - 6);
    const surfaceY = findSurface(tileX);
    state.boss = {
      kind: "ashen-behemoth",
      name: "Ashen Behemoth",
      sprite: "sprite-ashen-behemoth",
      x: tileX * TILE_SIZE,
      y: surfaceY * TILE_SIZE - 90,
      w: 90,
      h: 88,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: -1,
      maxHealth: 3300,
      health: 3300,
      phase: 1,
      jumpTimer: 1.05,
      meteorTimer: 1,
      eruptionTimer: 1.7,
      clapTimer: 2.5,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Ashen Behemoth lumbers forward in a rain of sparks.");
    return;
  }

  if (kind === "storm-hydra") {
    state.boss = {
      kind: "storm-hydra",
      name: "Storm Hydra",
      sprite: "sprite-storm-hydra",
      x: state.player.x + 170,
      y: state.player.y - 230,
      w: 102,
      h: 82,
      vx: 0,
      vy: 0,
      maxHealth: 3340,
      health: 3340,
      phase: 1,
      fangTimer: 0.88,
      rainTimer: 2.2,
      sweepTimer: 3.6,
      sweepDuration: 0,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Storm Hydra coils through the daylight sky.");
    return;
  }

  if (kind === "moonlit-empress") {
    state.boss = {
      kind: "moonlit-empress",
      name: "Moonlit Empress",
      sprite: "sprite-moonlit-empress",
      x: state.player.x + 170,
      y: state.player.y - 210,
      w: 88,
      h: 86,
      vx: 0,
      vy: 0,
      maxHealth: 3360,
      health: 3360,
      phase: 1,
      crescentTimer: 0.82,
      lanceTimer: 1.85,
      teleportTimer: 2.35,
      telegraphTimer: 0,
      telegraphDuration: 0,
      teleportMoveTimer: 0,
      teleportMoveDuration: 0.16,
      pendingTeleport: null,
      teleportFrom: null,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Moonlit Empress arrives wrapped in cold glass-light.");
    return;
  }

  if (kind === "grave-sovereign") {
    const tileX = clamp(Math.floor((state.player.x + 17 * TILE_SIZE) / TILE_SIZE), 6, WORLD_WIDTH - 6);
    const surfaceY = findSurface(tileX);
    state.boss = {
      kind: "grave-sovereign",
      name: "Grave Sovereign",
      sprite: "sprite-grave-sovereign",
      x: tileX * TILE_SIZE,
      y: surfaceY * TILE_SIZE - 78,
      w: 80,
      h: 78,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: -1,
      maxHealth: 3370,
      health: 3370,
      phase: 1,
      jumpTimer: 1.0,
      lanceTimer: 0.95,
      chainTimer: 1.65,
      tombTimer: 2.8,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Grave Sovereign rises with a chorus of cracking stone.");
    return;
  }

  if (kind === "abyss-herald") {
    state.boss = {
      kind: "abyss-herald",
      name: "Abyss Herald",
      sprite: "sprite-abyss-herald",
      x: state.player.x + 175,
      y: state.player.y - 190,
      w: 86,
      h: 86,
      vx: 0,
      vy: 0,
      maxHealth: 3375,
      health: 3375,
      phase: 1,
      needleTimer: 0.92,
      bloomTimer: 2.2,
      gateTimer: 3.3,
      driftTimer: 0,
      invuln: 0,
      lastSwingId: -1,
    };
    announce("Abyss Herald tears open the dark above you.");
    return;
  }
}

function summonBoss() {
  if (state.boss) {
    announce("A boss is already active.");
    return;
  }

  const stage = getNextBossStage();
  if (!stage) {
    announce("All current bosses are already defeated.");
    return;
  }

  if (stage.requiresNight !== isNight()) {
    announce(stage.waitText);
    return;
  }

  spawnBossByKind(stage.kind);
}

function interactWithNpc() {
  const npc = getNearestNpc(72);
  if (!npc) {
    announce("No villager close enough to talk.");
    return;
  }

  npc.dialogueIndex = (npc.dialogueIndex + 1) % NPC_DIALOGUES[npc.kind].length;
  let text = NPC_DIALOGUES[npc.kind][npc.dialogueIndex];

  if (npc.kind === "guide") {
    if (getInventoryCount("torch") < 4) {
      addInventory("torch", 2);
      text = "Take two torches. Every hero thinks they can see in the dark right up until they cannot.";
    } else if (!state.bossDefeated && !state.boss && isNight()) {
      text = "The night is ready. Buy an Eye Sigil from the merchant and use it from the hotbar when you have room to dodge.";
    }
  }

  if (npc.kind === "merchant") {
    if (npc.healCooldown <= 0 && state.player.health < state.player.maxHealth) {
      npc.healCooldown = 24;
      healPlayer(20);
      text = "A little battlefield medicine. Try not to spend it all at once.";
    } else {
      text = "Press T to trade. Mouse wheel scrolls offers. Use Esc for crafting, and the village furnace will smelt ore when you stand nearby.";
    }
  }

  state.dialogue = {
    speaker: npc.name,
    text,
    ttl: 7,
  };
}

function getNearestSkyChest(range) {
  let nearest = null;
  let best = range;
  for (const chest of state.skyChests) {
    if (chest.opened) {
      continue;
    }
    const centerX = chest.x + chest.w * 0.5;
    const centerY = chest.y + chest.h * 0.5;
    const distance = Math.hypot(state.player.x + state.player.w * 0.5 - centerX, state.player.y + state.player.h * 0.5 - centerY);
    if (distance < best) {
      nearest = chest;
      best = distance;
    }
  }
  return nearest;
}

function openSkyChest(chest) {
  const loot = chest.loot[0];
  if (!loot) {
    chest.opened = true;
    announce("The sky chest is empty.");
    return;
  }
  if (!addInventory(loot.id, loot.count, { selectAdded: true })) {
    announce("No room for the sky chest loot.");
    return;
  }
  chest.opened = true;
  burstParticles(chest.x + chest.w * 0.5, chest.y + chest.h * 0.4, "#e7f7ff", 10, 72);
  announce(`Sky chest: ${ITEM_DEFS[loot.id].name}.`);
}

function toggleTrade() {
  if (state.tradeOpen) {
    state.tradeOpen = false;
    return;
  }

  if (!getMerchantInRange()) {
    announce("Stand closer to the merchant to trade.");
    return;
  }

  state.craftOpen = false;
  state.settingsOpen = false;
  state.cheatOpen = false;
  state.tradeScroll = 0;
  state.tradeOpen = true;
}

function craftVisibleRecipe(indexOffset) {
  const recipe = RECIPES[state.craftScroll + indexOffset];
  if (!recipe) {
    return;
  }
  craftRecipe(recipe);
}

function getCheatGrantAmount(itemId) {
  const item = ITEM_DEFS[itemId];
  if (!item) {
    return 0;
  }
  if (item.kind === "currency") {
    return 50;
  }
  if (item.kind === "block" || item.kind === "material") {
    return 25;
  }
  if (item.kind === "consumable") {
    return item.use === "summon" ? 3 : 10;
  }
  return 1;
}

function grantCheatItem(indexOffset) {
  const cheatItems = getCheatItems();
  const item = cheatItems[state.cheatScroll + indexOffset];
  if (!item) {
    return;
  }

  const amount = getCheatGrantAmount(item.id);
  if (!addInventory(item.id, amount, { selectAdded: item.kind !== "currency" })) {
    announce(`Cannot grant ${item.name} right now.`);
    return;
  }

  announce(`Cheat: +${amount} ${item.name}.`);
}

function buyFromMerchant(index) {
  const merchant = getMerchantInRange();
  if (!merchant) {
    state.tradeOpen = false;
    return;
  }

  const offer = SHOP_ITEMS[index];
  if (!offer) {
    return;
  }

  if (state.player.coins < offer.price) {
    announce(`You need ${offer.price} coins.`);
    return;
  }

  if (offer.id === "aeroRig" && state.player.hasAeroRig) {
    announce("You already own Aero Rig.");
    return;
  }

  if (offer.id === "skyWings" && (state.player.hasSkyWings || state.player.hasSeraphWings)) {
    announce("You already own Sky Wings.");
    return;
  }

  if (offer.id === "steelArmor" && (state.player.armor || 0) >= ITEM_DEFS.steelArmor.defense) {
    announce("You are already wearing the best armor this merchant sells.");
    return;
  }

  const quantity = offer.quantity ?? 1;
  if (!addInventory(offer.id, quantity, { selectAdded: true })) {
    announce("That item could not be added.");
    return;
  }

  state.player.coins -= offer.price;
  state.tradeOpen = false;
  announce(
    offer.id === "aeroRig"
      ? "Bought Aero Rig. Shift dash and a light double jump are now unlocked."
      : offer.id === "skyWings"
        ? "Bought Sky Wings. Hold Space in the air to fly for a short time."
      : offer.id === "steelArmor"
        ? `Bought Steel Armor. Defense is now ${state.player.armor}.`
      : `Bought ${quantity > 1 ? `${quantity}x ` : ""}${ITEM_DEFS[offer.id].name} for ${offer.price} coins.`
  );
}

function dropSelectedItem() {
  if (state.tradeOpen) {
    return;
  }

  const slot = getSelectedInventoryEntry();
  const item = getSelectedItem();
  if (!slot || !item || slot.count <= 0) {
    announce("Nothing to drop from this slot.");
    return;
  }

  removeInventory(slot.id, 1);
  spawnDrop(slot.id, 1, state.player.x + state.player.w * 0.5, state.player.y + state.player.h * 0.45, state.player.facing * 110, -120);
  announce(`Dropped ${ITEM_DEFS[slot.id].name}.`);
}

function getMerchantInRange() {
  const npc = getNearestNpc(82);
  return npc?.kind === "merchant" ? npc : null;
}

function getNearestNpc(range) {
  let nearest = null;
  let best = range;
  for (const npc of state.npcs) {
    if (!npc.alive) {
      continue;
    }
    const distance = Math.hypot(state.player.x - npc.x, state.player.y - npc.y);
    if (distance < best) {
      nearest = npc;
      best = distance;
    }
  }
  return nearest;
}

function respawnNpc(npc) {
  npc.alive = true;
  npc.health = npc.maxHealth;
  npc.invuln = 1.2;
  npc.fireHazardTimer = 0;
  npc.vx = 0;
  npc.vy = 0;
  npc.onGround = false;
  const spawnX = npc.kind === "guide" ? (state.world.village.houseA + 2) * TILE_SIZE : (state.world.village.houseB + 2) * TILE_SIZE;
  npc.x = spawnX;
  npc.y = state.world.village.baseY * TILE_SIZE - 26;
}

function damageNpc(npc, amount, knockbackX, knockbackY, options = {}) {
  if (!npc.alive || (!options.bypassInvuln && npc.invuln > 0)) {
    return false;
  }

  npc.health -= amount;
  npc.invuln = options.invulnDuration ?? 0.18;
  npc.vx += knockbackX;
  npc.vy = knockbackY;
  if (options.showText !== false) {
    spawnCombatText(npc.x + npc.w * 0.5, npc.y - 6, amount, "damage", { mergeKey: `npc:${npc.id}` });
  }
  if ((options.particleCount ?? 7) > 0) {
    burstParticles(npc.x + npc.w * 0.5, npc.y + npc.h * 0.45, npc.kind === "merchant" ? "#d8c2a0" : "#9bdcff", options.particleCount ?? 7, options.particleForce ?? 92);
  }

  if (npc.health <= 0) {
    npc.alive = false;
    npc.respawnTimer = 8;
    npc.attackTimer = 0;
    npc.attackCooldown = 0;
    announce(`${npc.name} was knocked out.`);
  }
  return true;
}

function damageMob(mob, amount, knockbackX, knockbackY, options = {}) {
  if (!options.bypassInvuln && mob.invuln > 0) {
    return false;
  }

  mob.health -= amount;
  mob.invuln = options.invulnDuration ?? 0.12;
  mob.vx += knockbackX;
  mob.vy = knockbackY;
  if (options.showText !== false) {
    spawnCombatText(mob.x + mob.w * 0.5, mob.y - 4, amount, "damage", { mergeKey: `mob:${mob.id}` });
  }
  const hitColor =
    mob.kind === "slime"
      ? "#95e9ff"
      : mob.kind === "bird"
        ? "#eef7ff"
        : mob.kind === "worm"
          ? "#9f7b63"
      : mob.kind === "eye-servant"
        ? "#e58f98"
        : mob.kind === "sand-wisp"
          ? "#e9cf8b"
          : mob.kind === "cave-bat"
            ? "#c9b6ff"
            : mob.kind === "skeleton-miner"
              ? "#d8d0c1"
        : "#9fc670";
  const particleCount = options.particleCount ?? 9;
  const particleForce = options.particleForce ?? 130;
  if (particleCount > 0) {
    burstParticles(mob.x + mob.w * 0.5, mob.y + mob.h * 0.5, hitColor, particleCount, particleForce);
  }

  if (mob.health <= 0) {
    mob.alive = false;
    if (mob.kind === "slime") {
      spawnDrop("coin", 1, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
    }
    if (mob.kind === "goblin") {
      spawnDrop("coin", 2, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
    }
    if (mob.kind === "eye-servant") {
      spawnDrop("coin", 1, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
    }
    if (mob.kind === "sand-wisp") {
      spawnDrop("coin", 1, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
    }
    if (mob.kind === "cave-bat") {
      spawnDrop("copperOre", 2, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
      spawnDrop("coin", 1, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
    }
    if (mob.kind === "skeleton-miner") {
      spawnDrop(Math.random() < 0.55 ? "ironOre" : "copperOre", 3, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
      if (Math.random() < 0.25) {
        spawnDrop("crystalOre", 1, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5, 0, -120);
      }
      spawnDrop("coin", 2, mob.x + mob.w * 0.5, mob.y + mob.h * 0.5);
    }
  }
  return true;
}

function damageBoss(amount, knockbackX, knockbackY, options = {}) {
  if (!state.boss || (!options.bypassInvuln && state.boss.invuln > 0)) {
    return false;
  }

  let armor = 0;
  switch (state.boss.kind) {
    case "void-seraph":
    case "crypt-matriarch":
      armor = 15;
      break;
    case "thunder-roc":
    case "ashen-behemoth":
      armor = 10;
      break;
    case "forge-titan":
      armor = 5;
      break;
    case "grave-sovereign":
    case "crystal-queen":
    case "moonlit-empress":
    case "stone-warden":
      armor = 7;
      break;
    case "abyss-herald":
      armor = 8;
      break;
    case "sand-djinn":
      armor = 2;
      break;
    default:
      armor = 1;
      break;
  }
  const effectiveArmor = Math.max(0, armor - (options.pierceArmor || 0));
  let appliedDamage = Math.max(1, amount - effectiveArmor);

  state.boss.health -= appliedDamage;
  state.boss.invuln = options.invulnDuration ?? 0.08;
  state.boss.vx += knockbackX * 0.05;
  state.boss.vy += knockbackY * 0.05;
  if (options.showText !== false) {
    spawnCombatText(state.boss.x + state.boss.w * 0.5, state.boss.y - 10, appliedDamage, "damage", { mergeKey: `boss:${state.boss.kind}` });
  }
  const particleCount = options.particleCount ?? 10;
  const particleForce = options.particleForce ?? 160;
  if (particleCount > 0) {
    burstParticles(state.boss.x + state.boss.w * 0.5, state.boss.y + state.boss.h * 0.5, state.boss.kind === "forge-titan" ? "#ffb56c" : "#d94f57", particleCount, particleForce);
  }
  return true;
}

function damagePlayer(amount, knockbackX, knockbackY, options = {}) {
  const player = state.player;
  if (!options.bypassInvuln && player.invuln > 0) {
    return;
  }

  const effectiveDefense = (player.armor || 0) + (player.bonusDefense || 0);
  const reducedAmount = Math.max(1, amount - effectiveDefense);
  const finalDamage = Math.max(1, Math.round(reducedAmount * (1 - (player.damageReduction || 0))));
  player.health -= finalDamage;
  player.invuln = options.invulnDuration ?? 0.85;
  const knockbackScale = 1 - (player.knockbackResist || 0);
  player.vx += knockbackX * knockbackScale;
  player.vy = knockbackY * knockbackScale;
  spawnCombatText(player.x + player.w * 0.5, player.y - 8, finalDamage, "player-damage", { mergeKey: "player:damage", mergeWindow: 0.18 });

  const armorDef = player.armorName ? ITEM_DEFS[player.armorName] : null;
  if (player.health > 0 && armorDef?.hurtHealMin) {
    const cashbackMin = armorDef.hurtHealMin ?? 1;
    const cashbackMax = Math.max(cashbackMin, armorDef.hurtHealMax ?? cashbackMin);
    const cashback = Math.min(finalDamage, cashbackMin + Math.floor(Math.random() * (cashbackMax - cashbackMin + 1)));
    if (cashback > 0) {
      healPlayer(cashback);
    }
  }

  if (player.health <= 0) {
    respawnPlayer("You were knocked out and dragged back to the village.");
  }
}

function healPlayer(amount) {
  const healed = Math.min(amount, state.player.maxHealth - state.player.health);
  if (healed <= 0) {
    return;
  }
  state.player.health += healed;
  spawnCombatText(state.player.x + state.player.w * 0.5, state.player.y - 14, healed, "heal", { mergeKey: "player:heal", mergeWindow: 0.16 });
  burstParticles(state.player.x + state.player.w * 0.5, state.player.y + 4, "#f5d894", 8, 100);
}

function respawnPlayer(message) {
  const player = state.player;
  player.x = state.world.spawn.x;
  player.y = state.world.spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.health = player.maxHealth;
  player.invuln = 2;
  player.minigunHeat = 0;
  player.minigunOverheatTimer = 0;
  player.laserDamageTimer = 0;
  player.sandBurstShotsRemaining = 0;
  player.sandBurstTimer = 0;
  player.sandBurstBaseAngle = 0;
  player.gustBurstShotsRemaining = 0;
  player.gustBurstTimer = 0;
  player.gustBurstBaseAngle = 0;
  player.gustBurstTargetX = 0;
  player.gustBurstTargetY = 0;
  player.gustBurstPortals = [];
  player.gustBurstPortalIndex = 0;
  player.dashCooldown = 0;
  player.dashMomentum = 0;
  player.airJumpAvailable = true;
  player.wingFuel = getWingFlightTime(getEquippedWingDef(), player);
  player.wingFxTimer = 0;
  player.passiveRegenBuffer = 0;
  state.mobs = [];
  state.projectiles = [];
  state.beams = [];
  state.portals = [];
  state.activeBeam = null;
  state.activeQuasar = null;
  state.leafFallTimer = 0;
  state.combatTexts = [];
  state.drops = [];
  state.boss = null;
  state.mineTarget = null;
  state.tradeOpen = false;
  state.craftOpen = false;
  state.settingsOpen = false;
  state.cheatOpen = false;
  announce(message);
}

function addInventory(itemId, amount, options = {}) {
  const def = ITEM_DEFS[itemId];
  if (!def) {
    return false;
  }

  const preferItemId = options.selectAdded ? itemId : getSelectedInventoryEntry()?.id ?? null;

  if (def.kind === "currency") {
    state.player.coins += amount;
    return true;
  }

  if (def.kind === "accessory") {
    if (itemId === "aeroRig") {
      if (state.player.hasAeroRig) {
        return false;
      }
      state.player.hasAeroRig = true;
      state.player.airJumpAvailable = true;
      return true;
    }
    if (itemId === "skyWings") {
      if (state.player.hasSkyWings) {
        return false;
      }
      state.player.hasSkyWings = true;
      state.player.wingFuel = getWingFlightTime(def);
      return true;
    }
    if (itemId === "seraphWings") {
      if (state.player.hasSeraphWings) {
        return false;
      }
      state.player.hasSeraphWings = true;
      state.player.wingFuel = getWingFlightTime(def);
      return true;
    }
    if (state.player.unlockedAccessories?.[itemId]) {
      return false;
    }
    return unlockAccessory(itemId);
  }

  if (def.kind === "armor") {
    if ((state.player.armor || 0) >= (def.defense ?? 0)) {
      return false;
    }
    state.player.armor = def.defense ?? 0;
    state.player.armorName = itemId;
    return true;
  }

  let entry = getInventoryEntry(itemId);
  if (entry) {
    entry.count += amount;
  } else {
    entry = { id: itemId, count: amount };
    state.player.inventory.push(entry);
  }

  sortInventoryEntries(state.player.inventory);
  normalizeSelectedSlot(preferItemId);
  return true;
}

function getSelectedItem() {
  const entry = getSelectedInventoryEntry();
  return entry ? ITEM_DEFS[entry.id] ?? null : null;
}

function removeInventory(itemId, amount = 1) {
  const index = getInventoryIndex(itemId);
  if (index === -1) {
    return false;
  }

  const entry = state.player.inventory[index];
  entry.count -= amount;
  if (entry.count <= 0) {
    state.player.inventory.splice(index, 1);
  }

  normalizeSelectedSlot();
  return true;
}

function announce(text) {
  state.message = { text, ttl: 3.6 };
}

function countMobsByKind(kind) {
  let count = 0;
  for (const mob of state.mobs) {
    if (mob.alive && mob.kind === kind) {
      count += 1;
    }
  }
  return count;
}

function spawnDrop(itemId, count, x, y, vx = 0, vy = -90) {
  state.drops.push({
    id: `drop-${itemId}-${performance.now()}-${Math.random()}`,
    itemId,
    count,
    x,
    y,
    w: 14,
    h: 14,
    vx,
    vy,
    onGround: false,
    age: 0,
    alive: true,
  });
}

function updateDrops(dt) {
  for (const drop of state.drops) {
    if (!drop.alive) {
      continue;
    }

    drop.age += dt;
    moveGroundEntity(drop, dt, true);
    drop.vx = approach(drop.vx, 0, 220 * dt);

    if (drop.itemId !== "voidRelic" && isEntityInLava(drop)) {
      drop.alive = false;
      burstParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, "#ff8c3f", 8, 42);
      burstParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, "#5a3322", 6, 26);
      continue;
    }

    if (drop.age > 0.22 && overlaps(drop, state.player)) {
      if (addInventory(drop.itemId, drop.count)) {
        burstParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, drop.itemId === "coin" ? "#f6cf63" : "#f2ead2", 7, 80);
        drop.alive = false;
      }
    }
  }

  state.drops = state.drops.filter((drop) => drop.alive);
}

function applyProjectileImpactToMob(mob, projectile) {
  const direction = Math.sign(projectile.vx || 1);
  if (projectile.kind === "bullet" || projectile.kind === "laser" || projectile.kind === "grave-skull" || projectile.kind === "void-orb") {
    mob.vx += direction * 22;
    mob.vy = Math.min(mob.vy, -20);
    return;
  }

  mob.vx += direction * 12;
}

function applyProjectileImpactToBoss(boss, projectile) {
  const direction = Math.sign(projectile.vx || 1);
  if (projectile.kind === "bullet" || projectile.kind === "laser" || projectile.kind === "grave-skull" || projectile.kind === "void-orb") {
    boss.vx += direction * 7;
    return;
  }

  boss.vx += direction * 5;
}

function wallAhead(entity, direction) {
  const probeX = direction > 0 ? entity.x + entity.w + 2 : entity.x - 2;
  const probeTop = entity.y + 4;
  const probeBottom = entity.y + entity.h - 6;
  return isSolidTile(getTileAtPixel(probeX, probeTop)) || isSolidTile(getTileAtPixel(probeX, probeBottom));
}

function groundAhead(entity, direction) {
  const probeX = direction > 0 ? entity.x + entity.w + 2 : entity.x - 2;
  const probeY = entity.y + entity.h + 1;
  const tile = getTileAtPixel(probeX, probeY);
  return isSolidTile(tile) || isPlatformTile(tile);
}

function getTileAtPixel(x, y) {
  return getTile(state.world, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}

function isSolidTile(tile) {
  return TILE_DEFS[tile]?.solid ?? false;
}

function isPlatformTile(tile) {
  return TILE_DEFS[tile]?.platform ?? false;
}

function shouldIgnorePlatforms(entity) {
  return (entity.platformDropTimer ?? 0) > 0;
}

function isStandingOnPlatform(entity) {
  const footY = entity.y + entity.h + 1;
  const left = Math.floor((entity.x + 1) / TILE_SIZE);
  const right = Math.floor((entity.x + entity.w - 1) / TILE_SIZE);
  const tileY = Math.floor(footY / TILE_SIZE);
  for (let x = left; x <= right; x += 1) {
    if (isPlatformTile(getTile(state.world, x, tileY))) {
      return true;
    }
  }
  return false;
}

function findSurface(tileX) {
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    if (getTile(state.world, tileX, y) !== Tile.AIR) {
      return y;
    }
  }
  return WORLD_HEIGHT - 1;
}

function findNearbyFlowerPerch(mob) {
  const centerTileX = clamp(Math.floor((mob.x + mob.w * 0.5) / TILE_SIZE), 0, WORLD_WIDTH - 1);
  const candidates = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    const tileX = centerTileX + offset;
    if (tileX < 0 || tileX >= WORLD_WIDTH) {
      continue;
    }
    const surfaceY = findSurface(tileX);
    const flowerY = surfaceY - 1;
    if (flowerY < 0 || getFlower(state.world, tileX, flowerY) <= 0) {
      continue;
    }
    candidates.push({
      x: tileX * TILE_SIZE + TILE_SIZE * 0.5,
      y: flowerY * TILE_SIZE - mob.h + 3,
    });
  }
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function createStars() {
  return Array.from({ length: 85 }, () => ({
    x: Math.random() * WORLD_PIXEL_WIDTH,
    y: Math.random() * 210,
    size: 1 + Math.random() * 2,
    alpha: 0.25 + Math.random() * 0.75,
  }));
}

function createClouds() {
  return Array.from({ length: 14 }, (_, index) => ({
    x: (WORLD_PIXEL_WIDTH / 14) * index,
    y: 50 + Math.random() * 140,
    speed: 8 + Math.random() * 18,
    width: 90 + Math.random() * 80,
    height: 18 + Math.random() * 18,
  }));
}

function createMountainBands() {
  return [
    { color: "#31566f", amplitude: 24, height: 300, frequency: 0.0013, speed: 0.08 },
    { color: "#244459", amplitude: 38, height: 340, frequency: 0.0018, speed: 0.12 },
    { color: "#183245", amplitude: 56, height: 388, frequency: 0.0023, speed: 0.18 },
  ];
}

function render() {
  const skyLight = getSkyLight();
  state.lights = [];
  renderSky(skyLight);
  renderWorld();
  renderBeams();
  renderPortals();
  renderDrops();
  renderProjectiles();
  renderActiveQuasar();
  renderEntities();
  renderParticles();
  renderLighting(skyLight);
  renderCombatTexts();
  renderHud(skyLight);
}

function renderSky(skyLight) {
  const effectiveSkyLight = skyLight * (1 - (state.voidSeraphSkyBlend ?? 0));
  const topColor = mixColor([9, 20, 38], [111, 205, 255], effectiveSkyLight);
  const bottomColor = mixColor([17, 18, 44], [146, 206, 255], effectiveSkyLight);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, rgb(topColor));
  gradient.addColorStop(1, rgb(bottomColor));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-state.camera.x * 0.15, -state.camera.y * 0.1);
  for (const star of state.stars) {
    const alpha = (1 - effectiveSkyLight) * star.alpha;
    if (alpha <= 0.02) {
      continue;
    }
    ctx.fillStyle = `rgba(255, 248, 226, ${alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.restore();

  renderSunAndMoon(effectiveSkyLight);
  renderMountains();

  if (effectiveSkyLight > 0.25) {
    ctx.save();
    ctx.translate(-state.camera.x * 0.2, -state.camera.y * 0.05);
    ctx.fillStyle = `rgba(255,255,255,${0.12 + effectiveSkyLight * 0.2})`;
    for (const cloud of state.clouds) {
      drawCloud(cloud.x, cloud.y, cloud.width, cloud.height);
    }
    ctx.restore();
  }
}

function renderSunAndMoon(skyLight) {
  const cycle = state.dayClock / DAY_LENGTH;
  const angle = cycle * Math.PI * 2;
  const sunPhase = angle + Math.PI * 0.5;
  const moonPhase = sunPhase + Math.PI;
  const isNightTime = isNight();
  const bodyPhase = isNightTime ? moonPhase : sunPhase;
  const orbitX = canvas.width * 0.5 + Math.cos(bodyPhase) * canvas.width * 0.42;
  const orbitY = canvas.height * 0.62 + Math.sin(bodyPhase) * canvas.height * 0.48;
  const blackHoleBlend = clamp(state.celestialBlackHoleBlend ?? 0, 0, 1);
  const sunImage = assets["ui-game-sun"];
  const blackHoleImage = assets["ui-game-black-hole"];

  function drawOrbitTexture(image, size, alpha, glowRadius = 0, glowColor = null, rotation = 0) {
    if (!image || alpha <= 0.01) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    if (glowRadius > 0 && glowColor) {
      const glow = ctx.createRadialGradient(orbitX, orbitY, size * 0.16, orbitX, orbitY, glowRadius);
      glow.addColorStop(0, glowColor.replace("{a}", Math.min(alpha * 0.9, 1).toFixed(3)));
      glow.addColorStop(0.58, glowColor.replace("{a}", Math.min(alpha * 0.45, 1).toFixed(3)));
      glow.addColorStop(1, glowColor.replace("{a}", "0"));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(orbitX, orbitY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(orbitX, orbitY);
    if (rotation !== 0) {
      ctx.rotate(rotation);
    }
    const drawRect = getContainedRect(image, -size * 0.5, -size * 0.5, size, size);
    ctx.drawImage(image, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
    ctx.restore();
  }

  if (!isNightTime) {
    drawOrbitTexture(
      sunImage,
      92,
      (0.74 + skyLight * 0.26) * (1 - blackHoleBlend),
      86,
      "rgba(255, 210, 106, {a})",
      state.elapsed * 0.06
    );
    drawOrbitTexture(
      blackHoleImage,
      92,
      blackHoleBlend * (0.86 + skyLight * 0.1),
      92,
      "rgba(152, 84, 255, {a})",
      0
    );
  } else {
    const moonAlpha = (0.5 + (1 - skyLight) * 0.35) * (1 - blackHoleBlend);
    if (moonAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = moonAlpha;
      const moonGlow = ctx.createRadialGradient(orbitX, orbitY, 5, orbitX, orbitY, 52);
      moonGlow.addColorStop(0, `rgba(239, 245, 255, ${0.28 + (1 - skyLight) * 0.22})`);
      moonGlow.addColorStop(0.68, `rgba(198, 218, 255, ${0.16 + (1 - skyLight) * 0.16})`);
      moonGlow.addColorStop(1, "rgba(160, 189, 255, 0)");
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(orbitX, orbitY, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(240, 246, 255, 1)";
      ctx.beginPath();
      ctx.arc(orbitX, orbitY, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(17, 19, 44, 0.9)";
      ctx.beginPath();
      ctx.arc(orbitX + 10, orbitY - 6, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawOrbitTexture(
      blackHoleImage,
      84,
      blackHoleBlend * (0.9 + (1 - skyLight) * 0.08),
      82,
      "rgba(127, 96, 255, {a})",
      0
    );
  }
}

function drawCloud(x, y, width, height) {
  ctx.beginPath();
  ctx.ellipse(x, y, width * 0.28, height * 0.7, 0, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.24, y - height * 0.2, width * 0.22, height * 0.85, 0, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.52, y - height * 0.12, width * 0.28, height, 0, 0, Math.PI * 2);
  ctx.ellipse(x + width * 0.76, y, width * 0.22, height * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function renderMountains() {
  for (const band of state.mountains) {
    ctx.fillStyle = band.color;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 8) {
      const worldX = x + state.camera.x * band.speed;
      const y = band.height + Math.sin(worldX * band.frequency) * band.amplitude + Math.sin(worldX * band.frequency * 0.45) * band.amplitude * 0.55;
      ctx.lineTo(x, y - state.camera.y * 0.08);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
}

function getUndergroundBackdropColor(tileX, tileY) {
  const clampedX = clamp(tileX, 0, WORLD_WIDTH - 1);
  const surfaceY = state.world.heights[clampedX] ?? 0;
  const depth = clamp((tileY - surfaceY - 3) / 28, 0, 1);
  const waveA = Math.sin((tileX + state.seed * 0.0037) * 0.18 + tileY * 0.05);
  const waveB = Math.sin((tileY + state.seed * 0.0049) * 0.22 - tileX * 0.035);
  const variation = Math.round((waveA * 0.65 + waveB * 0.35) * 4);
  const base = mixColor([20, 28, 38], [4, 8, 14], depth);

  return rgb([
    clamp(base[0] + variation, 0, 255),
    clamp(base[1] + variation, 0, 255),
    clamp(base[2] + variation, 0, 255),
  ]);
}

function getLightingOpacity(tileX, tileY, skyLight) {
  const clampedX = clamp(tileX, 0, WORLD_WIDTH - 1);
  const surfaceY = state.world.heights[clampedX] ?? 0;
  const depthFromSurface = tileY - surfaceY;
  const baseDarkness = clamp(0.42 - skyLight * 0.22, 0.12, 0.42);
  if (depthFromSurface <= 1) {
    return baseDarkness;
  }

  const darknessDepth = Math.max(0, depthFromSurface - DARKNESS_START_DEPTH);
  const depthFactor = clamp(darknessDepth / Math.max(1, UNDERGROUND_LIGHTING_DEPTH - DARKNESS_START_DEPTH), 0, 1);
  const tile = getTile(state.world, clampedX, tileY);
  const caveBoost = tile === Tile.AIR ? 0.28 : 0.38;
  const earlyDepthBoost = clamp((depthFromSurface - 1) / Math.max(1, DARKNESS_START_DEPTH - 1), 0, 1);
  return clamp(baseDarkness + earlyDepthBoost * 0.3 + depthFactor * 0.56 + caveBoost * (0.58 + depthFactor * 0.9) - skyLight * 0.04, 0.14, 0.995);
}

function getLightingExtraOpacity(tileX, tileY, skyLight, baseDarkness) {
  return Math.max(0, getLightingOpacity(tileX, tileY, skyLight) - baseDarkness);
}

function buildLightingSurfaceSamples(scaleX, scaleY) {
  const samples = [];
  const lightmapWidth = lightingCanvas.width;
  const step = Math.max(4, Math.ceil(LIGHTING_SURFACE_SAMPLE_SPACING * scaleX));
  for (let lightmapX = 0; lightmapX <= lightmapWidth; lightmapX += step) {
    const screenX = lightmapX / scaleX;
    const worldX = clamp(state.camera.x + screenX, 0, WORLD_PIXEL_WIDTH - 1);
    const tileX = clamp(Math.floor(worldX / TILE_SIZE), 0, WORLD_WIDTH - 1);
    const surfaceY = state.world.heights[tileX] ?? 0;
    samples.push({
      x: lightmapX,
      y: (surfaceY * TILE_SIZE - state.camera.y) * scaleY,
    });
  }

  if (!samples.length || samples[samples.length - 1].x < lightmapWidth) {
    const worldX = clamp(state.camera.x + canvas.width, 0, WORLD_PIXEL_WIDTH - 1);
    const tileX = clamp(Math.floor(worldX / TILE_SIZE), 0, WORLD_WIDTH - 1);
    const surfaceY = state.world.heights[tileX] ?? 0;
    samples.push({
      x: lightmapWidth,
      y: (surfaceY * TILE_SIZE - state.camera.y) * scaleY,
    });
  }

  return samples;
}

function renderUndergroundBackdrop(startX, endX, startY, endY) {
  for (let y = startY; y <= endY; y += 1) {
    let runStart = -1;

    for (let x = startX; x <= endX + 1; x += 1) {
      const insideBounds = x <= endX;
      const undergroundAir =
        insideBounds &&
        getTile(state.world, x, y) === Tile.AIR &&
        y > (state.world.heights[clamp(x, 0, WORLD_WIDTH - 1)] ?? 0) + 1;

      if (undergroundAir) {
        if (runStart === -1) {
          runStart = x;
        }
        continue;
      }

      if (runStart === -1) {
        continue;
      }

      const runEnd = x - 1;
      const screenX = Math.floor(runStart * TILE_SIZE - state.camera.x);
      const screenY = Math.floor(y * TILE_SIZE - state.camera.y);
      const screenW = (runEnd - runStart + 1) * TILE_SIZE + 1;
      const midX = Math.floor((runStart + runEnd) * 0.5);
      const gradient = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY);
      gradient.addColorStop(0, getUndergroundBackdropColor(runStart, y));
      gradient.addColorStop(0.5, getUndergroundBackdropColor(midX, y));
      gradient.addColorStop(1, getUndergroundBackdropColor(runEnd, y));
      ctx.fillStyle = gradient;
      ctx.fillRect(screenX, screenY, screenW, TILE_SIZE + 1);
      runStart = -1;
    }
  }
}

function renderWorld() {
  const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE) - 2);
  const endX = Math.min(WORLD_WIDTH - 1, Math.ceil((state.camera.x + canvas.width) / TILE_SIZE) + 2);
  const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE) - 2);
  const endY = Math.min(WORLD_HEIGHT - 1, Math.ceil((state.camera.y + canvas.height) / TILE_SIZE) + 2);

  renderUndergroundBackdrop(startX, endX, startY, endY);
  renderWalls(startX, endX, startY, endY);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const tile = getTile(state.world, x, y);
      if (tile === Tile.AIR) {
        continue;
      }

      const screenX = x * TILE_SIZE - state.camera.x;
      const screenY = y * TILE_SIZE - state.camera.y;
      drawTile(tile, screenX, screenY, x, y);

      const lightRadius = TILE_DEFS[tile]?.light ?? 0;
      if (lightRadius > 0) {
        state.lights.push({ x: screenX + TILE_SIZE * 0.5, y: screenY + TILE_SIZE * 0.5, radius: lightRadius });
      }
    }
  }

  renderFlowers(startX, endX, startY, endY);

  renderSkyChests();
  renderHoveredTile();
}

function findLeafLandingY(tileX, startTileY) {
  for (let y = startTileY; y < WORLD_HEIGHT; y += 1) {
    if (isSolidTile(getTile(state.world, tileX, y))) {
      return y * TILE_SIZE;
    }
  }
  return WORLD_PIXEL_HEIGHT;
}

function spawnLeafFallParticle(tileX, tileY) {
  const x = tileX * TILE_SIZE + 4 + Math.random() * 8;
  const y = tileY * TILE_SIZE + 5 + Math.random() * 6;
  const floorY = findLeafLandingY(tileX, tileY + 1);
  const life = 2.4 + Math.random() * 1.6;
  if (floorY <= y + 6) {
    return;
  }
  state.particles.push({
    kind: "leaf-fall",
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: 12 + Math.random() * 10,
    ttl: life,
    life,
    size: 3 + Math.random() * 1.6,
    shrink: 0.2,
    color: Math.random() < 0.5 ? "#79cd5f" : "#98df7d",
    gravityScale: 0.08,
    floorY,
    drift: 8 + Math.random() * 12,
    driftPhase: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2,
    spinSpeed: (Math.random() - 0.5) * 1.4,
  });
}

function updateAmbientLeafFall(dt) {
  state.leafFallTimer -= dt;
  if (state.leafFallTimer > 0) {
    return;
  }

  const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE) - 2);
  const endX = Math.min(WORLD_WIDTH - 1, Math.ceil((state.camera.x + canvas.width) / TILE_SIZE) + 2);
  const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE) - 2);
  const endY = Math.min(WORLD_HEIGHT - 1, Math.ceil((state.camera.y + canvas.height) / TILE_SIZE) + 2);
  const candidates = [];

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const tile = getTile(state.world, x, y);
      const wall = getWall(state.world, x, y);
      if (tile === Tile.TREE || tile === Tile.LEAVES || wall === Wall.GRASS) {
        candidates.push({ x, y });
      }
    }
  }

  state.leafFallTimer = 0.1 + Math.random() * 0.18;
  if (candidates.length === 0 || Math.random() < 0.55) {
    return;
  }

  const source = candidates[Math.floor(Math.random() * candidates.length)];
  spawnLeafFallParticle(source.x, source.y);
}

function renderWalls(startX, endX, startY, endY) {
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const wall = getWall(state.world, x, y);
      if (wall === Wall.NONE) {
        continue;
      }
      const screenX = x * TILE_SIZE - state.camera.x;
      const screenY = y * TILE_SIZE - state.camera.y;
      drawWall(wall, screenX, screenY);
    }
  }
}

function renderFlowers(startX, endX, startY, endY) {
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const variant = getFlower(state.world, x, y);
      if (variant <= 0) {
        continue;
      }
      if (getTile(state.world, x, y) !== Tile.AIR || getTile(state.world, x, y + 1) !== Tile.GRASS) {
        setFlower(state.world, x, y, 0);
        continue;
      }
      drawFlowerVariant(variant, x * TILE_SIZE - state.camera.x, y * TILE_SIZE - state.camera.y);
    }
  }
}

function renderSkyChests() {
  for (const chest of state.skyChests) {
    const screenX = chest.x - state.camera.x;
    const screenY = chest.y - state.camera.y;
    if (screenX + chest.w < -12 || screenX > canvas.width + 12 || screenY + chest.h < -12 || screenY > canvas.height + 12) {
      continue;
    }
    drawSkyChest(chest, screenX, screenY);
  }
}

function drawSkyChest(chest, x, y) {
  const lidOffset = chest.opened ? -3 : 0;
  ctx.fillStyle = chest.opened ? "#9a7c49" : "#b98b48";
  ctx.fillRect(x + 1, y + 6, 20, 8);
  ctx.fillStyle = "#6a4a26";
  ctx.fillRect(x + 1, y + 11, 20, 3);
  ctx.fillStyle = chest.opened ? "#d8eef7" : "#e6f7ff";
  ctx.fillRect(x + 1, y + lidOffset + 2, 20, 5);
  ctx.fillStyle = "#f4d98b";
  ctx.fillRect(x + 9, y + 7, 4, 4);
  ctx.strokeStyle = "rgba(46, 28, 11, 0.55)";
  ctx.strokeRect(x + 0.5, y + 1.5, 21, 12);
}

function renderHoveredTile() {
  if (!state.hoveredTile || !state.hoveredTile.inReach) {
    return;
  }

  const { x, y } = state.hoveredTile;
  const screenX = x * TILE_SIZE - state.camera.x;
  const screenY = y * TILE_SIZE - state.camera.y;

  if (state.mineTarget && state.mineTarget.x === x && state.mineTarget.y === y) {
    const tile = getTile(state.world, x, y);
    const mineTime = state.mineTarget.mineTime ?? TILE_DEFS[tile]?.mineTime ?? FLOWER_MINE_TIME;
    const progress = clamp(state.mineTarget.progress / mineTime, 0, 1);
    ctx.fillStyle = "rgba(13, 17, 26, 0.55)";
    ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = "rgba(255, 208, 107, 0.88)";
    ctx.fillRect(screenX, screenY + TILE_SIZE - 3, TILE_SIZE * progress, 3);
  }
}

function renderSwordSwing(entity, tintAlpha = 1) {
  const swing = getSwingTrace(entity);
  const pivotX = swing.pivotX - state.camera.x;
  const pivotY = swing.pivotY - state.camera.y;
  const attackItemId = entity.attackItemId ?? "sword";
  const def = ITEM_DEFS[attackItemId] ?? ITEM_DEFS.sword;
  const image = def?.asset ? assets[def.asset] : null;

  ctx.save();
  ctx.globalAlpha = tintAlpha;
  ctx.translate(pivotX, pivotY);
  if (entity === state.player) {
    ctx.strokeStyle = `rgba(255, 239, 192, ${0.18 * tintAlpha})`;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(14, swing.reach - 6), entity.swingStartAngle ?? 0, swing.angle);
    ctx.stroke();
  }
  ctx.rotate(swing.angle + Math.PI * 0.5);
  if (image) {
    const scale = Math.min(24 / image.width, 38 / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    ctx.drawImage(image, 0, -drawH, drawW, drawH);
  } else {
    drawItemIcon(attackItemId, -14, -36, 30);
  }
  ctx.restore();
}

function renderCrystalTeleportMarker(boss) {
  if (!boss.pendingTeleport) {
    return;
  }

  const screenX = boss.pendingTeleport.x - state.camera.x + boss.w * 0.5;
  const screenY = boss.pendingTeleport.y - state.camera.y + boss.h * 0.56;
  const telegraphRatio = boss.telegraphDuration > 0 ? 1 - clamp(boss.telegraphTimer / boss.telegraphDuration, 0, 1) : 1;
  const pulse = 1 + Math.sin(state.elapsed * 10) * 0.08;

  ctx.save();
  ctx.globalAlpha = boss.teleportMoveTimer > 0 ? 0.3 : 0.78;
  ctx.strokeStyle = "#9feeff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(screenX, screenY, (20 + telegraphRatio * 10) * pulse, (10 + telegraphRatio * 5) * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screenX - 8, screenY);
  ctx.lineTo(screenX + 8, screenY);
  ctx.moveTo(screenX, screenY - 8);
  ctx.lineTo(screenX, screenY + 8);
  ctx.stroke();
  ctx.restore();
}

function renderEntities() {
  const wingAsset = state.player.hasSeraphWings ? "item-seraph-wings" : state.player.hasSkyWings ? "item-sky-wings" : null;
  if (wingAsset) {
    drawSprite(wingAsset, state.player.x - state.camera.x - 10, state.player.y - state.camera.y + 3, 34, 22, state.player.facing < 0, 0.92);
  }
  drawSprite("sprite-player", state.player.x - state.camera.x - 1, state.player.y - state.camera.y, 18, 28, state.player.facing < 0);
  if (state.player.attackTimer > 0) {
    renderSwordSwing(state.player);
  }

  for (const npc of state.npcs) {
    if (!npc.alive) {
      continue;
    }
    drawSprite(`sprite-${npc.kind}`, npc.x - state.camera.x - 1, npc.y - state.camera.y, 18, 28, npc.facing < 0, npc.invuln > 0 ? 0.72 : 1);
    if (npc.attackTimer > 0) {
      renderSwordSwing(npc, 0.95);
    }
    renderNameplate(npc.name, npc.x + npc.w * 0.5 - state.camera.x, npc.y - state.camera.y - 12, "#9be4ff");
  }

  for (const mob of state.mobs) {
    if (mob.kind === "bird") {
      drawBird(mob);
    } else if (mob.kind === "butterfly") {
      drawButterfly(mob);
    } else if (mob.kind === "worm") {
      drawWorm(mob);
    } else {
      drawSprite(mob.sprite, mob.x - state.camera.x, mob.y - state.camera.y, mob.w, mob.h, mob.facing < 0, mob.invuln > 0 ? 0.65 : 1);
    }
    if (!mob.peaceful || mob.health < mob.maxHealth) {
      renderHealthLine(mob.x - state.camera.x, mob.y - state.camera.y - 6, mob.w, mob.health / mob.maxHealth, "#6de39d");
    }
    if (hasShadowflame(mob)) {
      state.lights.push({
        x: mob.x - state.camera.x + mob.w * 0.5,
        y: mob.y - state.camera.y + mob.h * 0.48,
        radius: 40,
      });
    }
  }

  if (state.boss) {
    if (state.boss.kind === "crystal-queen" || state.boss.kind === "moonlit-empress") {
      renderCrystalTeleportMarker(state.boss);
    }
    drawSprite(state.boss.sprite, state.boss.x - state.camera.x, state.boss.y - state.camera.y, state.boss.w, state.boss.h, state.boss.vx < 0, state.boss.invuln > 0 ? 0.78 : 1);
    const bossLightRadius =
      state.boss.kind === "overseer-eye"
        ? 124
        : state.boss.kind === "stone-warden"
          ? 96
        : state.boss.kind === "sand-djinn"
          ? 110
        : state.boss.kind === "crystal-queen"
          ? 118
        : state.boss.kind === "thunder-roc"
          ? 122
        : state.boss.kind === "ashen-behemoth"
          ? 116
        : state.boss.kind === "storm-hydra"
          ? 126
        : state.boss.kind === "moonlit-empress"
          ? 124
        : state.boss.kind === "grave-sovereign"
          ? 108
        : state.boss.kind === "abyss-herald"
          ? 126
        : state.boss.kind === "crypt-matriarch"
          ? 112
        : state.boss.kind === "void-seraph"
          ? 130
          : 108;
    state.lights.push({
      x: state.boss.x - state.camera.x + state.boss.w * 0.5,
      y: state.boss.y - state.camera.y + state.boss.h * 0.5,
      radius: bossLightRadius,
    });
    if (hasShadowflame(state.boss)) {
      state.lights.push({
        x: state.boss.x - state.camera.x + state.boss.w * 0.5,
        y: state.boss.y - state.camera.y + state.boss.h * 0.5,
        radius: 52,
      });
    }
  }

  const playerTileX = clamp(Math.floor((state.player.x + state.player.w * 0.5) / TILE_SIZE), 0, WORLD_WIDTH - 1);
  const playerTileY = Math.floor((state.player.y + state.player.h * 0.5) / TILE_SIZE);
  const playerSurfaceY = state.world.heights[playerTileX] ?? 0;
  state.lights.push({
    x: state.player.x - state.camera.x + state.player.w * 0.5,
    y: state.player.y - state.camera.y + state.player.h * 0.4,
    radius: playerTileY > playerSurfaceY + 2 ? 30 : isNight() ? 60 : 18,
  });
}

function drawBird(mob) {
  const x = mob.x - state.camera.x;
  const y = mob.y - state.camera.y;
  ctx.save();
  ctx.globalAlpha = mob.invuln > 0 ? 0.65 : 1;
  if (mob.facing < 0) {
    ctx.translate(x + mob.w, y);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, y);
  }
  ctx.fillStyle = "#f3fbff";
  ctx.fillRect(3, 4, 8, 5);
  ctx.fillStyle = "#d6eef9";
  ctx.fillRect(5, 2, 5, 4);
  ctx.fillStyle = "#f8db89";
  ctx.fillRect(11, 5, 3, 2);
  ctx.fillStyle = "#88adc7";
  ctx.fillRect(2, 6, 3, 2);
  ctx.fillStyle = "#1d2430";
  ctx.fillRect(9, 4, 1, 1);
  ctx.restore();
}

function drawButterfly(mob) {
  const x = mob.x - state.camera.x;
  const y = mob.y - state.camera.y;
  const wingOpen = 1 + Math.sin(mob.wingPhase ?? 0) * 0.24;
  const [wingColor, bodyColor] = mob.palette ?? ["#ff8ab3", "#fff0a6"];
  ctx.save();
  ctx.globalAlpha = mob.invuln > 0 ? 0.65 : 1;
  ctx.translate(x + mob.w * 0.5, y + mob.h * 0.5);
  if (mob.facing < 0) {
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = wingColor;
  ctx.beginPath();
  ctx.ellipse(-2.5, -1.1, 2.35 * wingOpen, 2.9, -0.35, 0, Math.PI * 2);
  ctx.ellipse(-2.4, 1.7, 1.9 * wingOpen, 2.35, 0.35, 0, Math.PI * 2);
  ctx.ellipse(2.5, -1.1, 2.35 * wingOpen, 2.9, 0.35, 0, Math.PI * 2);
  ctx.ellipse(2.4, 1.7, 1.9 * wingOpen, 2.35, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-0.75, -2.9, 1.5, 6.5);
  ctx.fillStyle = "#1d2430";
  ctx.fillRect(-0.4, -3.7, 0.8, 8.2);
  ctx.fillRect(-2.1, -4.8, 0.8, 2.2);
  ctx.fillRect(1.3, -4.8, 0.8, 2.2);
  ctx.restore();
}

function drawWorm(mob) {
  const x = mob.x - state.camera.x;
  const y = mob.y - state.camera.y;
  ctx.save();
  ctx.globalAlpha = mob.invuln > 0 ? 0.65 : 1;
  ctx.fillStyle = "#8f654c";
  ctx.fillRect(x + 1, y + 4, 3, 3);
  ctx.fillRect(x + 4, y + 3, 3, 4);
  ctx.fillRect(x + 7, y + 2, 3, 4);
  ctx.fillRect(x + 10, y + 3, 3, 3);
  ctx.fillStyle = "#c89671";
  ctx.fillRect(x + 2, y + 5, 9, 1);
  ctx.restore();
}

function renderParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = clamp(particle.ttl / particle.life, 0, 1);
    if (particle.kind === "leaf-fall") {
      ctx.save();
      ctx.translate(particle.x - state.camera.x, particle.y - state.camera.y);
      ctx.rotate(particle.rotation ?? 0);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size * 0.6, -particle.size * 0.35, particle.size * 1.2, particle.size * 0.7);
      ctx.fillStyle = "rgba(239, 252, 227, 0.55)";
      ctx.fillRect(-particle.size * 0.15, -particle.size * 0.3, particle.size * 0.25, particle.size * 0.6);
      ctx.restore();
      continue;
    }
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - state.camera.x, particle.y - state.camera.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function renderCombatTexts() {
  for (const entry of state.combatTexts) {
    const alpha = clamp(entry.ttl / entry.life, 0, 1);
    const pop = 1 + (1 - alpha) * 0.08;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = entry.outline;
    ctx.fillStyle = entry.color;
    ctx.font = `bold ${Math.round(entry.size * pop)}px Trebuchet MS`;
    const screenX = entry.x - state.camera.x;
    const screenY = entry.y - state.camera.y;
    ctx.strokeText(entry.text, screenX, screenY);
    ctx.fillText(entry.text, screenX, screenY);
    ctx.restore();
  }
  ctx.textAlign = "left";
}

function renderProjectiles() {
  for (const projectile of state.projectiles) {
    const screenX = projectile.x - state.camera.x;
    const screenY = projectile.y - state.camera.y;
	    const spinningProjectile =
	      projectile.kind === "boulder" ||
	      projectile.kind === "rock-shard" ||
	      projectile.kind === "grenade" ||
	      projectile.kind === "ember-orb" ||
	      projectile.kind === "ember-spark" ||
	      projectile.kind === "slag-shard" ||
	      projectile.kind === "grave-skull" ||
	      projectile.kind === "void-orb" ||
	      projectile.kind === "void-tracker" ||
        projectile.kind === "shadow-dagger" ||
        projectile.kind === "portal" ||
        projectile.kind === "sepulcher-ring";
    const angle = spinningProjectile ? projectile.rotation ?? Math.atan2(projectile.vy, projectile.vx) : Math.atan2(projectile.vy, projectile.vx);

    if (projectile.lightRadius > 0) {
      state.lights.push({ x: screenX, y: screenY, radius: projectile.lightRadius });
    }

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(angle);

	    if (projectile.kind === "arrow") {
	      ctx.fillStyle = "#7b5633";
	      ctx.fillRect(-7, -1, 10, 2);
	      ctx.fillStyle = "#f0d9a3";
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-1, -4);
      ctx.lineTo(-1, 4);
      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#d5e6ef";
	      ctx.fillRect(-8, -3, 2, 6);
	    } else if (projectile.kind === "cloud-arrow") {
	      ctx.fillStyle = "rgba(195, 235, 255, 0.75)";
	      ctx.fillRect(-9, -2, 12, 4);
	      ctx.fillStyle = projectile.color ?? "#e7f8ff";
	      ctx.beginPath();
	      ctx.moveTo(6, 0);
	      ctx.lineTo(-1, -5);
	      ctx.lineTo(-1, 5);
	      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#ffffff";
	      ctx.fillRect(-10, -3, 2, 6);
	    } else if (projectile.kind === "bullet") {
	      ctx.fillStyle = projectile.color ?? "#ffd88a";
	      ctx.fillRect(-8, -1, 12, 2);
      ctx.fillStyle = "#fff6d9";
      ctx.fillRect(2, -1, 4, 2);
      ctx.fillStyle = "rgba(255, 225, 150, 0.35)";
      ctx.fillRect(-12, -1, 5, 2);
	    } else if (projectile.kind === "storm-feather") {
	      ctx.fillStyle = "#b8dfff";
	      ctx.beginPath();
	      ctx.moveTo(-8, 0);
      ctx.lineTo(2, -4);
      ctx.lineTo(8, 0);
      ctx.lineTo(2, 4);
      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#f4fbff";
	      ctx.fillRect(-1, -1, 7, 2);
	    } else if (projectile.kind === "hydra-bolt") {
	      ctx.fillStyle = "#67cde6";
	      ctx.beginPath();
	      ctx.moveTo(-8, 0);
	      ctx.lineTo(0, -4);
	      ctx.lineTo(7, 0);
	      ctx.lineTo(0, 4);
	      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#e8feff";
	      ctx.fillRect(-1, -1, 6, 2);
	    } else if (projectile.kind === "storm-drop") {
	      ctx.fillStyle = "#d6fbff";
	      ctx.beginPath();
	      ctx.moveTo(0, -7);
	      ctx.lineTo(5, 1);
	      ctx.lineTo(0, 8);
	      ctx.lineTo(-5, 1);
	      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#8fdbef";
	      ctx.fillRect(-1, -1, 2, 4);
	    } else if (projectile.kind === "laser") {
      ctx.fillStyle = "rgba(132, 241, 255, 0.38)";
      ctx.fillRect(-12, -2, 18, 4);
      ctx.fillStyle = projectile.color ?? "#9af0ff";
      ctx.fillRect(-9, -1, 14, 2);
      ctx.fillStyle = "#f2ffff";
      ctx.fillRect(2, -1, 4, 2);
    } else if (projectile.kind === "eye-bolt") {
      ctx.fillStyle = "#ab1e2c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef6a74";
      ctx.beginPath();
      ctx.ellipse(-1, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff2f2";
      ctx.fillRect(1, -1, 2, 2);
	    } else if (projectile.kind === "boulder") {
      ctx.fillStyle = "#7f6f5e";
      ctx.beginPath();
      ctx.moveTo(-9, -6);
      ctx.lineTo(-3, -9);
      ctx.lineTo(8, -5);
      ctx.lineTo(10, 3);
      ctx.lineTo(4, 10);
      ctx.lineTo(-7, 7);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
	      ctx.fillStyle = "#cab393";
	      ctx.fillRect(-4, -4, 5, 2);
	      ctx.fillRect(0, 1, 4, 2);
	    } else if (projectile.kind === "ashen-meteor") {
	      ctx.fillStyle = "#8e3117";
	      ctx.beginPath();
	      ctx.arc(0, 0, 8, 0, Math.PI * 2);
	      ctx.fill();
	      ctx.fillStyle = "#ffad62";
	      ctx.beginPath();
	      ctx.arc(-1, -1, 5, 0, Math.PI * 2);
	      ctx.fill();
	      ctx.fillStyle = "#ffe6a3";
	      ctx.fillRect(1, -1, 2, 2);
	    } else if (projectile.kind === "rock-shard") {
      ctx.fillStyle = "#d9c4a6";
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(2, 4);
      ctx.closePath();
      ctx.fill();
	      ctx.fillStyle = "#8e7b64";
	      ctx.fillRect(-1, -1, 2, 2);
	    } else if (projectile.kind === "cinder-fragment") {
	      ctx.fillStyle = "#ffcf97";
	      ctx.beginPath();
	      ctx.moveTo(-4, -1);
	      ctx.lineTo(5, 0);
	      ctx.lineTo(-3, 3);
	      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#fff1cf";
	      ctx.fillRect(-1, -1, 2, 2);
	    } else if (projectile.kind === "grenade") {
      ctx.fillStyle = "#5f6470";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b8bfca";
      ctx.fillRect(-2, -7, 4, 3);
      ctx.fillStyle = "#ffcf7f";
      ctx.fillRect(1, -9, 3, 2);
    } else if (projectile.kind === "sand-spike") {
      ctx.fillStyle = "#c39249";
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(5, -3);
      ctx.lineTo(7, 0);
      ctx.lineTo(5, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f1d79a";
      ctx.fillRect(-2, -1, 5, 2);
	    } else if (projectile.kind === "crystal-bolt") {
      ctx.fillStyle = "#77d8ff";
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
	      ctx.fillStyle = "#eefcff";
	      ctx.fillRect(-1, -2, 2, 4);
	    } else if (projectile.kind === "moon-crescent") {
	      ctx.fillStyle = "#eaf6ff";
	      ctx.beginPath();
	      ctx.arc(0, 0, 6, 0, Math.PI * 2);
	      ctx.fill();
	      ctx.fillStyle = "rgba(140, 176, 255, 0.85)";
	      ctx.beginPath();
	      ctx.arc(2, 0, 5, 0, Math.PI * 2);
	      ctx.fill();
	    } else if (projectile.kind === "star-lance") {
	      ctx.fillStyle = "#d9efff";
	      ctx.fillRect(-2, -8, 4, 14);
	      ctx.fillStyle = "#ffffff";
	      ctx.beginPath();
	      ctx.moveTo(0, -10);
	      ctx.lineTo(4, -4);
	      ctx.lineTo(-4, -4);
	      ctx.closePath();
	      ctx.fill();
	    } else if (projectile.kind === "sunshard-core") {
      ctx.fillStyle = "#fff0a3";
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(0, -5);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff8db";
      ctx.fillRect(-1, -2, 2, 4);
    } else if (projectile.kind === "sunshard-shard") {
      ctx.fillStyle = "#ffe790";
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(0, -2);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
    } else if (projectile.kind === "sky-impulse") {
      ctx.fillStyle = "rgba(215, 246, 255, 0.32)";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ebfcff";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
	    } else if (projectile.kind === "void-tracker") {
      ctx.fillStyle = "rgba(165, 112, 255, 0.92)";
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(223, 172, 255, 0.92)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(0, 0, projectile.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
	    } else if (projectile.kind === "grave-skull") {
      ctx.fillStyle = "#6f5898";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d9c8ff";
      ctx.beginPath();
      ctx.arc(-1, -1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#352d49";
	      ctx.fillRect(-3, -1, 2, 2);
	      ctx.fillRect(1, -1, 2, 2);
	      ctx.fillRect(-2, 2, 4, 1);
	    } else if (projectile.kind === "grave-lance") {
	      ctx.fillStyle = "#d7c7a6";
	      ctx.fillRect(-2, -8, 4, 13);
	      ctx.fillStyle = "#8e7d66";
	      ctx.beginPath();
	      ctx.moveTo(0, -10);
	      ctx.lineTo(4, -5);
	      ctx.lineTo(-4, -5);
	      ctx.closePath();
	      ctx.fill();
	    } else if (projectile.kind === "grave-chain") {
	      ctx.fillStyle = "#b9ae92";
	      ctx.fillRect(-8, -1, 12, 2);
	      ctx.fillStyle = "#e2d9c6";
	      ctx.beginPath();
	      ctx.arc(5, 0, 3, 0, Math.PI * 2);
	      ctx.fill();
	    } else if (projectile.kind === "sepulcher-ring") {
        ctx.strokeStyle = "#d8cab0";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#7f7058";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#f4ead7";
        ctx.fillRect(4, -1, 3, 2);
	    } else if (projectile.kind === "tomb-shard") {
	      ctx.fillStyle = "#d9d0c0";
	      ctx.beginPath();
	      ctx.moveTo(-5, -2);
	      ctx.lineTo(5, 0);
	      ctx.lineTo(-4, 3);
	      ctx.closePath();
	      ctx.fill();
	    } else if (projectile.kind === "void-orb") {
	      ctx.fillStyle = "#5d1f7f";
	      ctx.beginPath();
	      ctx.arc(0, 0, 7, 0, Math.PI * 2);
	      ctx.fill();
	      ctx.fillStyle = projectile.color ?? "#d48aff";
	      ctx.beginPath();
	      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
	      ctx.fill();
	      ctx.fillStyle = "#f9d9ff";
	      ctx.fillRect(-1, -1, 2, 2);
	    } else if (projectile.kind === "shadow-dagger") {
        ctx.fillStyle = "#40185f";
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(4, -1);
        ctx.lineTo(2, 8);
        ctx.lineTo(-2, 8);
        ctx.lineTo(-4, -1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = projectile.color ?? "#c171ff";
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(2.5, -1);
        ctx.lineTo(1, 6);
        ctx.lineTo(-1, 6);
        ctx.lineTo(-2.5, -1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f4d8ff";
        ctx.fillRect(-1, -5, 2, 7);
	    } else if (projectile.kind === "portal") {
        const portalImage = assets["projectile-portal"];
        const drawSize = Math.max(18, projectile.radius * 2.4);
        if (projectile.trailHistory?.length) {
          for (let i = projectile.trailHistory.length - 1; i >= 0; i -= 1) {
            const ghost = projectile.trailHistory[i];
            const ratio = 1 - i / projectile.trailHistory.length;
            ctx.save();
            ctx.translate((ghost.x - projectile.x) * 0.32, (ghost.y - projectile.y) * 0.32);
            ctx.rotate((ghost.rotation ?? projectile.rotation) - angle);
            ctx.globalAlpha = 0.08 + ratio * 0.1;
            if (portalImage) {
              ctx.drawImage(portalImage, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
            } else {
              ctx.strokeStyle = `rgba(213, 142, 255, ${0.28 + ratio * 0.18})`;
              ctx.lineWidth = 2 + ratio;
              ctx.beginPath();
              ctx.arc(0, 0, projectile.radius * (0.82 + ratio * 0.18), 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        ctx.fillStyle = "rgba(192, 102, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius + 6, 0, Math.PI * 2);
        ctx.fill();
        if (portalImage) {
          ctx.drawImage(portalImage, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
        } else {
          ctx.strokeStyle = "#d58eff";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "#f1d3ff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, projectile.radius * 0.58, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(242, 207, 255, 0.42)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius + 3 + Math.sin(state.elapsed * 10 + projectile.age * 8) * 1.2, 0, Math.PI * 2);
        ctx.stroke();
	    } else if (projectile.kind === "flame") {
	      const flameImage = assets["projectile-flame"];
	      const drawSize = Math.max(1, projectile.radius * 2);
	      if (flameImage) {
	        ctx.drawImage(flameImage, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
	      } else {
	        const coreRadius = Math.max(1, projectile.radius * 0.45);
	        const glowRadius = Math.max(1, projectile.radius * 0.75);
	        ctx.fillStyle = "rgba(255, 113, 62, 0.3)";
	        ctx.beginPath();
	        ctx.arc(0, 0, projectile.radius, 0, Math.PI * 2);
	        ctx.fill();
	        ctx.fillStyle = projectile.color ?? "#ff8d5b";
	        ctx.beginPath();
	        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
	        ctx.fill();
	        ctx.fillStyle = "#ffd978";
	        ctx.beginPath();
	        ctx.arc(-projectile.radius * 0.08, -projectile.radius * 0.08, coreRadius, 0, Math.PI * 2);
	        ctx.fill();
	        ctx.fillStyle = "#fff4c8";
	        ctx.beginPath();
	        ctx.arc(projectile.radius * 0.08, -projectile.radius * 0.1, Math.max(1, projectile.radius * 0.18), 0, Math.PI * 2);
	        ctx.fill();
	      }
	    } else if (projectile.kind === "ember-orb") {
      ctx.fillStyle = "#9c2e12";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb66d";
      ctx.beginPath();
      ctx.arc(-1, -1, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (projectile.kind === "ember-spark") {
      ctx.fillStyle = "#ffce88";
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(0, -3);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff5d9";
      ctx.fillRect(-1, -1, 2, 2);
	    } else if (projectile.kind === "forge-bolt") {
      ctx.fillStyle = "#923517";
      ctx.fillRect(-8, -2, 12, 4);
      ctx.fillStyle = "#ffbd75";
      ctx.fillRect(-3, -1, 9, 2);
	      ctx.fillStyle = "#fff2d2";
	      ctx.fillRect(3, -1, 3, 2);
	    } else if (projectile.kind === "ash-column") {
	      ctx.fillStyle = "#ffc57f";
	      ctx.fillRect(-3, -9, 6, 14);
	      ctx.fillStyle = "#fff0c7";
	      ctx.fillRect(-1, -8, 2, 11);
	    } else if (projectile.kind === "slag-shard") {
      ctx.fillStyle = "#a84f23";
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(5, 0);
      ctx.lineTo(-4, 3);
      ctx.closePath();
	      ctx.fill();
	      ctx.fillStyle = "#ffd18c";
	      ctx.fillRect(-1, -1, 3, 2);
	    } else if (projectile.kind === "abyss-needle") {
	      ctx.fillStyle = "#d194ff";
	      ctx.fillRect(-8, -1, 12, 2);
	      ctx.fillStyle = "#f7dbff";
	      ctx.fillRect(2, -1, 4, 2);
	    } else if (projectile.kind === "rift-star") {
	      ctx.fillStyle = "#ebb6ff";
	      ctx.beginPath();
	      ctx.moveTo(0, -6);
	      ctx.lineTo(2, -2);
	      ctx.lineTo(6, 0);
	      ctx.lineTo(2, 2);
	      ctx.lineTo(0, 6);
	      ctx.lineTo(-2, 2);
	      ctx.lineTo(-6, 0);
	      ctx.lineTo(-2, -2);
	      ctx.closePath();
	      ctx.fill();
	    } else if (projectile.kind === "abyss-flare") {
	      ctx.fillStyle = "#b05cff";
	      ctx.beginPath();
	      ctx.arc(0, 0, 7, 0, Math.PI * 2);
	      ctx.fill();
	      ctx.fillStyle = "#f2c8ff";
	      ctx.beginPath();
	      ctx.arc(-1, -1, 4, 0, Math.PI * 2);
	      ctx.fill();
	    }

    ctx.restore();
  }
}

function renderActiveQuasar() {
  const quasar = state.activeQuasar;
  if (!quasar) {
    return;
  }

  const screenX = quasar.x - state.camera.x;
  const screenY = quasar.y - state.camera.y;
  const pulseRadius = quasar.radius + Math.sin(quasar.pulse) * 2.5;
  const diskWidth = pulseRadius + 18;
  const innerDiskWidth = pulseRadius + 10;
  const diskHeight = pulseRadius * 0.52;
  state.lights.push({ x: screenX, y: screenY, radius: 78 });

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(quasar.rotation);
  ctx.fillStyle = "rgba(110, 186, 214, 0.09)";
  ctx.beginPath();
  ctx.ellipse(0, 0, diskWidth + 10, pulseRadius * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(210, 245, 255, 0.3)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(0, 0, diskWidth + 8, diskHeight * 1.25, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.rotate(-quasar.rotation * 1.8);
  ctx.strokeStyle = "rgba(126, 204, 232, 0.46)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(0, 0, diskWidth + 2, diskHeight * 0.95, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.rotate(quasar.rotation * 0.55);
  ctx.strokeStyle = "rgba(255, 247, 226, 0.72)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, innerDiskWidth, diskHeight * 0.58, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 251, 244, 0.26)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, diskWidth + 15, diskHeight * 1.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(14, 18, 24, 0.9)";
  ctx.beginPath();
  ctx.arc(0, 0, pulseRadius + 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#05070b";
  ctx.beginPath();
  ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(198, 240, 255, 0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, pulseRadius - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 247, 226, 0.26)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, pulseRadius + 1.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(215, 246, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(-3, -3, pulseRadius * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderBeams() {
  const visibleBeams = state.activeBeam ? [...state.beams, state.activeBeam] : state.beams;
  for (const beam of visibleBeams) {
    const lifeRatio = clamp(beam.ttl / beam.life, 0, 1);
    const startX = beam.x1 - state.camera.x;
    const startY = beam.y1 - state.camera.y;
    const endX = beam.x2 - state.camera.x;
    const endY = beam.y2 - state.camera.y;
    const length = Math.hypot(endX - startX, endY - startY);
    const angle = Math.atan2(endY - startY, endX - startX);

    state.lights.push({
      x: (startX + endX) * 0.5,
      y: (startY + endY) * 0.5,
      radius: Math.min(180, beam.lightRadius + length * 0.08),
    });
    state.lights.push({ x: endX, y: endY, radius: beam.lightRadius + 12 });

    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.28 + lifeRatio * 0.34;
    ctx.fillStyle = beam.glowColor;
    ctx.fillRect(0, -beam.width * 0.5, length, beam.width);
    ctx.fillStyle = beam.color;
    ctx.fillRect(0, -beam.width * 0.26, length, beam.width * 0.52);
    ctx.fillStyle = beam.coreColor;
    ctx.fillRect(0, -1, length, 2);
    ctx.beginPath();
    ctx.arc(0, 0, beam.width * 0.75, 0, Math.PI * 2);
    ctx.arc(length, 0, beam.width * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function renderPortals() {
  for (const portal of state.portals) {
    const screenX = portal.x - state.camera.x;
    const screenY = portal.y - state.camera.y;
    const lifeRatio = clamp(portal.ttl / portal.life, 0, 1);
    const pulse = 0.82 + Math.sin(state.elapsed * 11 + portal.wobble) * 0.12;
    const radius = portal.radius * pulse;

    state.lights.push({ x: screenX, y: screenY, radius: radius * 3.1 });

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(1, 0.58);
    ctx.globalAlpha = 0.18 + lifeRatio * 0.3;
    ctx.fillStyle = portal.glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.78 * lifeRatio;
    ctx.lineWidth = 4;
    ctx.strokeStyle = portal.color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f7fdff";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function renderDrops() {
  for (const drop of state.drops) {
    const bob = Math.sin((state.elapsed + drop.age) * 5.2) * 1.4;
    drawItemIcon(drop.itemId, drop.x - state.camera.x - 3, drop.y - state.camera.y - 3 + bob, 20);
    if (drop.count > 1) {
      ctx.fillStyle = "rgba(9, 13, 22, 0.72)";
      ctx.fillRect(drop.x - state.camera.x + 8, drop.y - state.camera.y + 8 + bob, 16, 12);
      ctx.fillStyle = "#f5ead0";
      ctx.font = "11px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(String(drop.count), drop.x - state.camera.x + 16, drop.y - state.camera.y + 17 + bob);
      ctx.textAlign = "left";
    }
  }
}

function renderLighting(skyLight) {
  const scaleX = lightingCanvas.width / canvas.width;
  const scaleY = lightingCanvas.height / canvas.height;
  const radiusScale = (scaleX + scaleY) * 0.5;
  const baseDarkness = clamp(0.42 - skyLight * 0.22, 0.12, 0.42);
  const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE) - 2);
  const endX = Math.min(WORLD_WIDTH - 1, Math.ceil((state.camera.x + canvas.width) / TILE_SIZE) + 2);
  const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE) - 2);
  const endY = Math.min(WORLD_HEIGHT - 1, Math.ceil((state.camera.y + canvas.height) / TILE_SIZE) + 2);

  lightingCtx.clearRect(0, 0, lightingCanvas.width, lightingCanvas.height);
  lightingCtx.save();
  lightingCtx.fillStyle = `rgba(5, 7, 18, ${baseDarkness})`;
  lightingCtx.fillRect(0, 0, lightingCanvas.width, lightingCanvas.height);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const extraDarkness = getLightingExtraOpacity(x, y, skyLight, baseDarkness);
      if (extraDarkness <= 0.01) {
        continue;
      }
      lightingCtx.fillStyle = `rgba(5, 7, 18, ${clamp(extraDarkness, 0, 1)})`;
      lightingCtx.fillRect(
        Math.floor((x * TILE_SIZE - state.camera.x) * scaleX),
        Math.floor((y * TILE_SIZE - state.camera.y) * scaleY),
        Math.ceil(TILE_SIZE * scaleX),
        Math.ceil(TILE_SIZE * scaleY),
      );
    }
  }

  lightingCtx.globalCompositeOperation = "destination-out";
  for (const light of state.lights) {
    const lightX = light.x * scaleX;
    const lightY = light.y * scaleY;
    const lightRadius = Math.max(4, light.radius * radiusScale);
    const gradient = lightingCtx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightRadius);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.22, "rgba(255,255,255,0.62)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.18)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    lightingCtx.fillStyle = gradient;
    lightingCtx.beginPath();
    lightingCtx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
    lightingCtx.fill();
  }

  lightingCtx.restore();
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lightingCanvas, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function renderHud(skyLight) {
  renderFrameTopBar(skyLight);
  renderHotbar();
  renderMessages();
  renderDialogue();
  renderTradeWindow();
  renderCraftWindow();
  renderSettingsWindow();
  renderCheatWindow();
  renderSkyChestPrompt();
  renderNpcPrompt();
  renderStationPrompt();
  renderBossBar();
}

function renderFrameTopBar(skyLight) {
  ctx.fillStyle = "rgba(8, 14, 24, 0.62)";
  ctx.fillRect(18, 16, 430, 78);
  ctx.fillStyle = "rgba(8, 14, 24, 0.62)";
  ctx.fillRect(canvas.width - 272, 16, 254, 104);

  ctx.fillStyle = "#f6ead2";
  ctx.font = "18px Trebuchet MS";
  ctx.fillText("Health", 32, 40);
  renderHealthLine(32, 50, 220, state.player.health / state.player.maxHealth, "#ef7f6a", 14);
  ctx.fillStyle = "#d9d1b8";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(`${Math.ceil(state.player.health)} / ${state.player.maxHealth}`, 260, 61);

  ctx.fillStyle = "#9dd8e8";
  ctx.fillText(`Seed ${state.seed}`, 32, 84);
  ctx.fillStyle = "#f4cf68";
  ctx.fillText(`Coins ${state.player.coins}`, 118, 84);
  const totalDefense = (state.player.armor || 0) + (state.player.bonusDefense || 0);
  if (totalDefense > 0) {
    ctx.fillStyle = "#c9d3dc";
    ctx.fillText(`Armor ${totalDefense}`, 210, 84);
  }
  if (state.player.hasAeroRig) {
    ctx.fillStyle = "#9ef2ff";
    ctx.fillText(
      `Aero Rig ${state.player.dashCooldown > 0 ? `cooling ${state.player.dashCooldown.toFixed(1)}s` : "ready"}`,
      292,
      84
    );
  }
  const equippedWings = getEquippedWingDef();
  if (equippedWings) {
    ctx.fillStyle = "#d5ecff";
    const wingFlightTime = getWingFlightTime(equippedWings, state.player);
    const wingText = Number.isFinite(wingFlightTime)
      ? `Wings ${Math.round(clamp(state.player.wingFuel / wingFlightTime, 0, 1) * 100)}%`
      : "Wings INF";
    ctx.fillText(wingText, 378, 84);
  }

  const cycleText = isNight() ? "Night" : "Day";
  const objective = state.boss
    ? "Objective: survive the boss rush"
    : isNight()
      ? "Objective: night summons are ready: Overseer Eye, Crystal Queen, Crypt Matriarch or Void Seraph"
      : "Objective: day summons are ready: Stone Warden, Sandstorm Djinn, Forge Titan or Thunder Roc";

  ctx.fillStyle = "#f6ead2";
  ctx.font = "22px Trebuchet MS";
  ctx.fillText(cycleText, canvas.width - 248, 44);
  ctx.fillStyle = "#d2dce2";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(`Sky light ${Math.round(skyLight * 100)}%`, canvas.width - 248, 66);
  wrapText(objective, canvas.width - 248, 88, 220, 18, "#f4c87b");
}

function renderHotbar() {
  const visibleCount = Math.min(9, state.player.inventory.length);
  if (visibleCount <= 0) {
    return;
  }
  const windowStart = getHotbarWindowStart();
  const width = 72 * visibleCount;
  const startX = canvas.width * 0.5 - width * 0.5;
  const y = canvas.height - 84;

  for (let i = 0; i < visibleCount; i += 1) {
    const slotIndex = windowStart + i;
    const slot = state.player.inventory[slotIndex];
    const item = ITEM_DEFS[slot.id];
    const x = startX + i * 72;
    const selected = slotIndex === state.player.selectedSlot;

    ctx.fillStyle = selected ? "rgba(245, 181, 92, 0.92)" : "rgba(13, 20, 31, 0.72)";
    ctx.fillRect(x, y, 64, 64);
    ctx.strokeStyle = selected ? "rgba(255, 239, 183, 0.94)" : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, 62, 62);

    drawItemIcon(slot.id, x + 16, y + 12, 32);

    ctx.fillStyle = selected ? "#1e1a14" : "#f5f0dd";
    ctx.font = "12px Trebuchet MS";
    ctx.fillText(String(i + 1), x + 6, y + 14);

    if (item.kind === "block" || item.kind === "consumable" || slot.count !== 1) {
      ctx.textAlign = "right";
      ctx.fillText(String(slot.count), x + 58, y + 56);
      ctx.textAlign = "left";
    }
  }

  const active = getSelectedInventoryEntry();
  if (!active) {
    return;
  }
  ctx.fillStyle = "rgba(12, 18, 30, 0.7)";
  ctx.fillRect(canvas.width * 0.5 - 132, canvas.height - 116, 264, 24);
  ctx.fillStyle = "#f5ebd4";
  ctx.font = "14px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(ITEM_DEFS[active.id].name, canvas.width * 0.5, canvas.height - 99);
  ctx.textAlign = "left";

  if (active.id === "gun" || state.player.minigunHeat > 0 || state.player.minigunOverheatTimer > 0) {
    renderMinigunHeat(canvas.width * 0.5 - 132, canvas.height - 146, 264);
  }
}

function renderMinigunHeat(x, y, width) {
  const ratio = clamp(state.player.minigunHeat / 5, 0, 1);
  ctx.fillStyle = "rgba(12, 18, 30, 0.76)";
  ctx.fillRect(x, y, width, 22);
  renderHealthLine(x + 6, y + 7, width - 12, ratio, state.player.minigunOverheatTimer > 0 ? "#ff6b57" : "#f5a94c", 8);
  ctx.fillStyle = state.player.minigunOverheatTimer > 0 ? "#ffd6cf" : "#f7e2b6";
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "center";
  const status = state.player.minigunOverheatTimer > 0
    ? `Overheat ${state.player.minigunOverheatTimer.toFixed(1)}s`
    : `Heat ${Math.round(ratio * 100)}%`;
  ctx.fillText(status, x + width * 0.5, y + 15);
  ctx.textAlign = "left";
}

function renderMessages() {
  if (state.message.ttl <= 0) {
    return;
  }

  ctx.fillStyle = `rgba(9, 14, 24, ${clamp(state.message.ttl / 3.6, 0.18, 0.7)})`;
  ctx.fillRect(canvas.width * 0.5 - 250, 110, 500, 36);
  ctx.fillStyle = "#f7e9cf";
  ctx.font = "16px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(state.message.text, canvas.width * 0.5, 133);
  ctx.textAlign = "left";
}

function renderDialogue() {
  if (!state.dialogue) {
    return;
  }

  const panelX = 22;
  const panelY = canvas.height - 184;
  const panelW = canvas.width - 44;
  const panelH = 94;

  ctx.fillStyle = "rgba(10, 16, 28, 0.84)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 227, 168, 0.35)";
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#f2bc66";
  ctx.font = "18px Trebuchet MS";
  ctx.fillText(state.dialogue.speaker, panelX + 20, panelY + 28);
  wrapText(state.dialogue.text, panelX + 20, panelY + 56, panelW - 40, 18, "#f0e7d1");
}

function renderNpcPrompt() {
  if (state.tradeOpen || state.craftOpen || state.cheatOpen) {
    return;
  }
  const npc = getNearestNpc(72);
  if (!npc) {
    return;
  }

  const x = npc.x + npc.w * 0.5 - state.camera.x;
  const y = npc.y - state.camera.y - 30;
  ctx.fillStyle = "rgba(12, 18, 28, 0.72)";
  ctx.fillRect(x - 54, y - 16, 108, 22);
  ctx.fillStyle = "#f2d28f";
  ctx.font = "13px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(npc.kind === "merchant" ? "E talk / T trade" : "Press E to talk", x, y);
  ctx.textAlign = "left";
}

function renderSkyChestPrompt() {
  if (state.tradeOpen || state.craftOpen || state.cheatOpen) {
    return;
  }
  const chest = getNearestSkyChest(74);
  if (!chest) {
    return;
  }
  const x = chest.x + chest.w * 0.5 - state.camera.x;
  const y = chest.y - state.camera.y - 16;
  ctx.fillStyle = "rgba(12, 18, 28, 0.76)";
  ctx.fillRect(x - 58, y - 16, 116, 22);
  ctx.fillStyle = "#e7f7ff";
  ctx.font = "13px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Press E to open", x, y);
  ctx.textAlign = "left";
}

function renderStationPrompt() {
  if (state.tradeOpen || state.craftOpen || state.cheatOpen || !isNearFurnace()) {
    return;
  }

  const x = state.player.x + state.player.w * 0.5 - state.camera.x;
  const y = state.player.y - state.camera.y - 50;
  ctx.fillStyle = "rgba(12, 18, 28, 0.72)";
  ctx.fillRect(x - 76, y - 16, 152, 22);
  ctx.fillStyle = "#ffcf80";
  ctx.font = "13px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Esc craft / smelt", x, y);
  ctx.textAlign = "left";
}

function renderTradeWindow() {
  if (!state.tradeOpen) {
    return;
  }

  const visibleOffers = 4;
  const start = state.tradeScroll;
  const end = Math.min(SHOP_ITEMS.length, start + visibleOffers);
  const panelW = 420;
  const panelH = 260;
  const x = canvas.width - panelW - 26;
  const y = canvas.height - panelH - 110;
  ctx.fillStyle = "rgba(9, 14, 24, 0.92)";
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 214, 132, 0.3)";
  ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#f3c26c";
  ctx.font = "20px Trebuchet MS";
  ctx.fillText("Merchant Trade", x + 18, y + 30);
  ctx.fillStyle = "#f4d87c";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(`Coins: ${state.player.coins}`, x + 18, y + 54);
  ctx.fillStyle = "#cbd7df";
  ctx.fillText("Wheel scrolls offers. Press 1-4 to buy. T or Esc closes.", x + 18, y + 76);
  ctx.fillStyle = "#7cc9d8";
  ctx.fillText(`Showing ${start + 1}-${end} of ${SHOP_ITEMS.length}`, x + 18, y + 96);

  for (let i = 0; i < end - start; i += 1) {
    const offer = SHOP_ITEMS[start + i];
    const item = ITEM_DEFS[offer.id];
    const cardY = y + 112 + i * 34;
    const affordable = state.player.coins >= offer.price;
    ctx.fillStyle = affordable ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(x + 14, cardY, panelW - 28, 28);
    drawItemIcon(offer.id, x + 22, cardY + 5, 24);
    ctx.fillStyle = "#f5ecd6";
    const quantityLabel = offer.quantity && offer.quantity > 1 ? ` x${offer.quantity}` : "";
    ctx.fillText(`${i + 1}. ${item.name}${quantityLabel}`, x + 56, cardY + 19);
    ctx.fillStyle = affordable ? "#f4cf68" : "#d78c83";
    ctx.textAlign = "right";
    ctx.fillText(`${offer.price} coins`, x + panelW - 24, cardY + 19);
    ctx.textAlign = "left";
  }
}

function renderCraftWindow() {
  if (!state.craftOpen) {
    return;
  }

  const visibleRecipes = 5;
  const start = state.craftScroll;
  const end = Math.min(RECIPES.length, start + visibleRecipes);
  const panel = getCraftWindowRect();
  const x = panel.x;
  const y = panel.y;
  const panelW = panel.w;
  const panelH = panel.h;
  const settingsButton = getCraftSettingsButtonRect();

  ctx.fillStyle = "rgba(9, 14, 24, 0.94)";
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 214, 132, 0.3)";
  ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#f3c26c";
  ctx.font = "20px Trebuchet MS";
  ctx.fillText("Crafting", x + 18, y + 30);
  ctx.fillStyle = isNearFurnace() ? "#ffcf80" : "#9db2c1";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(isNearFurnace() ? "Furnace nearby: smelting unlocked" : "Furnace nearby: no", x + 18, y + 54);
  ctx.fillStyle = "#cbd7df";
  ctx.fillText("Press 1-5 to craft. Click Settings for controls and display.", x + 18, y + 76);
  ctx.fillStyle = "#7cc9d8";
  ctx.fillText(`Showing ${start + 1}-${end} of ${RECIPES.length}`, x + 18, y + 96);

  drawUiButton(settingsButton, state.settingsOpen ? "Back" : "Settings", state.settingsOpen);

  for (let i = 0; i < end - start; i += 1) {
    const recipe = RECIPES[start + i];
    const output = ITEM_DEFS[recipe.outputId];
    const craftable = canCraftRecipe(recipe);
    const cardY = y + 112 + i * 36;
    ctx.fillStyle = craftable ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
    ctx.fillRect(x + 14, cardY, panelW - 28, 30);
    drawItemIcon(recipe.outputId, x + 22, cardY + 3, 24);
    ctx.fillStyle = craftable ? "#f5ecd6" : "#cab9a9";
    ctx.fillText(`${i + 1}. ${output.name}${recipe.outputCount > 1 ? ` x${recipe.outputCount}` : ""}`, x + 56, cardY + 19);
    const ingredientsText = recipe.ingredients
      .map((ingredient) => `${getInventoryCount(ingredient.id)}/${ingredient.count} ${ITEM_DEFS[ingredient.id].name}`)
      .join(", ");
    ctx.fillStyle = recipe.station === "furnace" && !isNearFurnace() ? "#d78c83" : "#9fc4d1";
    ctx.font = "12px Trebuchet MS";
    ctx.fillText(`${recipe.station === "furnace" ? "[Furnace] " : ""}${ingredientsText}`, x + 56, cardY + 28);
    ctx.font = "14px Trebuchet MS";
  }
}

function renderSettingsWindow() {
  if (!state.craftOpen || !state.settingsOpen) {
    return;
  }

  const panel = getSettingsWindowRect();
  const modeButton = getSettingsWindowModeButtonRect();
  const closeButton = getSettingsCloseButtonRect();
  const controlLines = [
    "A / D  move",
    "Space  jump, then fly if wings are equipped",
    "Shift  dash with Aero Rig in the move direction",
    "Left click  mine, attack, shoot, use the held item",
    "Right click  place the selected block",
    "Mouse wheel  scroll hotbar and long lists",
    "E  talk to NPCs",
    "T  trade with the merchant",
    "Q  drop one item from the selected slot",
    "Esc  open crafting, smelting and this settings button",
    "*  open the cheat panel",
  ];

  ctx.fillStyle = "rgba(4, 8, 14, 0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(10, 16, 28, 0.97)";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = "rgba(255, 214, 132, 0.34)";
  ctx.strokeRect(panel.x + 1, panel.y + 1, panel.w - 2, panel.h - 2);

  ctx.fillStyle = "#f3c26c";
  ctx.font = "22px Trebuchet MS";
  ctx.fillText("Settings", panel.x + 24, panel.y + 34);
  ctx.fillStyle = "#c8d6e2";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText("General controls live here so gameplay stays clean in the main view.", panel.x + 24, panel.y + 58);

  drawUiButton(closeButton, "Close", false);

  ctx.fillStyle = "#f1dca1";
  ctx.font = "16px Trebuchet MS";
  ctx.fillText("Display", panel.x + 24, panel.y + 102);

  if (desktopApi?.isDesktop) {
    const modeLabel = state.desktopWindowMode === "windowed" ? "Windowed with frame" : "Fullscreen";
    drawUiButton(modeButton, modeLabel, state.desktopWindowMode === "fullscreen", 16);
    ctx.fillStyle = "#9fc4d1";
    ctx.font = "13px Trebuchet MS";
    ctx.fillText("Click the button or press F to switch modes.", panel.x + 24, panel.y + 128);
  } else {
    ctx.fillStyle = "#9db2c1";
    ctx.font = "13px Trebuchet MS";
    wrapText("Window mode switching is available in the desktop .exe build.", panel.x + 24, panel.y + 122, panel.w - 48, 18, "#9db2c1");
  }

  ctx.fillStyle = "#f1dca1";
  ctx.font = "16px Trebuchet MS";
  ctx.fillText("Controls", panel.x + 24, panel.y + 168);

  ctx.fillStyle = "#e6edf3";
  ctx.font = "14px Trebuchet MS";
  for (let i = 0; i < controlLines.length; i += 1) {
    ctx.fillText(controlLines[i], panel.x + 24, panel.y + 196 + i * 20);
  }
}

function drawUiButton(rect, label, active = false, fontSize = 14) {
  ctx.fillStyle = active ? "rgba(245, 181, 92, 0.92)" : "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = active ? "rgba(255, 239, 183, 0.94)" : "rgba(255, 255, 255, 0.14)";
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.fillStyle = active ? "#1e1a14" : "#f5ebd4";
  ctx.font = `${fontSize}px Trebuchet MS`;
  ctx.textAlign = "center";
  ctx.fillText(label, rect.x + rect.w * 0.5, rect.y + rect.h * 0.66);
  ctx.textAlign = "left";
}

function renderCheatWindow() {
  if (!state.cheatOpen) {
    return;
  }

  const cheatItems = getCheatItems();
  const visibleItems = 5;
  const start = state.cheatScroll;
  const end = Math.min(cheatItems.length, start + visibleItems);
  const panelW = 440;
  const panelH = 310;
  const x = canvas.width - panelW - 26;
  const y = canvas.height - panelH - 110;

  ctx.fillStyle = "rgba(24, 10, 18, 0.95)";
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = "rgba(255, 122, 168, 0.28)";
  ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);

  ctx.fillStyle = "#ff9fb4";
  ctx.font = "20px Trebuchet MS";
  ctx.fillText("Cheat Panel", x + 18, y + 30);
  ctx.fillStyle = "#f0ced7";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText("Wheel scrolls items. Press 1-5 to grant. Esc or * closes.", x + 18, y + 54);
  ctx.fillStyle = "#e5a1b4";
  ctx.fillText(`Showing ${start + 1}-${end} of ${cheatItems.length}`, x + 18, y + 76);

  for (let i = 0; i < end - start; i += 1) {
    const item = cheatItems[start + i];
    const cardY = y + 96 + i * 38;
    const amount = getCheatGrantAmount(item.id);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x + 14, cardY, panelW - 28, 32);
    drawItemIcon(item.id, x + 22, cardY + 4, 24);
    ctx.fillStyle = "#f9dbe2";
    ctx.fillText(`${i + 1}. ${item.name}`, x + 56, cardY + 18);
    ctx.fillStyle = "#f7a7be";
    ctx.font = "12px Trebuchet MS";
    ctx.fillText(`Grant ${amount}${item.kind === "currency" ? " coins" : ""}`, x + 56, cardY + 29);
    ctx.font = "14px Trebuchet MS";
  }
}

function renderBossBar() {
  if (!state.boss) {
    return;
  }

  const width = 520;
  const x = canvas.width * 0.5 - width * 0.5;
  const y = 156;
  ctx.fillStyle = "rgba(8, 10, 18, 0.72)";
  ctx.fillRect(x, y, width, 28);
  renderHealthLine(x + 6, y + 7, width - 12, state.boss.health / state.boss.maxHealth, "#df4e58", 14);
  ctx.fillStyle = "#f7e9cf";
  ctx.font = "16px Trebuchet MS";
  ctx.textAlign = "center";
  const bossLabel = state.boss.kind === "forge-titan" || state.boss.kind === "ashen-behemoth"
    ? `${state.boss.name} [Armored] - ${Math.max(0, Math.ceil(state.boss.health))} HP`
    : `${state.boss.name} - ${Math.max(0, Math.ceil(state.boss.health))} HP`;
  ctx.fillText(bossLabel, canvas.width * 0.5, y + 19);
  ctx.textAlign = "left";
}

function renderNameplate(text, x, y, color) {
  ctx.font = "12px Trebuchet MS";
  const metrics = ctx.measureText(text);
  ctx.fillStyle = "rgba(7, 12, 20, 0.7)";
  ctx.fillRect(x - metrics.width * 0.5 - 8, y - 14, metrics.width + 16, 18);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function renderHealthLine(x, y, width, ratio, color, height = 8) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * clamp(ratio, 0, 1), height);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function drawTile(tile, x, y, tileX = null, tileY = null) {
  if (tile === Tile.DOOR_CLOSED_BOTTOM || tile === Tile.DOOR_CLOSED_TOP) {
    drawDoorTile(x, y, false, tile === Tile.DOOR_CLOSED_TOP);
    return;
  }
  if (tile === Tile.DOOR_OPEN_BOTTOM || tile === Tile.DOOR_OPEN_TOP) {
    drawDoorTile(x, y, true, tile === Tile.DOOR_OPEN_TOP);
    return;
  }
  if (tile === Tile.CLOUD) {
    ctx.fillStyle = "#f3fbff";
    ctx.fillRect(x, y + 2, TILE_SIZE, TILE_SIZE - 2);
    ctx.fillStyle = "#d7eef9";
    ctx.fillRect(x + 1, y + 4, TILE_SIZE - 2, TILE_SIZE - 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 3, y + 2, TILE_SIZE - 6, 3);
    ctx.fillRect(x + 2, y + 6, 4, 3);
    ctx.fillRect(x + TILE_SIZE - 6, y + 6, 4, 3);
    return;
  }
  if (tile === Tile.LAVA) {
    const level =
      tileX != null && tileY != null
        ? clamp(state.world.lavaLevel[tileIndex(tileX, tileY)] ?? 1, 0.08, 1)
        : 1;
    const fillHeight = Math.max(3, Math.round(TILE_SIZE * level));
    const topY = y + TILE_SIZE - fillHeight;
    ctx.fillStyle = "#842719";
    ctx.fillRect(x, topY, TILE_SIZE, fillHeight);
    ctx.fillStyle = "#d44a23";
    ctx.fillRect(x, topY + 1, TILE_SIZE, Math.max(1, fillHeight - 1));
    ctx.fillStyle = "#ff9b47";
    ctx.fillRect(x + 1, topY, TILE_SIZE - 2, Math.min(3, fillHeight));
    if (fillHeight > 6) {
      ctx.fillRect(x + 3, topY + Math.max(2, Math.floor(fillHeight * 0.45)), TILE_SIZE - 6, 2);
    }
    return;
  }
  const def = TILE_DEFS[tile];
  const sprite = def.asset ? assets[def.asset] : null;
  if (sprite) {
    if (tile === Tile.LEAVES || tile === Tile.TREE) {
      const drawX = x + (TILE_SIZE - sprite.width) * 0.5;
      const drawY = y + (TILE_SIZE - sprite.height) * 0.5;
      ctx.drawImage(sprite, drawX, drawY, sprite.width, sprite.height);
      return;
    }
    const drawRect = getContainedRect(sprite, x, y, TILE_SIZE, TILE_SIZE);
    ctx.drawImage(sprite, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
    return;
  }

  ctx.fillStyle = fallbackTileColor(tile);
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawDoorTile(x, y, open, topHalf) {
  ctx.fillStyle = "#7d552c";
  const insetX = open ? 10 : 3;
  const width = open ? 4 : 10;
  ctx.fillRect(x + insetX, y + 1, width, TILE_SIZE - 2);
  ctx.fillStyle = "#b88a4f";
  ctx.fillRect(x + insetX + 1, y + 2, Math.max(1, width - 2), TILE_SIZE - 4);
  ctx.fillStyle = "#5a3816";
  ctx.fillRect(x + insetX, y + 7, width, 1);
  if (!topHalf && !open) {
    ctx.fillStyle = "#f1d28c";
    ctx.fillRect(x + insetX + width - 2, y + 8, 1, 1);
  }
}

function drawWall(wall, x, y) {
  const assetKey = wall === Wall.WOOD ? "wall-wood" : wall === Wall.GRASS ? "wall-grass" : null;
  if (assetKey && assets[assetKey]) {
    ctx.globalAlpha = wall === Wall.GRASS ? 0.82 : 0.92;
    if (wall === Wall.GRASS) {
      const sprite = assets[assetKey];
      const drawX = x + (TILE_SIZE - sprite.width) * 0.5;
      const drawY = y + (TILE_SIZE - sprite.height) * 0.5;
      ctx.drawImage(sprite, drawX, drawY, sprite.width, sprite.height);
    } else {
      const drawRect = getContainedRect(assets[assetKey], x, y, TILE_SIZE, TILE_SIZE);
      ctx.drawImage(assets[assetKey], drawRect.x, drawRect.y, drawRect.w, drawRect.h);
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (wall === Wall.WOOD) {
    ctx.fillStyle = "#654524";
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = "rgba(181, 132, 74, 0.28)";
    ctx.fillRect(x + 2, y, 1, TILE_SIZE);
    ctx.fillRect(x + 8, y, 1, TILE_SIZE);
    ctx.fillRect(x + 13, y, 1, TILE_SIZE);
    ctx.fillStyle = "rgba(224, 182, 117, 0.14)";
    ctx.fillRect(x, y + 3, TILE_SIZE, 1);
    ctx.fillRect(x, y + 10, TILE_SIZE, 1);
    return;
  }

  if (wall === Wall.GRASS) {
    ctx.fillStyle = "rgba(72, 142, 58, 0.46)";
    ctx.fillRect(x + 5, y + 7, 2, 8);
    ctx.fillRect(x + 8, y + 4, 2, 11);
    ctx.fillRect(x + 11, y + 6, 2, 9);
    ctx.fillStyle = "rgba(121, 208, 95, 0.42)";
    ctx.fillRect(x + 4, y + 9, 1, 5);
    ctx.fillRect(x + 7, y + 5, 1, 8);
    ctx.fillRect(x + 10, y + 7, 1, 6);
    ctx.fillRect(x + 13, y + 8, 1, 5);
  }
}

function drawFlowerVariant(variant, x, y) {
  const stemX = x + 7 + ((variant - 1) % 2);
  const stemHeight = 5 + ((variant - 1) % 3);
  const blossomColors = [
    "#ff6b7a",
    "#ffd45e",
    "#8fe36a",
    "#7ed6ff",
    "#c98fff",
    "#ff9bd3",
    "#ff8f52",
    "#f2f5ff",
    "#9cf0d2",
    "#c6a16a",
  ];
  const accentColors = [
    "#ffe2a8",
    "#fff4b8",
    "#dfffbf",
    "#dff7ff",
    "#efe0ff",
    "#ffe5f4",
    "#ffd4b6",
    "#ffffff",
    "#e6fff7",
    "#f3e1b5",
  ];
  const blossom = blossomColors[(variant - 1) % blossomColors.length];
  const accent = accentColors[(variant - 1) % accentColors.length];

  ctx.fillStyle = "#5ca447";
  ctx.fillRect(stemX, y + TILE_SIZE - stemHeight - 1, 2, stemHeight + 1);
  ctx.fillStyle = "#79bf5b";
  ctx.fillRect(stemX - 1, y + TILE_SIZE - stemHeight + 1, 1, 2);
  ctx.fillRect(stemX + 2, y + TILE_SIZE - stemHeight + 2, 1, 2);

  const topY = y + TILE_SIZE - stemHeight - 3;
  switch (variant) {
    case 1:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 2, topY, 6, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY + 1, 2, 1);
      break;
    case 2:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 1, topY - 1, 4, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY, 2, 2);
      break;
    case 3:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 2, topY - 1, 2, 4);
      ctx.fillRect(stemX + 2, topY - 1, 2, 4);
      ctx.fillRect(stemX, topY, 2, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY + 1, 2, 1);
      break;
    case 4:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 2, topY, 6, 2);
      ctx.fillRect(stemX - 1, topY - 1, 4, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY, 2, 2);
      break;
    case 5:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 2, topY - 1, 6, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX - 1, topY, 4, 2);
      break;
    case 6:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 3, topY + 1, 8, 2);
      ctx.fillRect(stemX - 1, topY - 1, 4, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY + 1, 2, 2);
      break;
    case 7:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 2, topY, 2, 4);
      ctx.fillRect(stemX + 2, topY, 2, 4);
      ctx.fillRect(stemX, topY - 1, 2, 6);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY + 1, 2, 1);
      break;
    case 8:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 2, topY - 1, 6, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX - 1, topY, 4, 2);
      ctx.fillRect(stemX, topY + 2, 2, 1);
      break;
    case 9:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 3, topY + 1, 8, 2);
      ctx.fillRect(stemX - 2, topY - 1, 6, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY, 2, 2);
      break;
    case 10:
      ctx.fillStyle = blossom;
      ctx.fillRect(stemX - 1, topY - 2, 4, 6);
      ctx.fillRect(stemX - 3, topY, 8, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(stemX, topY - 1, 2, 2);
      break;
    default:
      break;
  }
}

function drawSprite(key, x, y, w, h, flipped = false, alpha = 1) {
  const image = assets[key];
  ctx.save();
  ctx.globalAlpha = alpha;
  const drawRect = image ? getContainedRect(image, x, y, w, h, "bottom") : { x, y, w, h };
  if (flipped) {
    ctx.translate(drawRect.x + drawRect.w, drawRect.y);
    ctx.scale(-1, 1);
    if (image) {
      ctx.drawImage(image, 0, 0, drawRect.w, drawRect.h);
    } else {
      ctx.fillStyle = "#f3ead8";
      ctx.fillRect(0, 0, drawRect.w, drawRect.h);
    }
  } else if (image) {
    ctx.drawImage(image, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
  } else {
    ctx.fillStyle = "#f3ead8";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawItemIcon(itemId, x, y, size) {
  const def = ITEM_DEFS[itemId];
  if (def?.asset && assets[def.asset]) {
    const drawRect = getContainedRect(assets[def.asset], x, y, size, size);
    ctx.drawImage(assets[def.asset], drawRect.x, drawRect.y, drawRect.w, drawRect.h);
    return;
  }

  if (itemId === "sword") {
    ctx.strokeStyle = "#f0d28f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + size - 6);
    ctx.lineTo(x + size - 4, y + 8);
    ctx.stroke();
    ctx.fillStyle = "#6f4b2f";
    ctx.fillRect(x + 4, y + size - 10, 10, 4);
    return;
  }

  if (itemId === "pickaxe") {
    ctx.strokeStyle = "#c88653";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + size - 4);
    ctx.lineTo(x + size - 6, y + 6);
    ctx.stroke();
    ctx.strokeStyle = "#bcc5cf";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 10);
    ctx.lineTo(x + size - 2, y + 6);
    ctx.stroke();
    return;
  }

  if (itemId === "bow") {
    ctx.strokeStyle = "#c88d59";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + size * 0.44, y + size * 0.5, size * 0.26, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    ctx.strokeStyle = "#e8e3d5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.43, y + 6);
    ctx.lineTo(x + size * 0.43, y + size - 6);
    ctx.stroke();
    ctx.fillStyle = "#d9d9d9";
    ctx.fillRect(x + size * 0.48, y + size * 0.18, 10, 2);
    ctx.fillStyle = "#f0d9a3";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.8, y + size * 0.22);
    ctx.lineTo(x + size * 0.98, y + size * 0.26);
    ctx.lineTo(x + size * 0.8, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (itemId === "gun") {
    ctx.fillStyle = "#59626d";
    ctx.fillRect(x + 7, y + 11, 17, 7);
    ctx.fillRect(x + 4, y + 12, 4, 5);
    ctx.fillStyle = "#bfc7d0";
    ctx.fillRect(x + 23, y + 12, 7, 1);
    ctx.fillRect(x + 23, y + 14, 7, 1);
    ctx.fillRect(x + 23, y + 16, 7, 1);
    ctx.fillStyle = "#4f3628";
    ctx.fillRect(x + 10, y + 17, 5, 9);
    ctx.fillStyle = "#d2a35e";
    ctx.fillRect(x + 5, y + 10, 2, 10);
    return;
  }

  if (itemId === "aeroRig") {
    ctx.strokeStyle = "#9eefff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + size - 8);
    ctx.lineTo(x + size * 0.5, y + 8);
    ctx.lineTo(x + size - 7, y + size - 8);
    ctx.stroke();
    ctx.fillStyle = "#f4f7ff";
    ctx.fillRect(x + size * 0.5 - 2, y + 6, 4, size - 12);
    ctx.fillStyle = "#9eefff";
    ctx.fillRect(x + 7, y + size - 10, size - 14, 4);
    return;
  }

  if (itemId === "cloudfang") {
    ctx.strokeStyle = "#eefbff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + size - 6);
    ctx.lineTo(x + size - 6, y + 8);
    ctx.stroke();
    ctx.fillStyle = "#9ed6ea";
    ctx.fillRect(x + 5, y + size - 10, 10, 4);
    ctx.fillRect(x + size - 10, y + 6, 4, 6);
    return;
  }

  if (itemId === "gustBow") {
    ctx.strokeStyle = "#d9f3ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + size * 0.42, y + size * 0.5, size * 0.25, -Math.PI * 0.62, Math.PI * 0.62);
    ctx.stroke();
    ctx.strokeStyle = "#f8fdff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.42, y + 6);
    ctx.lineTo(x + size * 0.42, y + size - 6);
    ctx.stroke();
    ctx.fillStyle = "#d8f0ff";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.56, y + size * 0.32);
    ctx.lineTo(x + size * 0.94, y + size * 0.5);
    ctx.lineTo(x + size * 0.56, y + size * 0.68);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (itemId === "sunshard") {
    ctx.fillStyle = "#fff0a3";
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + 4);
    ctx.lineTo(x + size - 7, y + size * 0.46);
    ctx.lineTo(x + size * 0.5, y + size - 4);
    ctx.lineTo(x + 6, y + size * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff9d8";
    ctx.fillRect(x + size * 0.5 - 2, y + 8, 4, size - 16);
    ctx.fillRect(x + 9, y + size * 0.46 - 2, size - 18, 4);
    return;
  }

  const item = ITEM_DEFS[itemId];
  if (!item || item.kind !== "block") {
    return;
  }

  const assetKey = TILE_DEFS[item.tile].asset;
  if (assetKey && assets[assetKey]) {
    const drawRect = getContainedRect(assets[assetKey], x, y, size, size);
    ctx.drawImage(assets[assetKey], drawRect.x, drawRect.y, drawRect.w, drawRect.h);
    return;
  }

  ctx.fillStyle = fallbackTileColor(item.tile);
  ctx.fillRect(x, y, size, size);
}

function renderFatal(error) {
  ctx.fillStyle = "#120d12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4d7c5";
  ctx.font = "24px Trebuchet MS";
  ctx.fillText("Russraria failed to boot.", 40, 70);
  ctx.font = "16px Trebuchet MS";
  wrapText(String(error), 40, 110, canvas.width - 80, 20, "#f4d7c5");
}

function renderLoading(text) {
  ctx.fillStyle = "#08101a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5ebd4";
  ctx.font = "28px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Russraria", canvas.width * 0.5, canvas.height * 0.5 - 12);
  ctx.font = "16px Trebuchet MS";
  ctx.fillStyle = "#9fc4d1";
  ctx.fillText(text, canvas.width * 0.5, canvas.height * 0.5 + 20);
  ctx.textAlign = "left";
}

function wrapText(text, x, y, maxWidth, lineHeight, color) {
  ctx.fillStyle = color;
  ctx.font = "14px Trebuchet MS";
  const words = text.split(" ");
  let line = "";
  let offsetY = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + offsetY);
      line = word;
      offsetY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, y + offsetY);
  }
}

function burstParticles(x, y, color, count, force) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * force;
    const life = 0.35 + Math.random() * 0.45;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - force * 0.35,
      ttl: life,
      life,
      size: 2 + Math.random() * 4,
      shrink: 6 + Math.random() * 3,
      color,
    });
  }
}

function getSkyLight() {
  const cycle = state.dayClock / DAY_LENGTH;
  const brightness = Math.sin(cycle * Math.PI * 2 - Math.PI * 0.5) * 0.5 + 0.5;
  return clamp(0.12 + brightness * 0.95, 0.12, 1);
}

function isNight() {
  return getSkyLight() < 0.34;
}

function fallbackTileColor(tile) {
  switch (tile) {
    case Tile.GRASS:
      return "#62b345";
    case Tile.DIRT:
      return "#714223";
    case Tile.STONE:
      return "#626973";
    case Tile.WOOD:
      return "#8f612f";
    case Tile.TREE_TRUNK:
      return "#8f612f";
    case Tile.LEAVES:
      return "#4f9440";
    case Tile.TREE:
      return "#4f9440";
    case Tile.TORCH:
      return "#f6bb52";
    case Tile.COPPER_ORE:
      return "#b26f43";
    case Tile.IRON_ORE:
      return "#8a919c";
    case Tile.CRYSTAL_ORE:
      return "#74d6ff";
    case Tile.FURNACE_TL:
    case Tile.FURNACE_TR:
    case Tile.FURNACE_BL:
    case Tile.FURNACE_BR:
      return "#d18f4b";
    case Tile.CLOUD:
      return "#eefaff";
    case Tile.DOOR_CLOSED_BOTTOM:
    case Tile.DOOR_CLOSED_TOP:
    case Tile.DOOR_OPEN_BOTTOM:
    case Tile.DOOR_OPEN_TOP:
      return "#8f612f";
    case Tile.PLATFORM:
      return "#a87443";
    case Tile.LAVA:
      return "#d04f25";
    default:
      return "#ffffff";
  }
}

function pickDustColor(tile) {
  switch (tile) {
    case Tile.GRASS:
      return "#77c85a";
    case Tile.DIRT:
      return "#8f6036";
    case Tile.STONE:
      return "#8c95a1";
    case Tile.WOOD:
      return "#bc8e57";
    case Tile.TREE_TRUNK:
      return "#bc8e57";
    case Tile.LEAVES:
      return "#79cd5f";
    case Tile.TREE:
      return "#79cd5f";
    case Tile.TORCH:
      return "#ffd86f";
    case Tile.COPPER_ORE:
      return "#d18e5a";
    case Tile.IRON_ORE:
      return "#c8d0da";
    case Tile.CRYSTAL_ORE:
      return "#9cecff";
    case Tile.FURNACE_TL:
    case Tile.FURNACE_TR:
    case Tile.FURNACE_BL:
    case Tile.FURNACE_BR:
      return "#ffb765";
    case Tile.CLOUD:
      return "#f3fbff";
    case Tile.DOOR_CLOSED_BOTTOM:
    case Tile.DOOR_CLOSED_TOP:
    case Tile.DOOR_OPEN_BOTTOM:
    case Tile.DOOR_OPEN_TOP:
      return "#bc8e57";
    case Tile.PLATFORM:
      return "#d1a16a";
    case Tile.LAVA:
      return "#ffb15f";
    default:
      return "#ffffff";
  }
}

function getTile(world, x, y) {
  if (x < 0 || x >= WORLD_WIDTH) {
    return Tile.STONE;
  }
  if (y < 0) {
    return Tile.AIR;
  }
  if (y >= WORLD_HEIGHT) {
    return Tile.STONE;
  }
  return world.tiles[tileIndex(x, y)];
}

function getWall(world, x, y) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return Wall.NONE;
  }
  return world.walls[tileIndex(x, y)];
}

function getFlower(world, x, y) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return 0;
  }
  return world.flowers[tileIndex(x, y)] ?? 0;
}

function setTile(world, x, y, tile) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return;
  }
  const index = tileIndex(x, y);
  world.tiles[index] = tile;
  if (tile !== Tile.LAVA && world.lavaLevel[index] > 0) {
    world.lavaLevel[index] = 0;
    world.lavaSource[index] = 0;
  }
}

function setWall(world, x, y, wall) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return;
  }
  world.walls[tileIndex(x, y)] = wall;
}

function setFlower(world, x, y, flower) {
  if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) {
    return;
  }
  world.flowers[tileIndex(x, y)] = flower;
}

function destroyFlower(x, y, options = {}) {
  const flower = getFlower(state.world, x, y);
  if (flower <= 0) {
    return false;
  }
  setFlower(state.world, x, y, 0);
  if (!options.silent) {
    burstParticles((x + 0.5) * TILE_SIZE, (y + 0.7) * TILE_SIZE, "#98df7d", 5, 28);
  }
  return true;
}

function tileIndex(x, y) {
  return x + y * WORLD_WIDTH;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getBossContactBox(boss) {
  let insetX = 10;
  let insetTop = 8;
  let insetBottom = 6;

  switch (boss.kind) {
    case "overseer-eye":
      insetX = 12;
      insetTop = 12;
      insetBottom = 12;
      break;
    case "stone-warden":
      insetX = 12;
      insetTop = 14;
      insetBottom = 4;
      break;
    case "sand-djinn":
      insetX = 12;
      insetTop = 12;
      insetBottom = 8;
      break;
    case "crystal-queen":
      insetX = 12;
      insetTop = 12;
      insetBottom = 8;
      break;
    case "forge-titan":
      insetX = 14;
      insetTop = 16;
      insetBottom = 4;
      break;
    case "thunder-roc":
      insetX = 16;
      insetTop = 12;
      insetBottom = 10;
      break;
    case "ashen-behemoth":
      insetX = 14;
      insetTop = 16;
      insetBottom = 4;
      break;
    case "storm-hydra":
      insetX = 16;
      insetTop = 12;
      insetBottom = 10;
      break;
    case "moonlit-empress":
      insetX = 12;
      insetTop = 12;
      insetBottom = 8;
      break;
    case "grave-sovereign":
      insetX = 12;
      insetTop = 14;
      insetBottom = 4;
      break;
    case "abyss-herald":
      insetX = 12;
      insetTop = 12;
      insetBottom = 12;
      break;
    case "crypt-matriarch":
      insetX = 12;
      insetTop = 12;
      insetBottom = 4;
      break;
    case "void-seraph":
      insetX = 14;
      insetTop = 12;
      insetBottom = 10;
      break;
    default:
      break;
  }

  return {
    x: boss.x + insetX,
    y: boss.y + insetTop,
    w: Math.max(12, boss.w - insetX * 2),
    h: Math.max(12, boss.h - insetTop - insetBottom),
  };
}

function bossTouchesPlayer(boss) {
  return overlaps(state.player, getBossContactBox(boss));
}

function playerIsNearBossGroundImpact(boss, horizontalRange, verticalRange = 30) {
  const playerCenterX = state.player.x + state.player.w * 0.5;
  const bossCenterX = boss.x + boss.w * 0.5;
  const playerFeetY = state.player.y + state.player.h;
  const bossFeetY = boss.y + boss.h;
  return Math.abs(playerCenterX - bossCenterX) < horizontalRange && Math.abs(playerFeetY - bossFeetY) <= verticalRange;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function circleRectCollision(cx, cy, radius, rect) {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function getContainedRect(image, x, y, w, h, verticalAlign = "center") {
  const scale = Math.min(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const drawX = x + (w - drawW) * 0.5;
  const drawY = verticalAlign === "bottom" ? y + h - drawH : y + (h - drawH) * 0.5;
  return { x: drawX, y: drawY, w: drawW, h: drawH };
}

function mixColor(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function rgb(parts) {
  return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundEven(value) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function approach(current, target, delta) {
  if (current < target) {
    return Math.min(current + delta, target);
  }
  return Math.max(current - delta, target);
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
