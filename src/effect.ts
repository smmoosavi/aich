import { addChildEffect, disposeChildEffects } from './children';
import { runCleanups } from './cleanup';
import { addChildCatch, catchError, disposeEffectCatch } from './on-error';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';

export type Effect = () => void;

export interface EffectContext {
  effect: Effect;
}

/** @internal */
declare module './root' {
  interface Root {
    currentEffect?: Effect | null;
    effectContext?: WeakMap<Effect, EffectContext>;
  }
}

export function getEffectContext(effect: Effect): EffectContext {
  const root = getRoot();
  if (!root.effectContext) {
    root.effectContext = new WeakMap();
  }
  let context = root.effectContext.get(effect);
  if (!context) {
    context = { effect };
    root.effectContext.set(effect, context);
  }
  return context;
}

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
