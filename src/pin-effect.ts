import { type EffectContext, type EffectHandle } from './effect';
import type { PinKey } from './pin-key';

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

export function removePinnedEffect(parentContext: EffectContext, key: PinKey) {
  parentContext.pinnedEffects?.delete(key);
}
