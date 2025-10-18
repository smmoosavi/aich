import { describe, test, expect } from 'vitest';
import { effect, state } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

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
    const dispose = effect(() => {
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
  test('dispose nested effect, dispose outer will dispose all', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    const disposeOuter = effect(function outer() {
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
      disposeInner = effect(function inner() {
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
    const dispose = effect(function level1() {
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
    const dispose = effect(() => {
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
});
