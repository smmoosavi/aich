import { disposeEffect, type EffectContext } from './effect';
import { isEffectPinned } from './pin-effect';
import type { PinKey } from './pin-key';
import { isEffectUsed } from './used-effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    children?: Map<PinKey, EffectContext>;
  }
}

export function getEffectChildren(
  context: EffectContext,
): Map<PinKey, EffectContext> {
  if (!context.children) {
    context.children = new Map();
  }
  return context.children;
}

export function addChildEffect(
  parent: EffectContext,
  child: EffectContext,
  key: PinKey,
) {
  const children = getEffectChildren(parent);
  children.set(key, child);
}

export function getChildContext(
  parent: EffectContext,
  key: PinKey,
): EffectContext | undefined {
  return parent.children?.get(key);
}

export function disposeChildEffects(parent: EffectContext, unmount: boolean) {
  const childMap = parent.children;
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
      parent.children = undefined;
    }
  }
}
