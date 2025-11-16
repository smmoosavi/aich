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

export type Effect<R = void> = () => R;
export type DisposeFn = () => void;
const EFFECT = Symbol('EFFECT');
export interface EffectHandle<R> {
  /** @internal */
  [EFFECT]: Effect<R>;
  pin: PinEffectFn<R>;
  dispose: DisposeFn;
  result: { current: R | undefined };
}

export interface EffectContext<R = unknown> {
  effect: Effect<R> | CatchFn;
  key: PinKey;
  result: { current: R | undefined };
}

/** @internal */
declare module './root' {
  interface Root {
    currentEffect?: Effect | null;
    effectContext?: WeakMap<Effect | CatchFn, EffectContext>;
  }
}

export function getOrCreateEffectContext<R>(
  effect: Effect<R> | CatchFn,
  key: PinKey,
): EffectContext<R> {
  const root = getRoot();
  if (!root.effectContext) {
    root.effectContext = new WeakMap();
  }
  let context = root.effectContext.get(effect);
  if (!context) {
    context = { effect, key, result: { current: undefined } };
    root.effectContext.set(effect, context);
  }
  return context as EffectContext<R>;
}

export function getEffectContext<R>(
  effect: Effect<R> | CatchFn,
): EffectContext<R> {
  const root = getRoot();
  let context = root.effectContext?.get(effect);
  if (!context) {
    throw new Error('Effect context not found');
  }

  return context as EffectContext<R>;
}

export function getEffectFromHandle(handle: EffectHandle<any>): Effect<any> {
  return handle[EFFECT];
}

export function effect<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  setName(fn, 'EF', key);
  const root = getRoot();
  const parentEffect = root.currentEffect ?? null;
  const effectKey = pinKey('EFFECT', key);
  const context = getOrCreateEffectContext(fn, effectKey);
  const dispose = createDisposeFn(fn);
  const pinHandle = { [EFFECT]: fn, dispose, result: context.result };
  const pin = createPinEffectFn(fn, parentEffect, effectKey, pinHandle);
  const handle = { [EFFECT]: fn, pin, dispose, result: context.result };
  parentEffect && markEffectAsUsed(parentEffect, effectKey);

  if (!isEffectPinned(parentEffect, effectKey)) {
    enqueue(fn);
    parentEffect && addChildEffect(parentEffect, fn, effectKey);
    parentEffect && addChildCatch(parentEffect, fn);
  }
  return handle;
}

export function immediate<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  setName(fn, 'IM', key);
  const root = getRoot();
  const parentEffect = root.currentEffect ?? null;
  const effectKey = pinKey('EFFECT', key);
  const context = getOrCreateEffectContext(fn, effectKey);
  const dispose = createDisposeFn(fn);
  const pinHandle = { [EFFECT]: fn, dispose, result: context.result };
  const pin = createPinEffectFn(fn, parentEffect, effectKey, pinHandle);
  const handle = { [EFFECT]: fn, pin, dispose, result: context.result };
  parentEffect && markEffectAsUsed(parentEffect, effectKey);

  if (!isEffectPinned(parentEffect, effectKey)) {
    enqueue(fn);
    parentEffect && addChildEffect(parentEffect, fn, effectKey);
    parentEffect && addChildCatch(parentEffect, fn);
    runEffect(fn);
  }
  return handle;
}

export function createDisposeFn(effect: Effect): DisposeFn {
  const dispose = () => {
    disposeEffect(effect, true);
  };
  return dispose;
}

export function disposeEffect(effect: Effect, unmount: boolean) {
  dropEffect(effect);
  disposeChildEffects(effect, unmount);
  runCleanups(effect);
  clearEffectSubs(effect);
  cleanupUnusedPins(effect);
  clearUsedEffects(effect);
  resetPinKey(effect);
  disposeEffectCatch(effect);
}

export function getCurrentEffect(): Effect | null {
  return getRoot().currentEffect ?? null;
}

export function runEffect<R>(effect: Effect<R>) {
  withEffect(effect, () => {
    disposeEffect(effect, false);
    const context = getEffectContext(effect);
    context.result.current = effect();
    disposeUnusedPinnedEffects(effect);
  });
}

export function withEffect(effect: Effect | undefined, fn: () => void): void {
  const root = getRoot();
  const lastEffect = root.currentEffect;
  root.currentEffect = effect;
  try {
    fn();
  } catch (e) {
    catchError(e, effect);
  } finally {
    root.currentEffect = lastEffect;
  }
}
