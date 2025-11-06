import { effect, immediate } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

describe('immediate', () => {
  test('run immediate', async () => {
    const logs = createLogStore();
    immediate(() => {
      logs.push('immediate ran');
    });
    expect(logs.take()).toEqual(['immediate ran']);
    assertQueueEmpty();
  });
  test('multiple immediates', async () => {
    const logs = createLogStore();
    immediate(() => {
      logs.push('immediate ran 1');
    });
    expect(logs.take()).toEqual(['immediate ran 1']);
    immediate(() => {
      logs.push('immediate ran 2');
    });
    expect(logs.take()).toEqual(['immediate ran 2']);
    assertQueueEmpty();
  });
  test('nested immediates', async () => {
    const logs = createLogStore();
    immediate(() => {
      logs.push('immediate ran 1');
      immediate(() => {
        logs.push('immediate ran 2');
      });
    });
    expect(logs.take()).toEqual(['immediate ran 1', 'immediate ran 2']);
    assertQueueEmpty();
  });
  test('nested effects in immediate', async () => {
    const logs = createLogStore();
    immediate(() => {
      logs.push('immediate ran 1');
      effect(() => {
        logs.push('effect ran inside immediate');
      });
    });
    expect(logs.take()).toEqual(['immediate ran 1']);
    await wait();
    expect(logs.take()).toEqual(['effect ran inside immediate']);
    assertQueueEmpty();
    assertQueueEmpty();
  });
  test('nested immediate in effect', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect ran 1');
      immediate(() => {
        logs.push('immediate ran inside effect');
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'effect ran 1',
      'immediate ran inside effect',
    ]);
    assertQueueEmpty();
    assertQueueEmpty();
  });
  test('delayed nested immediate', async () => {
    const logs = createLogStore();
    immediate(() => {
      logs.push('immediate ran 1');
      immediate(() => {
        logs.push('immediate ran 2');
        immediate(() => {
          logs.push('immediate ran 3');
        });
        logs.push('after immediate ran 2');
      });
      logs.push('after immediate ran 1');
    });
    expect(logs.take()).toEqual([
      'immediate ran 1',
      'immediate ran 2',
      'immediate ran 3',
      'after immediate ran 2',
      'after immediate ran 1',
    ]);
    assertQueueEmpty();
  });

  test('immediate result', () => {
    const handle = immediate(() => {
      return 'immediate result';
    });
    expectTypeOf(handle.result.current).toEqualTypeOf<string | undefined>();
    expect(handle.result.current).toBe('immediate result');
    handle.dispose();
    // After disposal, the result should still be accessible
    expect(handle.result.current).toBe('immediate result');
  });
});
