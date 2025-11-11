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
        logs.push(`child effect ran ${c}`);
        cleanup(() => {
          logs.push(`child effect cleaned up ${c}`);
        });
      }).pin();

      cleanup(() => {
        logs.push(`parent cleaned up ${c}`);
      });
    });

    await wait();
    expect(logs.take()).toEqual(['parent ran 0', 'child effect ran 0']);

    count(1);
    await wait();
    expect(logs.take()).toEqual(['parent cleaned up 0', 'parent ran 1']);

    dispose();
    expect(logs.take()).toEqual([
      'child effect cleaned up 0',
      'parent cleaned up 1',
    ]);
  });
  test('conditional pinned effect cause dispose', async () => {
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
        }, 'maybe').pin();
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
  test('pinning a nested unpin effect doesnt prevent re-running', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    const count3 = state(100);

    // parent
    const { dispose } = effect(() => {
      const c1 = count1();
      logs.push(`parent ran ${c1}`);

      // unpinned middle
      effect(() => {
        const c2 = count2();
        logs.push(`nested effect ran ${c2} in ${c1}`);

        // pinned inner
        effect(() => {
          const c3 = count3();
          logs.push(`deeply nested effect ran ${c3} in ${c2} in ${c1}`);

          cleanup(() => {
            logs.push(
              `deeply nested effect cleaned up ${c3} in ${c2} in ${c1}`,
            );
          });
        }).pin();

        cleanup(() => {
          logs.push(`nested effect cleaned up ${c2} in ${c1}`);
        });
      });

      cleanup(() => {
        logs.push(`parent cleaned up ${c1}`);
      });
    });

    await wait();
    expect(logs.take()).toEqual([
      'parent ran 0',
      'nested effect ran 10 in 0',
      'deeply nested effect ran 100 in 10 in 0',
    ]);

    count3(200);
    await wait();
    expect(logs.take()).toEqual([
      'deeply nested effect cleaned up 100 in 10 in 0',
      'deeply nested effect ran 200 in 10 in 0',
    ]);

    count2(20);
    await wait();
    expect(logs.take()).toEqual([
      'nested effect cleaned up 10 in 0',
      'nested effect ran 20 in 0',
    ]);

    count1(1);
    await wait();
    expect(logs.take()).toEqual([
      'deeply nested effect cleaned up 200 in 10 in 0',
      'nested effect cleaned up 20 in 0',
      'parent cleaned up 0',
      'parent ran 1',
      'nested effect ran 20 in 1',
      'deeply nested effect ran 200 in 20 in 1',
    ]);

    dispose();
    expect(logs.take()).toEqual([
      'deeply nested effect cleaned up 200 in 20 in 1',
      'nested effect cleaned up 20 in 1',
      'parent cleaned up 1',
    ]);
  });

  test('pinning a nested pin effect prevents re-running', async () => {
    const logs = createLogStore();
    const count1 = state(0);
    const count2 = state(10);
    const count3 = state(100);

    // parent
    const { dispose } = effect(() => {
      const c1 = count1();
      logs.push(`parent ran ${c1}`);

      // pinned middle
      effect(() => {
        const c2 = count2();
        logs.push(`nested effect ran ${c2} in ${c1}`);

        // pinned inner
        effect(() => {
          const c3 = count3();
          logs.push(`deeply nested effect ran ${c3} in ${c2} in ${c1}`);

          cleanup(() => {
            logs.push(
              `deeply nested effect cleaned up ${c3} in ${c2} in ${c1}`,
            );
          });
        }).pin();

        cleanup(() => {
          logs.push(`nested effect cleaned up ${c2} in ${c1}`);
        });
      }).pin();

      cleanup(() => {
        logs.push(`parent cleaned up ${c1}`);
      });
    });

    await wait();
    expect(logs.take()).toEqual([
      'parent ran 0',
      'nested effect ran 10 in 0',
      'deeply nested effect ran 100 in 10 in 0',
    ]);

    count3(200);
    await wait();
    expect(logs.take()).toEqual([
      'deeply nested effect cleaned up 100 in 10 in 0',
      'deeply nested effect ran 200 in 10 in 0',
    ]);

    count2(20);
    await wait();
    expect(logs.take()).toEqual([
      'nested effect cleaned up 10 in 0',
      'nested effect ran 20 in 0',
    ]);

    count1(1);
    await wait();
    expect(logs.take()).toEqual(['parent cleaned up 0', 'parent ran 1']);

    dispose();
    expect(logs.take()).toEqual([
      'deeply nested effect cleaned up 200 in 10 in 0',
      'nested effect cleaned up 20 in 0',
      'parent cleaned up 1',
    ]);
  });

  test('state in nested pinned effect kept', async () => {
    const logs = createLogStore();
    const count = state(0);
    const { result } = effect(() => {
      count();
      const { result: pinnedResult } = effect(() => {
        const pinnedCount = state(0);
        effect(() => {
          logs.push(`pinned count is ${pinnedCount()} in ${count()}`);
        });
        return pinnedCount;
      }).pin();
      const { result: unpinnedResult } = effect(() => {
        const unpinnedCount = state(0);
        effect(() => {
          logs.push(`unpinned count is ${unpinnedCount()} in ${count()}`);
        });
        return unpinnedCount;
      });
      return { pinnedResult, unpinnedResult };
    });

    await wait();
    expect(logs.take()).toEqual([
      'pinned count is 0 in 0',
      'unpinned count is 0 in 0',
    ]);

    result.current?.pinnedResult.current!(1);
    await wait();
    expect(logs.take()).toEqual(['pinned count is 1 in 0']);

    result.current?.unpinnedResult.current!(1);
    await wait();
    expect(logs.take()).toEqual(['unpinned count is 1 in 0']);

    count(1);
    await wait();
    expect(logs.take()).toEqual([
      'pinned count is 1 in 1',
      'unpinned count is 0 in 1',
    ]);
  });

  test('effect with duplicate key throws error', async () => {
    // Create parent effect
    effect(() => {
      effect(() => {}, 'duplicate-key').pin();
      effect(() => {}, 'duplicate-key').pin();
    });

    expect(() => flush()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Duplicate EFFECT key. Key "duplicate-key" has already been used in this effect.]`,
    );
  });
});
