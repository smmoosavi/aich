import {
  disposeEffect,
  getEffectContext,
  type Effect,
  type EffectHandle,
} from './effect';

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
  if (!parent) {
    return;
  }
  const parentContext = getEffectContext(parent);
  if (!parentContext.pinnedEffects) {
    parentContext.pinnedEffects = new Map();
  }
  if (!parentContext.usedPinnedEffects) {
    parentContext.usedPinnedEffects = new Set();
  }
  if (!parentContext.pinnedEffects.has(key)) {
    parentContext.pinnedEffects.set(key, fn);
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
  const context = getEffectContext(effect);
  const pinnedEffect = context.pinnedEffects;
  const usedPinnedEffect = context.usedPinnedEffects ?? new Set();
  if (pinnedEffect) {
    for (const [key, child] of pinnedEffect) {
      if (!usedPinnedEffect.has(key)) {
        pinnedEffect.delete(key);
        disposeEffect(child, true);
      }
    }
    if (pinnedEffect.size === 0) {
      context.pinnedEffects = undefined;
    }
    context.usedPinnedEffects = undefined;
  }
}
