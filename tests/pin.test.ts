import { describe, test, expect } from 'vitest';
import { pin, unpin, sticky } from '../src/pin';
import { effect } from '../src';
import { state } from '../src/state';
import { wait } from './wait';
import { createLogStore } from './log';

describe('pin', () => {
  test('caches value within effect', async () => {
    let callCount = 0;
    const init = () => {
      callCount++;
      return { value: callCount };
    };

    let result1: any;
    let result2: any;

    effect(() => {
      result1 = pin(init, 'test-key');
      result2 = pin(init, 'test-key');
    });

    await wait();

    expect(callCount).toBe(1);
    expect(result1).toEqual({ value: 1 });
    expect(result2).toEqual({ value: 1 });
    expect(result1).toBe(result2);
  });

  test('does not cache value outside effect', () => {
    let callCount = 0;
    const init = () => {
      callCount++;
      return { value: callCount };
    };

    const result1 = pin(init, 'test-key');
    const result2 = pin(init, 'test-key');

    expect(callCount).toBe(2);
    expect(result1).toEqual({ value: 1 });
    expect(result2).toEqual({ value: 2 });
    expect(result1).not.toBe(result2);
  });

  test('maintains cache across effect reruns', async () => {
    const count = state(0);
    let pinCallCount = 0;
    const logs = createLogStore();

    const { result } = effect(() => {
      const currentCount = count();
      logs.push(`effect run ${currentCount}`);

      return pin(() => {
        pinCallCount++;
        logs.push(`pin called ${pinCallCount}`);
        return { value: pinCallCount };
      }, 'test-key');
    });

    await wait();
    const value1 = result.current;
    expect(logs.take()).toEqual(['effect run 0', 'pin called 1']);
    expect(pinCallCount).toBe(1);

    // Change state to trigger effect rerun
    count(1);
    await wait();
    const value2 = result.current;
    expect(value1).toBe(value2); // should still be the same cached value
    expect(value1?.value).toBe(1);
    expect(value2?.value).toBe(1);
    expect(logs.take()).toEqual(['effect run 1']);
    expect(pinCallCount).toBe(1); // pin should maintain cached value
  });

  test('pins persist across dynamic key changes', async () => {
    type KeyValue = [string, number];
    const items = state<KeyValue[]>([
      ['a', 1],
      ['b', 2],
    ]);
    const logs = createLogStore();

    const { result } = effect(() => {
      const currentItems = items();
      logs.push(`effect run with ${JSON.stringify(currentItems)}`);

      const results: KeyValue[] = [];
      for (const [key, value] of currentItems) {
        results.push([
          key,
          pin(() => {
            logs.push(`pin ${key} called (value: ${value})`);
            return value;
          }, key),
        ]);
      }
      return results;
    });

    await wait();
    expect(logs.take()).toEqual([
      'effect run with [["a",1],["b",2]]',
      'pin a called (value: 1)',
      'pin b called (value: 2)',
    ]);
    expect(result.current).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    // Change items to [['c', 3], ['a', 4]]
    items([
      ['c', 3],
      ['a', 4],
    ]);
    await wait();
    expect(logs.take()).toEqual([
      'effect run with [["c",3],["a",4]]',
      'pin c called (value: 3)',
    ]);
    expect(result.current).toEqual([
      ['c', 3],
      ['a', 1],
    ]);

    // Change items to [['c', 5], ['b', 6], ['a', 7]]
    items([
      ['c', 5],
      ['b', 6],
      ['a', 7],
    ]);
    await wait();
    expect(logs.take()).toEqual([
      'effect run with [["c",5],["b",6],["a",7]]',
      'pin b called (value: 6)',
    ]);
    expect(result.current).toEqual([
      ['c', 3],
      ['b', 6],
      ['a', 1],
    ]);
  });

  test('unpin removes cached value', async () => {
    let callCount = 0;
    const logs = createLogStore();

    const { result } = effect(() => {
      const value1 = pin(() => {
        callCount++;
        logs.push(`pin called ${callCount}`);
        return { value: callCount };
      }, 'test-key');

      unpin('test-key');

      const value2 = pin(() => {
        callCount++;
        logs.push(`pin called ${callCount}`);
        return { value: callCount };
      }, 'test-key');

      return { value1, value2 };
    });

    await wait();

    expect(callCount).toBe(2);
    expect(logs.take()).toEqual(['pin called 1', 'pin called 2']);
    expect(result.current?.value1.value).toBe(1);
    expect(result.current?.value2.value).toBe(2);
  });

  test('sticky pins persist while non-sticky are cleaned up', async () => {
    const count = state(0);
    const logs = createLogStore();

    const { result } = effect(() => {
      const c = count();
      logs.push(`effect run ${c}`);

      const results: any[] = [];

      if (count() % 2 === 0) {
        // Only access pins on even counts
        const stickyValue = pin(() => {
          logs.push(`sticky pin called ${c}`);
          return { type: 'sticky', value: c };
        }, 'sticky-key');
        sticky('sticky-key'); // Mark as sticky

        const nonStickyValue = pin(() => {
          logs.push(`non-sticky pin called ${c}`);
          return { type: 'non-sticky', value: c };
        }, 'non-sticky-key');

        results.push(stickyValue, nonStickyValue);
      }

      return results;
    });

    await wait();
    expect(logs.take()).toEqual([
      'effect run 0',
      'sticky pin called 0',
      'non-sticky pin called 0',
    ]);
    expect(result.current).toEqual([
      { type: 'sticky', value: 0 },
      { type: 'non-sticky', value: 0 },
    ]);

    // Change state to trigger effect rerun
    count(1);
    await wait();
    expect(logs.take()).toEqual(['effect run 1']);
    expect(result.current).toEqual([]);

    // Change state to trigger effect rerun
    count(2);
    await wait();
    expect(logs.take()).toEqual(['effect run 2', 'non-sticky pin called 2']);
    expect(result.current).toEqual([
      { type: 'sticky', value: 0 },
      { type: 'non-sticky', value: 2 },
    ]);
  });
});
