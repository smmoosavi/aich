import {
  getCurrentEffect,
  getEffectContext,
  withEffect,
  type Effect,
} from './effect';
import { forEach } from './iter';
import { addChildCatch, catchError } from './on-error';

/** @internal */
declare module './effect' {
  interface EffectContext {
    cleanups?: Set<Effect>;
  }
}

export function cleanup(effect: Effect): void {
  const parent = getCurrentEffect();
  if (!parent) {
    throw new Error('cleanup() must be called within an executing effect');
  }
  addCleanupEffect(parent, effect);
}

export function getCleanups(effect: Effect): Set<Effect> {
  const context = getEffectContext(effect);
  if (!context.cleanups) {
    context.cleanups = new Set();
  }
  return context.cleanups;
}

export function addCleanupEffect(parent: Effect, cleanup: Effect) {
  addChildCatch(parent, cleanup);
  const cleanups = getCleanups(parent);
  cleanups.add(cleanup);
}

export function runCleanups(effect: Effect) {
  withEffect(undefined, () => {
    const context = getEffectContext(effect);
    const effectCleanups = context.cleanups;
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
      context.cleanups = undefined;
    }
  });
}
