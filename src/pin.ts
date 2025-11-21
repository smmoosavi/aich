import type { Branded } from './brand';
import { type EffectContext, getCurrentEffect } from './effect';
import { type PinKey } from './pin-key';

type Pinned<T> = Branded<T, 'pinned'>;

interface PinContext {
  byKey: Map<PinKey, Pinned<any>>;
  accessedKeys: Set<PinKey>;
}

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinContext?: PinContext;
  }
}

function getPinContext(context: EffectContext): PinContext {
  if (!context.pinContext) {
    context.pinContext = {
      byKey: new Map(),
      accessedKeys: new Set(),
    };
  }
  return context.pinContext;
}

export function getPinnedValueOrElse<T>(
  effectContext: EffectContext,
  key: PinKey,
  init: () => T,
): T {
  const pinContext = getPinContext(effectContext);
  const accessedKeys = pinContext.accessedKeys;
  accessedKeys.add(key);
  if (pinContext.byKey.has(key)) {
    const value = pinContext.byKey.get(key)!;
    return value as T;
  }
  const newValue = init();
  const pinnedValue = newValue as Pinned<T>;
  pinContext.byKey.set(key, pinnedValue);

  return newValue;
}

export function pin<T>(init: () => T, key: PinKey): Pinned<T> {
  const effect = getCurrentEffect();
  if (!effect) {
    return init() as Pinned<T>;
  }
  return getPinnedValueOrElse(effect, key, init) as Pinned<T>;
}

export function cleanupUnusedPins(effectContext: EffectContext): void {
  const pinContext = getPinContext(effectContext);
  const accessedKeys = pinContext.accessedKeys;
  const keysToDelete: PinKey[] = [];

  for (const [key] of pinContext.byKey) {
    // Keep the pin if it was accessed
    if (!accessedKeys.has(key)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    pinContext.byKey.delete(key);
  }

  // Clear accessed keys for next run
  accessedKeys.clear();
}
