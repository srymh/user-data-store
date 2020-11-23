jest.mock('localforage', () => {
  return {
    createInstance: jest.fn(
      (/* options: {
        driver: string;
        name: string;
        storeName: string;
        version?: number;
      } */) => {
        var storage: {
          [key: string]: any;
        } = {};
        return {
          setItem: async <T>(key: string, value: T): Promise<T> => {
            return new Promise((resolve) => {
              storage[key] = value || '';
              resolve(value);
            });
          },
          getItem: async <T>(key: string): Promise<T | null> => {
            return new Promise((resolve) => {
              resolve(storage[key] || null);
            });
          },
          removeItem: async (key: string): Promise<void> => {
            return new Promise((resolve) => {
              delete storage[key];
              resolve();
            });
          },
          clear: async (): Promise<void> => {
            return new Promise((resolve) => {
              storage = {};
              resolve();
            });
          },
          iterate: async <T, U>(
            iteratee: (value: T, key: string, iterationNumber: number) => U,
            callback?: (err: any, result: U) => void
          ): Promise<U> => {
            return new Promise((resolve) => {
              let result: U;
              Object.keys(storage).forEach((key, i) => {
                result = iteratee(storage[key], key, i);
              });
              if (callback) callback(null, result);
              resolve(result);
            });
          },
        };
      }
    ),
  };
});
