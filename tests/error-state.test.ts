import { cleanup, effect, immediate, state } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { catchUncatched } from './catchUncatched';
import { createLogStore } from './log';
import { wait } from './wait';

describe.sequential('error', () => {
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

  test('error in cleanup', async () => {
    const logs = createLogStore();
    const count = state(1);
    const dispose = effect(function xxx() {
      const c = count();
      logs.push(`effect ran ${c}`);
      cleanup(function ccc() {
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
});
