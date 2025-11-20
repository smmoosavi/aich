import { type EffectContext, runEffect } from './effect';
import { forEach } from './iter';
import { getRoot } from './root';

/** @internal */
declare module './root' {
  interface Root {
    queue?: Queue;
    flush?: Promise<void>;
  }
}

export type Queue = Set<EffectContext>;

export function getQueue(): Queue {
  const root = getRoot();
  if (!root.queue) {
    root.queue = new Set();
  }
  return root.queue;
}

export function enqueue(context: EffectContext) {
  const root = getRoot();
  const queue = getQueue();
  queue.add(context);
  if (!root.flush) {
    root.flush = Promise.resolve().then(() => {
      flush();
    });
  }
}

export function dropEffect(context: EffectContext) {
  const queue = getQueue();
  queue.delete(context);
}

export function flush() {
  const root = getRoot();
  const queue = getQueue();

  try {
    forEach(queue, (context) => {
      runEffect(context);
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
