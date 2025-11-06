import { describe, test, expect } from 'vitest';
import { effect, immediate, state } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

describe('immediate with state', () => {
  test('get state', async () => {
    const logs = createLogStore();
    let count = state(0);

    immediate(() => {
      logs.push('immediate effect run with ' + count());
      count();
    });

    expect(logs.take()).toEqual(['immediate effect run with 0']);
    assertQueueEmpty();
  });

  test('set state', async () => {
    const logs = createLogStore();
    let count = state(0);

    immediate(() => {
      logs.push('immediate effect run with ' + count());
      count();
    });

    expect(logs.take()).toEqual(['immediate effect run with 0']);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 1']);
  });

  test('multiple set state', async () => {
    const logs = createLogStore();
    let count = state(0);
    immediate(() => {
      logs.push('immediate effect run with ' + count());
      count();
    });

    expect(logs.take()).toEqual(['immediate effect run with 0']);
    count(1);
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 2']);
  });

  test('multiple states', async () => {
    const logs = createLogStore();
    let count1 = state(0);
    let count2 = state(10);
    immediate(() => {
      logs.push(`immediate effect run with ${count1()} and ${count2()}`);
    });
    expect(logs.take()).toEqual(['immediate effect run with 0 and 10']);
    count1(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 1 and 10']);
    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 1 and 20']);
  });

  test('multiple states update together', async () => {
    const logs = createLogStore();
    let count1 = state(0);
    let count2 = state(10);
    immediate(() => {
      logs.push(`immediate effect run with ${count1()} and ${count2()}`);
    });
    expect(logs.take()).toEqual(['immediate effect run with 0 and 10']);
    count1(1);
    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 1 and 20']);
  });

  test('conditional state access', async () => {
    const logs = createLogStore();
    let flag = state(true);
    let count = state(0);
    immediate(() => {
      if (flag()) {
        logs.push(`immediate effect run with ${count()}`);
      } else {
        logs.push(`immediate effect run with flag false`);
      }
    });
    expect(logs.take()).toEqual(['immediate effect run with 0']);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 1']);
    flag(false);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with flag false']);
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
    flag(true);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate effect run with 2']);
  });
  test('nested immediate with state', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);

    immediate(() => {
      const c1 = count1();
      logs.push(`outer immediate ran with ${c1}`);
      immediate(() => {
        logs.push(`inner immediate ran with ${count2()} in outer ${c1}`);
      });
      logs.push(`outer immediate end with ${c1}`);
    });
    expect(logs.take()).toEqual([
      'outer immediate ran with 0',
      'inner immediate ran with 10 in outer 0',
      'outer immediate end with 0',
    ]);
    count1(1);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 1',
      'inner immediate ran with 10 in outer 1',
      'outer immediate end with 1',
    ]);
    count2(20);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['inner immediate ran with 20 in outer 1']);
  });

  test('immediate does not if state set to same value', async () => {
    const logs = createLogStore();
    const count = state(0);
    immediate(() => {
      logs.push(`immediate ran with ${count()}`);
    });
    expect(logs.take()).toEqual(['immediate ran with 0']);
    count(0); // set to same value
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
    count(1); // set to different value
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate ran with 1']);
  });
  test('nested immediate within effect with state', async () => {
    const logs = createLogStore();
    const count = state(0);

    effect(() => {
      const c = count();
      logs.push(`effect ran with ${c}`);
      immediate(() => {
        logs.push(`immediate ran with ${count()} in effect ${c}`);
      });
      logs.push(`effect end with ${c}`);
    });

    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'effect ran with 0',
      'immediate ran with 0 in effect 0',
      'effect end with 0',
    ]);

    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'effect ran with 1',
      'immediate ran with 1 in effect 1',
      'effect end with 1',
    ]);
  });
  test('nested effect within immediate with state', async () => {
    const logs = createLogStore();
    const count = state(0);

    immediate(() => {
      const c = count();
      logs.push(`immediate ran with ${c}`);
      effect(() => {
        logs.push(`effect ran with ${count()} in immediate ${c}`);
      });
      logs.push(`immediate end with ${c}`);
    });

    expect(logs.take()).toEqual([
      'immediate ran with 0',
      'immediate end with 0',
    ]);
    await wait();
    expect(logs.take()).toEqual(['effect ran with 0 in immediate 0']);

    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'immediate ran with 1',
      'immediate end with 1',
      'effect ran with 1 in immediate 1',
    ]);
  });
  test('dispose immediate', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = immediate(() => {
      logs.push('immediate ran with ' + count());
    });
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate ran with 0']);
    count(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate ran with 1']);
    dispose();
    count(2);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
    // multiple dispose calls
    dispose();
    count(3);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });
  test('dispose nested immediate, dispose outer will dispose all', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    const { dispose: disposeOuter } = immediate(() => {
      const c1 = count1();
      logs.push(`outer immediate ran with ${c1}`);
      immediate(() => {
        logs.push(`inner immediate ran with ${count2()} in outer ${c1}`);
      });
      logs.push(`outer immediate end with ${c1}`);
    });
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 0',
      'inner immediate ran with 10 in outer 0',
      'outer immediate end with 0',
    ]);
    count1(1);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 1',
      'inner immediate ran with 10 in outer 1',
      'outer immediate end with 1',
    ]);
    count2(20);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['inner immediate ran with 20 in outer 1']);
    // Dispose outer
    disposeOuter();
    count1(2);
    count2(30);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);
  });
  test('dispose inner immediate', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    let disposeInner: () => void;
    immediate(() => {
      const c1 = count1();
      logs.push(`outer immediate ran with ${c1}`);
      const { dispose } = immediate(() => {
        logs.push(`inner immediate ran with ${count2()} in outer ${c1}`);
      });
      disposeInner = dispose;

      logs.push(`outer immediate end with ${c1}`);
    });
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 0',
      'inner immediate ran with 10 in outer 0',
      'outer immediate end with 0',
    ]);
    count1(1);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 1',
      'inner immediate ran with 10 in outer 1',
      'outer immediate end with 1',
    ]);
    count2(20);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['inner immediate ran with 20 in outer 1']);
    // Dispose inner only
    disposeInner!();
    count2(30);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);

    count1(2); // re-activate inner effect
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 2',
      'inner immediate ran with 30 in outer 2',
      'outer immediate end with 2',
    ]);
  });
});
