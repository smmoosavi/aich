import { describe, test, expect } from 'vitest';
import { effect, state } from '../src';
import { assertQueueEmpty, flush } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';
import type { State } from '../src/state';

describe('effect with state', () => {
  test('get state', async () => {
    const logs = createLogStore();
    let count = state(0);
    effect(() => {
      logs.push(`effect ran with ${count()}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
  });
  test('set state', async () => {
    const logs = createLogStore();
    let count = state(0);
    effect(() => {
      logs.push(`effect ran with ${count()}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1']);
  });
  test('multiple set state', async () => {
    const logs = createLogStore();
    let count = state(0);
    effect(() => {
      logs.push(`effect ran with ${count()}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    count(1);
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 2']);
  });
  test('multiple states', async () => {
    const logs = createLogStore();
    let count1 = state(0);
    let count2 = state(10);
    effect(() => {
      logs.push(`effect ran with ${count1()} and ${count2()}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0 and 10']);
    count1(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1 and 10']);
    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1 and 20']);
  });

  test('multiple states update together', async () => {
    const logs = createLogStore();
    let count1 = state(0);
    let count2 = state(10);
    effect(() => {
      logs.push(`effect ran with ${count1()} and ${count2()}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0 and 10']);
    count1(1);
    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1 and 20']);
  });

  test('conditional state access', async () => {
    const logs = createLogStore();
    let flag = state(true);
    let count = state(0);
    effect(() => {
      if (flag()) {
        logs.push(`effect ran with ${count()}`);
      } else {
        logs.push(`effect ran with flag false`);
      }
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1']);
    flag(false);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with flag false']);
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty(); // ?
    expect(logs.take()).toEqual([]);
    flag(true);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 2']);
  });
  test('nested effects with state', async () => {
    const logs = createLogStore();
    let count1 = state(0);
    let count2 = state(10);
    effect(function outer() {
      const c1 = count1();
      logs.push(`outer effect ran with ${count1()}`);
      effect(function inner() {
        logs.push(`inner effect ran with ${count2()} in outer ${c1}`);
      });
      logs.push(`outer effect end with ${c1}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'outer effect end with 0',
      'inner effect ran with 10 in outer 0',
    ]);
    count1(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'outer effect end with 1',
      'inner effect ran with 10 in outer 1',
    ]);
    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['inner effect ran with 20 in outer 1']);
  });
  test('effect does not run if state set to same value', async () => {
    const logs = createLogStore();
    let count = state(0);
    effect(() => {
      logs.push(`effect ran with ${count()}`);
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    count(0);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1']);
  });
  test('dispose effect', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = effect(() => {
      logs.push('effect ran with ' + count());
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1']);
    dispose();
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
    // multiple dispose calls
    dispose();
    dispose();
    count(3);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });
  test('update state and dispose effect', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = effect(() => {
      logs.push('effect ran with ' + count());
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran with 0']);

    count(1);
    dispose();
    // as expected, no effect runs after dispose and queued effects are cleared
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });
  test('dispose nested effect, dispose outer will dispose all', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    const { dispose: disposeOuter } = effect(function outer() {
      const c1 = count1();
      logs.push('outer effect ran with ' + c1);
      effect(function inner() {
        logs.push('inner effect ran with ' + count2() + ' in outer ' + c1);
      });
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'inner effect ran with 10 in outer 0',
    ]);

    count1(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'inner effect ran with 10 in outer 1',
    ]);

    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['inner effect ran with 20 in outer 1']);

    disposeOuter();
    count1(2);
    count2(30);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });

  test('dispose inner effect', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    let disposeInner: () => void = () => {};
    effect(function outer() {
      const c1 = count1();
      logs.push('outer effect ran with ' + c1);
      const { dispose } = effect(function inner() {
        logs.push('inner effect ran with ' + count2() + ' in outer ' + c1);
      });
      disposeInner = dispose;
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'inner effect ran with 10 in outer 0',
    ]);

    count1(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'inner effect ran with 10 in outer 1',
    ]);

    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['inner effect ran with 20 in outer 1']);

    disposeInner?.();
    count2(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);

    count1(2); // re-activate inner effect
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 2',
      'inner effect ran with 2 in outer 2',
    ]);
  });
  test('dispose deeply nested effects', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = effect(function level1() {
      logs.push('effect level 1 ran');
      effect(function level2() {
        logs.push('effect level 2 ran');
        effect(function level3() {
          logs.push('effect level 3 ran with ' + count());
        });
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'effect level 1 ran',
      'effect level 2 ran',
      'effect level 3 ran with 0',
    ]);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect level 3 ran with 1']);
    dispose();
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]); // error: expected [ 'effect level 3 ran with 2' ] to deeply equal []
  });
  test('dispose effect multiple times', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = effect(() => {
      logs.push('effect ran with ' + count());
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    dispose();
    dispose();
    dispose();
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });
  test('effect chain', async () => {
    // this is a bad practice, just for testing edge case
    const logs = createLogStore();
    const a = state(1);
    const b = state(a() + 1);
    effect(() => {
      logs.push(`before: a=${a()}, b=${b()}`);
    });
    effect(() => {
      logs.push(`effect A ran with ${a()}`);
      b(a() + 1);
    });
    effect(() => {
      logs.push(`middle: a=${a()}, b=${b()}`);
    });
    effect(() => {
      logs.push(`effect B ran with ${b()}`);
    });

    await wait();
    expect(logs.take()).toEqual([
      'before: a=1, b=2',
      'effect A ran with 1',
      'middle: a=1, b=2',
      'effect B ran with 2',
    ]);

    a(2);
    await wait();
    expect(logs.take()).toEqual([
      'before: a=2, b=2',
      'effect A ran with 2',
      'middle: a=2, b=3',
      'effect B ran with 3',
      'before: a=2, b=3',
    ]);
  });
  test('self setting state in effect', async () => {
    // this is a bad practice, just for testing edge case
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = effect(() => {
      const c = count();
      logs.push(`effect ran with ${c}`);
      if (c < 3) {
        count(c + 1);
      }
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'effect ran with 0',
      'effect ran with 1',
      'effect ran with 2',
      'effect ran with 3',
    ]);

    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'effect ran with 1',
      'effect ran with 2',
      'effect ran with 3',
    ]);

    dispose();
    count(0);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });
  test('effect result', async () => {
    const logs = createLogStore();
    const count = state(0);
    const handle = effect(() => {
      const c = count();
      const r = handle.result.current;
      logs.push(`effect ran with ${c} and last result ${r}`);
      return 10;
    });
    expect(handle.result.current).toBeUndefined();
    await wait();
    expect(handle.result.current).toBe(10);
    expect(logs.take()).toEqual([
      'effect ran with 0 and last result undefined',
    ]);

    count(1);
    await wait();
    expect(logs.take()).toEqual(['effect ran with 1 and last result 10']);
  });
  it('should keep state in effect', async () => {
    const logs = createLogStore();
    const outer = state(0);
    const { result } = effect(() => {
      const o = outer();
      logs.push(`outer effect ran with ${o}`);
      const inner = state(10);

      effect(() => {
        logs.push(`inner effect ran with ${inner()} in outer ${o}`);
      });
      return inner;
    });

    await wait();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'inner effect ran with 10 in outer 0',
    ]);
    result.current!(20);
    await wait();
    expect(logs.take()).toEqual(['inner effect ran with 20 in outer 0']);

    outer(1);
    await wait();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'inner effect ran with 20 in outer 1',
    ]);
  });

  it('should keep state in effect with key', async () => {
    const logs = createLogStore();
    const items = state(['a', 'b', 5]);
    const count = state(0);

    const { result } = effect(() => {
      const before = state(0);
      const counts = items().map(
        (item) => [item, state(0, item)] as [string, State<number>],
      );
      const after = state(0);
      logs.push(`count ${count()}`);

      counts.forEach(([item, count]) => {
        effect(() => {
          logs.push(`count for ${item} is ${count()}`);
        });
      });

      effect(() => {
        logs.push(`before/after effect ran with ${before()}/${after()}`);
      });

      return { before, counts, after };
    });

    expect(logs.take()).toEqual([]);

    await wait();
    expect(logs.take()).toEqual([
      'count 0',
      'count for a is 0',
      'count for b is 0',
      'count for 5 is 0',
      'before/after effect ran with 0/0',
    ]);

    const before = result.current?.before!;
    const after = result.current?.after!;
    const [, countA] = result.current?.counts[0]!;
    const [, countB] = result.current?.counts[1]!;

    before(1);
    await wait();
    expect(logs.take()).toEqual(['before/after effect ran with 1/0']);

    countA(2);
    await wait();
    expect(logs.take()).toEqual(['count for a is 2']);

    countB(3);
    await wait();
    expect(logs.take()).toEqual(['count for b is 3']);

    after(4);
    await wait();
    expect(logs.take()).toEqual(['before/after effect ran with 1/4']);

    count(5);
    await wait();
    expect(logs.take()).toEqual([
      'count 5',
      'count for a is 2',
      'count for b is 3',
      'count for 5 is 0',
      'before/after effect ran with 1/4',
    ]);

    items(['c', 'a']);
    await wait();
    expect(logs.take()).toEqual([
      'count 5',
      'count for c is 0',
      'count for a is 2',
      'before/after effect ran with 1/4',
    ]);

    items(['c', 'b']);
    await wait();
    expect(logs.take()).toEqual([
      'count 5',
      'count for c is 0',
      'count for b is 0',
      'before/after effect ran with 1/4',
    ]);

    countA(6);
    await wait();
    expect(logs.take()).toEqual([]);
  });

  test('state defined in effect', async () => {
    const logs = createLogStore();
    const outer = state(1);
    const { result } = effect(() => {
      const inner = state(10);
      logs.push(`outer effect ran with ${outer()}`);
      effect(() => {
        logs.push(`inner effect ran with ${inner()} in outer ${outer()}`);
      });
      return inner;
    });

    await wait();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'inner effect ran with 10 in outer 1',
    ]);

    result.current?.(20);
    await wait();
    expect(logs.take()).toEqual(['inner effect ran with 20 in outer 1']);

    outer(2);
    await wait();
    expect(logs.take()).toEqual([
      'outer effect ran with 2',
      'inner effect ran with 20 in outer 2',
    ]);
  });

  test('state defined in nested effect', async () => {
    const logs = createLogStore();
    const outer = state(1);
    const { result } = effect(() => {
      const middle = state(10);
      logs.push(`outer effect ran with ${outer()}`);
      const { result: innerResult } = effect(() => {
        const inner = state(100);
        logs.push(`middle effect ran with ${middle()} in outer ${outer()}`);
        effect(() => {
          logs.push(
            `inner effect ran with ${inner()} in middle ${middle()} in outer ${outer()}`,
          );
        });
        return inner;
      });
      return { middle, inner: innerResult };
    });

    await wait();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'middle effect ran with 10 in outer 1',
      'inner effect ran with 100 in middle 10 in outer 1',
    ]);

    result.current?.inner.current?.(200);
    await wait();
    expect(logs.take()).toEqual([
      'inner effect ran with 200 in middle 10 in outer 1',
    ]);

    result.current?.middle(20);
    await wait();
    expect(logs.take()).toEqual([
      'middle effect ran with 20 in outer 1',
      'inner effect ran with 200 in middle 20 in outer 1',
    ]);

    outer(2);
    await wait();
    expect(logs.take()).toEqual([
      'outer effect ran with 2',
      'middle effect ran with 20 in outer 2',
      'inner effect ran with 200 in middle 20 in outer 2',
    ]);
  });

  test('state with duplicate keys in same effect should throw error', async () => {
    effect(() => {
      state(0, 'duplicate-key');
      state(0, 'duplicate-key');
    });

    expect(() => flush()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Duplicate STATE key. Key "duplicate-key" has already been used in this effect.]`,
    );
  });
});
