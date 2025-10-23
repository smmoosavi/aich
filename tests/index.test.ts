import {
  state,
  effect,
  immediate,
  cleanup,
  onError,
  untrack,
  flush,
} from '../src';

test('index', () => {
  expect(state).toBeDefined();
  expect(effect).toBeDefined();
  expect(immediate).toBeDefined();
  expect(cleanup).toBeDefined();
  expect(onError).toBeDefined();
  expect(untrack).toBeDefined();
  expect(flush).toBeDefined();
});
