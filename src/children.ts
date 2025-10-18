import { disposeEffect, type Effect } from './effect';
import { getRoot } from './root';

declare module './root' {
  interface Root {
    effectChildren?: WeakMap<Effect, Set<Effect>>;
  }
}

export function getEffectChildren(): WeakMap<Effect, Set<Effect>> {
  const root = getRoot();
  if (!root.effectChildren) {
    root.effectChildren = new WeakMap();
  }
  return root.effectChildren;
}

export function addChildEffect(parent: Effect, child: Effect) {
  const children = getEffectChildren();
  let childSet = children.get(parent);
  if (!childSet) {
    childSet = new Set();
    children.set(parent, childSet);
  }
  childSet.add(child);
}

export function disposeChildEffects(parent: Effect) {
  const children = getEffectChildren();
  const childSet = children.get(parent);
  if (childSet) {
    Array.from(childSet)
      .reverse()
      .forEach((child) => {
        childSet.delete(child);
        disposeEffect(child);
      });
    if (childSet.size === 0) {
      children.delete(parent);
    }
  }
}
