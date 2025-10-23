import { addChildEffect, disposeChildEffects } from './children';
import { runCleanups } from './cleanup';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';

/** @internal */
declare module './root' {
  interface Root {
    currentEffect?: Effect | null;
  }
}

export type Effect = () => void;

export function effect(fn: Effect) {
  const root = getRoot();
  enqueue(fn);
  root.currentEffect && addChildEffect(root.currentEffect, fn);
  return () => {
    disposeEffect(fn);
  };
}

export function immediate(fn: Effect) {
  const root = getRoot();
  enqueue(fn);
  root.currentEffect && addChildEffect(root.currentEffect, fn);
  runEffect(fn);
  return () => {
    disposeEffect(fn);
  };
}

export function disposeEffect(effect: Effect) {
  dropEffect(effect);
  disposeChildEffects(effect);
  runCleanups(effect);
  clearEffectSubs(effect);
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

export function withEffect<T>(effect: Effect | undefined, fn: () => T): T {
  const root = getRoot();
  const lastEffect = root.currentEffect;
  root.currentEffect = effect;
  try {
    return fn();
  } finally {
    root.currentEffect = lastEffect;
  }
}
