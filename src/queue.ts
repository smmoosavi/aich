import { runEffect, type Effect } from './effect';
import { forEach } from './iter';
import { getRoot } from './root';

declare module './root' {
  interface Root {
    queue?: Queue;
    flush?: Promise<void>;
  }
}

export type Queue = Set<Effect>;

export function getQueue(): Queue {
  const root = getRoot();
  if (!root.queue) {
    root.queue = new Set();
  }
  return root.queue;
}

export function enqueue(effect: Effect) {
  const root = getRoot();
  const queue = getQueue();
  queue.add(effect);
  if (!root.flush) {
    root.flush = Promise.resolve().then(() => {
      flush();
    });
  }
}

export function dropEffect(effect: Effect) {
  const queue = getQueue();
  queue.delete(effect);
}

export function flush() {
  const root = getRoot();
  const queue = getQueue();

  try {
    forEach(queue, (effect) => {
      runEffect(effect);
    });
  } finally {
    root.flush = undefined;
  }
}

export function assertQueueEmpty() {
  const queue = getQueue();
  if (queue.size > 0) {
    throw new Error(
      `Expected queue to be empty, but found ${queue.size} pending effects.`,
    );
  }
}
