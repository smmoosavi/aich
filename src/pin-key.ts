import { getCurrentEffect, getEffectContext, type Effect } from './effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    pinIndex?: number;
  }
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

export function resetPinKeyIndex(effect: Effect): void {
  const context = getEffectContext(effect);
  context.pinIndex = undefined;
}

export function pinKey(prefix: string, key?: string | number): string {
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
