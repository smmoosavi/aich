import { getRoot } from './root';

export interface DebugHooks {
  debugSetName?: (
    effect: Function,
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
  effect: Function,
  prefix: string = '',
  key: number | string = '',
) {
  const root = getRoot();
  root.debugHooks?.debugSetName?.(effect, prefix, key);
}
