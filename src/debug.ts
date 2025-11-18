import { getRoot } from './root';
import type { EffectContext } from './effect';
import type { State } from './state';

export interface DebugHooks {
  debugSetName?: (
    effect: EffectContext | State<unknown>,
    prefix: string,
    key: number | string,
  ) => void;
}

/** @internal */
declare module './root' {
  interface Root {
    debugHooks?: DebugHooks;
  }
}

export function setName(
  effect: EffectContext | State<any>,
  prefix: string = '',
  key: number | string = '',
) {
  const root = getRoot();
  root.debugHooks?.debugSetName?.(effect, prefix, key);
}
