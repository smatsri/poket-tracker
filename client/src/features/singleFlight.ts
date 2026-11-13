export type SingleFlight = <T>(action: () => Promise<T>) => Promise<T | undefined>;

export function createSingleFlight(): SingleFlight {
  let busy = false;

  return (action) => {
    if (busy) {
      return Promise.resolve(undefined);
    }

    busy = true;
    try {
      return Promise.resolve(action()).finally(() => {
        busy = false;
      });
    } catch (error) {
      busy = false;
      return Promise.reject(error);
    }
  };
}
