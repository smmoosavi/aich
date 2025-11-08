import type { Branded } from './brand';
import { getCurrentEffect, getEffectContext, type Effect } from './effect';

export type PinKey = Branded<string, 'pin-key'>;

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinIndex?: number;
    definedKeys?: Set<PinKey>;
  }
}

export function getDefinedPinKeys(effect: Effect): Set<PinKey> {
  const context = getEffectContext(effect);
  if (!context.definedKeys) {
    context.definedKeys = new Set();
  }
  return context.definedKeys;
}

export function nextPinKeyIndex(effect: Effect | null): number {
  if (!effect) {
    return -1;
  }
  const context = getEffectContext(effect);
  if (context.pinIndex === undefined) {
    context.pinIndex = 0;
  }
  return context.pinIndex++;
}

export function resetPinKey(effect: Effect): void {
  const context = getEffectContext(effect);
  context.pinIndex = undefined;
  context.definedKeys = undefined;
}

function _pinKey(prefix: string, key?: string | number): string {
  if (key === undefined) {
    const effect = getCurrentEffect();
    key = nextPinKeyIndex(effect);
    return `${prefix}:i:${key}`;
  }
  if (typeof key === 'number') {
    return `${prefix}:n:${key}`;
  }
  return `${prefix}:s:${key}`;
}

export function pinKey(prefix: string, key?: string | number): PinKey {
  const prefixedKey = _pinKey(prefix, key) as PinKey;
  const effect = getCurrentEffect();
  if (effect) {
    const definedKeys = getDefinedPinKeys(effect);
    if (definedKeys.has(prefixedKey)) {
      throw new Error(
        `Duplicate ${prefix} key. Key "${key}" has already been used in this effect.`,
      );
    }
    definedKeys.add(prefixedKey);
  }
  return prefixedKey;
}
