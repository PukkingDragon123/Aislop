// Minimal event bus so the sim, world and UI stay decoupled.
// The economy emits semantic events ("published", "viral", "milestone")
// and the renderer / UI subscribe without knowing about each other.

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    const set = this.listeners.get(type);
    if (set) set.delete(fn);
  }

  emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set) return;
    // Copy to allow handlers to unsubscribe mid-emit.
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[events] handler for "${type}" threw`, err);
      }
    }
  }
}

// Single shared bus for the whole game.
export const bus = new EventBus();
