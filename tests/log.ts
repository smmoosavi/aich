interface logStore {
  /**
   * Returns all logs currently in the store.
   * @returns An array of all logs.
   */
  logs(): string[];
  /**
   * Clears all logs from the store.
   */
  clear(): void;
  /**
   * Adds a log to the store.
   * @param log The log message to add.
   */
  push(log: string): void;
  /**
   * Removes and returns all logs.
   * @returns An array of all logs that were in the store.
   */
  take(): string[];
}

/**
 * Test utility: an in-memory log store.
 *
 * Usage:
 *
 * ```
 * const logs = createLogStore();
 * logs.push('msg');          // add a log
 * logs.take();               // returns logs added since last take and clears them
 * logs.logs();               // inspect current logs without clearing
 * logs.clear();              // clear without returning
 * ```
 *
 * Note: call `take()` between assertions to get only newly-added entries.
 *
 * @example
 *
 * ```
 * const logs = createLogStore();
 * logs.push('a');
 * logs.push('b');
 * logs.logs(); // -> ['a', 'b'] (store still has 'a' and 'b')
 * logs.take(); // -> ['a', 'b'] (store is now empty)
 * logs.take(); // -> []
 * logs.push('c');
 * logs.take(); // -> ['c']
 * ```
 */
export function createLogStore(): logStore {
  let logs: string[] = [];

  return {
    logs() {
      return logs;
    },
    clear() {
      logs = [];
    },
    push(log: string) {
      logs.push(log);
    },
    take() {
      const takenLogs = logs;
      logs = [];
      return takenLogs;
    },
  };
}
