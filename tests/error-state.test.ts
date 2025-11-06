import { cleanup, effect, immediate, state } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { catchUncatched } from './catchUncatched';
import { createLogStore } from './log';
import { wait } from './wait';

describe('error with state', () => {
  test('error in effect', async () => {
    const logs = createLogStore();
    const handle = catchUncatched();
    const count = state(1);

    effect(() => {
      let c = count();
      logs.push(`effect ran ${c}`);
      if (c % 2 === 0) {
        throw new Error(`Test error ${c}`);
      }
    });

    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran 1']);

    count(2);
    await wait();
    expect(logs.take()).toEqual(['effect ran 2']);

    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error 2');
    assertQueueEmpty();

    count(3);
    await wait();
    expect(logs.take()).toEqual(['effect ran 3']);
    assertQueueEmpty();
  });

  test('error in immediate', async () => {
    const logs = createLogStore();
    const handle = catchUncatched();
    const count = state(1);

    immediate(() => {
      let c = count();
      logs.push(`effect ran ${c}`);
      if (c % 2 === 0) {
        throw new Error(`Test error ${c}`);
      }
    });

    expect(logs.take()).toEqual(['effect ran 1']);

    count(2);
    await wait();
    expect(logs.take()).toEqual(['effect ran 2']);

    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error 2');
    assertQueueEmpty();

    count(3);
    await wait();
    expect(logs.take()).toEqual(['effect ran 3']);
    assertQueueEmpty();
  });

  test('error in cleanup by dispose', async () => {
    const logs = createLogStore();
    const count = state(1);
    const { dispose } = effect(() => {
      const c = count();
      logs.push(`effect ran ${c}`);
      cleanup(() => {
        logs.push(`cleanup ran ${c}`);
        if (c % 2 === 0) {
          throw new Error(`Test error ${c}`);
        }
      });
    });
    await wait();
    expect(logs.take()).toEqual(['effect ran 1']);

    count(2);
    await wait();
    expect(logs.take()).toEqual(['cleanup ran 1', 'effect ran 2']);
    expect(() => {
      dispose();
    }).toThrow('Test error 2');
    expect(logs.take()).toEqual(['cleanup ran 2']);
    assertQueueEmpty();
  });

  test.fails('error in cleanup by rerun', async () => {
    const logs = createLogStore();
    const handle = catchUncatched();

    const count = state(1);
    effect(() => {
      const c = count();
      logs.push(`effect ran ${c}`);
      effect(() => {
        logs.push(`child effect ran`);
        cleanup(() => {
          logs.push(`cleanup ran ${c}`);
          if (c % 2 === 0) {
            throw new Error(`Test error ${c}`);
          }
        });
      });
    });
    await wait();
    expect(logs.take()).toEqual(['effect ran 1', 'child effect ran']);

    count(2);
    await wait();
    expect(logs.take()).toEqual([
      'cleanup ran 1',
      'effect ran 2',
      'child effect ran',
    ]);

    count(3);
    await wait();
    expect(logs.take()).noBail.toEqual([
      'cleanup ran 2',
      'effect ran 3',
      'child effect ran', // expected but missing
    ]);
    assertQueueEmpty();

    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error 2');

    count(4);
    await wait();
    expect(logs.take()).toEqual([
      // 'cleanup ran 3',
      'effect ran 4',
      'child effect ran',
    ]);

    count(5);
    await wait();
    expect(logs.take()).noBail.toEqual([
      'cleanup ran 4',
      'effect ran 5',
      'child effect ran', // expected but missing
    ]);

    await wait(0);
    const errors3 = handle.takeErrors();
    expect(errors3).toHaveLength(1);
    expect(errors3[0].message).toBe('Test error 4');

    assertQueueEmpty();
  });
});
