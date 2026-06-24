// ============================================================================
//  AI SLOP.CO — balance & content data (focused build: Tycoon · Build · Collect)
// ----------------------------------------------------------------------------
//  Three pillars only:
//   • Tycoon — your office earns money & followers over time.
//   • Build  — hire staff, upgrade desks, decorate, expand the office.
//   • Collect— "Brainrot Search" pulls 3 random characters; duplicates level
//              them up; your collection multiplies all income.
// ============================================================================

export const PALETTE = {
  floor: 0xf3ece1, floorAlt: 0xe9dfcf, wall: 0xfbf6ee, wallTrim: 0xd9cab4,
  rug: 0xb8d8d0, accent: 0x6c8cff,
};

// Desk upgrade ladder — multiplies a department's income and swaps the model.
export const DESK_TIERS = [
  { name: 'Folding Desk',          desc: 'A laptop on a wobbly table. Humble beginnings.', mult: 1,   color: 0xcdb89a, glow: 0x000000 },
  { name: 'Dual-Monitor Station',  desc: 'Two screens. Output doubles, posture halves.',   mult: 2.6, color: 0x8aa0c8, glow: 0x223355 },
  { name: 'Premium Creator Setup', desc: 'RGB everything and a very serious microphone.',  mult: 6.5, color: 0x9c7bd6, glow: 0x6a3fb0 },
  { name: 'Futuristic AI Station', desc: 'The desk thinks for itself now.',                 mult: 16,  color: 0x49c5d6, glow: 0x16a7c0 },
  { name: 'Holographic Office',    desc: 'Pure light and ambition. No desk required.',      mult: 42,  color: 0x66f2ff, glow: 0x33e0ff },
];

// Departments are now simple income "buildings" you staff & upgrade — no
// pipeline to juggle. Each staffed desk just produces income.
export const DEPARTMENTS = [
  { id: 'creation',   name: 'Creation Bay', role: 'Content Creator', icon: '✨', color: 0xff6f91, uiColor: '#ff6f91', unlockLevel: 0,
    desc: 'Creators churn out raw AI content all day.', baseRate: 0.7, baseHireCost: 24, hireGrowth: 1.16,
    titles: ['Content Creator', 'Prompt Engineer', 'Game Developer', 'Music Producer', 'Website Designer'] },
  { id: 'trends',     name: 'Trend Lab',    role: 'Trend Hunter', icon: '🔮', color: 0xffb347, uiColor: '#ffae42', unlockLevel: 1,
    desc: 'Scouts spot what the feed wants next.', baseRate: 0.6, baseHireCost: 18, hireGrowth: 1.16,
    titles: ['Trend Hunter', 'Trend Scout', 'Culture Analyst'] },
  { id: 'editing',    name: 'Edit Suite',   role: 'Editor', icon: '🎬', color: 0x7bdff2, uiColor: '#56cfe1', unlockLevel: 3,
    desc: 'Editors polish slop into something watchable.', baseRate: 0.65, baseHireCost: 30, hireGrowth: 1.16,
    titles: ['Video Editor', 'Audio Engineer', 'QA Specialist'] },
  { id: 'publishing', name: 'Upload Hub',   role: 'Publisher', icon: '🚀', color: 0x9bf6a0, uiColor: '#74d680', unlockLevel: 5,
    desc: 'The upload team ships to every platform at once.', baseRate: 0.6, baseHireCost: 38, hireGrowth: 1.16,
    titles: ['Upload Specialist', 'Platform Manager', 'Release Coordinator'] },
  { id: 'marketing',  name: 'Growth Floor', role: 'Marketer', icon: '📣', color: 0xc3a6ff, uiColor: '#b18cff', unlockLevel: 8,
    desc: 'Marketers push content into millions of feeds.', baseRate: 0.8, baseHireCost: 46, hireGrowth: 1.16,
    titles: ['Marketing Specialist', 'Growth Hacker', 'Community Manager'] },
];
export const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));

// Placeable decorations → morale → a global income multiplier + visual variety.
export const DECORATIONS = [
  { id: 'plant',    name: 'Potted Plant',    icon: '🪴', cost: 40,      morale: 0.02, desc: '+2% income. Photosynthesises productivity.' },
  { id: 'poster',   name: 'Motiv. Poster',   icon: '🖼️', cost: 90,      morale: 0.025, desc: '+2.5% income. "HUSTLE", but make it AI.' },
  { id: 'coffee',   name: 'Coffee Machine',  icon: '☕', cost: 250,     morale: 0.05, desc: '+5% income. The true engine of the company.' },
  { id: 'food',     name: 'Snack Bar',       icon: '🍔', cost: 700,     morale: 0.07, desc: '+7% income. Employees wander over for a bite.' },
  { id: 'vending',  name: 'Vending Machine', icon: '🥤', cost: 600,     morale: 0.06, desc: '+6% income. Snacks fuel the slop.' },
  { id: 'janitor',  name: 'Janitor Bot',     icon: '🧹', cost: 3000,    morale: 0.04, janitor: true, cleanEvery: 7, desc: 'Auto-sweeps trash off the floor. Trash drags your income down — keep it clean!' },
  { id: 'printer',  name: 'Cash Printer',    icon: '🖨️', cost: 1200,    morale: 0.0,  coinPerSec: 5, desc: 'Prints flat coins/sec — scales with your company level.' },
  { id: 'billboard',name: 'Hype Billboard',  icon: '📢', cost: 5000,    morale: 0.03, folMult: 0.25, desc: '+25% follower gain (and a little morale).' },
  { id: 'whip',     name: 'Bully-Bot 3000',  icon: '🥊', cost: 1800,    morale: 0.05, chaos: true, desc: 'Whips nearby employees into shape. Tap it to bully them.' },
  { id: 'sofa',     name: 'Lounge Sofa',     icon: '🛋️', cost: 1400,    morale: 0.08, desc: '+8% income. A place to "ideate".' },
  { id: 'arcade',   name: 'Gaming Corner',   icon: '🕹️', cost: 4500,    morale: 0.11, desc: '+11% income. Definitely team-building.' },
  { id: 'dino',     name: 'Office Dino',     icon: '🦖', cost: 9000,    morale: 0.10, chaos: true, desc: 'A T-Rex that stomps around. Tap to make it ROAR.' },
  { id: 'art',      name: 'Art Display',     icon: '🎨', cost: 14000,   morale: 0.14, desc: '+14% income. AI-generated, naturally.' },
  { id: 'tnt',      name: 'TNT Crate',       icon: '🧨', cost: 30000,   morale: 0.12, chaos: true, desc: 'Tap to detonate and send everyone flying. Harmless! Probably.' },
  { id: 'mascot',   name: 'AI Mascot Statue',icon: '🗿', cost: 60000,   morale: 0.20, desc: '+20% income. It watches. It judges.' },
  { id: 'server',   name: 'Server Display',  icon: '🖥️', cost: 240000,  morale: 0.26, desc: '+26% income. Blinky lights = trust.' },
  { id: 'core',     name: 'AI Core',         icon: '🌌', cost: 1500000, morale: 0.40, desc: '+40% income. The heart of the company hums.' },
];

// Office expansion — bigger footprint, more desk capacity, new identity.
export const OFFICE_LEVELS = [
  { name: 'Garage Startup',  gridW: 8,  gridH: 8,  capacity: 8,   cost: 0 },
  { name: 'Small Office',    gridW: 10, gridH: 10, capacity: 16,  cost: 650 },
  { name: 'Open-Plan Floor', gridW: 13, gridH: 12, capacity: 30,  cost: 12000 },
  { name: 'Full Floor',      gridW: 16, gridH: 14, capacity: 50,  cost: 180000 },
  { name: 'AI Headquarters', gridW: 20, gridH: 16, capacity: 80,  cost: 4000000 },
  { name: 'AI Mega-Campus',  gridW: 24, gridH: 20, capacity: 130, cost: 80000000 },
];

// Follower milestones — celebratory moments.
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

// ----------------------------------------------------------------------------
//  COLLECT — brainrot characters. Search pulls them; duplicates raise `level`;
//  each owned character multiplies income by (1 + collectMult × level).
//  `img` is an optional image URL (e.g. a Higgsfield render). When empty, the
//  game draws charming procedural art instead — drop a URL in to use real art.
// ----------------------------------------------------------------------------
export const RARITIES = {
  common:    { name: 'Common',    weight: 50,  income: 0.6,  color: '#9aa6c0', glow: '#cdd6e6' },
  rare:      { name: 'Rare',      weight: 26,  income: 2.2,  color: '#4fa3ff', glow: '#9fd0ff' },
  epic:      { name: 'Epic',      weight: 15,  income: 9,    color: '#b06bff', glow: '#d9b6ff' },
  legendary: { name: 'Legendary', weight: 7,   income: 42,   color: '#ffb02e', glow: '#ffd98a' },
  mythic:    { name: 'Mythic',    weight: 2,   income: 200,  color: '#ff4d8d', glow: '#ff9ec4' },
  gold:      { name: 'Gold',      weight: 0.8, income: 900,  color: '#ffcf33', glow: '#fff0a8' },
  diamond:   { name: 'Diamond',   weight: 0.3, income: 4200, color: '#7be0ff', glow: '#d6f7ff' },
};

export const ROSTER = [
  { id: 'chimpanzini', name: 'Chimpanzini Bananini', emoji: ['🐵', '🍌'], rarity: 'common',    img: '', blurb: 'Banana that went bananas.' },
  { id: 'frigo',       name: 'Frigo Camelo',          emoji: ['🧊', '🐫'], rarity: 'common',    img: '', blurb: 'A fridge with humps. Stays cool under pressure.' },
  { id: 'tractoro',    name: 'Trattoro Tractoro',     emoji: ['🚜', '🐙'], rarity: 'common',    img: '', blurb: 'Octopus tractor. Plows straight through the feed.' },
  { id: 'pufferini',   name: 'Pufferini Robloxini',   emoji: ['🐡', '🎮'], rarity: 'common',    img: '', blurb: 'A Roblox pufferfish. Oof, ouch, owie.' },
  { id: 'tungtung',    name: 'Tung Tung Tung Sahur',  emoji: ['🪵', '🥢'], rarity: 'rare',      img: '', blurb: 'A wooden log that will find you at 3am.' },
  { id: 'brrbrr',      name: 'Brr Brr Patapim',       emoji: ['🐵', '🌳'], rarity: 'rare',      img: '', blurb: 'Half monkey, half tree, fully unhinged.' },
  { id: 'trippi',      name: 'Trippi Troppi',         emoji: ['🐱', '🦐'], rarity: 'rare',      img: '', blurb: 'Cat-shrimp hybrid. Please do not ask.' },
  { id: 'boneca',      name: 'Boneca Ambalabu',       emoji: ['🐸', '🛞'], rarity: 'rare',      img: '', blurb: 'Frog riding a tire. Rolls extremely deep.' },
  { id: 'tralalero',   name: 'Tralalero Tralala',     emoji: ['🦈', '👟'], rarity: 'epic',      img: '', blurb: 'Three-shoed shark. Outruns the algorithm.' },
  { id: 'ballerina',   name: 'Ballerina Cappuccina',  emoji: ['🩰', '☕'], rarity: 'epic',      img: '', blurb: 'Pirouettes powered entirely by espresso.' },
  { id: 'lirili',      name: 'Lirilì Larilà',         emoji: ['🌵', '🐘'], rarity: 'epic',      img: '', blurb: 'Cactus elephant. Time is merely a suggestion.' },
  { id: 'cappuccino',  name: 'Cappuccino Assassino',  emoji: ['☕', '🥷'], rarity: 'epic',      img: '', blurb: 'Silent. Caffeinated. Absolutely lethal.' },
  { id: 'glorbo',      name: 'Glorbo Fruttodrillo',   emoji: ['🍉', '🐊'], rarity: 'epic',      img: '', blurb: 'Watermelon crocodile. The juiciest bite.' },
  { id: 'bombardiro',  name: 'Bombardiro Crocodilo',  emoji: ['🐊', '✈️'], rarity: 'legendary', img: '', blurb: 'Crocodile bomber. Cannot be reasoned with.' },
  { id: 'bombombini',  name: 'Bombombini Gusini',     emoji: ['🪿', '✈️'], rarity: 'legendary', img: '', blurb: 'Goose jet. Honks in sonic booms.' },
  { id: 'spioniro',    name: 'Spioniro Golubiro',     emoji: ['🕊️', '📷'], rarity: 'legendary', img: '', blurb: 'Spy pigeon. Is definitely watching you.' },
  { id: 'girafa',      name: 'Girafa Celestre',       emoji: ['🦒', '🌌'], rarity: 'mythic',    img: '', blurb: 'Cosmic giraffe. Sees every timeline at once.' },
  { id: 'orcalero',    name: 'Orcalero Orcala',       emoji: ['🐋', '🎧'], rarity: 'mythic',    img: '', blurb: 'DJ orca. Drops beats and entire ships.' },

  // ---- expansion pack: a whole lot more brainrots --------------------------
  { id: 'bananito',    name: 'Bananito Explodito',    emoji: ['🍌', '💥'], rarity: 'common',    img: '', blurb: 'A banana with anger issues. Tick, tick…' },
  { id: 'gattino',     name: 'Gattino Spaghettino',   emoji: ['🐱', '🍝'], rarity: 'common',    img: '', blurb: 'Half cat, half pasta. Fully tangled.' },
  { id: 'pizzarello',  name: 'Pizzarello Volarello',  emoji: ['🍕', '🛸'], rarity: 'common',    img: '', blurb: 'Flying pizza UFO. Delivers in 30 light-years.' },
  { id: 'rattatuglio', name: 'Rattatuglio Formaggio', emoji: ['🐀', '🧀'], rarity: 'common',    img: '', blurb: 'Rat made of cheese. Eats itself for snacks.' },
  { id: 'polpo',       name: 'Polpo Telefonino',      emoji: ['🐙', '📱'], rarity: 'common',    img: '', blurb: 'Octopus with eight phones. Always on a call.' },
  { id: 'ranocchio',   name: 'Ranocchio Discotechio', emoji: ['🐸', '🪩'], rarity: 'common',    img: '', blurb: 'Disco frog. Lives for the drop.' },
  { id: 'patatino',    name: 'Patatino Fritarino',    emoji: ['🥔', '🍟'], rarity: 'common',    img: '', blurb: 'A potato becoming fries. Existential.' },
  { id: 'limoncello',  name: 'Limoncello Squalozzo',  emoji: ['🍋', '🦈'], rarity: 'common',    img: '', blurb: 'Sour shark. Surprisingly refreshing.' },
  { id: 'coccodrillo', name: 'Coccodrillo Bicicletto',emoji: ['🐊', '🚲'], rarity: 'rare',      img: '', blurb: 'Croc on a bike. Pedals through the swamp feed.' },
  { id: 'elefantino',  name: 'Elefantino Aeroplanino',emoji: ['🐘', '✈️'], rarity: 'rare',      img: '', blurb: 'Tiny elephant jet. Trunk doubles as a wing.' },
  { id: 'cavallo',     name: 'Cavallo Caffèllo',      emoji: ['🐎', '☕'], rarity: 'rare',      img: '', blurb: 'Espresso horse. Gallops on pure caffeine.' },
  { id: 'serpente',    name: 'Serpente Sorpresa',     emoji: ['🐍', '🎁'], rarity: 'rare',      img: '', blurb: 'Snake in a gift box. Always a surprise.' },
  { id: 'pinguino',    name: 'Pinguino Sumo',         emoji: ['🐧', '🥋'], rarity: 'rare',      img: '', blurb: 'Sumo penguin. Slides into the ring belly-first.' },
  { id: 'ricciolo',    name: 'Ricciolo Spaghetto',    emoji: ['🦔', '🍝'], rarity: 'rare',      img: '', blurb: 'Hedgehog of noodles. Prickly and al dente.' },
  { id: 'vulcano',     name: 'Vulcano Gelato',        emoji: ['🌋', '🍦'], rarity: 'epic',      img: '', blurb: 'Erupting ice-cream volcano. Hot and cold takes.' },
  { id: 'robotto',     name: 'Robotto Tarantello',    emoji: ['🤖', '🕷️'], rarity: 'epic',      img: '', blurb: 'Spider-bot. Crawls into your recommendations.' },
  { id: 'meduso',      name: 'Meduso Lampadino',      emoji: ['🪼', '💡'], rarity: 'epic',      img: '', blurb: 'Jellyfish lamp. Glows with bad ideas.' },
  { id: 'castoro',     name: 'Castoro Motosega',      emoji: ['🦫', '🪚'], rarity: 'epic',      img: '', blurb: 'Beaver with a chainsaw. Builds dams aggressively.' },
  { id: 'fungo',       name: 'Fungo Funghetto',       emoji: ['🍄', '👁️'], rarity: 'epic',      img: '', blurb: 'A mushroom that watches. The spores spread.' },
  { id: 'dragone',     name: 'Dragone Lasagna',       emoji: ['🐉', '🍝'], rarity: 'legendary', img: '', blurb: 'Dragon of layered pasta. Breathes béchamel.' },
  { id: 'astrogatto',  name: 'Astrogatto Cosmico',    emoji: ['🐱', '🚀'], rarity: 'legendary', img: '', blurb: 'Space cat. Knocks planets off the table.' },
  { id: 'balena',      name: 'Balena Tempesta',       emoji: ['🐋', '⛈️'], rarity: 'legendary', img: '', blurb: 'Storm whale. Its blowhole makes weather.' },
  { id: 'fenice',      name: 'Fenice Pixelata',       emoji: ['🔥', '🕊️'], rarity: 'mythic',    img: '', blurb: 'Pixel phoenix. Respawns every time you blink.' },
  { id: 'titano',      name: 'Titano Montagna',       emoji: ['🗻', '🦾'], rarity: 'mythic',    img: '', blurb: 'A mountain that lifts. Leg day is every day.' },

  { id: 'goldino',     name: 'Golden Bombardiro',     emoji: ['🐊', '🥇'], rarity: 'gold',      img: '', blurb: 'Solid-gold croc-jet. Blindingly, obnoxiously rich.' },
  { id: 'midano',      name: 'Re Midano Aurato',      emoji: ['👑', '🐊'], rarity: 'gold',      img: '', blurb: 'Everything he touches becomes another croc. Gold one.' },
  { id: 'diamantino',  name: 'Diamantino Crystallino',emoji: ['💎', '🦈'], rarity: 'diamond',   img: '', blurb: 'A shark cut from one flawless diamond. Priceless.' },
];
export const ROSTER_BY_ID = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

// ----------------------------------------------------------------------------
//  STATIONS — cookie-clicker "machines". Build them with coins, then CLICK to
//  spin one up for a short burst of coins (tap it in the office or hit WORK).
//  Buy the ⚙️ Station Auto-Pilot upgrade and they run on their own forever.
//  `rate` = coins/sec PER built unit while running (scales with company level).
// ----------------------------------------------------------------------------
export const STATIONS = [
  { id: 'render',  name: 'Render Farm',  icon: '🖥️', color: '#4fa3ff', uiColor: '#4fa3ff', unlockLevel: 0,  baseCost: 150,    growth: 1.19, rate: 3,     runFor: 8,  desc: 'Renders slop in bulk. Tap to spin it up.' },
  { id: 'meme',    name: 'Meme Forge',   icon: '😹', color: '#ff8d3b', uiColor: '#ff8d3b', unlockLevel: 2,  baseCost: 2200,   growth: 1.21, rate: 24,    runFor: 8,  desc: 'Stamps out fresh memes. Tap to fire it up.' },
  { id: 'stream',  name: 'Stream Booth', icon: '📡', color: '#b06bff', uiColor: '#b06bff', unlockLevel: 5,  baseCost: 45000,  growth: 1.23, rate: 210,   runFor: 9,  desc: 'Goes live to the whole feed. Tap to broadcast.' },
  { id: 'mint',    name: 'Coin Mint',    icon: '🏭', color: '#ffce47', uiColor: '#ffb020', unlockLevel: 9,  baseCost: 900000, growth: 1.25, rate: 1900,  runFor: 9,  desc: 'Literally prints money. Tap to mint.' },
  { id: 'reactor', name: 'Slop Reactor', icon: '☢️', color: '#49e07d', uiColor: '#16c172', unlockLevel: 14, baseCost: 2.2e7,  growth: 1.27, rate: 17000, runFor: 10, desc: 'Fuses raw brainrot into pure profit. Tap to ignite.' },
];
export const STATION_BY_ID = Object.fromEntries(STATIONS.map((s) => [s.id, s]));

// Economy tuning.
export const ECON = {
  empPower: 0.10,         // each unit of employee output adds this to the income multiplier
  baseFollowers: 0.25,    // followers per coin/sec earned
  audienceBonus: 0.05,    // income mult: 1 + audienceBonus*log10(1+followers)
  viralBaseChance: 0.012, // per-second chance of a viral spike (rarer = calmer)
  viralDuration: 6,       // seconds a viral spike lasts
  viralMultiplier: 8,     // income multiplier during a viral spike
  offlineCap: 8 * 3600,   // max seconds of offline progress credited
  offlineRate: 0.5,       // offline earns 50% of online rate
  saveInterval: 5,        // seconds between autosaves
  // Gacha ("generate brainrot") — costs coins + tokens.
  gachaBaseCoin: 50,      // coin cost of the first pull (cheaper = faster progress)
  gachaCoinGrowth: 1.13,  // coin cost growth per pull (steeper = collect more slowly)
  gachaTokenCost: 1,      // tokens per single pull
  gachaMultiPulls: 10,    // pulls in a multi
  gachaMultiTokenCost: 9, // tokens for a multi (1 free vs 10 singles)
  // Manual "click to work" — like cookie clicker. Auto-Manager upgrade automates it.
  clickBase: 6,           // flat coins per click
  clickIncomeFraction: 0.3, // + this fraction of current income/sec per click
  // Company Level (XP = lifetime coins). Slow, deliberate climb (costs > production).
  levelBaseXp: 150,       // coins to clear level 1 (early levels stay snappy)
  levelGrowth: 1.55,      // XP requirement growth per level (stretches mid/late)
  levelIncomeBonus: 0.03, // +3% global income per company level
  // Trash / janitor — messes pile up and gently drag income down until cleaned.
  messPenaltyPer: 0.035,  // each pile of trash on the floor: -3.5% income
  messFloor: 0.45,        // …but income never drops below 45% from trash alone
  stationLevelScale: 0.32,// station output bonus per company level
};

// ----------------------------------------------------------------------------
//  UPGRADES — permanent, leveled boosts bought with coins. Some unlock with
//  company level. `apply(level, e)` mutates the shared effects bundle.
// ----------------------------------------------------------------------------
export const UPGRADES = [
  { id: 'clickpower',name: 'Click Power',       icon: '👆', unlockLevel: 0,  baseCost: 80,     growth: 1.55, max: 80, desc: '+60% coins per click per level.',  apply: (l, e) => { e.clickPower *= 1 + 0.6 * l; } },
  { id: 'autoclick', name: 'Auto-Manager',      icon: '🤖', unlockLevel: 1,  baseCost: 1200,   growth: 1.85, max: 40, desc: 'Auto-clicks +1/sec per level — idles for you!', apply: (l, e) => { e.autoClick += l; } },
  { id: 'autopilot', name: 'Station Auto-Pilot',icon: '⚙️', unlockLevel: 3,  baseCost: 9000,   growth: 1,    max: 1,  desc: 'Your stations run on their own — no more tapping to work them!', apply: (l, e) => { e.automation = 1; } },
  { id: 'overclock', name: 'Station Overclock', icon: '🔧', unlockLevel: 4,  baseCost: 6000,   growth: 1.8,  max: 40, desc: '+35% station output per level.',    apply: (l, e) => { e.stationMult *= 1 + 0.35 * l; } },
  { id: 'gpu',       name: 'Better GPUs',       icon: '🖥️', unlockLevel: 0,  baseCost: 300,    growth: 1.75, max: 60, desc: '+12% brainrot income per level.',  apply: (l, e) => { e.income *= 1 + 0.12 * l; } },
  { id: 'training',  name: 'Employee Training', icon: '🎓', unlockLevel: 0,  baseCost: 800,    growth: 1.85, max: 50, desc: '+10% employee multiplier per level.', apply: (l, e) => { e.emp *= 1 + 0.10 * l; } },
  { id: 'momentum',  name: 'Momentum Engine',   icon: '🌀', unlockLevel: 7,  baseCost: 150000, growth: 2.1, max: 50, desc: '+7% global income per level.',      apply: (l, e) => { e.income *= 1 + 0.07 * l; } },
  { id: 'cooling',   name: 'Liquid Cooling',    icon: '❄️', unlockLevel: 3,  baseCost: 4000,   growth: 1.9, max: 40, desc: '+15% morale effectiveness per level.', apply: (l, e) => { e.morale *= 1 + 0.15 * l; } },
  { id: 'algo',      name: 'Algorithm Hacking', icon: '📈', unlockLevel: 4,  baseCost: 12000,  growth: 2.0, max: 40, desc: '+20% follower gain per level.',     apply: (l, e) => { e.followers *= 1 + 0.20 * l; } },
  { id: 'jackpot',   name: 'Jackpot Mode',      icon: '🎰', unlockLevel: 11, baseCost: 1.2e6,  growth: 2.2, max: 20, desc: '+4× viral multiplier per level.',   apply: (l, e) => { e.viralMult += 4 * l; } },
  { id: 'viralbot',  name: 'Viral Bot Farm',    icon: '🛰️', unlockLevel: 6,  baseCost: 60000,  growth: 2.1, max: 25, desc: '+0.5% viral chance per level.',     apply: (l, e) => { e.viralChance += 0.005 * l; } },
  { id: 'luck',      name: 'Lucky Rolls',       icon: '🍀', unlockLevel: 8,  baseCost: 200000, growth: 2.2, max: 20, desc: 'Better gacha rarity odds (+ luck/level).', apply: (l, e) => { e.luck += 0.06 * l; } },
  { id: 'servers',   name: 'Offline Servers',   icon: '☁️', unlockLevel: 5,  baseCost: 40000,  growth: 2.0, max: 20, desc: '+25% offline earnings per level.',  apply: (l, e) => { e.offline *= 1 + 0.25 * l; } },
  { id: 'recruiter', name: 'AI Recruiter',      icon: '🧑‍💼', unlockLevel: 10, baseCost: 500000, growth: 2.3, max: 15, desc: '+1 token from every quest per level.', apply: (l, e) => { e.questTokens += l; } },
  { id: 'tycoon',    name: 'Tycoon Tactics',    icon: '💼', unlockLevel: 13, baseCost: 5e6,    growth: 2.5, max: 30, desc: '+30% brainrot income per level (big late boost).', apply: (l, e) => { e.income *= 1 + 0.30 * l; } },
];

// ----------------------------------------------------------------------------
//  ACHIEVEMENTS — one-time goals with token/coin rewards. `stat` is resolved by
//  achievements.js; unlock fires a celebration. Separate from the quest chain.
// ----------------------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'firstpull', icon: '🎰', name: 'First Pull',       desc: 'Generate your first brainrot', stat: 'pulls',    target: 1,      reward: { tokens: 1 } },
  { id: 'own5',      icon: '🦓', name: 'Petting Zoo',      desc: 'Own 5 brainrots',              stat: 'owned',    target: 5,      reward: { tokens: 3 } },
  { id: 'own10',     icon: '🦒', name: 'Full Zoo',         desc: 'Own 10 brainrots',             stat: 'owned',    target: 10,     reward: { tokens: 6 } },
  { id: 'ownall',    icon: '🏆', name: 'Gotta Fuse Em All',desc: `Own all ${ROSTER.length} brainrots`, stat: 'owned',  target: ROSTER.length, reward: { tokens: 50 } },
  { id: 'lvl5',      icon: '⭐', name: 'Rising Star',      desc: 'Get a brainrot to Lv 5',       stat: 'maxlvl',   target: 5,      reward: { tokens: 4 } },
  { id: 'lvl15',     icon: '🌟', name: 'Maxed Out',        desc: 'Get a brainrot to Lv 15',      stat: 'maxlvl',   target: 15,     reward: { tokens: 12 } },
  { id: 'epic1',     icon: '💜', name: 'Epic Find',        desc: 'Collect an Epic',              stat: 'epic',     target: 1,      reward: { tokens: 5 } },
  { id: 'myth1',     icon: '💖', name: 'Mythic!',          desc: 'Collect a Mythic',             stat: 'mythic',   target: 1,      reward: { tokens: 15 } },
  { id: 'gold1',     icon: '🥇', name: 'Solid Gold',       desc: 'Collect a Gold brainrot',      stat: 'gold',     target: 1,      reward: { tokens: 40 } },
  { id: 'diamond1',  icon: '💎', name: 'Diamond Hands',     desc: 'Collect a Diamond brainrot',   stat: 'diamond',  target: 1,      reward: { tokens: 80 } },
  { id: 'cash1k',    icon: '💵', name: 'Pocket Change',    desc: 'Bank 1,000 coins',             stat: 'coins',    target: 1000,   reward: { tokens: 2 } },
  { id: 'cash1m',    icon: '💰', name: 'Millionaire',      desc: 'Bank 1,000,000 coins',         stat: 'coins',    target: 1e6,    reward: { tokens: 8 } },
  { id: 'cash1b',    icon: '🤑', name: 'Billionaire',      desc: 'Bank 1,000,000,000 coins',     stat: 'coins',    target: 1e9,    reward: { tokens: 30 } },
  { id: 'life1m',    icon: '🏦', name: 'Big Earner',       desc: 'Earn 1M coins lifetime',       stat: 'lifetime', target: 1e6,    reward: { tokens: 6 } },
  { id: 'fans10k',   icon: '📣', name: 'Influencer',       desc: 'Reach 10K followers',          stat: 'fans',     target: 10000,  reward: { tokens: 5 } },
  { id: 'fans1m',    icon: '🌍', name: 'Global Slop',      desc: 'Reach 1M followers',           stat: 'fans',     target: 1e6,    reward: { tokens: 15 } },
  { id: 'staff10',   icon: '🧑‍💻', name: 'Real Company',     desc: 'Employ 10 workers',            stat: 'staff',    target: 10,     reward: { tokens: 4 } },
  { id: 'staff40',   icon: '🏢', name: 'Corporation',      desc: 'Employ 40 workers',            stat: 'staff',    target: 40,     reward: { tokens: 12 } },
  { id: 'viral10',   icon: '🔥', name: 'Trending',         desc: 'Go viral 10 times',            stat: 'viral',    target: 10,     reward: { tokens: 6 } },
  { id: 'viral100',  icon: '💥', name: 'Algorithm Darling',desc: 'Go viral 100 times',           stat: 'viral',    target: 100,    reward: { tokens: 20 } },
  { id: 'lvl10',     icon: '🎖️', name: 'Veteran CEO',      desc: 'Reach company Level 10',       stat: 'level',    target: 10,     reward: { tokens: 8 } },
  { id: 'lvl25',     icon: '👑', name: 'Slop Mogul',       desc: 'Reach company Level 25',       stat: 'level',    target: 25,     reward: { tokens: 25 } },
  { id: 'bully25',   icon: '👆', name: 'Micromanager',     desc: 'Click to work 100 times',      stat: 'bullies',  target: 100,    reward: { tokens: 5 } },
  { id: 'office',    icon: '🌆', name: 'Mega-Campus',      desc: 'Reach the AI Mega-Campus',     stat: 'office',   target: 5,      reward: { tokens: 30 } },
  { id: 'station1',  icon: '🖥️', name: 'Powered Up',       desc: 'Build your first station',     stat: 'stations', target: 1,      reward: { tokens: 3 } },
  { id: 'station20', icon: '🏭', name: 'Slop Factory',     desc: 'Build 20 stations',            stat: 'stations', target: 20,     reward: { tokens: 12 } },
  { id: 'stationall',icon: '⚙️', name: 'Full Production',  desc: 'Own every type of station',    stat: 'stationtypes', target: 5,  reward: { tokens: 18 } },
  { id: 'autopilot', icon: '🛸', name: 'Hands Off',        desc: 'Buy Station Auto-Pilot',       stat: 'autopilot',target: 1,      reward: { tokens: 10 } },
  { id: 'clean50',   icon: '🧹', name: 'Spotless',         desc: 'Clean up 50 messes',           stat: 'cleaned',  target: 50,     reward: { tokens: 8 } },
];

// QUESTS — completing them awards Tokens (the gacha currency) + coins.
// Sequential chain; `cur(state)` returns current progress toward `target`.
export const QUESTS = [
  { id: 'gacha1',  icon: '🎰', title: 'Pull the lever',     desc: 'Generate your first brainrot', target: 1,     stat: 'pulls',   reward: { tokens: 2 } },
  { id: 'collect3',icon: '🦓', title: 'Open the zoo',        desc: 'Own 3 brainrots',             target: 3,     stat: 'owned',   reward: { tokens: 3, coins: 250 } },
  { id: 'hire',    icon: '🧑‍💻', title: 'Staff up',            desc: 'Employ 8 workers',            target: 8,     stat: 'staff',   reward: { tokens: 3 } },
  { id: 'level3',  icon: '⭐', title: 'Level up a star',     desc: 'Get any brainrot to Lv 3',    target: 3,     stat: 'maxlvl',  reward: { tokens: 4, coins: 1000 } },
  { id: 'station', icon: '🖥️', title: 'Power up',            desc: 'Build a station',             target: 1,     stat: 'stations',reward: { tokens: 4, coins: 500 } },
  { id: 'income',  icon: '🪙', title: 'Money printer',       desc: 'Reach 200 coins/sec',         target: 200,   stat: 'income',  reward: { tokens: 5 } },
  { id: 'auto',    icon: '⚙️', title: 'Set it and forget it',desc: 'Run 5 stations at once',      target: 5,     stat: 'stations',reward: { tokens: 6, coins: 5000 } },
  { id: 'collect8',icon: '🏆', title: 'Crowd favourite',     desc: 'Own 8 brainrots',             target: 8,     stat: 'owned',   reward: { tokens: 6 } },
  { id: 'epic',    icon: '💜', title: 'Rarity hunter',       desc: 'Collect an Epic or better',   target: 1,     stat: 'epic',    reward: { tokens: 8, coins: 25000 } },
  { id: 'fans',    icon: '📈', title: 'Going viral',         desc: 'Reach 100K followers',        target: 100000,stat: 'fans',    reward: { tokens: 8 } },
  { id: 'collect14',icon:'🌟', title: 'Zookeeper legend',    desc: 'Own 14 brainrots',            target: 14,    stat: 'owned',   reward: { tokens: 14, coins: 1e6 } },
];
