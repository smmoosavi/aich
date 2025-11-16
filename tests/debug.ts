import {
  getEffectContext,
  getEffectFromHandle,
  type Effect,
  type EffectContext,
  type EffectHandle,
} from '../src/effect';
import type { Catch } from '../src/on-error';
import { isEffectPinned } from '../src/pin-effect';
import { getRoot } from '../src/root';
import { untrack } from '../src/sub';

export type DebugValue = boolean | ((value: any) => string | undefined);
export type DebugLogger = (msg: string) => void;

interface DebugOptions {
  logger?: DebugLogger;
  debugValue?: DebugValue;
}

interface HighlightOptions {
  num?: (text: string) => string;
  name?: (text: string) => string;
  len?: (text: string) => number;
}

export const ansiHighlightOptions: HighlightOptions = {
  // gray
  num: (text) => `\x1b[90m${text}\x1b[0m`,
  // cyan
  name: (text) => `\x1b[36m${text}\x1b[0m`,
  len: (text) => text.replace(/\x1b\[\d+m/g, '').length,
};

export function setHighlightOptions(options: HighlightOptions | undefined) {
  const root = getRoot();
  root.debugHighlightOptions = options;
}

interface DebugContext {
  names: WeakMap<Function, string>;
  indexes: Map<string, number>;
  indent: number;
  options?: DebugOptions;
}

/** @internal */
declare module '../src/root' {
  interface Root {
    debugContext?: DebugContext;
    debugHighlightOptions?: HighlightOptions;
  }
}

function getDebugContext(): DebugContext {
  const root = getRoot();
  if (!root.debugContext) {
    root.debugContext = {
      names: new WeakMap<Function, string>(),
      indexes: new Map<string, number>(),
      indent: 0,
    };
  }
  return root.debugContext;
}

function getIndex(prefix: string): number {
  const { indexes } = getDebugContext();
  let index = indexes.get(prefix) ?? 0;
  index++;
  indexes.set(prefix, index);
  return index;
}

export function enableDebugNames() {
  const root = getRoot();
  root.debugHooks = root.debugHooks || {};
  root.debugHooks.debugSetName = _setName;
}

export function disableDebugNames() {
  const root = getRoot();
  root.debugHooks = undefined;
}

export function _setName(
  effect: Function,
  prefix: string = '',
  key: number | string = '',
) {
  const { names } = getDebugContext();
  if (!names.has(effect)) {
    const effectName = highlight(`${key || effect.name}`, 'name');
    const index = getIndex(prefix);
    const num = highlight(`#${prefix}${index}`, 'num');
    let name = `${effectName}${num}`;
    names.set(effect, name);
  }
}

export function highlight(
  text: string,
  type: Exclude<keyof HighlightOptions, 'len'>,
): string {
  const root = getRoot();
  const options = root.debugHighlightOptions;
  if (options) {
    const fn = options[type];
    if (fn) {
      return fn(text);
    }
  }
  return text;
}

export function getName(effect: Function): string {
  const { names } = getDebugContext();
  return names.get(effect) || effect.name || '';
}

function withIndent<T>(fn: () => T): T {
  const context = getDebugContext();
  context.indent++;
  try {
    return fn();
  } finally {
    context.indent--;
  }
}

function withOptions<T>(options: DebugOptions, fn: () => T): T {
  const context = getDebugContext();
  const lastOptions = context.options;
  context.options = { ...lastOptions, ...options };
  try {
    return fn();
  } finally {
    context.options = lastOptions;
  }
}

function log(msg: string) {
  const context = getDebugContext();
  const indent = ' '.repeat(context.indent * 2);
  context.options?.logger?.(`${indent}${msg}`);
}

function debugValue(value: any): string | undefined {
  const context = getDebugContext();
  const options = context.options;
  if (options?.debugValue) {
    if (typeof options.debugValue === 'function') {
      return options.debugValue(value);
    } else if (options.debugValue === true) {
      return JSON.stringify(value);
    }
  }
  return undefined;
}

export function resetDebug() {
  const root = getRoot();
  root.debugContext = undefined;
}

export function debugEffect(
  handle: EffectHandle<any>,
  options: DebugOptions = {},
) {
  withOptions(options, () => {
    const effect = getEffectFromHandle(handle);
    const name = getName(effect);
    log('\n');
    log(`------------ Effect: ${name} ------------`);
    _debugEffect(effect);

    const root = getRoot();
    const len = root.debugHighlightOptions?.len?.(name) ?? name.length;
    const end = '-'.repeat(34 + len);
    log(end);
    log('\n');
  });
}

function debugEffectHeader(
  effect: Effect<any>,
  pinned: boolean,
  context: EffectContext<any>,
) {
  let text = `Effect: ${getName(effect)}`;
  if (pinned) {
    text += ' (pinned)';
  }
  if (context.catch) {
    text += ` [${getName(context.catch.catchFn)}]`;
  }
  log(text);
}

function debugOnError(effect: Effect<any>, ch: Catch | undefined) {
  if (ch?.lastCatch?.onErrorEffect === effect) {
    debugOnError(effect, ch.lastCatch);
  }
  if (ch?.onErrorEffect === effect) {
    let text = `OnError ${getName(ch.catchFn)}`;
    if (ch.lastCatch) {
      text += ` [${getCatchStack(ch.lastCatch)}]`;
    }
    log(text);
  }
}

function debugStates(effect: Effect<any>) {
  const root = getRoot();
  const states = root.subs?.byEffect.get(effect);
  if (states) {
    for (const state of states) {
      const value = untrack(() => state());
      const dv = debugValue(value);
      if (dv !== undefined) {
        log(`State: ${getName(state)} = ${dv}`);
      } else {
        log(`State: ${getName(state)}`);
      }
    }
  }
}

function debugChildren(effect: Effect<any>, context: EffectContext<any>) {
  const children = context.children;
  if (children) {
    for (const child of children.values()) {
      const childContext = getEffectContext(child);
      const childKey = childContext.key;
      const childPinned = isEffectPinned(effect, childKey);
      _debugEffect(child, childPinned);
    }
  }
}

function debugCleanups(context: EffectContext<any>) {
  const cleanups = context.cleanups;
  if (cleanups) {
    for (const cleanup of cleanups) {
      const context = getEffectContext(cleanup);
      let text = `Cleanup: ${getName(cleanup)}`;
      if (context.catch) {
        text += ` [${getName(context.catch.catchFn)}]`;
      }
      log(text);
    }
  }
}

function _debugEffect(effect: Effect<any>, pinned = false) {
  const context = getEffectContext(effect);

  debugEffectHeader(effect, pinned, context);

  withIndent(() => {
    debugOnError(effect, context.catch);
    debugStates(effect);
    debugChildren(effect, context);
    debugCleanups(context);
  });
}

function getCatchStack(c: Catch): string {
  if (c.lastCatch) {
    return `${getName(c.catchFn)} (from ${getName(
      c.onErrorEffect,
    )}) -> ${getCatchStack(c.lastCatch)}`;
  } else {
    return `${getName(c.catchFn)} (from ${getName(c.onErrorEffect)})`;
  }
}
