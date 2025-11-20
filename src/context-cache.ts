import type { PinKey } from './pin-key';
import type { EffectContext } from './effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    contextCache?: Map<PinKey, EffectContext>;
  }
}

export function getCachedContext(
  parent: EffectContext | undefined,
  key: PinKey,
): EffectContext | undefined {
  return parent?.contextCache?.get(key);
}

export function cacheContext(
  parent: EffectContext | undefined,
  key: PinKey,
  context: EffectContext,
) {
  if (!parent) {
    return;
  }
  if (!parent.contextCache) {
    parent.contextCache = new Map<PinKey, EffectContext>();
  }
  parent.contextCache.set(key, context);
}

export function removeCachedContext(parent: EffectContext, key: PinKey) {
  parent.contextCache?.delete(key);
}
