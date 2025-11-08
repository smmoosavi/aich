import type { Branded } from './brand';
import { getCurrentEffect, getEffectContext, type Effect } from './effect';

type Pinned<T> = Branded<T, 'pinned'>;

interface PinContext {
  byKey: Map<string, Pinned<any>>;
  accessedKeys: Set<string>;
  stickyKeys: Set<string>;
}

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinContext?: PinContext;
  }
}

function getPinContext(effect: Effect): PinContext {
  const context = getEffectContext(effect);
  if (!context.pinContext) {
    context.pinContext = {
      byKey: new Map(),
      accessedKeys: new Set(),
      stickyKeys: new Set(),
    };
  }
  return context.pinContext;
}

export function getPinnedValueOrElse<T>(
  effect: Effect,
  key: string,
  init: () => T,
): T {
  const pinContext = getPinContext(effect);
  pinContext.accessedKeys.add(key);
  if (pinContext.byKey.has(key)) {
    const value = pinContext.byKey.get(key)!;
    return value as T;
  }
  const newValue = init();
  const pinnedValue = newValue as Pinned<T>;
  pinContext.byKey.set(key, pinnedValue);

  return newValue;
}

export function pin<T>(init: () => T, key: string): Pinned<T> {
  const effect = getCurrentEffect();
  if (!effect) {
    return init() as Pinned<T>;
  }
  return getPinnedValueOrElse(effect, key, init) as Pinned<T>;
}

export function cleanupUnusedPins(effect: Effect): void {
  const pinContext = getPinContext(effect);
  const keysToDelete: string[] = [];

  for (const [key] of pinContext.byKey) {
    // Keep the pin if it was accessed or is sticky
    if (!pinContext.accessedKeys.has(key) && !pinContext.stickyKeys.has(key)) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    pinContext.byKey.delete(key);
  }

  // Clear accessed keys for next run
  pinContext.accessedKeys.clear();
}

export function unpin(key: string): void {
  const effect = getCurrentEffect();
  if (effect) {
    const pinContext = getPinContext(effect);
    const value = pinContext.byKey.get(key);
    if (value) {
      pinContext.byKey.delete(key);
    }
  }
}

export function sticky<P extends Pinned<any>>(key: string): void {
  const effect = getCurrentEffect();
  if (effect) {
    const pinContext = getPinContext(effect);
    const value = pinContext.byKey.get(key);
    if (value) {
      pinContext.stickyKeys.add(key);
    }
  }
}
