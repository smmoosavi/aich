import {
  disposeEffect,
  getEffectContext,
  withEffect,
  type Effect,
  type EffectHandle,
} from './effect';
import { removeChildEffect } from './children';
import { getName } from './effect-name';

export type PinEffectFn<R = void> = () => Omit<EffectHandle<R>, 'pin'>;

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinnedEffects?: Map<string, Effect>;
    usedPinnedEffects?: Set<string>;
  }
}

export function createPinEffectFn<R>(
  fn: Effect<R>,
  parent: Effect | null,
  key: string,
  handle: Omit<EffectHandle<R>, 'pin'>,
): PinEffectFn<R> {
  return () => {
    pinEffect<R>(fn, parent, key);
    return handle;
  };
}

export function pinEffect<R>(
  fn: Effect<R>,
  parent: Effect | null,
  key: string,
): void {
  console.log('pinEffect', key);
  if (!parent) {
    return;
  }
  const parentContext = getEffectContext(parent);
  if (!parentContext.pinnedEffects) {
    parentContext.pinnedEffects = new Map();
  }
  parentContext.pinnedEffects.set(key, fn);
  if (!parentContext.usedPinnedEffects) {
    parentContext.usedPinnedEffects = new Set();
  }
  parentContext.usedPinnedEffects.add(key);
}

export function isEffectPinned(parent: Effect | null, key: string) {
  if (!parent) {
    return false;
  }
  const parentContext = getEffectContext(parent);
  return parentContext?.pinnedEffects?.has(key) ?? false;
}

export function disposeUnusedPinnedEffects(effect: Effect) {
  console.log('disposeUnusedPinnedEffects', getName(effect));
  const context = getEffectContext(effect);
  const pinnedEffect = context.pinnedEffects;
  const usedPinnedEffect = context.usedPinnedEffects ?? new Set();
  console.log('  pinnedEffect', pinnedEffect);
  console.log('  usedPinnedEffect', usedPinnedEffect);
  if (pinnedEffect && usedPinnedEffect) {
    for (const [key, child] of pinnedEffect) {
      if (!usedPinnedEffect.has(key)) {
        console.log('    disposing unused pinned effect', key, getName(child));
        pinnedEffect.delete(key);
        removeChildEffect(effect, child);
        disposeEffect(child, true);
      }
    }
    if (pinnedEffect.size === 0) {
      context.pinnedEffects = undefined;
    }
    context.usedPinnedEffects = undefined;
  }
}
