import { describe, it, expect } from 'vitest';
import { isThunk, resolveValue, immediateValue } from '../src/value';
import { flush, state } from '../src';
import { wait } from './wait';

describe('value', () => {
  describe('isThunk', () => {
    it('should return true for functions', () => {
      const thunk = () => 42;
      expect(isThunk(thunk)).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isThunk(42)).toBe(false);
      expect(isThunk('string')).toBe(false);
      expect(isThunk(null)).toBe(false);
      expect(isThunk(undefined)).toBe(false);
      expect(isThunk({})).toBe(false);
    });
  });

  describe('resolveValue', () => {
    it('should return the value directly if not a thunk', () => {
      expect(resolveValue(42)).toBe(42);
      expect(resolveValue('hello')).toBe('hello');
      expect(resolveValue({ key: 'value' })).toEqual({ key: 'value' });
    });

    it('should call the thunk and return its result', () => {
      const thunk = () => 42;
      expect(resolveValue(thunk)).toBe(42);

      const thunk2 = () => 'computed value';
      expect(resolveValue(thunk2)).toBe('computed value');
    });
  });

  describe('immediateValue', () => {
    it('should return the value and empty dispose for non-thunks', () => {
      const [value, dispose] = immediateValue(42);
      expect(value).toBe(42);
      expect(typeof dispose).toBe('function');
      // dispose should be a no-op
      expect(() => dispose()).not.toThrow();
    });

    it('should execute thunk immediately and return value with dispose', () => {
      let executed = false;
      const thunk = () => {
        executed = true;
        return 42;
      };
      const [value, dispose] = immediateValue(thunk);
      expect(executed).toBe(true);
      expect(value).toBe(42);
      expect(typeof dispose).toBe('function');
      // dispose should clean up the immediate effect
      dispose();
    });

    it('should re-run the thunk when dependent state changes', () => {
      const count = state(0);
      let runs = 0;
      const thunk = () => {
        runs++;
        return count();
      };

      const [value, dispose] = immediateValue(thunk);
      // initial run
      expect(runs).toBe(1);
      expect(value).toBe(0);

      // update state -> should trigger immediate re-run
      count(1);
      flush();
      expect(runs).toBeGreaterThanOrEqual(2);

      // cleanup
      dispose();
      const prevRuns = runs;
      count(2);
      flush();
      // after dispose, should not run again
      expect(runs).toBe(prevRuns);
    });
  });
});
