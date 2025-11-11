import { describe, test, expect } from 'vitest';
import { cleanup, effect, flush, state } from '../src';
import { wait } from './wait';
import { createLogStore } from './log';

describe('pin effect', () => {
  test('pinning an effect outside has no effect', async () => {
    const logs = createLogStore();
    const count = state(0);

    // Create parent effect
    const { dispose } = effect(() => {
      const c = count();
      logs.push(`ran ${c}`);

      cleanup(() => {
        logs.push(`cleaned up ${c}`);
      });
    }).pin();

    await wait();
    expect(logs.take()).toEqual(['ran 0']);

    count(1);
    await wait();
    expect(logs.take()).toEqual(['cleaned up 0', 'ran 1']);

    dispose();
    expect(logs.take()).toEqual(['cleaned up 1']);
  });
  test('pinning an effect prevents re-running without key', async () => {
    const logs = createLogStore();
    const count = state(0);

    // Create parent effect
    const { dispose } = effect(() => {
      const c = count();
      logs.push(`parent ran ${c}`);

      // Create first child effect with key
      effect(() => {
        logs.push('child effect ran');
        cleanup(() => {
          logs.push('child effect cleaned up');
        });
      }).pin();

      cleanup(() => {
        logs.push(`parent cleaned up ${c}`);
      });
    });

    await wait();
    expect(logs.take()).toEqual(['parent ran 0', 'child effect ran']);

    count(1);
    await wait();
    expect(logs.take()).toEqual(['parent cleaned up 0', 'parent ran 1']);

    dispose();
    expect(logs.take()).toEqual([
      'child effect cleaned up',
      'parent cleaned up 1',
    ]);
  });
  test('conditional pinning an effect cause dispose', async () => {
    const logs = createLogStore();
    const count = state(0);
    const flag = state(true);

    // Create parent effect
    const { dispose } = effect(() => {
      const c = count();

      logs.push(`parent ran ${c}`);

      // Create conditional child effect with key
      if (flag()) {
        effect(() => {
          logs.push(`child effect ran ${c}`);
          cleanup(() => {
            logs.push(`child effect cleaned up ${c}`);
          });
        }).pin();
      }

      cleanup(() => {
        logs.push(`parent cleaned up ${c}`);
      });
    });

    flush();
    expect(logs.take()).toEqual(['parent ran 0', 'child effect ran 0']);

    count(1);
    flush();
    expect(logs.take()).toEqual(['parent cleaned up 0', 'parent ran 1']);

    flag(false);
    flush();
    expect(logs.take()).toEqual([
      'parent cleaned up 1',
      'parent ran 1',
      'child effect cleaned up 0',
    ]);

    count(2);
    flush();
    expect(logs.take()).toEqual(['parent cleaned up 1', 'parent ran 2']);

    flag(true);
    flush();
    expect(logs.take()).toEqual([
      'parent cleaned up 2',
      'parent ran 2',
      'child effect ran 2',
    ]);

    count(3);
    flush();
    expect(logs.take()).toEqual(['parent cleaned up 2', 'parent ran 3']);

    dispose();
    expect(logs.take()).toEqual([
      'child effect cleaned up 2',
      'parent cleaned up 3',
    ]);
  });
});
