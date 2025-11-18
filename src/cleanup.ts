import { setName } from './debug';
import {
  getCurrentEffect,
  getOrCreateEffectContext,
  withEffect,
  type Effect,
  type EffectContext,
} from './effect';
import { forEach } from './iter';
import { addChildCatch, catchError } from './on-error';
import { pinKey } from './pin-key';

/** @internal */
declare module './effect' {
  interface EffectContext {
    cleanups?: Set<EffectContext>;
  }
}

export function cleanup(effect: Effect, key?: string | number): void {
  const parent = getCurrentEffect();
  if (!parent) {
    throw new Error('cleanup() must be called within an executing effect');
  }
  const context = getOrCreateEffectContext(parent, effect, pinKey('CLEANUP'));
  setName(context, 'CL', key);
  addCleanupEffect(parent, context);
}

export function getCleanups(context: EffectContext): Set<EffectContext> {
  if (!context.cleanups) {
    context.cleanups = new Set();
  }
  return context.cleanups;
}

export function addCleanupEffect(
  parent: EffectContext,
  cleanup: EffectContext,
) {
  addChildCatch(parent, cleanup);
  const cleanups = getCleanups(parent);
  cleanups.add(cleanup);
}

export function runCleanups(context: EffectContext) {
  withEffect(undefined, () => {
    const effectCleanups = context.cleanups;
    try {
      if (effectCleanups) {
        forEach(Array.from(effectCleanups).reverse(), (cleanup) => {
          effectCleanups.delete(cleanup);
          try {
            cleanup.effect?.();
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
