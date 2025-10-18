import { state, effect, immediate, cleanup } from '../src';

test('index', () => {
  expect(state).toBeDefined();
  expect(effect).toBeDefined();
  expect(immediate).toBeDefined();
  expect(cleanup).toBeDefined();
});
