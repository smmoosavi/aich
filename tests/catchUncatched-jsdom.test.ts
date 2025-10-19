// @vitest-environment jsdom

import { catchUncatched } from './catchUncatched';
import { createLogStore } from './log';
import { wait } from './wait';

test('catch uncatched error', async () => {
  const logs = createLogStore();
  Promise.resolve().then(() => {
    logs.push('throwing error');
    throw new Error('Uncatched error');
  });
  const handle = catchUncatched();

  expect(logs.take()).toEqual([]);
  expect(handle.getErrors()).toHaveLength(0);
  await wait();
  expect(logs.take()).toEqual(['throwing error']);
  expect(handle.getErrors()).toHaveLength(0);
  await wait(0);
  expect(logs.take()).toEqual([]);
  expect(handle.getErrors()).toHaveLength(1);
});
