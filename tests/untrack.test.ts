import { describe, test, expect } from 'vitest';
import { effect, immediate, state, untrack } from '../src';
import { assertQueueEmpty, flush } from '../src/queue';
import { createLogStore } from './log';
import { wait } from './wait';

describe('untrack', () => {
  test('outside any effect', () => {
    const logs = createLogStore();
    const count = state(0);
    const result = untrack(() => {
      logs.push('untrack ran');
      return count();
    });
    expect(result).toBe(0);
    expect(logs.take()).toEqual(['untrack ran']);
    // Changing state should not trigger anything since no effect is tracking
    count(1);
    expect(logs.take()).toEqual([]);
  });

  test('inside effect', async () => {
    const logs = createLogStore();
    const trackedState = state(0);
    const untrackedState = state(10);

    effect(() => {
      const tracked = trackedState();
      const untracked = untrack(() => untrackedState());
      logs.push(`effect ran with tracked: ${tracked}, untracked: ${untracked}`);
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with tracked: 0, untracked: 10']);

    // Change untracked state - effect should not re-run
    untrackedState(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);

    // Change tracked state - effect should re-run
    trackedState(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with tracked: 1, untracked: 20']);
  });

  test('inside immediate', async () => {
    const logs = createLogStore();
    const trackedState = state(0);
    const untrackedState = state(10);

    immediate(() => {
      const tracked = trackedState();
      const untracked = untrack(() => untrackedState());
      logs.push(
        `immediate ran with tracked: ${tracked}, untracked: ${untracked}`,
      );
    });

    expect(logs.take()).toEqual([
      'immediate ran with tracked: 0, untracked: 10',
    ]);

    // Change untracked state - immediate should not re-run
    untrackedState(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);

    // Change tracked state - immediate should re-run
    trackedState(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'immediate ran with tracked: 1, untracked: 20',
    ]);
  });

  test('inside nested effect', async () => {
    const logs = createLogStore();
    const outerState = state(0);
    const innerTrackedState = state(100);
    const innerUntrackedState = state(200);

    effect(() => {
      const outer = outerState();
      logs.push(`outer effect ran with ${outer}`);
      effect(() => {
        const tracked = innerTrackedState();
        const untracked = untrack(() => innerUntrackedState());
        logs.push(
          `inner effect ran with tracked: ${tracked}, untracked: ${untracked} in outer ${outer}`,
        );
      });
      logs.push(`outer effect end with ${outer}`);
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 0',
      'outer effect end with 0',
      'inner effect ran with tracked: 100, untracked: 200 in outer 0',
    ]);

    // Change inner untracked state - inner effect should not re-run
    innerUntrackedState(250);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);

    // Change inner tracked state - inner effect should re-run
    innerTrackedState(150);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'inner effect ran with tracked: 150, untracked: 250 in outer 0',
    ]);

    // Change outer state - both effects should re-run
    outerState(1);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'outer effect ran with 1',
      'outer effect end with 1',
      'inner effect ran with tracked: 150, untracked: 250 in outer 1',
    ]);
  });

  test('set state inside untrack', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);

    effect(() => {
      logs.push(`effect ran with ${count1()} and ${count2()}`);
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 0 and 10']);

    // Set state inside untrack - should NOT trigger the effect
    untrack(() => {
      count1(1);
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([]);

    // Set state normally - should trigger the effect
    count2(20);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['effect ran with 1 and 20']);
  });

  test('accumulated untrack', async () => {
    const logs = createLogStore();
    const acc = state(0);
    const value1 = state(0);
    const value2 = state(0);

    effect(() => {
      // add value1 to acc each time value1 changed
      const a = untrack(() => acc());
      const v1 = value1();
      const n = a + v1;
      logs.push(`E1: ${n} <= ${a} + ${v1}`);
      acc(n);
    });

    effect(() => {
      // add value2 to acc each time value2 changed
      const a = untrack(() => acc());
      const v2 = value2();
      const n = a + v2;
      logs.push(`E2: ${n} <= ${a} + ${v2}`);
      acc(n);
    });
    effect(() => {
      logs.push(`acc is now ${acc()}`);
    });

    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'E1: 0 <= 0 + 0',
      'E2: 0 <= 0 + 0',
      'acc is now 0',
    ]);

    // Change value1
    value1(5);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['E1: 5 <= 0 + 5', 'acc is now 5']);

    // Change value2
    value2(3);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['E2: 8 <= 5 + 3', 'acc is now 8']);

    // reset
    acc(0);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['acc is now 0']);

    // Change value1 and value2
    value1(2);
    value2(4);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'E1: 2 <= 0 + 2',
      'E2: 6 <= 2 + 4',
      'acc is now 6',
    ]);

    // reset
    acc(0);
    await wait();
    expect(logs.take()).toEqual(['acc is now 0']);

    // change same value without flush
    value1(2);
    value1(3);
    expect(logs.take()).toEqual([]);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual(['E1: 3 <= 0 + 3', 'acc is now 3']);

    // reset
    acc(0);
    await wait();
    expect(logs.take()).toEqual(['acc is now 0']);

    // change same value with flush
    value1(2);
    flush();
    // get logs without cleaning logs
    expect(logs.logs()).toEqual(['E1: 2 <= 0 + 2', 'acc is now 2']);
    value1(3);
    await wait();
    assertQueueEmpty();
    expect(logs.take()).toEqual([
      'E1: 2 <= 0 + 2',
      'acc is now 2',
      'E1: 5 <= 2 + 3',
      'acc is now 5',
    ]);
  });
});
