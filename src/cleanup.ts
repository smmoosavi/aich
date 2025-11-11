import {
  getCurrentEffect,
  getEffectContext,
  getOrCreateEffectContext,
  withEffect,
  type Effect,
} from './effect';
import { getName } from './effect-name';
import { forEach } from './iter';
import { addChildCatch, catchError } from './on-error';

/** @internal */
declare module './effect' {
  interface EffectContext {
    cleanups?: Set<Effect>;
  }
}

export function cleanup(effect: Effect): void {
  getName(effect, 'CL');
  const parent = getCurrentEffect();
  if (!parent) {
    throw new Error('cleanup() must be called within an executing effect');
  }
  getOrCreateEffectContext(effect, '__AICH_CLEANUP__');
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
  console.log(
    '++++ addCleanupEffect',
    getName(parent),
    'cleanup:',
    getName(cleanup),
    'total:',
    cleanups.size,
  );
}

export function runCleanups(effect: Effect) {
  withEffect(undefined, () => {
    const context = getEffectContext(effect);
    const effectCleanups = context.cleanups;
    console.log('....runCleanups', getName(effect), effectCleanups);
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
      console.log('---- clearing cleanups for', getName(effect));
      context.cleanups = undefined;
    }
  });
}
