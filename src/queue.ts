import { type EffectContext, runEffect } from './effect';
import { forEach, loop, STOP } from './iter';
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
    loop(() => {
      if (queue.size === 0) {
        return STOP;
      }
      const sortedContexts = sortQueueByOrderKey(queue);
      queue.clear();
      sortedContexts.forEach((context) => queue.add(context));
      forEach(sortedContexts, (context) => {
        if (queue.has(context)) {
          runEffect(context);
        }
      });
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

function sortQueueByOrderKey(queue: Queue): EffectContext[] {
  return Array.from(queue).sort((a, b) => {
    if (a.orderKey < b.orderKey) return -1;
    if (a.orderKey > b.orderKey) return 1;
    return 0;
  });
}
