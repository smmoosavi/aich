import type { PinKey } from './pin-key';
import { type EffectContext } from './effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    usedEffects?: Set<PinKey>;
  }
}

export function markEffectAsUsed(parent: EffectContext, key: PinKey) {
  if (!parent.usedEffects) {
    parent.usedEffects = new Set<PinKey>();
  }
  parent.usedEffects.add(key);
}

export function isEffectUsed(parent: EffectContext, key: PinKey): boolean {
  return parent.usedEffects?.has(key) ?? false;
}

export function clearUsedEffects(context: EffectContext) {
  context.usedEffects = undefined;
}
