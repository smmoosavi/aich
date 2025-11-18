import { disposeEffect, type EffectContext, type EffectHandle } from './effect';
import type { PinKey } from './pin-key';
import { getChildContext } from './children';
import { isEffectUsed } from './used-effect';

export type PinEffectFn<R = void> = () => Omit<EffectHandle<R>, 'pin'>;

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinnedEffects?: Set<PinKey>;
  }
}

export function createPinEffectFn<R>(
  parentContext: EffectContext | undefined,
  key: PinKey,
  handle: Omit<EffectHandle<R>, 'pin'>,
): PinEffectFn<R> {
  return () => {
    pinEffect<R>(parentContext, key);
    return handle;
  };
}

export function pinEffect<R>(
  parentContext: EffectContext | undefined,
  key: PinKey,
): void {
  if (!parentContext) {
    return;
  }
  if (!parentContext.pinnedEffects) {
    parentContext.pinnedEffects = new Set();
  }
  parentContext.pinnedEffects.add(key);
}

export function isEffectPinned(parent: EffectContext | undefined, key: PinKey) {
  if (!parent) {
    return false;
  }
  return parent?.pinnedEffects?.has(key) ?? false;
}

export function disposeUnusedPinnedEffects(context: EffectContext) {
  const pinnedEffect = context.pinnedEffects;
  if (pinnedEffect) {
    for (const key of pinnedEffect) {
      if (!isEffectUsed(context, key)) {
        pinnedEffect.delete(key);
        const child = getChildContext(context, key);
        if (child) {
          disposeEffect(child, true);
        }
      }
    }
    if (pinnedEffect.size === 0) {
      context.pinnedEffects = undefined;
    }
  }
}
