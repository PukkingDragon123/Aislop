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
  { id: 'trends',     name: 'Trend Lab',    role: 'Trend Hunter', icon: '🔮', color: 0xffb347, uiColor: '#ffae42',
    desc: 'Scouts spot what the feed wants next.', baseRate: 0.6, baseHireCost: 18, hireGrowth: 1.15,
    titles: ['Trend Hunter', 'Trend Scout', 'Culture Analyst'] },
  { id: 'creation',   name: 'Creation Bay', role: 'Content Creator', icon: '✨', color: 0xff6f91, uiColor: '#ff6f91',
    desc: 'Creators churn out raw AI content all day.', baseRate: 0.7, baseHireCost: 24, hireGrowth: 1.15,
    titles: ['Content Creator', 'Prompt Engineer', 'Game Developer', 'Music Producer', 'Website Designer'] },
  { id: 'editing',    name: 'Edit Suite',   role: 'Editor', icon: '🎬', color: 0x7bdff2, uiColor: '#56cfe1',
    desc: 'Editors polish slop into something watchable.', baseRate: 0.65, baseHireCost: 30, hireGrowth: 1.15,
    titles: ['Video Editor', 'Audio Engineer', 'QA Specialist'] },
  { id: 'publishing', name: 'Upload Hub',   role: 'Publisher', icon: '🚀', color: 0x9bf6a0, uiColor: '#74d680',
    desc: 'The upload team ships to every platform at once.', baseRate: 0.6, baseHireCost: 38, hireGrowth: 1.15,
    titles: ['Upload Specialist', 'Platform Manager', 'Release Coordinator'] },
  { id: 'marketing',  name: 'Growth Floor', role: 'Marketer', icon: '📣', color: 0xc3a6ff, uiColor: '#b18cff',
    desc: 'Marketers push content into millions of feeds.', baseRate: 0.8, baseHireCost: 46, hireGrowth: 1.15,
    titles: ['Marketing Specialist', 'Growth Hacker', 'Community Manager'] },
];
export const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));

// Placeable decorations → morale → a global income multiplier + visual variety.
export const DECORATIONS = [
  { id: 'plant',    name: 'Potted Plant',    icon: '🪴', cost: 40,      morale: 0.02, desc: '+2% income. Photosynthesises productivity.' },
  { id: 'poster',   name: 'Motiv. Poster',   icon: '🖼️', cost: 90,      morale: 0.025, desc: '+2.5% income. "HUSTLE", but make it AI.' },
  { id: 'coffee',   name: 'Coffee Machine',  icon: '☕', cost: 250,     morale: 0.05, desc: '+5% income. The true engine of the company.' },
  { id: 'vending',  name: 'Vending Machine', icon: '🥤', cost: 600,     morale: 0.06, desc: '+6% income. Snacks fuel the slop.' },
  { id: 'sofa',     name: 'Lounge Sofa',     icon: '🛋️', cost: 1400,    morale: 0.08, desc: '+8% income. A place to "ideate".' },
  { id: 'arcade',   name: 'Gaming Corner',   icon: '🕹️', cost: 4500,    morale: 0.11, desc: '+11% income. Definitely team-building.' },
  { id: 'art',      name: 'Art Display',     icon: '🎨', cost: 14000,   morale: 0.14, desc: '+14% income. AI-generated, naturally.' },
  { id: 'mascot',   name: 'AI Mascot Statue',icon: '🗿', cost: 60000,   morale: 0.20, desc: '+20% income. It watches. It judges.' },
  { id: 'server',   name: 'Server Display',  icon: '🖥️', cost: 240000,  morale: 0.26, desc: '+26% income. Blinky lights = trust.' },
  { id: 'core',     name: 'AI Core',         icon: '🌌', cost: 1500000, morale: 0.40, desc: '+40% income. The heart of the company hums.' },
];

// Office expansion — bigger footprint, more desk capacity, new identity.
export const OFFICE_LEVELS = [
  { name: 'Garage Startup',  gridW: 8,  gridH: 8,  capacity: 8,   cost: 0 },
  { name: 'Small Office',    gridW: 10, gridH: 10, capacity: 16,  cost: 500 },
  { name: 'Open-Plan Floor', gridW: 13, gridH: 12, capacity: 30,  cost: 8000 },
  { name: 'Full Floor',      gridW: 16, gridH: 14, capacity: 50,  cost: 120000 },
  { name: 'AI Headquarters', gridW: 20, gridH: 16, capacity: 80,  cost: 2500000 },
  { name: 'AI Mega-Campus',  gridW: 24, gridH: 20, capacity: 130, cost: 50000000 },
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
  common:    { name: 'Common',    weight: 50, income: 0.6,  color: '#9aa6c0', glow: '#cdd6e6' },
  rare:      { name: 'Rare',      weight: 26, income: 2.2,  color: '#4fa3ff', glow: '#9fd0ff' },
  epic:      { name: 'Epic',      weight: 15, income: 9,    color: '#b06bff', glow: '#d9b6ff' },
  legendary: { name: 'Legendary', weight: 7,  income: 42,   color: '#ffb02e', glow: '#ffd98a' },
  mythic:    { name: 'Mythic',    weight: 2,  income: 200,  color: '#ff4d8d', glow: '#ff9ec4' },
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
];
export const ROSTER_BY_ID = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

// Economy tuning.
export const ECON = {
  empPower: 0.10,         // each unit of employee output adds this to the income multiplier
  baseFollowers: 0.25,    // followers per coin/sec earned
  audienceBonus: 0.05,    // income mult: 1 + audienceBonus*log10(1+followers)
  viralBaseChance: 0.016, // per-second chance of a viral spike
  viralDuration: 7,       // seconds a viral spike lasts
  viralMultiplier: 12,    // income multiplier during a viral spike
  offlineCap: 8 * 3600,   // max seconds of offline progress credited
  offlineRate: 0.5,       // offline earns 50% of online rate
  saveInterval: 5,        // seconds between autosaves
  // Gacha ("generate brainrot") — costs coins + tokens.
  gachaBaseCoin: 120,     // coin cost of the first pull
  gachaCoinGrowth: 1.12,  // coin cost growth per pull
  gachaTokenCost: 1,      // tokens per single pull
  gachaMultiPulls: 10,    // pulls in a multi
  gachaMultiTokenCost: 9, // tokens for a multi (1 free vs 10 singles)
  // Dopamine system — fills as you earn; spike = euphoric overdrive.
  dopamineFillPerSec: 0.06,   // base meter fill/sec (scaled by activity)
  dopamineDuration: 12,       // seconds a spike lasts
  dopamineMultiplier: 8,      // income multiplier during a dopamine spike
};

// QUESTS — completing them awards Tokens (the gacha currency) + coins.
// Sequential chain; `cur(state)` returns current progress toward `target`.
export const QUESTS = [
  { id: 'gacha1',  icon: '🎰', title: 'Pull the lever',     desc: 'Generate your first brainrot', target: 1,     stat: 'pulls',   reward: { tokens: 2 } },
  { id: 'collect3',icon: '🦓', title: 'Open the zoo',        desc: 'Own 3 brainrots',             target: 3,     stat: 'owned',   reward: { tokens: 3, coins: 250 } },
  { id: 'hire',    icon: '🧑‍💻', title: 'Staff up',            desc: 'Employ 8 workers',            target: 8,     stat: 'staff',   reward: { tokens: 3 } },
  { id: 'level3',  icon: '⭐', title: 'Level up a star',     desc: 'Get any brainrot to Lv 3',    target: 3,     stat: 'maxlvl',  reward: { tokens: 4, coins: 1000 } },
  { id: 'income',  icon: '🪙', title: 'Money printer',       desc: 'Reach 200 coins/sec',         target: 200,   stat: 'income',  reward: { tokens: 5 } },
  { id: 'dopamine',icon: '🤯', title: 'Feel the rush',       desc: 'Trigger a Dopamine Spike',    target: 1,     stat: 'spikes',  reward: { tokens: 5, coins: 5000 } },
  { id: 'collect8',icon: '🏆', title: 'Crowd favourite',     desc: 'Own 8 brainrots',             target: 8,     stat: 'owned',   reward: { tokens: 6 } },
  { id: 'epic',    icon: '💜', title: 'Rarity hunter',       desc: 'Collect an Epic or better',   target: 1,     stat: 'epic',    reward: { tokens: 8, coins: 25000 } },
  { id: 'fans',    icon: '📈', title: 'Going viral',         desc: 'Reach 100K followers',        target: 100000,stat: 'fans',    reward: { tokens: 8 } },
  { id: 'collect14',icon:'🌟', title: 'Zookeeper legend',    desc: 'Own 14 brainrots',            target: 14,    stat: 'owned',   reward: { tokens: 14, coins: 1e6 } },
];
