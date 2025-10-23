import { getCurrentEffect, withEffect, type Effect } from './effect';
import { forEach } from './iter';
import { addChildCatch, catchError } from './on-error';
import { getRoot } from './root';

/** @internal */
declare module './root' {
  interface Root {
    effectCleanups?: WeakMap<Effect, Set<Effect>>;
  }
}

export function cleanup(effect: Effect): void {
  addCleanupEffect(effect);
}

export function getCleanups(): WeakMap<Effect, Set<Effect>> {
  const root = getRoot();
  if (!root.effectCleanups) {
    root.effectCleanups = new WeakMap();
  }
  return root.effectCleanups;
}

export function addCleanupEffect(cleanup: Effect) {
  const cleanups = getCleanups();
  const parent = getCurrentEffect();
  if (!parent) {
    throw new Error('cleanup() must be called within an executing effect');
  }
  addChildCatch(parent, cleanup);
  let cleanupSet = cleanups.get(parent);
  if (!cleanupSet) {
    cleanupSet = new Set();
    cleanups.set(parent, cleanupSet);
  }
  cleanupSet.add(cleanup);
}

export function runCleanups(effect: Effect) {
  withEffect(undefined, () => {
    const cleanups = getCleanups();
    const effectCleanups = cleanups.get(effect);
    try {
      if (effectCleanups) {
        forEach(Array.from(effectCleanups).reverse(), (cleanup) => {
          effectCleanups.delete(cleanup);
          try {
            cleanup();
          } catch (e) {
            catchError(e, cleanup);
          }
        });
      }
    } finally {
      cleanups.delete(effect);
    }
  });
}
