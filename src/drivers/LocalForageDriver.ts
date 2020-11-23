import {StoreDriver} from '../StoreDriver';
import LocalForage from 'localforage';

export type LocalForageDriverOptions = Pick<
  LocalForageOptions,
  'name' | 'storeName'
>;

export class LocalForageDriver<T> implements StoreDriver<T> {
  private store: LocalForage;

  constructor(options?: LocalForageDriverOptions) {
    this.store = LocalForage.createInstance({
      ...options,
      driver: LocalForage.INDEXEDDB,
    });
  }

  async setItem(key: string, value: T): Promise<T | Error> {
    try {
      const res = await this.store.setItem<T>(key, value);
      return res;
    } catch (error) {
      return error.message;
    }
  }

  async getItem(key: string): Promise<T | null> {
    const value = await this.store.getItem<T>(key);
    return value;
  }

  async getItems(): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const items: T[] = [];
      this.store.iterate(
        (value: T, _key: string, _i: number) => {
          items.push(value);
        },
        (err, _result) => {
          if (err) {
            reject(err);
          }
          resolve(items);
        }
      );
    });
  }

  async removeItem(key: string): Promise<void> {
    await this.store.removeItem(key);
    return;
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }
}
