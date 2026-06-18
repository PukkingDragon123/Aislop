// ============================================================================
//  Notifications: transient toasts, celebratory banners, and modal dialogs
//  (offline summary, settings, confirmations).
// ============================================================================

import { el, clear } from './dom.js';

let toastWrap, bannerWrap, modalWrap;

export function initToasts() {
  toastWrap = el('div', { class: 'toasts' });
  bannerWrap = el('div', { class: 'banners' });
  modalWrap = el('div', { class: 'modal-overlay hidden' });
  document.body.append(toastWrap, bannerWrap, modalWrap);
  modalWrap.addEventListener('click', (e) => { if (e.target === modalWrap) closeModal(); });
}

export function toast(msg, { icon = '✨', color = '#6cc6ff', ms = 3200 } = {}) {
  const node = el('div', { class: 'toast' }, [
    el('span', { class: 'toast-ico', text: icon, style: { color } }),
    el('span', { class: 'toast-msg', html: msg }),
  ]);
  toastWrap.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 350);
  }, ms);
}

export function banner(title, sub, { icon = '🎉' } = {}) {
  const node = el('div', { class: 'banner' }, [
    el('div', { class: 'banner-ico', text: icon }),
    el('div', {}, [
      el('div', { class: 'banner-title', text: title }),
      el('div', { class: 'banner-sub', text: sub || '' }),
    ]),
  ]);
  bannerWrap.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 500);
  }, 4200);
}

export function modal({ title, bodyNodes = [], actions = [] }) {
  clear(modalWrap);
  const card = el('div', { class: 'modal-card' }, [
    el('div', { class: 'modal-title', text: title }),
    el('div', { class: 'modal-body' }, bodyNodes),
    el('div', { class: 'modal-actions' }, actions.map((a) =>
      el('button', { class: `btn ${a.primary ? 'btn-primary' : ''}`, onclick: () => { if (a.onClick) a.onClick(); if (!a.keepOpen) closeModal(); }, text: a.label }))),
  ]);
  modalWrap.appendChild(card);
  modalWrap.classList.remove('hidden');
  requestAnimationFrame(() => modalWrap.classList.add('show'));
}

export function closeModal() {
  modalWrap.classList.remove('show');
  setTimeout(() => modalWrap.classList.add('hidden'), 250);
}
