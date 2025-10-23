import { addChildEffect, disposeChildEffects } from './children';
import { runCleanups } from './cleanup';
import { addChildCatch, catchError, disposeEffectCatch } from './on-error';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';

/** @internal */
declare module './root' {
  interface Root {
    currentEffect?: Effect | null;
    effectsByDispose?: WeakMap<() => void, Effect>;
  }
}

export type Effect = () => void;

export function effect(fn: Effect) {
  const root = getRoot();
  enqueue(fn);
  root.currentEffect && addChildEffect(root.currentEffect, fn);
  root.currentEffect && addChildCatch(root.currentEffect, fn);
  return addEffectDispose(fn);
}

export function immediate(fn: Effect) {
  const root = getRoot();
  enqueue(fn);
  root.currentEffect && addChildEffect(root.currentEffect, fn);
  root.currentEffect && addChildCatch(root.currentEffect, fn);
  runEffect(fn);  
  return addEffectDispose(fn);
}

export function addEffectDispose(effect: Effect) {
  const dispose = () => {
    disposeEffect(effect);
  };
  const root = getRoot();
  if (!root.effectsByDispose) {
    root.effectsByDispose = new WeakMap();
  }
  root.effectsByDispose.set(dispose, effect);
  return dispose;
}

export function disposeEffect(effect: Effect) {
  dropEffect(effect);
  disposeChildEffects(effect);
  runCleanups(effect);
  clearEffectSubs(effect);
  disposeEffectCatch(effect);
}

export function getCurrentEffect(): Effect | null {
  return getRoot().currentEffect ?? null;
}

export function runEffect(effect: Effect) {
  withEffect(effect, () => {
    disposeEffect(effect);
    effect();
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
