import { disposeEffect, getEffectContext, type Effect } from './effect';
import { isEffectPinned } from './pin-effect';
import type { PinKey } from './pin-key';
import { isEffectUsed } from './used-effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    children?: Map<PinKey, Effect>;
  }
}

export function getEffectChildren(effect: Effect): Map<PinKey, Effect> {
  const context = getEffectContext(effect);
  if (!context.children) {
    context.children = new Map();
  }
  return context.children;
}

export function addChildEffect(parent: Effect, child: Effect, key: PinKey) {
  const children = getEffectChildren(parent);
  children.set(key, child);
}

export function getChildEffect(
  parent: Effect,
  key: PinKey,
): Effect | undefined {
  const context = getEffectContext(parent);
  return context.children?.get(key);
}

export function disposeChildEffects(parent: Effect, unmount: boolean) {
  const context = getEffectContext(parent);
  const childMap = context.children;
  if (childMap) {
    Array.from(childMap.entries())
      .reverse()
      .forEach(([childKey, child]) => {
        if (!unmount && isEffectPinned(parent, childKey)) {
          return;
        }
        if (!isEffectUsed(parent, childKey)) {
          childMap.delete(childKey);
        }
        disposeEffect(child, unmount);
      });
    if (childMap.size === 0) {
      context.children = undefined;
    }
  }
}
