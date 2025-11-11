import { disposeEffect, getEffectContext, type Effect } from './effect';
import { isEffectPinned } from './pin-effect';

/** @internal */
declare module './effect' {
  interface EffectContext {
    children?: Set<Effect>;
  }
}

export function getEffectChildren(effect: Effect): Set<Effect> {
  const context = getEffectContext(effect);
  if (!context.children) {
    context.children = new Set();
  }
  return context.children;
}

export function addChildEffect(parent: Effect, child: Effect) {
  const children = getEffectChildren(parent);
  children.add(child);
}

export function disposeChildEffects(parent: Effect, unmount: boolean) {
  const context = getEffectContext(parent);
  const childSet = context.children;
  if (childSet) {
    Array.from(childSet)
      .reverse()
      .forEach((child) => {
        const childContext = getEffectContext(child);
        const childKey = childContext.effectPinKey;
        if (!unmount && isEffectPinned(parent, childKey)) {
          return;
        }
        childSet.delete(child);
        disposeEffect(child, unmount);
      });
    if (childSet.size === 0) {
      context.children = undefined;
    }
  }
}
