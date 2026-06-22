// ============================================================================
//  Dialogue / NPC system — a bottom dialogue box with a portrait, text and
//  optional choices. Drives the first-run tutorial NPC and the "Orca Tank"
//  investor offer event.
// ============================================================================

import { el, clear } from './dom.js';
import { grantCash, incomePerSec } from '../sim/economy.js';
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
    { npc: '🦠', name: 'Bloop', text: 'Also buy chaos props (🦖 🧨) and tap them for mayhem. Now go feral! 🎉' },
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
