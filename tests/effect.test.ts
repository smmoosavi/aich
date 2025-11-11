import { describe, test, expect } from 'vitest';
import { effect } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';
import { getEffectContext } from '../src/effect';

describe('effect', () => {
  test('run effect', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect ran');
    });
    expect(logs.take()).toEqual([]);
    expect(() => {
      assertQueueEmpty();
    }).throws('Expected queue to be empty, but found 1 pending effects.');
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran']);
  });

  test('multiple effects', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect 1 ran');
    });
    effect(() => {
      logs.push('effect 2 ran');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect 1 ran', 'effect 2 ran']);
  });

  test('nested effects', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('outer effect ran');
      effect(() => {
        logs.push('inner effect ran');
      });
      logs.push('outer effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran',
      'outer effect end',
      'inner effect ran',
    ]);
  });

  test('deeply nested effects', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect level 1 ran');
      effect(() => {
        logs.push('effect level 2 ran');
        effect(() => {
          logs.push('effect level 3 ran');
        });
        logs.push('effect level 2 end');
      });
      logs.push('effect level 1 end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'effect level 1 ran',
      'effect level 1 end',
      'effect level 2 ran',
      'effect level 2 end',
      'effect level 3 ran',
    ]);
  });

  test('effect result', async () => {
    const handle = effect(() => {
      return 'result';
    });
    expectTypeOf(handle.result.current).toEqualTypeOf<string | undefined>();
    expect(handle.result.current).toBeUndefined();
    await wait();
    expect(handle.result.current).toBe('result');
    handle.dispose();
    // After disposal, the result should still be accessible
    expect(handle.result.current).toBe('result');
  });

  test('getEffectContext error', () => {
    expect(() => {
      getEffectContext(() => {});
    }).toThrowErrorMatchingInlineSnapshot(`[Error: Effect context not found]`);
  });
});
