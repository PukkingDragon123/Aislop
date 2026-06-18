// ============================================================================
//  AI SLOP.CO — game balance & content data
// ----------------------------------------------------------------------------
//  Everything that defines "what the game contains" lives here as plain data
//  so balance can be tuned without touching systems. Colours are shared by the
//  3D world (meshes) and the DOM UI (cards) so departments feel coherent.
// ============================================================================

// Palette — warm, clean, "cozy Japanese mobile game" vibe.
export const PALETTE = {
  floor: 0xf3ece1,
  floorAlt: 0xe9dfcf,
  wall: 0xfbf6ee,
  wallTrim: 0xd9cab4,
  rug: 0xb8d8d0,
  accent: 0x6c8cff,
};

// Desk upgrade ladder — shared by every department. Each tier multiplies the
// per-worker output and swaps the 3D workstation model + glow.
export const DESK_TIERS = [
  { name: 'Folding Desk',           desc: 'A laptop on a wobbly table. Humble beginnings.', mult: 1,   color: 0xcdb89a, glow: 0x000000, costMult: 0 },
  { name: 'Dual-Monitor Station',   desc: 'Two screens. Productivity doubles, posture halves.', mult: 2.6, color: 0x8aa0c8, glow: 0x223355, costMult: 1 },
  { name: 'Premium Creator Setup',  desc: 'RGB everything and a very serious microphone.',  mult: 6.5, color: 0x9c7bd6, glow: 0x6a3fb0, costMult: 1 },
  { name: 'Futuristic AI Station',  desc: 'The desk thinks for itself now.',                 mult: 16,  color: 0x49c5d6, glow: 0x16a7c0, costMult: 1 },
  { name: 'Holographic Office',     desc: 'Pure light and ambition. No desk required.',      mult: 42,  color: 0x66f2ff, glow: 0x33e0ff, costMult: 1 },
];

// The production pipeline. Order matters — each stage consumes the previous
// stage's buffer and feeds the next. Balancing staff across these five stages
// IS the core optimisation game.
export const DEPARTMENTS = [
  {
    id: 'trends', name: 'Trend Lab', role: 'Trend Hunter', icon: '🔮',
    color: 0xffb347, uiColor: '#ffae42',
    desc: 'Hunts viral trends before they trend. Feeds raw ideas into the company.',
    consumes: null, produces: 'idea',
    baseRate: 0.55, baseHireCost: 18, hireGrowth: 1.16,
    titles: ['Trend Hunter', 'Trend Scout', 'Culture Analyst'],
  },
  {
    id: 'creation', name: 'Creation Bay', role: 'Content Creator', icon: '✨',
    color: 0xff6f91, uiColor: '#ff6f91',
    desc: 'Prompt engineers and creators turn ideas into raw AI content.',
    consumes: 'idea', produces: 'raw',
    baseRate: 0.55, baseHireCost: 22, hireGrowth: 1.16,
    titles: ['Content Creator', 'Prompt Engineer', 'Game Developer', 'Music Producer', 'Website Designer'],
  },
  {
    id: 'editing', name: 'Edit Suite', role: 'Editor', icon: '🎬',
    color: 0x7bdff2, uiColor: '#56cfe1',
    desc: 'Editors polish raw slop into something almost watchable.',
    consumes: 'raw', produces: 'polished',
    baseRate: 0.55, baseHireCost: 26, hireGrowth: 1.16,
    titles: ['Video Editor', 'Audio Engineer', 'QA Specialist'],
  },
  {
    id: 'publishing', name: 'Upload Hub', role: 'Publisher', icon: '🚀',
    color: 0x9bf6a0, uiColor: '#74d680',
    desc: 'The upload team ships polished content to every platform at once.',
    consumes: 'polished', produces: 'published',
    baseRate: 0.55, baseHireCost: 30, hireGrowth: 1.16,
    titles: ['Upload Specialist', 'Platform Manager', 'Release Coordinator'],
  },
  {
    id: 'marketing', name: 'Growth Floor', role: 'Marketer', icon: '📣',
    color: 0xc3a6ff, uiColor: '#b18cff',
    desc: 'Marketers push published content into feeds, earning cash & followers.',
    consumes: 'published', produces: null, // converts to money + followers
    baseRate: 0.55, baseHireCost: 34, hireGrowth: 1.16,
    titles: ['Marketing Specialist', 'Growth Hacker', 'Community Manager'],
  },
];

export const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));

// Resources that flow between stages (for buffers + UI labels).
export const RESOURCES = ['idea', 'raw', 'polished', 'published'];
export const RESOURCE_LABEL = { idea: 'Ideas', raw: 'Raw', polished: 'Polished', published: 'Ready' };

// Unlockable AI product lines. Each adds a permanent global revenue multiplier
// and a follower multiplier, and shows up on the big lobby screen. Unlocked by
// reaching follower milestones, then bought with cash.
export const PRODUCTS = [
  { id: 'videos',  name: 'AI Videos',     icon: '🎞️', cost: 0,        followerReq: 0,       revMult: 1.00, folMult: 1.00, blurb: 'Short-form slop that prints money.' },
  { id: 'songs',   name: 'AI Songs',      icon: '🎵', cost: 350,      followerReq: 200,     revMult: 0.35, folMult: 0.30, blurb: 'Lo-fi beats to optimise workflows to.' },
  { id: 'ads',     name: 'AI Ads',        icon: '📺', cost: 1500,     followerReq: 1200,    revMult: 0.55, folMult: 0.15, blurb: 'Sponsors love a captive audience.' },
  { id: 'websites',name: 'AI Websites',   icon: '🌐', cost: 9000,     followerReq: 6000,    revMult: 0.65, folMult: 0.25, blurb: 'Landing pages that land.' },
  { id: 'study',   name: 'AI Study Tools',icon: '📚', cost: 60000,    followerReq: 30000,   revMult: 0.80, folMult: 0.45, blurb: 'Students will pay anything.' },
  { id: 'games',   name: 'AI Games',      icon: '🎮', cost: 450000,   followerReq: 180000,  revMult: 1.10, folMult: 0.60, blurb: 'Infinite procedurally-generated fun.' },
  { id: 'apps',    name: 'AI Apps',       icon: '📱', cost: 4000000,  followerReq: 1200000, revMult: 1.50, folMult: 0.80, blurb: 'There is an AI app for that.' },
];

// Placeable decorations. Provide a small global "morale" bonus (which scales
// every department's output) and pure visual variety.
export const DECORATIONS = [
  { id: 'plant',    name: 'Potted Plant',    icon: '🪴', cost: 40,      morale: 0.02, desc: '+2% morale. Photosynthesises productivity.' },
  { id: 'poster',   name: 'Motiv. Poster',   icon: '🖼️', cost: 90,      morale: 0.025, desc: '+2.5% morale. "HUSTLE", but make it AI.' },
  { id: 'coffee',   name: 'Coffee Machine',  icon: '☕', cost: 250,     morale: 0.05, desc: '+5% morale. The true engine of the company.' },
  { id: 'vending',  name: 'Vending Machine', icon: '🥤', cost: 600,     morale: 0.06, desc: '+6% morale. Snacks fuel the slop.' },
  { id: 'sofa',     name: 'Lounge Sofa',     icon: '🛋️', cost: 1400,    morale: 0.08, desc: '+8% morale. A place to "ideate".' },
  { id: 'arcade',   name: 'Gaming Corner',   icon: '🕹️', cost: 4500,    morale: 0.11, desc: '+11% morale. Definitely team-building.' },
  { id: 'art',      name: 'Art Display',     icon: '🎨', cost: 14000,   morale: 0.14, desc: '+14% morale. AI-generated, naturally.' },
  { id: 'mascot',   name: 'AI Mascot Statue',icon: '🗿', cost: 60000,   morale: 0.20, desc: '+20% morale. It watches. It judges.' },
  { id: 'server',   name: 'Server Display',  icon: '🖥️', cost: 240000,  morale: 0.26, desc: '+26% morale. Blinky lights = trust.' },
  { id: 'core',     name: 'AI Core',         icon: '🌌', cost: 1500000, morale: 0.40, desc: '+40% morale. The heart of the company hums.' },
];

// Office expansion levels — bigger footprint, more desk capacity, new identity.
// gridW/gridH define the usable floor in tiles; capacity caps total desks.
export const OFFICE_LEVELS = [
  { name: 'Garage Startup',  gridW: 8,  gridH: 8,  capacity: 8,   cost: 0 },
  { name: 'Small Office',    gridW: 10, gridH: 10, capacity: 16,  cost: 500 },
  { name: 'Open-Plan Floor', gridW: 13, gridH: 12, capacity: 30,  cost: 8000 },
  { name: 'Full Floor',      gridW: 16, gridH: 14, capacity: 50,  cost: 120000 },
  { name: 'AI Headquarters', gridW: 20, gridH: 16, capacity: 80,  cost: 2500000 },
  { name: 'AI Mega-Campus',  gridW: 24, gridH: 20, capacity: 130, cost: 50000000 },
];

// Global upgrades. Each is leveled; cost grows geometrically. `effect` is a
// pure function of level returning a descriptor the sim reads.
export const UPGRADES = [
  {
    id: 'hr', name: 'HR & Perks Program', icon: '🧑‍💼',
    desc: 'Happier staff work faster. +8% global efficiency per level.',
    baseCost: 120, growth: 1.9, max: 25,
    apply: (lvl, m) => { m.efficiency *= 1 + 0.08 * lvl; },
  },
  {
    id: 'research', name: 'Research Lab', icon: '🔬',
    desc: 'Researchers raise content quality. +12% value per published piece per level.',
    baseCost: 200, growth: 2.0, max: 25,
    apply: (lvl, m) => { m.value *= 1 + 0.12 * lvl; },
  },
  {
    id: 'cloud', name: 'Cloud Servers', icon: '☁️',
    desc: 'More compute = bigger pipeline buffers, smoothing bottlenecks. +50% buffer/level.',
    baseCost: 300, growth: 1.85, max: 20,
    apply: (lvl, m) => { m.buffer *= 1 + 0.5 * lvl; },
  },
  {
    id: 'brand', name: 'Brand Reputation', icon: '⭐',
    desc: 'A trusted brand goes viral more often. +1.5% viral chance per level.',
    baseCost: 500, growth: 2.1, max: 20,
    apply: (lvl, m) => { m.viralChance += 0.015 * lvl; },
  },
  {
    id: 'algo', name: 'Algorithm Hacking', icon: '📈',
    desc: 'Game the recommendation feeds. +15% follower gain per level.',
    baseCost: 800, growth: 2.05, max: 20,
    apply: (lvl, m) => { m.followers *= 1 + 0.15 * lvl; },
  },
  {
    id: 'sponsor', name: 'Sponsorship Deals', icon: '🤝',
    desc: 'Partnership managers land sponsors. Passive cash = 4% of revenue/sec per level.',
    baseCost: 1500, growth: 2.2, max: 20,
    apply: (lvl, m) => { m.sponsor += 0.04 * lvl; },
  },
];

// Follower milestones — fire celebrations + flavour, and gate product unlocks.
export const MILESTONES = [
  { at: 100,        label: 'First 100 followers!', blurb: 'Your mum and 99 bots are watching.' },
  { at: 1000,       label: '1K followers',         blurb: 'A real audience. Sort of.' },
  { at: 10000,      label: '10K — verified-ish',   blurb: 'The algorithm has noticed you.' },
  { at: 100000,     label: '100K subscribers',     blurb: 'Brands are sliding into your DMs.' },
  { at: 1000000,    label: '1 MILLION',            blurb: 'You are officially an influence-corp.' },
  { at: 10000000,   label: '10M empire',           blurb: 'Small countries envy your reach.' },
  { at: 100000000,  label: '100M — global slop',   blurb: 'The feed is mostly you now.' },
  { at: 1000000000, label: '1 BILLION',            blurb: 'The world runs on your content.' },
];

// Economy tuning constants.
export const ECON = {
  baseValue: 0.6,        // $ per published piece reaching audience (before mults)
  baseFollowers: 0.4,    // followers per published piece
  baseBuffer: 12,        // base buffer capacity per stage (units)
  audienceBonus: 0.06,   // revenue mult contribution: 1 + audienceBonus*log10(1+followers)
  viralBaseChance: 0.012,// per-second base chance of a viral spike
  viralDuration: 6,      // seconds a viral spike lasts
  viralMultiplier: 14,   // output multiplier during a viral spike
  offlineCap: 8 * 3600,  // max seconds of offline progress credited
  offlineRate: 0.5,      // offline earns 50% of online rate
  saveInterval: 5,       // seconds between autosaves
  // --- Brainrot / Fusion / Trend economy ---
  hypePerPiece: 0.06,    // Hype currency earned per published piece
  fusionBaseCost: 30,    // Hype cost of the first fusion
  fusionGrowth: 1.11,    // fusion cost growth per fusion performed
  dupeRefund: 0.45,      // fraction of cost refunded when a fusion is a duplicate
  undiscoveredBias: 0.62,// chance a fusion is biased toward an undiscovered character
  trendInterval: 140,    // seconds a character stays "trending"
};

// ============================================================================
//  BRAINROT — the collectible Italian-brainrot characters.
//  Fuse Hype in the Meme Lab to discover these; each discovered character adds
//  a permanent compounding global multiplier, and any character can "trend".
// ============================================================================
export const RARITIES = {
  common:    { name: 'Common',    weight: 48, collectMult: 0.03, trendMult: 0.25, color: '#9aa6c0' },
  rare:      { name: 'Rare',      weight: 27, collectMult: 0.07, trendMult: 0.40, color: '#4fa3ff' },
  epic:      { name: 'Epic',      weight: 15, collectMult: 0.15, trendMult: 0.60, color: '#b06bff' },
  legendary: { name: 'Legendary', weight: 8,  collectMult: 0.35, trendMult: 1.00, color: '#ffb02e' },
  mythic:    { name: 'Mythic',    weight: 2,  collectMult: 0.90, trendMult: 2.00, color: '#ff4d8d' },
};

export const ROSTER = [
  { id: 'chimpanzini', name: 'Chimpanzini Bananini', emoji: ['🐵', '🍌'], rarity: 'common',    blurb: 'Banana that went bananas.' },
  { id: 'frigo',       name: 'Frigo Camelo',          emoji: ['🧊', '🐫'], rarity: 'common',    blurb: 'A fridge with humps. Stays cool under pressure.' },
  { id: 'tractoro',    name: 'Trattoro Tractoro',     emoji: ['🚜', '🐙'], rarity: 'common',    blurb: 'Octopus tractor. Plows straight through the feed.' },
  { id: 'pufferini',   name: 'Pufferini Robloxini',   emoji: ['🐡', '🎮'], rarity: 'common',    blurb: 'A Roblox pufferfish. Oof, ouch, owie.' },
  { id: 'tungtung',    name: 'Tung Tung Tung Sahur',  emoji: ['🪵', '🥢'], rarity: 'rare',      blurb: 'A wooden log that will find you at 3am.' },
  { id: 'brrbrr',      name: 'Brr Brr Patapim',       emoji: ['🐵', '🌳'], rarity: 'rare',      blurb: 'Half monkey, half tree, fully unhinged.' },
  { id: 'trippi',      name: 'Trippi Troppi',         emoji: ['🐱', '🦐'], rarity: 'rare',      blurb: 'Cat-shrimp hybrid. Please do not ask.' },
  { id: 'boneca',      name: 'Boneca Ambalabu',       emoji: ['🐸', '🛞'], rarity: 'rare',      blurb: 'Frog riding a tire. Rolls extremely deep.' },
  { id: 'tralalero',   name: 'Tralalero Tralala',     emoji: ['🦈', '👟'], rarity: 'epic',      blurb: 'Three-shoed shark. Outruns the algorithm.' },
  { id: 'ballerina',   name: 'Ballerina Cappuccina',  emoji: ['🩰', '☕'], rarity: 'epic',      blurb: 'Pirouettes powered entirely by espresso.' },
  { id: 'lirili',      name: 'Lirilì Larilà',         emoji: ['🌵', '🐘'], rarity: 'epic',      blurb: 'Cactus elephant. Time is merely a suggestion.' },
  { id: 'cappuccino',  name: 'Cappuccino Assassino',  emoji: ['☕', '🥷'], rarity: 'epic',      blurb: 'Silent. Caffeinated. Absolutely lethal.' },
  { id: 'glorbo',      name: 'Glorbo Fruttodrillo',   emoji: ['🍉', '🐊'], rarity: 'epic',      blurb: 'Watermelon crocodile. The juiciest bite.' },
  { id: 'bombardiro',  name: 'Bombardiro Crocodilo',  emoji: ['🐊', '✈️'], rarity: 'legendary', blurb: 'Crocodile bomber. Cannot be reasoned with.' },
  { id: 'bombombini',  name: 'Bombombini Gusini',     emoji: ['🪿', '✈️'], rarity: 'legendary', blurb: 'Goose jet. Honks in sonic booms.' },
  { id: 'spioniro',    name: 'Spioniro Golubiro',     emoji: ['🕊️', '📷'], rarity: 'legendary', blurb: 'Spy pigeon. Is definitely watching you.' },
  { id: 'girafa',      name: 'Girafa Celestre',       emoji: ['🦒', '🌌'], rarity: 'mythic',    blurb: 'Cosmic giraffe. Sees every timeline at once.' },
  { id: 'orcalero',    name: 'Orcalero Orcala',       emoji: ['🐋', '🎧'], rarity: 'mythic',    blurb: 'DJ orca. Drops beats and entire ships.' },
];

export const ROSTER_BY_ID = Object.fromEntries(ROSTER.map((c) => [c.id, c]));
