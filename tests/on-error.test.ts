import { cleanup, effect, immediate, onError } from '../src';
import { assertQueueEmpty } from '../src/queue';
import { catchUncatched } from './catchUncatched';
import { createLogStore } from './log';
import { wait } from './wait';

describe('onError', () => {
  test('outside of effect', () => {
    const logs = createLogStore();
    expect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
    }).throws('onError() must be called within an executing effect');
    expect(logs.take()).toEqual([]);
    assertQueueEmpty();
  });
  test('effect without error', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran']);
    assertQueueEmpty();
  });
  test('effect with handled error', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      try {
        throw new Error('Test error');
      } catch (e) {
        logs.push(`handled error: ${(e as Error).message}`);
      }
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran', 'handled error: Test error']);
    assertQueueEmpty();
  });
  test('catch error in effect', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      throw new Error('Test error');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran', 'caught error: Test error']);
    assertQueueEmpty();
  });
  test('catch error in immediate', async () => {
    const logs = createLogStore();
    immediate(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      throw new Error('Test error');
    });
    expect(logs.take()).toEqual(['effect ran', 'caught error: Test error']);
    assertQueueEmpty();
  });
  test('catch error in cleanup', async () => {
    const logs = createLogStore();
    const { dispose } = effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      cleanup(() => {
        logs.push('cleanup ran');
        throw new Error('Test error');
      });
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran']);
    dispose();
    expect(logs.take()).toEqual(['cleanup ran', 'caught error: Test error']);
    assertQueueEmpty();
  });
  test('throw error in onError', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
        throw new Error('Error in onError');
      });
      logs.push('effect ran');
      throw new Error('Test error');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran', 'caught error: Test error']);
    const handle = catchUncatched();
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Error in onError');
    assertQueueEmpty();
  });

  test('catch error in child effect', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      effect(() => {
        logs.push('child effect ran');
        throw new Error('Test error');
      });
      logs.push('effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();

    expect(logs.take()).toEqual([
      'effect ran',
      'effect end',
      'child effect ran',
      'caught error: Test error',
    ]);
    assertQueueEmpty();
  });
  test('catch error in child immediate', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      immediate(() => {
        logs.push('child effect ran');
        throw new Error('Test error');
      });
      logs.push('effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'effect ran',
      'child effect ran',
      'caught error: Test error',
      'effect end',
    ]);
    assertQueueEmpty();
  });

  test('child effect goes well when parent effect errors', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('parent effect ran');
      effect(() => {
        logs.push('child effect ran');
      });
      throw new Error('Parent test error');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'parent effect ran',
      'caught error: Parent test error',
      'child effect ran',
    ]);
    assertQueueEmpty();
  });

  test('multiple error', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      effect(() => {
        logs.push('child effect 1 ran');
        throw new Error('Test error 1');
      });
      effect(() => {
        logs.push('child effect 2 ran');
        throw new Error('Test error 2');
      });
      logs.push('effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'effect ran',
      'effect end',
      'child effect 1 ran',
      'caught error: Test error 1',
      'child effect 2 ran',
      'caught error: Test error 2',
    ]);
    assertQueueEmpty();
  });

  test('do not catch error from sibling effects', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('parent effect ran');
      onError((e) => {
        logs.push(`parent caught error: ${e.message}`);
      });
      effect(() => {
        logs.push('child effect ran');
        onError((e) => {
          logs.push(`child caught error: ${e.message}`);
        });
      });
      effect(() => {
        logs.push('sibling effect ran');
        throw new Error('Sibling error');
      });
      logs.push('parent effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'parent effect ran',
      'parent effect end',
      'child effect ran',
      'sibling effect ran',
      'parent caught error: Sibling error',
    ]);
    assertQueueEmpty();
  });

  test('catch error of sibling onError', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('parent effect ran');
      onError((e) => {
        logs.push(`caught any error: ${e}`);
      });
      onError((e) => {
        if (e instanceof Error) {
          logs.push(`caught Error: ${e.message}`);
        } else {
          throw e;
        }
      });
      effect(() => {
        logs.push('first sibling effect ran');
        throw 'Sibling string error';
      });
      effect(() => {
        logs.push('second sibling effect ran');
        throw new Error('sibling error');
      });
      logs.push('parent effect end');
    });

    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'parent effect ran',
      'parent effect end',
      'first sibling effect ran',
      'caught any error: Sibling string error',
      'second sibling effect ran',
      'caught Error: sibling error',
    ]);
    assertQueueEmpty();
  });

  test('catch error of child onError', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('parent effect ran');
      onError((e) => {
        logs.push(`caught any error: ${e}`);
      });
      effect(() => {
        onError((e) => {
          if (e instanceof Error) {
            logs.push(`caught Error: ${e.message}`);
          } else {
            throw e;
          }
        });
        effect(() => {
          logs.push('first sibling effect ran');
          throw 'Sibling string error';
        });
        effect(() => {
          logs.push('second sibling effect ran');
          throw new Error('sibling error');
        });
      });
      logs.push('parent effect end');
    });

    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'parent effect ran',
      'parent effect end',
      'first sibling effect ran',
      'caught any error: Sibling string error',
      'second sibling effect ran',
      'caught Error: sibling error',
    ]);
    assertQueueEmpty();
  });

  test('do not catch child effect error when onError is registered after child effect creation', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect ran');
      effect(() => {
        logs.push('child effect ran');
        throw new Error('Child error');
      });
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
    });

    expect(logs.take()).toEqual([]);
    await wait();
    const handle = catchUncatched();
    expect(logs.take()).toEqual(['effect ran', 'child effect ran']);
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Child error');
    assertQueueEmpty();
  });

  test('dispose effect with on error', async () => {
    const logs = createLogStore();
    const { dispose } = effect(() => {
      onError((e) => {
        logs.push(`caught error: ${e.message}`);
      });
      logs.push('effect ran');
      cleanup(() => {
        logs.push('cleanup ran');
      });
      logs.push('effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran', 'effect end']);
    dispose();
    expect(logs.take()).toEqual(['cleanup ran']);
    assertQueueEmpty();
  });

  test('catch error from deeply nested effects', async () => {
    const logs = createLogStore();
    effect(() => {
      onError((e) => logs.push(`caught: ${e.message}`));
      effect(() => {
        effect(() => {
          effect(() => {
            throw new Error('Deep error');
          });
        });
      });
    });
    await wait();
    expect(logs.take()).toContain('caught: Deep error');
    assertQueueEmpty();
  });
});
