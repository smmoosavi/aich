import { describe, test, expect } from 'vitest';
import { effect, state, cleanup } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

describe('cleanup', () => {
  test('run cleanup', async () => {
    const logs = createLogStore();
    const { dispose } = effect(() => {
      logs.push('effect ran');
      cleanup(() => {
        logs.push('cleanup ran');
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran']);
    dispose();
    expect(logs.take()).toEqual(['cleanup ran']);
  });
  test('multiple cleanups', async () => {
    const logs = createLogStore();
    const { dispose } = effect(() => {
      logs.push('effect ran');
      cleanup(() => {
        logs.push('cleanup 1 ran');
      });
      cleanup(() => {
        logs.push('cleanup 2 ran');
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran']);
    dispose();
    expect(logs.take()).toEqual(['cleanup 2 ran', 'cleanup 1 ran']);
  });
  test('nested effect cleanups', async () => {
    const logs = createLogStore();
    const { dispose } = effect(() => {
      logs.push('outer effect ran');
      effect(() => {
        logs.push('inner effect ran');
        cleanup(() => {
          logs.push('inner cleanup ran');
        });
      });
      cleanup(() => {
        logs.push('outer cleanup ran');
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['outer effect ran', 'inner effect ran']);
    dispose();
    expect(logs.take()).toEqual(['inner cleanup ran', 'outer cleanup ran']);
  });
  test('nested multiple cleanups', async () => {
    const logs = createLogStore();
    const { dispose } = effect(() => {
      logs.push('outer effect ran');
      effect(() => {
        logs.push('inner effect 1 ran');
        cleanup(() => {
          logs.push('inner 1 cleanup 1 ran');
        });
        cleanup(() => {
          logs.push('inner 1 cleanup 2 ran');
        });
      });
      effect(() => {
        logs.push('inner effect 2 ran');
        cleanup(() => {
          logs.push('inner 2 cleanup 1 ran');
        });
        cleanup(() => {
          logs.push('inner 2 cleanup 2 ran');
        });
      });
      cleanup(() => {
        logs.push('outer cleanup 1 ran');
      });
      cleanup(() => {
        logs.push('outer cleanup 2 ran');
      });
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran',
      'inner effect 1 ran',
      'inner effect 2 ran',
    ]);
    dispose();
    expect(logs.take()).toEqual([
      'inner 2 cleanup 2 ran',
      'inner 2 cleanup 1 ran',
      'inner 1 cleanup 2 ran',
      'inner 1 cleanup 1 ran',
      'outer cleanup 2 ran',
      'outer cleanup 1 ran',
    ]);
  });
  test('cleanup with state', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { dispose } = effect(() => {
      const c = count();
      logs.push(`effect ran with ${c}`);
      cleanup(() => {
        logs.push(`cleanup ran with ${count()} in effect ${c}`);
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0']);
    count(1);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'cleanup ran with 1 in effect 0',
      'effect ran with 1',
    ]);
    dispose();
    expect(logs.take()).toEqual(['cleanup ran with 1 in effect 1']);
  });
  test('nested effect cleanups with state', async () => {
    const logs = createLogStore();
    const count1 = state(10);
    const count2 = state(1);

    const { dispose } = effect(() => {
      const c1 = count1();
      logs.push(`outer effect ran with ${c1}`);
      effect(() => {
        const c2 = count2();
        logs.push(`inner effect ran with ${c1}/${c2}`);
        cleanup(() => {
          logs.push(
            `inner cleanup ran with ${count1()}/${count2()} in effect ${c1}/${c2}`,
          );
        });
      });
      cleanup(() => {
        logs.push(`outer cleanup ran with ${count1()} in effect ${c1}`);
      });
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 10',
      'inner effect ran with 10/1',
    ]);

    count2(2);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'inner cleanup ran with 10/2 in effect 10/1',
      'inner effect ran with 10/2',
    ]);

    count1(20);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'inner cleanup ran with 20/2 in effect 10/2',
      'outer cleanup ran with 20 in effect 10',
      'outer effect ran with 20',
      'inner effect ran with 20/2',
    ]);

    dispose();
    expect(logs.take()).toEqual([
      'inner cleanup ran with 20/2 in effect 20/2',
      'outer cleanup ran with 20 in effect 20',
    ]);
  });
  test('cleanup called outside effect', () => {
    const logs = createLogStore();
    expect(() => {
      cleanup(() => {
        logs.push('cleanup ran');
      });
    }).throws('cleanup() must be called within an executing effect');
    expect(logs.take()).toEqual([]);
  });
});
