import { cleanup, effect, immediate } from '../src';
import { aggregateErrors } from '../src/error';
import { assertQueueEmpty } from '../src/queue';
import { catchUncatched } from './catchUncatched';
import { createLogStore } from './log';
import { wait } from './wait';

describe.sequential('error', () => {
  test('error in effect', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect ran');
      throw new Error('Test error');
    });
    const handle = catchUncatched();
    expect(logs.take()).toEqual([]);
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error');
    assertQueueEmpty();
  });
  test('error in cleanup', async () => {
    const logs = createLogStore();
    const dispose = effect(function xxx() {
      logs.push('effect ran');
      cleanup(function ccc() {
        logs.push('cleanup ran');
        throw new Error('Test error');
      });
    });
    await wait();
    expect(logs.take()).toEqual(['effect ran']);
    expect(() => {
      dispose();
    }).toThrow('Test error');
    expect(logs.take()).toEqual(['cleanup ran']);
    assertQueueEmpty();
  });
  test('error in immediate', async () => {
    const logs = createLogStore();
    expect(() => {
      immediate(() => {
        logs.push('immediate ran');
        throw new Error('Test error');
      });
    }).throws('Test error');
    expect(logs.take()).toEqual(['immediate ran']);
    assertQueueEmpty();
  });
  test('error in nested immediate', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect ran');
      immediate(() => {
        logs.push('immediate ran');
        throw new Error('Test error');
      });
      logs.push('effect end');
    });
    const handle = catchUncatched();
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran', 'immediate ran']);
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error');
    assertQueueEmpty();
  });

  test('error in parent effect', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('parent effect ran');
      effect(() => {
        logs.push('child effect ran');
      });
      throw new Error('Parent test error');
    });
    expect(logs.take()).toEqual([]);
    const handle = catchUncatched();
    await wait();
    expect(logs.take()).toEqual(['parent effect ran', 'child effect ran']);
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Parent test error');
    assertQueueEmpty();
  });

  test('error in sibling effect', async () => {
    const logs = createLogStore();
    effect(() => {
      logs.push('effect ran');
      effect(() => {
        logs.push('sibling effect 1 ran');
        throw new Error('Sibling test error');
      });
      effect(() => {
        logs.push('sibling effect 2 ran');
      });
      logs.push('effect end');
    });
    const handle = catchUncatched();
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'effect ran',
      'effect end',
      'sibling effect 1 ran',
      'sibling effect 2 ran',
    ]);
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Sibling test error');
    assertQueueEmpty();
  });

  test('error in sibling cleanup', async () => {
    const logs = createLogStore();
    const dispose = effect(() => {
      logs.push('effect ran');
      cleanup(() => {
        logs.push('sibling cleanup 1 ran');
      });
      cleanup(() => {
        logs.push('sibling cleanup 2 ran');
        throw new Error('Sibling cleanup test error');
      });
      logs.push('effect end');
    });
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual(['effect ran', 'effect end']);
    expect(() => {
      dispose();
    }).toThrow('Sibling cleanup test error');
    expect(logs.take()).toEqual([
      'sibling cleanup 2 ran',
      'sibling cleanup 1 ran',
    ]);
    assertQueueEmpty();
  });

  test('multiple unhandled error', async () => {
    const logs = createLogStore();
    effect(() => {
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
    const handle = catchUncatched();
    expect(logs.take()).toEqual([]);
    await wait();
    expect(logs.take()).toEqual([
      'effect ran',
      'effect end',
      'child effect 1 ran',
      'child effect 2 ran',
    ]);
    await wait(0);
    const errors = handle.takeErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(AggregateError);
    const error = errors[0] as AggregateError;
    expect(error.message).toBe('Test error 1 (and 1 more)');
    expect(error.errors.length).toBe(2);
    expect(error.errors[0].message).toBe('Test error 1');
    expect(error.errors[1].message).toBe('Test error 2');
    assertQueueEmpty();
  });

  test('aggregate error with no message', () => {
    const err1 = new Error();
    const err2 = new Error();
    const aggregated = aggregateErrors([err1, err2]);
    expect(aggregated.message).toBe('2 errors during flush');
  });
  test('aggregate non-error', () => {
    const err1 = 'string error';
    const err2 = 42;
    const aggregated = aggregateErrors([err1, err2]);
    expect(aggregated.message).toBe('string error (and 1 more)');
  });
});
