import { notify, register } from './sub';

export interface State<T> {
  (): T;
  (value: T): void;
}

export function state<T>(initial: T): State<T> {
  let value = initial;
  const s = function (newValue?: T): T | void {
    if (arguments.length === 0) {
      register(s);
      return value;
    } else {
      if (value === newValue) return;
      value = newValue as T;
      notify(s);
    }
  } as State<T>;
  return s;
}
