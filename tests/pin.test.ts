import { describe, test, expect } from 'vitest';
import { pin } from '../src/pin';
import { effect } from '../src';
import { state } from '../src/state';
import { wait } from './wait';
import { createLogStore } from './log';
import { pinKey } from '../src/pin-key';

describe('pin', () => {
  test('caches value within effect', async () => {
    let callCount = 0;
    const init = () => {
      callCount++;
      return { value: callCount };
    };

    const rerun = state({});
    const { result } = effect(() => {
      rerun();
      return pin(init, pinKey('', 'test-key'));
    });

    await wait();
    const result1 = result.current;

    rerun({});
    await wait();
    const result2 = result.current;

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

    const result1 = pin(init, pinKey('', 'test-key'));
    const result2 = pin(init, pinKey('', 'test-key'));

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

      return pin(
        () => {
          pinCallCount++;
          logs.push(`pin called ${pinCallCount}`);
          return { value: pinCallCount };
        },
        pinKey('', 'test-key'),
      );
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
          pin(
            () => {
              logs.push(`pin ${key} called (value: ${value})`);
              return value;
            },
            pinKey('', key),
          ),
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
});
