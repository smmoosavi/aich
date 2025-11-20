import type { PinKey } from './pin-key';
import { type EffectContext, removeEffect } from './effect';
import { getEffectChildren } from './children';

/** @internal */
declare module './effect' {
  interface EffectContext {
    usedEffects?: Set<PinKey>;
  }
}

export function markEffectAsUsed(
  parent: EffectContext | undefined,
  key: PinKey,
) {
  if (!parent) {
    return;
  }
  if (!parent.usedEffects) {
    parent.usedEffects = new Set<PinKey>();
  }
  parent.usedEffects.add(key);
}

export function isEffectUsed(parent: EffectContext, key: PinKey): boolean {
  return parent.usedEffects?.has(key) ?? false;
}

export function removeEffectFromUsed(parent: EffectContext, key: PinKey) {
  parent.usedEffects?.delete(key);
}

export function removeUnusedEffects(context: EffectContext) {
  const childKeys = Array.from(getEffectChildren(context)).reverse();
  for (const [key] of childKeys) {
    if (!isEffectUsed(context, key)) {
      removeEffect(context, key);
    }
  }
}

export function clearUsedEffects(context: EffectContext) {
  context.usedEffects = undefined;
}
