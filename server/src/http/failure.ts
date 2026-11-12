let injected: Error | undefined;

export function injectFailure(error: Error): void {
  injected = error;
}

export function takeFailure(): Error | undefined {
  const error = injected;
  injected = undefined;
  return error;
}
