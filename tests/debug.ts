import {
  getEffectFromHandle,
  type EffectContext,
  type EffectHandle,
} from '../src/effect';
import type { Catch } from '../src/on-error';
import { getRoot } from '../src/root';
import { untrack } from '../src/sub';
import type { State } from '../src/state';

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
  names: WeakMap<EffectContext | State<unknown>, string>;
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
      names: new WeakMap<EffectContext | State<unknown>, string>(),
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

export function enableConsoleLogger(debugValue: DebugValue = false) {
  enableDebugNames();
  setHighlightOptions(ansiHighlightOptions);
  const context = getDebugContext();
  context.options = {};
  context.options!.debugValue = debugValue;
  context.options!.logger = console.log;
}

export function _setName(
  context: EffectContext | State<unknown>,
  prefix: string = '',
  key: number | string = '',
) {
  const { names } = getDebugContext();
  if (!names.has(context)) {
    const effectName = highlight(`${key || getContextName(context)}`, 'name');
    const index = getIndex(prefix);
    const num = highlight(`#${prefix}${index}`, 'num');
    let name = `${effectName}${num}`;
    names.set(context, name);
  }
}

function getContextName(context: EffectContext | State<unknown>): string {
  const { names } = getDebugContext();
  if (names.has(context)) {
    return names.get(context) || '';
  }
  if (typeof context === 'function') {
    return context.name || '';
  }
  return context.effect?.name || context.catchFn?.name || '';
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

export function getName(context: EffectContext | State<unknown>): string {
  const { names } = getDebugContext();
  return names.get(context) || getContextName(context);
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

function debugEffectHeader(effect: EffectContext<any>) {
  let text = `Effect: ${getName(effect)}`;
  if (effect.catch) {
    text += ` [${getName(effect.catch.catchFnContext)}]`;
  }
  log(text);
}

function debugOnError(effect: EffectContext<any>, ch: Catch | undefined) {
  if (ch?.lastCatch?.onErrorEffect === effect) {
    debugOnError(effect, ch.lastCatch);
  }
  if (ch?.onErrorEffect === effect) {
    let text = `OnError ${getName(ch.catchFnContext)}`;
    if (ch.lastCatch) {
      text += ` [${getCatchStack(ch.lastCatch)}]`;
    }
    log(text);
  }
}

function debugStates(effect: EffectContext<any>) {
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

function debugChildren(effect: EffectContext<any>) {
  const children = effect.children;
  if (children) {
    for (const child of children.values()) {
      _debugEffect(child);
    }
  }
}

function debugCleanups(context: EffectContext<any>) {
  const cleanups = context.cleanups;
  if (cleanups) {
    for (const cleanup of cleanups) {
      let text = `Cleanup: ${getName(cleanup)}`;
      if (cleanup.catch) {
        text += ` [${getName(cleanup.catch.catchFnContext)}]`;
      }
      log(text);
    }
  }
}

function _debugEffect(effect: EffectContext<any>) {
  debugEffectHeader(effect);

  withIndent(() => {
    debugOnError(effect, effect.catch);
    debugStates(effect);
    debugChildren(effect);
    debugCleanups(effect);
  });
}

function getCatchStack(c: Catch): string {
  if (c.lastCatch) {
    return `${getName(c.catchFnContext)} (from ${getName(
      c.onErrorEffect,
    )}) -> ${getCatchStack(c.lastCatch)}`;
  } else {
    return `${getName(c.catchFnContext)} (from ${getName(c.onErrorEffect)})`;
  }
}
