import { setName } from './debug';
import { pin } from './pin';
import { pinKey } from './pin-key';
import { notify, register } from './sub';

export interface State<T> {
  (): T;
  (value: T): void;
}

export function _state<T>(initial: T): State<T> {
  let value = initial;
  const state =
    (void 0,
    function (newValue?: T): T | void {
      if (arguments.length === 0) {
        register(state);
        return value;
      } else {
        if (value === newValue) return;
        value = newValue as T;
        notify(state);
      }
    } as State<T>);
  return state;
}

export function state<T>(initial: T, key?: string | number): State<T> {
  return pin(
    () => {
      const s = _state(initial);
      setName(s, 'ST', key);
      return s;
    },
    pinKey('STATE', key),
  );
}
