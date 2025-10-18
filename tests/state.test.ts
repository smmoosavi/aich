import { state } from '../src';

describe('state', () => {
  test('initial value', () => {
    const count = state(0);
    expect(count()).toBe(0);
  });

  test('set value', () => {
    const count = state(0);
    count(1);
    expect(count()).toBe(1);
    count(42);
    expect(count()).toBe(42);
  });
  test('multiple states', () => {
    const count1 = state(0);
    const count2 = state(10);
    expect(count1()).toBe(0);
    expect(count2()).toBe(10);
    count1(5);
    count2(20);
    expect(count1()).toBe(5);
    expect(count2()).toBe(20);
  });
  test('multiple updates', () => {
    const count = state(0);
    count(1);
    expect(count()).toBe(1);
    count(2);
    count(3);
    expect(count()).toBe(3);
  });
  test('set undefined', () => {
    const count = state<number | undefined>(0);
    count(undefined);
    expect(count()).toBe(undefined);
    count(0);
    expect(count()).toBe(0);
  });
});
