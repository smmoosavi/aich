import { effect, state } from '../src';
import { pinKey } from '../src/pin-key';
import { wait } from './wait';

describe('pin key', () => {
  test('pinKey generates correct key formats', () => {
    // Test string key
    expect(pinKey('prefix', 'mykey')).toBe('prefix:s:mykey');

    // Test numeric key
    expect(pinKey('prefix', 42)).toBe('prefix:n:42');

    // Test auto-generated key (outside effect)
    expect(pinKey('prefix')).toBe('prefix:i:-1');
  });

  test('pinKey auto-increments within effect', async () => {
    const count = state(0);
    const { result } = effect(() => {
      count();
      const keys: string[] = [];

      keys.push(pinKey('test'));
      keys.push(pinKey('test'));
      keys.push(pinKey('other'));

      return keys;
    });

    await wait();

    expect(result.current).toEqual(['test:i:0', 'test:i:1', 'other:i:2']);

    count(1);
    await wait();

    expect(result.current).toEqual(['test:i:0', 'test:i:1', 'other:i:2']);
  });
});
