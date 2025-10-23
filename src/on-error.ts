import { getCurrentEffect, type Effect } from './effect';
import { getRoot } from './root';

/** @internal */
declare module './root' {
  interface Root {
    catches?: Catches;
  }
}

export interface Catches {
  byEffect: WeakMap<Effect | CatchFn, Catch>;
  byFn: WeakMap<CatchFn, Catch>;
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
  const effect = getCurrentEffect();
  if (!effect) {
    throw new Error('onError() must be called within an executing effect');
  }
  addChildCatch(effect, catchFn);
  addCatch(catchFn, effect);
}

export function addCatch(catchFn: CatchFn, effect: Effect) {
  const catches = getCatches();
  const lastCatch = catches.byEffect.get(effect);
  const c = {
    catchFn,
    effect,
    onErrorEffect: effect,
    lastCatch,
  };
  catches.byEffect.set(effect, c);
  catches.byFn.set(catchFn, c);
  return c;
}

/**
 * add parent effect catch to child effect as default catch
 * @param parent
 * @param child
 */
export function addChildCatch(parent: Effect, child: Effect | CatchFn) {
  const catches = getCatches();
  const parentCatch = catches.byEffect.get(parent);
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
    catches.byEffect.set(child, c);
    catches.byFn.set(c.catchFn, c);
    return c;
  } else {
  }
}

export function getCatches(): Catches {
  const root = getRoot();
  if (!root.catches) {
    root.catches = {
      byEffect: new WeakMap(),
      byFn: new WeakMap(),
    };
  }
  return root.catches;
}

export function disposeEffectCatch(effect: Effect) {
  const catches = getCatches();
  const c = catches.byEffect.get(effect);
  if (c && c.onErrorEffect === effect) {
    catches.byEffect.delete(c.effect);
    catches.byFn.delete(c.catchFn);
  }
}

export function catchError(e: any, effect?: Effect | CatchFn) {
  if (effect) {
    const catches = getCatches();
    let c = catches.byEffect.get(effect);
    while (c) {
      try {
        c.catchFn(e);
        return;
      } catch (ne) {
        c = catches.byEffect.get(c.catchFn);
        e = ne;
        // catchError(ne, c.catchFn);
      }
    }
  }
  throw e;
}
