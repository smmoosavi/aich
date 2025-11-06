import { describe, test, expect } from 'vitest';
import { state, immediate, cleanup } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

describe('cleanup', () => {
  test('run cleanup', async () => {
    const logs = createLogStore();
    const { dispose } = immediate(() => {
      logs.push('immediate ran');
      cleanup(() => {
        logs.push('cleanup ran');
      });
    });
    expect(logs.take()).toEqual(['immediate ran']);
    assertQueueEmpty();
    dispose();
    expect(logs.take()).toEqual(['cleanup ran']);
  });
  test('multiple cleanups', async () => {
    const logs = createLogStore();
    const { dispose } = immediate(() => {
      logs.push('immediate ran');
      cleanup(() => {
        logs.push('cleanup 1 ran');
      });
      cleanup(() => {
        logs.push('cleanup 2 ran');
      });
    });
    expect(logs.take()).toEqual(['immediate ran']);
    dispose();
    expect(logs.take()).toEqual(['cleanup 2 ran', 'cleanup 1 ran']);
  });
  test('nested immediate cleanups', async () => {
    const logs = createLogStore();
    const { dispose } = immediate(() => {
      logs.push('outer immediate ran');
      immediate(() => {
        logs.push('inner immediate ran');
        cleanup(() => {
          logs.push('inner cleanup ran');
        });
      });
      cleanup(() => {
        logs.push('outer cleanup ran');
      });
    });
    assertQueueEmpty();
    expect(logs.take()).toEqual(['outer immediate ran', 'inner immediate ran']);
    dispose();
    expect(logs.take()).toEqual(['inner cleanup ran', 'outer cleanup ran']);
  });
  test('nested multiple cleanups', async () => {
    const logs = createLogStore();
    const { dispose } = immediate(() => {
      logs.push('outer immediate ran');
      immediate(() => {
        logs.push('inner immediate 1 ran');
        cleanup(() => {
          logs.push('inner 1 cleanup 1 ran');
        });
        cleanup(() => {
          logs.push('inner 1 cleanup 2 ran');
        });
      });
      immediate(() => {
        logs.push('inner immediate 2 ran');
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

    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran',
      'inner immediate 1 ran',
      'inner immediate 2 ran',
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
    const { dispose } = immediate(() => {
      const c = count();
      logs.push(`immediate ran with ${c}`);
      cleanup(() => {
        logs.push(`cleanup ran with ${count()} in immediate ${c}`);
      });
    });
    assertQueueEmpty();
    expect(logs.take()).toEqual(['immediate ran with 0']);
    count(1);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'cleanup ran with 1 in immediate 0',
      'immediate ran with 1',
    ]);
    dispose();
    expect(logs.take()).toEqual(['cleanup ran with 1 in immediate 1']);
  });
  test('nested immediate cleanups with state', async () => {
    const logs = createLogStore();
    const count1 = state(10);
    const count2 = state(1);

    const { dispose } = immediate(() => {
      const c1 = count1();
      logs.push(`outer immediate ran with ${c1}`);
      immediate(() => {
        const c2 = count2();
        logs.push(`inner immediate ran with ${c1}/${c2}`);
        cleanup(() => {
          logs.push(
            `inner cleanup ran with ${count1()}/${count2()} in immediate ${c1}/${c2}`,
          );
        });
      });
      cleanup(() => {
        logs.push(`outer cleanup ran with ${count1()} in immediate ${c1}`);
      });
    });

    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer immediate ran with 10',
      'inner immediate ran with 10/1',
    ]);

    count2(2);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'inner cleanup ran with 10/2 in immediate 10/1',
      'inner immediate ran with 10/2',
    ]);

    count1(20);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'inner cleanup ran with 20/2 in immediate 10/2',
      'outer cleanup ran with 20 in immediate 10',
      'outer immediate ran with 20',
      'inner immediate ran with 20/2',
    ]);

    dispose();
    expect(logs.take()).toEqual([
      'inner cleanup ran with 20/2 in immediate 20/2',
      'outer cleanup ran with 20 in immediate 20',
    ]);
  });
  test('cleanup called outside immediate', () => {
    const logs = createLogStore();
    expect(() => {
      cleanup(() => {
        logs.push('cleanup ran');
      });
    }).throws('cleanup() must be called within an executing effect');
    expect(logs.take()).toEqual([]);
  });
});
