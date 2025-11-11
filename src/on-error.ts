import {
  getCurrentEffect,
  getEffectContext,
  getOrCreateEffectContext,
  type Effect,
} from './effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    catch?: Catch;
  }
}

export interface Catch {
  catchFn: CatchFn;
  // effect that catch is applied to
  effect: Effect | CatchFn;
  // effect that onError defined in. it may be the same as effect or ancestor effect
  onErrorEffect: Effect;
  lastCatch?: Catch;
}

export interface CatchFn {
  (e: any): void;
}

export function onError(catchFn: CatchFn) {
  getOrCreateEffectContext(catchFn as any as Effect);
  const effect = getCurrentEffect();
  if (!effect) {
    throw new Error('onError() must be called within an executing effect');
  }
  addChildCatch(effect, catchFn);
  addCatch(catchFn, effect);
}

export function addCatch(catchFn: CatchFn, effect: Effect) {
  const context = getEffectContext(effect);
  const lastCatch = context.catch;
  const c = {
    catchFn,
    effect,
    onErrorEffect: effect,
    lastCatch,
  };
  context.catch = c;
  return c;
}

/**
 * add parent effect catch to child effect as default catch
 * @param parent
 * @param child
 */
export function addChildCatch(parent: Effect, child: Effect | CatchFn) {
  const parentContext = getEffectContext(parent);
  const parentCatch = parentContext.catch;
  if (parentCatch) {
    let lastCatch: Catch | undefined = undefined;
    if (parentCatch.onErrorEffect === parent) {
      lastCatch = parentCatch.lastCatch;
    }
    const c = {
      catchFn: parentCatch.catchFn,
      effect: child,
      onErrorEffect: parentCatch.onErrorEffect,
      lastCatch,
    };
    const childContext = getEffectContext(child as Effect);
    childContext.catch = c;
    return c;
  } else {
  }
}

export function disposeEffectCatch(effect: Effect) {
  const context = getEffectContext(effect);
  const c = context.catch;
  if (c && c.onErrorEffect === effect) {
    context.catch = undefined;
  }
}

export function catchError(e: any, effect?: Effect | CatchFn) {
  if (effect) {
    const context = getEffectContext(effect as Effect);
    let c = context.catch;
    while (c) {
      try {
        c.catchFn(e);
        return;
      } catch (ne) {
        const catchContext = getEffectContext(c.catchFn as any as Effect);
        c = catchContext.catch;
        e = ne;
        // catchError(ne, c.catchFn);
      }
    }
  }
  throw e;
}
