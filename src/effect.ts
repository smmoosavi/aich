import { addChildEffect, disposeChildEffects } from './children';
import { runCleanups } from './cleanup';
import { addChildCatch, catchError, disposeEffectCatch } from './on-error';
import { cleanupUnusedPins } from './pin';
import { resetPinKeyIndex } from './pin-key';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';

export type Effect<R = void> = () => R;
export type Dispose = () => void;
export interface EffectHandle<R> {
  dispose: Dispose;
  result: { current: R | undefined };
}

export interface EffectContext<R = unknown> {
  effect: Effect<R>;
  result: { current: R | undefined };
}

/** @internal */
declare module './root' {
  interface Root {
    currentEffect?: Effect | null;
    effectContext?: WeakMap<Effect, EffectContext>;
  }
}

export function getEffectContext<R>(effect: Effect<R>): EffectContext<R> {
  const root = getRoot();
  if (!root.effectContext) {
    root.effectContext = new WeakMap();
  }
  let context = root.effectContext.get(effect);
  if (!context) {
    context = { effect, result: { current: undefined } };
    root.effectContext.set(effect, context);
  }
  return context as EffectContext<R>;
}

export function effect<R>(fn: Effect<R>): EffectHandle<R> {
  const root = getRoot();
  enqueue(fn);
  root.currentEffect && addChildEffect(root.currentEffect, fn);
  root.currentEffect && addChildCatch(root.currentEffect, fn);
  const dispose = addEffectDispose(fn);
  const context = getEffectContext(fn);
  return { dispose, result: context.result };
}

export function immediate<R>(fn: Effect<R>): EffectHandle<R> {
  const root = getRoot();
  enqueue(fn);
  root.currentEffect && addChildEffect(root.currentEffect, fn);
  root.currentEffect && addChildCatch(root.currentEffect, fn);
  runEffect(fn);
  const dispose = addEffectDispose(fn);
  const context = getEffectContext(fn);
  return { dispose, result: context.result };
}

export function addEffectDispose(effect: Effect): Dispose {
  const dispose = () => {
    disposeEffect(effect);
  };
  return dispose;
}

export function disposeEffect(effect: Effect) {
  dropEffect(effect);
  disposeChildEffects(effect);
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
    disposeEffect(effect);
    const context = getEffectContext(effect);
    context.result.current = effect();
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
