import { type EffectContext, getCurrentEffect } from './effect';
import { enqueue } from './queue';
import { getRoot } from './root';
import type { State } from './state';

/** @internal */
declare module './root' {
  interface Root {
    subs?: Subs;
  }
}

interface Subs {
  byEffect: WeakMap<EffectContext, Set<State<any>>>;
  byState: WeakMap<State<any>, Set<EffectContext>>;
}

export function getSubs(): Subs {
  const root = getRoot();
  if (!root.subs) {
    root.subs = {
      byEffect: new WeakMap(),
      byState: new WeakMap(),
    };
  }
  return root.subs;
}

export function register(state: State<any>) {
  const subs = getSubs();
  const effect = getCurrentEffect();
  if (effect) {
    let stateSet = subs.byEffect.get(effect);
    if (!stateSet) {
      stateSet = new Set();
      subs.byEffect.set(effect, stateSet);
    }
    stateSet.add(state);

    let effectSet = subs.byState.get(state);
    if (!effectSet) {
      effectSet = new Set();
      subs.byState.set(state, effectSet);
    }
    effectSet.add(effect);
  }
}

export function notify(state: State<any>) {
  const subs = getSubs();
  const effectSet = subs.byState.get(state);
  if (effectSet) {
    for (const effect of effectSet) {
      enqueue(effect);
    }
  }
}

export function clearEffectSubs(effect: EffectContext) {
  const subs = getSubs();
  const stateSet = subs.byEffect.get(effect);
  if (stateSet) {
    for (const state of stateSet) {
      const effectSet = subs.byState.get(state);
      if (effectSet) {
        effectSet.delete(effect);
        if (effectSet.size === 0) {
          subs.byState.delete(state);
        }
      }
    }
    subs.byEffect.delete(effect);
  }
}

export function untrack<T>(fn: () => T): T {
  const subs = getSubs();
  const originalByEffect = subs.byEffect;
  const originalByState = subs.byState;
  subs.byEffect = new WeakMap();
  subs.byState = new WeakMap();
  try {
    return fn();
  } finally {
    subs.byEffect = originalByEffect;
    subs.byState = originalByState;
  }
}
