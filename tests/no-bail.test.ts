import { assertAllFinished, finishable } from './finishable';

describe('noBail helper', () => {
  afterAll(({ tasks }) => {
    assertAllFinished(tasks);
  });
  finishable.fails(
    'should collect multiple assertion errors and report at the end',
    ({ finish }) => {
      const value1 = 1;
      const value2 = 2;
      const value3 = 3;

      // These assertions will fail but won't stop execution
      expect(value1).noBail.toBe(2); // Will fail
      expect(value2).noBail.toBe(3); // Will fail
      expect(value3).noBail.toBe(3); // Will pass

      finish();
    },
  );

  finishable('should pass when all noBail assertions pass', ({ finish }) => {
    expect(1).noBail.toBe(1);
    expect(2).noBail.toBe(2);
    expect('hello').noBail.toBe('hello');
    finish();
  });

  finishable('works with different matchers', ({ finish }) => {
    expect([1, 2, 3]).noBail.toEqual([1, 2, 3]);
    expect({ a: 1 }).noBail.toHaveProperty('a');
    expect('hello').noBail.toContain('ell');

    finish();
  });

  finishable.fails(
    'demonstrates collecting multiple types of assertion errors',
    ({ finish }) => {
      const user = { name: 'Alice', age: 25, role: 'admin' };
      const numbers = [1, 2, 3, 4, 5];

      // All these will continue even if they fail
      expect(user.name).noBail.toBe('Bob'); // Will fail
      expect(user.age).noBail.toBe(30); // Will fail
      expect(user.role).noBail.toBe('admin'); // Will pass
      expect(numbers).noBail.toContain(6); // Will fail
      expect(numbers.length).noBail.toBe(5); // Will pass

      finish();
    },
  );

  finishable('passes when all noBail assertions are correct', ({ finish }) => {
    const data = { x: 10, y: 20 };

    expect(data).noBail.toHaveProperty('x');
    expect(data).noBail.toHaveProperty('y');
    expect(data.x).noBail.toBe(10);
    expect(data.y).noBail.toBe(20);
    expect(data).noBail.toEqual({ x: 10, y: 20 });

    finish();
  });

  finishable.fails('can mix regular expect with noBail', ({ finish }) => {
    const value = 42;

    // Regular expect - will stop execution if it fails
    expect(value).toBeDefined();

    // noBail assertions - will collect errors
    expect(value).noBail.toBe(100); // Will fail
    expect(value).noBail.toBeGreaterThan(50); // Will fail

    finish();
  });
});
