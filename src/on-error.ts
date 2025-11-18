import { setName } from './debug';
import {
  getCurrentEffect,
  getOrCreateEffectContext,
  type EffectContext,
} from './effect';
import { pinKey } from './pin-key';

/** @internal */
declare module './effect' {
  interface EffectContext {
    catch?: Catch;
  }
}

export interface Catch {
  catchFn: CatchFn;
  // context created for catch function
  catchFnContext: EffectContext;
  // effect that catch is applied to
  effect: EffectContext;
  // effect that onError defined in. it may be the same effect or ancestor effect
  onErrorEffect: EffectContext;
  lastCatch?: Catch;
}

export interface CatchFn {
  (e: any): void;
}

export function onError(catchFn: CatchFn, key?: string | number) {
  const effect = getCurrentEffect();
  if (!effect) {
    throw new Error('onError() must be called within an executing effect');
  }
  const context = getOrCreateEffectContext(effect, catchFn, pinKey('ON_ERROR'));
  setName(context, 'CATCH', key);
  addChildCatch(effect, context);
  addCatch(catchFn, context, effect);
}

export function addCatch(
  catchFn: CatchFn,
  catchFnContext: EffectContext,
  effectContext: EffectContext,
) {
  const lastCatch = effectContext.catch;
  const c = {
    catchFn,
    catchFnContext,
    effect: effectContext,
    onErrorEffect: effectContext,
    lastCatch,
  };
  effectContext.catch = c;
  return c;
}

/**
 * add parent effect catch to child effect as default catch
 * @param parent
 * @param child
 */
export function addChildCatch(parent: EffectContext, child: EffectContext) {
  const parentCatch = parent.catch;
  if (parentCatch) {
    let lastCatch: Catch | undefined = undefined;
    if (parentCatch.onErrorEffect === parent) {
      lastCatch = parentCatch.lastCatch;
    }
    const c = {
      catchFn: parentCatch.catchFn,
      catchFnContext: parentCatch.catchFnContext,
      effect: child,
      onErrorEffect: parentCatch.onErrorEffect,
      lastCatch,
    };
    child.catch = c;
    return c;
  } else {
  }
}

export function disposeEffectCatch(context: EffectContext) {
  const c = context.catch;
  if (c && c.onErrorEffect === context) {
    context.catch = undefined;
  }
}

export function catchError(e: any, context?: EffectContext) {
  if (context) {
    let c = context.catch;
    while (c) {
      try {
        c.catchFn(e);
        return;
      } catch (ne) {
        const catchContext = c.catchFnContext;
        c = catchContext.catch;
        e = ne;
      }
    }
  }
  throw e;
}
