import { describe, test, expect } from 'vitest';
import { effect, immediate, state, untrack } from '../src';
import { assertQueueEmpty } from '../src/queue';
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
      logs.push(`immediate ran with tracked: ${tracked}, untracked: ${untracked}`);
    });

    expect(logs.take()).toEqual(['immediate ran with tracked: 0, untracked: 10']);

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
    expect(logs.take()).toEqual(['immediate ran with tracked: 1, untracked: 20']);
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
        logs.push(`inner effect ran with tracked: ${tracked}, untracked: ${untracked} in outer ${outer}`);
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
    expect(logs.take()).toEqual(['inner effect ran with tracked: 150, untracked: 250 in outer 0']);

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
});
