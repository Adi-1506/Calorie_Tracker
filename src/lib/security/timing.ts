// Pads a response to a minimum duration so success and failure take the same
// time and can't reveal whether an account exists (security item 22).
export async function withMinimumDuration<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    const remaining = ms - (Date.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
