import { cleanup, effect, immediate, onError, state } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

describe('on error with state', () => {
  test('error in effect', async () => {
    const logs = createLogStore();
    const count = state(1);

    effect(() => {
      onError((e) => {
        logs.push(`caught error ${e.message}`);
      });
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
    expect(logs.take()).toEqual(['effect ran 2', 'caught error Test error 2']);

    count(3);
    await wait();
    expect(logs.take()).toEqual(['effect ran 3']);

    count(4);
    await wait();
    expect(logs.take()).toEqual(['effect ran 4', 'caught error Test error 4']);
    assertQueueEmpty();
  });

  test('error in immediate', async () => {
    const logs = createLogStore();
    const count = state(1);

    immediate(() => {
      onError((e) => {
        logs.push(`caught error ${e.message}`);
      });
      let c = count();
      logs.push(`effect ran ${c}`);
      if (c % 2 === 0) {
        throw new Error(`Test error ${c}`);
      }
    });

    expect(logs.take()).toEqual(['effect ran 1']);

    count(2);
    await wait();
    expect(logs.take()).toEqual(['effect ran 2', 'caught error Test error 2']);

    count(3);
    await wait();
    expect(logs.take()).toEqual(['effect ran 3']);

    count(4);
    await wait();
    expect(logs.take()).toEqual(['effect ran 4', 'caught error Test error 4']);
    assertQueueEmpty();
  });

  test('error in cleanup by dispose', async () => {
    const logs = createLogStore();
    const count = state(1);
    const { dispose } = effect(() => {
      onError((e) => {
        logs.push(`caught error ${e.message}`);
      });
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
    dispose();
    expect(logs.take()).toEqual(['cleanup ran 2', 'caught error Test error 2']);
    assertQueueEmpty();
  });

  test('error in cleanup by rerun', async () => {
    const logs = createLogStore();
    const count = state(1);
    effect(() => {
      onError((e) => {
        logs.push(`caught error ${e.message}`);
      });
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
    expect(logs.take()).toEqual([
      'cleanup ran 2',
      'caught error Test error 2',
      'effect ran 3',
      'child effect ran',
    ]);
    assertQueueEmpty();

    count(4);
    await wait();
    expect(logs.take()).toEqual([
      'cleanup ran 3',
      'effect ran 4',
      'child effect ran',
    ]);
    assertQueueEmpty();
  });
});
