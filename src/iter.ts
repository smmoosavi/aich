import { aggregateErrors } from './error';

export function forEach<I>(items: I[] | Set<I>, fn: (item: I) => void) {
  const errors: any[] = [];
  for (const item of items) {
    try {
      fn(item);
    } catch (e) {
      errors.push(e);
    }
  }
  if (errors.length > 0) {
    throw aggregateErrors(errors);
  }
}

export const STOP = Symbol('break');
export function loop(fn: () => unknown | typeof STOP) {
  const errors: any[] = [];
  while (true) {
    try {
      const result = fn();
      if (result === STOP) {
        break;
      }
    } catch (e) {
      errors.push(e);
    }
  }
  if (errors.length > 0) {
    throw aggregateErrors(errors);
  }
}
