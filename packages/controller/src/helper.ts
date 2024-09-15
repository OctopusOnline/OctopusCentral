export function sleep(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), timeout));
}

export async function waitFor(breakFunction: Function, interval: number = 200): Promise<void> {
  while (!await breakFunction())
    await sleep(interval);
}