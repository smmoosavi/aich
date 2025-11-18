import { addChildEffect, disposeChildEffects } from './children';
import { runCleanups } from './cleanup';
import {
  addChildCatch,
  catchError,
  disposeEffectCatch,
  type CatchFn,
} from './on-error';
import { cleanupUnusedPins } from './pin';
import { resetPinKey, type PinKey } from './pin-key';
import { pinKey } from './pin-key';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';
import {
  createPinEffectFn,
  disposeUnusedPinnedEffects,
  isEffectPinned,
  type PinEffectFn,
} from './pin-effect';
import { setName } from './debug';
import { clearUsedEffects, markEffectAsUsed } from './used-effect';
import {
  cacheContext,
  clearUnusedCachedContexts,
  getCachedContext,
} from './context-cache';

export type Effect<R = void> = () => R;
export type DisposeFn = () => void;
const EFFECT = Symbol('EFFECT');
export interface EffectHandle<R> {
  /** @internal */
  [EFFECT]: EffectContext<R>;
  pin: PinEffectFn<R>;
  dispose: DisposeFn;
  result: { current: R | undefined };
}

export interface EffectContext<R = unknown> {
  effect?: Effect<R>;
  catchFn?: CatchFn;
  key: PinKey;
  result: { current: R | undefined };
}

/** @internal */
declare module './root' {
  interface Root {
    currentContext?: EffectContext;
  }
}

export function getOrCreateEffectContext<R>(
  parent: EffectContext | undefined,
  effect: Effect<R> | CatchFn,
  key: PinKey,
): EffectContext<R> {
  parent && markEffectAsUsed(parent, key);
  if (parent) {
    const existingContext = getCachedContext(parent, key);
    if (existingContext) {
      existingContext.effect = isEffect(effect) ? effect : undefined;
      existingContext.catchFn = isEffect(effect) ? undefined : effect;
      return existingContext as EffectContext<R>;
    }
  }
  const context = {
    effect: isEffect(effect) ? effect : undefined,
    catchFn: isEffect(effect) ? undefined : effect,
    key,
    result: { current: undefined },
  };
  parent && cacheContext(parent, key, context);
  return context as EffectContext<R>;
}

function isEffect(effect: Effect | CatchFn): effect is Effect {
  return effect.length === 0;
}

export function getEffectFromHandle(
  handle: EffectHandle<any>,
): EffectContext<any> {
  return handle[EFFECT];
}

export function effect<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  const root = getRoot();
  const parentContext = root.currentContext;
  const effectKey = pinKey('EFFECT', key);
  const context = getOrCreateEffectContext(parentContext, fn, effectKey);
  setName(context, 'EF', key);
  const dispose = createDisposeFn(context);
  const pinHandle = { [EFFECT]: context, dispose, result: context.result };
  const pin = createPinEffectFn(parentContext, effectKey, pinHandle);
  const handle = { [EFFECT]: context, pin, dispose, result: context.result };

  if (!isEffectPinned(parentContext, effectKey)) {
    enqueue(context);
    parentContext && addChildEffect(parentContext, context, effectKey);
    parentContext && addChildCatch(parentContext, context);
  }
  return handle;
}

export function immediate<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  const root = getRoot();
  const parentEffect = root.currentContext;
  const effectKey = pinKey('EFFECT', key);
  const context = getOrCreateEffectContext(parentEffect, fn, effectKey);
  setName(context, 'IM', key);
  const dispose = createDisposeFn(context);
  const pinHandle = { [EFFECT]: context, dispose, result: context.result };
  const pin = createPinEffectFn(parentEffect, effectKey, pinHandle);
  const handle = { [EFFECT]: context, pin, dispose, result: context.result };

  if (!isEffectPinned(parentEffect, effectKey)) {
    enqueue(context);
    parentEffect && addChildEffect(parentEffect, context, effectKey);
    parentEffect && addChildCatch(parentEffect, context);
    runEffect(context);
  }
  return handle;
}

export function createDisposeFn(context: EffectContext): DisposeFn {
  const dispose = () => {
    disposeEffect(context, true);
  };
  return dispose;
}

export function disposeEffect(context: EffectContext, unmount: boolean) {
  dropEffect(context);
  disposeChildEffects(context, unmount);
  runCleanups(context);
  clearUnusedCachedContexts(context);
  clearEffectSubs(context);
  cleanupUnusedPins(context);
  clearUsedEffects(context);
  resetPinKey(context);
  disposeEffectCatch(context);
}

export function getCurrentEffect(): EffectContext | null {
  return getRoot().currentContext ?? null;
}

export function runEffect<R>(context: EffectContext<R>) {
  withEffect(context, () => {
    disposeEffect(context, false);
    context.result.current = context.effect?.();
    disposeUnusedPinnedEffects(context);
  });
}

export function withEffect(
  context: EffectContext | undefined,
  fn: () => void,
): void {
  const root = getRoot();
  const lastContext = root.currentContext;
  root.currentContext = context;
  try {
    fn();
  } catch (e) {
    catchError(e, context);
  } finally {
    root.currentContext = lastContext;
  }
}
