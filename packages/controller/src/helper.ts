export function sleep(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), timeout));
}

export async function waitFor(breakFunction: Function, maxIterations: number = 150, interval: number = 200): Promise<boolean> {
  for (let i = 0; i < maxIterations; i++) {
    if (await breakFunction())
      return true;
    await sleep(interval);
  }
  return false;
}