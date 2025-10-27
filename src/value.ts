import { immediate, type Dispose } from './effect';

export type Thunk<T> = () => T;
export type Value<T> = T | Thunk<T>;

export function isThunk<T>(value: Value<T>): value is Thunk<T> {
  return typeof value === 'function';
}

export function resolveValue<T>(value: Value<T>): T {
  return isThunk(value) ? value() : value;
}

export function immediateValue<T>(value: Value<T>): [T, Dispose] {
  if (isThunk(value)) {
    let res: T;
    const dispose = immediate(() => {
      res = value();
    });
    return [res!, dispose];
  } else {
    return [value, () => {}];
  }
}
