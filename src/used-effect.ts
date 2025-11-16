import type { PinKey } from './pin-key';
import { type Effect, getEffectContext } from './effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    usedEffects?: Set<PinKey>;
  }
}

export function markEffectAsUsed(parent: Effect, key: PinKey) {
  const context = getEffectContext(parent);
  if (!context.usedEffects) {
    context.usedEffects = new Set<PinKey>();
  }
  context.usedEffects.add(key);
}

export function isEffectUsed(parent: Effect, key: PinKey): boolean {
  const context = getEffectContext(parent);
  return context.usedEffects?.has(key) ?? false;
}

export function clearUsedEffects(effect: Effect) {
  const context = getEffectContext(effect);
  context.usedEffects = undefined;
}
