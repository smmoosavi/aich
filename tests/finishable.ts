const startedTasks = new Set<string>();
const finishedTasks = new Set<string>();

export const finishable = it.extend<{ finish: () => void }>({
  finish: async ({ task }, use) => {
    startedTasks.add(task.id);
    await use(() => {
      finishedTasks.add(task.id);
    });
  },
});

export function assertAllFinished(tasks: Array<{ id: string; name: string }>) {
  const unfinishedTasks: string[] = [];
  for (const task of tasks) {
    if (startedTasks.has(task.id) && !finishedTasks.has(task.id)) {
      unfinishedTasks.push(task.name);
    }
  }
  if (unfinishedTasks.length > 0) {
    console.error(
      `Unfinished tasks: ${Array.from(unfinishedTasks).join(', ')}`,
    );
  }
  startedTasks.clear();
  finishedTasks.clear();
  expect(unfinishedTasks.length).toBe(0);
}
