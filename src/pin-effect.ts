import {
  getEffectContext,
  type Effect,
  type EffectHandle,
  disposeEffect,
} from './effect';
import type { PinKey } from './pin-key';
import { getChildEffect } from './children';
import { isEffectUsed } from './used-effect';

export type PinEffectFn<R = void> = () => Omit<EffectHandle<R>, 'pin'>;

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinnedEffects?: Set<PinKey>;
  }
}

export function createPinEffectFn<R>(
  fn: Effect<R>,
  parent: Effect | null,
  key: PinKey,
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
  key: PinKey,
): void {
  if (!parent) {
    return;
  }
  const parentContext = getEffectContext(parent);
  if (!parentContext.pinnedEffects) {
    parentContext.pinnedEffects = new Set();
  }
  parentContext.pinnedEffects.add(key);
}

export function isEffectPinned(parent: Effect | null, key: PinKey) {
  if (!parent) {
    return false;
  }
  const parentContext = getEffectContext(parent);
  return parentContext?.pinnedEffects?.has(key) ?? false;
}

export function disposeUnusedPinnedEffects(effect: Effect) {
  const context = getEffectContext(effect);
  const pinnedEffect = context.pinnedEffects;
  if (pinnedEffect) {
    for (const key of pinnedEffect) {
      if (!isEffectUsed(effect, key)) {
        pinnedEffect.delete(key);
        const childEffect = getChildEffect(effect, key);
        if (childEffect) {
          disposeEffect(childEffect, true);
        }
      }
    }
    if (pinnedEffect.size === 0) {
      context.pinnedEffects = undefined;
    }
  }
}
