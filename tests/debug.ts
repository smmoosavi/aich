import { withEffect, type Effect } from '../src/effect';
import type { Catch, CatchFn } from '../src/on-error';
import { getRoot } from '../src/root';
import type { State } from '../src/state';

function gray(str: string): string {
  return `\x1b[90m${str}\x1b[0m`;
}

export function debugByDispose(ref: () => void) {
  const root = getRoot();
  const effect = root.effectsByDispose?.get(ref);
  if (effect) {
    debugEffect(effect);
  } else {
    console.log(
      'debugByDispose: no effect found for dispose ref:',
      getName(ref),
    );
  }
}

interface DebugContext {
  names: WeakMap<Effect | CatchFn | State<any>, string>;
  indent: number;
  effectIndex: number;
  cleanupIndex: number;
  subIndex: number;
  catchIndex: number;
}

let ctx: DebugContext = {
  names: new WeakMap(),
  indent: 1,
  effectIndex: 1,
  cleanupIndex: 1,
  subIndex: 1,
  catchIndex: 1,
};

function resetDebugContext() {
  ctx.names = new WeakMap();
  ctx.indent = 1;
  ctx.effectIndex = 1;
  ctx.cleanupIndex = 1;
  ctx.subIndex = 1;
}

function debugEffect(effect: Effect) {
  resetDebugContext();
  _log('----', getName(effect), '----');
  _withIndent(() => {
    _debugEffect(effect);
  });
  _log('---- end ----');
}

export function getName(obj: Effect | CatchFn | State<any>): string {
  const root = getRoot();
  if (root.subs?.byState?.has(obj as State<any>)) {
    return getStateName(obj as State<any>);
  } else if (root.catches?.byFn?.has(obj as CatchFn)) {
    return getCatchFnName(obj as CatchFn);
  } else if (root.effectCleanups?.has(obj as Effect)) {
    return getCleanupName(obj as Effect);
  } else {
    return getEffectName(obj as Effect);
  }
}

function getEffectName(effect: Effect): string {
  if (effect.name) {
    return effect.name;
  }
  let name = ctx.names.get(effect);
  if (!name) {
    name = `EF#${ctx.effectIndex++}`;
    ctx.names.set(effect, name);
  }
  return name;
}

function getStateName(state: State<any>): string {
  let name = ctx.names.get(state);
  if (!name) {
    name = `ST#${ctx.subIndex++}`;
    ctx.names.set(state, name);
  }
  return name;
}

function getStateValue(state: State<any>): any {
  return withEffect(undefined, () => state());
}

function getCleanupName(cleanup: () => void): string {
  if (cleanup.name) {
    return cleanup.name;
  }
  let name = ctx.names.get(cleanup);
  if (!name) {
    name = `CL#${ctx.cleanupIndex++}`;
    ctx.names.set(cleanup, name);
  }
  return name;
}

function getCatchFnName(catchFn: CatchFn): string {
  if (catchFn.name) {
    return catchFn.name;
  }
  let name = ctx.names.get(catchFn);
  if (!name) {
    name = `CATCH#${ctx.catchIndex++}`;
    ctx.names.set(catchFn, name);
  }
  return name;
}

function getCatchInfo(c: Catch): string {
  let res = '';
  if (c.onErrorEffect === c.effect) {
    // [CATCH#3 for EF#1]
    res = `[${getCatchFnName(c.catchFn)} for ${getName(c.effect)}]`;
  } else {
    // [CATCH#3 for EF#1 from EF#2]
    res = `[${getCatchFnName(c.catchFn)} for ${getName(
      c.effect,
    )} from ${getName(c.onErrorEffect)}]`;
  }
  if (c.lastCatch) {
    res += ` -> ${getCatchInfo(c.lastCatch)}`;
  }
  return gray(res);
}

function getCatchInfoFor(effect: Effect | CatchFn): string {
  const root = getRoot();
  const catches = root.catches;
  if (catches) {
    const c = catches.byEffect.get(effect);
    if (c) {
      return getCatchInfo(c);
    }
  }
  return '';
}

function _log(...args: any[]) {
  const indentStr = ' '.repeat(ctx.indent * 2 - 1);
  console.log(indentStr, ...args);
}

function _withIndent<T>(fn: () => T): T {
  ctx.indent++;
  try {
    return fn();
  } finally {
    ctx.indent--;
  }
}

function _debugEffect(effect: Effect) {
  _log('effect:', getName(effect), getCatchInfoFor(effect));
  _withIndent(() => {
    debugOnErrors(effect);
    debugChildren(effect);
    debugSubs(effect);
    debugCleanups(effect);
  });
}

function debugChildren(effect: Effect) {
  const root = getRoot();

  const children = root.effectChildren?.get(effect);
  if (children && children.size > 0) {
    for (const child of children) {
      _debugEffect(child);
    }
  }
}

function debugCleanups(effect: Effect) {
  const root = getRoot();

  const cleanups = root.effectCleanups?.get(effect);
  if (cleanups && cleanups.size > 0) {
    for (const cleanup of cleanups) {
      _log('cleanup:', getName(cleanup), getCatchInfoFor(cleanup));
    }
  }
}

function debugSubs(effect: Effect) {
  const root = getRoot();

  const subs = root.subs?.byEffect.get(effect);
  if (subs && subs.size > 0) {
    for (const sub of subs) {
      _log('state:  ', getName(sub), getStateValue(sub));
    }
  }
}

function debugOnErrors(effect: Effect) {
  const root = getRoot();
  const catches = root.catches;
  if (catches) {
    let c = catches.byEffect.get(effect);
    const cs = [];
    while (c) {
      if (c.onErrorEffect === effect) {
        cs.push(c);
      }
      c = c.lastCatch;
    }
    for (const c of cs.reverse()) {
      _log('onError:', getName(c.catchFn), getCatchInfoFor(c.catchFn));
    }
  }
}
