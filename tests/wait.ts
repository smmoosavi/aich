// wait for Promise to resolve
export function wait(timeout?: number): Promise<void> {
  if (typeof timeout === 'number') {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }
  return Promise.resolve();
}
