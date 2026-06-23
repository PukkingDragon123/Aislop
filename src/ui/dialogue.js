// ============================================================================
//  Dialogue / NPC system — a bottom dialogue box with a portrait, text and
//  optional choices. Drives the first-run tutorial NPC and the "Orca Tank"
//  investor offer event.
// ============================================================================

import { el, clear } from './dom.js';
import { grantCash, incomePerSec } from '../sim/economy.js';
import { state } from '../core/state.js';
import { money } from '../core/format.js';

// Generic runner. `lines` = [{ npc, name, text, choices?: [{label,onPick}] }].
export function showDialogue(lines, onDone) {
  let i = 0;
  const portrait = el('div', { class: 'dlg-portrait' });
  const nameEl = el('div', { class: 'dlg-name' });
  const textEl = el('div', { class: 'dlg-text' });
  const choicesEl = el('div', { class: 'dlg-choices' });
  const ov = el('div', { class: 'dlg' }, [
    el('div', { class: 'dlg-box' }, [
      el('div', { class: 'dlg-row' }, [portrait, el('div', { class: 'dlg-body' }, [nameEl, textEl])]),
      choicesEl,
    ]),
  ]);
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
  render();

  function render() {
    const ln = lines[i];
    portrait.textContent = ln.npc || '🤖';
    nameEl.textContent = ln.name || '';
    textEl.textContent = ln.text;
    clear(choicesEl);
    if (ln.choices) {
      for (const ch of ln.choices) choicesEl.appendChild(el('button', { class: 'dlg-btn', text: ch.label, onclick: () => { if (ch.onPick) ch.onPick(); next(); } }));
    } else {
      choicesEl.appendChild(el('button', { class: 'dlg-btn primary', text: i >= lines.length - 1 ? 'Done' : 'Next', onclick: next }));
    }
  }
  function next() { i++; if (i >= lines.length) finish(); else render(); }
  function finish() { ov.classList.remove('show'); setTimeout(() => ov.remove(), 250); if (onDone) onDone(); }
}

export function startTutorial(onDone) {
  showDialogue([
    { npc: '🦠', name: 'Bloop the Intern', text: 'Welcome to your Brainrot Zoo! Let me show you the ropes — it\'ll take 10 seconds.' },
    { npc: '🦠', name: 'Bloop', text: 'Smash the 🎰 button (bottom-left) to GENERATE brainrots. They\'re your exhibits — they print coins 24/7. Duplicates fuse and level up!' },
    { npc: '🦠', name: 'Bloop', text: 'Hire employees from the bottom bar — they MULTIPLY all that income. Decorate for morale, expand for room.' },
    { npc: '🦠', name: 'Bloop', text: 'Tokens 🎟️ pay for the gacha. You earn them from QUESTS — tap the quest chip up top to see your goal.' },
    { npc: '🦠', name: 'Bloop', text: 'TAP the office to make employees WORK for instant coins — or buy the 🤖 Auto-Manager upgrade to automate it!' },
    { npc: '🦠', name: 'Bloop', text: 'Build 🏭 STATIONS in Manage, then TAP them to run for a coin burst. Buy ⚙️ Auto-Pilot and they run themselves forever!' },
    { npc: '🦠', name: 'Bloop', text: '🗑️ Trash piles up and drags your income down — tap it to sweep it, or buy a 🧹 Janitor Bot to auto-clean.' },
    { npc: '🦠', name: 'Bloop', text: 'Watch for events: 🐋 Orca Tank investors, a 🦝 Sketchy Dealer\'s deals, and 🧑‍💻 employee meltdowns. Also tap chaos props (🦖🧨)! Now go feral! 🎉' },
  ], onDone);
}

// "Orca Tank" — a Shark-Tank parody offer that injects cash.
export function orcaTankOffer() {
  const base = Math.max(80, incomePerSec() * 90); // ~1.5 min of income
  const award = (amt, msg) => {
    amt = Math.floor(amt); grantCash(amt);
    showDialogue([{ npc: '🐋', name: 'Orca Tank', text: `${msg} You walk away with ${money(amt)}! 🤝` }]);
  };
  showDialogue([
    { npc: '🐋', name: 'Orca Tank', text: 'Welcome to ORCA TANK. Pitch your brainrot startup to our panel of marine investors!' },
    {
      npc: '🐋', name: 'Orca Tank', text: 'How do you wanna pitch it?', choices: [
        { label: '🚀 Hype it to the moon', onPick: () => award(base * (1.5 + Math.random() * 4), 'They are OBSESSED with the vibes.') },
        { label: '📊 Cold hard numbers', onPick: () => award(base * (1 + Math.random() * 2), 'Respectable fundamentals.') },
        { label: '😢 Beg shamelessly', onPick: () => award(base * (0.4 + Math.random() * 1.2), 'Out of sheer pity...') },
      ],
    },
  ]);
}

// "Sketchy Dealer" — a risk/reward gambler who rolls up with shady deals.
export function dealerOffer(opts = {}) {
  const onMess = opts.onMess || (() => {});
  const base = Math.max(50, incomePerSec() * 60);
  const crate = Math.max(40, Math.floor(Math.min(Math.max(state.money * 0.4, 40), base)));
  const reject = () => showDialogue([{ npc: '🦝', name: 'Sketchy Dealer', text: 'Broke? Pfft. Come back when you got coins, pal.' }]);
  const buy = (cost) => { if (state.money < cost) { reject(); return false; } state.money -= cost; return true; };
  showDialogue([
    { npc: '🦝', name: 'Sketchy Dealer', text: 'Psst… hey. Wanna buy some premium uncut brainrot? Totally legit. Mostly.' },
    {
      npc: '🦝', name: 'Sketchy Dealer', text: 'I deal in DEALS. What\'s it gonna be?', choices: [
        { label: `📦 Mystery Crate (${money(crate)})`, onPick: () => {
            if (!buy(crate)) return;
            if (Math.random() < 0.35) { onMess(2); showDialogue([{ npc: '🗑️', name: 'Ripped Off', text: 'It\'s… just trash. And he\'s gone. Lesson learned, hopefully.' }]); }
            else { const pay = Math.floor(crate * (1.5 + Math.random() * 2.5)); grantCash(pay); showDialogue([{ npc: '🤑', name: 'JACKPOT', text: `The crate was loaded — you flip it for ${money(pay)}! 🎉` }]); }
          } },
        { label: `🎲 Double or Nothing (${money(crate)})`, onPick: () => {
            if (!buy(crate)) return;
            if (Math.random() < 0.5) { grantCash(crate * 2); showDialogue([{ npc: '🤑', name: 'Winner', text: `You doubled it — ${money(crate * 2)}! The Dealer sheds a single tear.` }]); }
            else { onMess(1); showDialogue([{ npc: '😈', name: 'Sketchy Dealer', text: 'Ohhh, so close. Easy come, easy go, champ.' }]); }
          } },
        { label: '🚪 Nope, walk away', onPick: () => {} },
      ],
    },
  ]);
}

// "Employee Problem" — staff drama you pay off, defuse, or ignore (chaos!).
const PROBLEMS = [
  { who: '🧑‍💻', name: 'Dave from Editing', text: 'Dave is threatening to quit unless he gets a raise. He hasn\'t slept since Tuesday.' },
  { who: '🧑‍💻', name: 'Priya, Prompt Eng.', text: 'Priya says the AI "looked at her funny" and is now demanding hazard pay.' },
  { who: '🧑‍💻', name: 'The Night Shift', text: 'The whole night shift unionised over the snack situation. The vibes are tense.' },
  { who: '🧑‍💻', name: 'Greg', text: 'Greg has been feuding with the office Dino again. He wants damages for "emotional trauma".' },
];
export function employeeProblem(opts = {}) {
  const onTantrum = opts.onTantrum || (() => {});
  const bonus = Math.max(60, Math.floor(incomePerSec() * 45));
  const p = PROBLEMS[(Math.random() * PROBLEMS.length) | 0];
  const pay = (cost, msg) => {
    if (state.money >= cost) { state.money -= cost; showDialogue([{ npc: '😊', name: 'Sorted', text: msg }]); }
    else { showDialogue([{ npc: '😬', name: 'Uh oh', text: 'You can\'t afford it… they storm off in a huff and trash the place!' }]); onTantrum(); }
  };
  showDialogue([
    { npc: p.who, name: p.name, text: p.text },
    {
      npc: '🧑‍💼', name: 'HR Situation', text: 'How do you handle it, boss?', choices: [
        { label: `💸 Pay them off (${money(bonus)})`, onPick: () => pay(bonus, 'A fat bonus smooths it all over. Crisis averted! 🎉') },
        { label: `🍕 Throw a pizza party (${money(Math.floor(bonus * 0.4))})`, onPick: () => pay(Math.floor(bonus * 0.4), 'Pizza fixes most things. Morale restored! 🍕') },
        { label: '🙅 Ignore it', onPick: () => { showDialogue([{ npc: '💢', name: 'Meltdown', text: 'They flip a desk and storm out. What a mess they left behind…' }]); onTantrum(); } },
      ],
    },
  ]);
}
