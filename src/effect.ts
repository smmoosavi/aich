import { addChildEffect, disposeChildEffects } from './children';
import { runCleanups } from './cleanup';
import { addChildCatch, catchError, disposeEffectCatch } from './on-error';
import { cleanupUnusedPins } from './pin';
import { pinKey, resetPinKeyIndex } from './pin-key';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';
import {
  createPinEffectFn,
  disposeUnusedPinnedEffects,
  isEffectPinned,
  type PinEffectFn,
} from './pin-effect';
import { getName } from './effect-name';

export type Effect<R = void> = () => R;
export type DisposeFn = () => void;
export interface EffectHandle<R> {
  pin: PinEffectFn<R>;
  dispose: DisposeFn;
  result: { current: R | undefined };
}

export interface EffectContext<R = unknown> {
  effect: Effect<R>;
  effectPinKey: string;
  result: { current: R | undefined };
}

/** @internal */
declare module './root' {
  interface Root {
    currentEffect?: Effect | null;
    effectContext?: WeakMap<Effect, EffectContext>;
  }
}

export function getOrCreateEffectContext<R>(
  effect: Effect<R>,
  key: string,
): EffectContext<R> {
  const root = getRoot();
  if (!root.effectContext) {
    root.effectContext = new WeakMap();
  }
  let context = root.effectContext.get(effect);
  if (!context) {
    context = { effect, effectPinKey: key, result: { current: undefined } };
    root.effectContext.set(effect, context);
  }
  return context as EffectContext<R>;
}

export function getEffectContext<R>(effect: Effect<R>): EffectContext<R> {
  const root = getRoot();
  let context = root.effectContext?.get(effect);
  if (!context) {
    throw new Error('Effect context not found');
  }

  return context as EffectContext<R>;
}

export function effect<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  getName(effect, 'EF')
  const root = getRoot();
  const parentEffect = root.currentEffect ?? null;
  const effectKey = pinKey('__AICH_EFFECT__', key);
  const context = getOrCreateEffectContext(fn, effectKey);
  const dispose = createDisposeFn(fn);
  const pinHandle = { dispose, result: context.result };
  const pin = createPinEffectFn(fn, parentEffect, effectKey, pinHandle);
  const handle = { pin, dispose, result: context.result };

  if (!isEffectPinned(parentEffect, effectKey)) {
    enqueue(fn);
    parentEffect && addChildEffect(parentEffect, fn);
    parentEffect && addChildCatch(parentEffect, fn);
  }
  return handle;
}

export function immediate<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  getName(effect, 'IM')
  const root = getRoot();
  const parentEffect = root.currentEffect ?? null;
  const effectKey = pinKey('__AICH_EFFECT__', key);
  const context = getOrCreateEffectContext(fn, effectKey);
  const dispose = createDisposeFn(fn);
  const pinHandle = { dispose, result: context.result };
  const pin = createPinEffectFn(fn, parentEffect, effectKey, pinHandle);
  const handle = { pin, dispose, result: context.result };

  if (!isEffectPinned(parentEffect, effectKey)) {
    enqueue(fn);
    parentEffect && addChildEffect(parentEffect, fn);
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
  console.log('disposeEffect', getName(effect), unmount);
  dropEffect(effect);
  disposeChildEffects(effect, unmount);
  runCleanups(effect);
  clearEffectSubs(effect);
  cleanupUnusedPins(effect);
  resetPinKeyIndex(effect);
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
