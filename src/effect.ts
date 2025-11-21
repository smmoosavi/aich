import {
  addChildEffect,
  disposeChildEffects,
  removeChildEffect,
} from './children';
import { runCleanups } from './cleanup';
import {
  addChildCatch,
  catchError,
  disposeEffectCatch,
  type CatchFn,
} from './on-error';
import { cleanupUnusedPins } from './pin';
import { resetPinKey, type PinKey } from './pin-key';
import { pinKey } from './pin-key';
import { dropEffect, enqueue } from './queue';
import { getRoot } from './root';
import { clearEffectSubs } from './sub';
import { setName } from './debug';
import {
  clearUsedEffects,
  markEffectAsUsed,
  removeEffectFromUsed,
  removeUnusedEffects,
} from './used-effect';
import {
  cacheContext,
  getCachedContext,
  removeCachedContext,
} from './context-cache';

export type Effect<R = void> = () => R;
export type DisposeFn = () => void;
const EFFECT = Symbol('EFFECT');
export interface EffectHandle<R> {
  /** @internal */
  [EFFECT]: EffectContext<R>;
  dispose: DisposeFn;
  result: { current: R | undefined };
}

export interface EffectContext<R = unknown> {
  effect?: Effect<R>;
  catchFn?: CatchFn;
  key: PinKey;
  orderKey: OrderKey;
  disposed: boolean;
  result: { current: R | undefined };
}

/** @internal */
declare module './root' {
  interface Root {
    currentContext?: EffectContext;
  }
}

type OrderKey = bigint;
let lastOrderKey: OrderKey = 0n;

export function getOrCreateEffectContext<R>(
  parent: EffectContext | undefined,
  effect: Effect<R> | CatchFn,
  key: PinKey,
): EffectContext<R> {
  markEffectAsUsed(parent, key);
  if (parent) {
    const existingContext = getCachedContext(parent, key);
    if (existingContext) {
      existingContext.effect = isEffect(effect) ? effect : undefined;
      existingContext.catchFn = isEffect(effect) ? undefined : effect;
      return existingContext as EffectContext<R>;
    }
  }
  const context = {
    effect: isEffect(effect) ? effect : undefined,
    catchFn: isEffect(effect) ? undefined : effect,
    key,
    orderKey: lastOrderKey++,
    disposed: true,
    result: { current: undefined },
  };
  cacheContext(parent, key, context);
  return context as EffectContext<R>;
}

function isEffect(effect: Effect | CatchFn): effect is Effect {
  return effect.length === 0;
}

export function getEffectFromHandle(
  handle: EffectHandle<any>,
): EffectContext<any> {
  return handle[EFFECT];
}

function createEffect<R>(
  fn: Effect<R>,
  key: string | number | undefined,
  debugName: string,
): { handle: EffectHandle<R>; context: EffectContext<R> } {
  const root = getRoot();
  const parent = root.currentContext;
  const effectKey = pinKey('EFFECT', key);
  const context = getOrCreateEffectContext(parent, fn, effectKey);
  setName(context, debugName, key);
  const dispose = createDisposeFn(context);
  const handle = { [EFFECT]: context, dispose, result: context.result };

  enqueue(context);
  addChildEffect(parent, context, effectKey);
  addChildCatch(parent, context);

  return { handle, context };
}

export function effect<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  const { handle } = createEffect(fn, key, 'EF');
  return handle;
}

export function immediate<R>(
  fn: Effect<R>,
  key?: string | number,
): EffectHandle<R> {
  const { handle, context } = createEffect(fn, key, 'IM');
  runEffect(context);
  return handle;
}

export function createDisposeFn(context: EffectContext): DisposeFn {
  const dispose = () => {
    disposeEffect(context, true);
  };
  return dispose;
}

export function removeEffect(parent: EffectContext, key: PinKey) {
  removeChildEffect(parent, key);
  removeCachedContext(parent, key);
  removeEffectFromUsed(parent, key);
}

export function disposeEffect(context: EffectContext, unmount: boolean) {
  dropEffect(context);
  if (context.disposed) {
    return;
  }
  context.disposed = true;
  disposeChildEffects(context, unmount);
  runCleanups(context);
  clearEffectSubs(context);
  cleanupUnusedPins(context);
  clearUsedEffects(context);
  resetPinKey(context);
  disposeEffectCatch(context);
}

export function getCurrentEffect(): EffectContext | null {
  return getRoot().currentContext ?? null;
}

export function runEffect<R>(context: EffectContext<R>) {
  withEffect(context, () => {
    disposeEffect(context, false);
    context.result.current = context.effect?.();
    context.disposed = false;
    removeUnusedEffects(context);
  });
}

export function withEffect(
  context: EffectContext | undefined,
  fn: () => void,
): void {
  const root = getRoot();
  const lastContext = root.currentContext;
  root.currentContext = context;
  try {
    fn();
  } catch (e) {
    catchError(e, context);
  } finally {
    root.currentContext = lastContext;
  }
}
